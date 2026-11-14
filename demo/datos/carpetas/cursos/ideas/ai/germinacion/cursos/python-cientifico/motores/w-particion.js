// Cinco pliegues de 100 ejemplos con 10 de la clase minoritaria: al azar frente a estratificado.
// Múltiplos pequeños: cada fila es un pliegue; se cuenta cuántos minoritarios le tocan.
import { C, lienzo, mandos, boton, rng, el } from './motor.js';

export default function (cuerpo) {
  const e = { semilla: 3, estratificado: false };
  const n = 100, minor = 10, k = 5;
  const L = lienzo(cuerpo, { alto: 250, etiqueta: 'Reparto de una clase minoritaria entre cinco pliegues' });
  const lect = el('div', { class: 'w-lectura' });
  function reparto() {
    const u = rng(e.semilla);
    const y = Array.from({ length: n }, (_, i) => (i < minor ? 1 : 0));
    const pliegue = new Array(n);
    const barajar = (idx) => { for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(u() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; } return idx; };
    if (e.estratificado) for (const c of [0, 1]) barajar(y.map((v, i) => (v === c ? i : -1)).filter((i) => i >= 0)).forEach((i, r) => { pliegue[i] = r % k; });
    else barajar(Array.from({ length: n }, (_, i) => i)).forEach((i, r) => { pliegue[i] = Math.floor(r / (n / k)); });
    return { y, pliegue };
  }
  function dibujar() {
    const { y, pliegue } = reparto();
    const cuentas = [];
    L.dibujar((g) => {
      for (let f = 0; f < k; f++) {
        const miembros = y.map((v, i) => [v, i]).filter(([, i]) => pliegue[i] === f).sort((a, b) => b[0] - a[0]);
        const m = miembros.filter(([v]) => v === 1).length;
        cuentas.push(m);
        const yy = 30 + f * 43;
        g.texto(20, yy + 14, `pliegue ${f + 1}`, { tam: 12, ancla: 'l', color: C.tinta2 });
        miembros.forEach(([v], j) => g.rect(100 + j * 25, yy, 21, 28, { color: v ? C.rosa : C.regla, radio: 3, alfa: v ? 1 : 0.8 }));
        g.texto(100 + 20 * 25 + 16, yy + 14, `${m}${m === 0 ? '  ✗ ninguno' : ''}`, { fuente: 'mono', tam: 13, ancla: 'l', color: m === 0 ? C.rojoT : C.tinta, peso: 600 });
      }
      g.texto(100 + 20 * 25 + 16, 14, 'minoritarios', { tam: 11, ancla: 'l', color: C.tenue });
      g.texto(100, 14, 'cada casilla es un ejemplo de prueba; rosa = clase minoritaria (10 de 100)', { tam: 11, ancla: 'l', color: C.tenue });
    });
    lect.innerHTML = e.estratificado
      ? '<span>Estratificado: cada clase se baraja y se reparte por separado, así que <b>todos los pliegues tienen 2</b>, sea cual sea la semilla.</span>'
      : `<span>Al azar: los pliegues reciben ${cuentas.join(', ')} minoritarios. Pulsa «otra semilla» varias veces: a menudo algún pliegue se queda con 0 o 1, y en él no se puede medir bien la clase minoritaria.</span>`;
    L.etiquetar(`Pliegues ${e.estratificado ? 'estratificados' : 'al azar'}: minoritarios por pliegue ${cuentas.join(', ')}.`);
  }
  const m = mandos(cuerpo);
  boton(m, 'estratificar', (v) => { e.estratificado = v; dibujar(); }, { alternar: false });
  boton(m, 'otra semilla', () => { e.semilla++; dibujar(); });
  cuerpo.append(lect);
  dibujar();
}
