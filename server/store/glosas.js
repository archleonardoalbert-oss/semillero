import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { slugify, escribirJSON, leerJSON } from './fsutil.js';

const RE_ID = /^g-[a-z0-9]+-[a-f0-9]{6}$/;

// Glosas de una idea: notas al margen ancladas a un fragmento. Solo las escribe el servidor.
export function crearAlmacenGlosas(cfg, { proteger }) {
  const valido = (s) => slugify(s) === s;
  const dir = (c, i) => {
    if (!valido(c) || !valido(i)) throw new Error('ruta-invalida');
    return path.join(cfg.datos, 'carpetas', c, 'ideas', i, 'glosas');
  };
  const archivo = (c, i, id) => {
    if (!RE_ID.test(id)) throw new Error('glosa-no-existe');
    return path.join(dir(c, i), `${id}.json`);
  };
  const rel = (c, i, id) => `carpetas/${c}/ideas/${i}/glosas/${id}.json`;

  async function listar(c, i) {
    const nombres = (await fs.readdir(dir(c, i)).catch(() => [])).filter((a) => a.endsWith('.json'));
    const todas = await Promise.all(nombres.map((n) => leerJSON(path.join(dir(c, i), n), null)));
    return todas.filter(Boolean).sort((a, b) => a.creada.localeCompare(b.creada));
  }

  async function obtener(c, i, id) {
    const g = await leerJSON(archivo(c, i, id), null);
    if (!g) throw new Error('glosa-no-existe');
    return g;
  }

  function crear(c, i, datos) {
    const id = `g-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    const glosa = { estado: 'en-proceso', sessionId: null, ...datos, id, creada: new Date().toISOString() };
    return proteger([rel(c, i, id)], async () => {
      await escribirJSON(archivo(c, i, id), glosa);
      return glosa;
    });
  }

  function actualizar(c, i, id, parche) {
    return proteger([rel(c, i, id)], async () => {
      const g = { ...(await obtener(c, i, id)), ...(typeof parche === 'function' ? parche(await obtener(c, i, id)) : parche), id };
      await escribirJSON(archivo(c, i, id), g);
      return g;
    });
  }

  return { listar, obtener, crear, actualizar };
}
