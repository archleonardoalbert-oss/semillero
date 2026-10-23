import { EventEmitter } from 'node:events';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ESTADOS_PENDIENTES } from '../store/ideas.js';
import { ejecutar as ejecutarReal } from './runner.js';
import { argsClaude, mensajeEjecucion, mensajeGerminacion, promptGerminacion } from './prompt.js';
import { validarMapa } from './mapa.js';
import { VEREDICTOS } from './veredicto.js';
import { parsearDictamen } from './veredicto.js';
import { notificar as notificarReal } from './notificar.js';

const clave = (r) => `${r.carpetaId}/${r.ideaId}`;
const RE_LIMITE = /usage limit|rate limit|limit reached|límite/i;

// Gestiona las ejecuciones: máximo `paralelo` a la vez, el resto en cola.
export function crearCola({ cfg, ideas, carpetas, ajustes, guard, germinacion = null, ejecutar = ejecutarReal, notificar = notificarReal }) {
  const emisor = new EventEmitter();
  const activas = new Map(); // clave → { ref, control, motivo, archivoDestino, rutaIdea }
  let cola = []; // { ref, tipo }
  const ocupadas = new Set(); // claves en cola o activas (evita dobles lanzamientos)
  let cuota = null;
  let pausadaPorCuota = false;
  let ignorarUmbralHasta = 0;
  let ignorarHastaConocerCuota = false; // reanudar sin cuota en memoria (p. ej. tras reiniciar)
  let reinicioVentanaPausa = null; // resetsAt de la ventana que provocó la última pausa
  let apagando = false;
  let ajenosExternos = () => []; // objetivos de otras ejecuciones fuera de la cola (glosas)

  const estado = () => ({
    ejecutando: [...activas.values()].map((a) => a.ref),
    enCola: cola.map((c) => c.ref),
    pausadaPorCuota,
    cuota,
  });
  const avisarCola = () => emisor.emit('cola', estado());

  async function cambiar(ref, parche) {
    const idea = await ideas.actualizar(ref.carpetaId, ref.ideaId, parche);
    emisor.emit('idea', { ref, idea });
    return idea;
  }

  function tipoDe(idea, hilo) {
    // Una idea que ya germina nunca vuelve al análisis: todo lo que se lance sobre ella es germinación.
    if (idea.trabajo === 'germinacion') return idea.sessionId && idea.interrumpida ? 'reanudar' : 'germinar';
    if (idea.sessionId && idea.interrumpida) return 'reanudar';
    if (!hilo.some((m) => m.autor === 'claude')) return 'inicial';
    return 'replica';
  }

  const germinable = (idea) => idea.estado === 'aceptada' || (idea.trabajo === 'germinacion' && ['detenida', 'error'].includes(idea.estado));
  const FORZABLES = new Set(['aceptada', 'cambios', 'no-recomendada', 'aclaracion', 'replica-pendiente']);
  const NOMBRE_VEREDICTO = { aceptada: 'Aceptada', cambios: 'Cambio sugerido', 'no-recomendada': 'No recomendado', rechazada: 'Rechazada rotundamente', aclaracion: 'Necesita aclaración' };
  // El último veredicto, aunque el estado esté ahora en «réplica pendiente».
  const ultimoVeredicto = (idea) =>
    idea.veredicto ?? (VEREDICTOS.has(idea.estado) ? idea.estado : idea.hilo?.findLast((m) => m.autor === 'claude')?.meta?.veredicto ?? null);
  // Una glosa de corrección que enmienda documentos de la germinación no debe coincidir con una ejecución que los reescribe.
  const corrigiendoGerminacion = (ref) => {
    const prefijo = `${ideas.relIdea(ref.carpetaId, ref.ideaId)}/germinacion/`;
    return ajenosExternos().some((o) => o.startsWith(prefijo));
  };

  // Estado al que vuelve una idea que esperaba en cola y se descarta (parada, pausa o apagado).
  async function estadoAlDescartar(ref, idea) {
    // Una germinación sin mapa volvería a «aceptada» con la plántula y ninguna acción posible: queda retomable.
    if (idea.trabajo === 'germinacion' && !(await germinacion?.leerMapa(ref.carpetaId, ref.ideaId))) return 'detenida';
    return idea.estadoPrevio ?? 'borrador';
  }

  async function encolar(ref, { soloPausadas, germinar = false, forzar = false }) {
    const k = clave(ref);
    if (ocupadas.has(k)) return;
    ocupadas.add(k);
    try {
      const idea = await ideas.obtener(ref.carpetaId, ref.ideaId);
      const valida = (germinar ? germinable(idea) || (forzar && FORZABLES.has(idea.estado)) : soloPausadas ? idea.estado === 'pausada' : ESTADOS_PENDIENTES.has(idea.estado))
        && !(idea.trabajo === 'germinacion' && corrigiendoGerminacion(ref));
      if (!valida) {
        ocupadas.delete(k);
        if (germinar) throw new Error(idea.estado === 'en-proceso' ? 'en-proceso' : 'no-aceptada');
        return;
      }
      const parche = { estado: 'en-proceso', estadoPrevio: idea.estado };
      if (germinar && idea.trabajo !== 'germinacion') {
        Object.assign(parche, { trabajo: 'germinacion', estadoPrevio: idea.estado, eleccion: null, germinacion: { fase: 'preparando', iniciada: new Date().toISOString() } });
      }
      cola.push({ ref, tipo: germinar ? (idea.sessionId && idea.interrumpida ? 'reanudar' : 'germinar') : tipoDe(idea, idea.hilo) });
      await cambiar(ref, parche);
    } catch (e) {
      ocupadas.delete(k);
      throw e;
    }
  }

  async function lanzar(refs) {
    for (const ref of refs) await encolar(ref, { soloPausadas: false });
    avisarCola();
    await bombear();
  }

  // Germinar (o seguir germinando) una idea aceptada. La petición del usuario queda pendiente
  // en su progreso hasta que una ejecución termine con un mapa válido.
  // `forzar`: germinar una idea que no fue aceptada (salvo rechazada rotundamente). Elegir un camino o
  // modificar la idea equivale a aceptarla en esa versión: se germina sin reanalizar.
  async function germinar(ref, { peticion, forzar = false, camino = null, comentario = '', cuerpo } = {}) {
    if (!germinacion) throw new Error('sin-germinacion');
    let idea = await ideas.obtener(ref.carpetaId, ref.ideaId);
    if (idea.estado === 'en-proceso' || ocupadas.has(clave(ref)) || corrigiendoGerminacion(ref)) throw new Error('en-proceso');
    const veredicto = ultimoVeredicto(idea);
    const forzable = forzar && idea.trabajo !== 'germinacion' && FORZABLES.has(idea.estado) && Boolean(veredicto);
    if (veredicto === 'rechazada' && idea.trabajo !== 'germinacion') throw new Error('no-germinable');
    if (!germinable(idea) && !forzable) throw new Error('no-aceptada');
    const partes = [];
    // Una réplica sin enviar (o la variación elegida) forma parte de lo que el usuario quiere germinar.
    const ultimoMsg = idea.hilo.at(-1);
    const replica = ultimoMsg?.autor === 'usuario' && ultimoMsg.n > 1
      ? ultimoMsg.contenido.replace(/<!-- \/?camino(:[a-z0-9-]+)? -->/g, '').trim()
      : '';
    if (forzable && veredicto !== 'aceptada') {
      const original = idea.hilo.find((m) => m.n === 1)?.contenido;
      const modificada = typeof cuerpo === 'string' && cuerpo !== original;
      if (modificada) idea = await ideas.editarOriginal(ref.carpetaId, ref.ideaId, { cuerpo }).then(() => ideas.obtener(ref.carpetaId, ref.ideaId));
      partes.push(
        `El usuario decide germinar esta idea aunque tu último veredicto fue «${NOMBRE_VEREDICTO[veredicto]}»${idea.etiqueta ? ` (${idea.etiqueta})` : ''}.`
          + (camino?.titulo ? ` Elige el camino «${camino.titulo}»${comentario?.trim() ? `: ${comentario.trim()}` : ''}.` : '')
          + (modificada ? ` Además, el usuario modificó su idea: relee ${ideas.relIdea(ref.carpetaId, ref.ideaId)}/hilo/001-usuario.md.` : '')
          + ' Toma esta como la versión aceptada de la idea y germínala.',
      );
    }
    if (replica) partes.push(`El usuario había dejado esta réplica sin enviar; tenla en cuenta:\n\n${replica}`);
    if (peticion?.trim()) partes.push(peticion.trim());
    if (partes.length) await germinacion.ponerPeticion(ref.carpetaId, ref.ideaId, partes.join('\n\n'));
    await encolar(ref, { soloPausadas: false, germinar: true, forzar: forzable });
    avisarCola();
    await bombear();
  }

  async function reanudar(refs) {
    for (const ref of refs) await encolar(ref, { soloPausadas: true });
    // Reanudar es una decisión explícita: no se vuelve a pausar por umbral hasta el reinicio de la ventana.
    if (reinicioVentanaPausa) ignorarUmbralHasta = Math.max(ignorarUmbralHasta, reinicioVentanaPausa);
    else if (cuota) ignorarUmbralHasta = Math.max(ignorarUmbralHasta, cuota.resetsAt5h ?? 0);
    else ignorarHastaConocerCuota = true;
    avisarCola();
    await bombear();
  }

  async function bombear() {
    if (apagando) return;
    const { paralelo } = await ajustes.leer();
    while (activas.size < paralelo && cola.length) {
      const item = cola.shift();
      iniciar(item).catch((e) => console.error('[cola] fallo al iniciar', clave(item.ref), e));
    }
    avisarCola();
  }

  function objetivos(a) {
    return a.objetivos ?? [];
  }

  const objetivosGerminacion = (rutaIdea, carpetaId) => [
    `${rutaIdea}/germinacion/mapa.json`, `${rutaIdea}/germinacion/nodos/**`, `${rutaIdea}/germinacion/recursos/**`,
    `${rutaIdea}/figuras/**`, `carpetas/${carpetaId}/notas.md`,
  ];

  // Prepara la ejecución: qué puede escribir, con qué prompt y qué mensaje.
  async function preparar(a, idea, carpeta, tipo) {
    const { ref, rutaIdea } = a;
    if (idea.trabajo === 'germinacion') {
      a.germinacion = true;
      a.objetivos = objetivosGerminacion(rutaIdea, ref.carpetaId);
      a.mapaAntes = await germinacion.leerMapa(ref.carpetaId, ref.ideaId);
      const progreso = await germinacion.leerProgreso(ref.carpetaId, ref.ideaId);
      // Lo que se comunica es lo de este momento: lo que el usuario cambie durante la ejecución queda pendiente.
      a.instantanea = structuredClone({ respuestas: progreso.respuestas, nodos: progreso.nodos });
      a.enmendadosEnviados = idea.enmendados ?? [];
      const cambios = await germinacion.cambiosDesdeEnvio(ref.carpetaId, ref.ideaId, a.mapaAntes);
      await cambiar(ref, { interrumpida: true, archivoDestino: null });
      return {
        sistema: promptGerminacion(),
        mensaje: mensajeGerminacion({ idea, carpeta, rutaIdea, mapa: a.mapaAntes, progreso, cambios, reanudar: tipo === 'reanudar' }),
      };
    }
    a.enmendadosEnviados = idea.enmendados ?? [];
    a.archivoDestino = await ideas.siguienteArchivo(ref.carpetaId, ref.ideaId);
    a.objetivos = [`${rutaIdea}/hilo/${a.archivoDestino}`, `${rutaIdea}/figuras/**`, `carpetas/${ref.carpetaId}/notas.md`];
    await cambiar(ref, { interrumpida: true, archivoDestino: a.archivoDestino });
    const ultimo = idea.hilo.at(-1);
    return {
      mensaje: mensajeEjecucion({
        tipo, idea, carpeta, rutaIdea,
        archivoDestino: `${rutaIdea}/hilo/${a.archivoDestino}`,
        replica: ultimo?.autor === 'usuario' && ultimo.n > 1 ? ultimo.contenido : '',
      }),
    };
  }

  async function iniciar({ ref, tipo }) {
    const k = clave(ref);
    const control = new AbortController();
    const a = { ref, control, motivo: null, archivoDestino: null, arranco: false, rutaIdea: ideas.relIdea(ref.carpetaId, ref.ideaId) };
    activas.set(k, a);
    let final;
    try {
      const idea = await ideas.obtener(ref.carpetaId, ref.ideaId);
      const carpeta = await carpetas.obtener(ref.carpetaId);
      const nueva = !idea.sessionId;
      const sessionId = idea.sessionId ?? crypto.randomUUID();
      if (nueva) await cambiar(ref, { sessionId });
      const { mensaje, sistema } = await preparar(a, idea, carpeta, tipo);
      const marca = new Date().toISOString().replace(/[:.]/g, '-');
      // Pausada o detenida mientras se preparaba: no llega a lanzar claude.
      const r = control.signal.aborted ? { codigo: null, abortado: true } : await ejecutar({
        cfg,
        args: argsClaude({ sessionId, nueva, ajustes: await ajustes.leer(), mensaje, ...(sistema && { sistema }) }),
        cwd: cfg.datos,
        rutaRegistro: path.join(ideas.dirIdea(ref.carpetaId, ref.ideaId), 'registro', `${marca}.jsonl`),
        alEvento: (ev) => {
          if (ev.type === 'system' && ev.subtype === 'init') a.arranco = true;
          alEvento(ref, ev);
        },
        senal: control.signal,
      });
      final = await cerrar(a, r, { nueva });
    } catch (e) {
      console.error('[cola] ejecución fallida', k, e);
      final = { estado: 'error', error: String(e.message ?? e) };
    } finally {
      // Se libera el hueco antes de publicar el estado final: así un «Reanudar» inmediato no se pierde.
      activas.delete(k);
      ocupadas.delete(k);
      await cambiar(ref, final).catch((e) => console.error('[cola] estado final', k, e));
      avisarCola();
      await actualizarPausa();
      bombear();
    }
  }

  async function cerrar(a, r, { nueva }) {
    const { ref } = a;
    const otros = [...[...activas.values()].filter((o) => o !== a).flatMap(objetivos), ...ajenosExternos()];
    const propios = [...objetivos(a), 'notas-globales.md'];
    const { restaurados } = await guard.verificar({ propios, ajenosActivos: otros });
    if (restaurados.length) console.warn('[guard] restaurados', restaurados);
    if (a.germinacion) return cerrarGerminacion(a, r, propios);

    const ruta = path.join(cfg.datos, a.rutaIdea, 'hilo', a.archivoDestino);
    const texto = await fs.readFile(ruta, 'utf8').catch(() => null);
    const dictamen = texto && parsearDictamen(texto);
    if (texto && !dictamen) await fs.rm(ruta, { force: true });
    await guard.commitear(propios.map((p) => p.replace(/\/\*\*$/, '')), `dictamen ${clave(ref)}`);

    if (r.resultado?.is_error && RE_LIMITE.test(String(r.resultado.result ?? ''))) {
      await pausarPorCuota();
      a.motivo = a.motivo ?? 'pausa';
    }
    if (dictamen) {
      const actual = await ideas.obtener(ref.carpetaId, ref.ideaId);
      return { ...finalConDictamen(dictamen), enmendados: (actual.enmendados ?? []).filter((d) => !a.enmendadosEnviados.includes(d)) };
    }
    // Una sesión que claude nunca llegó a crear no se puede retomar: se olvida para empezar de cero.
    const sinSesion = /No conversation found/i.test(r.stderr ?? '') || (nueva && !a.arranco);
    const olvidar = sinSesion ? { sessionId: null, interrumpida: false } : {};
    if (a.motivo === 'pausa') return { estado: 'pausada', ...olvidar };
    if (a.motivo === 'detener') return { estado: 'detenida', ...olvidar };
    return {
      estado: 'error',
      error: r.errorArranque ?? (r.stderr?.trim().split('\n').at(-1) || 'La sesión terminó sin escribir un dictamen válido'),
      ...olvidar,
    };
  }

  // Acaba una ejecución de germinación: el mapa nuevo solo se acepta si es válido.
  async function cerrarGerminacion(a, r, propios) {
    const { ref } = a;
    const rutaMapa = `${a.rutaIdea}/germinacion/mapa.json`;
    const texto = await fs.readFile(path.join(cfg.datos, rutaMapa), 'utf8').catch(() => null);
    let v = null;
    if (texto !== null) {
      try {
        v = validarMapa(JSON.parse(texto));
      } catch (e) {
        v = { ok: false, motivo: `JSON mal formado (${e.message})` };
      }
    }
    if (v && !v.ok) await guard.restaurar([rutaMapa]);
    // El mapa aceptado se guarda normalizado: la web lo lee tal cual.
    else if (v?.ok) await fs.writeFile(path.join(cfg.datos, rutaMapa), `${JSON.stringify(v.mapa, null, 2)}\n`);
    await guard.commitear(propios.map((p) => p.replace(/\/\*\*$/, '')), `germinación ${clave(ref)}`);
    if (r.resultado?.is_error && RE_LIMITE.test(String(r.resultado.result ?? ''))) {
      await pausarPorCuota();
      a.motivo = a.motivo ?? 'pausa';
    }
    if (a.motivo === 'pausa') return { estado: 'pausada' };
    if (a.motivo === 'detener') return { estado: 'detenida' };
    // Una sesión que ya no existe (Claude borra las antiguas) se olvida: la siguiente empieza de cero.
    const olvidar = /No conversation found/i.test(r.stderr ?? '') ? { sessionId: null } : {};
    const fallo = r.errorArranque ?? (r.resultado?.is_error || !r.resultado
      ? String(r.resultado?.result || r.stderr?.trim().split('\n').at(-1) || 'La sesión terminó sin responder')
      : null);
    if (fallo) return { estado: 'error', error: fallo, interrumpida: false, ...olvidar };
    if (!v || !v.ok) {
      const motivo = v ? `Mapa inválido: ${v.motivo}` : 'La sesión terminó sin escribir germinacion/mapa.json';
      return { estado: 'error', error: motivo, interrumpida: false };
    }
    await germinacion.marcarEnviado(ref.carpetaId, ref.ideaId, a.instantanea);
    const idea = await ideas.obtener(ref.carpetaId, ref.ideaId);
    return {
      estado: 'aceptada', interrumpida: false, error: null,
      enmendados: (idea.enmendados ?? []).filter((d) => !a.enmendadosEnviados.includes(d)),
      germinacion: { ...idea.germinacion, fase: v.mapa.fase, ultima: new Date().toISOString() },
    };
  }

  function finalConDictamen({ meta: m }) {
    return {
      estado: m.veredicto, veredicto: m.veredicto, etiqueta: m.etiqueta, etapa: m.etapa, resumen: m.resumen,
      ultimoVeredicto: new Date().toISOString(), eleccion: null,
      interrumpida: false, editadaTrasDictamen: false, error: null,
    };
  }

  function alEvento(ref, ev) {
    emisor.emit('evento', { ref, ev });
    registrarCuota(ev);
  }

  // También la alimentan ejecuciones fuera de la cola (glosas): la cuota es una sola.
  function registrarCuota(ev) {
    if (ev.type !== 'rate_limit_event') return;
    const w = ev.rate_limit_info?.unifiedWindows ?? {};
    cuota = {
      cincoHoras: w.five_hour?.utilization ?? null,
      sieteDias: w.seven_day?.utilization ?? null,
      resetsAt5h: w.five_hour?.resetsAt ?? null,
      resetsAt7d: w.seven_day?.resetsAt ?? null,
    };
    avisarCola();
    comprobarUmbral().catch((e) => console.error('[cola] umbral', e));
  }

  async function comprobarUmbral() {
    const { umbral5h, umbral7d } = await ajustes.leer();
    const pasadas = [];
    if ((cuota.cincoHoras ?? 0) >= umbral5h) pasadas.push(cuota.resetsAt5h ?? 0);
    if ((cuota.sieteDias ?? 0) >= umbral7d) pasadas.push(cuota.resetsAt7d ?? 0);
    if (ignorarHastaConocerCuota) {
      ignorarHastaConocerCuota = false;
      ignorarUmbralHasta = Math.max(ignorarUmbralHasta, ...pasadas, 0);
    }
    if (!pasadas.length || Date.now() / 1000 < ignorarUmbralHasta) return;
    reinicioVentanaPausa = Math.max(...pasadas);
    await pausarPorCuota();
  }

  async function pausarPorCuota() {
    const enMarcha = [...activas.values()].filter((a) => !a.motivo);
    const enEspera = cola;
    if (!enMarcha.length && !enEspera.length) return;
    pausadaPorCuota = true;
    cola = [];
    for (const a of enMarcha) {
      a.motivo = 'pausa';
      a.control.abort();
    }
    for (const { ref } of enEspera) {
      const idea = await ideas.obtener(ref.carpetaId, ref.ideaId);
      await cambiar(ref, { estado: await estadoAlDescartar(ref, idea) });
      ocupadas.delete(clave(ref));
    }
    const pct = Math.round(100 * Math.max(cuota?.cincoHoras ?? 0, cuota?.sieteDias ?? 0));
    await notificar('Semillero', `Investigación pausada: la cuota de Claude llegó al ${pct} %.`);
    emisor.emit('pausa', { motivo: 'cuota', cuota });
    avisarCola();
  }

  async function actualizarPausa() {
    if (!pausadaPorCuota) return;
    const quedan = (await ideas.listar({ estado: 'pausada' })).length;
    if (!quedan && !cola.length) {
      pausadaPorCuota = false;
      avisarCola();
    }
  }

  async function detener(refs) {
    for (const ref of refs) {
      const k = clave(ref);
      const a = activas.get(k);
      if (a) {
        a.motivo = 'detener';
        a.control.abort();
        continue;
      }
      const i = cola.findIndex((c) => clave(c.ref) === k);
      if (i === -1) continue;
      cola.splice(i, 1);
      ocupadas.delete(k);
      const idea = await ideas.obtener(ref.carpetaId, ref.ideaId);
      await cambiar(ref, { estado: await estadoAlDescartar(ref, idea) });
    }
    avisarCola();
  }

  // Al arrancar: lo que quedó en marcha se limpia como si la sesión hubiera terminado ahora.
  async function recuperar() {
    const cortadas = await ideas.listar({ estado: 'en-proceso' });
    if (!cortadas.length) await guard.commitear('todo', 'cambios previos al arranque');
    const propios = ['notas-globales.md'];
    const finales = [];
    for (const idea of cortadas) {
      const rutaIdea = ideas.relIdea(idea.carpetaId, idea.id);
      let final = { estado: 'detenida' };
      if (idea.trabajo === 'germinacion') {
        // Un mapa a medio escribir no se conserva; documentos y descargas sí, para retomarla.
        const rutaMapa = `${rutaIdea}/germinacion/mapa.json`;
        const texto = await fs.readFile(path.join(cfg.datos, rutaMapa), 'utf8').catch(() => null);
        let valido = false;
        try {
          valido = texto !== null && validarMapa(JSON.parse(texto)).ok;
        } catch {
          valido = false;
        }
        if (texto !== null && !valido) await guard.restaurar([rutaMapa]);
        propios.push(...objetivosGerminacion(rutaIdea, idea.carpetaId));
        finales.push([idea, final]);
        continue;
      }
      if (idea.archivoDestino) {
        const ruta = path.join(cfg.datos, rutaIdea, 'hilo', idea.archivoDestino);
        const texto = await fs.readFile(ruta, 'utf8').catch(() => null);
        const dictamen = texto && parsearDictamen(texto);
        if (dictamen) final = finalConDictamen(dictamen);
        else if (texto !== null) await fs.rm(ruta, { force: true });
        propios.push(`${rutaIdea}/hilo/${idea.archivoDestino}`);
      }
      propios.push(`${rutaIdea}/figuras/**`, `carpetas/${idea.carpetaId}/notas.md`);
      finales.push([idea, final]);
    }
    if (cortadas.length) {
      const { restaurados } = await guard.verificar({ propios, ajenosActivos: [] });
      if (restaurados.length) console.warn('[guard] restaurados al arrancar', restaurados);
      await guard.commitear(propios.map((p) => p.replace(/\/\*\*$/, '')), 'recuperación tras reinicio');
    }
    for (const [idea, final] of finales) await ideas.actualizar(idea.carpetaId, idea.id, final);
    pausadaPorCuota = (await ideas.listar({ estado: 'pausada' })).length > 0;
  }

  // Cierre ordenado: las ejecuciones quedan detenidas (retomables) y la cola vuelve a su estado previo.
  async function apagar(ms = 10000) {
    apagando = true;
    for (const a of activas.values()) {
      a.motivo = 'detener';
      a.control.abort();
    }
    await detener(cola.map((c) => c.ref));
    const t0 = Date.now();
    while (activas.size && Date.now() - t0 < ms) await new Promise((r) => setTimeout(r, 50));
  }

  // Lo que las ejecuciones en marcha pueden estar escribiendo ahora mismo.
  function objetivosActivos() {
    const enMarcha = [...activas.values()].filter((a) => a.objetivos);
    return enMarcha.length ? [...enMarcha.flatMap(objetivos), 'notas-globales.md'] : [];
  }

  return Object.assign(emisor, {
    lanzar, detener, reanudar, germinar, estado, recuperar, apagar, registrarCuota, objetivosActivos,
    fijarAjenosExternos: (fn) => (ajenosExternos = fn),
  });
}
