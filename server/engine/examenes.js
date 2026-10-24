import { EventEmitter } from 'node:events';
import path from 'node:path';
import { ejecutar as ejecutarReal } from './runner.js';
import { argsEvaluacion, promptExamen, mensajeGenerarExamen, mensajeCorregirExamen, parsearExamen, parsearCorreccion } from './prompt.js';

export const LIMITE_SUFICIENTE_MS = 4.5 * 3600 * 1000; // decisión del usuario: 4 h 30 min; avanzado y experto, sin límite
const DIFICULTADES = new Set(['suficiente', 'avanzado', 'experto']);
const RE_ADJUNTO = /^germinacion\/examenes\/[a-z0-9-]{1,40}\/x-[a-z0-9]+-[a-f0-9]{6}\/adjuntos\/[^/\\]+$/;
const MAX_TEXTO = 60000;
const sinComodin = (p) => p.replace(/\/\*\*$/, '');
const herramientasDe = (ev) => {
  if (ev.type === 'stream_event' && ev.event?.type === 'content_block_start' && ['tool_use', 'server_tool_use'].includes(ev.event.content_block?.type)) return [ev.event.content_block.name];
  if (ev.type === 'assistant') return (ev.message?.content ?? []).filter((c) => c.type === 'tool_use' || c.type === 'server_tool_use').map((c) => c.name);
  return [];
};

