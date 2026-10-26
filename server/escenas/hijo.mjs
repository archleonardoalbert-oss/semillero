// Ejecuta una escena de un curso con un pincel falso y recorre todos sus pasos. Corre en un proceso aparte con
// el modelo de permisos de Node (solo lectura del motor y de la escena, sin escritura ni procesos hijos).
// También lo puede usar una sesión: `node server/escenas/hijo.mjs <escena.js>` imprime el informe en JSON.
import { pathToFileURL } from 'node:url';
import { S, instanciar } from '../../web/src/escena/api.js';
import { valoresIniciales } from '../../web/src/escena/motor/entradas.js';

const errores = [];
let raros = 0;
const numero = (v) => typeof v !== 'number' || Number.isFinite(v);
const revisar = (args) => {
  for (const a of args) {
    if (Array.isArray(a)) a.flat(2).forEach((v) => { if (!numero(v)) raros++; });
    else if (!numero(a)) raros++;
  }
};

// El pincel falso: los mismos métodos que el real; `ctx` acepta cualquier llamada o propiedad del Canvas 2D.
const ctx = new Proxy({}, { get: (_o, k) => (k === 'measureText' ? () => ({ width: 10 }) : () => {}), set: () => true });
const pincel = new Proxy({ ctx }, {
  get(o, k) {
    if (k in o) return o[k];
    return (...args) => { revisar(k === 'tex' ? args.slice(1, 3) : args.filter((x) => typeof x !== 'object' || Array.isArray(x))); if (k === 'recortar') args[1]?.(); };
  },
});

async function probar(ruta) {
  const escena = instanciar(await import(pathToFileURL(ruta).href));
  if (!escena || typeof escena.pintar !== 'function') throw new Error('la escena debe ser `export default (S) => S.definirEscena({ … })`');
  const N = escena.pasos;
  if (!Number.isInteger(N) || N < 1 || N > 60) throw new Error(`número de pasos inválido: ${N} (entre 1 y 60)`);
  if (!(escena.alto >= 150 && escena.alto <= 1200)) throw new Error(`alto inválido: ${escena.alto} (entre 150 y 1200)`);
  if (!Array.isArray(escena.entradas)) throw new Error('entradas debe ser una lista');
  const e = valoresIniciales(escena.entradas);
  const motivo = escena.validar(e);
  if (motivo) throw new Error(`los valores iniciales no pasan su propia validación: ${motivo}`);
  const c = escena.preparar(e);
  for (let paso = 0; paso < N; paso++) {
    for (const [p, tiempo] of [[0, 0], [0.37, 400], [1, 1600], [1, 9000]]) {
      try {
        escena.pintar(pincel, c, { paso, p, tiempo });
        const asas = escena.asas?.(c, paso, e) ?? [];
        if (!Array.isArray(asas)) throw new Error('asas debe devolver una lista');
        for (const a of asas) {
          revisar([a.x, a.y]);
          if (typeof a.mover === 'function') revisar(Object.values(a.mover(a.x + 5, a.y - 5) ?? {}));
        }
        if (typeof escena.leyenda === 'function') escena.leyenda(paso, c);
      } catch (err) {
        errores.push(`paso ${paso + 1} (p = ${p}): ${err.message}`);
        break;
      }
    }
  }
  if (raros) errores.push(`${raros} coordenadas o valores no numéricos (NaN o infinito) al dibujar`);
  return { ok: errores.length === 0, pasos: N, alto: escena.alto, errores };
}

try {
  console.log(JSON.stringify(await probar(process.argv[2])));
} catch (err) {
  console.log(JSON.stringify({ ok: false, errores: [...errores, String(err.code === 'ERR_ACCESS_DENIED' ? `acceso denegado: la escena no puede leer ni escribir archivos (${err.message})` : err.message)] }));
}
