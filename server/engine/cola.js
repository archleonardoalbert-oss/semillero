import { EventEmitter } from 'node:events';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ESTADOS_PENDIENTES } from '../store/ideas.js';
import { ejecutar as ejecutarReal } from './runner.js';
import { argsClaude, mensajeEjecucion } from './prompt.js';
import { parsearDictamen } from './veredicto.js';
import { notificar as notificarReal } from './notificar.js';

const clave = (r) => `${r.carpetaId}/${r.ideaId}`;
const RE_LIMITE = /usage limit|rate limit|limit reached|límite/i;

// Gestiona las ejecuciones: máximo `paralelo` a la vez, el resto en cola.
export function crearCola({ cfg, ideas, carpetas, ajustes, guard, ejecutar = ejecutarReal, notificar = notificarReal }) {
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
    if (idea.sessionId && idea.interrumpida) return 'reanudar';
    if (!hilo.some((m) => m.autor === 'claude')) return 'inicial';
    return 'replica';
  }

  async function encolar(ref, { soloPausadas }) {
    const k = clave(ref);
    if (ocupadas.has(k)) return;
    ocupadas.add(k);
    try {
      const idea = await ideas.obtener(ref.carpetaId, ref.ideaId);
      const valida = soloPausadas ? idea.estado === 'pausada' : ESTADOS_PENDIENTES.has(idea.estado);
      if (!valida) {
        ocupadas.delete(k);
        return;
      }
      cola.push({ ref, tipo: tipoDe(idea, idea.hilo) });
      await cambiar(ref, { estado: 'en-proceso', estadoPrevio: idea.estado });
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
    return [`${a.rutaIdea}/hilo/${a.archivoDestino}`, `${a.rutaIdea}/figuras/**`, `carpetas/${a.ref.carpetaId}/notas.md`];
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
      a.archivoDestino = await ideas.siguienteArchivo(ref.carpetaId, ref.ideaId);
      const nueva = !idea.sessionId;
      const sessionId = idea.sessionId ?? crypto.randomUUID();
      await cambiar(ref, { sessionId, interrumpida: true, archivoDestino: a.archivoDestino });
      const ultimo = idea.hilo.at(-1);
      const mensaje = mensajeEjecucion({
        tipo, idea, carpeta, rutaIdea: a.rutaIdea,
        archivoDestino: `${a.rutaIdea}/hilo/${a.archivoDestino}`,
        replica: ultimo?.autor === 'usuario' && ultimo.n > 1 ? ultimo.contenido : '',
      });
      const marca = new Date().toISOString().replace(/[:.]/g, '-');
      // Pausada o detenida mientras se preparaba: no llega a lanzar claude.
      const r = control.signal.aborted ? { codigo: null, abortado: true } : await ejecutar({
        cfg,
        args: argsClaude({ sessionId, nueva, ajustes: await ajustes.leer(), mensaje }),
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
    const otros = [...[...activas.values()].filter((o) => o !== a && o.archivoDestino).flatMap(objetivos), ...ajenosExternos()];
    const propios = [...objetivos(a), 'notas-globales.md'];
    const { restaurados } = await guard.verificar({ propios, ajenosActivos: otros });
    if (restaurados.length) console.warn('[guard] restaurados', restaurados);

    const ruta = path.join(cfg.datos, a.rutaIdea, 'hilo', a.archivoDestino);
    const texto = await fs.readFile(ruta, 'utf8').catch(() => null);
    const dictamen = texto && parsearDictamen(texto);
    if (texto && !dictamen) await fs.rm(ruta, { force: true });
    await guard.commitear(propios.map((p) => p.replace(/\/\*\*$/, '')), `dictamen ${clave(ref)}`);

    if (r.resultado?.is_error && RE_LIMITE.test(String(r.resultado.result ?? ''))) {
      await pausarPorCuota();
      a.motivo = a.motivo ?? 'pausa';
    }
    if (dictamen) return finalConDictamen(dictamen);
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

  function finalConDictamen({ meta: m }) {
    return {
      estado: m.veredicto, etapa: m.etapa, resumen: m.resumen, ultimoVeredicto: new Date().toISOString(),
      interrumpida: false, editadaTrasDictamen: false, enmendados: [], error: null,
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
      await cambiar(ref, { estado: idea.estadoPrevio ?? 'borrador' });
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
      await cambiar(ref, { estado: idea.estadoPrevio ?? 'borrador' });
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
    const enMarcha = [...activas.values()].filter((a) => a.archivoDestino);
    return enMarcha.length ? [...enMarcha.flatMap(objetivos), 'notas-globales.md'] : [];
  }

  return Object.assign(emisor, {
    lanzar, detener, reanudar, estado, recuperar, apagar, registrarCuota, objetivosActivos,
    fijarAjenosExternos: (fn) => (ajenosExternos = fn),
  });
}
