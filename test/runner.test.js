import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ejecutar } from '../server/engine/runner.js';
import { cfgTemporal } from './helpers.js';

export const FAKE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/fake-claude.mjs');

async function correr(escenario, { abortarTras } = {}) {
  const cfg = { ...(await cfgTemporal()), claudeBin: FAKE };
  const eventos = [];
  const control = new AbortController();
  const rutaRegistro = path.join(cfg.datos, 'registro/r.jsonl');
  process.env.FAKE_ESCENARIO = escenario;
  if (abortarTras) setTimeout(() => control.abort(), abortarTras);
  const t0 = Date.now();
  const r = await ejecutar({
    cfg,
    args: ['-p', 'Escribe tu dictamen en hilo/002-claude.md', '--session-id', 's1'],
    cwd: cfg.datos,
    rutaRegistro,
    alEvento: (ev) => eventos.push(ev),
    senal: control.signal,
  });
  delete process.env.FAKE_ESCENARIO;
  return { cfg, r, eventos, rutaRegistro, ms: Date.now() - t0 };
}

test('ejecutar emite eventos y los guarda en el registro', async () => {
  const { cfg, r, eventos, rutaRegistro } = await correr('ok');
  assert.equal(r.codigo, 0);
  assert.equal(r.abortado, false);
  assert.ok(eventos.some((e) => e.type === 'stream_event'));
  const lineas = (await fs.readFile(rutaRegistro, 'utf8')).trim().split('\n');
  assert.equal(lineas.length, eventos.length);
  assert.equal(r.rateLimit.unifiedWindows.five_hour.utilization, 0.5);
  assert.equal(r.resultado.subtype, 'success');
  await fs.access(path.join(cfg.datos, 'hilo/002-claude.md'));
});

test('alEvento puede ver el rate_limit_event en vivo', async () => {
  const { eventos } = await correr('ok');
  assert.ok(eventos.some((e) => e.type === 'rate_limit_event'));
});

test('abortar detiene el proceso rápido', async () => {
  const { r, ms } = await correr('lento', { abortarTras: 300 });
  assert.equal(r.abortado, true);
  assert.ok(ms < 6000, `tardó ${ms} ms`);
});

test('binario inexistente devuelve error sin lanzar', async () => {
  const cfg = { ...(await cfgTemporal()), claudeBin: '/no/existe/claude' };
  const r = await ejecutar({
    cfg, args: [], cwd: cfg.datos, rutaRegistro: path.join(cfg.datos, 'r.jsonl'), alEvento: () => {}, senal: new AbortController().signal,
  });
  assert.notEqual(r.codigo, 0);
  assert.ok(r.errorArranque);
});
