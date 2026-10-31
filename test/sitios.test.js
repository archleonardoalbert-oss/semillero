// Asignaturas como webs propias: índice versión 2 y comprobador de sitios (Chromium sin pantalla).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validarIndice, paginasDe } from '../server/engine/indice.js';
import { probarSitio } from '../server/cursos/probar-sitio.js';

const INDICE2 = {
  version: 2,
  conferencias: [{ id: 'c01-espacios', titulo: 'Espacios vectoriales', objetivos: ['Decidir si es subespacio'], pagina: 'c01-espacios.html' }],
  practicas: [{ id: 'p01', titulo: 'Práctica 1', pagina: 'p01.html', conferencias: ['c01-espacios'] }],
  valientes: [],
  recursos: [{ id: 'r1', tipo: 'libro', titulo: 'Axler', url: 'https://linear.axler.net', archivo: 'recursos/e1/axler.pdf' }],
};

test('el índice versión 2 apunta a páginas de la web de la asignatura', () => {
  const v = validarIndice(structuredClone(INDICE2), 'e1');
  assert.equal(v.ok, true, v.motivo);
  assert.deepEqual(paginasDe(v.indice, 'e1'), ['cursos/e1/index.html', 'cursos/e1/c01-espacios.html', 'cursos/e1/p01.html']);
  const mala = structuredClone(INDICE2);
  mala.conferencias[0].pagina = '../e2/x.html';
  assert.match(validarIndice(mala, 'e1').motivo, /pagina/);
  // Los índices antiguos siguen valiendo.
  assert.equal(validarIndice({ version: 1, conferencias: [{ id: 'c01', titulo: 'x', documento: 'nodos/e1/c01.md' }] }, 'e1').ok, true);
});

async function sitio(paginas) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'semillero-sitio-'));
  for (const [nombre, html] of Object.entries(paginas)) {
    await fs.mkdir(path.dirname(path.join(dir, nombre)), { recursive: true });
    await fs.writeFile(path.join(dir, nombre), html);
  }
  return dir;
}
const PAGINA = (cuerpo, extra = '') => `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>T</title><script type="module" src="/semillero-puente.js"></script>${extra}</head><body><main>${cuerpo}</main></body></html>`;
const LARGO = '<p>' + 'Texto de la conferencia con contenido suficiente. '.repeat(20) + '</p>';

test('una web correcta pasa: todas las páginas cargan sin errores ni conexiones fuera', { timeout: 120000 }, async () => {
  const dir = await sitio({
    'index.html': PAGINA(LARGO + '<a href="c01.html">c01</a>'),
    'c01.html': PAGINA(LARGO + '<canvas id="c"></canvas>', '<script src="motores/dibujo.js"></script>'),
    'motores/dibujo.js': 'document.addEventListener("DOMContentLoaded", () => { const g = document.getElementById("c").getContext("2d"); g.fillRect(0, 0, 10, 10); });',
  });
  const r = await probarSitio(dir, ['index.html', 'c01.html']);
  assert.equal(r.ok, true, r.errores.join('\n'));
});

test('un error de JavaScript, una petición a internet o una página vacía se informan con su página', { timeout: 120000 }, async () => {
  const dir = await sitio({
    'index.html': PAGINA(LARGO, '<script>window.addEventListener("load", () => { null.x; });</script>'),
    'c01.html': PAGINA(LARGO, '<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>'),
    'c02.html': PAGINA('<p>corta</p>'),
    'c03.html': '<!doctype html><html><head><title>x</title></head><body>' + LARGO + '</body></html>',
  });
  const r = await probarSitio(dir, ['index.html', 'c01.html', 'c02.html', 'c03.html']);
  assert.equal(r.ok, false);
  const t = r.errores.join('\n');
  assert.match(t, /index\.html.*null/s);
  assert.match(t, /c01\.html.*cdn\.jsdelivr\.net/s);
  assert.match(t, /c02\.html.*(vacía|poco contenido)/s);
  assert.match(t, /c03\.html.*semillero-puente/s);
});

