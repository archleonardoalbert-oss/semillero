// Detectar anómalos: regla del IQR, puntuación z clásica y z robusta (mediana y MAD), en escala lineal o log10.
// Precios con cola larga (todos legítimos) más tres centinelas 9999 y un precio de 0.
import { C, lienzo, mandos, selector, rng, el, fmt, plano } from './motor.js';

function cuantil(ordenado, p) {
  const h = (ordenado.length - 1) * p, i = Math.floor(h);
  return ordenado[i] + (h - i) * ((ordenado[Math.min(i + 1, ordenado.length - 1)]) - ordenado[i]);
}
const mediana = (a) => cuantil([...a].sort((x, y) => x - y), 0.5);

export default function (cuerpo) {
  const e = { regla: 'iqr', escala: 'lineal' };
  const u = rng(11);
  const legit = Array.from({ length: 600 }, () => Math.round(Math.exp(Math.log(250) + 0.6 * u.normal())));
  const centinelas = [9999, 9999, 9999];
  const datos = [...legit, ...centinelas, 0];
  const L = lienzo(cuerpo, { alto: 300, etiqueta: 'Histograma de precios con los umbrales de una regla de anómalos' });
  const lect = el('div', { class: 'w-lectura' });

  function evaluar() {
    const usar = e.escala === 'log' ? datos.filter((v) => v > 0) : datos;
    const x = usar.map((v) => (e.escala === 'log' ? Math.log10(v) : v));
    const ord = [...x].sort((a, b) => a - b);
    let lo, hi, nombre;
    if (e.regla === 'iqr') { const q1 = cuantil(ord, 0.25), q3 = cuantil(ord, 0.75), r = q3 - q1; lo = q1 - 1.5 * r; hi = q3 + 1.5 * r; nombre = 'Q1 − 1,5·IQR y Q3 + 1,5·IQR'; }
    else if (e.regla === 'z') { const m = x.reduce((a, b) => a + b, 0) / x.length; const s = Math.sqrt(x.reduce((a, b) => a + (b - m) ** 2, 0) / x.length); lo = m - 3 * s; hi = m + 3 * s; nombre = 'media ± 3 desviaciones'; }
    else { const md = mediana(x); const mad = mediana(x.map((v) => Math.abs(v - md))); lo = md - 3.5 * mad / 0.6745; hi = md + 3.5 * mad / 0.6745; nombre = 'mediana ± 3,5·MAD/0,6745'; }
    const marcado = (v) => { const t = e.escala === 'log' ? (v > 0 ? Math.log10(v) : null) : v; return t == null ? null : t < lo || t > hi; };
    const nLegit = legit.filter((v) => marcado(v)).length, nCent = centinelas.filter((v) => marcado(v)).length;
    return { x, lo, hi, nombre, nLegit, nCent, ceroFuera: e.escala === 'log', cero: marcado(0) };
  }

  function dibujar() {
    const R = evaluar();
    const minx = Math.min(...R.x), maxx = Math.max(...R.x);
    const P = plano({ x: 50, y: 30, w: 680, h: 210 }, { x: [minx - (maxx - minx) * 0.02, maxx + (maxx - minx) * 0.02], y: [0, 1] });
    const nb = 70, ancho = (P.x1 - P.x0) / nb, cuentas = new Array(nb).fill(0);
    for (const v of R.x) cuentas[Math.min(nb - 1, Math.floor((v - P.x0) / ancho))]++;
    const maxc = Math.max(...cuentas);
    L.dibujar((g) => {
      cuentas.forEach((c, k) => {
        if (!c) return;
        const x0 = P.X(P.x0 + k * ancho), x1 = P.X(P.x0 + (k + 1) * ancho), h = Math.max(2, (c / maxc) * P.caja.h);
        const centro = P.x0 + (k + 0.5) * ancho;
        const fuera = centro < R.lo || centro > R.hi;
        g.rect(x0 + 0.5, P.caja.y + P.caja.h - h, x1 - x0 - 1, h, { color: fuera ? C.rojo : C.azul, alfa: fuera ? 0.9 : 0.55 });
      });
      g.linea([[P.caja.x, P.caja.y + P.caja.h], [P.caja.x + P.caja.w, P.caja.y + P.caja.h]], { color: C.tenue, ancho: 1 });
      for (const v of [R.lo, R.hi]) if (v > P.x0 && v < P.x1) {
        g.linea([[P.X(v), P.caja.y - 6], [P.X(v), P.caja.y + P.caja.h]], { color: C.naranjaT, ancho: 2, guion: [5, 3] });
      }
      const marcas = e.escala === 'log' ? [0, 1, 2, 3, 4] : [0, 2000, 4000, 6000, 8000, 10000];
      for (const v of marcas) if (v >= P.x0 && v <= P.x1) g.texto(P.X(v), P.caja.y + P.caja.h + 14, e.escala === 'log' ? `10^${v}`.replace('10^0', '1').replace('10^1', '10').replace('10^2', '100').replace('10^3', '1000').replace('10^4', '10 000') : v.toLocaleString('es'), { fuente: 'mono', tam: 10.5, color: C.tenue });
      g.texto(P.caja.x + P.caja.w, P.caja.y + P.caja.h + 32, e.escala === 'log' ? 'precio (CUP), eje en log10' : 'precio (CUP)', { tam: 11.5, ancla: 'r', color: C.tinta2 });
      g.texto(P.caja.x, 14, `umbrales: ${R.nombre}`, { tam: 12, ancla: 'l', color: C.naranjaT, peso: 600 });
      g.texto(P.caja.x + P.caja.w, 14, 'rojo: marcado como anómalo', { tam: 11.5, ancla: 'r', color: C.rojoT });
    });
    lect.innerHTML = `<span>Centinelas 9999 detectados: <b>${R.nCent} de 3</b>. Precios legítimos marcados (falsas alarmas): <b>${R.nLegit} de 600</b>.${R.ceroFuera ? ' El precio 0 queda fuera del log: hay que tratarlo aparte (regla de negocio).' : R.cero ? ' El 0 sale marcado.' : ' El precio 0 <b>no</b> sale marcado: ninguna regla estadística sustituye a «un precio no puede ser 0».'}</span>`;
    L.etiquetar(`Regla ${R.nombre} en escala ${e.escala}: ${R.nCent} de 3 centinelas detectados y ${R.nLegit} precios legítimos marcados.`);
  }
  const m = mandos(cuerpo);
  selector(m, { nombre: 'regla', opciones: [['iqr', 'rango intercuartílico (Tukey)'], ['z', 'puntuación z clásica, |z| > 3'], ['mad', 'z robusta (mediana y MAD), > 3,5']], valor: e.regla, alCambiar: (v) => { e.regla = v; dibujar(); } });
  selector(m, { nombre: 'escala', opciones: [['lineal', 'lineal'], ['log', 'log10']], valor: e.escala, alCambiar: (v) => { e.escala = v; dibujar(); } });
  cuerpo.append(lect);
  dibujar();
  void fmt;
}
