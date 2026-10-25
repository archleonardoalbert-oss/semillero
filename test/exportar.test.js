import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { crearAlmacenCarpetas } from '../server/store/carpetas.js';
import { crearAlmacenIdeas } from '../server/store/ideas.js';
import { prepararSitio } from '../server/exportar/paquete.js';
import { compilar } from '../server/exportar/compilar.js';
import { MAPA, DIAGNOSTICO } from './fixtures/mapas.js';
import { cfgTemporal } from './helpers.js';

const existe = (p) => fs.access(p).then(() => true, () => false);

// Una idea germinada con todo lo que NO debe exportarse alrededor.
async function germinada({ mapa = MAPA } = {}) {
  const cfg = await cfgTemporal();
  const carpetas = crearAlmacenCarpetas(cfg);
  const ideas = crearAlmacenIdeas(cfg);
  await carpetas.crear({ nombre: 'Negocios', tipo: 'negocio', color: '#6fe3a5' });
  const idea = await ideas.crear('negocios', { titulo: 'Cafetería', cuerpo: 'Mi **idea** original' });
  const dir = path.join(cfg.datos, 'carpetas/negocios/ideas', idea.id);
  const fm = (v) => `---\nveredicto: ${v}\netapa: 2\nresumen: r\n---\n\n`;
  await fs.writeFile(path.join(dir, 'hilo/002-claude.md'), fm('cambios') + 'Dictamen viejo');
  await fs.writeFile(path.join(dir, 'hilo/003-usuario.md'), 'Mi réplica privada');
  await fs.writeFile(path.join(dir, 'hilo/004-claude.md'), fm('aceptada') + 'Dictamen vigente ![g](figuras/dictamen.png)\n\n```semillero-caminos\n[{"id":"a","tipo":"variacion","titulo":"t","resumen":"r"}]\n```\n');
  const g = path.join(dir, 'germinacion');
  await fs.mkdir(path.join(g, 'nodos'), { recursive: true });
  await fs.mkdir(path.join(g, 'recursos'), { recursive: true });
  await fs.mkdir(path.join(g, 'talleres/i1'), { recursive: true });
  await fs.mkdir(path.join(g, 'examenes/e1'), { recursive: true });
  await fs.mkdir(path.join(dir, 'figuras/examenes'), { recursive: true });
  await fs.writeFile(path.join(g, 'mapa.json'), JSON.stringify({ ...mapa, diagnostico: DIAGNOSTICO.diagnostico }));
  await fs.writeFile(path.join(g, 'progreso.json'), JSON.stringify({ nodos: { e1: { estado: 'hecho', notas: 'NOTAS PRIVADAS' } } }));
  for (const n of mapa.nodos) await fs.writeFile(path.join(g, n.documento), `# ${n.titulo}\n\n![f](figuras/${n.id}.png)`);
  await fs.writeFile(path.join(g, 'recursos/geva.pdf'), '%PDF-1.4 geva');
  await fs.writeFile(path.join(g, 'recursos/huerfano.pdf'), '%PDF-1.4 nadie lo usa');
  await fs.writeFile(path.join(g, 'talleres/i1/hilo.jsonl'), 'TALLER');
  await fs.writeFile(path.join(g, 'examenes/e1/x.json'), 'EXAMEN');
  for (const f of ['e1', 'e2', 'i1', 'dictamen']) await fs.writeFile(path.join(dir, `figuras/${f}.png`), 'PNG');
  await fs.writeFile(path.join(dir, 'figuras/examenes/secreta.png'), 'PNG');
  return { cfg, carpetas, ideas, ref: { carpetaId: 'negocios', ideaId: idea.id }, dir };
}

async function sitioDe(x) {
  const destino = await fs.mkdtemp(path.join(os.tmpdir(), 'semillero-sitio-'));
  await prepararSitio({ ...x, destino, visor: null });
  return destino;
}

