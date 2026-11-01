import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { prepararLectura } from '../server/adjuntos/lectura.js';
import { construirApp } from '../server/api/rutas.js';
import { mensajeEjecucion } from '../server/engine/prompt.js';
import { cfgTemporal } from './helpers.js';

const tmp = () => fs.mkdtemp(path.join(os.tmpdir(), 'semillero-adj-'));

// Un .docx/.pptx/.xlsx mínimo: un ZIP con su XML (como los genera Office).
function zip(destino, archivos) {
  execFileSync('python3', ['-I', '-c', `import sys,zipfile,json\nz=zipfile.ZipFile(sys.argv[1],'w')\nfor k,v in json.loads(sys.argv[2]).items(): z.writestr(k,v)`, destino, JSON.stringify(archivos)]);
}
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';

test('un Word se convierte a texto legible, con sus títulos y tablas', async () => {
  const d = await tmp();
  zip(path.join(d, 'plan.docx'), {
    'word/document.xml': `<w:document ${W}><w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Plan de negocio</w:t></w:r></w:p><w:p><w:r><w:t>Vender </w:t></w:r><w:r><w:t>semillas</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Año</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Ventas</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>`,
  });
  const r = await prepararLectura(path.join(d, 'plan.docx'), path.join(d, 'lectura'));
  assert.equal(r.tipo, 'convertido');
  assert.deepEqual(r.lectura, ['lectura/plan.docx.md']);
  const md = await fs.readFile(path.join(d, 'lectura/plan.docx.md'), 'utf8');
  assert.match(md, /# Plan de negocio/);
  assert.match(md, /Vender semillas/);
  assert.match(md, /Año \| Ventas/);
});

test('una presentación y una hoja de cálculo también', async () => {
  const d = await tmp();
  const A = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"';
  zip(path.join(d, 'charla.pptx'), { 'ppt/slides/slide1.xml': `<p:sld ${A} xmlns:p="x"><a:t>Hola mundo</a:t></p:sld>`, 'ppt/slides/slide2.xml': `<p:sld ${A} xmlns:p="x"><a:t>Segunda</a:t></p:sld>` });
  const S = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
  zip(path.join(d, 'datos.xlsx'), {
    'xl/workbook.xml': `<workbook ${S} xmlns:r="r"><sheets><sheet name="Ventas" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/sharedStrings.xml': `<sst ${S}><si><t>Mes</t></si><si><t>enero</t></si></sst>`,
    'xl/worksheets/sheet1.xml': `<worksheet ${S}><sheetData><row><c t="s"><v>0</v></c><c><v>42</v></c></row><row><c t="s"><v>1</v></c><c><v>7</v></c></row></sheetData></worksheet>`,
  });
  const p = await prepararLectura(path.join(d, 'charla.pptx'), path.join(d, 'lectura'));
  const md = await fs.readFile(path.join(d, p.lectura[0]), 'utf8');
  assert.ok(md.indexOf('Hola mundo') < md.indexOf('Segunda'));
  const x = await prepararLectura(path.join(d, 'datos.xlsx'), path.join(d, 'lectura'));
  const tabla = await fs.readFile(path.join(d, x.lectura[0]), 'utf8');
  assert.match(tabla, /Ventas/);
  assert.match(tabla, /Mes \| 42/);
  assert.match(tabla, /enero \| 7/);
});

test('imágenes, PDF y texto de cualquier extensión se leen tal cual; lo ilegible se guarda con aviso', async () => {
  const d = await tmp();
  await fs.writeFile(path.join(d, 'main.rs'), 'fn main() {}\n');
  await fs.writeFile(path.join(d, 'foto.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0]));
  await fs.writeFile(path.join(d, 'raro.bin'), Buffer.from([0, 1, 2, 3, 0xff, 0]));
  await fs.writeFile(path.join(d, 'viejo.doc'), Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0]));
  assert.equal((await prepararLectura(path.join(d, 'main.rs'), path.join(d, 'l'))).tipo, 'directo');
  assert.equal((await prepararLectura(path.join(d, 'foto.png'), path.join(d, 'l'))).tipo, 'directo');
  const raro = await prepararLectura(path.join(d, 'raro.bin'), path.join(d, 'l'));
  assert.equal(raro.tipo, 'ilegible');
  assert.ok(raro.aviso);
  assert.match((await prepararLectura(path.join(d, 'viejo.doc'), path.join(d, 'l'))).aviso, /\.docx/);
});

test('un vídeo se convierte en fotogramas', { timeout: 60000 }, async () => {
  const d = await tmp();
  execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc=duration=3:size=320x240:rate=10', path.join(d, 'demo.mp4')]);
  const r = await prepararLectura(path.join(d, 'demo.mp4'), path.join(d, 'lectura'));
  assert.equal(r.tipo, 'convertido');
  assert.ok(r.lectura.length >= 3, r.lectura.join());
  for (const f of r.lectura) assert.match(f, /^lectura\/demo\.mp4-\d+\.jpg$/);
});

// ---------------------------------------------------------------------------------------------------------
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
async function conIdea(opciones = {}) {
  const cfg = { ...(await cfgTemporal()), ...opciones };
  const app = await construirApp(cfg, { cola: colaFalsa() });
  const pedir = (method, url, payload, headers = {}) => app.inject({ method, url, payload, headers: { host: '127.0.0.1:4417', ...headers } });
  await pedir('POST', '/api/carpetas', { nombre: 'IA' });
  await pedir('POST', '/api/carpetas/ia/ideas', { titulo: 'Pesos rápidos', cuerpo: 'Texto' });
  return { cfg, pedir };
}
const BIN = { 'content-type': 'application/octet-stream' };

test('adjuntar a la idea original la une al mensaje 1 y la sesión recibe la lista con su lectura', async () => {
  const { cfg, pedir } = await conIdea();
  const d = await tmp();
  zip(path.join(d, 'plan.docx'), { 'word/document.xml': `<w:document ${W}><w:body><w:p><w:r><w:t>Hola</w:t></w:r></w:p></w:body></w:document>` });
  const r = await pedir('POST', '/api/carpetas/ia/ideas/pesos-rapidos/adjuntos?nombre=Plan.docx&mensaje=1', await fs.readFile(path.join(d, 'plan.docx')), BIN);
  assert.equal(r.statusCode, 201, r.body);
  assert.equal(r.json().ruta, 'adjuntos/plan.docx');
  assert.deepEqual(r.json().lectura, ['adjuntos/lectura/plan.docx.md']);
  await pedir('POST', '/api/carpetas/ia/ideas/pesos-rapidos/adjuntos?nombre=notas.rs&mensaje=1', Buffer.from('fn x(){}'), BIN);
  const idea = (await pedir('GET', '/api/carpetas/ia/ideas/pesos-rapidos')).json();
  assert.deepEqual(idea.hilo[0].adjuntos.map((a) => a.ruta), ['adjuntos/plan.docx', 'adjuntos/notas.rs']);
  const m = mensajeEjecucion({ tipo: 'inicial', idea, carpeta: { nombre: 'IA' }, rutaIdea: 'carpetas/ia/ideas/pesos-rapidos', archivoDestino: 'x' });
  assert.match(m, /carpetas\/ia\/ideas\/pesos-rapidos\/adjuntos\/plan\.docx/);
  assert.match(m, /adjuntos\/lectura\/plan\.docx\.md/);
  assert.match(m, /adjuntos\/notas\.rs/);
  // Quitarlo de la idea lo borra.
  const q = await pedir('DELETE', '/api/carpetas/ia/ideas/pesos-rapidos/adjuntos?ruta=adjuntos%2Fplan.docx');
  assert.equal(q.statusCode, 200, q.body);
  assert.deepEqual(q.json().hilo[0].adjuntos.map((a) => a.ruta), ['adjuntos/notas.rs']);
  await assert.rejects(fs.access(path.join(cfg.datos, 'carpetas/ia/ideas/pesos-rapidos/adjuntos/lectura/plan.docx.md')));
});

test('una réplica lleva sus adjuntos (aunque no tenga texto) y la sesión los recibe', async () => {
  const { cfg, pedir } = await conIdea();
  const dir = path.join(cfg.datos, 'carpetas/ia/ideas/pesos-rapidos');
  await fs.writeFile(path.join(dir, 'hilo/002-claude.md'), '---\nveredicto: aceptada\n---\nBien');
  const a = (await pedir('POST', '/api/carpetas/ia/ideas/pesos-rapidos/adjuntos?nombre=datos.csv', Buffer.from('a,b\n1,2'), BIN)).json();
  const r = await pedir('POST', '/api/carpetas/ia/ideas/pesos-rapidos/replica', { cuerpo: '', adjuntos: [a.ruta] });
  assert.equal(r.statusCode, 200, r.body);
  const replica = r.json().hilo.at(-1);
  assert.equal(replica.n, 3);
  assert.deepEqual(replica.adjuntos.map((x) => x.ruta), ['adjuntos/datos.csv']);
  const m = mensajeEjecucion({ tipo: 'replica', idea: r.json(), carpeta: { nombre: 'IA' }, rutaIdea: 'r', archivoDestino: 'x', replica: replica.contenido, adjuntosReplica: replica.adjuntos });
  assert.match(m, /r\/adjuntos\/datos\.csv/);
  // Solo se aceptan adjuntos ya subidos a esta idea.
  for (const malo of ['../../otra/idea.json', 'hilo/001-usuario.md', 'adjuntos/no-existe.pdf']) {
    assert.equal((await pedir('POST', '/api/carpetas/ia/ideas/pesos-rapidos/replica', { cuerpo: 'x', adjuntos: [malo] })).statusCode, 400, malo);
  }
});

test('se admiten archivos grandes hasta el límite y no más', async () => {
  const { pedir } = await conIdea({ limiteAdjunto: 3 * 1024 * 1024 });
  assert.equal((await pedir('POST', '/api/carpetas/ia/ideas/pesos-rapidos/adjuntos?nombre=a.bin', Buffer.alloc(2.5 * 1024 * 1024, 0), BIN)).statusCode, 201);
  assert.equal((await pedir('POST', '/api/carpetas/ia/ideas/pesos-rapidos/adjuntos?nombre=b.bin', Buffer.alloc(4 * 1024 * 1024, 0), BIN)).statusCode, 413);
});

test('un adjunto HTML se descarga, nunca se abre como página de Semillero', async () => {
  const { pedir } = await conIdea();
  const f = (await pedir('POST', '/api/carpetas/ia/ideas/pesos-rapidos/adjuntos?nombre=trampa.html&mensaje=1', Buffer.from('<script>fetch("/api/carpetas")</script>'), BIN)).json();
  const r = await pedir('GET', `/archivos/carpetas/ia/ideas/pesos-rapidos/${f.ruta}`);
  assert.equal(r.headers['content-type'], 'application/octet-stream');
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
});
