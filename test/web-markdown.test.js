import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import { crearRenderizador } from '../web/src/lib/markdown.js';

const render = crearRenderizador(createDOMPurify(new JSDOM('').window));
const BASE = 'carpetas/ia/ideas/x';

test('ecuación en bloque con número', () => {
  const html = render('$$E=mc^2\\tag{1}$$', BASE);
  assert.match(html, /class="katex-display"/);
  assert.match(html, /\(1\)/);
});

test('matemáticas en línea', () => {
  assert.match(render('La suma $\\sum_i x_i$ converge.', BASE), /class="katex"/);
});

test('el dinero no se confunde con matemáticas', () => {
  assert.doesNotMatch(render('Cuesta $5 y luego $10.', BASE), /katex/);
});

test('figura con pie y ruta reescrita', () => {
  const html = render('![Figura 1. Pérdida](figuras/a.png)', BASE);
  assert.match(html, /<figure>/);
  assert.match(html, /src="\/archivos\/carpetas\/ia\/ideas\/x\/figuras\/a\.png"/);
  assert.match(html, /<figcaption>Figura 1\. Pérdida<\/figcaption>/);
});

test('las imágenes externas no se reescriben', () => {
  assert.match(render('![x](https://ejemplo.org/a.png)', BASE), /src="https:\/\/ejemplo\.org\/a\.png"/);
});

test('el HTML peligroso se elimina', () => {
  const html = render('<script>alert(1)</script><img src=x onerror=alert(1)>', BASE);
  assert.doesNotMatch(html, /<script/);
  assert.doesNotMatch(html, /onerror/);
});

test('teorema como entorno formal', () => {
  assert.match(render('> **Teorema 1.** Todo primo impar…', BASE), /class="entorno entorno-teorema"/);
});

test('definición con tilde se normaliza', () => {
  assert.match(render('> **Definición 2.** Sea…', BASE), /entorno-definicion/);
});

test('una cita normal sigue siendo cita', () => {
  assert.match(render('> Una cita cualquiera', BASE), /<blockquote>/);
});

test('los enlaces externos abren en otra pestaña', () => {
  assert.match(render('[arXiv](https://arxiv.org/abs/1)', BASE), /target="_blank"[^>]*rel="noopener noreferrer"|rel="noopener noreferrer"[^>]*target="_blank"/);
});

test('normalizarParaEditor convierte $$…$$ de una línea en bloque', async () => {
  const { normalizarParaEditor } = await import('../web/src/lib/markdown.js');
  assert.equal(normalizarParaEditor('a\n\n$$x=1\\tag{1}$$\n\nb $y$'), 'a\n\n$$\nx=1\\tag{1}\n$$\n\nb $y$');
});

test('enmienda como entorno', () => {
  assert.match(render('> **Enmienda 1.** Era cuadrática.', BASE), /class="entorno entorno-enmienda"/);
});

test('del e ins se conservan', () => {
  const html = render('Es ~~lineal~~<ins>cuadrática</ins>.', BASE);
  assert.match(html, /<del>lineal<\/del>/);
  assert.match(html, /<ins>cuadrática<\/ins>/);
});
