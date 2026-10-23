import fs from 'node:fs/promises';
import path from 'node:path';
import { slugify, slugUnico, escribirAtomico, escribirJSON, leerJSON, existe } from './fsutil.js';

export async function asegurarNotasGlobales(datos) {
  const ruta = path.join(datos, 'notas-globales.md');
  if (!(await existe(ruta))) await escribirAtomico(ruta, '# Notas globales\n\n');
}

export function crearAlmacenCarpetas(cfg, { alEscribir = async () => {} } = {}) {
  const raiz = path.join(cfg.datos, 'carpetas');
  const dirDe = (id) => path.join(raiz, slugify(id) === id ? id : '__invalida__');
  const rutaJson = (id) => path.join(dirDe(id), 'carpeta.json');

  async function obtener(id) {
    const c = await leerJSON(rutaJson(id), null);
    if (!c) throw new Error('carpeta-no-existe');
    return c;
  }

  async function listar() {
    await fs.mkdir(raiz, { recursive: true });
    const ids = await fs.readdir(raiz);
    const todas = await Promise.all(ids.map((id) => leerJSON(path.join(raiz, id, 'carpeta.json'), null)));
    return todas.filter(Boolean).sort((a, b) => a.orden - b.orden);
  }

  async function crear({ nombre, color = '#7aa2ff' }) {
    if (!String(nombre ?? '').trim()) throw new Error('nombre-vacio');
    await fs.mkdir(raiz, { recursive: true });
    await asegurarNotasGlobales(cfg.datos);
    const id = await slugUnico(raiz, slugify(nombre));
    const existentes = await listar();
    const carpeta = {
      id,
      nombre: nombre.trim(),
      color,
      creada: new Date().toISOString(),
      orden: existentes.reduce((m, c) => Math.max(m, c.orden), -1) + 1,
    };
    await escribirJSON(rutaJson(id), carpeta);
    await escribirAtomico(path.join(dirDe(id), 'notas.md'), `# Notas de ${carpeta.nombre}\n\n`);
    await fs.mkdir(path.join(dirDe(id), 'ideas'), { recursive: true });
    await alEscribir([`carpetas/${id}/carpeta.json`, `carpetas/${id}/notas.md`, 'notas-globales.md']);
    return carpeta;
  }

  async function actualizar(id, parche) {
    const carpeta = { ...(await obtener(id)), ...parche, id };
    await escribirJSON(rutaJson(id), carpeta);
    await alEscribir([`carpetas/${id}/carpeta.json`]);
    return carpeta;
  }

  const renombrar = (id, nombre) => {
    if (!String(nombre ?? '').trim()) throw new Error('nombre-vacio');
    return actualizar(id, { nombre: nombre.trim() });
  };

  async function borrar(id) {
    await obtener(id);
    const ideas = await fs.readdir(path.join(dirDe(id), 'ideas')).catch(() => []);
    if (ideas.length) throw new Error('carpeta-no-vacia');
    await fs.rm(dirDe(id), { recursive: true, force: true });
    await alEscribir([`carpetas/${id}`]);
  }

  return { listar, obtener, crear, actualizar, renombrar, borrar };
}
