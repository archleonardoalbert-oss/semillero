import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { crearTranscripcion, fechaRegistro } from '../web/src/lib/eventos.js';

const eventos = fs.readFileSync(new URL('./fixtures/stream-ejemplo.jsonl', import.meta.url), 'utf8')
  .trim().split('\n').map((l) => JSON.parse(l));

function aplicarTodo() {
  const t = crearTranscripcion();
  for (const ev of eventos) t.aplicar(ev);
  return t;
}

test('los deltas de pensamiento se juntan en un bloque', () => {
  const p = aplicarTodo().bloques.filter((b) => b.tipo === 'pensamiento');
  assert.equal(p.length, 1);
  assert.equal(p[0].texto, 'Evaluando si la idea ya existe.');
  assert.equal(p[0].terminado, true);
});

test('una búsqueda web muestra su consulta una sola vez', () => {
  const h = aplicarTodo().bloques.filter((b) => b.tipo === 'herramienta');
  assert.equal(h.length, 1);
  assert.equal(h[0].herramienta, 'WebSearch');
  assert.equal(h[0].query, 'fast weights plasticity 2026');
});

test('el resultado de la herramienta se trunca y se asocia', () => {
  const r = aplicarTodo().bloques.find((b) => b.tipo === 'resultado');
  assert.match(r.texto, /Ba et al/);
  assert.ok(r.texto.length <= 600);
});

test('el uso de cuota y el final aparecen como sistema', () => {
  const s = aplicarTodo().bloques.filter((b) => b.tipo === 'sistema');
  assert.ok(s.some((b) => /50 %/.test(b.texto)));
  assert.match(s.at(-1).texto, /Terminado/);
});

test('el texto de la respuesta se acumula', () => {
  assert.equal(aplicarTodo().bloques.find((b) => b.tipo === 'texto').texto, 'Dictamen escrito.');
});

test('WebFetch muestra la URL y Write la ruta', () => {
  const t = crearTranscripcion();
  t.aplicar({ type: 'assistant', message: { content: [
    { type: 'tool_use', id: 'a', name: 'WebFetch', input: { url: 'https://arxiv.org/abs/1', prompt: 'x' } },
    { type: 'tool_use', id: 'b', name: 'Write', input: { file_path: '/d/carpetas/ia/ideas/x/hilo/002-claude.md', content: 'x' } },
  ] } });
  assert.equal(t.bloques[0].url, 'https://arxiv.org/abs/1');
  assert.match(t.bloques[1].ruta, /002-claude\.md$/);
});

test('fechaRegistro interpreta el nombre del archivo', () => {
  assert.equal(fechaRegistro('2026-10-23T05-12-33-123Z.jsonl').toISOString(), '2026-10-23T05:12:33.123Z');
});
