// Conferencia 6: groupby como dividir-aplicar-combinar, y la diferencia entre agg (una fila por grupo)
// y transform (una fila por fila original, con el valor de su grupo).
export default (S) => {
  const TIENDAS = ['Centro', 'Playa', 'Centro', 'Cerro', 'Playa', 'Centro'];
  const ORDEN = ['Centro', 'Cerro', 'Playa'];                 // groupby ordena las claves
  const H = 26, XT = 40, YT = 92, XS = 250, XR = 470;
  const q = (paso, p, i) => (paso > i ? 1 : paso === i ? S.ease(p) : 0);
  const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(2));

  function fila(g, x, y, cols, anchos, { color = 'cian', alfa = 1, resaltar = -1, colorCol = [] } = {}) {
    if (alfa <= 0) return;
    let xx = x;
    cols.forEach((txt, i) => {
      const c = i === resaltar ? 'ciruela' : colorCol[i] ?? 'texto';
      g.rect(xx, y - H / 2 + 2, anchos[i] - 4, H - 4, { color: i === resaltar ? 'ciruela' : colorCol[i] ?? color, alfa: alfa * 0.12, radio: 3 });
      g.texto(xx + 8, y, txt, { color: c, tam: 13, ancla: 'l', alfa });
      xx += anchos[i];
    });
  }

  return S.definirEscena({
    alto: 440,
    entradas: [
      { id: 'f', tipo: 'deslizador', etiqueta: '\\text{función: 0 = sum, 1 = mean}', valor: 0, min: 0, max: 1, paso: 1 },
      { id: 'u', tipo: 'deslizador', etiqueta: '\\text{unidades de la fila 0}', valor: 6, min: 0, max: 12, paso: 1 },
    ],
    preparar: (e) => {
      const unidades = [e.u, 5, 3, 7, 2, 4];
      const grupos = ORDEN.map((t) => ({ t, filas: TIENDAS.map((x, i) => (x === t ? i : -1)).filter((i) => i >= 0) }));
      grupos.forEach((gr) => {
        const vals = gr.filas.map((i) => unidades[i]);
        const suma = vals.reduce((a, b) => a + b, 0);
        gr.valor = e.f === 0 ? suma : suma / vals.length;
      });
      const valorDe = Object.fromEntries(grupos.map((gr) => [gr.t, gr.valor]));
      // posición de cada fila en la vista «dividida»
      const ySplit = [];
      let y = YT;
      grupos.forEach((gr) => { gr.y0 = y; gr.filas.forEach((i) => { ySplit[i] = y; y += H; }); y += 14; });
      return { e, unidades, grupos, valorDe, ySplit, nombre: e.f === 0 ? 'sum' : 'mean' };
    },
    pasos: 4,
    duracion: [1200, 2000, 1800, 2000],
    leyenda: { cian: 'filas de ventas', ciruela: 'la fila que modificas', ambar: 'resultado de la función' },
    dibujar(g, c, { paso, p }) {
      const q0 = q(paso, p, 0), q1 = q(paso, p, 1), q2 = q(paso, p, 2), q3 = q(paso, p, 3);
      const anchos = [90, 90];

      // Paso 1: la tabla original
      g.tex('t1', XT, YT - 42, String.raw`\texttt{ventas}`, { color: 'cian', tam: 15, ancla: 'l', alfa: q0 });
      g.texto(XT + 8, YT - 20, 'tienda', { color: 'texto2', tam: 12, ancla: 'l', alfa: q0 });
      g.texto(XT + 98, YT - 20, 'unidades', { color: 'texto2', tam: 12, ancla: 'l', alfa: q0 });
      TIENDAS.forEach((t, i) => {
        const y = YT + i * H;
        g.texto(XT - 8, y, String(i), { color: 'tenue', tam: 11, ancla: 'r', alfa: q0 });
        fila(g, XT, y, [t, String(c.unidades[i])], anchos, { alfa: q0 * (1 - 0.6 * q1), resaltar: i === 0 ? 1 : -1 });
      });

      // Paso 2: dividir: cada fila viaja a su grupo
      if (q1 > 0) {
        g.tex('t2', XS, YT - 42, String.raw`\texttt{groupby("tienda")}`, { color: 'texto', tam: 15, ancla: 'l', alfa: q1 });
        TIENDAS.forEach((t, i) => {
          const qi = S.ease(S.tramo(q1, i / 9, (i + 4) / 9));
          const x = S.mezclar(XT, XS, qi), y = S.mezclar(YT + i * H, c.ySplit[i], qi);
          fila(g, x, y, [t, String(c.unidades[i])], anchos, { alfa: Math.max(0.3, qi), resaltar: i === 0 ? 1 : -1 });
        });
        c.grupos.forEach((gr) => g.rect(XS - 6, gr.y0 - H / 2 - 2, 188, gr.filas.length * H + 4, { color: 'texto2', relleno: false, alfa: 0.5 * q1, radio: 6 }));
      }

      // Paso 3: agg: una fila por grupo
      if (q2 > 0) {
        g.tex('t3', XR, YT - 42, String.raw`\texttt{.agg("${c.nombre}")}\ \to\ \text{una fila por grupo}`, { color: 'ambar', tam: 15, ancla: 'l', alfa: q2 });
        c.grupos.forEach((gr, k) => {
          const qk = S.ease(S.tramo(q2, k / 5, (k + 3) / 5));
          const yDest = YT + k * H;
          const yOrig = gr.y0 + ((gr.filas.length - 1) * H) / 2;
          g.flecha(XS + 186, yOrig, XR - 8, yDest, { color: 'ambar', alfa: 0.5 * qk, ancho: 1.3, punta: 7 });
          fila(g, XR, yDest, [gr.t, fmt(gr.valor)], anchos, { alfa: qk, colorCol: [undefined, 'ambar'] });
        });
      }

      // Paso 4: transform: el valor del grupo vuelve a cada fila, en el orden original
      if (q3 > 0) {
        const Y4 = YT + 3 * H + 40;
        g.tex('t4', XR, Y4 - 30, String.raw`\texttt{.transform("${c.nombre}")}\ \to\ \text{una fila por fila}`, { color: 'ambar', tam: 15, ancla: 'l', alfa: q3 });
        TIENDAS.forEach((t, i) => {
          const qi = S.ease(S.tramo(q3, i / 9, (i + 4) / 9));
          const y = Y4 + i * H;
          g.texto(XR - 8, y, String(i), { color: 'tenue', tam: 11, ancla: 'r', alfa: qi });
          fila(g, XR, y, [t, String(c.unidades[i]), fmt(c.valorDe[t])], [80, 60, 90], { alfa: qi, resaltar: i === 0 ? 1 : -1, colorCol: [undefined, undefined, 'ambar'] });
        });
        g.texto(XR, Y4 + 6 * H + 4, 'mismo índice que ventas: se puede añadir como columna', { color: 'texto2', tam: 11, ancla: 'l', alfa: q3 });
      }
    },
  });
};
