import { test } from 'node:test';
import assert from 'node:assert/strict';
import { disponer } from '../web/src/lib/arbol.js';
import { MAPA, copia } from './fixtures/mapas.js';

const nodo = (d, id) => d.nodos.find((n) => n.id === id);

test('la semilla está abajo y las capas suben', () => {
  const d = disponer(copia(MAPA));
  assert.deepEqual(d.semilla, { x: 0, y: 0 });
  assert.ok(nodo(d, 'e1').y < 0);
  assert.ok(nodo(d, 'e2').y < nodo(d, 'e1').y);
});

test('los estudios sin dependencias son capa 0', () => {
  const d = disponer(copia(MAPA));
  assert.equal(nodo(d, 'e1').nivel, 0);
  assert.equal(nodo(d, 'e2').nivel, 1);
});

test('una incógnita cuelga a un lado de su estudio', () => {
  const d = disponer(copia(MAPA));
  const i1 = nodo(d, 'i1');
  const e2 = nodo(d, 'e2');
  assert.ok(Math.abs(i1.x - e2.x) >= 150);
  assert.ok(i1.y < e2.y);
  assert.ok(d.ramas.some((r) => r.deId === 'e2' && r.aId === 'i1'));
});

test('los nodos sin dependencias brotan de la semilla', () => {
  const d = disponer(copia(MAPA));
  assert.ok(d.ramas.some((r) => r.deId === null && r.aId === 'e1'));
});

test('cada recurso es una hoja de su nodo', () => {
  const d = disponer(copia(MAPA));
  const hojas = d.hojas.filter((h) => h.recurso === 'r1').map((h) => h.nodo).sort();
  assert.deepEqual(hojas, ['e1', 'i1']);
});

test('ningún par de nodos se solapa', () => {
  const m = copia(MAPA);
  // Un mapa ancho: muchas incógnitas colgando del mismo estudio y varios estudios por capa.
  for (let k = 0; k < 6; k++) m.nodos.push({ id: `x${k}`, tipo: 'incognita', titulo: 'x', resumen: '', documento: `nodos/x${k}.md`, depende: ['e2'], recursos: [] });
  for (let k = 0; k < 4; k++) m.nodos.push({ id: `s${k}`, tipo: 'estudio', titulo: 's', resumen: '', documento: `nodos/s${k}.md`, depende: ['e1'], recursos: [] });
  const d = disponer(m);
  for (const a of d.nodos) {
    for (const b of d.nodos) {
      if (a === b) continue;
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 60, `${a.id} y ${b.id} se solapan`);
    }
  }
});

test('la caja contiene la semilla y todos los nodos', () => {
  const d = disponer(copia(MAPA));
  for (const p of [d.semilla, ...d.nodos]) {
    assert.ok(p.x >= d.caja.x && p.x <= d.caja.x + d.caja.ancho);
    assert.ok(p.y >= d.caja.y && p.y <= d.caja.y + d.caja.alto);
  }
});
