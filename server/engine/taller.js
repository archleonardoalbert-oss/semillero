import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ejecutar as ejecutarReal } from './runner.js';
import { argsTaller, mensajeInicialTaller, mensajeTaller, parsearRespuestaTaller } from './prompt.js';
import { validarMapa } from './mapa.js';

const MAX_TEXTO = 30000;
const RE_ADJUNTO = /^germinacion\/talleres\/[a-z0-9-]{1,40}\/adjuntos\/[^/\\]+$/;
const sinComodin = (p) => p.replace(/\/\*\*$/, '');

// Talleres: una sesión dedicada a cada incógnita, con el contexto justo, que acompaña al usuario
// mientras la investiga. Corre al momento, como las glosas, coordinada con la cola por el guard.
export function crearMotorTaller({ cfg, ideas, talleres, germinacion, guard, cola, ajustes, ejecutar = ejecutarReal }) {
  const emisor = new EventEmitter();
  const activos = new Map(); // 'c/i/n' → objetivos
  const reservados = new Set();

  const objetivosActivos = () => [...activos.values()].flat();
  cola.registrarEscritor(objetivosActivos);

  const clave = (ref, n) => `${ref.carpetaId}/${ref.ideaId}/${n}`;
  const rutas = (ref, n) => {
    const rt = talleres.relTaller(ref.carpetaId, ref.ideaId, n);
    return { taller: rt, propuesta: `${rt}/propuesta.md`, figuras: `${ideas.relIdea(ref.carpetaId, ref.ideaId)}/figuras/talleres/${n}` };
  };
  const objetivosDe = (ref, n) => [rutas(ref, n).propuesta, `${rutas(ref, n).figuras}/**`];

  // El mapa en disco puede estar a medio escribir o manipulado por una sesión: solo se usa si es válido
  // (lo que también garantiza documentos «nodos/<id>.md»); si no, el último commiteado.
  async function mapaValido(ref) {
    const v = validarMapa(await germinacion.leerMapa(ref.carpetaId, ref.ideaId));
    if (v.ok) return v.mapa;
    try {
      const commit = validarMapa(JSON.parse(await guard.commiteado(`${ideas.relIdea(ref.carpetaId, ref.ideaId)}/germinacion/mapa.json`)));
      return commit.ok ? commit.mapa : null;
    } catch {
      return null;
    }
  }

  async function incognita(ref, n) {
    const mapa = await mapaValido(ref);
    const nodo = mapa?.nodos?.find((x) => x.id === n && x.tipo === 'incognita');
    if (!nodo) throw new Error('nodo-invalido');
    return { mapa, nodo };
  }

  async function comprobarIdea(ref) {
    const idea = await ideas.obtener(ref.carpetaId, ref.ideaId);
    if (idea.estado === 'en-proceso') throw new Error('en-proceso');
    if (cola.estado().pausadaPorCuota) throw new Error('cuota');
    return idea;
  }

  // Índice de las incógnitas de todas las germinaciones, para que la sesión pueda conectar problemas.
  async function indiceGlobal() {
    const lineas = [];
    for (const i of await ideas.listar()) {
      const mapa = await germinacion.leerMapa(i.carpetaId, i.id);
      for (const n of mapa?.nodos ?? []) {
        if (n.tipo !== 'incognita') continue;
        lineas.push(`- «${i.titulo}» (carpetaId ${i.carpetaId}, ideaId ${i.id}) · nodo ${n.id}: ${n.titulo}${n.abierto ? ' [problema abierto]' : ''} → carpetas/${i.carpetaId}/ideas/${i.id}/germinacion/${n.documento}`);
        if (lineas.length >= 200) return lineas.join('\n');
      }
    }
    return lineas.join('\n');
  }

  async function enviar(ref, n, { texto, adjuntos = [] } = {}) {
    const limpio = String(texto ?? '').trim().slice(0, MAX_TEXTO);
    const lista = (Array.isArray(adjuntos) ? adjuntos : []).map(String).filter((a) => RE_ADJUNTO.test(a) && a.startsWith(`germinacion/talleres/${n}/`));
    if (!limpio && !lista.length) throw new Error('prompt-vacio');
    await incognita(ref, n);
    const k = clave(ref, n);
    if (activos.has(k) || reservados.has(k)) throw new Error('en-proceso');
    reservados.add(k);
    try {
      await comprobarIdea(ref);
      const t = await talleres.actualizar(ref.carpetaId, ref.ideaId, n, (x) => ({
        estado: 'en-proceso',
        error: null,
        mensajes: [...x.mensajes, { autor: 'usuario', contenido: limpio, adjuntos: lista, fecha: new Date().toISOString() }],
      }));
      emisor.emit('taller', { ref, nodo: n, taller: t });
      correr(ref, n, t, { texto: limpio, adjuntos: lista });
      return t;
    } finally {
      reservados.delete(k);
    }
  }

  function correr(ref, n, t, peticion) {
    ejecutarTaller(ref, n, t, peticion).catch((e) => console.error('[taller] fallo', clave(ref, n), e));
  }

  async function primerMensaje(ref, n, peticion, historial = []) {
    const idea = await ideas.obtener(ref.carpetaId, ref.ideaId);
    const { mapa, nodo } = await incognita(ref, n);
    const progreso = await germinacion.leerProgreso(ref.carpetaId, ref.ideaId);
    return mensajeInicialTaller({
      idea, mapa, nodo, rutaIdea: ideas.relIdea(ref.carpetaId, ref.ideaId),
      notas: progreso.nodos?.[n]?.notas ?? '', indice: await indiceGlobal(), historial,
      texto: peticion.texto, adjuntos: peticion.adjuntos, rutas: rutas(ref, n),
    });
  }

  async function ejecutarTaller(ref, n, t, peticion) {
    const k = clave(ref, n);
    const objetivos = objetivosDe(ref, n);
    activos.set(k, objetivos);
    const rPropuesta = path.join(cfg.datos, rutas(ref, n).propuesta);
    const antes = await fs.readFile(rPropuesta, 'utf8').catch(() => null);
    let sesion = null;
    let final;
    try {
      const lanzar = async (sessionId, mensaje) => {
        const marca = new Date().toISOString().replace(/[:.]/g, '-');
        return ejecutar({
          cfg,
          args: argsTaller({ sessionId, ajustes: await ajustes.leer(), mensaje }),
          cwd: cfg.datos,
          rutaRegistro: path.join(ideas.dirIdea(ref.carpetaId, ref.ideaId), 'registro', 'talleres', `${n}-${marca}.jsonl`),
          alEvento: (ev) => {
            if (ev.type === 'system' && ev.subtype === 'init' && ev.session_id) sesion = ev.session_id;
            emisor.emit('taller-evento', { ref, nodo: n, ev });
            cola.registrarCuota(ev);
          },
          senal: new AbortController().signal,
        });
      };
      const rutaIdea = ideas.relIdea(ref.carpetaId, ref.ideaId);
      let r = t.sessionId
        ? await lanzar(t.sessionId, mensajeTaller({ rutaIdea, ...peticion }))
        : await lanzar(null, await primerMensaje(ref, n, peticion));
      // Claude borra las sesiones antiguas: se empieza otra con el contexto y el historial reciente.
      if (t.sessionId && /No conversation found/i.test(r.stderr ?? '')) {
        r = await lanzar(null, await primerMensaje(ref, n, peticion, t.mensajes.slice(-11, -1)));
      }
      const { restaurados } = await guard.verificar({ propios: objetivos, ajenosActivos: [...cola.objetivosAjenos(objetivosActivos), ...[...activos].filter(([x]) => x !== k).flatMap(([, o]) => o)] });
      if (restaurados.length) console.warn('[guard] restaurados tras taller', restaurados);
      final = await cerrar(ref, n, r, { antes, rPropuesta, objetivos });
    } catch (e) {
      console.error('[taller] ejecución fallida', k, e);
      final = { estado: 'error', error: String(e.message ?? e) };
    } finally {
      activos.delete(k);
    }
    const taller = await talleres.actualizar(ref.carpetaId, ref.ideaId, n, (x) => ({
      ...final,
      ...(sesion ? { sessionId: sesion } : {}),
      mensajes: final.respuesta ? [...x.mensajes, { autor: 'claude', contenido: final.respuesta, fecha: new Date().toISOString() }] : x.mensajes,
      conexiones: final.conexiones ? unir(x.conexiones, final.conexiones) : x.conexiones,
      respuesta: undefined,
    }));
    emisor.emit('taller', { ref, nodo: n, taller });
  }

  const unir = (viejas, nuevas) => {
    const k = (c) => `${c.carpetaId}/${c.ideaId}/${c.nodo}`;
    const mapa = new Map(viejas.map((c) => [k(c), c]));
    for (const c of nuevas) mapa.set(k(c), c);
    return [...mapa.values()];
  };

  async function conexionValida(ref, n, c) {
    if (c.carpetaId === ref.carpetaId && c.ideaId === ref.ideaId && c.nodo === n) return false;
    const mapa = await mapaValido({ carpetaId: c.carpetaId, ideaId: c.ideaId }).catch(() => null);
    return Boolean(mapa?.nodos?.some((x) => x.id === c.nodo && x.tipo === 'incognita'));
  }

  // Una glosa «Corregir» que enmienda ahora mismo el enunciado: aplicar o restaurar la pisaría.
  const enmendandose = (ref, nodo) => {
    const doc = `${ideas.relIdea(ref.carpetaId, ref.ideaId)}/germinacion/${nodo.documento}`;
    return cola.objetivosAjenos(objetivosActivos).includes(doc);
  };

  async function cerrar(ref, n, r, { antes, rPropuesta, objetivos }) {
    const res = r.resultado;
    if (!res || res.is_error || !String(res.result ?? '').trim()) {
      await guard.restaurar(objetivos);
      return { estado: 'error', error: r.errorArranque ?? (res?.result || r.stderr?.trim().split('\n').at(-1) || 'La sesión no respondió') };
    }
    await guard.commitear(objetivos.map(sinComodin), `taller ${clave(ref, n)}`);
    const { cuerpo, propuesta, conexiones } = parsearRespuestaTaller(res.result);
    const despues = await fs.readFile(rPropuesta, 'utf8').catch(() => null);
    const validas = [];
    for (const c of conexiones) if (await conexionValida(ref, n, c)) validas.push(c);
    return {
      estado: 'libre',
      error: null,
      respuesta: cuerpo,
      conexiones: validas,
      // Solo hay propuesta si la sesión escribió el documento.
      ...(despues !== null && despues !== antes ? { propuesta: { resumen: propuesta?.resumen ?? 'Nueva versión del enunciado', fecha: new Date().toISOString() } } : {}),
    };
  }

  async function aplicar(ref, n) {
    const { nodo } = await incognita(ref, n);
    await comprobarIdea(ref);
    if (activos.has(clave(ref, n)) || enmendandose(ref, nodo)) throw new Error('en-proceso');
    const t = await talleres.aplicarPropuesta(ref.carpetaId, ref.ideaId, n, nodo.documento);
    emisor.emit('taller', { ref, nodo: n, taller: t });
    return t;
  }

  async function descartar(ref, n) {
    if (activos.has(clave(ref, n))) throw new Error('en-proceso');
    const t = await talleres.descartarPropuesta(ref.carpetaId, ref.ideaId, n);
    emisor.emit('taller', { ref, nodo: n, taller: t });
    return t;
  }

  async function restaurar(ref, n, version) {
    const { nodo } = await incognita(ref, n);
    await comprobarIdea(ref);
    if (activos.has(clave(ref, n)) || enmendandose(ref, nodo)) throw new Error('en-proceso');
    const t = await talleres.restaurar(ref.carpetaId, ref.ideaId, n, version, nodo.documento);
    emisor.emit('taller', { ref, nodo: n, taller: t });
    return t;
  }

  // Al arrancar: los talleres cortados quedan en error y se deshace lo que dejaron a medias.
  // Se recorren los talleres en disco, no el mapa: puede estar a medio escribir o haber perdido el nodo.
  async function recuperar() {
    for (const idea of await ideas.listar()) {
      const dir = path.join(ideas.dirIdea(idea.carpetaId, idea.id), 'germinacion', 'talleres');
      for (const n of await fs.readdir(dir).catch(() => [])) {
        const t = await talleres.leer(idea.carpetaId, idea.id, n).catch(() => null);
        if (t?.estado !== 'en-proceso') continue;
        await guard.restaurar(objetivosDe({ carpetaId: idea.carpetaId, ideaId: idea.id }, n));
        await talleres.actualizar(idea.carpetaId, idea.id, n, { estado: 'error', error: 'Se interrumpió al reiniciar el servidor.' });
      }
    }
  }

  return Object.assign(emisor, { enviar, aplicar, descartar, restaurar, recuperar, objetivosActivos });
}