// Exámenes de dominio de los nodos de estudio: se generan al momento con la dificultad elegida y los
// corrige la misma sesión, que es la única que conoce la rúbrica. Aprobar (≥ 3/5) domina el nodo.
export function crearMotorExamenes({
  cfg, ideas, examenes, germinacion, guard, cola, ajustes, ejecutar = ejecutarReal,
  reloj = Date.now, temporizar = (fn, ms) => setTimeout(fn, Math.min(ms, 2 ** 31 - 1)).unref?.(),
}) {
  const emisor = new EventEmitter();
  const activos = new Map(); // 'c/i/n/id' → objetivos
  const objetivosActivos = () => [...activos.values()].flat();
  cola.registrarEscritor(objetivosActivos);

  const clave = (ref, n, id) => `${ref.carpetaId}/${ref.ideaId}/${n}/${id}`;
  const figuras = (ref, id) => `${ideas.relIdea(ref.carpetaId, ref.ideaId)}/figuras/examenes/${id}`;
  const emitir = (ref, n, examen) => emisor.emit('examen', { ref, nodo: n, examen });

  async function nodoEstudio(ref, n) {
    const mapa = await germinacion.leerMapa(ref.carpetaId, ref.ideaId);
    const nodo = mapa?.nodos?.find((x) => x.id === n && x.tipo === 'estudio');
    if (!nodo) throw new Error('nodo-invalido');
    return { mapa, nodo };
  }

  // Lo que depende del nodo, directa o indirectamente: lo que el examen «suficiente» debe cubrir.
  function aguasAbajo(mapa, n) {
    const fuera = new Set([n]);
    let cambio = true;
    while (cambio) {
      cambio = false;
      for (const x of mapa.nodos) if (!fuera.has(x.id) && (x.depende ?? []).some((d) => fuera.has(d))) (fuera.add(x.id), (cambio = true));
    }
    return mapa.nodos.filter((x) => x.id !== n && fuera.has(x.id) && x.tipo === 'incognita');
  }

  async function comprobarIdea(ref) {
    const idea = await ideas.obtener(ref.carpetaId, ref.ideaId);
    if (idea.estado === 'en-proceso') throw new Error('en-proceso');
    if (cola.estado().pausadaPorCuota) throw new Error('cuota');
    return idea;
  }

  async function lanzar(ref, n, id, { sessionId, mensaje }) {
    let sesion = null;
    const marca = new Date(reloj()).toISOString().replace(/[:.]/g, '-');
    const r = await ejecutar({
      cfg,
      args: argsEvaluacion({ sessionId, ajustes: await ajustes.leer(), mensaje, sistema: promptExamen() }),
      cwd: cfg.datos,
      rutaRegistro: path.join(ideas.dirIdea(ref.carpetaId, ref.ideaId), 'registro', 'examenes', `${n}-${id}-${marca}.jsonl`),
      alEvento: (ev) => {
        if (ev.type === 'system' && ev.subtype === 'init' && ev.session_id) sesion = ev.session_id;
        // Al navegador solo llega QUÉ hace la sesión (buscar, leer…), nunca qué busca, ni su texto ni su
        // pensamiento: ahí elabora la rúbrica y elige de dónde saca los problemas.
        for (const herramienta of herramientasDe(ev)) emisor.emit('examen-evento', { ref, nodo: n, id, ev: { type: 'accion', herramienta } });
        cola.registrarCuota(ev);
      },
      senal: new AbortController().signal,
    });
    return { r, sesion };
  }

  // Al terminar una ejecución: solo se conservan las figuras del propio examen.
  async function cerrarEjecucion(ref, n, id) {
    const k = clave(ref, n, id);
    const objetivos = activos.get(k) ?? [];
    const { restaurados } = await guard.verificar({ propios: objetivos, ajenosActivos: [...cola.objetivosAjenos(objetivosActivos), ...[...activos].filter(([x]) => x !== k).flatMap(([, o]) => o)] });
    if (restaurados.length) console.warn('[guard] restaurados tras examen', restaurados);
    await guard.commitear(objetivos.map(sinComodin), `examen ${k}`);
    activos.delete(k);
  }

  const textoFallo = (r) => r.errorArranque ?? (r.resultado?.result || r.stderr?.trim().split('\n').at(-1) || 'La sesión no respondió');

  const reservados = new Set(); // generaciones aceptadas que aún no han creado su examen
  async function generar(ref, n, { dificultad } = {}) {
    if (!DIFICULTADES.has(dificultad)) throw new Error('dificultad-invalida');
    const kn = `${ref.carpetaId}/${ref.ideaId}/${n}`;
    if (reservados.has(kn)) throw new Error('examen-abierto');
    reservados.add(kn);
    try {
      return await generarReservado(ref, n, dificultad);
    } finally {
      reservados.delete(kn);
    }
  }

  async function generarReservado(ref, n, dificultad) {
    const { mapa, nodo } = await nodoEstudio(ref, n);
    const idea = await comprobarIdea(ref);
    const abiertos = (await examenes.listar(ref.carpetaId, ref.ideaId, n)).filter((e) => ['generando', 'abierto', 'corrigiendo'].includes(e.estado));
    if (abiertos.length) throw new Error('examen-abierto');
    const e = await examenes.crear(ref.carpetaId, ref.ideaId, n, { dificultad });
    emitir(ref, n, e);
    activos.set(clave(ref, n, e.id), [`${figuras(ref, e.id)}/**`]);
    const mensaje = mensajeGenerarExamen({
      idea, mapa, nodo, dificultad, rutaIdea: ideas.relIdea(ref.carpetaId, ref.ideaId), aguasAbajo: aguasAbajo(mapa, n), figuras: figuras(ref, e.id),
    });
    (async () => {
      let final;
      try {
        const { r, sesion } = await lanzar(ref, n, e.id, { sessionId: null, mensaje });
        await cerrarEjecucion(ref, n, e.id);
        const ex = !r.resultado?.is_error && parsearExamen(r.resultado?.result);
        if (!ex) final = { estado: 'error', error: r.resultado && !r.resultado.is_error ? 'La sesión no devolvió un examen válido' : textoFallo(r), sessionId: sesion };
        else {
          const inicio = new Date(reloj()).toISOString();
          const limite = dificultad === 'suficiente' ? new Date(reloj() + LIMITE_SUFICIENTE_MS).toISOString() : null;
          final = { estado: 'abierto', sessionId: sesion, instrucciones: ex.instrucciones, preguntas: ex.preguntas, inicio, limite };
          if (limite) programarLimite(ref, n, e.id, LIMITE_SUFICIENTE_MS);
        }
      } catch (err) {
        activos.delete(clave(ref, n, e.id));
        final = { estado: 'error', error: String(err.message ?? err) };
      }
      emitir(ref, n, await examenes.actualizar(ref.carpetaId, ref.ideaId, n, e.id, final));
    })().catch((err) => console.error('[examenes] generar', err));
    return e;
  }

  function programarLimite(ref, n, id, ms) {
    temporizar(() => entregar(ref, n, id, { automatico: true }).catch(() => {}), Math.max(0, ms));
  }

  const vencido = (e) => e.limite && reloj() >= Date.parse(e.limite);

  async function abierto(ref, n, id) {
    const e = await examenes.leer(ref.carpetaId, ref.ideaId, n, id);
    if (e.estado !== 'abierto') throw new Error('examen-cerrado');
    if (vencido(e)) {
      entregar(ref, n, id, { automatico: true }).catch(() => {});
      throw new Error('tiempo-agotado');
    }
    return e;
  }

  async function responder(ref, n, id, { pregunta, texto, adjuntos } = {}) {
    const e = await abierto(ref, n, id);
    if (!e.preguntas.some((p) => p.id === pregunta)) throw new Error('pregunta-invalida');
    const lista = Array.isArray(adjuntos) ? adjuntos.map(String).filter((a) => RE_ADJUNTO.test(a) && a.includes(`/${id}/adjuntos/`)) : undefined;
    const x = await examenes.actualizar(ref.carpetaId, ref.ideaId, n, id, (actual) => {
      // Comprobado dentro de la escritura en serie: un autoguardado que llega tras la entrega no se cuela.
      if (actual.estado !== 'abierto') throw new Error('examen-cerrado');
      return {
      respuestas: {
        ...actual.respuestas,
        [pregunta]: {
          texto: texto === undefined ? actual.respuestas?.[pregunta]?.texto ?? '' : String(texto).slice(0, MAX_TEXTO),
          adjuntos: lista ?? actual.respuestas?.[pregunta]?.adjuntos ?? [],
        },
      },
      };
    });
    emitir(ref, n, x);
    return x;
  }

  async function adjuntar(ref, n, id, pregunta, nombre, buffer) {
    await abierto(ref, n, id);
    return examenes.guardarAdjunto(ref.carpetaId, ref.ideaId, n, id, pregunta, nombre, buffer);
  }

  const entregando = new Set();
  async function entregar(ref, n, id, { automatico = false } = {}) {
    const k = clave(ref, n, id);
    const e = await examenes.leer(ref.carpetaId, ref.ideaId, n, id);
    if (e.estado !== 'abierto' || entregando.has(k)) throw new Error('examen-cerrado');
    entregando.add(k);
    try {
      const x = await examenes.actualizar(ref.carpetaId, ref.ideaId, n, id, { estado: 'corrigiendo', entregado: new Date(reloj()).toISOString(), automatico });
      emitir(ref, n, x);
      corregir(ref, n, x).catch((err) => console.error('[examenes] corregir', err));
      return x;
    } finally {
      entregando.delete(k);
    }
  }

  async function corregir(ref, n, e) {
    const rutaIdea = ideas.relIdea(ref.carpetaId, ref.ideaId);
    activos.set(clave(ref, n, e.id), [`${figuras(ref, e.id)}/**`]);
    let final;
    try {
      let { r, sesion } = await lanzar(ref, n, e.id, { sessionId: e.sessionId, mensaje: mensajeCorregirExamen({ examen: e, rutaIdea }) });
      // Sesión perdida: se corrige en otra con el examen completo (la rúbrica se rehace).
      if (e.sessionId && /No conversation found/i.test(r.stderr ?? '')) {
        ({ r, sesion } = await lanzar(ref, n, e.id, { sessionId: null, mensaje: mensajeCorregirExamen({ examen: e, rutaIdea, sesionNueva: true }) }));
      }
      await cerrarEjecucion(ref, n, e.id);
      const c = !r.resultado?.is_error && parsearCorreccion(r.resultado?.result, e.preguntas);
      if (!c) final = { estado: 'entregado', error: r.resultado && !r.resultado.is_error ? 'La sesión no devolvió una corrección válida' : textoFallo(r) };
      else {
        final = { estado: 'corregido', error: null, correccion: { ...c, fecha: new Date(reloj()).toISOString() }, ...(sesion ? { sessionId: sesion } : {}) };
        if (c.aprobado) await germinacion.fijarDominio(ref.carpetaId, ref.ideaId, n, { dificultad: e.dificultad, nota: c.nota, examen: e.id });
      }
    } catch (err) {
      activos.delete(clave(ref, n, e.id));
      final = { estado: 'entregado', error: String(err.message ?? err) };
    }
    emitir(ref, n, await examenes.actualizar(ref.carpetaId, ref.ideaId, n, e.id, final));
  }

  // Reintentar la corrección de un examen entregado cuya corrección falló.
  async function reintentarCorreccion(ref, n, id) {
    await comprobarIdea(ref);
    const x = await examenes.actualizar(ref.carpetaId, ref.ideaId, n, id, (actual) => {
      if (actual.estado !== 'entregado') throw new Error('examen-cerrado');
      return { estado: 'corrigiendo', error: null };
    });
    emitir(ref, n, x);
    corregir(ref, n, x).catch((err) => console.error('[examenes] corregir', err));
    return x;
  }

  // Al arrancar: la generación cortada queda en error; lo que se corregía, se vuelve a corregir;
  // un examen abierto con el tiempo vencido se entrega, y si no, se vuelve a programar su límite.
  const pendientes = [];
  function reanudarCorrecciones() {
    for (const [ref, e] of pendientes.splice(0)) corregir(ref, e.nodo, e).catch((err) => console.error('[examenes] corregir', err));
  }

  async function recuperar() {
    for (const idea of await ideas.listar()) {
      const ref = { carpetaId: idea.carpetaId, ideaId: idea.id };
      for (const e of await examenes.todos(idea.carpetaId, idea.id)) {
        if (e.estado === 'generando') {
          await guard.restaurar([`${figuras(ref, e.id)}/**`]);
          await examenes.actualizar(ref.carpetaId, ref.ideaId, e.nodo, e.id, { estado: 'error', error: 'Se interrumpió al reiniciar el servidor.' });
        } else if (e.estado === 'corrigiendo') {
          // Se relanza después de que la cola se recupere (su guard no debe revertir esta corrección).
          pendientes.push([ref, e]);
        } else if (e.estado === 'abierto' && e.limite) {
          if (vencido(e)) await entregar(ref, e.nodo, e.id, { automatico: true }).catch(() => {});
          else programarLimite(ref, e.nodo, e.id, Date.parse(e.limite) - reloj());
        }
      }
    }
  }

  return Object.assign(emisor, { generar, responder, adjuntar, entregar, reintentarCorreccion, recuperar, reanudarCorrecciones, objetivosActivos });
}
