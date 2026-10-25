import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ejecutar as ejecutarReal } from './runner.js';
import { argsEvaluacion, promptVerificador, mensajeVerificacion, parsearVeredictoVerificacion } from './prompt.js';
import { validarMapa } from './mapa.js';
import { tipoDe, bloqueBancal } from './tipos.js';

const RE_ADJUNTO = /^germinacion\/verificaciones\/[a-z0-9-]{1,40}\/adjuntos\/[^/\\]+$/;
const MAX_TEXTO = 100000;
const sinComodin = (p) => p.replace(/\/\*\*$/, '');

// Verificación rigurosa de una incógnita que el usuario dice haber resuelto. Una sesión nueva e
// independiente juzga; si acepta, el nodo queda resuelto y el árbol puede crecer con los problemas
// que el resultado abre.
export function crearMotorVerificacion({ cfg, ideas, carpetas = null, verificaciones, germinacion, guard, cola, ajustes, ejecutar = ejecutarReal }) {
  const emisor = new EventEmitter();
  const activas = new Map(); // 'c/i/n' → objetivos
  const objetivosActivos = () => [...activas.values()].flat();
  cola.registrarEscritor(objetivosActivos);

  const clave = (ref, n) => `${ref.carpetaId}/${ref.ideaId}/${n}`;

  async function incognita(ref, n) {
    const v = validarMapa(await germinacion.leerMapa(ref.carpetaId, ref.ideaId));
    const nodo = v.ok ? v.mapa.nodos.find((x) => x.id === n && x.tipo === 'incognita') : null;
    if (!nodo) throw new Error('nodo-invalido');
    return { mapa: v.mapa, nodo };
  }

  async function enviar(ref, n, { texto, adjuntos = [] } = {}) {
    const limpio = String(texto ?? '').trim().slice(0, MAX_TEXTO);
    const lista = (Array.isArray(adjuntos) ? adjuntos : []).map(String).filter((a) => RE_ADJUNTO.test(a) && a.startsWith(`germinacion/verificaciones/${n}/`));
    if (!limpio && !lista.length) throw new Error('prompt-vacio');
    const { mapa, nodo } = await incognita(ref, n);
    const k = clave(ref, n);
    if (activas.has(k)) throw new Error('en-proceso');
    const idea = await ideas.obtener(ref.carpetaId, ref.ideaId);
    if (idea.estado === 'en-proceso') throw new Error('en-proceso');
    if (cola.estado().pausadaPorCuota) throw new Error('cuota');
    const progreso = await germinacion.leerProgreso(ref.carpetaId, ref.ideaId);
    if (progreso.nodos?.[n]?.estado === 'resuelta') throw new Error('ya-resuelta');
    const rutaIdea = ideas.relIdea(ref.carpetaId, ref.ideaId);
    // Reserva síncrona antes de escribir nada: dos envíos seguidos no lanzan dos verificaciones.
    activas.set(k, []);
    let v;
    try {
      v = await verificaciones.crear(ref.carpetaId, ref.ideaId, n, { texto: limpio, adjuntos: lista });
    } catch (e) {
      activas.delete(k);
      throw e;
    }
    const rv = verificaciones.relV(ref.carpetaId, ref.ideaId, n, v.id);
    const rutas = { ampliacion: `${rv}/ampliacion.json`, figuras: `${rutaIdea}/figuras/verificaciones/${v.id}` };
    // Puede escribir la ampliación, figuras y documentos de nodos NUEVOS (los existentes se restauran al cerrar).
    activas.set(k, [rutas.ampliacion, `${rutas.figuras}/**`, `${rutaIdea}/germinacion/nodos/**`]);
    emisor.emit('verificacion', { ref, nodo: n, verificacion: v });
    correr(ref, n, v, { idea, mapa, nodo, rutas, rutaIdea }).catch((e) => console.error('[verificacion]', e));
    return v;
  }

  async function correr(ref, n, v, { idea, mapa, nodo, rutas, rutaIdea }) {
    const k = clave(ref, n);
    const objetivos = activas.get(k);
    let sesion = null;
    let final;
    const carpeta = await carpetas?.obtener(ref.carpetaId).catch(() => null);
    try {
      const marca = new Date().toISOString().replace(/[:.]/g, '-');
      const r = await ejecutar({
        cfg,
        args: argsEvaluacion({
          sessionId: null, ajustes: await ajustes.leer(), sistema: promptVerificador(tipoDe(carpeta)),
          mensaje: `${bloqueBancal(carpeta, (await ajustes.leer()).contexto)}\n\n${mensajeVerificacion({ idea, rutaIdea, nodo, texto: v.texto, adjuntos: v.adjuntos, rutas })}`,
        }),
        cwd: cfg.datos,
        rutaRegistro: path.join(ideas.dirIdea(ref.carpetaId, ref.ideaId), 'registro', 'verificaciones', `${n}-${v.id}-${marca}.jsonl`),
        alEvento: (ev) => {
          if (ev.type === 'system' && ev.subtype === 'init' && ev.session_id) sesion = ev.session_id;
          emisor.emit('verificacion-evento', { ref, nodo: n, id: v.id, ev });
          cola.registrarCuota(ev);
        },
        senal: new AbortController().signal,
      });
      // Primero se lee lo que propone (veredicto y ampliación) para saber qué documentos nuevos son legítimos;
      // después el guard revierte todo lo demás, salvo lo que otros escritores estén escribiendo ahora.
      const { veredicto, informe } = parsearVeredictoVerificacion(r.resultado?.result);
      const aceptado = !r.resultado?.is_error && veredicto?.resuelto === true;
      const amp = aceptado ? await leerAmpliacion(rutas, mapa, n, rutaIdea) : { nuevos: [], recursos: [] };
      const docsNuevos = amp.nuevos.map((x) => `${rutaIdea}/germinacion/${x.documento}`);
      const propios = aceptado ? [rutas.ampliacion, `${rutas.figuras}/**`, ...docsNuevos] : [`${rutas.figuras}/**`];
      const ajenos = [...cola.objetivosAjenos(objetivosActivos), ...[...activas].filter(([x]) => x !== k).flatMap(([, o]) => o)];
      await guard.verificar({ propios, ajenosActivos: ajenos });
      if (r.resultado?.is_error || !veredicto) {
        await guard.restaurar([`${rutas.figuras}/**`]);
        final = { estado: 'error', error: r.errorArranque ?? (r.resultado?.result && !veredicto ? 'El verificador no emitió un veredicto válido' : r.resultado?.result || r.stderr?.trim().split('\n').at(-1) || 'La sesión no respondió') };
      } else if (!veredicto.resuelto) {
        await guard.commitear(propios.map(sinComodin), `verificación ${k}`);
        final = { estado: 'rechazada', resumen: veredicto.resumen, informe };
      } else {
        final = { estado: 'aceptada', resumen: veredicto.resumen, informe, ...(await ampliar(ref, amp, rutaIdea, docsNuevos)) };
        await guard.commitear(propios.map(sinComodin), `verificación ${k}`);
        await germinacion.fijarResuelta(ref.carpetaId, ref.ideaId, n, { verificacion: v.id });
        // La idea cambia de versión: la página de la germinación recarga el mapa y el progreso.
        const idea = await ideas.obtener(ref.carpetaId, ref.ideaId);
        emisor.emit('idea', { ref, idea: await ideas.actualizar(ref.carpetaId, ref.ideaId, { germinacion: { ...idea.germinacion, ultima: new Date().toISOString() } }) });
      }
    } catch (e) {
      final = { estado: 'error', error: String(e.message ?? e) };
    } finally {
      activas.delete(k);
    }
    const x = await verificaciones.actualizar(ref.carpetaId, ref.ideaId, n, v.id, { ...final, ...(sesion ? { sessionId: sesion } : {}) });
    emisor.emit('verificacion', { ref, nodo: n, verificacion: x });
  }

  // La ampliación propuesta: solo nodos con id y documento bien formados y que no existan ya.
  async function leerAmpliacion(rutas, mapa, n, rutaIdea) {
    const texto = await fs.readFile(path.join(cfg.datos, rutas.ampliacion), 'utf8').catch(() => null);
    if (texto === null) return { nuevos: [], recursos: [] };
    try {
      const amp = JSON.parse(texto);
      const ids = new Set(mapa.nodos.map((x) => x.id));
      const nuevos = Array.isArray(amp.nodos) ? amp.nodos : [];
      let bien = nuevos.every((x) => /^[a-z0-9-]{1,40}$/.test(x?.id ?? '') && x.documento === `nodos/${x.id}.md` && !ids.has(x.id)
        && x.tipo === 'incognita' && Array.isArray(x.depende) && x.depende.includes(n));
      // El documento debe ser nuevo de verdad: escrito ahora, no un archivo que ya estuviera commiteado.
      for (const x of bien ? nuevos : []) {
        const rel = `${rutaIdea}/germinacion/${x.documento}`;
        const existe = await fs.access(path.join(cfg.datos, rel)).then(() => true, () => false);
        if (!existe || (await guard.commiteado(rel)) !== null) bien = false;
      }
      return { nuevos: bien ? nuevos : [], recursos: Array.isArray(amp.recursos) ? amp.recursos : [], invalida: !bien && nuevos.length > 0 };
    } catch {
      return { nuevos: [], recursos: [], invalida: true };
    }
  }

  // Fusiona la ampliación en el mapa. Todo o nada: si el mapa resultante no es válido, no se toca
  // y los documentos nuevos se descartan.
  async function ampliar(ref, amp, rutaIdea, docsNuevos) {
    const aviso = (motivo) => ({ nodosNuevos: [], aviso: `La ampliación propuesta no se añadió al árbol: ${motivo}` });
    const descartar = async (motivo) => {
      for (const d of docsNuevos) await fs.rm(path.join(cfg.datos, d), { force: true });
      return aviso(motivo);
    };
    if (amp.invalida) return descartar('ids repetidos o documentos mal nombrados');
    if (!amp.nuevos.length && !amp.recursos.length) return { nodosNuevos: [] };
    const mapa = await germinacion.leerMapa(ref.carpetaId, ref.ideaId);
    const v = validarMapa({ ...mapa, nodos: [...mapa.nodos, ...amp.nuevos], recursos: [...(mapa.recursos ?? []), ...amp.recursos] });
    if (!v.ok) return descartar(v.motivo);
    const rel = `${rutaIdea}/germinacion/mapa.json`;
    await guard.proteger([rel], () => fs.writeFile(path.join(cfg.datos, rel), `${JSON.stringify(v.mapa, null, 2)}\n`), 'ampliación tras verificación');
    return { nodosNuevos: amp.nuevos.map((x) => x.id) };
  }

  async function recuperar() {
    for (const idea of await ideas.listar()) {
      for (const v of await verificaciones.todas(idea.carpetaId, idea.id)) {
        if (v.estado !== 'revisando') continue;
        const rutaIdea = ideas.relIdea(idea.carpetaId, idea.id);
        // Lo que el verificador dejó en nodos/ sin terminar no es legítimo: lo del servidor está siempre commiteado.
        await guard.restaurar([`${verificaciones.relV(idea.carpetaId, idea.id, v.nodo, v.id)}/ampliacion.json`, `${rutaIdea}/figuras/verificaciones/${v.id}/**`, `${rutaIdea}/germinacion/nodos/**`]);
        await verificaciones.actualizar(idea.carpetaId, idea.id, v.nodo, v.id, { estado: 'error', error: 'Se interrumpió al reiniciar el servidor.' });
      }
    }
  }

  return Object.assign(emisor, { enviar, recuperar, objetivosActivos });
}
