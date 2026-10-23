import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsearDictamen } from '../server/engine/veredicto.js';

test('frontmatter válido devuelve meta y cuerpo', () => {
  const r = parsearDictamen('---\nveredicto: rechazada\netapa: 1\nresumen: "Ya existe y es mejor"\n---\n\n# Dictamen\n');
  assert.deepEqual(r.meta, { veredicto: 'rechazada', etapa: 1, resumen: 'Ya existe y es mejor', etiqueta: null });
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

test('acepta cambios como veredicto', () => {
  assert.equal(parsearDictamen('---\nveredicto: cambios\netapa: 2\nresumen: Buena, con dos cambios\n---\nx').meta.veredicto, 'cambios');
});

test('acepta no-recomendada y lee la etiqueta', () => {
  const r = parsearDictamen('---\nveredicto: no-recomendada\netapa: 2\nresumen: Correcta pero pobre\netiqueta: Variación recomendada, resultados pobres\n---\nCuerpo');
  assert.equal(r.meta.veredicto, 'no-recomendada');
  assert.equal(r.meta.etiqueta, 'Variación recomendada, resultados pobres');
});

const CAMINOS = '```semillero-caminos\n[{"id":"jacobiano","tipo":"variacion","titulo":"Usar el jacobiano ajustado","descripcion":"Con el modelo de **Creamer**."},{"id":"no-normal","tipo":"idea-nueva","titulo":"No normalidad","descripcion":"Otra idea."}]\n```';

test('extrae los caminos y los quita del cuerpo', () => {
  const r = parsearDictamen(`---\nveredicto: no-recomendada\netapa: 2\nresumen: x\n---\nTexto\n\n${CAMINOS}\n\n## Referencias\n`);
  assert.equal(r.caminos.length, 2);
  assert.equal(r.caminos[1].tipo, 'idea-nueva');
  assert.ok(!r.cuerpo.includes('semillero-caminos'));
  assert.ok(r.cuerpo.includes('## Referencias'));
});

test('caminos mal formados se ignoran y quedan visibles', () => {
  const mal = '```semillero-caminos\n[{"id":"X Y","tipo":"otro"}]\n```';
  const r = parsearDictamen(`---\nveredicto: rechazada\netapa: 1\nresumen: x\n---\nTexto\n\n${mal}\n`);
  assert.deepEqual(r.caminos, []);
  assert.ok(r.cuerpo.includes('semillero-caminos'));
});

test('sin etiqueta el parser no falla', () => {
  assert.equal(parsearDictamen('---\nveredicto: aceptada\netapa: 2\nresumen: ok\n---\nx').meta.etiqueta, null);
});
