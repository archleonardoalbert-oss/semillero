// Monte Carlo de π: puntos uniformes en el cuadrado, la estimación 4·(fracción dentro) frente a n en escala
// logarítmica y la banda π ± 2·ET con ET ≈ 1,64/√n. Cada semilla da otra trayectoria; todas acaban en la banda.
import { C, lienzo, pasos, mandos, deslizador, rng, ease, tramo, plano, fmt, el } from './motor.js';

export default function (cuerpo) {
  const e = { semilla: 7, n: 4000 };
  let datos = null;
  const L = lienzo(cuerpo, { alto: 380, etiqueta: 'Estimación de π por Monte Carlo' });
  function preparar() {
    const u = rng(e.semilla), n = e.n;
    const xs = new Float32Array(n), ys = new Float32Array(n), dentro = new Uint8Array(n), ts = [], est = [];
    let c = 0;
    for (let i = 0; i < n; i++) {
      xs[i] = u(); ys[i] = u(); dentro[i] = xs[i] * xs[i] + ys[i] * ys[i] <= 1 ? 1 : 0; c += dentro[i];
      if (i + 1 >= 10) { ts.push(Math.log10(i + 1)); est.push((4 * c) / (i + 1)); }
    }
    datos = { xs, ys, dentro, ts, est, final: (4 * c) / n };
  }
  const et = (n) => 4 * Math.sqrt((Math.PI / 4) * (1 - Math.PI / 4) / n);

  function dibujar(paso, p) {
    const { xs, ys, dentro, ts, est } = datos;
    const q = (k) => (paso > k ? 1 : paso === k ? p : 0);
    const S = { x: 30, y: 40, l: 290 };
    const P = plano({ x: 420, y: 40, w: 310, h: 270 }, { x: [1, Math.log10(e.n)], y: [2.5, 3.8] });
    L.dibujar((g) => {
      g.rect(S.x, S.y, S.l, S.l, { color: C.tinta2, relleno: false, ancho: 1.2 });
      const ctx = g.ctx;
      ctx.save(); ctx.strokeStyle = C.naranjaT; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(S.x, S.y + S.l, S.l, -Math.PI / 2, -Math.PI / 2 + (Math.PI / 2) * ease(q(0))); ctx.stroke(); ctx.restore();
      g.texto(S.x, 20, 'P(dentro) = π/4   ⇒   π = 4 · P(dentro)', { tam: 13, ancla: 'l', color: C.tinta, alfa: q(0) });
      const k = Math.round(e.n * q(1));
      let c = 0;
      for (let i = 0; i < k; i++) {
        c += dentro[i];
        g.rect(S.x + xs[i] * S.l - 1, S.y + S.l - ys[i] * S.l - 1, 2.2, 2.2, { color: dentro[i] ? C.azul : C.tenue, alfa: dentro[i] ? 0.75 : 0.5 });
      }
      if (paso >= 1) g.texto(S.x, S.y + S.l + 20, `n = ${k.toLocaleString('es')}   dentro = ${c.toLocaleString('es')}   π̂ = ${k ? fmt((4 * c) / k, 4) : '—'}`, { fuente: 'mono', tam: 12, ancla: 'l', color: C.tinta });
      if (paso >= 2) {
        const marcas = [1, 2, 3, 4].filter((v) => v <= Math.log10(e.n) + 1e-9);
        g.linea([[P.caja.x, P.caja.y + P.caja.h], [P.caja.x + P.caja.w, P.caja.y + P.caja.h]], { color: C.tenue, ancho: 1 });
        for (const v of marcas) g.texto(P.X(v), P.caja.y + P.caja.h + 14, `10^${v}`.replace('10^1', '10').replace('10^2', '100').replace('10^3', '1000').replace('10^4', '10 000'), { fuente: 'mono', tam: 10, color: C.tenue });
        for (const v of [2.6, 3.0, 3.4, 3.8]) { g.linea([[P.caja.x, P.Y(v)], [P.caja.x + P.caja.w, P.Y(v)]], { color: C.regla2, ancho: 1 }); g.texto(P.caja.x - 6, P.Y(v), fmt(v, 1), { fuente: 'mono', tam: 10, color: C.tenue, ancla: 'r' }); }
        g.texto(P.caja.x + P.caja.w, P.caja.y + P.caja.h + 30, 'n (escala logarítmica)', { tam: 11, ancla: 'r', color: C.tinta2 });
        g.linea([[P.caja.x, P.Y(Math.PI)], [P.caja.x + P.caja.w, P.Y(Math.PI)]], { color: C.naranjaT, ancho: 1.4, guion: [6, 4] });
        g.texto(P.caja.x + P.caja.w + 4, P.Y(Math.PI), 'π', { tam: 15, ancla: 'l', color: C.naranjaT, peso: 700 });
        const hasta = Math.max(2, Math.round(ts.length * q(2)));
        const pts = [];
        for (let i = 0; i < hasta; i += Math.max(1, Math.floor(ts.length / 900))) pts.push([P.X(ts[i]), P.Y(Math.min(3.8, Math.max(2.5, est[i])))]);
        g.recortar(P.caja.x, P.caja.y, P.caja.w, P.caja.h, () => g.linea(pts, { color: C.rosaT, ancho: 1.6 }));
        g.texto(P.caja.x, P.caja.y - 14, 'π̂ a medida que crece n', { tam: 12, ancla: 'l', color: C.rosaT, peso: 600 });
      }
      if (paso >= 3) {
        const sup = [], inf = [];
        for (let i = 0; i <= 60; i++) {
          const t = 1 + (Math.log10(e.n) - 1) * i / 60;
          sup.push([P.X(t), P.Y(Math.min(3.8, Math.PI + 2 * et(10 ** t)))]); inf.push([P.X(t), P.Y(Math.max(2.5, Math.PI - 2 * et(10 ** t)))]);
        }
        g.linea([...sup, ...inf.reverse()], { color: C.verde, ancho: 1, relleno: '#009e7322', cierre: true, alfa: q(3) });
        g.texto(P.caja.x, P.caja.y + P.caja.h + 46, `π ± 2·ET, ET ≈ 1,64/√n.  Con n = ${e.n.toLocaleString('es')}: ET = ${fmt(et(e.n), 4)}`, { tam: 12, ancla: 'l', color: C.verdeT, alfa: q(3) });
      }
    });
  }
  preparar();
  const control = pasos(cuerpo, {
    narraciones: [
      '<b>Paso 1.</b> Un punto uniforme en el cuadrado cae en el cuarto de círculo con probabilidad igual a su área, π/4. Contar es medir esa probabilidad.',
      () => `<b>Paso 2.</b> Caen ${e.n.toLocaleString('es')} puntos con la semilla ${e.semilla}. En NumPy son dos líneas: <code>P = rng.random((n, 2))</code> y <code>4 * ((P**2).sum(axis=1) &lt;= 1).mean()</code>.`,
      '<b>Paso 3.</b> La estimación tras cada punto. Al principio salta mucho; luego se calma, pero muy despacio. ¿Cuántos puntos crees que harían falta para fiarte de la tercera cifra decimal?',
      () => `<b>Paso 4.</b> La banda verde contiene el valor verdadero ±2 errores típicos. Su anchura cae como 1/√n: <b>para ganar una cifra decimal hacen falta 100 veces más puntos</b>. Cambia la semilla: cada trayectoria es distinta, pero todas acaban dentro.`,
    ],
    dibujar, duracion: 2200,
  });
  const m = mandos(cuerpo);
  const semilla = el('input', { type: 'number', value: e.semilla, min: 0, step: 1, 'aria-label': 'semilla' });
  semilla.addEventListener('change', () => { const v = Math.max(0, Math.floor(Number(semilla.value) || 0)); e.semilla = v; semilla.value = v; preparar(); control.refrescar(); });
  m.append(el('label', {}, el('span', { class: 'nom', texto: 'semilla' }), semilla));
  deslizador(m, { nombre: 'n', min: 200, max: 10000, paso: 200, valor: e.n, formato: (v) => v.toLocaleString('es'), alCambiar: (v) => { e.n = v; preparar(); control.refrescar(); } });
}
