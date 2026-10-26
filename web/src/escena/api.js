// La API que recibe cada escena de un curso: `export default (S) => S.definirEscena({ … })`.
// Solo piezas puras (sin DOM), para que la misma escena se dibuje en el navegador y se compruebe en Node.
import { definirEscena, etapa } from './comun.js';
import { plano, ease, tramo, mezclar, solucionCache, marcasCampo } from './motor/plano.js';
import { rk4, rk4Sistema, euler, deriv, raices, clasificar } from './motor/numerico.js';
import { compilar } from './motor/expresion.js';
import { ANCHO, COLORES, rgba } from './motor/lienzo.js';
import * as primitivas from './primitivas.js';
import * as piezas from './piezas.js';

export const S = Object.freeze({
  definirEscena, etapa,
  plano, ease, tramo, mezclar, solucionCache, marcasCampo,
  rk4, rk4Sistema, euler, deriv, raices, clasificar,
  compilar,
  ANCHO, COLORES, rgba,
  ...primitivas,
  ...piezas,
});

// Una escena se escribe como función de S (o, si no, como escena ya definida).
export const instanciar = (modulo) => (typeof modulo.default === 'function' ? modulo.default(S) : modulo.default);
