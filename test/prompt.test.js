import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promptSistema, mensajeEjecucion, argsClaude } from '../server/engine/prompt.js';
import { AJUSTES_POR_DEFECTO } from '../server/config.js';

const base = {
  idea: { titulo: 'Pesos rápidos', editadaTrasDictamen: false },
  carpeta: { nombre: 'IA', id: 'ia' },
  rutaIdea: 'carpetas/ia/ideas/pesos-rapidos',
  archivoDestino: 'carpetas/ia/ideas/pesos-rapidos/hilo/002-claude.md',
};

test('el prompt de sistema fija formato, veredictos y memoria', () => {
  const p = promptSistema();
  for (const s of ['veredicto:', 'aclaracion', '## Referencias', 'notas-globales.md', 'sin sentido', 'figuras/', '\\tag']) {
    assert.ok(p.includes(s), `falta ${s}`);
  }
});

test('el mensaje inicial termina con la ruta de destino', () => {
  const m = mensajeEjecucion({ tipo: 'inicial', ...base });
  assert.ok(m.includes('carpetas/ia/ideas/pesos-rapidos/hilo/001-usuario.md'));
  assert.match(m, /Escribe tu dictamen en carpetas\/ia\/ideas\/pesos-rapidos\/hilo\/002-claude\.md$/);
});

test('la réplica incluye el texto y avisa si la idea original cambió', () => {
  const m = mensajeEjecucion({
    tipo: 'replica', ...base, idea: { ...base.idea, editadaTrasDictamen: true }, replica: '¿Y con dopamina?',
  });
  assert.ok(m.includes('¿Y con dopamina?'));
  assert.match(m, /modificó la idea original/);
  assert.match(m, /Escribe tu dictamen en \S+002-claude\.md$/);
});

test('reanudar pide continuar donde lo dejó', () => {
  assert.match(mensajeEjecucion({ tipo: 'reanudar', ...base }), /continúa donde la dejaste/);
});

test('argsClaude usa --session-id para sesiones nuevas', () => {
  const a = argsClaude({ sessionId: 'u1', nueva: true, ajustes: AJUSTES_POR_DEFECTO, mensaje: 'hola' });
  assert.equal(a[a.indexOf('--session-id') + 1], 'u1');
  assert.ok(!a.includes('--resume'));
  assert.equal(a[a.indexOf('--model') + 1], 'opus');
  assert.equal(a[a.indexOf('-p') + 1], 'hola');
  for (const f of ['--safe-mode', '--include-partial-messages', '--verbose']) assert.ok(a.includes(f));
  assert.equal(a[a.indexOf('--thinking-display') + 1], 'summarized');
  assert.equal(a[a.indexOf('--permission-mode') + 1], 'dontAsk');
});

test('argsClaude usa --resume para sesiones existentes', () => {
  const a = argsClaude({ sessionId: 'u1', nueva: false, ajustes: AJUSTES_POR_DEFECTO, mensaje: 'x' });
  assert.equal(a[a.indexOf('--resume') + 1], 'u1');
  assert.ok(!a.includes('--session-id'));
});

test('el prompt define Cambio sugerido', () => {
  const p = promptSistema();
  assert.ok(p.includes('cambios'));
  assert.ok(p.includes('dirección correcta'));
});

test('la réplica avisa de dictámenes enmendados sin contar la glosa', () => {
  const m = mensajeEjecucion({ tipo: 'replica', ...base, idea: { ...base.idea, enmendados: ['002-claude.md'] }, replica: 'Hola' });
  assert.match(m, /002-claude\.md fue enmendado/);
});

test('el prompt de germinación fija el formato, las descargas legales y no inventar consecuencias', async () => {
  const { promptGerminacion } = await import('../server/engine/prompt.js');
  const p = promptGerminacion();
  for (const s of ['mapa.json', '"fase": "diagnostico | mapa"', 'legalmente accesible', 'Sci-Hub', 'NUNCA inventes', 'progreso.json', 'incognita']) {
    assert.ok(p.includes(s), `falta ${s}`);
  }
});
