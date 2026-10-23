import fs from 'node:fs/promises';
import path from 'node:path';
import { slugify, slugUnico, escribirAtomico, escribirJSON, leerJSON } from './fsutil.js';
import { crearAlmacenCarpetas } from './carpetas.js';
import { parsearDictamen } from '../engine/veredicto.js';

export const ESTADOS_PENDIENTES = new Set(['borrador', 'replica-pendiente', 'detenida', 'error']);
const EXTENSIONES = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);
const RE_MENSAJE = /^(\d{3})-(usuario|claude)\.md$/;

export function crearAlmacenIdeas(cfg, { alEscribir = async () => {} } = {}) {
  const carpetas = crearAlmacenCarpetas(cfg);
  const dirIdeas = (c) => path.join(cfg.datos, 'carpetas', slugify(c) === c ? c : '__invalida__', 'ideas');
  const dirIdea = (c, i) => path.join(dirIdeas(c), slugify(i) === i ? i : '__invalida__');
  const rel = (c, i, ...resto) => ['carpetas', c, 'ideas', i, ...resto].join('/');

  async function leerIdea(c, i) {
    const idea = await leerJSON(path.join(dirIdea(c, i), 'idea.json'), null);
    if (!idea) throw new Error('idea-no-existe');
    return idea;
  }

  async function mensajes(c, i) {
    const dir = path.join(dirIdea(c, i), 'hilo');
    const archivos = (await fs.readdir(dir).catch(() => [])).filter((a) => RE_MENSAJE.test(a)).sort();
    return Promise.all(
      archivos.map(async (archivo) => {
        const [, n, autor] = archivo.match(RE_MENSAJE);
        const contenido = await fs.readFile(path.join(dir, archivo), 'utf8');
        const m = { n: Number(n), autor, archivo, contenido };
        if (autor === 'claude') {
          const p = parsearDictamen(contenido);
          m.meta = p?.meta ?? null;
          if (p) m.contenido = p.cuerpo;
        }
        return m;
      }),
    );
  }

  async function guardarIdea(idea) {
    await escribirJSON(path.join(dirIdea(idea.carpetaId, idea.id), 'idea.json'), idea);
  }

  async function actualizar(c, i, parche) {
    const idea = { ...(await leerIdea(c, i)), ...parche, id: i, carpetaId: c, actualizada: new Date().toISOString() };
    await guardarIdea(idea);
    await alEscribir([rel(c, i, 'idea.json')]);
    return idea;
  }

  async function crear(c, { titulo, cuerpo = '' }) {
    await carpetas.obtener(c);
    if (!String(titulo ?? '').trim()) throw new Error('titulo-vacio');
    await fs.mkdir(dirIdeas(c), { recursive: true });
    const id = await slugUnico(dirIdeas(c), slugify(titulo));
    const ahora = new Date().toISOString();
    const idea = { id, carpetaId: c, titulo: titulo.trim(), creada: ahora, actualizada: ahora, estado: 'borrador' };
    await guardarIdea(idea);
    await escribirAtomico(path.join(dirIdea(c, id), 'hilo', '001-usuario.md'), cuerpo);
    await alEscribir([rel(c, id, 'idea.json'), rel(c, id, 'hilo', '001-usuario.md')]);
    return idea;
  }

  async function obtener(c, i) {
    return { ...(await leerIdea(c, i)), hilo: await mensajes(c, i) };
  }

  async function listar({ carpetaId, estado } = {}) {
    const ids = carpetaId ? [carpetaId] : (await carpetas.listar()).map((x) => x.id);
    const todas = [];
    for (const c of ids) {
      for (const i of await fs.readdir(dirIdeas(c)).catch(() => [])) {
        const idea = await leerJSON(path.join(dirIdea(c, i), 'idea.json'), null);
        if (idea && (!estado || idea.estado === estado)) todas.push(idea);
      }
    }
    return todas.sort((a, b) => a.creada.localeCompare(b.creada));
  }

  const tieneDictamen = async (c, i) => (await mensajes(c, i)).some((m) => m.autor === 'claude');

  async function editarOriginal(c, i, { titulo, cuerpo }) {
    const parche = {};
    if (titulo !== undefined) {
      if (!String(titulo).trim()) throw new Error('titulo-vacio');
      parche.titulo = String(titulo).trim();
    }
    const escritos = [];
    if (cuerpo !== undefined) {
      await escribirAtomico(path.join(dirIdea(c, i), 'hilo', '001-usuario.md'), cuerpo);
      escritos.push(rel(c, i, 'hilo', '001-usuario.md'));
      const idea = await leerIdea(c, i);
      if (idea.estado !== 'en-proceso' && (await tieneDictamen(c, i))) {
        Object.assign(parche, { estado: 'replica-pendiente', editadaTrasDictamen: true });
      }
    }
    await alEscribir(escritos);
    return actualizar(c, i, parche);
  }

  async function numeroSiguiente(c, i) {
    const ms = await mensajes(c, i);
    return (ms.at(-1)?.n ?? 0) + 1;
  }

  async function siguienteArchivo(c, i) {
    return `${String(await numeroSiguiente(c, i)).padStart(3, '0')}-claude.md`;
  }

  async function responder(c, i, cuerpo) {
    const ms = await mensajes(c, i);
    if (!ms.some((m) => m.autor === 'claude')) throw new Error('sin-dictamen');
    const idea = await leerIdea(c, i);
    if (idea.estado === 'en-proceso') throw new Error('en-proceso');
    // Varias réplicas seguidas se acumulan en el mismo mensaje pendiente.
    const ultimo = ms.at(-1);
    const archivo = ultimo.autor === 'usuario' && ultimo.n > 1
      ? ultimo.archivo
      : `${String(ultimo.n + 1).padStart(3, '0')}-usuario.md`;
    const texto = ultimo.autor === 'usuario' && ultimo.n > 1 ? `${ultimo.contenido}\n\n${cuerpo}` : cuerpo;
    await escribirAtomico(path.join(dirIdea(c, i), 'hilo', archivo), texto);
    await alEscribir([rel(c, i, 'hilo', archivo)]);
    return actualizar(c, i, { estado: 'replica-pendiente' });
  }

  async function pendientes() {
    const grupos = [];
    for (const carpeta of await carpetas.listar()) {
      const ideas = [];
      for (const idea of await listar({ carpetaId: carpeta.id })) {
        if (!ESTADOS_PENDIENTES.has(idea.estado)) continue;
        ideas.push({ ...idea, etiqueta: (await tieneDictamen(carpeta.id, idea.id)) ? 'ANALIZADA' : 'NUEVA' });
      }
      if (ideas.length) grupos.push({ carpeta, ideas });
    }
    return grupos;
  }

  async function guardarAdjunto(c, i, nombre, buffer) {
    await leerIdea(c, i);
    const base = path.basename(String(nombre ?? ''));
    const ext = path.extname(base).slice(1).toLowerCase();
    if (!EXTENSIONES.has(ext)) throw new Error('extension-invalida');
    const dir = path.join(dirIdea(c, i), 'adjuntos');
    await fs.mkdir(dir, { recursive: true });
    const raiz = slugify(path.basename(base, path.extname(base)));
    let archivo = `${raiz}.${ext}`;
    for (let n = 2; await fs.access(path.join(dir, archivo)).then(() => true, () => false); n++) archivo = `${raiz}-${n}.${ext}`;
    await escribirAtomico(path.join(dir, archivo), buffer);
    await alEscribir([rel(c, i, 'adjuntos', archivo)]);
    return `adjuntos/${archivo}`;
  }

  async function borrar(c, i) {
    const idea = await leerIdea(c, i);
    if (idea.estado === 'en-proceso') throw new Error('en-proceso');
    await fs.rm(dirIdea(c, i), { recursive: true, force: true });
    await alEscribir([rel(c, i)]);
  }

  return {
    crear, obtener, listar, actualizar, editarOriginal, responder, siguienteArchivo,
    numeroSiguiente, pendientes, guardarAdjunto, borrar, mensajes,
    dirIdea, relIdea: (c, i) => rel(c, i),
  };
}