test('el sitio lleva el árbol, los documentos, la visión y las raíces idea + dictamen vigente', async () => {
  const x = await germinada();
  const s = await sitioDe(x);
  const d = JSON.parse(await fs.readFile(path.join(s, 'datos.json'), 'utf8'));
  assert.equal(d.titulo, 'Cafetería');
  assert.equal(d.bancal.nombre, 'Negocios');
  assert.equal(d.vocab.hoja, 'Hipótesis que validar');
  assert.equal(d.mapa.resumen, MAPA.resumen);
  assert.equal(d.mapa.nodos.length, 3);
  assert.equal(d.mapa.diagnostico, undefined);
  assert.match(d.documentos.e1, /# Álgebra lineal/);
  assert.deepEqual(d.raices.map((r) => r.etiqueta), ['Tu idea', 'Dictamen']);
  assert.match(d.raices[0].md, /Mi \*\*idea\*\* original/);
  assert.match(d.raices[1].md, /Dictamen vigente/);
  assert.doesNotMatch(d.raices[1].md, /semillero-caminos/);
});

test('no se exporta nada de sesiones, estados, notas ni archivos sin usar', async () => {
  const x = await germinada();
  const s = await sitioDe(x);
  const todo = JSON.stringify(JSON.parse(await fs.readFile(path.join(s, 'datos.json'), 'utf8')));
  for (const prohibido of ['NOTAS PRIVADAS', '"estado"', 'Mi réplica privada', 'Dictamen viejo', 'progreso']) assert.ok(!todo.includes(prohibido), prohibido);
  const base = path.join(s, 'archivos/idea');
  assert.ok(await existe(path.join(base, 'germinacion/recursos/geva.pdf')));
  for (const f of ['e1', 'e2', 'i1', 'dictamen']) assert.ok(await existe(path.join(base, `figuras/${f}.png`)), f);
  for (const no of ['germinacion/recursos/huerfano.pdf', 'germinacion/talleres', 'germinacion/examenes', 'figuras/examenes', 'germinacion/progreso.json', 'hilo'])
    assert.ok(!(await existe(path.join(base, no))), no);
});

test('una referencia que sale de la idea no se copia', async () => {
  const x = await germinada();
  await fs.writeFile(path.join(x.dir, 'germinacion/nodos/e1.md'), '![x](../../../../../../etc/passwd) ![y](/etc/hosts)');
  const s = await sitioDe(x);
  const listar = async (d) => (await fs.readdir(d, { recursive: true })).join('\n');
  assert.doesNotMatch(await listar(s), /passwd|hosts/);
});

test('sin mapa no hay nada que exportar', async () => {
  const x = await germinada({ mapa: { ...DIAGNOSTICO, diagnostico: undefined } });
  await assert.rejects(sitioDe(x), /sin-mapa/);
});

test('el ejecutable de Linux sirve la germinación y termina al cerrar la pestaña', { timeout: 240000 }, async () => {
  const x = await germinada();
  const s = await sitioDe(x);
  await fs.writeFile(path.join(s, 'index.html'), '<!doctype html><title>visor</title>');
  const salida = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'semillero-bin-')), 'visor');
  await compilar({ sitio: s, so: 'linux', salida });
  const puerto = 20000 + Math.floor(Math.random() * 20000);
  const p = spawn(salida, ['-sin-navegador', '-puerto', String(puerto), '-gracia', '1s']);
  const fin = new Promise((r) => p.on('exit', r));
  try {
    const url = `http://127.0.0.1:${puerto}`;
    let r;
    for (let k = 0; k < 50 && !r; k++) r = await fetch(`${url}/datos.json`).catch(() => new Promise((ok) => setTimeout(ok, 100)));
    assert.equal((await r.json()).titulo, 'Cafetería');
    const pdf = await fetch(`${url}/archivos/idea/germinacion/recursos/geva.pdf`);
    assert.equal(pdf.headers.get('content-type'), 'application/pdf');
    // Una pestaña se conecta y se cierra: el visor termina.
    const ctl = new AbortController();
    const vivo = await fetch(`${url}/__vivo`, { signal: ctl.signal });
    assert.match(vivo.headers.get('content-type'), /event-stream/);
    ctl.abort();
    const codigo = await Promise.race([fin, new Promise((r) => setTimeout(() => r('sigue vivo'), 8000))]);
    assert.equal(codigo, 0);
  } finally {
    p.kill();
  }
});

test('el ejecutable de Windows es un PE de 64 bits', { timeout: 240000 }, async () => {
  const x = await germinada();
  const s = await sitioDe(x);
  const salida = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'semillero-bin-')), 'visor.exe');
  await compilar({ sitio: s, so: 'windows', salida });
  const b = await fs.readFile(salida);
  assert.equal(b.subarray(0, 2).toString(), 'MZ');
  assert.equal(b.readUInt16LE(b.readUInt32LE(0x3c) + 4), 0x8664); // máquina x86-64
});

test('un sistema desconocido se rechaza', async () => {
  await assert.rejects(compilar({ sitio: '/tmp', so: 'macos', salida: '/tmp/x' }), /so-invalido/);
});

// --- API de descarga ---
import { EventEmitter } from 'node:events';
import { construirApp } from '../server/api/rutas.js';

function colaFalsa() {
  const c = new EventEmitter();
  for (const m of ['lanzar', 'detener', 'reanudar', 'germinar']) c[m] = async () => {};
  c.estado = () => ({ ejecutando: [], enCola: [], pausadaPorCuota: false, cuota: null });
  c.recuperar = async () => {};
  c.objetivosActivos = () => [];
  c.registrarCuota = () => {};
  c.fijarAjenosExternos = () => {};
  c.registrarEscritor = () => {};
  c.objetivosAjenos = () => [];
  return c;
}

test('la API descarga el ejecutable con su nombre y rechaza lo que no se puede exportar', async () => {
  const x = await germinada();
  const pedidos = [];
  const compilarFalso = async ({ sitio, so, salida }) => {
    pedidos.push({ so, datos: JSON.parse(await fs.readFile(path.join(sitio, 'datos.json'), 'utf8')) });
    await fs.writeFile(salida, `BINARIO-${so}`);
  };
  const app = await construirApp(x.cfg, { cola: colaFalsa(), compilarExportacion: compilarFalso, visorExportacion: null });
  const pedir = (url) => app.inject({ method: 'GET', url, headers: { host: '127.0.0.1:4417' } });
  const base = `/api/carpetas/negocios/ideas/${x.ref.ideaId}/exportar`;

  const w = await pedir(`${base}/windows`);
  assert.equal(w.statusCode, 200);
  assert.equal(w.body, 'BINARIO-windows');
  assert.match(w.headers['content-disposition'], /attachment; filename="cafeteria-germinacion\.exe"/);
  const l = await pedir(`${base}/linux`);
  assert.match(l.headers['content-disposition'], /filename="cafeteria-germinacion-linux"/);
  assert.equal(pedidos[0].datos.titulo, 'Cafetería');

  assert.equal((await pedir(`${base}/macos`)).statusCode, 400);
  await fs.writeFile(path.join(x.dir, 'germinacion/mapa.json'), JSON.stringify(DIAGNOSTICO));
  assert.equal((await pedir(`${base}/linux`)).statusCode, 409);
  await app.close();
});
