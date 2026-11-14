// Conferencia 6: resample('W').mean() corta la serie diaria en semanas sin solapamiento;
// rolling(k).mean() desliza una ventana de k días y da un valor por día.
export default (S) => {
  const N = 42;                                    // 6 semanas, empezando en lunes
  const P = S.plano({ x: 70, y: 50, w: 640, h: 260 }, { t: [-0.8, N - 0.2], y: [0, 60] });
  const q = (paso, p, i) => (paso > i ? 1 : paso === i ? S.ease(p) : 0);
  // ventas diarias deterministas: nivel + patrón semanal (más el sábado) + ruido fijo
  const patron = [0.8, 0.85, 0.9, 1.0, 1.15, 1.45, 0.85];
  const v = Array.from({ length: N }, (_, i) => Math.round((22 + 0.25 * i) * patron[i % 7] + 8 * (S.azar(i + 3) - 0.5)));

  return S.definirEscena({
    alto: 420,
    entradas: [
      { id: 'k', tipo: 'deslizador', etiqueta: 'k\\ (\\text{días de la ventana})', valor: 7, min: 2, max: 14, paso: 1 },
      { id: 'dia', tipo: 'deslizador', etiqueta: '\\text{día donde termina la ventana}', valor: 20, min: 1, max: N - 1, paso: 1 },
    ],
    preparar: (e) => {
      const semanas = [];
      for (let s = 0; s < N / 7; s++) {
        const tramo = v.slice(7 * s, 7 * s + 7);
        semanas.push(tramo.reduce((a, b) => a + b, 0) / 7);
      }
      const roll = v.map((_, i) => (i + 1 >= e.k ? v.slice(i + 1 - e.k, i + 1).reduce((a, b) => a + b, 0) / e.k : NaN));
      return { e, semanas, roll };
    },
    pasos: 4,
    duracion: [1600, 2000, 2200, 1400],
    leyenda: { cian: 'ventas diarias', ambar: "resample('W').mean(): una barra por semana", ciruela: 'rolling(k).mean(): un valor por día' },
    asas: (c, paso) => (paso >= 2 ? [{
      id: 'dia', x: P.X(c.e.dia), y: P.Y(4), color: 'ciruela',
      mover: (x) => ({ dia: Math.max(c.e.k - 1, Math.min(N - 1, Math.round(P.T(x)))) }),
    }] : []),
    dibujar(g, c, { paso, p }) {
      const q0 = q(paso, p, 0), q1 = q(paso, p, 1), q2 = q(paso, p, 2), q3 = q(paso, p, 3);
      const { e, semanas, roll } = c;
      S.ejes(g, P, { t: String.raw`\text{día}`, y: String.raw`\text{unidades}`, p: q0, marcasT: [0, 7, 14, 21, 28, 35], marcasY: [0, 20, 40, 60] });

      // Paso 2 (fondo): franjas de las semanas
      if (q1 > 0) for (let s = 0; s < semanas.length; s++) {
        if (s % 2 === 0) S.franja(g, P, 7 * s - 0.5, 7 * s + 6.5, { color: 'ambar', alfa: 0.06 * q1 });
        g.texto(P.X(7 * s + 3), P.caja.y + 12, `semana ${s + 1}`, { color: 'tenue', tam: 10, alfa: q1 });
      }

      // Paso 1: barras diarias
      const ancho = P.sx * 0.62;
      v.forEach((val, i) => {
        const qi = S.ease(S.tramo(q0, i / (N + 10), (i + 10) / (N + 10)));
        const dentro = q2 > 0 && i <= e.dia && i > e.dia - e.k;
        g.rect(P.X(i) - ancho / 2, P.Y(val * qi), ancho, P.Y(0) - P.Y(val * qi), { color: dentro ? 'ciruela' : 'cian', alfa: (dentro ? 0.7 : 0.45) * (qi > 0 ? 1 : 0), radio: 2 });
      });

      // Paso 2: una barra horizontal por semana (resample)
      if (q1 > 0) semanas.forEach((m, s) => {
        const qs = S.ease(S.tramo(q1, s / 8, (s + 3) / 8));
        const x0 = P.X(7 * s - 0.5), x1 = P.X(7 * s + 6.5);
        g.linea([[x0, P.Y(m)], [S.mezclar(x0, x1, qs), P.Y(m)]], { color: 'ambar', ancho: 3, alfa: q3 > 0 ? 1 : qs, brillo: 4 });
      });
      if (q1 > 0) g.tex('rs', P.caja.x + 6, P.caja.y + P.caja.h + 40, String.raw`\texttt{resample("W").mean()}:\ ${semanas.length}\ \text{valores (uno por semana)}`, { color: 'ambar', tam: 14, ancla: 'l', alfa: q1 });

      // Paso 3: la ventana móvil
      if (q2 > 0) {
        const x0 = P.X(e.dia - e.k + 0.5), x1 = P.X(e.dia + 0.5);
        g.rect(x0, P.caja.y + 22, x1 - x0, P.caja.h - 22, { color: 'ciruela', relleno: false, alfa: 0.8 * q2, ancho: 1.6, radio: 4 });
        const r = roll[e.dia];
        if (Number.isFinite(r)) {
          S.punto(g, P.X(e.dia), P.Y(r), { color: 'ciruela', r: 5, halo: true });
          g.tex('rv', x1 + 6, P.Y(r) - 14, String.raw`${r.toFixed(1)}`, { color: 'ciruela', tam: 13, ancla: 'l', alfa: q2 });
        } else {
          g.texto(x1 + 6, P.caja.y + 40, 'NaN: faltan días', { color: 'ciruela', tam: 11, ancla: 'l', alfa: q2 });
        }
        const ts = [], ys = [];
        roll.forEach((y, i) => { if (Number.isFinite(y) && (q3 > 0 || i <= e.dia)) { ts.push(i); ys.push(y); } });
        S.curva(g, P, ts, ys, { p: q3 > 0 ? 1 : q2, color: 'ciruela', ancho: 2.2 });
        g.tex('rr', P.caja.x + 6, P.caja.y + P.caja.h + 64, String.raw`\texttt{rolling(${e.k}).mean()}:\ ${N}\ \text{valores}\ (${e.k - 1}\ \texttt{NaN})`, { color: 'ciruela', tam: 14, ancla: 'l', alfa: q2 });
      }

      // Paso 4: comparación
      if (q3 > 0) g.tex('cmp', P.caja.x + 6, P.caja.y + P.caja.h + 90, String.raw`\text{resample cambia la frecuencia; rolling la conserva y suaviza. Con } k = 7 \text{ desaparece el patrón semanal.}`, { color: 'texto2', tam: 13, ancla: 'l', alfa: q3 });
    },
  });
};
