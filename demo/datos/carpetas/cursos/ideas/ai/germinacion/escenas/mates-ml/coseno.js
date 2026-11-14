// Conferencia 1: producto escalar, proyección, ángulo y similitud del coseno de dos vectores arrastrables.
export default (S) => {
  const P = S.plano({ x: 30, y: 25, w: 420, h: 370 }, { t: [-3.5, 5.5], y: [-3.2, 4.73] });
  const f2 = (v) => (Math.abs(v) < 0.005 ? '0.00' : v.toFixed(2));
  return S.definirEscena({
    alto: 420,
    entradas: [
      { id: 'ax', tipo: 'deslizador', etiqueta: 'a_1', valor: 4, min: -3, max: 5, paso: 0.1 },
      { id: 'ay', tipo: 'deslizador', etiqueta: 'a_2', valor: 1, min: -3, max: 4.5, paso: 0.1 },
      { id: 'bx', tipo: 'deslizador', etiqueta: 'b_1', valor: 1.5, min: -3, max: 5, paso: 0.1 },
      { id: 'by', tipo: 'deslizador', etiqueta: 'b_2', valor: 3, min: -3, max: 4.5, paso: 0.1 },
    ],
    validar: (e) => (Math.hypot(e.ax, e.ay) < 0.2 || Math.hypot(e.bx, e.by) < 0.2 ? 'Ningún vector puede ser (casi) nulo: el coseno no está definido.' : null),
    preparar: (e) => {
      const a = [e.ax, e.ay], b = [e.bx, e.by];
      const na = Math.hypot(...a), nb = Math.hypot(...b), dot = a[0] * b[0] + a[1] * b[1];
      const cos = dot / (na * nb), cruz = a[0] * b[1] - a[1] * b[0];
      const theta = Math.atan2(cruz, dot); // ángulo con signo de a hacia b
      const k = dot / (na * na);
      return { e, a, b, na, nb, dot, cos, theta, proj: [k * a[0], k * a[1]], k };
    },
    pasos: 4,
    duracion: [1500, 1800, 1600, 2000],
    leyenda: (paso) => ({
      cian: 'el vector a', violeta: 'el vector b',
      ...(paso >= 1 ? { ambar: 'la proyección de b sobre la recta de a' } : {}),
      ...(paso >= 3 ? { verde: 'los vectores normalizados (longitud 1)' } : {}),
    }),
    dibujar(g, c, { paso, p }) {
      const q = (i) => S.ease(paso > i ? 1 : paso === i ? p : 0);
      const O = [P.X(0), P.Y(0)];
      const px = (v) => [P.X(v[0]), P.Y(v[1])];
      S.ejes(g, P, { t: 'x_1', y: 'x_2' });
      const q0 = q(0), q1 = q(1), q2 = q(2), q3 = q(3);
      const atenuar = 1 - 0.55 * q3;

      // Paso 1: los dos vectores
      const A = px([c.a[0] * q0, c.a[1] * q0]), B = px([c.b[0] * q0, c.b[1] * q0]);
      g.flecha(O[0], O[1], A[0], A[1], { color: 'cian', ancho: 3, brillo: 6, alfa: atenuar, punta: 11 });
      g.flecha(O[0], O[1], B[0], B[1], { color: 'violeta', ancho: 3, brillo: 6, alfa: atenuar, punta: 11 });
      if (q0 > 0.5) {
        g.tex('lab-a', A[0] + 12, A[1] - 10, 'a', { color: 'cian', tam: 18, alfa: atenuar });
        g.tex('lab-b', B[0] + 12, B[1] - 10, 'b', { color: 'violeta', tam: 18, alfa: atenuar });
      }

      // Paso 2: proyección de b sobre la recta de a
      if (q1 > 0) {
        const ua = [c.a[0] / c.na, c.a[1] / c.na], L = 12;
        g.recortar(P.caja, () => g.linea([px([-L * ua[0], -L * ua[1]]), px([L * ua[0], L * ua[1]])], { color: 'tenue', ancho: 1, alfa: 0.6 * q1, guion: [5, 6] }));
        const pie = px([c.proj[0] * q1, c.proj[1] * q1]);
        g.linea([B, px(c.proj)], { color: 'ambar', ancho: 1.4, alfa: 0.8 * q1, guion: [4, 4] });
        g.linea([O, pie], { color: 'ambar', ancho: 5, alfa: 0.85 * q1, brillo: 6 });
        S.punto(g, ...px(c.proj), { color: 'ambar', r: 4, alfa: q1 });
        // marca de ángulo recto en el pie de la perpendicular
        const nb = Math.hypot(c.b[0] - c.proj[0], c.b[1] - c.proj[1]);
        if (nb > 0.15) {
          const s = 0.22, n = [(c.b[0] - c.proj[0]) / nb, (c.b[1] - c.proj[1]) / nb], d = c.k >= 0 ? -1 : 1;
          const p1 = [c.proj[0] + d * s * ua[0], c.proj[1] + d * s * ua[1]];
          g.linea([px(p1), px([p1[0] + s * n[0], p1[1] + s * n[1]]), px([c.proj[0] + s * n[0], c.proj[1] + s * n[1]])], { color: 'ambar', ancho: 1.2, alfa: 0.8 * q1 });
        }
      }

      // Paso 3: el ángulo θ
      if (q2 > 0) {
        const r = 34, a0 = Math.atan2(c.a[1], c.a[0]), pts = [];
        for (let i = 0; i <= 48; i++) {
          const phi = a0 + c.theta * q2 * (i / 48);
          pts.push([O[0] + r * Math.cos(phi), O[1] - r * Math.sin(phi)]);
        }
        g.linea(pts, { color: 'texto', ancho: 2, alfa: 0.9 });
        const mid = a0 + c.theta / 2;
        g.tex('lab-th', O[0] + (r + 16) * Math.cos(mid), O[1] - (r + 16) * Math.sin(mid), '\\theta', { color: 'texto', tam: 16, alfa: q2 });
      }

      // Paso 4: normalizar: los dos vectores pasan a longitud 1; el coseno no cambia
      if (q3 > 0) {
        const cr = [];
        for (let i = 0; i <= 80; i++) cr.push(px([Math.cos((2 * Math.PI * i) / 80), Math.sin((2 * Math.PI * i) / 80)]));
        g.linea(cr, { color: 'verde', ancho: 1.2, alfa: 0.5 * q3, guion: [4, 5] });
        const ea = S.mezclar(1, 1 / c.na, q3), eb = S.mezclar(1, 1 / c.nb, q3);
        const Ah = px([c.a[0] * ea, c.a[1] * ea]), Bh = px([c.b[0] * eb, c.b[1] * eb]);
        g.flecha(O[0], O[1], Ah[0], Ah[1], { color: 'verde', ancho: 3, brillo: 6, punta: 10, alfa: q3 });
        g.flecha(O[0], O[1], Bh[0], Bh[1], { color: 'verde', ancho: 3, brillo: 6, punta: 10, alfa: q3 });
        g.linea([Ah, Bh], { color: 'verde', ancho: 1.6, alfa: 0.9 * q3, guion: [3, 3] });
        g.tex('lab-ah', Ah[0] + 10, Ah[1] + 12, '\\hat a', { color: 'verde', tam: 15, alfa: q3 });
        g.tex('lab-bh', Bh[0] - 12, Bh[1] - 10, '\\hat b', { color: 'verde', tam: 15, alfa: q3 });
      }

      // Panel de números (siempre coherente con lo que ya se ha narrado)
      const x0 = 470;
      S.panel(g, { x: 462, y: 25, w: 290, h: 370 }, '\\text{Los números}', { clave: 'pan' });
      if (q0 > 0) {
        g.tex('t-na', x0, 62, `\\|a\\|_2 = ${f2(c.na)}`, { color: 'cian', tam: 16, ancla: 'l', alfa: q0 });
        g.tex('t-nb', x0, 90, `\\|b\\|_2 = ${f2(c.nb)}`, { color: 'violeta', tam: 16, ancla: 'l', alfa: q0 });
        g.tex('t-l1', x0, 118, `\\|a\\|_1 = ${f2(Math.abs(c.a[0]) + Math.abs(c.a[1]))},\\ \\|a\\|_\\infty = ${f2(Math.max(Math.abs(c.a[0]), Math.abs(c.a[1])))}`, { color: 'texto2', tam: 14, ancla: 'l', alfa: q0 });
      }
      if (q1 > 0) {
        g.tex('t-dot', x0, 156, `a\\cdot b = a_1b_1 + a_2b_2 = ${f2(c.dot)}`, { color: 'texto', tam: 15, ancla: 'l', alfa: q1 });
        g.tex('t-pr', x0, 186, `\\tfrac{a\\cdot b}{\\|a\\|} = ${f2(c.dot / c.na)}\\ \\text{(con signo)}`, { color: 'ambar', tam: 15, ancla: 'l', alfa: q1 });
      }
      if (q2 > 0) {
        g.tex('t-cos', x0, 228, `\\cos\\theta = \\dfrac{a\\cdot b}{\\|a\\|\\,\\|b\\|} = ${f2(c.cos)}`, { color: 'texto', tam: 16, ancla: 'l', alfa: q2 });
        g.tex('t-th', x0, 268, `\\theta = ${(Math.abs(c.theta) * 180 / Math.PI).toFixed(1)}^\\circ`, { color: 'texto', tam: 16, ancla: 'l', alfa: q2 });
      }
      if (q3 > 0) {
        g.tex('t-un', x0, 308, `\\hat a\\cdot\\hat b = \\cos\\theta = ${f2(c.cos)}`, { color: 'verde', tam: 15, ancla: 'l', alfa: q3 });
        g.tex('t-ch', x0, 344, `\\|\\hat a-\\hat b\\| = \\sqrt{2-2\\cos\\theta} = ${f2(Math.sqrt(Math.max(0, 2 - 2 * c.cos)))}`, { color: 'verde', tam: 15, ancla: 'l', alfa: q3 });
      }
    },
    asas: (c) => [
      { id: 'a', x: P.X(c.a[0]), y: P.Y(c.a[1]), color: 'ciruela', mover: (x, y) => ({ ax: Math.round(Math.min(5, Math.max(-3, P.T(x))) * 10) / 10, ay: Math.round(Math.min(4.5, Math.max(-3, P.V(y))) * 10) / 10 }) },
      { id: 'b', x: P.X(c.b[0]), y: P.Y(c.b[1]), color: 'ciruela', mover: (x, y) => ({ bx: Math.round(Math.min(5, Math.max(-3, P.T(x))) * 10) / 10, by: Math.round(Math.min(4.5, Math.max(-3, P.V(y))) * 10) / 10 }) },
    ],
  });
};
