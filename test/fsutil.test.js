import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { slugify, slugUnico, rutaSegura, escribirAtomico, leerJSON } from '../server/store/fsutil.js';
import { cfgTemporal } from './helpers.js';

test('slugify quita acentos y símbolos', () => {
  assert.equal(slugify('Teoría de Números!'), 'teoria-de-numeros');
});

test('slugify nunca devuelve vacío', () => {
  assert.equal(slugify('***'), 'sin-titulo');
});

test('slugify limita a 60 caracteres', () => {
  assert.ok(slugify('a'.repeat(100)).length <= 60);
});

test('rutaSegura rechaza salir de la base', () => {
  assert.throws(() => rutaSegura('/a', '../x'), /ruta-invalida/);
});

test('rutaSegura rechaza rutas absolutas', () => {
  assert.throws(() => rutaSegura('/a', '/etc/passwd'), /ruta-invalida/);
});

test('rutaSegura acepta rutas internas', () => {
  assert.equal(rutaSegura('/a', 'b/c.md'), path.join('/a', 'b/c.md'));
});

test('slugUnico añade sufijo si existe', async () => {
  const { datos } = await cfgTemporal();
  await fs.mkdir(path.join(datos, 'ia'));
  assert.equal(await slugUnico(datos, 'ia'), 'ia-2');
  assert.equal(await slugUnico(datos, 'fisica'), 'fisica');
});

test('escribirAtomico crea directorios y leerJSON lee', async () => {
  const { datos } = await cfgTemporal();
  const ruta = path.join(datos, 'x/y/z.json');
  await escribirAtomico(ruta, JSON.stringify({ a: 1 }));
  assert.deepEqual(await leerJSON(ruta, null), { a: 1 });
  assert.equal(await leerJSON(path.join(datos, 'no.json'), 7), 7);
});
