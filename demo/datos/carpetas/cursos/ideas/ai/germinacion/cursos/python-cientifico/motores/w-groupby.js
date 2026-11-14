// groupby como dividir-aplicar-combinar, y la diferencia de forma entre agg (una fila por grupo) y transform
// (una fila por fila original, con el valor de su grupo).
import { C, lienzo, pasos, mandos, selector, deslizador, ease, tramo, mezclar, fmt } from './motor.js';

const TIENDAS = ['Centro', 'Playa', 'Centro', 'Cerro', 'Playa', 'Centro'];
const ORDEN = ['Centro', 'Cerro', 'Playa'];

export default function (cuerpo) {
  const e = { f: 'sum', u0: 6 };
  const H = 28, XT = 36, YT = 70, XS = 262, XR = 500;
  const L = lienzo(cuerpo, { alto: 470, etiqueta: 'groupby por tienda: agg y transform' });
  function calc() {
    const unidades = [e.u0, 5, 3, 7, 2, 4];
    const grupos = ORDEN.map((t) => ({ t, filas: TIENDAS.map((x, i) => (x === t ? i : -1)).filter((i) => i >= 0) }));
    let y = YT;
    const ySplit = [];
    for (const gr of grupos) {
      const v = gr.filas.map((i) => unidades[i]);
      gr.valor = e.f === 'sum' ? v.reduce((a, b) => a + b, 0) : e.f === 'mean' ? v.reduce((a, b) => a + b, 0) / v.length : Math.max(...v);
      gr.y0 = y; gr.filas.forEach((i) => { ySplit[i] = y; y += H; }); y += 14;
    }
    return { unidades, grupos, ySplit, valorDe: Object.fromEntries(grupos.map((g) => [g.t, g.valor])) };
  }
  const v = (x) => fmt(x, 2);
  function fila(g, x, y, celdas, anchos, colores, alfa = 1) {
    let xx = x;
    celdas.forEach((t, k) => { g.celda(xx, y - H / 2, anchos[k], H, null, { color: colores[k] ?? C.azul, alfa, fondo: 0.1 }); g.texto(xx + 8, y, t, { fuente: 'mono', tam: 12.5, ancla: 'l', alfa, color: C.tinta }); xx += anchos[k]; });
  }
  function dibujar(paso, p) {
    const R = calc();
    const q = (k) => (paso > k ? 1 : paso === k ? p : 0);
    L.dibujar((g) => {
      g.texto(XT, 26, 'ventas', { fuente: 'mono', tam: 13, ancla: 'l', color: C.azul, peso: 600 });
      g.texto(XT + 8, 48, 'tienda', { tam: 11, ancla: 'l', color: C.tenue }); g.texto(XT + 98, 48, 'unidades', { tam: 11, ancla: 'l', color: C.tenue });
      TIENDAS.forEach((t, i) => {
        g.texto(XT - 8, YT + i * H, i, { fuente: 'mono', tam: 10.5, color: C.tenue, ancla: 'r' });
        fila(g, XT, YT + i * H, [t, String(R.unidades[i])], [90, 90], [C.azul, i === 0 ? C.rosa : C.azul], 1 - 0.65 * q(1));
      });
      if (paso >= 1) {
        g.texto(XS, 26, 'groupby("tienda")', { fuente: 'mono', tam: 13, ancla: 'l', color: C.tinta, peso: 600, alfa: q(1) });
        TIENDAS.forEach((t, i) => {
          const qi = ease(tramo(q(1), i / 9, (i + 4) / 9));
          fila(g, mezclar(XT, XS, qi), mezclar(YT + i * H, R.ySplit[i], qi), [t, String(R.unidades[i])], [90, 90], [C.azul, i === 0 ? C.rosa : C.azul], Math.max(0.35, qi));
        });
        for (const gr of R.grupos) g.rect(XS - 5, gr.y0 - H / 2 - 3, 190, gr.filas.length * H + 6, { color: C.tinta2, relleno: false, alfa: 0.5 * q(1), radio: 6 });
      }
      if (paso >= 2) {
        g.texto(XR, 26, `.agg("${e.f}")  → una fila por grupo`, { fuente: 'mono', tam: 13, ancla: 'l', color: C.naranjaT, peso: 600, alfa: q(2) });
        R.grupos.forEach((gr, k) => {
          const qk = ease(tramo(q(2), k / 5, (k + 3) / 5));
          const yd = YT + k * H, yo = gr.y0 + ((gr.filas.length - 1) * H) / 2;
          g.flecha(XS + 188, yo, XR - 6, yd, { color: C.naranja, alfa: 0.55 * qk, ancho: 1.2, punta: 7 });
          fila(g, XR, yd, [gr.t, v(gr.valor)], [90, 90], [C.azul, C.naranja], qk);
        });
        g.texto(XR, YT + 3 * H, 'índice: las tiendas (3 filas)', { tam: 11, ancla: 'l', color: C.tenue, alfa: q(2) });
      }
      if (paso >= 3) {
        const Y4 = YT + 3 * H + 52;
        g.texto(XR, Y4 - 30, `.transform("${e.f}")  → una fila por fila`, { fuente: 'mono', tam: 13, ancla: 'l', color: C.naranjaT, peso: 600, alfa: q(3) });
        TIENDAS.forEach((t, i) => {
          const qi = ease(tramo(q(3), i / 9, (i + 4) / 9));
          g.texto(XR - 8, Y4 + i * H, i, { fuente: 'mono', tam: 10.5, color: C.tenue, ancla: 'r', alfa: qi });
          fila(g, XR, Y4 + i * H, [t, String(R.unidades[i]), v(R.valorDe[t])], [76, 56, 84], [C.azul, i === 0 ? C.rosa : C.azul, C.naranja], qi);
        });
        g.texto(XR, Y4 + 6 * H + 2, 'mismo índice que ventas (0…5):', { tam: 11, ancla: 'l', color: C.tenue, alfa: q(3) });
        g.texto(XR, Y4 + 6 * H + 18, 'se puede añadir como columna', { tam: 11, ancla: 'l', color: C.tenue, alfa: q(3) });
      }
    });
  }
  const control = pasos(cuerpo, {
    narraciones: [
      '<b>Paso 1. La tabla.</b> Seis ventas de tres tiendas, en formato largo: una fila por venta. La fila 0 (rosa) la puedes cambiar con el deslizador.',
      '<b>Paso 2. Dividir.</b> <code>groupby("tienda")</code> reparte las filas en grupos según la clave. Todavía no calcula nada; las tiendas salen ordenadas.',
      () => `<b>Paso 3. Aplicar y combinar con <code>agg</code>.</b> Cada grupo se reduce a <b>un</b> valor: el resultado tiene una fila por tienda. Es la respuesta a «¿cuánto vendió cada tienda?».`,
      () => `<b>Paso 4. <code>transform</code>.</b> El mismo cálculo, pero el valor del grupo vuelve a <b>cada fila original</b>. Responde «¿cuánto pesa esta venta dentro de su tienda?»: <code>ventas["unidades"] / g.transform("sum")</code>. Es el <i>broadcasting</i> de NumPy con grupos de tamaño variable.`,
    ],
    dibujar, duracion: 1500,
  });
  const m = mandos(cuerpo);
  selector(m, { nombre: 'función', opciones: [['sum', 'sum'], ['mean', 'mean'], ['max', 'max']], valor: e.f, alCambiar: (x) => { e.f = x; control.refrescar(); } });
  deslizador(m, { nombre: 'unidades de la fila 0', min: 0, max: 20, valor: e.u0, formato: String, alCambiar: (x) => { e.u0 = x; control.refrescar(); } });
}
