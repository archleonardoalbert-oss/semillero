import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { crearAlmacenCarpetas } from '../server/store/carpetas.js';
import { crearAlmacenIdeas } from '../server/store/ideas.js';
import { cfgTemporal } from './helpers.js';

const DICTAMEN = '---\nveredicto: aceptada\netapa: 2\nresumen: Vale la pena\n---\n\nTexto';

async function preparar() {
  const cfg = await cfgTemporal();
  const escritos = [];
  const carpetas = crearAlmacenCarpetas(cfg);
  await carpetas.crear({ nombre: 'IA' });
  const ideas = crearAlmacenIdeas(cfg, { alEscribir: async (r) => escritos.push(...r) });
  return { cfg, ideas, escritos };
}

async function simularDictamen(cfg, ideas, idea) {
  const archivo = await ideas.siguienteArchivo('ia', idea.id);
  await fs.writeFile(path.join(cfg.datos, 'carpetas/ia/ideas', idea.id, 'hilo', archivo), DICTAMEN);
  await ideas.actualizar('ia', idea.id, { estado: 'aceptada' });
  return archivo;
}

test('crear idea escribe el primer mensaje y queda en borrador', async () => {
  const { cfg, ideas } = await preparar();
  const idea = await ideas.crear('ia', { titulo: 'Pesos rápidos', cuerpo: 'Sinapsis con $h_t$' });
  assert.equal(idea.id, 'pesos-rapidos');
  assert.equal(idea.estado, 'borrador');
  const md = await fs.readFile(path.join(cfg.datos, 'carpetas/ia/ideas/pesos-rapidos/hilo/001-usuario.md'), 'utf8');
  assert.equal(md, 'Sinapsis con $h_t$');
});

test('alEscribir recibe las rutas escritas por el usuario', async () => {
  const { ideas, escritos } = await preparar();
  await ideas.crear('ia', { titulo: 'X', cuerpo: 'y' });
  assert.deepEqual(escritos.sort(), ['carpetas/ia/ideas/x/hilo/001-usuario.md', 'carpetas/ia/ideas/x/idea.json']);
});

test('una idea nueva aparece en pendientes como NUEVA', async () => {
  const { ideas } = await preparar();
  await ideas.crear('ia', { titulo: 'X', cuerpo: 'y' });
  const grupos = await ideas.pendientes();
  assert.equal(grupos.length, 1);
  assert.equal(grupos[0].carpeta.id, 'ia');
  assert.equal(grupos[0].ideas[0].etiqueta, 'NUEVA');
});

test('una idea con dictamen no está pendiente', async () => {
  const { cfg, ideas } = await preparar();
  const idea = await ideas.crear('ia', { titulo: 'X', cuerpo: 'y' });
  await simularDictamen(cfg, ideas, idea);
  assert.deepEqual(await ideas.pendientes(), []);
});

test('obtener devuelve el hilo con meta del dictamen', async () => {
  const { cfg, ideas } = await preparar();
  const idea = await ideas.crear('ia', { titulo: 'X', cuerpo: 'y' });
  await simularDictamen(cfg, ideas, idea);
  const completa = await ideas.obtener('ia', 'x');
  assert.deepEqual(completa.hilo.map((m) => m.autor), ['usuario', 'claude']);
  assert.equal(completa.hilo[1].meta.veredicto, 'aceptada');
});

test('responder crea la réplica y la etiqueta como ANALIZADA', async () => {
  const { cfg, ideas } = await preparar();
  const idea = await ideas.crear('ia', { titulo: 'X', cuerpo: 'y' });
  await simularDictamen(cfg, ideas, idea);
  await ideas.responder('ia', 'x', '¿Y si…?');
  const md = await fs.readFile(path.join(cfg.datos, 'carpetas/ia/ideas/x/hilo/003-usuario.md'), 'utf8');
  assert.equal(md, '¿Y si…?');
  assert.equal((await ideas.obtener('ia', 'x')).estado, 'replica-pendiente');
  assert.equal((await ideas.pendientes())[0].ideas[0].etiqueta, 'ANALIZADA');
  assert.equal(await ideas.siguienteArchivo('ia', 'x'), '004-claude.md');
});

test('responder sin dictamen lanza sin-dictamen', async () => {
  const { ideas } = await preparar();
  await ideas.crear('ia', { titulo: 'X', cuerpo: 'y' });
  await assert.rejects(ideas.responder('ia', 'x', 'hola'), /sin-dictamen/);
});

test('editar el original tras el dictamen deja réplica pendiente', async () => {
  const { cfg, ideas } = await preparar();
  const idea = await ideas.crear('ia', { titulo: 'X', cuerpo: 'y' });
  await simularDictamen(cfg, ideas, idea);
  await ideas.editarOriginal('ia', 'x', { titulo: 'X', cuerpo: 'z' });
  const i = await ideas.obtener('ia', 'x');
  assert.equal(i.estado, 'replica-pendiente');
  assert.equal(i.editadaTrasDictamen, true);
});

test('editar el original en borrador no cambia el estado', async () => {
  const { ideas } = await preparar();
  await ideas.crear('ia', { titulo: 'X', cuerpo: 'y' });
  await ideas.editarOriginal('ia', 'x', { titulo: 'Nuevo', cuerpo: 'z' });
  const i = await ideas.obtener('ia', 'x');
  assert.equal(i.estado, 'borrador');
  assert.equal(i.titulo, 'Nuevo');
  assert.equal(i.hilo[0].contenido, 'z');
});

test('se admite cualquier archivo; lo que la sesión no puede leer queda con aviso', async () => {
  const { ideas } = await preparar();
  await ideas.crear('ia', { titulo: 'X', cuerpo: 'y' });
  const f = await ideas.adjuntar('ia', 'x', 'a.exe', Buffer.from([0x4d, 0x5a, 0, 0, 0xff]));
  assert.equal(f.ruta, 'adjuntos/a.exe');
  assert.equal(f.tipo, 'ilegible');
  assert.ok(f.aviso);
});

test('guardarAdjunto sanea el nombre y queda dentro de adjuntos', async () => {
  const { cfg, ideas } = await preparar();
  await ideas.crear('ia', { titulo: 'X', cuerpo: 'y' });
  const ruta = await ideas.guardarAdjunto('ia', 'x', '../../Boceto Sinapsis.PNG', Buffer.from('png'));
  assert.equal(ruta, 'adjuntos/boceto-sinapsis.png');
  await fs.access(path.join(cfg.datos, 'carpetas/ia/ideas/x/adjuntos/boceto-sinapsis.png'));
});

test('listar filtra por estado', async () => {
  const { cfg, ideas } = await preparar();
  const a = await ideas.crear('ia', { titulo: 'A', cuerpo: 'y' });
  await ideas.crear('ia', { titulo: 'B', cuerpo: 'y' });
  await simularDictamen(cfg, ideas, a);
  assert.deepEqual((await ideas.listar({ estado: 'aceptada' })).map((i) => i.id), ['a']);
  assert.equal((await ideas.listar()).length, 2);
});
