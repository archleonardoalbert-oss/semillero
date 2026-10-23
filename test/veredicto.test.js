import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsearDictamen } from '../server/engine/veredicto.js';

test('frontmatter válido devuelve meta y cuerpo', () => {
  const r = parsearDictamen('---\nveredicto: rechazada\netapa: 1\nresumen: "Ya existe y es mejor"\n---\n\n# Dictamen\n');
  assert.deepEqual(r.meta, { veredicto: 'rechazada', etapa: 1, resumen: 'Ya existe y es mejor' });
  assert.equal(r.cuerpo, '# Dictamen\n');
});

test('acepta aclaracion como veredicto', () => {
  assert.equal(parsearDictamen('---\nveredicto: aclaracion\netapa: 1\nresumen: Faltan datos\n---\nx').meta.veredicto, 'aclaracion');
});

test('sin frontmatter devuelve null', () => {
  assert.equal(parsearDictamen('# Solo texto'), null);
});

test('veredicto desconocido devuelve null', () => {
  assert.equal(parsearDictamen('---\nveredicto: quizas\netapa: 1\nresumen: x\n---\n'), null);
});

test('etapa fuera de rango devuelve null', () => {
  assert.equal(parsearDictamen('---\nveredicto: aceptada\netapa: 3\nresumen: x\n---\n'), null);
});

test('resumen vacío devuelve null', () => {
  assert.equal(parsearDictamen('---\nveredicto: aceptada\netapa: 2\nresumen:\n---\n'), null);
});

test('tolera CRLF y BOM', () => {
  assert.ok(parsearDictamen('﻿---\r\nveredicto: aceptada\r\netapa: 2\r\nresumen: ok\r\n---\r\ncuerpo'));
});
