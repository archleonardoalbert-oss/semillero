// Probabilidad condicional como «restringir el universo»: Ω es un cuadrado de área 1, B una franja vertical de
// anchura P(B) y A ocupa una altura P(A|B) dentro de B y P(A|¬B) fuera. Al condicionar, B se estira hasta ser
// el nuevo universo y la fracción de A dentro de él es P(A|B).
export default (S) => {
  const L = 300, X0 = 50, Y0 = 60;          // cuadrado Ω
  const XD = 420, YD = 60;                  // universo nuevo (B estirado)
  const n2 = (v) => v.toFixed(2).replace('.', '{,}');
  return S.definirEscena({
    alto: 430,
    entradas: [
      { id: 'pB', tipo: 'deslizador', etiqueta: 'P(B)', valor: 0.4, min: 0.05, max: 0.95, paso: 0.01 },
      { id: 'aB', tipo: 'deslizador', etiqueta: 'P(A\\mid B)', valor: 0.7, min: 0, max: 1, paso: 0.01 },
      { id: 'aNB', tipo: 'deslizador', etiqueta: 'P(A\\mid \\neg B)', valor: 0.2, min: 0, max: 1, paso: 0.01 },
    ],
    preparar: (e) => {
      const pAB = e.pB * e.aB, pA = pAB + (1 - e.pB) * e.aNB;
      return { e, pAB, pA };
    },
    pasos: 4,
    duracion: [1400, 1400, 1400, 2200],
    leyenda: { cian: 'el suceso B (lo que sabemos)', ambar: 'el suceso A', ciruela: 'lo que puedes arrastrar' },
    dibujar(g, c, { paso, p }) {
      const { e } = c, q = (i) => (paso > i ? 1 : paso === i ? S.ease(p) : 0);
      const wB = e.pB * L, hA1 = e.aB * L, hA2 = e.aNB * L;
      const fuera = 1 - 0.65 * q(1);        // lo que queda fuera de B se apaga al condicionar
      // Ω
      g.rect(X0, Y0, L, L, { color: 'muyTenue', alfa: 0.6 });
      g.rect(X0, Y0, L, L, { color: 'texto2', relleno: false, ancho: 1.4 });
      g.tex('omega', X0 + L - 12, Y0 + 14, '\\Omega', { color: 'texto2', tam: 18 });
      g.tex('area1', X0 + L / 2, Y0 + L + 22, '\\text{área total } = P(\\Omega) = 1', { color: 'texto2', tam: 14 });
      // A (paso 0): dos rectángulos inferiores
      const a0 = q(0);
      g.rect(X0 + wB, Y0 + L - hA2, L - wB, hA2, { color: 'ambar', alfa: 0.28 * a0 * fuera });
      g.rect(X0, Y0 + L - hA1, wB, hA1, { color: 'ambar', alfa: 0.28 * a0 * (1 - 0.5 * q(2)) });
      g.linea([[X0, Y0 + L - hA1], [X0 + wB, Y0 + L - hA1], [X0 + wB, Y0 + L - hA2], [X0 + L, Y0 + L - hA2]],
        { color: 'ambar', ancho: 2, alfa: a0 * (0.4 + 0.6 * fuera) });
      g.tex('pA', X0 + L + 12, Y0 + L - Math.max(hA2, 18) / 2, `P(A)=${n2(c.pA)}`, { color: 'ambar', tam: 14, ancla: 'l', alfa: a0 * (1 - q(3)) });
      // B (paso 1)
      const b1 = q(1);
      g.rect(X0, Y0, wB, L, { color: 'cian', alfa: 0.14 * b1 });
      g.rect(X0, Y0, wB, L, { color: 'cian', relleno: false, ancho: 2.4, alfa: b1 });
      g.tex('B', X0 + wB / 2, Y0 + 16, 'B', { color: 'cian', tam: 18, alfa: b1 });
      g.tex('pB', X0 + wB / 2, Y0 - 18, `P(B)=${n2(e.pB)}`, { color: 'cian', tam: 14, alfa: b1 });
      g.tex('noB', X0 + wB + (L - wB) / 2, Y0 + 16, '\\neg B', { color: 'texto2', tam: 16, alfa: b1 * 0.8 });
      // A ∩ B (paso 2)
      const c2 = q(2);
      g.rect(X0, Y0 + L - hA1, wB, hA1, { color: 'ambar', alfa: 0.6 * c2 });
      if (c2 > 0) g.tex('AB', X0 + wB / 2, Y0 + L - Math.max(hA1, 22) / 2, 'A\\cap B', { color: 'blanco', tam: 15, alfa: c2 });
      g.tex('pAB', XD, Y0 + L + 22, `P(A\\cap B)=P(B)\\,P(A\\mid B)=${n2(e.pB)}\\cdot${n2(e.aB)}=${n2(c.pAB)}`,
        { color: 'ambar', tam: 14, ancla: 'l', alfa: c2 });
      // Universo nuevo (paso 3): B se estira hasta ocupar un cuadrado
      const d3 = q(3);
      if (d3 > 0) {
        const x = S.mezclar(X0, XD, d3), w = S.mezclar(wB, L, d3);
        g.rect(x, YD, w, L, { color: 'cian', alfa: 0.12 });
        g.rect(x, YD, w, L, { color: 'cian', relleno: false, ancho: 2.4 });
        g.rect(x, YD + L - hA1, w, hA1, { color: 'ambar', alfa: 0.6 });
        g.tex('nuevo', XD + L / 2, YD - 18, '\\text{nuevo universo: } B\\ (\\text{área } 1)', { color: 'cian', tam: 14, alfa: d3 });
        g.tex('frac', XD + L / 2, YD + L - Math.max(hA1, 30) / 2,
          `P(A\\mid B)=\\dfrac{P(A\\cap B)}{P(B)}=\\dfrac{${n2(c.pAB)}}{${n2(e.pB)}}=${n2(e.aB)}`,
          { color: 'blanco', tam: 15, alfa: d3, fondo: true });
        g.tex('comp', XD + L / 2, YD + (L - hA1) / 2,
          `P(A)=${n2(c.pA)}\\ \\to\\ P(A\\mid B)=${n2(e.aB)}`, { color: 'texto', tam: 14, alfa: d3 * (hA1 < L - 40 ? 1 : 0) });
      } else if (paso < 3) {
        g.tex('espera', XD + L / 2, YD + L / 2, '\\text{(paso 4: condicionar a } B)', { color: 'tenue', tam: 13 });
      }
    },
    asas: (c, paso) => {
      const { e } = c;
      const r = [{ id: 'pB', x: X0 + e.pB * L, y: Y0 + L / 2, color: 'ciruela', mover: (x) => ({ pB: Math.min(0.95, Math.max(0.05, (x - X0) / L)) }) }];
      r.push({ id: 'aB', x: X0 + (e.pB * L) / 2, y: Y0 + L - e.aB * L, color: 'ciruela', mover: (_x, y) => ({ aB: Math.min(1, Math.max(0, (Y0 + L - y) / L)) }) });
      r.push({ id: 'aNB', x: X0 + e.pB * L + ((1 - e.pB) * L) / 2, y: Y0 + L - e.aNB * L, color: 'ciruela', mover: (_x, y) => ({ aNB: Math.min(1, Math.max(0, (Y0 + L - y) / L)) }) });
      return paso >= 0 ? r : [];
    },
  });
};
