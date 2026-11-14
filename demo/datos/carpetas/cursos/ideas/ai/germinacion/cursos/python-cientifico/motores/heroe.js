// La escena de la portada: la asignatura en cuatro actos sobre la misma matriz.
//   1. a = np.arange(48).reshape(6, 8)   — los 48 bytes del búfer suben a ocupar su sitio en la matriz
//   2. v = a[::2, 1::3]                  — una vista: 9 celdas, sin copiar nada (líneas al búfer)
//   3. m = a.mean(axis=0)                — cada columna cae y se reduce a su media
//   4. a - m                             — la fila de medias se estira sobre las 6 filas (broadcasting)
// Dibujo determinista: dibujar(acto, p). Autoplay sereno, pausa, puntos para saltar; quieto con reduced-motion.
import { C, lienzo, el, ease, tramo, mezclar, quieto, oscuro } from './motor.js';

const F = 6, K = 8, N = F * K;
const ANCHO = 620;                                    // lienzo lógico: 620 × 540
const CW = 64, CH = 44, MX = 54, MY = 112;            // matriz
const RY = 400;                                       // fila de medias
const BW = 11.5, BX = 34, BY = 486, BH = 26;          // búfer
const ACTOS = [
  { cod: 'a = np.arange(48).reshape(6, 8)', exp: '48 enteros en un búfer: la matriz es solo una forma de leerlo' },
  { cod: 'v = a[::2, 1::3]', exp: 'una vista: strides (128, 24), 0 bytes copiados' },
  { cod: 'm = a.mean(axis=0)', exp: 'el eje 0 desaparece: forma (8,)' },
  { cod: 'a - m', exp: 'broadcasting: (6, 8) − (8,) → (6, 8)' },
];
const ANIMA = 2300, REPOSO = 2600;
const enVista = (i, j) => i % 2 === 0 && j % 3 === 1;

