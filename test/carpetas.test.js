import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { crearAlmacenCarpetas } from '../server/store/carpetas.js';
import { cfgTemporal } from './helpers.js';

test('crear carpeta guarda carpeta.json y notas.md', async () => {
  const cfg = await cfgTemporal();
  const carpetas = crearAlmacenCarpetas(cfg);
  const c = await carpetas.crear({ nombre: 'IA', color: '#7aa2ff' });
  assert.equal(c.id, 'ia');
  const dir = path.join(cfg.datos, 'carpetas/ia');
  assert.ok(JSON.parse(await fs.readFile(path.join(dir, 'carpeta.json'), 'utf8')).nombre === 'IA');
  assert.match(await fs.readFile(path.join(dir, 'notas.md'), 'utf8'), /# Notas de IA/);
  assert.match(await fs.readFile(path.join(cfg.datos, 'notas-globales.md'), 'utf8'), /# Notas globales/);
});

test('listar ordena por orden de creación', async () => {
  const cfg = await cfgTemporal();
  const carpetas = crearAlmacenCarpetas(cfg);
  await carpetas.crear({ nombre: 'Neurociencia' });
  await carpetas.crear({ nombre: 'Física' });
  assert.deepEqual((await carpetas.listar()).map((c) => c.id), ['neurociencia', 'fisica']);
});

test('nombre repetido genera id único', async () => {
  const cfg = await cfgTemporal();
  const carpetas = crearAlmacenCarpetas(cfg);
  await carpetas.crear({ nombre: 'IA' });
  assert.equal((await carpetas.crear({ nombre: 'IA' })).id, 'ia-2');
});

test('renombrar cambia el nombre pero no el id', async () => {
  const cfg = await cfgTemporal();
  const carpetas = crearAlmacenCarpetas(cfg);
  await carpetas.crear({ nombre: 'IA' });
  const c = await carpetas.renombrar('ia', 'Inteligencia Artificial');
  assert.equal(c.id, 'ia');
  assert.equal((await carpetas.listar())[0].nombre, 'Inteligencia Artificial');
});

test('borrar carpeta con ideas lanza carpeta-no-vacia', async () => {
  const cfg = await cfgTemporal();
  const carpetas = crearAlmacenCarpetas(cfg);
  await carpetas.crear({ nombre: 'IA' });
  await fs.mkdir(path.join(cfg.datos, 'carpetas/ia/ideas/algo'), { recursive: true });
  await assert.rejects(carpetas.borrar('ia'), /carpeta-no-vacia/);
});

test('borrar carpeta vacía la elimina', async () => {
  const cfg = await cfgTemporal();
  const carpetas = crearAlmacenCarpetas(cfg);
  await carpetas.crear({ nombre: 'IA' });
  await carpetas.borrar('ia');
  assert.equal((await carpetas.listar()).length, 0);
});
