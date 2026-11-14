// Conferencia 2: una rebanada es una vista (mismo búfer, otro desplazamiento y otro paso);
// el indexado con una lista crea un búfer nuevo (copia).
export default (S) => {
  const N = 12, W = 50, X0 = 80;
  const Yb = 100, Yv = 250, Yc = 400;          // filas: búfer de a, vista b, copia c
  const cx = (i) => X0 + i * W + W / 2;
  const q = (paso, p, i) => (paso > i ? 1 : paso === i ? S.ease(p) : 0);
  const LISTA = [1, 3, 5];

  function celda(g, x, y, valor, { color = 'cian', alfa = 1, resaltar = 0 } = {}) {
    g.rect(x - W / 2 + 2, y - 18, W - 4, 36, { color, alfa: alfa * (0.16 + 0.35 * resaltar), radio: 4 });
    g.rect(x - W / 2 + 2, y - 18, W - 4, 36, { color, alfa, relleno: false, ancho: 1.5, radio: 4 });
    g.texto(x, y, String(valor), { color: 'texto', alfa, tam: 15 });
  }

  return S.definirEscena({
    alto: 470,
    entradas: [
      { id: 'inicio', tipo: 'deslizador', etiqueta: '\\text{inicio}', valor: 0, min: 0, max: 5, paso: 1 },
      { id: 'paso', tipo: 'deslizador', etiqueta: '\\text{paso}', valor: 2, min: 1, max: 4, paso: 1 },
    ],
    preparar: (e) => {
      const ind = [];
      for (let i = e.inicio; i < N; i += e.paso) ind.push(i);
      return { e, ind };
    },
    pasos: 4,
    duracion: [1400, 2200, 1600, 2400],
    leyenda: { cian: 'búfer de a', ciruela: 'vista b = a[inicio::paso]', ambar: 'copia c = a[[1, 3, 5]]' },
    dibujar(g, c, { paso, p }) {
      const { e, ind } = c;
      const q0 = q(paso, p, 0), q1 = q(paso, p, 1), q2 = q(paso, p, 2), q3 = q(paso, p, 3);
      const escrito = q2 > 0.5;                   // b[0] = 100 ya escrito
      const valorA = (i) => (escrito && i === ind[0] ? 100 : i);

      // Paso 1: el búfer de a
      g.tex('t-a', X0, Yb - 52, String.raw`\texttt{a = np.arange(12)}\quad \text{strides} = (8,)`, { color: 'cian', alfa: q0, tam: 15, ancla: 'l' });
      for (let i = 0; i < N; i++) {
        const qi = S.ease(S.tramo(q0, i / (N + 4), (i + 5) / (N + 4)));
        const marcada = q1 > 0 && ind.includes(i);
        const cambiada = escrito && i === ind[0];
        celda(g, cx(i), Yb, valorA(i), { color: cambiada ? 'ambar' : marcada ? 'ciruela' : 'cian', alfa: qi, resaltar: cambiada ? q2 : 0 });
        g.texto(cx(i), Yb + 30, `${8 * i}`, { color: 'tenue', tam: 10, alfa: qi });
      }
      g.texto(X0 - 10, Yb + 30, 'byte', { color: 'tenue', tam: 10, ancla: 'r', alfa: q0 });

      // Paso 2: la vista b lee el mismo búfer con otro desplazamiento y otro paso
      if (q1 > 0) {
        g.tex('t-b', X0, Yv + 38, String.raw`\texttt{b = a[${e.inicio}::${e.paso}]}\quad \text{desplaz.} = ${e.inicio}\cdot 8 = ${8 * e.inicio},\ \ \text{strides} = (${8 * e.paso},),\ \ \text{forma } (${ind.length},)`,
          { color: 'ciruela', alfa: q1, tam: 15, ancla: 'l' });
        ind.forEach((i, k) => {
          const qk = S.ease(S.tramo(q1, k / (ind.length + 3), (k + 4) / (ind.length + 3)));
          const xb = X0 + k * W + W / 2;
          g.flecha(xb, Yv - 20, cx(i), Yb + 40, { color: 'ciruela', alfa: 0.55 * qk, ancho: 1.4, punta: 7 });
          const cambiada = escrito && k === 0;
          celda(g, xb, Yv, valorA(i), { color: cambiada ? 'ambar' : 'ciruela', alfa: qk, resaltar: cambiada ? q2 : 0 });
        });
      }

      // Paso 3: escribir en la vista escribe en el búfer de a
      if (q2 > 0) {
        g.tex('t-esc', X0, Yv + 68, String.raw`\texttt{b[0] = 100}\ \Rightarrow\ \texttt{a[${ind[0]}]}\text{ vale ahora }100`, { color: 'ambar', alfa: q2, tam: 15, ancla: 'l' });
        g.tex('t-sm1', X0 + 400, Yv + 68, String.raw`\texttt{np.shares\_memory(a, b)} = \texttt{True}`, { color: 'verde', alfa: q2, tam: 14, ancla: 'l' });
      }

      // Paso 4: el indexado avanzado copia en un búfer nuevo
      if (q3 > 0) {
        g.tex('t-c', X0, Yc - 36, String.raw`\texttt{c = a[[1, 3, 5]]}\ \text{ → búfer nuevo};\ \ \texttt{c[0] = -1}`, { color: 'ambar', alfa: q3, tam: 15, ancla: 'l' });
        LISTA.forEach((i, k) => {
          const qk = S.ease(S.tramo(q3, k / 6, (k + 3) / 6));
          const xc = X0 + k * W + W / 2;
          // la copia viaja desde la celda del búfer hasta su sitio nuevo
          const x = S.mezclar(cx(i), xc, qk), y = S.mezclar(Yb, Yc + 10, qk);
          const fin = q3 > 0.85 && k === 0;
          celda(g, x, y, fin ? -1 : valorA(i), { color: 'ambar', alfa: Math.min(1, 0.4 + qk), resaltar: fin ? 1 : 0 });
        });
        g.rect(X0 - 4, Yc - 12, 3 * W + 8, 44, { color: 'ambar', relleno: false, alfa: 0.5 * q3, ancho: 1, radio: 6 });
        g.texto(X0 + 3 * W + 14, Yc + 10, 'búfer propio: a no cambia', { color: 'texto2', tam: 12, ancla: 'l', alfa: q3 });
        g.tex('t-sm2', X0 + 400, Yc + 10, String.raw`\texttt{np.shares\_memory(a, c)} = \texttt{False}`, { color: 'rojo', alfa: q3, tam: 14, ancla: 'l' });
      }
    },
  });
};
