import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { slugify, escribirJSON, leerJSON, escribirAtomico } from './fsutil.js';

const RE_NODO = /^[a-z0-9-]{1,40}$/;
const RE_ID = /^v-[a-z0-9]+-[a-f0-9]{6}$/;
const EXTENSIONES = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'txt', 'md', 'csv', 'py', 'ipynb', 'json', 'tex']);

// Verificaciones de una incógnita: lo que el usuario envía como solución y el informe del verificador.
// Nunca se borran. Solo las escribe el servidor (salvo la ampliación, que la propone la sesión).
export function crearAlmacenVerificaciones(cfg, { proteger }) {
  const valido = (s) => slugify(s) === s;
  const relNodo = (c, i, n) => {
    if (!valido(c) || !valido(i)) throw new Error('ruta-invalida');
    if (!RE_NODO.test(String(n))) throw new Error('nodo-invalido');
    return `carpetas/${c}/ideas/${i}/germinacion/verificaciones/${n}`;
  };
  const relV = (c, i, n, id) => {
    if (!RE_ID.test(String(id))) throw new Error('verificacion-no-existe');
    return `${relNodo(c, i, n)}/${id}`;
  };
  const abs = (rel) => path.join(cfg.datos, rel);

  async function leer(c, i, n, id) {
    const v = await leerJSON(abs(`${relV(c, i, n, id)}/verificacion.json`), null);
    if (!v) throw new Error('verificacion-no-existe');
    return v;
  }

  async function listar(c, i, n) {
    const ids = (await fs.readdir(abs(relNodo(c, i, n))).catch(() => [])).filter((x) => RE_ID.test(x));
    const todas = await Promise.all(ids.map((id) => leerJSON(abs(`${relV(c, i, n, id)}/verificacion.json`), null)));
    return todas.filter(Boolean).sort((a, b) => a.creado.localeCompare(b.creado));
  }

  function crear(c, i, n, { texto, adjuntos }) {
    const id = `v-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    const v = { id, nodo: n, estado: 'revisando', creado: new Date().toISOString(), texto, adjuntos, sessionId: null, resumen: '', informe: '', nodosNuevos: [], aviso: null, error: null };
    const rel = `${relV(c, i, n, id)}/verificacion.json`;
    return proteger([rel], async () => {
      await escribirJSON(abs(rel), v);
      return v;
    });
  }

  function actualizar(c, i, n, id, parche) {
    const rel = `${relV(c, i, n, id)}/verificacion.json`;
    return proteger([rel], async () => {
      const v = { ...(await leer(c, i, n, id)), ...parche, id };
      await escribirJSON(abs(rel), v);
      return v;
    });
  }

  async function guardarAdjunto(c, i, n, nombre, buffer) {
    const base = path.basename(String(nombre ?? ''));
    const ext = path.extname(base).slice(1).toLowerCase();
    if (!EXTENSIONES.has(ext)) throw new Error('extension-invalida');
    const dir = `${relNodo(c, i, n)}/adjuntos`;
    await fs.mkdir(abs(dir), { recursive: true });
    const raiz = slugify(path.basename(base, path.extname(base))) || 'resultado';
    const archivo = await proteger(
      (a) => [`${dir}/${a}`],
      async () => {
        let a = `${raiz}.${ext}`;
        for (let k = 2; await fs.access(abs(`${dir}/${a}`)).then(() => true, () => false); k++) a = `${raiz}-${k}.${ext}`;
        await escribirAtomico(abs(`${dir}/${a}`), buffer);
        return a;
      },
    );
    return `germinacion/verificaciones/${n}/adjuntos/${archivo}`;
  }

  async function todas(c, i) {
    const raiz = abs(`carpetas/${c}/ideas/${i}/germinacion/verificaciones`);
    const lista = [];
    for (const n of await fs.readdir(raiz).catch(() => [])) if (RE_NODO.test(n)) lista.push(...(await listar(c, i, n)));
    return lista;
  }

  return { leer, listar, crear, actualizar, guardarAdjunto, todas, relV };
}