// --- Servir la web de una asignatura: aislada y sin acceso a la API ---
import { EventEmitter } from 'node:events';
import { construirApp } from '../server/api/rutas.js';
import { cfgTemporal } from './helpers.js';
import { crearAlmacenCarpetas } from '../server/store/carpetas.js';
import { crearAlmacenIdeas } from '../server/store/ideas.js';

function colaFalsa() {
  const c = new EventEmitter();
  for (const m of ['lanzar', 'detener', 'reanudar', 'germinar']) c[m] = async () => {};
  c.estado = () => ({ ejecutando: [], enCola: [], pausadaPorCuota: false, cuota: null });
  c.recuperar = async () => {};
  c.objetivosActivos = () => [];
  c.registrarCuota = () => {};
  c.registrarEscritor = () => {};
  c.objetivosAjenos = () => [];
  return c;
}

test('la web de una asignatura se sirve aislada (sandbox), sin poder hablar con la API, y con CORS solo para lo suyo', async () => {
  const cfg = await cfgTemporal();
  await crearAlmacenCarpetas(cfg).crear({ nombre: 'Aprender', tipo: 'aprendizaje' });
  const idea = await crearAlmacenIdeas(cfg).crear('aprender', { titulo: 'Topo', cuerpo: 'x' });
  const dir = path.join(cfg.datos, 'carpetas/aprender/ideas', idea.id, 'germinacion/cursos/e1');
  await fs.mkdir(path.join(dir, 'motores'), { recursive: true });
  await fs.writeFile(path.join(dir, 'index.html'), '<!doctype html><title>x</title>');
  await fs.writeFile(path.join(dir, 'motores/m.js'), 'export {}');
  const app = await construirApp(cfg, { cola: colaFalsa() });
  const pedir = (url, origen) => app.inject({ method: 'GET', url, headers: { host: '127.0.0.1:4417', ...(origen && { origin: origen }) } });
  const base = `/archivos/carpetas/aprender/ideas/${idea.id}/germinacion/cursos/e1`;
  const html = await pedir(`${base}/index.html`);
  assert.equal(html.statusCode, 200);
  assert.match(html.headers['content-type'], /text\/html/);
  const csp = html.headers['content-security-policy'];
  assert.match(csp, /sandbox allow-scripts/);
  assert.doesNotMatch(csp, /allow-same-origin/);
  assert.doesNotMatch(csp, /escape-sandbox/, 'una ventana abierta por el curso sigue aislada');
  assert.match(csp, new RegExp(`connect-src http://127\\.0\\.0\\.1:4417${base}/`));
  const js = await pedir(`${base}/motores/m.js`, 'null');
  assert.equal(js.statusCode, 200);
  assert.match(js.headers['content-type'], /javascript/);
  assert.equal(js.headers['access-control-allow-origin'], '*');
  assert.equal((await pedir('/api/carpetas', 'null')).statusCode, 403, 'la web no puede llamar a la API');
  assert.equal((await pedir(`/archivos/carpetas/aprender/ideas/${idea.id}/hilo/001-usuario.md`, 'null')).statusCode, 403);
  await app.close();
});

import { documentoGlosable } from '../server/engine/glosas.js';
test('las páginas de la web de una asignatura admiten glosas', () => {
  assert.equal(documentoGlosable('germinacion/cursos/e1/c01-espacios.html'), true);
  assert.equal(documentoGlosable('germinacion/cursos/e1/motores/x.html'), false);
  assert.equal(documentoGlosable('germinacion/cursos/e1/c01.js'), false);
});

import { documentoDeCurso } from '../web/src/lib/curso.js';
test('el visor solo acepta glosas sobre páginas del curso que se está viendo', () => {
  assert.equal(documentoDeCurso('/archivos/carpetas/a/ideas/i/germinacion/cursos/e1/c01-x.html', 'e1'), 'germinacion/cursos/e1/c01-x.html');
  for (const malo of ['/x/germinacion/nodos/otro.md', '/x/germinacion/cursos/e2/c01.html', '/x/germinacion/cursos/e1/temas/a.html', '/x/germinacion/cursos/e1/%E0%A4%A.html', '/x/germinacion/cursos/e1/../e2/c.html']) {
    assert.equal(documentoDeCurso(malo, 'e1'), null, malo);
  }
});
