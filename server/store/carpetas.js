import fs from 'node:fs/promises';
import path from 'node:path';
import { slugify, slugUnico, escribirAtomico, escribirJSON, leerJSON, existe } from './fsutil.js';
import { TIPO_POR_DEFECTO, esTipo } from '../engine/tipos.js';

const MAX_DESCRIPCION = 2000;
// Los bancales anteriores a los tipos se tratan como académicos.
const normalizar = (c) => (c ? { descripcion: '', ...c, tipo: esTipo(c.tipo) ? c.tipo : TIPO_POR_DEFECTO } : c);
function validarTipo(tipo) {
  if (tipo !== undefined && !esTipo(tipo)) throw new Error('tipo-invalido');
}

export async function asegurarNotasGlobales(datos) {
  const ruta = path.join(datos, 'notas-globales.md');
  if (!(await existe(ruta))) await escribirAtomico(ruta, '# Notas globales\n\n');
}

export function crearAlmacenCarpetas(cfg, { alEscribir = async () => {}, proteger: protegerOpcion } = {}) {
  // Cada escritura del usuario va con su commit en una sola operación (ver guard.proteger).
  const proteger = protegerOpcion ?? (async (rutas, fn) => {
    const r = await fn();
    await alEscribir(typeof rutas === 'function' ? rutas(r) : rutas);
    return r;
  });
  const raiz = path.join(cfg.datos, 'carpetas');
  const dirDe = (id) => path.join(raiz, slugify(id) === id ? id : '__invalida__');
  const rutaJson = (id) => path.join(dirDe(id), 'carpeta.json');

  async function obtener(id) {
    const c = await leerJSON(rutaJson(id), null);
    if (!c) throw new Error('carpeta-no-existe');
    return normalizar(c);
  }

  async function listar() {
    await fs.mkdir(raiz, { recursive: true });
    const ids = await fs.readdir(raiz);
    const todas = await Promise.all(ids.map((id) => leerJSON(path.join(raiz, id, 'carpeta.json'), null)));
    return todas.filter(Boolean).map(normalizar).sort((a, b) => a.orden - b.orden);
  }

  async function crear({ nombre, color = '#7aa2ff', tipo = TIPO_POR_DEFECTO, descripcion = '' }) {
    if (!String(nombre ?? '').trim()) throw new Error('nombre-vacio');
    validarTipo(tipo);
    const existentes = await listar();
    return proteger(
      (c) => [`carpetas/${c.id}/carpeta.json`, `carpetas/${c.id}/notas.md`, 'notas-globales.md'],
      async () => {
        await fs.mkdir(raiz, { recursive: true });
        await asegurarNotasGlobales(cfg.datos);
        const id = await slugUnico(raiz, slugify(nombre));
        const carpeta = {
          id,
          nombre: nombre.trim(),
          color,
          tipo,
          descripcion: String(descripcion ?? '').trim().slice(0, MAX_DESCRIPCION),
          creada: new Date().toISOString(),
          orden: existentes.reduce((m, c) => Math.max(m, c.orden), -1) + 1,
        };
        await escribirJSON(rutaJson(id), carpeta);
        await escribirAtomico(path.join(dirDe(id), 'notas.md'), `# Notas de ${carpeta.nombre}\n\n`);
        await fs.mkdir(path.join(dirDe(id), 'ideas'), { recursive: true });
        return carpeta;
      },
    );
  }

  function actualizar(id, parche) {
    try {
      validarTipo(parche.tipo);
    } catch (e) {
      return Promise.reject(e);
    }
    if (parche.descripcion !== undefined) parche = { ...parche, descripcion: String(parche.descripcion ?? '').trim().slice(0, MAX_DESCRIPCION) };
    return proteger([`carpetas/${id}/carpeta.json`], async () => {
      const carpeta = { ...(await obtener(id)), ...parche, id };
      await escribirJSON(rutaJson(id), carpeta);
      return carpeta;
    });
  }

  const renombrar = (id, nombre) => {
    if (!String(nombre ?? '').trim()) throw new Error('nombre-vacio');
    return actualizar(id, { nombre: nombre.trim() });
  };

  async function borrar(id) {
    await obtener(id);
    const ideas = await fs.readdir(path.join(dirDe(id), 'ideas')).catch(() => []);
    if (ideas.length) throw new Error('carpeta-no-vacia');
    await proteger([`carpetas/${id}`], () => fs.rm(dirDe(id), { recursive: true, force: true }));
  }

  return { listar, obtener, crear, actualizar, renombrar, borrar };
}
