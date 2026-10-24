import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diferencias } from '../web/src/lib/diff.js';

test('párrafos iguales, quitados y nuevos', () => {
  const r = diferencias('A\n\nB\n\nC', 'A\n\nB2\n\nC\n\nD');
  assert.deepEqual(r.map((x) => [x.tipo, x.texto]), [['igual', 'A'], ['quitado', 'B'], ['nuevo', 'B2'], ['igual', 'C'], ['nuevo', 'D']]);
});

test('un bloque de ecuación con líneas en blanco dentro no se parte', () => {
  const r = diferencias('Antes\n\n$$\na\n\nb\n$$\n\nFin', 'Antes\n\n$$\na\n\nb\n$$\n\nFin');
  assert.equal(r.length, 3);
  assert.ok(r.every((x) => x.tipo === 'igual'));
});

test('sin cambios todo es igual; texto vacío', () => {
  assert.deepEqual(diferencias('', 'X').map((x) => x.tipo), ['nuevo']);
});
