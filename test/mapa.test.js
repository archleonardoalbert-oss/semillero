import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarMapa } from '../server/engine/mapa.js';
import { MAPA, DIAGNOSTICO, copia } from './fixtures/mapas.js';

const motivo = (m) => validarMapa(m).motivo ?? '';

test('mapa válido', () => {
  assert.equal(validarMapa(copia(MAPA)).ok, true);
  assert.equal(validarMapa(copia(DIAGNOSTICO)).ok, true);
});

test('id duplicado', () => {
  const m = copia(MAPA);
  m.nodos[1].id = 'e1';
  assert.match(motivo(m), /duplicado/);
});

test('id con formato inválido', () => {
  const m = copia(MAPA);
  m.nodos[0].id = 'E 1';
  assert.match(motivo(m), /id/);
});

test('dependencia inexistente', () => {
  const m = copia(MAPA);
  m.nodos[1].depende = ['zz'];
  assert.match(motivo(m), /zz/);
});

test('recurso inexistente', () => {
  const m = copia(MAPA);
  m.nodos[0].recursos = ['r9'];
  assert.match(motivo(m), /r9/);
});

test('ciclo', () => {
  const m = copia(MAPA);
  m.nodos[0].depende = ['i1'];
  assert.match(motivo(m), /ciclo/);
});

test('ruta fuera de germinacion', () => {
  const m = copia(MAPA);
  m.nodos[0].documento = '../hilo/002-claude.md';
  assert.equal(validarMapa(m).ok, false);
  const r = copia(MAPA);
  r.recursos[0].archivo = '/etc/passwd';
  assert.equal(validarMapa(r).ok, false);
});

test('diagnóstico sin preguntas', () => {
  const m = copia(DIAGNOSTICO);
  m.diagnostico.preguntas = [];
  assert.match(motivo(m), /pregunta/);
});

test('escala sin cinco niveles', () => {
  const m = copia(DIAGNOSTICO);
  m.diagnostico.preguntas[0].niveles = ['a', 'b'];
  assert.match(motivo(m), /niveles/);
});

test('recurso sin url ni archivo', () => {
  const m = copia(MAPA);
  delete m.recursos[0].url;
  delete m.recursos[0].archivo;
  assert.match(motivo(m), /url/);
});

test('mapa en fase mapa sin nodos', () => {
  const m = copia(MAPA);
  m.nodos = [];
  m.recursos = [];
  assert.match(motivo(m), /nodo/);
});
