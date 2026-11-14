// Conferencia 7: el número de bins de un histograma cambia la historia (dos modos que aparecen o desaparecen).
export default (S) => {
  const N = 400, A = 60, B = 440;
  // Datos deterministas: mezcla de dos normales (Box-Muller sobre S.azar)
  const datos = [];
  for (let i = 0; i < N; i++) {
    const u1 = Math.max(1e-9, S.azar(2 * i + 1)), u2 = S.azar(2 * i + 2);
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    datos.push(i < 0.6 * N ? 180 + 28 * z : 320 + 32 * z);
  }
  const orden = [...datos].sort((a, b) => a - b);
  const cuantil = (p) => orden[Math.floor(p * (N - 1))];
  const iqr = cuantil(0.75) - cuantil(0.25);
  const hFD = 2 * iqr / Math.cbrt(N);
  const binsFD = Math.max(1, Math.round((B - A) / hFD));
  const q = (paso, p, i) => (paso > i ? 1 : paso === i ? S.ease(p) : 0);

  function hist(k) {
    const ancho = (B - A) / k, c = new Array(k).fill(0);
    for (const x of datos) if (x >= A && x < B) c[Math.min(k - 1, Math.floor((x - A) / ancho))]++;
    return { ancho, dens: c.map((n) => n / (N * ancho)) };   // densidad: el área total es 1
  }

  return S.definirEscena({
    alto: 420,
    entradas: [{ id: 'bins', tipo: 'deslizador', etiqueta: '\\texttt{bins}', valor: 4, min: 2, max: 80, paso: 1 }],
    preparar: (e) => {
      const h = hist(e.bins), fd = hist(binsFD);
      const ymax = Math.max(0.012, ...h.dens, ...fd.dens) * 1.1;
      const P = S.plano({ x: 70, y: 50, w: 640, h: 270 }, { t: [A, B], y: [0, ymax] });
      return { e, h, fd, P };
    },
    pasos: 3,
    duracion: [1500, 1600, 1600],
    leyenda: { cian: 'los 400 datos', ciruela: 'histograma con tus bins', ambar: 'regla de Freedman-Diaconis' },
    dibujar(g, c, { paso, p }) {
      const { P, h, fd, e } = c;
      const q0 = q(paso, p, 0), q1 = q(paso, p, 1), q2 = q(paso, p, 2);
      S.ejes(g, P, { t: String.raw`\text{precio (CUP)}`, y: String.raw`\text{densidad}`, p: q0, numeros: false, marcasT: [100, 200, 300, 400], marcasY: [] });
      [100, 200, 300, 400].forEach((v) => g.texto(P.X(v), P.Y(0) + 14, String(v), { color: 'tenue', tam: 11, alfa: q0 }));

      // Paso 1: cada dato como una marca en el eje (alfombra)
      datos.forEach((x, i) => {
        const qi = S.ease(S.tramo(q0, i / (N * 1.25), (i + 0.25 * N) / (N * 1.25)));
        if (qi > 0) g.linea([[P.X(x), P.Y(0) - 2], [P.X(x), P.Y(0) - 12]], { color: 'cian', ancho: 1, alfa: 0.35 * qi });
      });

      // Paso 2: el histograma con los bins elegidos
      if (q1 > 0) h.dens.forEach((d, j) => {
        const x0 = P.X(A + j * h.ancho), x1 = P.X(A + (j + 1) * h.ancho), y = P.Y(d * q1);
        g.rect(x0 + 0.5, y, Math.max(0.5, x1 - x0 - 1), P.Y(0) - y, { color: 'ciruela', alfa: 0.45, radio: 1 });
      });
      if (q1 > 0) {
        const msg = e.bins <= 6 ? '¿una sola joroba? Con pocos bins se pierde la estructura' : e.bins >= 50 ? 'demasiados bins: el ruido parece estructura' : 'se distinguen dos grupos de precios';
        g.tex('b', P.caja.x, P.caja.y + P.caja.h + 44, String.raw`\texttt{bins=${e.bins}}:\ \text{${msg}}`, { color: 'ciruela', tam: 14, ancla: 'l', alfa: q1 });
      }

      // Paso 3: Freedman-Diaconis, como contorno
      if (q2 > 0) {
        const pts = [[P.X(A), P.Y(0)]];
        fd.dens.forEach((d, j) => { pts.push([P.X(A + j * fd.ancho), P.Y(d)]); pts.push([P.X(A + (j + 1) * fd.ancho), P.Y(d)]); });
        pts.push([P.X(B), P.Y(0)]);
        const n = Math.max(2, Math.round(pts.length * q2));
        g.linea(pts.slice(0, n), { color: 'ambar', ancho: 2, alfa: 1 });
        g.tex('fd', P.caja.x, P.caja.y + P.caja.h + 70, String.raw`\text{Freedman-Diaconis: } h = \frac{2\,\mathrm{IQR}}{\sqrt[3]{n}} = ${hFD.toFixed(1)}\ \Rightarrow\ ${binsFD}\ \text{bins}\ \ (\texttt{bins="fd"})`, { color: 'ambar', tam: 14, ancla: 'l', alfa: q2 });
      }
    },
  });
};
