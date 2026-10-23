import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearAjustes } from '../server/store/ajustes.js';
import { cfgTemporal } from './helpers.js';

test('ajustes por defecto usan opus y 5 en paralelo', async () => {
  const ajustes = crearAjustes(await cfgTemporal());
  const a = await ajustes.leer();
  assert.equal(a.modelo, 'opus');
  assert.equal(a.paralelo, 5);
  assert.equal(a.umbral5h, 0.9);
});

test('guardar mezcla y persiste', async () => {
  const cfg = await cfgTemporal();
  await crearAjustes(cfg).guardar({ umbral5h: 0.8 });
  const a = await crearAjustes(cfg).leer();
  assert.equal(a.umbral5h, 0.8);
  assert.equal(a.modelo, 'opus');
});

test('paralelo se limita entre 1 y 5', async () => {
  const ajustes = crearAjustes(await cfgTemporal());
  assert.equal((await ajustes.guardar({ paralelo: 9 })).paralelo, 5);
  assert.equal((await ajustes.guardar({ paralelo: 0 })).paralelo, 1);
});
