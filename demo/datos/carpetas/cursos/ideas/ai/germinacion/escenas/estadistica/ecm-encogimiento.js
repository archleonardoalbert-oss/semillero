// Conferencia 1: el estimador encogido c·X̄ de una media. A la izquierda, su distribución muestral (y 40
// estimaciones simuladas); a la derecha, sesgo², varianza y ECM en función de c. Se arrastra c.
export default (S) => {
  const MU = 1;
  const PL = S.plano({ x: 40, y: 60, w: 370, h: 270 }, { t: [-1.5, 3.5], y: [0, 2.2] });
  const normal = (x, m, s) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
  // 40 normales estándar deterministas (Box-Muller sobre S.azar).
  const Z = Array.from({ length: 40 }, (_, i) => {
    const u1 = Math.max(1e-6, S.azar(2 * i + 11)), u2 = S.azar(2 * i + 12);
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  });
  const JIT = Z.map((_, i) => 0.05 + 0.13 * S.azar(i + 700));

  return S.definirEscena({
    alto: 430,
    entradas: [
      { id: 'c', tipo: 'deslizador', etiqueta: 'c', valor: 1, min: 0, max: 1.3, paso: 0.01 },
      { id: 'n', tipo: 'deslizador', etiqueta: 'n', valor: 10, min: 1, max: 60, paso: 1 },
      { id: 's', tipo: 'deslizador', etiqueta: '\\sigma', valor: 2, min: 0.5, max: 4, paso: 0.1 },
    ],
    preparar: (e) => {
      const se = e.s / Math.sqrt(e.n);
      const ses2 = (c) => (c - 1) ** 2 * MU * MU, vari = (c) => (c * se) ** 2, ecm = (c) => ses2(c) + vari(c);
      const ymax = Math.max(1, ecm(1.3), ecm(0)) * 1.1;
      const PR = S.plano({ x: 480, y: 60, w: 240, h: 270 }, { t: [0, 1.3], y: [0, ymax] });
      const cEst = (MU * MU) / (MU * MU + se * se);
      return { e, se, ses2, vari, ecm, PR, cEst };
    },
    pasos: 4,
    duracion: [2000, 1800, 1800, 1600],
    leyenda: { cian: 'distribución de c·X̄', ambar: 'su media E[c·X̄]', verde: 'el valor verdadero μ', ciruela: 'tu elección de c' },
    dibujar(g, c, { paso, p }) {
      const q = (i) => S.ease(paso > i ? 1 : paso === i ? p : 0);
      const { e, se, PR } = c;
      // ---- Panel izquierdo: distribución muestral ----
      S.panel(g, { x: 20, y: 22, w: 410, h: 340 }, '\\text{distribución muestral de } \\hat\\theta = c\\,\\bar X', { clave: 'pl' });
      S.ejes(g, PL, { t: '\\hat\\theta', y: '', clave: 'ejl', numeros: true, marcasY: [] });
      const cc = paso >= 1 ? S.mezclar(1, e.c, q(1)) : 1;
      const sd = Math.max(1e-3, cc * se);
      // la de X̄ (c = 1) queda como fantasma cuando ya se ha encogido
      if (paso >= 1) S.grafica(g, PL, (x) => normal(x, MU, se), { color: 'tenue', ancho: 1.4, alfa: 0.6 });
      g.recortar(PL.caja, () => S.grafica(g, PL, (x) => normal(x, cc * MU, sd), { p: q(0), color: 'cian', n: 400 }));
      // las 40 estimaciones simuladas caen sobre el eje
      Z.forEach((z, i) => {
        const a = S.tramo(q(0), i / 50, i / 50 + 0.25);
        if (a <= 0) return;
        const x = cc * (MU + se * z);
        if (x < PL.vista.t[0] || x > PL.vista.t[1]) return;
        g.circulo(PL.X(x), PL.Y(JIT[i]) - (1 - a) * 40, 2.6, { color: 'cian', alfa: 0.75 * a });
      });
      // valor verdadero
      g.linea([[PL.X(MU), PL.caja.y], [PL.X(MU), PL.caja.y + PL.caja.h]], { color: 'verde', ancho: 1.6, guion: [5, 4], alfa: q(0) });
      g.tex('mu', PL.X(MU) + 6, PL.caja.y + 8, '\\mu', { color: 'verde', tam: 15, ancla: 'l', alfa: q(0) });
      if (paso >= 1) {
        const m = cc * MU, y = PL.caja.y + 40;
        g.linea([[PL.X(m), PL.caja.y + 30], [PL.X(m), PL.caja.y + PL.caja.h]], { color: 'ambar', ancho: 1.6, alfa: q(1) });
        if (Math.abs(PL.X(MU) - PL.X(m)) > 6) g.flecha(PL.X(MU), y, PL.X(m), y, { color: 'ambar', ancho: 2, alfa: q(1), punta: 7 });
        g.tex('sesgo', (PL.X(MU) + PL.X(m)) / 2, y - 14, `\\text{sesgo} = (c-1)\\mu = ${((cc - 1) * MU).toFixed(2)}`, { color: 'ambar', tam: 13, alfa: q(1) });
      }
      g.tex('se', PL.caja.x + PL.caja.w - 4, PL.caja.y + 70, `\\operatorname{sd}(\\hat\\theta) = c\\,\\sigma/\\sqrt n = ${sd.toFixed(3)}`, { color: 'cian', tam: 13, ancla: 'r', alfa: q(0) });

      // ---- Panel derecho: sesgo², varianza y ECM frente a c ----
      if (paso < 2) return;
      S.panel(g, { x: 450, y: 22, w: 290, h: 340 }, '\\text{error en función de } c', { clave: 'pr', p: q(2) });
      S.ejes(g, PR, { t: 'c', y: '', clave: 'ejr', p: q(2), marcasT: [0, 0.5, 1] });
      g.recortar(PR.caja, () => {
        S.grafica(g, PR, c.ses2, { p: q(2), color: 'ambar', ancho: 2 });
        S.grafica(g, PR, c.vari, { p: q(2), color: 'violeta', ancho: 2 });
      });
      g.tex('l-s', PR.X(0.08), PR.Y(c.ses2(0.08)) - 12, '(c-1)^2\\mu^2', { color: 'ambar', tam: 13, ancla: 'l', alfa: q(2) });
      g.tex('l-v', PR.X(1.25), PR.Y(c.vari(1.25)) - 14, 'c^2\\sigma^2/n', { color: 'violeta', tam: 13, ancla: 'r', alfa: q(2) });
      if (paso < 3) return;
      g.recortar(PR.caja, () => S.grafica(g, PR, c.ecm, { p: q(3), color: 'cian', ancho: 2.8 }));
      const xs = PR.X(c.cEst), ys = PR.Y(c.ecm(c.cEst));
      S.punto(g, xs, ys, { color: 'verde', r: 5, alfa: q(3) });
      g.tex('cest', xs, ys + 18, `c^* = ${c.cEst.toFixed(2)}`, { color: 'verde', tam: 13, alfa: q(3) });
      const xc = PR.X(e.c), yc = PR.Y(c.ecm(e.c));
      g.linea([[xc, PR.caja.y + PR.caja.h], [xc, yc]], { color: 'ciruela', ancho: 1.4, guion: [4, 4], alfa: q(3) });
      g.tex('ecm', 450 + 145, 385, `\\mathrm{ECM}(c) = ${c.ses2(e.c).toFixed(3)} + ${c.vari(e.c).toFixed(3)} = ${c.ecm(e.c).toFixed(3)}`, { color: 'texto', tam: 14, alfa: q(3) });
      g.tex('ecm1', 225, 385, `\\mathrm{ECM}(c{=}1) = \\sigma^2/n = ${(se * se).toFixed(3)}`, { color: 'texto2', tam: 14, alfa: q(3) });
    },
    asas: (c, paso) => (paso >= 3 ? [{
      id: 'c', x: c.PR.X(c.e.c), y: c.PR.Y(c.ecm(c.e.c)), color: 'ciruela',
      mover: (x) => ({ c: Math.min(1.3, Math.max(0, Math.round(c.PR.T(x) * 100) / 100)) }),
    }] : []),
  });
};
