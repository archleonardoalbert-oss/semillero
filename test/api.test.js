import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { construirApp } from '../server/api/rutas.js';
import { cfgTemporal } from './helpers.js';

function colaFalsa() {
  const c = new EventEmitter();
  c.llamadas = [];
  for (const m of ['lanzar', 'detener', 'reanudar']) c[m] = async (refs) => c.llamadas.push([m, refs]);
  c.estado = () => ({ ejecutando: [], enCola: [], pausadaPorCuota: false, cuota: null });
  c.recuperar = async () => {};
  return c;
}

const HOST = { host: '127.0.0.1:4417' };

async function preparar() {
  const cfg = await cfgTemporal();
  const cola = colaFalsa();
  const app = await construirApp(cfg, { cola });
  const pedir = (method, url, payload, headers = {}) => app.inject({ method, url, payload, headers: { ...HOST, ...headers } });
  return { app, cola, pedir, cfg };
}

async function conIdea() {
  const p = await preparar();
  await p.pedir('POST', '/api/carpetas', { nombre: 'IA' });
  await p.pedir('POST', '/api/carpetas/ia/ideas', { titulo: 'Pesos rápidos', cuerpo: 'Texto $x$' });
  return p;
}

test('crear carpeta devuelve 201', async () => {
  const { pedir } = await preparar();
  const r = await pedir('POST', '/api/carpetas', { nombre: 'IA' });
  assert.equal(r.statusCode, 201);
  assert.equal(r.json().id, 'ia');
});

test('una idea nueva aparece en pendientes como NUEVA', async () => {
  const { pedir } = await conIdea();
  const grupos = (await pedir('GET', '/api/pendientes')).json();
  assert.equal(grupos[0].ideas[0].etiqueta, 'NUEVA');
});

test('obtener idea trae el hilo', async () => {
  const { pedir } = await conIdea();
  const idea = (await pedir('GET', '/api/carpetas/ia/ideas/pesos-rapidos')).json();
  assert.equal(idea.hilo[0].contenido, 'Texto $x$');
});

test('archivos con .. devuelven 400', async () => {
  const { pedir } = await preparar();
  assert.equal((await pedir('GET', '/archivos/..%2F..%2Fetc%2Fpasswd')).statusCode, 400);
});

test('archivos no sirve el repo git interno', async () => {
  const { pedir } = await preparar();
  assert.equal((await pedir('GET', '/archivos/.git/config')).statusCode, 400);
});

test('adjunto con nombre malicioso queda dentro de adjuntos y se puede servir', async () => {
  const { pedir } = await conIdea();
  const r = await pedir('POST', '/api/carpetas/ia/ideas/pesos-rapidos/adjuntos?nombre=..%2Fx.png', Buffer.from('png'), {
    'content-type': 'image/png',
  });
  assert.equal(r.statusCode, 201);
  assert.equal(r.json().ruta, 'adjuntos/x.png');
  const f = await pedir('GET', '/archivos/carpetas/ia/ideas/pesos-rapidos/adjuntos/x.png');
  assert.equal(f.statusCode, 200);
  assert.equal(f.headers['content-type'], 'image/png');
  assert.equal(f.body, 'png');
});

test('lanzar pasa los refs a la cola', async () => {
  const { pedir, cola } = await conIdea();
  const refs = [{ carpetaId: 'ia', ideaId: 'pesos-rapidos' }];
  assert.equal((await pedir('POST', '/api/analisis/lanzar', { refs })).statusCode, 200);
  assert.deepEqual(cola.llamadas, [['lanzar', refs]]);
});

test('resumen cuenta por estado', async () => {
  const { pedir } = await conIdea();
  await pedir('PATCH', '/api/carpetas/ia/ideas/pesos-rapidos', { titulo: 'Pesos rápidos' });
  const r = (await pedir('GET', '/api/resumen')).json();
  assert.deepEqual(
    { a: r.aceptadas, r: r.rechazadas, p: r.enProceso, c: r.aclaracion, z: r.pausadas, b: r.borradores },
    { a: 0, r: 0, p: 0, c: 0, z: 0, b: 1 },
  );
});

test('una petición desde otro origen se rechaza', async () => {
  const { pedir } = await preparar();
  const r = await pedir('POST', '/api/carpetas', { nombre: 'X' }, { origin: 'https://malo.example' });
  assert.equal(r.statusCode, 403);
});

test('un Host ajeno se rechaza (DNS rebinding)', async () => {
  const { app } = await preparar();
  const r = await app.inject({ method: 'GET', url: '/api/carpetas', headers: { host: 'malo.example:4417' } });
  assert.equal(r.statusCode, 403);
});

test('errores conocidos se traducen a códigos HTTP', async () => {
  const { pedir } = await conIdea();
  assert.equal((await pedir('GET', '/api/carpetas/ia/ideas/no-existe')).statusCode, 404);
  assert.equal((await pedir('DELETE', '/api/carpetas/ia')).statusCode, 409);
  assert.equal((await pedir('POST', '/api/carpetas/ia/ideas/pesos-rapidos/replica', { cuerpo: 'x' })).statusCode, 409);
});

test('ajustes se leen y se guardan', async () => {
  const { pedir } = await preparar();
  assert.equal((await pedir('GET', '/api/ajustes')).json().modelo, 'opus');
  assert.equal((await pedir('PUT', '/api/ajustes', { umbral5h: 0.8 })).json().umbral5h, 0.8);
});

test('sirve assets creados después de arrancar (recompilar sin reiniciar)', async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const dist = path.join(process.cwd(), 'web/dist/assets');
  await fs.mkdir(dist, { recursive: true });
  const { pedir } = await preparar();
  const archivo = path.join(dist, `prueba-${Date.now()}.js`);
  await fs.writeFile(archivo, 'export {}');
  try {
    const r = await pedir('GET', `/assets/${path.basename(archivo)}`);
    assert.equal(r.statusCode, 200);
    assert.match(r.headers['content-type'], /javascript/);
  } finally {
    await fs.rm(archivo);
  }
});
