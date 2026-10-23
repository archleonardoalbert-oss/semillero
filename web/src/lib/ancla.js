// Convierte lo que el usuario selecciona en un documento renderizado en algo que Claude entiende
// (Markdown con $tex$ e imágenes con su ruta) y en un ancla que sobrevive a recargas.
//
// La linealización es el texto visible del documento, salvo que cada fórmula KaTeX y cada imagen
// es un «átomo» indivisible escrito en Markdown. Todas las posiciones son índices en ese texto.

const CONTEXTO = 40;
const BLOQUES = new Set(['P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'FIGURE', 'FIGCAPTION', 'ASIDE', 'BLOCKQUOTE', 'PRE', 'TR', 'DIV', 'UL', 'OL', 'TABLE']);

const fuenteTex = (el) => el.querySelector('annotation[encoding="application/x-tex"]')?.textContent ?? '';
const rutaDatos = (src) => decodeURI(String(src ?? '')).replace(/^\/archivos\//, '');

function textoAtomo(el) {
  if (el.tagName === 'IMG') return `![${el.getAttribute('alt') ?? ''}](${rutaDatos(el.getAttribute('src'))})`;
  if (el.classList.contains('katex-display')) return `$$${fuenteTex(el)}$$`;
  return `$${fuenteTex(el)}$`;
}

const esAtomo = (n) =>
  n.nodeType === 1 && (n.tagName === 'IMG' || n.classList.contains('katex-display') || n.classList.contains('katex'));

export function linealizar(raiz) {
  const piezas = [];
  let texto = '';
  const anadir = (nodo, t, atomo) => {
    piezas.push({ nodo, inicio: texto.length, fin: texto.length + t.length, atomo });
    texto += t;
  };
  const separar = () => {
    if (texto && !texto.endsWith('\n')) anadir(null, '\n', false);
  };
  (function recorrer(n) {
    for (const h of n.childNodes) {
      if (h.nodeType === 3) {
        if (h.data) anadir(h, h.data, false);
      } else if (esAtomo(h)) anadir(h, textoAtomo(h), true);
      else if (h.nodeType === 1) {
        const bloque = BLOQUES.has(h.tagName);
        if (bloque) separar();
        if (h.tagName === 'BR') anadir(null, '\n', false);
        else recorrer(h);
        if (bloque) separar();
      }
    }
  })(raiz);
  return { texto, piezas };
}

// Posición lineal de un punto del DOM. Dentro de un átomo cuenta su inicio (o su fin, si `final`).
function posicion(raiz, lin, contenedor, offset, final) {
  const doc = raiz.ownerDocument;
  const punto = doc.createRange();
  punto.setStart(contenedor, offset);
  let pos = 0;
  for (const p of lin.piezas) {
    if (!p.nodo) continue;
    if (p.atomo) {
      if (p.nodo === contenedor || p.nodo.contains(contenedor)) return final ? p.fin : p.inicio;
      // ¿El átomo entero queda antes del punto? (comparamos el punto justo detrás del átomo)
      const padre = p.nodo.parentNode;
      if (punto.comparePoint(padre, Array.prototype.indexOf.call(padre.childNodes, p.nodo) + 1) <= 0) pos = p.fin;
      else return pos;
      continue;
    }
    if (p.nodo === contenedor) return p.inicio + offset;
    if (punto.comparePoint(p.nodo, p.nodo.length) <= 0) pos = p.fin;
    else return pos;
  }
  return pos;
}

function desdeRango(raiz, lin, rango) {
  const ini = posicion(raiz, lin, rango.startContainer, rango.startOffset, false);
  const fin = posicion(raiz, lin, rango.endContainer, rango.endOffset, true);
  return [Math.min(ini, fin), Math.max(ini, fin)];
}

function aRango(raiz, lin, ini, fin) {
  const r = raiz.ownerDocument.createRange();
  const reales = lin.piezas.filter((p) => p.nodo);
  const a = reales.find((p) => p.fin > ini) ?? reales.at(-1);
  const b = [...reales].reverse().find((p) => p.inicio < fin) ?? a;
  if (!a) return null;
  if (a.atomo) r.setStartBefore(a.nodo);
  else r.setStart(a.nodo, Math.max(0, ini - a.inicio));
  if (b.atomo) r.setEndAfter(b.nodo);
  else r.setEnd(b.nodo, Math.min(b.nodo.length, fin - b.inicio));
  return r;
}

export function expandirRango(raiz, rango) {
  const lin = linealizar(raiz);
  const [ini, fin] = desdeRango(raiz, lin, rango);
  return aRango(raiz, lin, ini, fin);
}

export function serializar(raiz, rango) {
  const lin = linealizar(raiz);
  const [ini, fin] = desdeRango(raiz, lin, rango);
  const imagenes = lin.piezas
    .filter((p) => p.atomo && p.nodo.tagName === 'IMG' && p.inicio < fin && p.fin > ini)
    .map((p) => rutaDatos(p.nodo.getAttribute('src')));
  return { markdown: lin.texto.slice(ini, fin).trim(), imagenes };
}

export function crearAncla(raiz, rango) {
  const lin = linealizar(raiz);
  const [ini, fin] = desdeRango(raiz, lin, rango);
  return {
    exacto: lin.texto.slice(ini, fin),
    prefijo: lin.texto.slice(Math.max(0, ini - CONTEXTO), ini),
    sufijo: lin.texto.slice(fin, fin + CONTEXTO),
  };
}

const comunAlFinal = (a, b) => {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
};
const comunAlPrincipio = (a, b) => {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
};

// Busca el fragmento; entre varias apariciones gana la que mejor conserva su contexto.
export function localizar(raiz, ancla) {
  if (!ancla?.exacto) return null;
  const lin = linealizar(raiz);
  let mejor = -1;
  let puntos = -1;
  for (let i = lin.texto.indexOf(ancla.exacto); i !== -1; i = lin.texto.indexOf(ancla.exacto, i + 1)) {
    const p =
      comunAlFinal(lin.texto.slice(Math.max(0, i - CONTEXTO), i), ancla.prefijo ?? '') +
      comunAlPrincipio(lin.texto.slice(i + ancla.exacto.length, i + ancla.exacto.length + CONTEXTO), ancla.sufijo ?? '');
    if (p > puntos) [mejor, puntos] = [i, p];
  }
  return mejor === -1 ? null : aRango(raiz, lin, mejor, mejor + ancla.exacto.length);
}