export default function iniciarHeroe(fig) {
  fig.textContent = '';
  const L = lienzo(fig, { alto: 540, ancho: ANCHO, etiqueta: 'Animación: una matriz de NumPy, su búfer, una vista, una reducción y un broadcasting' });
  const barra = el('div', { class: 'heroe-mandos' });
  const pausa = el('button', { type: 'button', class: 'pausa', 'aria-label': 'Pausar la animación', html: '❚❚' });
  const etiqueta = el('span', { texto: '' });
  const puntos = el('div', { class: 'puntos', role: 'group', 'aria-label': 'Ir a un acto' });
  const botones = ACTOS.map((a, k) => el('button', { type: 'button', 'aria-label': `Acto ${k + 1}: ${a.cod}`, onclick: () => ir(k, true) }));
  puntos.append(...botones);
  barra.append(pausa, etiqueta, puntos);
  fig.append(barra);

  let acto = 0, t0 = performance.now(), parado = quieto(), visible = true, raf = 0;
  if (parado) acto = 1;

  function dibujar(k, p) {
    const q = ease(p);
    L.dibujar((g) => {
      const a = ACTOS[k];
      g.texto(30, 38, '>>>', { fuente: 'mono', tam: 16, ancla: 'l', color: C.verdeT, peso: 600 });
      g.texto(72, 38, a.cod, { fuente: 'mono', tam: 21, ancla: 'l', color: C.tinta, peso: 600 });
      g.texto(72, 68, `# ${a.exp}`, { fuente: 'mono', tam: 13.5, ancla: 'l', color: C.tenue, alfa: k === 0 ? 1 : Math.min(1, q * 2), max: ANCHO - 90 });

      const resto = k >= 2 ? 0.28 : 1;                // la matriz se apaga cuando la protagonista es otra
      // ── el búfer ──
      for (let n = 0; n < N; n++) {
        const i = Math.floor(n / K), j = n % K;
        const lleno = k > 0 ? 1 : ease(tramo(q, n / (N + 12), (n + 12) / (N + 12)));
        const sel = k === 1 && enVista(i, j);
        g.celda(BX + n * BW, BY, BW, BH, null, { color: sel ? C.rosa : C.azul, fondo: sel ? 0.55 * q + 0.1 : 0.14, alfa: (0.25 + 0.75 * lleno) * (k >= 2 ? 0.5 : 1), grueso: 1 });
        if (n % 8 === 0) g.texto(BX + n * BW + 1, BY + BH + 12, n * 8, { fuente: 'mono', tam: 9.5, ancla: 'l', color: C.tenue, alfa: k >= 2 ? 0.5 : 1 });
      }
      g.texto(BX, BY - 12, 'búfer (int64): 384 bytes', { tam: 11.5, ancla: 'l', color: C.tinta2, alfa: k >= 2 ? 0.6 : 1 });

      // ── la matriz ──
      for (let i = 0; i < F; i++) for (let j = 0; j < K; j++) {
        const n = i * K + j;
        let x = MX + j * CW, y = MY + i * CH, alfa = resto, valor = n, color = C.azul, fondo = 0.12;
        if (k === 0) {
          const s = ease(tramo(q, n / (N + 12), (n + 12) / (N + 12)));
          x = mezclar(BX + n * BW - CW / 2 + BW / 2, x, s); y = mezclar(BY, y, s); alfa = s;
        }
        if (k === 1 && enVista(i, j)) { color = C.rosa; fondo = 0.16 + 0.3 * q; }
        if (k === 3) {
          const s = ease(tramo(q, 0.35 + i * 0.07, 0.65 + i * 0.07));
          valor = s > 0.5 ? 8 * i - 20 : n; alfa = mezclar(resto, 1, s);
          color = s > 0.5 ? (8 * i - 20 < 0 ? C.azul : C.naranja) : C.azul;
          fondo = s > 0.5 ? 0.08 + 0.3 * Math.abs(8 * i - 20) / 20 : 0.12;
        }
        if (k === 2) { const s = ease(tramo(q, j * 0.06, 0.45 + j * 0.06)); alfa = mezclar(1, resto, s); }
        g.celda(x, y, CW, CH, valor, { color, fondo, alfa, tam: 15 });
      }
      g.texto(MX, MY - 14, k === 3 ? 'a − m' : 'a: forma (6, 8)', { fuente: 'mono', tam: 12, ancla: 'l', color: k === 3 ? C.naranjaT : C.azul });

      // vista: líneas de cada celda a su byte
      if (k === 1) {
        for (let i = 0; i < F; i += 2) for (let j = 1; j < K; j += 3) {
          const n = i * K + j, s = ease(tramo(q, n / 70, n / 70 + 0.45));
          const x0 = MX + j * CW + CW / 2, y0 = MY + i * CH + CH, x1 = BX + n * BW + BW / 2;
          const ctx = g.ctx;
          ctx.save(); ctx.globalAlpha = 0.55 * s; ctx.strokeStyle = C.rosa; ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.bezierCurveTo(x0, mezclar(y0, BY, 0.6), x1, mezclar(y0, BY, 0.4), mezclar(x0, x1, s), mezclar(y0, BY, s)); ctx.stroke(); ctx.restore();
        }
        g.texto(MX + K * CW, MY - 14, 'v: forma (3, 3)', { fuente: 'mono', tam: 12, ancla: 'r', color: C.rosaT, alfa: q });
      }

      // reducción: cada columna cae y se convierte en su media
      if (k >= 2) {
        for (let j = 0; j < K; j++) {
          const s = k === 2 ? ease(tramo(q, j * 0.06, 0.45 + j * 0.06)) : 1;
          if (k === 2 && s < 1) for (let i = 0; i < F; i++) {
            g.celda(MX + j * CW, mezclar(MY + i * CH, RY, s), CW, CH, null, { color: C.naranja, fondo: 0.08, alfa: 0.5 * (1 - s), grueso: 1 });
          }
          g.celda(MX + j * CW, RY, CW, CH, 20 + j, { color: C.naranja, fondo: 0.3, alfa: s, tam: 15 });
        }
        g.texto(MX, RY + CH + 16, 'm = a.mean(axis=0): forma (8,)', { fuente: 'mono', tam: 12, ancla: 'l', color: C.naranjaT, alfa: k === 2 ? q : 1 });
      }
      // broadcasting: la fila de medias se estira (en discontinuo: no se copia)
      if (k === 3) {
        for (let i = 0; i < F; i++) {
          const s = ease(tramo(q, i * 0.07, 0.4 + i * 0.07));
          for (let j = 0; j < K; j++) g.celda(MX + j * CW + 3, mezclar(RY, MY + i * CH, s) + 3, CW - 6, CH - 6, null, { color: C.naranja, fondo: 0, alfa: 0.7 * s * (1 - tramo(q, 0.7, 1)), grueso: 1, guion: [4, 3] });
        }
      }
    });
    L.etiquetar(`Acto ${k + 1} de 4: ${ACTOS[k].cod}. ${ACTOS[k].exp}.`);
  }

  function marcar() {
    botones.forEach((b, i) => b.classList.toggle('actual', i === acto));
    etiqueta.textContent = `${acto + 1} / 4`;
    pausa.innerHTML = parado ? '▶' : '❚❚';
    pausa.setAttribute('aria-label', parado ? 'Reanudar la animación' : 'Pausar la animación');
  }
  function ir(k, desdeUsuario = false) {
    acto = k; t0 = performance.now();
    if (desdeUsuario && quieto()) { dibujar(acto, 1); marcar(); return; }
    marcar();
    if (parado) dibujar(acto, 1);
  }
  function bucle(t) {
    raf = requestAnimationFrame(bucle);
    if (parado || !visible || document.hidden) return;
    const e = t - t0;
    if (e > ANIMA + REPOSO) { acto = (acto + 1) % ACTOS.length; t0 = t; marcar(); }
    dibujar(acto, Math.min(1, (t - t0) / ANIMA));
  }
  pausa.addEventListener('click', () => { parado = !parado; t0 = performance.now() - ANIMA; marcar(); if (parado) dibujar(acto, 1); });
  if ('IntersectionObserver' in window) new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(fig);
  marcar();
  dibujar(acto, parado ? 1 : 0);
  if (!quieto()) raf = requestAnimationFrame(bucle);
  void oscuro;
}
