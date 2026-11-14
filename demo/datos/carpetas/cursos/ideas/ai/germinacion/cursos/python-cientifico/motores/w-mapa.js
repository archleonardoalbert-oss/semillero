// Mapa conceptual de la asignatura: cada idea enlaza con su conferencia; al pasar o enfocar, se iluminan las
// ideas de las que depende y las que dependen de ella. Las salidas punteadas van a otras asignaturas del curso.
const NS = 'http://www.w3.org/2000/svg';
// Color de cada pieza como variable CSS: el mapa cambia de tema solo.
const COL = { c01: 'var(--tinta-2)', c02: 'var(--azul-t)', c03: 'var(--azul-t)', c04: 'var(--rosa-t)', c05: 'var(--naranja-t)', c06: 'var(--naranja-t)', c07: 'var(--naranja-t)', c08: 'var(--tinta-2)', v01: 'var(--rosa-t)', v02: 'var(--rosa-t)', v03: 'var(--rosa-t)' };
const PAG = { c01: 'c01-entorno', c02: 'c02-ndarray', c03: 'c03-vectores', c04: 'c04-aleatoriedad', c05: 'c05-datos-sucios', c06: 'c06-agregar', c07: 'c07-visualizacion', c08: 'c08-proyecto', v01: 'v01-einsum', v02: 'v02-memoria-distancias', v03: 'v03-reshape-vista' };
const N = [
  ['entorno', 'Entorno reproducible|ruedas, venv, CUDA', 20, 20, 'c01'],
  ['ndarray', 'ndarray|búfer, dtype, pasos', 20, 110, 'c02'],
  ['vistas', 'Vistas y copias', 20, 190, 'c02'],
  ['reshape', '¿Aplanar es vista?|criterio exacto', 20, 260, 'v03'],
  ['azar', 'Generador con semilla', 20, 360, 'c04'],
  ['montecarlo', 'Monte Carlo|error 1/√n', 20, 430, 'c04'],
  ['particiones', 'Particiones|estratificadas', 200, 430, 'c04'],
  ['reducciones', 'Reducciones por eje', 200, 110, 'c03'],
  ['broadcast', 'Broadcasting', 200, 180, 'c03'],
  ['vectorizar', 'Pensar en vectores', 200, 250, 'c03'],
  ['distancias', 'Distancias en O(nm)|cuenta de bytes', 200, 320, 'c03'],
  ['einsum', 'einsum', 380, 360, 'v01'],
  ['lectura', 'Leer con tipos|CSV, Excel, fechas', 380, 110, 'c05'],
  ['limpieza', 'Faltantes, centinelas|y anómalos', 380, 180, 'c05'],
  ['cow', 'Copia al escribir|(pandas 3)', 380, 260, 'c05'],
  ['groupby', 'groupby y merge', 560, 110, 'c06'],
  ['series', 'resample y rolling', 560, 180, 'c06'],
  ['eda', 'Análisis exploratorio|antes de modelar', 560, 260, 'c07'],
  ['proyecto', 'Repositorio|reproducible', 200, 20, 'c08'],
  ['pruebas', 'Pruebas con pytest', 380, 20, 'c08'],
  ['perfil', 'Perfilar|medir antes', 560, 20, 'c08'],
];
const E = [['entorno', 'proyecto'], ['proyecto', 'pruebas'], ['pruebas', 'perfil'], ['ndarray', 'vistas'], ['vistas', 'reshape'], ['ndarray', 'reducciones'],
  ['reducciones', 'broadcast'], ['broadcast', 'vectorizar'], ['vectorizar', 'distancias'], ['distancias', 'einsum'], ['ndarray', 'lectura'], ['vistas', 'cow'],
  ['lectura', 'limpieza'], ['limpieza', 'groupby'], ['groupby', 'series'], ['groupby', 'eda'], ['limpieza', 'eda'], ['vectorizar', 'perfil'], ['azar', 'montecarlo'],
  ['azar', 'particiones'], ['vectorizar', 'montecarlo'], ['vectorizar', 'groupby']];
