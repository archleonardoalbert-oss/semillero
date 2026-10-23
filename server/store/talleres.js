import fs from 'node:fs/promises';
import path from 'node:path';
import { slugify, escribirJSON, leerJSON, escribirAtomico } from './fsutil.js';

const RE_NODO = /^[a-z0-9-]{1,40}$/;
const EXTENSIONES = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'pdf', 'txt', 'md', 'csv', 'py', 'ipynb', 'json']);
const VACIO = (nodo) => ({ nodo, sessionId: null, estado: 'libre', mensajes: [], propuesta: null, versiones: [], conexiones: [], error: null });

// El taller de una incógnita: la conversación con su sesión dedicada, los adjuntos del usuario,
// la propuesta de nuevo enunciado y el historial de versiones. Solo lo escribe el servidor.
export function crearAlmacenTalleres(cfg, { proteger }) {
  const valido = (s) => slugify(s) === s;
  const relIdea = (c, i) => {
    if (!valido(c) || !valido(i)) throw new Error('ruta-invalida');
    return `carpetas/${c}/ideas/${i}`;
  };
  const relTaller = (c, i, n) => {
    if (!RE_NODO.test(String(n))) throw new Error('nodo-invalido');
    return `${relIdea(c, i)}/germinacion/talleres/${n}`;
  };
  const abs = (rel) => path.join(cfg.datos, rel);

  async function leer(c, i, n) {
    return { ...VACIO(n), ...(await leerJSON(abs(`${relTaller(c, i, n)}/taller.json`), {})) };
  }

  function actualizar(c, i, n, parche) {
    const rel = `${relTaller(c, i, n)}/taller.json`;
    return proteger([rel], async () => {
      const actual = await leer(c, i, n);
      const t = { ...actual, ...(typeof parche === 'function' ? parche(actual) : parche), nodo: n };
      await escribirJSON(abs(rel), t);
      return t;
    });
  }

  async function guardarAdjunto(c, i, n, nombre, buffer) {
    const base = path.basename(String(nombre ?? ''));
    const ext = path.extname(base).slice(1).toLowerCase();
    if (!EXTENSIONES.has(ext)) throw new Error('extension-invalida');
    const dir = `${relTaller(c, i, n)}/adjuntos`;
    await fs.mkdir(abs(dir), { recursive: true });
    const raiz = slugify(path.basename(base, path.extname(base))) || 'adjunto';
    const archivo = await proteger(
      (a) => [`${dir}/${a}`],
      async () => {
        let a = `${raiz}.${ext}`;
        for (let k = 2; await fs.access(abs(`${dir}/${a}`)).then(() => true, () => false); k++) a = `${raiz}-${k}.${ext}`;
        await escribirAtomico(abs(`${dir}/${a}`), buffer);
        return a;
      },
    );
    return `germinacion/talleres/${n}/adjuntos/${archivo}`;
  }

  // Aplicar: la versión vigente se archiva y la propuesta pasa a ser el enunciado.
  async function aplicarPropuesta(c, i, n, documento) {
    const t = await leer(c, i, n);
    if (!t.propuesta) throw new Error('sin-propuesta');
    const rt = relTaller(c, i, n);
    const doc = `${relIdea(c, i)}/germinacion/${documento}`;
    const num = String(t.versiones.length + 1).padStart(3, '0');
    await proteger([`${rt}/versiones/${num}.md`, doc, `${rt}/propuesta.md`], async () => {
      const vigente = await fs.readFile(abs(doc), 'utf8').catch(() => '');
      const nuevo = await fs.readFile(abs(`${rt}/propuesta.md`), 'utf8');
      await escribirAtomico(abs(`${rt}/versiones/${num}.md`), vigente);
      await escribirAtomico(abs(doc), nuevo);
      await fs.rm(abs(`${rt}/propuesta.md`), { force: true });
    });
    return actualizar(c, i, n, (x) => ({
      propuesta: null,
      versiones: [...x.versiones, { n: x.versiones.length + 1, fecha: new Date().toISOString(), resumen: x.propuesta?.resumen ?? '' }],
    }));
  }

  async function descartarPropuesta(c, i, n) {
    const rt = relTaller(c, i, n);
    await proteger([`${rt}/propuesta.md`], () => fs.rm(abs(`${rt}/propuesta.md`), { force: true }));
    return actualizar(c, i, n, { propuesta: null });
  }

  // Restaurar una versión archivada: la vigente también se archiva, para poder volver.
  async function restaurar(c, i, n, version, documento = `nodos/${n}.md`) {
    const t = await leer(c, i, n);
    const v = t.versiones.find((x) => x.n === Number(version));
    if (!v) throw new Error('version-invalida');
    const rt = relTaller(c, i, n);
    const doc = `${relIdea(c, i)}/germinacion/${documento}`;
    const num = String(t.versiones.length + 1).padStart(3, '0');
    await proteger([`${rt}/versiones/${num}.md`, doc], async () => {
      const vigente = await fs.readFile(abs(doc), 'utf8').catch(() => '');
      const antigua = await fs.readFile(abs(`${rt}/versiones/${String(v.n).padStart(3, '0')}.md`), 'utf8');
      await escribirAtomico(abs(`${rt}/versiones/${num}.md`), vigente);
      await escribirAtomico(abs(doc), antigua);
    });
    return actualizar(c, i, n, (x) => ({
      versiones: [...x.versiones, { n: x.versiones.length + 1, fecha: new Date().toISOString(), resumen: `Antes de restaurar la versión ${v.n}` }],
    }));
  }

  // Conexiones que otros talleres del semillero declaran hacia este nodo.
  async function conexionesEntrantes(c, i, n) {
    const entrantes = [];
    const raiz = abs('carpetas');
    for (const cc of await fs.readdir(raiz).catch(() => [])) {
      for (const ii of await fs.readdir(path.join(raiz, cc, 'ideas')).catch(() => [])) {
        const dirT = path.join(raiz, cc, 'ideas', ii, 'germinacion', 'talleres');
        for (const nn of await fs.readdir(dirT).catch(() => [])) {
          const t = await leerJSON(path.join(dirT, nn, 'taller.json'), null);
          for (const x of t?.conexiones ?? []) {
            if (x.carpetaId === c && x.ideaId === i && x.nodo === n) entrantes.push({ desde: { carpetaId: cc, ideaId: ii, nodo: nn }, relacion: x.relacion });
          }
        }
      }
    }
    return entrantes;
  }

  return { leer, actualizar, guardarAdjunto, aplicarPropuesta, descartarPropuesta, restaurar, conexionesEntrantes, relTaller };
}
