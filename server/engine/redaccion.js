// Redacción automática de un curso («Aprender algo nuevo»): cuando la germinación deja aceptado el plan de
// estudios, cada nodo de estudio (una asignatura) lo redacta una sesión dedicada con contexto limpio, con tantas
// en paralelo como diga Ajustes y sin arrancar ninguna mientras la investigación está pausada por cuota.
// Cada sesión solo puede escribir en las carpetas de su nodo; lo demás se revierte. El nodo se acepta si su
// índice es válido, sus documentos existen y TODAS sus escenas pasan la comprobación en Node.
import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ejecutar as ejecutarReal } from './runner.js';
import { validarMapa } from './mapa.js';
import { validarIndice, escenasDe, documentosDe } from './indice.js';
import { tipoDe, bloqueBancal } from './tipos.js';
import { argsRedaccion, mensajeRedaccion } from './curso.js';
import { listaRespuestas } from './prompt.js';
import { probarEscena } from '../escenas/probar.js';
import { RE_LIMITE } from './cola.js';

const INTENTOS = 2; // la redacción y una corrección en la misma sesión
const sinComodin = (p) => p.replace(/\/\*\*$/, '');

export function crearMotorRedaccion({ cfg, ideas, carpetas, germinacion, guard, cola, ajustes, ejecutar = ejecutarReal, probar = probarEscena }) {
  const emisor = new EventEmitter();
  const activas = new Map(); // 'c/i/n' → { objetivos, control, motivo }
  const fila = []; // [{ ref, nodo }] pendientes de arrancar, en orden
  const objetivosActivos = () => [...activas.values()].flatMap((a) => a.objetivos);
  cola.registrarEscritor(objetivosActivos);

  const clave = (ref, n) => `${ref.carpetaId}/${ref.ideaId}/${n}`;
  const rutaIdea = (ref) => ideas.relIdea(ref.carpetaId, ref.ideaId);
  const relEstado = (ref) => `${rutaIdea(ref)}/germinacion/redaccion.json`;
  const objetivosNodo = (ref, n) => {
    const r = rutaIdea(ref);
    return [`${r}/germinacion/nodos/${n}/**`, `${r}/germinacion/escenas/${n}/**`, `${r}/germinacion/recursos/${n}/**`, `${r}/figuras/${n}/**`];
  };

  async function leerEstado(ref) {
    const t = await fs.readFile(path.join(cfg.datos, relEstado(ref)), 'utf8').catch(() => null);
    try {
      return t ? JSON.parse(t) : { nodos: {} };
    } catch {
      return { nodos: {} };
    }
  }
  // Las escrituras del estado van serializadas por idea y commiteadas (el guard no las revierte).
  const cadenas = new Map();
  function modificar(ref, cambio, etiqueta) {
    const k = `${ref.carpetaId}/${ref.ideaId}`;
    const turno = (cadenas.get(k) ?? Promise.resolve()).then(() =>
      guard.proteger([relEstado(ref)], async () => {
        const e = await leerEstado(ref);
        // Una idea borrada mientras se redactaba: no se recrea su carpeta.
        if (!(await fs.stat(path.join(cfg.datos, rutaIdea(ref), 'idea.json')).catch(() => null))) return e;
        cambio(e);
        await fs.mkdir(path.dirname(path.join(cfg.datos, relEstado(ref))), { recursive: true });
        await fs.writeFile(path.join(cfg.datos, relEstado(ref)), `${JSON.stringify(e, null, 2)}\n`);
        return e;
      }, `redacción ${k}${etiqueta}`));
    cadenas.set(k, turno.catch(() => {}));
    return turno.then((e) => {
      conocidos.set(k, e);
      emisor.emit('redaccion', { ref, nodos: e.nodos, pausada: Boolean(e.pausada), iniciada: Boolean(e.iniciada) });
      return e;
    });
  }
  // Último estado conocido de cada idea (para `ocupada`, que es síncrona).
  const conocidos = new Map();
  const cambiarNodo = (ref, n, parche) =>
    modificar(ref, (e) => (e.nodos[n] = { ...(e.nodos[n] ?? {}), ...parche, actualizado: new Date().toISOString() }), `/${n}`);

  // Ideas cuya germinación pausó el usuario (y asignaturas pausadas una a una): nada de ellas arranca hasta
  // que pulse «Continuar». `pausando`: la pausa en curso de cada idea, que «Continuar» espera antes de seguir.
  const pausadas = new Set();
  const pausadosNodo = new Set();
  const pausando = new Map();
  const claveIdea = (ref) => `${ref.carpetaId}/${ref.ideaId}`;

  async function mapaDe(ref) {
    const v = validarMapa(await germinacion.leerMapa(ref.carpetaId, ref.ideaId));
    return v.ok && v.mapa.fase === 'mapa' ? v.mapa : null;
  }
  async function esCurso(ref) {
    const carpeta = await carpetas.obtener(ref.carpetaId).catch(() => null);
    return carpeta && tipoDe(carpeta) === 'aprendizaje' ? carpeta : null;
  }

  // Marca como pendientes las asignaturas que aún no están listas ni en marcha y las pone en la fila.
  async function planificar(ref) {
    if (!(await esCurso(ref))) return;
    const mapa = await mapaDe(ref);
    if (!mapa) return;
    const estado = await leerEstado(ref);
    if (estado.pausada) {
      pausadas.add(claveIdea(ref));
      return;
    }
    for (const n of mapa.nodos.filter((x) => x.tipo === 'estudio')) {
      const e = estado.nodos[n.id]?.estado;
      if (e === 'lista' || e === 'error' || e === 'pausada' || activas.has(clave(ref, n.id)) || fila.some((f) => clave(f.ref, f.nodo) === clave(ref, n.id))) continue;
      if (e !== 'pendiente') await cambiarNodo(ref, n.id, { estado: 'pendiente', error: null, intentos: 0 });
      fila.push({ ref, nodo: n.id });
    }
    await bombear();
  }

  // La cuota es una sola para todo Semillero: con la investigación pausada, o con alguna ventana por encima
  // de su umbral (y aún sin reiniciar), no se arranca nada; lo que esté en marcha se detiene y se retomará.
  async function sinCuota() {
    const { umbral5h, umbral7d } = await ajustes.leer();
    const { pausadaPorCuota, cuota } = cola.estado();
    const ahora = Date.now() / 1000;
    const superada = (u, umbral, reinicio) => (u ?? 0) >= umbral && !(reinicio && ahora >= reinicio);
    return pausadaPorCuota || superada(cuota?.cincoHoras, umbral5h, cuota?.resetsAt5h) || superada(cuota?.sieteDias, umbral7d, cuota?.resetsAt7d);
  }

  let bombeando = false;
  async function bombear() {
    if (bombeando) return;
    bombeando = true;
    try {
      const { paralelo } = await ajustes.leer();
      while (fila.length && activas.size < paralelo && !(await sinCuota())) {
        const { ref, nodo } = fila.shift();
        if (activas.has(clave(ref, nodo))) continue; // nunca dos sesiones sobre el mismo nodo
        if (pausadas.has(claveIdea(ref)) || pausadosNodo.has(clave(ref, nodo))) continue; // en pausa: no arranca
        const a = { objetivos: objetivosNodo(ref, nodo), control: new AbortController(), motivo: null };
        activas.set(clave(ref, nodo), a);
        a.promesa = correr(ref, nodo).catch((e) => console.error('[redaccion]', e));
      }
    } finally {
      bombeando = false;
    }
  }
  async function vigilarCuota() {
    if (await sinCuota()) {
      for (const a of activas.values()) {
        if (a.motivo) continue;
        a.motivo = 'pausa';
        a.control.abort();
      }
    } else if (fila.length) await bombear();
  }
  // Cada aviso de la cola (también los de cuota) y un latido por si el reinicio de la ventana llega en silencio.
  const latido = setInterval(() => vigilarCuota().catch(() => {}), 60000);
  latido.unref?.();
  cola.on?.('cola', () => vigilarCuota().catch(() => {}));

  async function correr(ref, n) {
    const k = clave(ref, n);
    const a = activas.get(k);
    const { objetivos } = a;
    let final;
    try {
      const carpeta = await esCurso(ref);
      const mapa = await mapaDe(ref);
      const nodo = mapa?.nodos.find((x) => x.id === n && x.tipo === 'estudio');
      if (!carpeta || !nodo) throw new Error('El nodo ya no existe en el plan de estudios');
      await cambiarNodo(ref, n, { estado: 'redactando', error: null });
      const idea = await ideas.obtener(ref.carpetaId, ref.ideaId);
      const progreso = await germinacion.leerProgreso(ref.carpetaId, ref.ideaId);
      const estado = await leerEstado(ref);
      const dependencias = nodo.depende
        .map((d) => mapa.nodos.find((x) => x.id === d))
        .map((d) => ({ ...d, indice: estado.nodos[d.id]?.estado === 'lista' }));
      const { contexto } = await ajustes.leer();
      // Tras una pausa por cuota se retoma la misma sesión, que sigue donde lo dejó.
      const previo = estado.nodos[n] ?? {};
      let sesion = previo.reanudar && previo.sesion ? previo.sesion : null;
      let mensaje = sesion ? mensajeRedaccion({ nodo, continuar: true }) : `${bloqueBancal(carpeta, contexto)}\n\n${mensajeRedaccion({
        idea, rutaIdea: rutaIdea(ref), nodo, mapa, dependencias,
        respuestasDiagnostico: listaRespuestas(mapa, progreso.respuestas),
        idiomas: Array.isArray(progreso.respuestas?.idiomas) ? progreso.respuestas.idiomas : [],
      })}`;
      for (let intento = 1; intento <= INTENTOS; intento++) {
        const marca = new Date().toISOString().replace(/[:.]/g, '-');
        const r = await ejecutar({
          cfg,
          args: argsRedaccion({ sessionId: sesion, ajustes: await ajustes.leer(), mensaje }),
          cwd: cfg.datos,
          rutaRegistro: path.join(ideas.dirIdea(ref.carpetaId, ref.ideaId), 'registro', 'redaccion', `${n}-${marca}.jsonl`),
          alEvento: (ev) => {
            if (ev.type === 'system' && ev.subtype === 'init' && ev.session_id) sesion = ev.session_id;
            emisor.emit('redaccion-evento', { ref, nodo: n, ev });
            cola.registrarCuota(ev);
          },
          senal: a.control.signal,
        });
        const ajenos = [...cola.objetivosAjenos(objetivosActivos), ...[...activas].filter(([x]) => x !== k).flatMap(([, o]) => o.objetivos)];
        await guard.verificar({ propios: objetivos, ajenosActivos: ajenos });
        if (a.motivo === 'detener') {
          // Apagado: lo escrito a medias se descarta y el nodo empezará de nuevo en el próximo arranque.
          await guard.restaurar(objetivos);
          final = { estado: 'pendiente', error: null, reanudar: false };
          break;
        }
        if (a.motivo === 'pausa-usuario') {
          // Pausa manual: lo escrito se guarda y la sesión se retomará al pulsar «Continuar».
          await guard.commitear(objetivos.map(sinComodin), `redacción ${k} (pausada)`);
          // Si mientras se detenía el usuario ya pulsó «Continuar», sigue en la misma sesión.
          const sigue = !pausadas.has(claveIdea(ref)) && !pausadosNodo.has(k);
          final = { estado: sigue ? 'pendiente' : 'pausada', error: null, sesion, reanudar: Boolean(sesion) };
          if (sigue) fila.unshift({ ref, nodo: n });
          break;
        }
        if (a.motivo === 'pausa' || (r.resultado?.is_error && RE_LIMITE.test(String(r.resultado.result ?? '')))) {
          // Sin cuota: lo escrito se guarda y el nodo vuelve a la fila para seguir en la misma sesión.
          await guard.commitear(objetivos.map(sinComodin), `redacción ${k} (pausada por cuota)`);
          // Si el usuario pausó mientras tanto, gana su pausa: no vuelve a la fila.
          const enPausaManual = a.motivo === 'pausa-usuario' || pausadas.has(claveIdea(ref)) || pausadosNodo.has(k);
          final = { estado: enPausaManual ? 'pausada' : 'pendiente', error: null, sesion, reanudar: Boolean(sesion) };
          if (!enPausaManual) fila.unshift({ ref, nodo: n });
          break;
        }
        if (r.errorArranque || r.resultado?.is_error || !r.resultado) {
          // Un fallo de la sesión (red, acceso, API): lo escrito se guarda y la conversación se conserva para
          // retomarla al volver a redactar.
          await guard.commitear(objetivos.map(sinComodin), `redacción ${k} (interrumpida por un fallo)`);
          final = { sesion, reanudar: Boolean(sesion), estado: 'error', error: r.errorArranque ?? String(r.resultado?.result || r.stderr?.trim().split('\n').at(-1) || 'La sesión no respondió') };
          break;
        }
        const v = await revisar(ref, n);
        if (v.ok) {
          await fs.writeFile(path.join(cfg.datos, rutaIdea(ref), 'germinacion/nodos', n, 'indice.json'), `${JSON.stringify(v.indice, null, 2)}\n`);
          await guard.commitear(objetivos.map(sinComodin), `redacción ${k}`);
          final = { estado: 'lista', error: null, intentos: intento, sesion, reanudar: false };
          break;
        }
        if (intento === INTENTOS || !sesion) {
          await guard.restaurar(objetivos);
          final = { estado: 'error', error: v.motivo, intentos: intento, reanudar: false };
          break;
        }
        mensaje = mensajeRedaccion({ nodo, reintento: v.motivo });
      }
    } catch (e) {
      await guard.restaurar(objetivos).catch(() => {});
      final = { estado: 'error', error: String(e.message ?? e) };
    }
    // El estado final se escribe antes de liberar el hueco: un planificar en medio no vuelve a encolar el nodo.
    try {
      await cambiarNodo(ref, n, final);
    } finally {
      activas.delete(k);
    }
    // Al pausar una sola asignatura, su hueco lo aprovecha la siguiente de la fila.
    if (a.motivo !== 'detener') await bombear();
  }

  // Lo que la sesión dejó: índice válido, documentos presentes y escenas que funcionan.
  async function revisar(ref, n) {
    const base = path.join(cfg.datos, rutaIdea(ref), 'germinacion');
    let indice;
    try {
      indice = JSON.parse(await fs.readFile(path.join(base, 'nodos', n, 'indice.json'), 'utf8'));
    } catch (e) {
      return { ok: false, motivo: `falta germinacion/nodos/${n}/indice.json o no es JSON válido (${e.message})` };
    }
    const v = validarIndice(indice, n);
    if (!v.ok) return { ok: false, motivo: `el índice no es válido: ${v.motivo}` };
    const fallos = [];
    for (const doc of documentosDe(v.indice)) {
      const md = await fs.readFile(path.join(base, doc), 'utf8').catch(() => null);
      if (!md?.trim()) {
        fallos.push(`falta el documento ${doc} o está vacío`);
        continue;
      }
      const { validas, invalidas } = escenasDe(md, n);
      for (const x of invalidas) fallos.push(`bloque escena mal formado en ${doc}: ${x} (debe ser JSON con "archivo": "escenas/${n}/<nombre>.js")`);
      for (const e of validas) {
        const ruta = path.join(base, e.archivo);
        if (!(await fs.stat(ruta).catch(() => null))) {
          fallos.push(`${doc} cita la escena ${e.archivo}, que no existe`);
          continue;
        }
        const p = await probar(ruta);
        if (!p.ok) fallos.push(`la escena ${e.archivo} no pasa la comprobación: ${p.errores.join('; ')}`);
      }
    }
    for (const r of v.indice.recursos) {
      if (r.archivo && !(await fs.stat(path.join(base, r.archivo)).catch(() => null))) fallos.push(`el recurso ${r.id} cita ${r.archivo}, que no existe (quita "archivo" si no se pudo descargar)`);
    }
    return fallos.length ? { ok: false, motivo: fallos.slice(0, 12).join(' | ') } : { ok: true, indice: v.indice };
  }

  // Estado de la redacción de una idea y los índices de los nodos listos (para la interfaz).
  async function estado(ref) {
    const e = await leerEstado(ref);
    const indices = {};
    for (const [n, x] of Object.entries(e.nodos)) {
      if (x.estado !== 'lista') continue;
      try {
        const v = validarIndice(JSON.parse(await fs.readFile(path.join(cfg.datos, rutaIdea(ref), 'germinacion/nodos', n, 'indice.json'), 'utf8')), n);
        if (v.ok) indices[n] = v.indice;
      } catch {
        /* sin índice legible: se mostrará como pendiente de revisión */
      }
    }
    conocidos.set(claveIdea(ref), e);
    return { nodos: e.nodos, indices, pausada: Boolean(e.pausada), iniciada: Boolean(e.iniciada) };
  }

  // «Comenzar»: la redacción del curso no arranca sola al terminar el plan (decisión del usuario). Una vez
  // comenzado, lo que se añada después al plan también se redacta solo.
  async function comenzar(ref) {
    if (!(await esCurso(ref)) || !(await mapaDe(ref))) throw new Error('no-disponible');
    await modificar(ref, (e) => {
      e.iniciada = true;
      delete e.pausada;
    }, ' (comenzar)');
    pausadas.delete(claveIdea(ref));
    await planificar(ref);
  }

  // Mandos de una sola asignatura.
  async function nodoDe(ref, n) {
    const mapa = await mapaDe(ref);
    if (!mapa?.nodos.some((x) => x.id === n && x.tipo === 'estudio')) throw new Error('nodo-invalido');
    return (await leerEstado(ref)).nodos[n] ?? null;
  }
  async function comenzarNodo(ref, n) {
    const k = clave(ref, n);
    if (reservados.has(k) || activas.has(k) || fila.some((f) => clave(f.ref, f.nodo) === k)) throw new Error('en-proceso');
    reservados.add(k);
    try {
      const x = await nodoDe(ref, n);
      if (x && x.estado !== 'error') throw new Error('estado-invalido');
      // Tras un fallo de la sesión se retoma su conversación; tras un nodo rechazado, se empieza de cero.
      await cambiarNodo(ref, n, { estado: 'pendiente', error: null, intentos: 0, reanudar: Boolean(x?.reanudar && x?.sesion) });
      fila.push({ ref, nodo: n });
    } finally {
      reservados.delete(k);
    }
    await bombear();
  }
  async function pausarNodo(ref, n) {
    const k = clave(ref, n);
    pausadosNodo.add(k);
    const i = fila.findIndex((f) => clave(f.ref, f.nodo) === k);
    if (i >= 0) {
      fila.splice(i, 1);
      await cambiarNodo(ref, n, { estado: 'pausada' });
      return;
    }
    const a = activas.get(k);
    if (!a) {
      pausadosNodo.delete(k);
      throw new Error('estado-invalido');
    }
    a.motivo = 'pausa-usuario';
    a.control.abort();
    await a.promesa;
  }
  async function continuarNodo(ref, n) {
    const x = await nodoDe(ref, n);
    if (x?.estado !== 'pausada') throw new Error('estado-invalido');
    pausadosNodo.delete(clave(ref, n));
    await cambiarNodo(ref, n, { estado: 'pendiente' });
    if (!fila.some((f) => clave(f.ref, f.nodo) === clave(ref, n))) fila.push({ ref, nodo: n });
    await bombear();
  }

  // Pausa manual de la germinación de una idea: las redacciones en marcha se detienen y guardan lo escrito, las
  // que esperaban no arrancan. Vuelve cuando todo está detenido y guardado.
  function pausar(ref, { principal = false } = {}) {
    const ik = claveIdea(ref);
    pausadas.add(ik);
    const p = pausarAhora(ref, ik, principal).finally(() => pausando.delete(ik));
    pausando.set(ik, p);
    return p;
  }
  async function pausarAhora(ref, ik, principal) {
    await modificar(ref, (e) => {
      e.pausada = true;
      if (principal) e.principalPausada = true;
    }, ' (pausa)');
    const enFila = fila.filter((f) => claveIdea(f.ref) === ik);
    for (const f of enFila) fila.splice(fila.indexOf(f), 1);
    for (const f of enFila) await cambiarNodo(ref, f.nodo, { estado: 'pausada' });
    const enMarcha = [...activas].filter(([k]) => k.startsWith(`${ik}/`)).map(([, a]) => a);
    for (const a of enMarcha) {
      a.motivo = 'pausa-usuario';
      a.control.abort();
    }
    await Promise.allSettled(enMarcha.map((a) => a.promesa));
  }

  // Continuar: primero las que estaban en marcha (en su misma sesión), después las que esperaban.
  // Devuelve si la sesión principal de la germinación estaba pausada (en marcha o en cola): la ruta la relanza.
  async function continuar(ref) {
    const ik = claveIdea(ref);
    pausadas.delete(ik);
    await pausando.get(ik);
    let principal = false;
    const e = await modificar(ref, (x) => {
      principal = Boolean(x.principalPausada);
      delete x.pausada;
      delete x.principalPausada;
    }, ' (continuar)');
    const enPausa = Object.entries(e.nodos).filter(([, x]) => x.estado === 'pausada').sort(([, a], [, b]) => Number(Boolean(b.reanudar)) - Number(Boolean(a.reanudar)));
    for (const [n] of enPausa) {
      pausadosNodo.delete(clave(ref, n));
      await cambiarNodo(ref, n, { estado: 'pendiente' });
      if (!fila.some((f) => clave(f.ref, f.nodo) === clave(ref, n))) fila.push({ ref, nodo: n });
    }
    // Sin «Comenzar», continuar no pone en marcha el curso entero: solo lo que estaba pausado.
    if (e.iniciada) await planificar(ref);
    else await bombear();
    return { principal };
  }
  const pausadaManual = (ref) => pausadas.has(claveIdea(ref));

  const ocupada = (ref) => pausadas.has(claveIdea(ref))
    || Object.values(conocidos.get(claveIdea(ref))?.nodos ?? {}).some((x) => x.estado === 'pausada')
    || [...activas.keys(), ...fila.map((f) => clave(f.ref, f.nodo))].some((k) => k.startsWith(`${ref.carpetaId}/${ref.ideaId}/`));

  // Un nodo en error se vuelve a redactar desde cero. La reserva es síncrona: dos clics no lanzan dos sesiones.
  const reservados = new Set();
  async function reintentar(ref, n) {
    const x = (await leerEstado(ref)).nodos[n];
    if (x?.estado !== 'error') throw new Error('estado-invalido');
    return comenzarNodo(ref, n);
  }

  // Al apagar el servidor: se detienen las sesiones (lo escrito a medias se descarta) y se espera a que cierren.
  async function apagar() {
    clearInterval(latido);
    fila.length = 0;
    const enMarcha = [...activas.values()];
    for (const a of enMarcha) {
      a.motivo = 'detener';
      a.control.abort();
    }
    await Promise.allSettled(enMarcha.map((a) => a.promesa));
  }

  // Al arrancar, ANTES de que la cola haga commit de lo que encuentre: lo que se estaba redactando cuando se
  // cortó vuelve a lo último bueno (si no, lo escrito a medias quedaría como bueno).
  async function restaurarInterrumpidas() {
    for (const idea of await ideas.listar()) {
      const ref = { carpetaId: idea.carpetaId, ideaId: idea.id };
      const e = await leerEstado(ref);
      for (const [n, x] of Object.entries(e.nodos)) {
        if (x.estado !== 'redactando') continue;
        await guard.restaurar(objetivosNodo(ref, n));
        await cambiarNodo(ref, n, { estado: 'pendiente', reanudar: false });
      }
    }
  }

  // Después de la cola (que ya sabe si la investigación está pausada): se retoma todo lo pendiente.
  async function recuperar() {
    await restaurarInterrumpidas();
    for (const idea of await ideas.listar()) {
      const ref = { carpetaId: idea.carpetaId, ideaId: idea.id };
      const e = await leerEstado(ref);
      conocidos.set(claveIdea(ref), e);
      if (e.pausada) {
        pausadas.add(claveIdea(ref));
        continue;
      }
      for (const [n, x] of Object.entries(e.nodos)) {
        if (x.estado === 'pendiente' && !fila.some((f) => clave(f.ref, f.nodo) === clave(ref, n))) fila.push({ ref, nodo: n });
      }
      if (e.iniciada) await planificar(ref);
      else await bombear();
    }
  }

  // Cuando la germinación de un curso deja aceptado el plan de estudios, se redacta lo que falte.
  // Solo si el usuario ya pulsó «Comenzar» (y no lo tiene en pausa).
  cola.on?.('idea', ({ ref, idea }) => {
    if (idea?.trabajo !== 'germinacion' || idea.estado !== 'aceptada' || idea.germinacion?.fase !== 'mapa') return;
    leerEstado(ref)
      .then((e) => e.iniciada && !e.pausada && planificar(ref))
      .catch((e) => console.error('[redaccion]', e));
  });

  return Object.assign(emisor, { planificar, estado, ocupada, reintentar, recuperar, restaurarInterrumpidas, apagar, pausar, continuar, pausadaManual, comenzar, comenzarNodo, pausarNodo, continuarNodo, objetivosActivos, detenerLatido: () => clearInterval(latido) });
}
