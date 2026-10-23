import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { crearGuard } from '../server/engine/guard.js';
import { cfgTemporal } from './helpers.js';

const X = 'carpetas/ia/ideas/x';
const Y = 'carpetas/ia/ideas/y';

async function preparar() {
  const cfg = await cfgTemporal();
  const escribir = async (rel, txt) => {
    await fs.mkdir(path.dirname(path.join(cfg.datos, rel)), { recursive: true });
    await fs.writeFile(path.join(cfg.datos, rel), txt);
  };
  const leer = (rel) => fs.readFile(path.join(cfg.datos, rel), 'utf8');
  for (const id of ['x', 'y']) {
    await escribir(`carpetas/ia/ideas/${id}/idea.json`, '{}');
    await escribir(`carpetas/ia/ideas/${id}/hilo/001-usuario.md`, 'original');
  }
  await escribir('notas-globales.md', '# Notas globales\n');
  const guard = crearGuard(cfg);
  await guard.iniciar();
  return { cfg, guard, escribir, leer };
}

const propiosDe = (dir, archivo) => [`${dir}/hilo/${archivo}`, `${dir}/figuras/**`, 'carpetas/ia/notas.md', 'notas-globales.md'];

test('restaura textos del usuario modificados por la sesión y conserva su dictamen', async () => {
  const { guard, escribir, leer } = await preparar();
  await escribir(`${X}/hilo/001-usuario.md`, 'manipulado');
  await escribir(`${X}/hilo/002-claude.md`, 'dictamen');
  await escribir(`${X}/figuras/a.png`, 'png');
  const { restaurados } = await guard.verificar({ propios: propiosDe(X, '002-claude.md'), ajenosActivos: [] });
  assert.deepEqual(restaurados, [`${X}/hilo/001-usuario.md`]);
  assert.equal(await leer(`${X}/hilo/001-usuario.md`), 'original');
  assert.equal(await leer(`${X}/hilo/002-claude.md`), 'dictamen');
  assert.equal(await leer(`${X}/figuras/a.png`), 'png');
});

test('no revierte lo que el usuario guardó durante la ejecución', async () => {
  const { guard, escribir, leer } = await preparar();
  await escribir(`${Y}/hilo/001-usuario.md`, 'editado por el usuario');
  await guard.commitear([`${Y}/hilo/001-usuario.md`], 'usuario');
  const { restaurados } = await guard.verificar({ propios: propiosDe(X, '002-claude.md'), ajenosActivos: [] });
  assert.deepEqual(restaurados, []);
  assert.equal(await leer(`${Y}/hilo/001-usuario.md`), 'editado por el usuario');
});

test('no toca el objetivo de otra ejecución activa', async () => {
  const { guard, escribir } = await preparar();
  await escribir(`${Y}/hilo/002-claude.md`, 'dictamen de y en curso');
  const { restaurados } = await guard.verificar({
    propios: propiosDe(X, '002-claude.md'),
    ajenosActivos: [`${Y}/hilo/002-claude.md`, `${Y}/figuras/**`],
  });
  assert.deepEqual(restaurados, []);
});

test('borra archivos nuevos ajenos y restaura idea.json de otra idea', async () => {
  const { guard, escribir, leer } = await preparar();
  await escribir(`${Y}/idea.json`, '{"estado":"aceptada"}');
  await escribir(`${Y}/hilo/009-claude.md`, 'falso');
  const { restaurados } = await guard.verificar({ propios: propiosDe(X, '002-claude.md'), ajenosActivos: [] });
  assert.deepEqual(restaurados.sort(), [`${Y}/hilo/009-claude.md`, `${Y}/idea.json`]);
  assert.equal(await leer(`${Y}/idea.json`), '{}');
  await assert.rejects(leer(`${Y}/hilo/009-claude.md`));
});

test('los registros no entran en git', async () => {
  const { guard, escribir } = await preparar();
  await escribir(`${X}/registro/2026.jsonl`, '{}');
  const { restaurados } = await guard.verificar({ propios: [], ajenosActivos: [] });
  assert.deepEqual(restaurados, []);
});

test('commitear todo deja el árbol limpio', async () => {
  const { guard, escribir } = await preparar();
  await escribir('carpetas/ia/notas.md', 'nota');
  await guard.commitear('todo', 'tras');
  assert.deepEqual(await guard.cambios(), []);
});

test('commitear ignora rutas que no existen y registra borrados', async () => {
  const { cfg, guard, escribir } = await preparar();
  await escribir('carpetas/ia/notas.md', 'nota');
  await guard.commitear(['carpetas/ia/notas.md', `${X}/figuras`, 'no/existe.md'], 'tras');
  await fs.rm(path.join(cfg.datos, Y), { recursive: true });
  await guard.commitear([Y], 'borrar');
  assert.deepEqual(await guard.cambios(), []);
});

test('una escritura protegida en curso nunca se revierte', async () => {
  const { guard, escribir, leer } = await preparar();
  const escritura = guard.proteger([`${Y}/idea.json`], async () => {
    await escribir(`${Y}/idea.json`, '{"estado":"pausada"}');
    await new Promise((r) => setTimeout(r, 50));
  });
  const verificacion = guard.verificar({ propios: [], ajenosActivos: [] });
  await Promise.all([escritura, verificacion]);
  assert.equal(await leer(`${Y}/idea.json`), '{"estado":"pausada"}');
  assert.deepEqual(await guard.cambios(), []);
});
