import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearSeleccion } from '../web/src/lib/seleccion.js';

const grupos = [
  { carpeta: { id: 'ia' }, ideas: [{ id: 'x' }, { id: 'y' }, { id: 'z' }] },
  { carpeta: { id: 'neuro' }, ideas: [{ id: 'w' }] },
];

test('al abrir no hay nada marcado', () => {
  const s = crearSeleccion(grupos);
  assert.equal(s.refs().length, 0);
  assert.equal(s.estadoTodas(), 'ninguna');
});

test('marcar una carpeta marca todas sus ideas', () => {
  const s = crearSeleccion(grupos);
  s.alternarCarpeta('ia');
  assert.equal(s.estadoCarpeta('ia'), 'todas');
  assert.deepEqual(s.refs(), [
    { carpetaId: 'ia', ideaId: 'x' }, { carpetaId: 'ia', ideaId: 'y' }, { carpetaId: 'ia', ideaId: 'z' },
  ]);
  assert.equal(s.estadoTodas(), 'parcial');
});

test('desmarcar una idea deja la carpeta en parcial y volver a pulsarla la completa', () => {
  const s = crearSeleccion(grupos);
  s.alternarCarpeta('ia');
  s.alternarIdea('ia', 'x');
  assert.equal(s.estadoCarpeta('ia'), 'parcial');
  s.alternarCarpeta('ia');
  assert.equal(s.estadoCarpeta('ia'), 'todas');
  s.alternarCarpeta('ia');
  assert.equal(s.estadoCarpeta('ia'), 'ninguna');
});

test('marcar todas y desmarcar todas', () => {
  const s = crearSeleccion(grupos);
  s.alternarTodas();
  assert.equal(s.refs().length, 4);
  assert.equal(s.estadoTodas(), 'todas');
  s.alternarTodas();
  assert.equal(s.refs().length, 0);
});

test('marcar idea a idea hasta completar la carpeta', () => {
  const s = crearSeleccion(grupos);
  s.alternarIdea('neuro', 'w');
  assert.equal(s.estadoCarpeta('neuro'), 'todas');
  assert.equal(s.marcada('neuro', 'w'), true);
});
