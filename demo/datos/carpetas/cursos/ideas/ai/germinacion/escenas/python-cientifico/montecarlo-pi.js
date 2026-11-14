// Conferencia 4: Monte Carlo de π. Los puntos caen en el cuadrado; la estimación 4·(fracción dentro)
// se dibuja frente a n en escala logarítmica, con la banda π ± 2·1,64/√n.
export default (S) => {
  const C = { x: 50, y: 70, lado: 300 };                     // el cuadrado [0,1]² en píxeles
  const P = S.plano({ x: 430, y: 70, w: 300, h: 300 }, { t: [1, 4], y: [2.5, 3.8] });
  const q = (paso, p, i) => (paso > i ? 1 : paso === i ? S.ease(p) : 0);

  // Generador determinista pequeño (mulberry32) para que la semilla de la escena signifique algo.
  function generador(semilla) {
    let a = (semilla * 2654435761) >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  return S.definirEscena({
    alto: 430,
    entradas: [
      { id: 'semilla', tipo: 'numero', etiqueta: '\\text{semilla}', valor: 7, min: 0, max: 99999 },
      { id: 'n', tipo: 'deslizador', etiqueta: 'n', valor: 3000, min: 100, max: 8000, paso: 100 },
    ],
    validar: (e) => (Number.isInteger(e.semilla) ? null : 'la semilla debe ser un entero'),
    preparar: (e) => {
      const azar = generador(e.semilla);
      const n = e.n, xs = new Float64Array(n), ys = new Float64Array(n), dentro = new Uint8Array(n);
      const ts = [], est = [];
      let cuenta = 0;
      for (let i = 0; i < n; i++) {
        xs[i] = azar(); ys[i] = azar();
        dentro[i] = xs[i] * xs[i] + ys[i] * ys[i] <= 1 ? 1 : 0;
        cuenta += dentro[i];
        const k = i + 1;
        if (k >= 10) { ts.push(Math.log10(k)); est.push((4 * cuenta) / k); }
      }
      return { e, n, xs, ys, dentro, ts, est, final: (4 * cuenta) / n, vista: { t: [1, Math.log10(n)], y: [2.5, 3.8] } };
    },
    pasos: 4,
    duracion: [1300, 3200, 2400, 1600],
    leyenda: { cian: 'dentro del cuarto de círculo', tenue: 'fuera', ambar: 'π', ciruela: 'la estimación 4·(dentro/n)', verde: 'π ± 2 errores típicos' },
    dibujar(g, c, { paso, p }) {
      const q0 = q(paso, p, 0), q1 = q(paso, p, 1), q2 = q(paso, p, 2), q3 = q(paso, p, 3);
      const Pl = S.plano(P.caja, c.vista);
      const X = (u) => C.x + u * C.lado, Y = (v) => C.y + C.lado - v * C.lado;

      // Paso 1: cuadrado y cuarto de círculo
      g.rect(C.x, C.y, C.lado, C.lado, { color: 'texto2', relleno: false, alfa: q0, ancho: 1.4 });
      const ctx = g.ctx;
      ctx.save(); ctx.globalAlpha = q0; ctx.strokeStyle = S.rgba('ambar', 1); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(C.x, C.y + C.lado, C.lado, -Math.PI / 2, -Math.PI / 2 + (Math.PI / 2) * q0); ctx.stroke(); ctx.restore();
      g.tex('area', C.x + 8, C.y - 22, String.raw`P(\text{dentro}) = \tfrac{\pi}{4}\ \Rightarrow\ \pi = 4\,P(\text{dentro})`, { color: 'texto', tam: 15, ancla: 'l', alfa: q0 });

      // Paso 2: caen los puntos
      const k = Math.max(0, Math.round(c.n * q1));
      let cuenta = 0;
      for (let i = 0; i < k; i++) {
        cuenta += c.dentro[i];
        g.circulo(X(c.xs[i]), Y(c.ys[i]), 1.5, { color: c.dentro[i] ? 'cian' : 'tenue', alfa: 0.75 });
      }
      if (q1 > 0) {
        const est = k ? (4 * cuenta) / k : 0;
        g.tex('cuenta', C.x, C.y + C.lado + 26, String.raw`n = ${k},\ \ \text{dentro} = ${cuenta},\ \ \hat\pi = ${k ? est.toFixed(4) : '—'}`, { color: 'ciruela', tam: 15, ancla: 'l', alfa: q1 });
      }

      // Paso 3: la estimación frente a n (eje en log10)
      if (q2 > 0) {
        S.ejes(g, Pl, { t: String.raw`n`, y: String.raw`\hat\pi`, p: q2, numeros: false, rejilla: true, marcasT: [1, 2, 3, 4].filter((v) => v <= Pl.vista.t[1] + 1e-9), marcasY: [2.6, 2.8, 3.0, 3.2, 3.4, 3.6] });
        [1, 2, 3, 4].filter((v) => v <= Pl.vista.t[1] + 1e-9).forEach((v) => g.tex(`m${v}`, Pl.X(v), Pl.caja.y + Pl.caja.h + 14, `10^{${v}}`, { color: 'tenue', tam: 12, alfa: q2 }));
        [2.6, 3.0, 3.4].forEach((v) => g.texto(Pl.caja.x - 8, Pl.Y(v), v.toFixed(1), { color: 'tenue', tam: 11, ancla: 'r', alfa: q2 }));
        g.linea([[Pl.caja.x, Pl.Y(Math.PI)], [Pl.caja.x + Pl.caja.w, Pl.Y(Math.PI)]], { color: 'ambar', ancho: 1.5, guion: [6, 5], alfa: q2 });
        g.tex('pi', Pl.caja.x + Pl.caja.w + 6, Pl.Y(Math.PI), '\\pi', { color: 'ambar', tam: 15, ancla: 'l', alfa: q2 });
        S.curva(g, Pl, c.ts, c.est, { p: q2, color: 'ciruela', ancho: 1.8, brillo: 3 });
      }

      // Paso 4: la banda ±2·ET = ±2·1,64/√n
      if (q3 > 0) {
        const sup = [], inf = [];
        for (let i = 0; i <= 80; i++) {
          const t = Pl.vista.t[0] + ((Pl.vista.t[1] - Pl.vista.t[0]) * i) / 80;
          const et = 4 * Math.sqrt((Math.PI / 4) * (1 - Math.PI / 4) / 10 ** t);
          sup.push([Pl.X(t), Pl.Y(Math.min(3.8, Math.PI + 2 * et))]);
          inf.push([Pl.X(t), Pl.Y(Math.max(2.5, Math.PI - 2 * et))]);
        }
        g.recortar(Pl.caja, () => {
          ctx.save(); ctx.globalAlpha = 0.16 * q3; ctx.fillStyle = S.rgba('verde', 1);
          ctx.beginPath(); ctx.moveTo(sup[0][0], sup[0][1]);
          sup.forEach(([x, y]) => ctx.lineTo(x, y)); inf.slice().reverse().forEach(([x, y]) => ctx.lineTo(x, y));
          ctx.closePath(); ctx.fill(); ctx.restore();
          g.linea(sup, { color: 'verde', ancho: 1.2, alfa: q3 }); g.linea(inf, { color: 'verde', ancho: 1.2, alfa: q3 });
        });
        const etf = 4 * Math.sqrt((Math.PI / 4) * (1 - Math.PI / 4) / c.n);
        g.tex('final', P.caja.x, P.caja.y + P.caja.h + 44, String.raw`\hat\pi_{${c.n}} = ${c.final.toFixed(4)},\ \ \mathrm{ET} \approx \tfrac{1{,}64}{\sqrt{n}} = ${etf.toFixed(4)}`, { color: 'texto', tam: 15, ancla: 'l', alfa: q3 });
      }
    },
  });
};
