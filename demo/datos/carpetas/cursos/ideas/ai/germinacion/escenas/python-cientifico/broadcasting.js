// Conferencia 3: las cuatro reglas del broadcasting aplicadas a A + B.
// Paso 1: las formas. Paso 2: alinear por la derecha y comparar eje a eje.
// Paso 3: estirar los ejes de longitud 1 (paso 0, sin copiar). Paso 4: el resultado o el error.
export default (S) => {
  const L = 34;                                  // lado de una celda
  const XA = 40, XB = 270, XR = 520, Y0 = 92;
  const q = (paso, p, i) => (paso > i ? 1 : paso === i ? S.ease(p) : 0);
  const valA = (i, j) => 10 * i + j;
  const valB = (i, j) => 100 * (4 * i + j);

  function celda(g, x, y, v, { color, alfa = 1, fantasma = false }) {
    if (alfa <= 0) return;
    g.rect(x + 1, y + 1, L - 2, L - 2, { color, alfa: alfa * (fantasma ? 0.07 : 0.2), radio: 3 });
    g.rect(x + 1, y + 1, L - 2, L - 2, { color, alfa: alfa * (fantasma ? 0.45 : 1), relleno: false, ancho: fantasma ? 1 : 1.4, radio: 3 });
    g.texto(x + L / 2, y + L / 2, String(v), { color: fantasma ? 'texto2' : 'texto', tam: 11, alfa: alfa * (fantasma ? 0.7 : 1) });
  }
  const tupla = (s) => (s.length === 1 ? `(${s[0]},)` : `(${s.join(', ')})`);

  return S.definirEscena({
    alto: 450,
    entradas: [
      { id: 'a0', tipo: 'deslizador', etiqueta: 'A_0', valor: 3, min: 1, max: 4, paso: 1 },
      { id: 'a1', tipo: 'deslizador', etiqueta: 'A_1', valor: 1, min: 1, max: 4, paso: 1 },
      { id: 'nb', tipo: 'deslizador', etiqueta: '\\text{ejes de }B', valor: 1, min: 1, max: 2, paso: 1 },
      { id: 'b0', tipo: 'deslizador', etiqueta: 'B_0', valor: 1, min: 1, max: 4, paso: 1 },
      { id: 'b1', tipo: 'deslizador', etiqueta: 'B_1', valor: 4, min: 1, max: 4, paso: 1 },
    ],
    preparar: (e) => {
      const fa = [e.a0, e.a1];
      const fb = e.nb === 1 ? [e.b1] : [e.b0, e.b1];          // B 1D usa la longitud B_1
      const fbp = fb.length === 1 ? [1, fb[0]] : fb;           // regla 1: unos por la izquierda
      const ok = [0, 1].map((k) => fa[k] === fbp[k] || fa[k] === 1 || fbp[k] === 1);
      const compatible = ok[0] && ok[1];
      const fr = [0, 1].map((k) => Math.max(fa[k], fbp[k]));
      return { e, fa, fb, fbp, ok, compatible, fr };
    },
    pasos: 4,
    duracion: [1300, 2000, 2000, 1800],
    leyenda: { cian: 'A', ciruela: 'B (lo que eliges)', ambar: 'el resultado A + B', verde: 'eje compatible', rojo: 'eje incompatible' },
    dibujar(g, c, { paso, p }) {
      const { fa, fb, fbp, ok, compatible, fr } = c;
      const q0 = q(paso, p, 0), q1 = q(paso, p, 1), q2 = q(paso, p, 2), q3 = q(paso, p, 3);

      // Paso 1: las dos formas
      g.tex('tA', XA, Y0 - 34, String.raw`A:\ ${tupla(fa)}`, { color: 'cian', tam: 17, ancla: 'l', alfa: q0 });
      g.tex('tB', XB, Y0 - 34, String.raw`B:\ ${tupla(fb)}`, { color: 'ciruela', tam: 17, ancla: 'l', alfa: q0 });
      g.texto(XB - 42, Y0 + 60, '+', { color: 'texto', tam: 26, alfa: q0 });
      // A, y su estiramiento en el paso 3
      const est = compatible ? q2 : 0;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const orig = i < fa[0] && j < fa[1];
        const dentro = i < fr[0] && j < fr[1];
        if (orig) celda(g, XA + j * L, Y0 + i * L, valA(i, j), { color: 'cian', alfa: q0 });
        else if (dentro && est > 0) celda(g, XA + j * L, Y0 + i * L, valA(fa[0] === 1 ? 0 : i, fa[1] === 1 ? 0 : j), { color: 'cian', alfa: est, fantasma: true });
      }
      // B (si es 1D se dibuja como una fila: así queda alineado por la derecha)
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const orig = i < fbp[0] && j < fbp[1];
        const dentro = i < fr[0] && j < fr[1];
        if (orig) celda(g, XB + j * L, Y0 + i * L, valB(i, j), { color: 'ciruela', alfa: q0 });
        else if (dentro && est > 0) celda(g, XB + j * L, Y0 + i * L, valB(fbp[0] === 1 ? 0 : i, fbp[1] === 1 ? 0 : j), { color: 'ciruela', alfa: est, fantasma: true });
      }

      // Paso 2: alinear por la derecha y comparar
      if (q1 > 0) {
        const yT = 270, xc = [470, 560];
        g.texto(300, yT, 'eje', { color: 'texto2', tam: 12, ancla: 'r', alfa: q1 });
        g.texto(300, yT + 28, 'A', { color: 'cian', tam: 13, ancla: 'r', alfa: q1 });
        g.texto(300, yT + 56, fb.length === 1 ? 'B (con un 1 añadido)' : 'B', { color: 'ciruela', tam: 13, ancla: 'r', alfa: q1 });
        [0, 1].forEach((k) => {
          const qk = S.ease(S.tramo(q1, 0.25 * k, 0.5 + 0.25 * k));
          g.texto(xc[k], yT, String(k), { color: 'texto2', tam: 12, alfa: qk });
          g.texto(xc[k], yT + 28, String(fa[k]), { color: 'cian', tam: 15, alfa: qk });
          const relleno = fb.length === 1 && k === 0;
          g.texto(xc[k], yT + 56, String(fbp[k]), { color: relleno ? 'texto2' : 'ciruela', tam: 15, alfa: qk });
          g.texto(xc[k], yT + 86, ok[k] ? '✓' : '✗', { color: ok[k] ? 'verde' : 'rojo', tam: 18, alfa: qk, peso: 700 });
        });
        g.tex('regla', 40, yT + 128, String.raw`\text{Formas alineadas por la derecha; en cada eje: iguales, o una de ellas es }1`, { color: 'texto2', tam: 14, ancla: 'l', alfa: q1 });
      }

      // Paso 3: rótulo del estiramiento
      if (q2 > 0) {
        if (compatible) g.tex('est', 40, Y0 + 4 * L + 22, String.raw`\text{los ejes de longitud 1 se estiran con stride } 0 \text{ (en gris: no se copian)}`, { color: 'texto2', tam: 13, ancla: 'l', alfa: q2 });
        else g.tex('est', 40, Y0 + 4 * L + 22, String.raw`\text{un eje no cumple la regla: no hay forma común}`, { color: 'rojo', tam: 14, ancla: 'l', alfa: q2 });
      }

      // Paso 4: el resultado o el error
      g.texto(XR - 40, Y0 + 60, '=', { color: 'texto', tam: 26, alfa: q3 });
      if (q3 > 0 && compatible) {
        g.tex('tR', XR, Y0 - 34, String.raw`A+B:\ ${tupla(fr)}`, { color: 'ambar', tam: 17, ancla: 'l', alfa: q3 });
        for (let i = 0; i < fr[0]; i++) for (let j = 0; j < fr[1]; j++) {
          const qq = S.ease(S.tramo(q3, (i * fr[1] + j) / (fr[0] * fr[1] + 4), (i * fr[1] + j + 5) / (fr[0] * fr[1] + 4)));
          const v = valA(fa[0] === 1 ? 0 : i, fa[1] === 1 ? 0 : j) + valB(fbp[0] === 1 ? 0 : i, fbp[1] === 1 ? 0 : j);
          celda(g, XR + j * L, Y0 + i * L, v, { color: 'ambar', alfa: qq });
        }
      } else if (q3 > 0) {
        g.tex('tR', XR - 10, Y0 + 40, String.raw`\texttt{ValueError}`, { color: 'rojo', tam: 18, ancla: 'l', alfa: q3 });
        g.texto(XR - 10, Y0 + 76, 'operands could not be', { color: 'rojo', tam: 12, ancla: 'l', alfa: q3 });
        g.texto(XR - 10, Y0 + 94, 'broadcast together', { color: 'rojo', tam: 12, ancla: 'l', alfa: q3 });
      }
    },
  });
};
