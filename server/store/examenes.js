import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { slugify, escribirJSON, leerJSON, escribirAtomico } from './fsutil.js';

const RE_NODO = /^[a-z0-9-]{1,40}$/;
const RE_ID = /^x-[a-z0-9]+-[a-f0-9]{6}$/;
const RE_PREGUNTA = /^[a-z0-9-]{1,20}$/;
const EXTENSIONES = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'txt', 'md', 'py', 'ipynb', 'tex']);

// Registro de exámenes de dominio de un nodo de estudio: preguntas, respuestas, adjuntos y corrección.
// Nunca se borra. Solo lo escribe el servidor.
export function crearAlmacenExamenes(cfg, { proteger }) {
  const valido = (s) => slugify(s) === s;
  const relNodo = (c, i, n) => {
    if (!valido(c) || !valido(i)) throw new Error('ruta-invalida');
    if (!RE_NODO.test(String(n))) throw new Error('nodo-invalido');
    return `carpetas/${c}/ideas/${i}/germinacion/examenes/${n}`;
  };
  const relExamen = (c, i, n, id) => {
    if (!RE_ID.test(String(id))) throw new Error('examen-no-existe');
    return `${relNodo(c, i, n)}/${id}`;
  };
  const abs = (rel) => path.join(cfg.datos, rel);

  async function leer(c, i, n, id) {
    const e = await leerJSON(abs(`${relExamen(c, i, n, id)}/examen.json`), null);
    if (!e) throw new Error('examen-no-existe');
    return e;
  }

  async function listar(c, i, n) {
    const ids = (await fs.readdir(abs(relNodo(c, i, n))).catch(() => [])).filter((x) => RE_ID.test(x));
    const todos = await Promise.all(ids.map((id) => leerJSON(abs(`${relExamen(c, i, n, id)}/examen.json`), null)));
    return todos.filter(Boolean).sort((a, b) => a.creado.localeCompare(b.creado));
  }

  function crear(c, i, n, { dificultad }) {
    const id = `x-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    const e = {
      id, nodo: n, dificultad, estado: 'generando', creado: new Date().toISOString(), sessionId: null,
      instrucciones: '', preguntas: [], respuestas: {}, inicio: null, limite: null, entregado: null, automatico: false,
      correccion: null, error: null,
    };
    const rel = `${relExamen(c, i, n, id)}/examen.json`;
    return proteger([rel], async () => {
      await escribirJSON(abs(rel), e);
      return e;
    });
  }

  function actualizar(c, i, n, id, parche) {
    const rel = `${relExamen(c, i, n, id)}/examen.json`;
    return proteger([rel], async () => {
      const actual = await leer(c, i, n, id);
      const e = { ...actual, ...(typeof parche === 'function' ? parche(actual) : parche), id };
      await escribirJSON(abs(rel), e);
      return e;
    });
  }

  async function guardarAdjunto(c, i, n, id, pregunta, nombre, buffer) {
    if (!RE_PREGUNTA.test(String(pregunta))) throw new Error('pregunta-invalida');
    const base = path.basename(String(nombre ?? ''));
    const ext = path.extname(base).slice(1).toLowerCase();
    if (!EXTENSIONES.has(ext)) throw new Error('extension-invalida');
    const dir = `${relExamen(c, i, n, id)}/adjuntos`;
    await fs.mkdir(abs(dir), { recursive: true });
    const raiz = `${pregunta}-${slugify(path.basename(base, path.extname(base))) || 'respuesta'}`;
    const archivo = await proteger(
      (a) => [`${dir}/${a}`],
      async () => {
        let a = `${raiz}.${ext}`;
        for (let k = 2; await fs.access(abs(`${dir}/${a}`)).then(() => true, () => false); k++) a = `${raiz}-${k}.${ext}`;
        await escribirAtomico(abs(`${dir}/${a}`), buffer);
        return a;
      },
    );
    return `germinacion/examenes/${n}/${id}/adjuntos/${archivo}`;
  }

  // Todos los exámenes de una idea (para recuperar al arrancar).
  async function todos(c, i) {
    const raiz = abs(`carpetas/${c}/ideas/${i}/germinacion/examenes`);
    const lista = [];
    for (const n of await fs.readdir(raiz).catch(() => [])) {
      if (RE_NODO.test(n)) for (const e of await listar(c, i, n)) lista.push(e);
    }
    return lista;
  }

  return { leer, listar, crear, actualizar, guardarAdjunto, todos };
}
