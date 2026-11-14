// La salida de cProfile como gráfico de carámbanos: el ancho de cada barra es su cumtime; debajo, lo que llama.
// Tiempos medidos con cProfile y perf_counter (NumPy 2.5, Python 3.14) en la conferencia 8.
import { C, lienzo, mandos, boton, el, fmt, oscuro } from './motor.js';

// Salidas reales de cProfile (mismo proceso, NumPy ya importado).
const ANTES = {
  nom: 'pipeline()', cum: 0.189, tot: 0.000, n: 1, hijos: [
    { nom: 'vecino_mas_cercano', cum: 0.183, tot: 0.086, n: 1, nota: 'Su tottime (0,086 s) es el propio bucle de Python de 20 000 vueltas y la aritmética de cada vuelta.', hijos: [
      { nom: 'ndarray.sum', cum: 0.085, tot: 0.009, n: 20000, nota: 'Llamada una vez por fila: un ncalls tan alto en una función de NumPy delata un bucle de Python.' },
      { nom: 'ndarray.argmin', cum: 0.011, tot: 0.011, n: 20000, nota: 'Otra vez 20 000 llamadas.' },
    ] },
    { nom: 'cargar + estandarizar + medias', cum: 0.006, tot: 0.006, n: 3, nota: 'Ya vectorizadas: no merece la pena tocarlas.' },
  ],
};
const DESPUES = {
  nom: 'pipeline()', cum: 0.022, tot: 0.001, n: 1, hijos: [
    { nom: 'vecino_mas_cercano', cum: 0.016, tot: 0.014, n: 1, nota: 'Vectorizada: ‖x‖² + ‖c‖² − 2·X @ Cᵀ y argmin(axis=1). El producto de matrices va dentro de su tottime.', hijos: [
      { nom: 'reducciones', cum: 0.002, tot: 0.002, n: 3 },
    ] },
    { nom: 'cargar', cum: 0.003, tot: 0.003, n: 1 },
    { nom: 'estandarizar', cum: 0.003, tot: 0.001, n: 1 },
  ],
};

export default function (cuerpo) {
  let arbol = ANTES, sel = ANTES.hijos[0];
  const L = lienzo(cuerpo, { alto: 190, etiqueta: 'Perfil del programa: tiempo acumulado por función' });
  const info = el('div', { class: 'w-narra', 'aria-live': 'polite' });
  const cajas = [];
  const escala = 700 / ANTES.cum;
  function dibujar() {
    cajas.length = 0;
    L.dibujar((g) => {
      const fila = (nodo, x, nivel) => {
        const w = Math.max(2, nodo.cum * escala), y = 20 + nivel * 52;
        const caliente = nodo.cum / arbol.cum;
        const color = nodo.nom.includes('vecino') || nodo.nom === 'ndarray.sum' ? C.rojo : nivel === 0 ? C.tinta2 : C.azul;
        const tinta = oscuro() ? '#0d1117' : '#fff';
        g.rect(x, y, w - 2, 42, { color, alfa: nodo === sel ? 1 : 0.7 + 0.25 * caliente, radio: 4 });
        if (nodo === sel) g.rect(x - 1, y - 1, w, 44, { color: C.tinta, relleno: false, ancho: 2, radio: 5 });
        if (w > 70) {
          g.texto(x + 8, y + 15, nodo.nom, { fuente: 'mono', tam: 11.5, ancla: 'l', color: tinta, peso: 600, max: w - 14 });
          g.texto(x + 8, y + 31, `${fmt(nodo.cum, 3)} s`, { fuente: 'mono', tam: 10.5, ancla: 'l', color: tinta, max: w - 14 });
        }
        cajas.push([x, y, w, 42, nodo]);
        let xx = x;
        for (const h of nodo.hijos ?? []) { fila(h, xx, nivel + 1); xx += h.cum * escala; }
      };
      fila(arbol, 30, 0);
      g.texto(30 + ANTES.cum * escala, 178, `escala: el ancho total es ${fmt(ANTES.cum, 3)} s (versión con bucle)`, { tam: 10.5, ancla: 'r', color: C.tenue });
    });
    info.innerHTML = `<b><code>${sel.nom}</code></b>: ncalls = ${sel.n.toLocaleString('es')}, cumtime = ${fmt(sel.cum, 3)} s${sel.tot != null ? `, tottime = ${fmt(sel.tot, 3)} s` : ''}. ${sel.nota ?? ''}`;
  }
  L.canvas.addEventListener('click', (ev) => {
    const [x, y] = L.aLogico(ev);
    const c = cajas.find(([cx, cy, w, h]) => x >= cx && x <= cx + w && y >= cy && y <= cy + h);
    if (c) { sel = c[4]; dibujar(); }
  });
  cuerpo.append(info);
  const m = mandos(cuerpo);
  boton(m, 'después de vectorizar', (v) => { arbol = v ? DESPUES : ANTES; sel = arbol.hijos[0]; dibujar(); }, { alternar: false });
  m.append(el('span', { class: 'w-lectura', style: 'margin:0', texto: 'Haz clic en una barra para ver ncalls, tottime y cumtime.' }));
  dibujar();
}
