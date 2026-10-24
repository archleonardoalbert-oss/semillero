import { test } from 'node:test';
import assert from 'node:assert/strict';
import { disponer } from '../web/src/lib/arbol.js';
import { MAPA, copia } from './fixtures/mapas.js';

const RAICES = [
  { id: '001-usuario.md', etiqueta: 'Tu idea' },
  { id: '002-claude.md', etiqueta: 'Dictamen' },
  { id: '003-usuario.md', etiqueta: 'Réplica' },
];
const nodo = (d, id) => d.nodos.find((n) => n.id === id);
const solapan = (a, b) => a.x < b.x + b.ancho && b.x < a.x + a.ancho && a.y < b.y + b.alto && b.y < a.y + a.alto;

// Un mapa grande y difícil: tronco ancho y una copa llena de incógnitas con títulos largos encadenadas.
function mapaGrande() {
  const m = copia(MAPA);
  for (let k = 0; k < 8; k++) m.nodos.push({ id: `s${k}`, tipo: 'estudio', titulo: `Estudio número ${k} con un título bastante largo para probar`, resumen: '', documento: `nodos/s${k}.md`, depende: k > 1 ? [`s${k - 2}`] : ['e1'], recursos: [] });
  for (let k = 0; k < 30; k++) {
    m.nodos.push({
      id: `x${k}`, tipo: 'incognita', abierto: k % 3 === 0,
      titulo: `¿Qué ocurre con la incógnita ${k} cuando el título es tan largo que no cabe?`,
      resumen: '', documento: `nodos/x${k}.md`, depende: k > 4 ? [`x${k - 5}`] : [`s${k}`], recursos: [],
    });
  }
  return m;
}

test('las raíces quedan bajo el suelo, una por mensaje', () => {
  const d = disponer(copia(MAPA), { raices: RAICES });
  assert.equal(d.raices.length, 3);
  for (const r of d.raices) assert.ok(r.y > 0);
});

test('el tronco sube por capas desde el suelo', () => {
  const d = disponer(copia(MAPA), { raices: RAICES });
  assert.ok(nodo(d, 'e1').y < 0);
  assert.ok(nodo(d, 'e2').y < nodo(d, 'e1').y);
  assert.equal(nodo(d, 'e1').forma, 'tronco');
});

test('la copa queda por encima de todo el tronco', () => {
  const d = disponer(mapaGrande(), { raices: RAICES });
  const techo = Math.min(...d.nodos.filter((n) => n.tipo === 'estudio').map((n) => n.y));
  for (const n of d.nodos.filter((x) => x.tipo === 'incognita')) assert.ok(n.y < techo, `${n.id} no está en la copa`);
});

test('fruto para los problemas abiertos y hoja para las demás incógnitas', () => {
  const d = disponer(copia(MAPA));
  assert.equal(nodo(d, 'i1').forma, 'fruto');
  const m = copia(MAPA);
  m.nodos[2].abierto = false;
  assert.equal(nodo(disponer(m), 'i1').forma, 'hoja');
});

test('las ramas unen la incógnita con su estudio y el tronco con el suelo', () => {
  const d = disponer(copia(MAPA));
  assert.ok(d.ramas.some((r) => r.deId === 'e2' && r.aId === 'i1'));
  assert.ok(d.ramas.some((r) => r.deId === null && r.aId === 'e1'));
});

test('ningún par de nodos se solapa en un mapa grande', () => {
  const d = disponer(mapaGrande(), { raices: RAICES });
  for (const a of d.nodos) for (const b of d.nodos) {
    if (a !== b) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 50, `${a.id} y ${b.id} se solapan`);
  }
});

test('ningún título se solapa con otro en un mapa grande', () => {
  const d = disponer(mapaGrande(), { raices: RAICES });
  const cajas = [...d.nodos, ...d.raices].map((n) => ({ id: n.id, ...n.etq.caja }));
  for (let a = 0; a < cajas.length; a++) {
    for (let b = a + 1; b < cajas.length; b++) assert.ok(!solapan(cajas[a], cajas[b]), `los títulos de ${cajas[a].id} y ${cajas[b].id} se solapan`);
  }
});

test('los títulos largos se truncan y conservan el completo', () => {
  const d = disponer(mapaGrande());
  const n = nodo(d, 'x3');
  assert.ok(n.etq.texto.length <= 38);
  assert.ok(n.etq.texto.endsWith('…'));
});

test('la caja contiene nodos, raíces y títulos', () => {
  const d = disponer(mapaGrande(), { raices: RAICES });
  for (const n of [...d.nodos, ...d.raices]) {
    const c = n.etq.caja;
    assert.ok(c.x >= d.caja.x && c.x + c.ancho <= d.caja.x + d.caja.ancho);
    assert.ok(c.y >= d.caja.y && c.y + c.alto <= d.caja.y + d.caja.alto);
  }
});
