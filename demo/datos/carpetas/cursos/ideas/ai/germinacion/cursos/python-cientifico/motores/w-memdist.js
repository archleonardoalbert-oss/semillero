// Memoria de la matriz de distancias por pares: la versión con broadcasting (pico 2·n·m·d·b bytes) frente al
// desarrollo ‖a‖² + ‖b‖² − 2ABᵀ (pico 3·n·m·b) y frente al cálculo por bloques. Escala logarítmica, con tu RAM y tu VRAM.
import { C, lienzo, mandos, deslizador, selector, fmtBytes, el, oscuro } from './motor.js';

export default function (cuerpo, opciones = {}) {
  const portada = opciones.modo === 'portada';
  const e = { n: 5000, d: 512, b: 8, bloque: 128 };
  const L = lienzo(cuerpo, { alto: portada ? 300 : 330, etiqueta: 'Memoria de tres formas de calcular distancias por pares' });
  const lect = el('div', { class: 'w-lectura' });

  function dibujar() {
    const { n, d, b, bloque } = e;
    const filas = [
      { nom: '((A[:, None] - B[None])**2).sum(-1)', bytes: 2 * n * n * d * b, color: C.rojo, nota: 'intermedio (n, m, d), dos veces' },
      { nom: 'por bloques de filas', bytes: 2 * bloque * n * d * b + n * n * b, color: C.naranja, nota: `bloques de ${bloque} filas` },
      { nom: '‖a‖² + ‖b‖² − 2 A @ B.T', bytes: 3 * n * n * b, color: C.verde, nota: 'solo arreglos (n, m)' },
    ];
    const lineas = [[6e9, 'tu GPU: 6 GB'], [16e9, 'un portátil: 16 GB de RAM']];
    const lo = 1e5, hi = 1e13;
    const X = (v) => 250 + (Math.log10(Math.max(v, lo)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)) * 470;
    L.dibujar((g) => {
      const top = 40;
      for (let k = 5; k <= 13; k++) {
        g.linea([[X(10 ** k), top - 10], [X(10 ** k), top + 3 * 62]], { color: C.regla2, ancho: 1 });
        g.texto(X(10 ** k), top + 3 * 62 + 14, fmtBytes(10 ** k), { fuente: 'mono', tam: 10, color: C.tenue });
      }
      lineas.forEach(([v, t], k) => {
        g.linea([[X(v), top - 16], [X(v), top + 3 * 62]], { color: C.tinta2, ancho: 1.2, guion: [5, 4] });
        g.texto(X(v) + (k === 0 ? -4 : 4), top - 22, t, { tam: 11, ancla: k === 0 ? 'r' : 'l', color: C.tinta2 });
      });
      filas.forEach((f, k) => {
        const y = top + k * 62;
        g.texto(16, y + 14, f.nom, { fuente: 'mono', tam: 11.5, ancla: 'l', color: C.tinta, max: 228 });
        g.texto(16, y + 32, f.nota, { tam: 11, ancla: 'l', color: C.tenue });
        g.rect(250, y + 4, X(f.bytes) - 250, 34, { color: f.color, alfa: 0.85, radio: 3 });
        const cabe = f.bytes <= 6e9 ? 'cabe en la GPU' : f.bytes <= 16e9 ? 'cabe en la RAM' : 'NO cabe';
        const tx = X(f.bytes) + 8, dentro = tx > 640;
        g.texto(dentro ? X(f.bytes) - 8 : tx, y + 21, `${fmtBytes(f.bytes)} · ${cabe}`, { fuente: 'mono', tam: 12, ancla: dentro ? 'r' : 'l', color: dentro ? (oscuro() ? '#10141b' : '#fff') : C.tinta, peso: 600 });
      });
      g.texto(250, top + 3 * 62 + 34, 'memoria máxima (escala logarítmica: cada marca es ×10)', { tam: 11, ancla: 'l', color: C.tinta2 });
    });
    const r = (2 * n * n * d * b) / (3 * n * n * b);
    lect.innerHTML = `<span>n = m = ${n.toLocaleString('es')}, d = ${d}, ${b} bytes por número: la versión con broadcasting necesita <b>${Math.round(r).toLocaleString('es')} veces</b> más memoria (el factor es 2d/3: no depende de n).</span>`;
    L.etiquetar(`Con n = ${n} y d = ${d}: broadcasting ${fmtBytes(2 * n * n * d * b)}, por bloques ${fmtBytes(2 * bloque * n * d * b + n * n * b)}, desarrollo del cuadrado ${fmtBytes(3 * n * n * b)}.`);
  }
  const m = mandos(cuerpo);
  deslizador(m, { nombre: 'n = m (puntos)', min: 500, max: 20000, paso: 500, valor: e.n, formato: (v) => v.toLocaleString('es'), alCambiar: (v) => { e.n = v; dibujar(); } });
  deslizador(m, { nombre: 'd (dimensión)', min: 2, max: 1024, paso: 2, valor: e.d, formato: String, alCambiar: (v) => { e.d = v; dibujar(); } });
  selector(m, { nombre: 'dtype', opciones: [[8, 'float64'], [4, 'float32'], [2, 'float16']], valor: 8, alCambiar: (v) => { e.b = Number(v); dibujar(); } });
  if (!portada) deslizador(m, { nombre: 'filas por bloque', min: 8, max: 1024, paso: 8, valor: e.bloque, formato: String, alCambiar: (v) => { e.bloque = v; dibujar(); } });
  cuerpo.append(lect);
  dibujar();
}
