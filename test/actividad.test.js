// Lo que la sesión de una asignatura está haciendo, en lenguaje claro, y cuántos tokens lleva.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearActividad } from '../server/engine/actividad.js';

const herramienta = (id, name, input) => ({ type: 'assistant', message: { id: `m-${id}`, content: [{ type: 'tool_use', id, name, input }] } });
const delta = (u) => ({ type: 'stream_event', event: { type: 'message_delta', usage: u } });
const bloque = (tipo) => ({ type: 'stream_event', event: { type: 'content_block_start', content_block: { type: tipo } } });

test('cada herramienta se describe en lenguaje claro', () => {
  const a = crearActividad();
  const casos = [
    [herramienta('1', 'WebSearch', { query: 'Hatcher algebraic topology pdf' }), /Buscando en la web: «Hatcher algebraic topology pdf»/],
    [herramienta('2', 'WebFetch', { url: 'https://pi.math.cornell.edu/~hatcher/AT/AT.pdf' }), /Leyendo pi\.math\.cornell\.edu/],
    [herramienta('3', 'Write', { file_path: '/d/carpetas/c/ideas/i/germinacion/nodos/e1/c03-homotopia.md' }), /Escribiendo la conferencia «c03-homotopia»/],
    [herramienta('4', 'Write', { file_path: '/d/carpetas/c/ideas/i/germinacion/nodos/e1/p01-indices.md' }), /Escribiendo la clase práctica «p01-indices»/],
    [herramienta('5', 'Write', { file_path: '/d/carpetas/c/ideas/i/germinacion/escenas/e1/giro.js' }), /Programando la escena «giro»/],
    [herramienta('6', 'Bash', { command: 'node /repo/server/escenas/hijo.mjs /d/x/escenas/e1/giro.js' }), /Probando una escena/],
    [herramienta('7', 'Bash', { command: 'curl -sL -o /d/x/germinacion/recursos/e1/hatcher.pdf https://x' }), /Descargando «hatcher\.pdf»/],
    [herramienta('8', 'Write', { file_path: '/d/carpetas/c/ideas/i/germinacion/nodos/e1/indice.json' }), /Escribiendo el índice/],
    [herramienta('9', 'Edit', { file_path: '/d/carpetas/c/ideas/i/germinacion/nodos/e1/c03-homotopia.md' }), /Corrigiendo la conferencia «c03-homotopia»/],
  ];
  for (const [ev, re] of casos) {
    a.alEvento(ev);
    assert.match(a.resumen().accion.texto, re);
  }
  assert.equal(a.resumen().recientes.length, 8, 'se guardan las últimas acciones');
  assert.match(a.resumen().recientes[0].texto, /Corrigiendo/, 'la más reciente primero');
});

test('el pensamiento se muestra como «Pensando», nunca su contenido', () => {
  const a = crearActividad();
  a.alEvento(bloque('thinking'));
  assert.equal(a.resumen().accion.texto, 'Pensando');
  a.alEvento({ type: 'stream_event', event: { type: 'content_block_delta', delta: { type: 'thinking_delta', thinking: 'secreto' } } });
  assert.doesNotMatch(JSON.stringify(a.resumen()), /secreto/);
});

test('los tokens se suman por respuesta del modelo: generados, leídos y el contexto actual', () => {
  const a = crearActividad({ previos: { generados: 1000, leidos: 50000 } });
  a.alEvento(delta({ input_tokens: 2, cache_creation_input_tokens: 8000, cache_read_input_tokens: 100000, output_tokens: 300 }));
  a.alEvento(delta({ input_tokens: 3, cache_creation_input_tokens: 500, cache_read_input_tokens: 108000, output_tokens: 700 }));
  const t = a.resumen().tokens;
  assert.equal(t.generados, 1000 + 300 + 700);
  assert.equal(t.leidos, 50000 + 108002 + 108503);
  assert.equal(t.contexto, 3 + 500 + 108000 + 700);
});
