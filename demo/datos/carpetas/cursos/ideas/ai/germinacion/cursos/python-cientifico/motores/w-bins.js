// El número de bins de un histograma cambia la historia: los mismos 400 precios (dos tipos de producto)
// con los bins que elijas, frente a la regla de Freedman-Diaconis (bins="fd").
import { C, lienzo, mandos, deslizador, boton, rng, plano, el, fmt } from './motor.js';

export default function (cuerpo) {
  const u = rng(2);
  const N = 400, A = 60, B = 440;
  const datos = Array.from({ length: N }, (_, i) => (i < 0.6 * N ? 180 + 28 * u.normal() : 320 + 32 * u.normal()));
  const ord = [...datos].sort((a, b) => a - b);
  const q = (p) => ord[Math.floor(p * (N - 1))];
  const hFD = (2 * (q(0.75) - q(0.25))) / Math.cbrt(N), binsFD = Math.round((B - A) / hFD);
  const e = { bins: 4, fd: false };
  const L = lienzo(cuerpo, { alto: 300, etiqueta: 'Histograma de 400 precios' });
  const lect = el('div', { class: 'w-lectura' });
  const hist = (k) => { const w = (B - A) / k, c = new Array(k).fill(0); for (const x of datos) if (x >= A && x < B) c[Math.min(k - 1, Math.floor((x - A) / w))]++; return { w, d: c.map((n) => n / (N * w)) }; };
  function dibujar() {
    const h = hist(e.bins), f = hist(binsFD);
    const ymax = Math.max(...h.d, ...f.d) * 1.1;
    const P = plano({ x: 50, y: 24, w: 680, h: 220 }, { x: [A, B], y: [0, ymax] });
    L.dibujar((g) => {
      h.d.forEach((d, j) => { const x0 = P.X(A + j * h.w), x1 = P.X(A + (j + 1) * h.w); g.rect(x0 + 0.5, P.Y(d), Math.max(0.5, x1 - x0 - 1), P.Y(0) - P.Y(d), { color: C.rosa, alfa: 0.55 }); });
      if (e.fd) {
        const pts = [[P.X(A), P.Y(0)]];
        f.d.forEach((d, j) => { pts.push([P.X(A + j * f.w), P.Y(d)], [P.X(A + (j + 1) * f.w), P.Y(d)]); });
        pts.push([P.X(B), P.Y(0)]);
        g.linea(pts, { color: C.naranjaT, ancho: 2 });
      }
      for (const x of datos) g.linea([[P.X(x), P.Y(0) + 4], [P.X(x), P.Y(0) + 14]], { color: C.azul, ancho: 1, alfa: 0.3 });
      for (const v of [100, 200, 300, 400]) g.texto(P.X(v), P.Y(0) + 28, v, { fuente: 'mono', tam: 11, color: C.tenue });
      g.texto(P.caja.x + P.caja.w, P.Y(0) + 44, 'precio (CUP); cada raya azul es un dato', { tam: 11.5, ancla: 'r', color: C.tinta2 });
    });
    const msg = e.bins <= 6 ? '¿Una sola joroba? Con tan pocos bins se pierde la estructura.' : e.bins >= 50 ? 'Demasiados bins: el ruido parece estructura.' : 'Se distinguen dos grupos de precios.';
    lect.innerHTML = `<span><b>bins=${e.bins}</b>: ${msg}${e.fd ? ` Contorno naranja: Freedman-Diaconis, h = 2·IQR/∛n = ${fmt(hFD, 1)} → ${binsFD} bins.` : ''}</span>`;
    L.etiquetar(`Histograma con ${e.bins} bins. ${msg}`);
  }
  const m = mandos(cuerpo);
  deslizador(m, { nombre: 'bins', min: 2, max: 80, valor: e.bins, formato: String, alCambiar: (v) => { e.bins = v; dibujar(); } });
  boton(m, 'mostrar bins="fd"', (v) => { e.fd = v; dibujar(); }, { alternar: false });
  cuerpo.append(lect);
  dibujar();
}