const SALIDAS = [['montecarlo', 'Probabilidad'], ['particiones', 'ML I: validación'], ['series', 'Series temporales'], ['eda', 'Proyecto 1'], ['einsum', 'Transformers'], ['distancias', 'RAG: búsqueda']];
const W = 170, H = 50;

const s = (tag, a = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); return e; };

export default function (cuerpo) {
  const svg = s('svg', { viewBox: '0 0 760 540', role: 'group', 'aria-label': 'Mapa conceptual de la asignatura' });
  const defs = s('defs');
  const flecha = s('marker', { id: 'mapa-punta', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
  flecha.append(s('path', { d: 'M0,0 L10,5 L0,10 z', class: 'mapa-punta' }));
  defs.append(flecha); svg.append(defs);
  const pos = Object.fromEntries(N.map(([id, , x, y]) => [id, { x, y }]));
  const aristas = [];
  const borde = (a, b) => {
    const A = pos[a], B = pos[b];
    const ca = { x: A.x + W / 2, y: A.y + H / 2 }, cb = { x: B.x + W / 2, y: B.y + H / 2 };
    const dx = cb.x - ca.x, dy = cb.y - ca.y;
    const sale = Math.abs(dx) * H > Math.abs(dy) * W ? { x: ca.x + Math.sign(dx) * W / 2, y: ca.y } : { x: ca.x, y: ca.y + Math.sign(dy) * H / 2 };
    const entra = Math.abs(dx) * H > Math.abs(dy) * W ? { x: cb.x - Math.sign(dx) * W / 2, y: cb.y } : { x: cb.x, y: cb.y - Math.sign(dy) * H / 2 };
    return [sale, entra];
  };
  for (const [a, b] of E) {
    const [p, q] = borde(a, b);
    const camino = s('path', { d: `M${p.x},${p.y} C${(p.x + q.x) / 2 + (p.y === q.y ? 0 : 0)},${p.y} ${(p.x + q.x) / 2},${q.y} ${q.x},${q.y}`, class: 'mapa-arista', 'marker-end': 'url(#mapa-punta)' });
    camino.dataset.a = a; camino.dataset.b = b;
    svg.append(camino); aristas.push(camino);
  }
  for (const [id, texto] of SALIDAS) {
    const A = pos[id];
    const t = s('text', { x: A.x + W - 4, y: A.y + H + 14, class: 'mapa-salida', 'text-anchor': 'end' });
    t.textContent = `⤷ ${texto}`;
    svg.append(t);
  }
  const nodos = N.map(([id, texto, x, y, c]) => {
    const a = s('a', { href: `${PAG[c]}.html`, 'aria-label': `${texto.replace('|', ': ')} (${c})` });
    const g = s('g', { class: 'mapa-nodo' });
    const r = s('rect', { x, y, width: W, height: H, rx: 7, style: `stroke:${COL[c]}` });
    const [l1, l2] = texto.split('|');
    const t1 = s('text', { x: x + 10, y: y + (l2 ? 21 : 30), class: 't1' }); t1.textContent = l1;
    g.append(r, t1);
    if (l2) { const t2 = s('text', { x: x + 10, y: y + 38, class: 't2' }); t2.textContent = l2; g.append(t2); }
    const et = s('text', { x: x + W - 8, y: y + 14, 'text-anchor': 'end', class: 'et', style: `fill:${COL[c]}` }); et.textContent = c; g.append(et);
    a.append(g); svg.append(a);
    const resaltar = (on) => {
      const vecinos = new Set([id]);
      aristas.forEach((p) => { const toca = p.dataset.a === id || p.dataset.b === id; if (toca && on) { vecinos.add(p.dataset.a); vecinos.add(p.dataset.b); } p.classList.toggle('on', on && toca); });
      nodos.forEach(([nid, , gg]) => { gg.classList.toggle('on', on && vecinos.has(nid)); gg.classList.toggle('yo', on && nid === id); });
    };
    a.addEventListener('mouseenter', () => resaltar(true)); a.addEventListener('mouseleave', () => resaltar(false));
    a.addEventListener('focus', () => resaltar(true)); a.addEventListener('blur', () => resaltar(false));
    return [id, r, g];
  });
  const marco = document.createElement('div');
  marco.className = 'w-lienzo';
  marco.append(svg);
  cuerpo.append(marco);
}
