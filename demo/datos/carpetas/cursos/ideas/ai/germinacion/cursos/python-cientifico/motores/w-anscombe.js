// El cuarteto de Anscombe: primero solo los estadísticos (idénticos); el estudiante predice si los cuatro conjuntos
// se parecen; después se revelan los gráficos como múltiplos pequeños.
import { C, lienzo, mandos, boton, plano, el, fmt } from './motor.js';

const X = [10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5];
const D = {
  I: [X, [8.04, 6.95, 7.58, 8.81, 8.33, 9.96, 7.24, 4.26, 10.84, 4.82, 5.68]],
  II: [X, [9.14, 8.14, 8.74, 8.77, 9.26, 8.10, 6.13, 3.10, 9.13, 7.26, 4.74]],
  III: [X, [7.46, 6.77, 12.74, 7.11, 7.81, 8.84, 6.08, 5.39, 8.15, 6.42, 5.73]],
  IV: [[8, 8, 8, 8, 8, 8, 8, 19, 8, 8, 8], [6.58, 5.76, 7.71, 8.84, 8.47, 7.04, 5.25, 12.50, 5.56, 7.91, 6.89]],
};
function stats([x, y]) {
  const n = x.length, mx = x.reduce((a, b) => a + b) / n, my = y.reduce((a, b) => a + b) / n;
  const sxx = x.reduce((a, v) => a + (v - mx) ** 2, 0), syy = y.reduce((a, v) => a + (v - my) ** 2, 0), sxy = x.reduce((a, v, i) => a + (v - mx) * (y[i] - my), 0);
  const b = sxy / sxx;
  return { mx, my, vx: sxx / (n - 1), vy: syy / (n - 1), r: sxy / Math.sqrt(sxx * syy), a: my - b * mx, b };
}

export default function (cuerpo) {
  let visto = false;
  const tabla = el('div', { class: 'tabla' });
  const filas = Object.entries(D).map(([k, d]) => [k, stats(d)]);
  tabla.innerHTML = `<table class="w-tabla"><tr><th>conjunto</th><th>media x</th><th>var x</th><th>media y</th><th>var y</th><th>correlación</th><th>recta</th></tr>${filas.map(([k, s]) => `<tr><td class="txt">${k}</td><td>${fmt(s.mx, 2)}</td><td>${fmt(s.vx, 2)}</td><td>${fmt(s.my, 2)}</td><td>${fmt(s.vy, 2)}</td><td>${fmt(s.r, 3)}</td><td class="txt">y = ${fmt(s.a, 2)} + ${fmt(s.b, 3)}·x</td></tr>`).join('')}</table>`;
  cuerpo.append(tabla);
  const zona = el('div');
  cuerpo.append(zona);
  const m = mandos(cuerpo);
  const b = boton(m, 'Ya tengo mi predicción: mostrar los datos', () => mostrar(), { primario: true });
  function mostrar() {
    if (visto) return;
    visto = true; b.disabled = true;
    const L = lienzo(zona, { alto: 230, etiqueta: 'Cuarteto de Anscombe: cuatro diagramas de dispersión' });
    L.dibujar((g) => {
      Object.entries(D).forEach(([k, [x, y]], i) => {
        const P = plano({ x: 20 + i * 186 + 22, y: 30, w: 150, h: 160 }, { x: [2, 20], y: [2, 14] });
        g.rect(P.caja.x, P.caja.y, P.caja.w, P.caja.h, { color: C.regla, relleno: false });
        const s = stats([x, y]);
        g.linea([[P.X(3), P.Y(s.a + s.b * 3)], [P.X(19), P.Y(s.a + s.b * 19)]], { color: C.naranjaT, ancho: 1.4 });
        x.forEach((v, j) => g.circulo(P.X(v), P.Y(y[j]), 3.6, { color: C.azul }));
        g.texto(P.caja.x, 18, k, { tam: 14, ancla: 'l', peso: 700 });
        g.texto(P.caja.x + P.caja.w / 2, P.caja.y + P.caja.h + 16, ['lineal con ruido', 'una curva', 'recta + 1 anómalo', 'un punto lo fabrica'][i], { tam: 11, color: C.tinta2 });
      });
    });
  }
}
