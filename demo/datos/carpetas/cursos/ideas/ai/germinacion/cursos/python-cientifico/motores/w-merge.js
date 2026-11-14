// merge sin sorpresas: cada par de filas con la misma clave produce una fila. Una clave duplicada en la tabla de
// precios multiplica las ventas; validate="many_to_one" lo detecta; how decide qué pasa con lo que no casa.
import { C, lienzo, mandos, selector, boton, el } from './motor.js';

const VENTAS = [['arroz', 3], ['aceite', 1], ['arroz', 2], ['café', 4], ['arroz', 1], ['jabón', 2]];

export default function (cuerpo) {
  const e = { how: 'left', duplicado: true, validar: false };
  const L = lienzo(cuerpo, { alto: 380, etiqueta: 'Unión de ventas con precios' });
  const lect = el('div', { class: 'w-lectura' });
  const precios = () => [['arroz', 250], ...(e.duplicado ? [['arroz', 280]] : []), ['aceite', 890], ['café', 1200], ['sal', 60]];

  function unir() {
    const P = precios(), filas = [];
    VENTAS.forEach(([prod, u], i) => {
      const casan = P.map((p, j) => [p, j]).filter(([p]) => p[0] === prod);
      if (casan.length) casan.forEach(([p, j]) => filas.push({ i, j, prod, u, precio: p[1] }));
      else if (e.how === 'left' || e.how === 'outer') filas.push({ i, j: null, prod, u, precio: null });
    });
    if (e.how === 'outer' || e.how === 'right') P.forEach((p, j) => { if (!VENTAS.some(([v]) => v === p[0])) filas.push({ i: null, j, prod: p[0], u: null, precio: p[1] }); });
    if (e.how === 'right') return filas.filter((f) => f.j !== null);
    return filas;
  }
  function dibujar() {
    const P = precios(), F = unir();
    const dupl = P.length !== new Set(P.map((p) => p[0])).size;
    const error = e.validar && dupl;
    const HV = 30, xv = 20, xp = 230, xr = 450, y0 = 52;
    L.dibujar((g) => {
      g.texto(xv, 22, 'ventas (6 filas)', { fuente: 'mono', tam: 12.5, ancla: 'l', color: C.azul, peso: 600 });
      g.texto(xp, 22, `precios (${P.length} filas)`, { fuente: 'mono', tam: 12.5, ancla: 'l', color: C.rosaT, peso: 600 });
      const yV = (i) => y0 + i * HV, yP = (j) => y0 + j * HV;
      VENTAS.forEach(([p, u], i) => { g.celda(xv, yV(i) - 12, 100, 26, null, { color: C.azul, fondo: 0.1 }); g.texto(xv + 8, yV(i) + 1, p, { fuente: 'mono', tam: 12, ancla: 'l' }); g.celda(xv + 100, yV(i) - 12, 50, 26, u, { color: C.azul, fondo: 0.1, tam: 12 }); });
      P.forEach(([p, pr], j) => { const extra = e.duplicado && j === 1; g.celda(xp, yP(j) - 12, 100, 26, null, { color: extra ? C.rojo : C.rosa, fondo: extra ? 0.25 : 0.1 }); g.texto(xp + 8, yP(j) + 1, p, { fuente: 'mono', tam: 12, ancla: 'l' }); g.celda(xp + 100, yP(j) - 12, 70, 26, pr, { color: extra ? C.rojo : C.rosa, fondo: 0.1, tam: 12 }); });
      if (error) {
        g.texto(xr, 60, 'MergeError:', { fuente: 'mono', tam: 14, ancla: 'l', color: C.rojoT, peso: 600 });
        ['Merge keys are not unique in', 'right dataset; not a', 'many-to-one merge'].forEach((t, k) => g.texto(xr, 84 + k * 18, t, { fuente: 'mono', tam: 12, ancla: 'l', color: C.rojoT }));
        g.texto(xr, 150, 'el error aparece ANTES de que', { tam: 12, ancla: 'l', color: C.tinta2 });
        g.texto(xr, 168, 'los totales salgan inflados', { tam: 12, ancla: 'l', color: C.tinta2 });
        return;
      }
      for (const f of F) if (f.i !== null && f.j !== null) g.linea([[xv + 150, yV(f.i)], [xp, yP(f.j)]], { color: f.prod === 'arroz' && e.duplicado ? C.rojo : C.tenue, ancho: 1.3, alfa: 0.7 });
      g.texto(xr, 22, `resultado how="${e.how}" (${F.length} filas)`, { fuente: 'mono', tam: 12.5, ancla: 'l', color: C.naranjaT, peso: 600 });
      F.forEach((f, k) => {
        const y = y0 + 8 + k * 26;
        if (y > 370) return;
        const rojo = f.prod === 'arroz' && e.duplicado;
        g.celda(xr, y - 11, 92, 22, null, { color: rojo ? C.rojo : C.naranja, fondo: 0.12 });
        g.texto(xr + 6, y, f.prod, { fuente: 'mono', tam: 11.5, ancla: 'l' });
        g.texto(xr + 130, y, f.u ?? 'NaN', { fuente: 'mono', tam: 11.5, ancla: 'r', color: f.u == null ? C.tenue : C.tinta });
        g.texto(xr + 200, y, f.precio ?? 'NaN', { fuente: 'mono', tam: 11.5, ancla: 'r', color: f.precio == null ? C.tenue : C.tinta });
        g.texto(xr + 296, y, f.i ?? '—', { fuente: 'mono', tam: 10.5, ancla: 'r', color: C.tenue });
      });
      g.texto(xr + 6, 38, 'producto', { tam: 10, ancla: 'l', color: C.tenue });
      g.texto(xr + 130, 38, 'unidades', { tam: 10, ancla: 'r', color: C.tenue });
      g.texto(xr + 200, 38, 'precio', { tam: 10, ancla: 'r', color: C.tenue });
      g.texto(xr + 300, 38, 'fila de ventas', { tam: 10, ancla: 'r', color: C.tenue });
    });
    const unidades = F.filter((f) => f.u != null).reduce((a, f) => a + f.u, 0);
    lect.innerHTML = error
      ? '<span><code>validate="many_to_one"</code> exige que cada producto aparezca <b>una sola vez</b> en precios. Con el arroz repetido, falla de inmediato: es exactamente lo que quieres.</span>'
      : `<span>Filas = Σ<sub>k</sub> a<sub>k</sub>·b<sub>k</sub>: arroz aparece ${VENTAS.filter((v) => v[0] === 'arroz').length} veces en ventas y ${P.filter((p) => p[0] === 'arroz').length} en precios → ${VENTAS.filter((v) => v[0] === 'arroz').length * P.filter((p) => p[0] === 'arroz').length} filas de arroz. Suma de unidades tras la unión: <b>${unidades}</b> (las ventas reales suman ${VENTAS.reduce((a, v) => a + v[1], 0)}).${e.how === 'inner' ? ' Con <code>inner</code> desaparecen las ventas sin precio (jabón).' : ''}${e.how === 'outer' || e.how === 'right' ? ' La sal tiene precio pero ninguna venta: aparece con unidades NaN.' : ''}</span>`;
  }
  const m = mandos(cuerpo);
  selector(m, { nombre: 'how', opciones: [['left', 'left'], ['inner', 'inner'], ['outer', 'outer'], ['right', 'right']], valor: e.how, alCambiar: (v) => { e.how = v; dibujar(); } });
  boton(m, 'arroz duplicado en precios', (v) => { e.duplicado = v; dibujar(); }, { alternar: true });
  boton(m, 'validate="many_to_one"', (v) => { e.validar = v; dibujar(); }, { alternar: false });
  cuerpo.append(lect);
  dibujar();
}
