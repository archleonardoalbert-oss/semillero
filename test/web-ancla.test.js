import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import { crearRenderizador } from '../web/src/lib/markdown.js';
import { linealizar, expandirRango, serializar, crearAncla, localizar } from '../web/src/lib/ancla.js';

const ventana = new JSDOM('<!doctype html><body></body>').window;
const render = crearRenderizador(createDOMPurify(ventana));
const BASE = 'carpetas/c/ideas/i';

function montar(md) {
  const raiz = ventana.document.createElement('div');
  raiz.innerHTML = render(md, BASE);
  ventana.document.body.replaceChildren(raiz);
  return raiz;
}

// Rango sobre el texto visible: busca `aguja` en el primer nodo de texto que la contenga.
function rangoTexto(raiz, aguja, desde = 0, hasta = aguja.length) {
  const w = ventana.document.createTreeWalker(raiz, 4);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const i = n.data.indexOf(aguja);
    if (i >= 0) {
      const r = ventana.document.createRange();
      r.setStart(n, i + desde);
      r.setEnd(n, i + hasta);
      return r;
    }
  }
  throw new Error(`no está «${aguja}»`);
}

test('linealizar sustituye la fórmula por su fuente', () => {
  const raiz = montar('Sea $x^2$ grande');
  assert.equal(linealizar(raiz).texto.trim(), 'Sea $x^2$ grande');
});

test('una fórmula en bloque se linealiza con $$', () => {
  const raiz = montar('Antes\n\n$$E=mc^2$$\n\nDespués');
  assert.match(linealizar(raiz).texto, /\$\$E=mc\^2\$\$/);
});

test('una selección que corta una fórmula se expande a la fórmula entera', () => {
  const raiz = montar('Sea $x^2$ grande');
  const r = ventana.document.createRange();
  r.setStart(rangoTexto(raiz, 'Sea').startContainer, 2);
  // Termina dentro del HTML renderizado de KaTeX.
  const dentro = raiz.querySelector('.katex-html');
  r.setEnd(dentro, 1);
  const e = expandirRango(raiz, r);
  assert.equal(serializar(raiz, e).markdown, 'a $x^2$');
});

test('serializar texto, fórmula e imagen', () => {
  const raiz = montar('La red $\\sigma(W_1 x)$ aprende.\n\n![Figura 1](figuras/a.png)\n\nFin.');
  const r = ventana.document.createRange();
  r.setStart(rangoTexto(raiz, 'La red').startContainer, 0);
  r.setEnd(rangoTexto(raiz, 'Fin.').startContainer, 0);
  const { markdown, imagenes } = serializar(raiz, expandirRango(raiz, r));
  assert.ok(markdown.includes('$\\sigma(W_1 x)$'), markdown);
  assert.ok(markdown.includes('![Figura 1](carpetas/c/ideas/i/figuras/a.png)'), markdown);
  assert.deepEqual(imagenes, ['carpetas/c/ideas/i/figuras/a.png']);
});

test('crearAncla y localizar devuelven el mismo fragmento', () => {
  const raiz = montar('Primero algo. Sea $x^2$ muy grande y positivo.');
  const r = expandirRango(raiz, rangoTexto(raiz, 'muy grande'));
  const ancla = crearAncla(raiz, r);
  assert.equal(ancla.exacto, 'muy grande');
  const otra = montar('Primero algo. Sea $x^2$ muy grande y positivo.');
  assert.equal(serializar(otra, localizar(otra, ancla)).markdown, 'muy grande');
});

test('localizar desempata por contexto', () => {
  const raiz = montar('El gato come. El perro come. El pez nada.');
  const ancla = crearAncla(raiz, rangoTexto(raiz, 'perro come', 6, 10));
  assert.equal(ancla.exacto, 'come');
  const r = localizar(raiz, ancla);
  const lin = linealizar(raiz);
  // La segunda aparición de «come» está tras «perro ».
  assert.equal(lin.texto.slice(0, lin.texto.indexOf('come', lin.texto.indexOf('perro'))).endsWith('perro '), true);
  assert.equal(r.startContainer.data.slice(r.startOffset - 6, r.startOffset), 'perro ');
});

test('localizar devuelve null si el fragmento ya no existe', () => {
  const raiz = montar('Texto nuevo sin nada.');
  assert.equal(localizar(raiz, { exacto: 'fragmento viejo', prefijo: '', sufijo: '' }), null);
});

test('seleccionar una imagen entera la serializa', () => {
  const raiz = montar('![Pie](figuras/b.png)');
  const r = ventana.document.createRange();
  r.selectNode(raiz.querySelector('img'));
  assert.deepEqual(serializar(raiz, expandirRango(raiz, r)).imagenes, ['carpetas/c/ideas/i/figuras/b.png']);
});
