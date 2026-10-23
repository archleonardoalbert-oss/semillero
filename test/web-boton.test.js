import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modoBoton, TEXTO_BOTON } from '../web/src/lib/boton.js';

const cola = (e, c) => ({ ejecutando: Array(e).fill({}), enCola: Array(c).fill({}) });

test('sin actividad el botón comienza el análisis', () => {
  assert.equal(modoBoton({ cola: cola(0, 0), pausadas: 0 }), 'comenzar');
});

test('con sesiones en marcha el botón detiene', () => {
  assert.equal(modoBoton({ cola: cola(1, 0), pausadas: 0 }), 'detener');
  assert.equal(modoBoton({ cola: cola(0, 2), pausadas: 0 }), 'detener');
});

test('con ideas pausadas el botón reanuda aunque haya otras en marcha', () => {
  assert.equal(modoBoton({ cola: cola(1, 0), pausadas: 2 }), 'reanudar');
});

test('los textos del botón son los exactos', () => {
  assert.deepEqual(TEXTO_BOTON, {
    comenzar: 'Comenzar Análisis', detener: 'Detener Análisis', reanudar: 'Reanudar Investigación',
  });
});

test('sin datos de cola no falla', () => {
  assert.equal(modoBoton({ cola: null, pausadas: 0 }), 'comenzar');
});
