import fs from 'node:fs/promises';
import path from 'node:path';
import { slugify, escribirJSON, leerJSON } from './fsutil.js';

const RE_ID = /^[a-z0-9-]{1,40}$/;
const ESTADOS = new Set(['pendiente', 'en-curso', 'hecho', 'abierta', 'atacando', 'resuelta']);
const MAX_NOTAS = 50000;
const VACIO = () => ({ respuestas: {}, nodos: {}, enviado: { respuestas: {}, nodos: {} }, peticiones: [], pendiente: null });

// Lo que el usuario aporta a su germinación: respuestas del diagnóstico, progreso y notas por nodo,
// y peticiones a la sesión. Lo escribe solo el servidor; las sesiones no pueden tocarlo.
export function crearAlmacenGerminacion(cfg, { proteger }) {
  const valido = (s) => slugify(s) === s;
  const dir = (c, i) => {
    if (!valido(c) || !valido(i)) throw new Error('ruta-invalida');
    return path.join(cfg.datos, 'carpetas', c, 'ideas', i, 'germinacion');
  };
  const relProgreso = (c, i) => `carpetas/${c}/ideas/${i}/germinacion/progreso.json`;

  async function leerMapa(c, i) {
    try {
      return JSON.parse(await fs.readFile(path.join(dir(c, i), 'mapa.json'), 'utf8'));
    } catch {
      return null;
    }
  }

  async function leerProgreso(c, i) {
    return { ...VACIO(), ...(await leerJSON(path.join(dir(c, i), 'progreso.json'), {})) };
  }

  function modificar(c, i, fn) {
    return proteger([relProgreso(c, i)], async () => {
      const p = await leerProgreso(c, i);
      fn(p);
      await escribirJSON(path.join(dir(c, i), 'progreso.json'), p);
      return p;
    });
  }

  function guardarRespuestas(c, i, respuestas) {
    if (!respuestas || typeof respuestas !== 'object') throw new Error('respuestas-invalidas');
    const limpias = {};
    for (const [k, v] of Object.entries(respuestas)) {
      if (!RE_ID.test(k)) throw new Error('respuestas-invalidas');
      limpias[k] = String(v ?? '').slice(0, MAX_NOTAS);
    }
    return modificar(c, i, (p) => (p.respuestas = limpias));
  }

  function marcarNodo(c, i, id, { estado, notas } = {}) {
    if (!RE_ID.test(String(id))) return Promise.reject(new Error('nodo-invalido'));
    if (estado !== undefined && !ESTADOS.has(estado)) return Promise.reject(new Error('estado-invalido'));
    return modificar(c, i, (p) => {
      const n = { ...(p.nodos[id] ?? {}) };
      if (estado !== undefined) n.estado = estado;
      if (notas !== undefined) n.notas = String(notas).slice(0, MAX_NOTAS);
      p.nodos[id] = n;
    });
  }

  // La petición queda pendiente hasta que una ejecución termina con un mapa válido.
  function ponerPeticion(c, i, peticion) {
    const texto = String(peticion ?? '').trim();
    return modificar(c, i, (p) => {
      if (!texto) return;
      p.pendiente = p.pendiente ? `${p.pendiente}\n\n${texto}` : texto;
      p.peticiones.push({ texto, fecha: new Date().toISOString() });
    });
  }

  // Markdown con lo que el usuario ha cambiado desde la última vez que se le comunicó a la sesión.
  async function cambiosDesdeEnvio(c, i, mapa) {
    const p = await leerProgreso(c, i);
    const titulo = new Map((mapa?.nodos ?? []).map((n) => [n.id, n.titulo]));
    const lineas = [];
    for (const [id, n] of Object.entries(p.nodos)) {
      const antes = p.enviado.nodos[id] ?? {};
      const nombre = `«${titulo.get(id) ?? id}» (${id})`;
      if (n.estado && n.estado !== antes.estado) lineas.push(`- ${nombre}: ahora está **${n.estado}**${antes.estado ? ` (antes ${antes.estado})` : ''}.`);
      if (n.notas && n.notas !== antes.notas) lineas.push(`- Notas del usuario en ${nombre}:\n\n${n.notas.replace(/^/gm, '  > ')}`);
    }
    return lineas.join('\n');
  }

  function marcarEnviado(c, i) {
    return modificar(c, i, (p) => {
      p.enviado = structuredClone({ respuestas: p.respuestas, nodos: p.nodos });
      p.pendiente = null;
    });
  }

  return { leerMapa, leerProgreso, guardarRespuestas, marcarNodo, ponerPeticion, cambiosDesdeEnvio, marcarEnviado };
}
