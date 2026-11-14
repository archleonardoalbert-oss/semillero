// El ndarray por dentro: búfer + dtype + forma + pasos. Una operación de indexado produce una vista (otro
// desplazamiento y otros pasos sobre el MISMO búfer) o una copia (un búfer nuevo); al escribir se ve la diferencia.
import { C, lienzo, pasos, mandos, selector, deslizador, fmt, mezclar, tramo, ease, el } from './motor.js';

const OPS = [
  ['rebanada', 'rebanada  a[i0::si, j0::sj]'],
  ['T', 'traspuesta  a.T'],
  ['lista', 'lista de filas  a[[2, 0]]'],
  ['mascara', 'máscara  a[a % 3 == 0]'],
];

export default function (cuerpo, opciones = {}) {
  const e = { filas: 3, cols: 4, item: 8, op: opciones.op ?? 'rebanada', i0: 0, si: 1, j0: 0, sj: 2, aplanar: !!opciones.aplanar };
  const L = lienzo(cuerpo, { alto: 420, etiqueta: 'Matriz, su búfer en memoria y el resultado de una operación de indexado' });

  function calcular() {
    const { filas: F, cols: K, item } = e;
    const s0 = K * item, s1 = item;
    const valor = (i, j) => i * K + j;
    let forma, strides = null, desp = 0, fuente = [], vista = true, nota = '';
    if (e.op === 'rebanada') {
      const fi = []; for (let i = e.i0; i < F; i += e.si) fi.push(i);
      const cj = []; for (let j = e.j0; j < K; j += e.sj) cj.push(j);
      forma = [fi.length, cj.length]; strides = [s0 * e.si, s1 * e.sj]; desp = e.i0 * s0 + e.j0 * s1;
      fuente = fi.map((i) => cj.map((j) => [i, j]));
    } else if (e.op === 'T') {
      forma = [K, F]; strides = [s1, s0];
      fuente = Array.from({ length: K }, (_, j) => Array.from({ length: F }, (_, i) => [i, j]));
    } else if (e.op === 'lista') {
      const fi = [2, 0].filter((i) => i < F);
      forma = [fi.length, K]; vista = false;
      fuente = fi.map((i) => Array.from({ length: K }, (_, j) => [i, j]));
    } else {
      const sel = []; for (let i = 0; i < F; i++) for (let j = 0; j < K; j++) if (valor(i, j) % 3 === 0) sel.push([i, j]);
      forma = [sel.length]; vista = false; fuente = [sel];
      nota = 'la máscara aplana: el resultado es 1D';
    }
    // ¿Se puede aplanar como vista? Criterio exacto (demostración para valientes 3): ignorando ejes de longitud 1,
    // cada paso debe ser el siguiente por la longitud del siguiente eje.
    let aplanable = null;
    if (vista && forma.length === 2) {
      const ejes = [0, 1].filter((k) => forma[k] > 1);
      aplanable = ejes.length < 2 || strides[0] === forma[1] * strides[1];
    }
    return { valor, forma, strides, desp, fuente, vista, nota, s0, s1, aplanable };
  }

  const tupla = (t) => (t.length === 1 ? `(${t[0]},)` : `(${t.join(', ')})`);
  const corte = (i, s) => `${i || ''}:${s > 1 ? `:${s}` : ''}`;
  const nombreOp = () => ({ rebanada: `a[${corte(e.i0, e.si)}, ${corte(e.j0, e.sj)}]`, T: 'a.T', lista: 'a[[2, 0]]', mascara: 'a[a % 3 == 0]' })[e.op];

  function dibujar(paso, p) {
    const R = calcular();
    const { filas: F, cols: K, item } = e;
    const N = F * K;
    const escrito = paso >= 2 ? ease(tramo(p, 0, 0.6)) : 0;
    L.dibujar((g) => {
      // ── la matriz a (lógica) ──
      const cw = 42, ch = 32, mx = 30, my = 46;
      g.texto(mx, 20, `a = np.arange(${N}).reshape(${F}, ${K})`, { fuente: 'mono', tam: 13, ancla: 'l', color: C.azul, peso: 600 });
      const seleccion = new Set(R.fuente.flat().map(([i, j]) => `${i},${j}`));
      const primero = R.fuente[0]?.[0];
      for (let i = 0; i < F; i++) for (let j = 0; j < K; j++) {
        const sel = paso >= 1 && seleccion.has(`${i},${j}`);
        const cambiado = R.vista && primero && primero[0] === i && primero[1] === j && escrito > 0.5;
        g.celda(mx + j * cw, my + i * ch, cw, ch, cambiado ? 99 : R.valor(i, j), { color: cambiado ? C.naranja : sel ? C.rosa : C.azul, fondo: sel || cambiado ? 0.28 : 0.1 });
      }
      g.texto(mx, my + F * ch + 16, `forma (${F}, ${K})   strides (${R.s0}, ${R.s1})`, { fuente: 'mono', tam: 11.5, ancla: 'l', color: C.tinta2 });

      // ── el búfer de a ──
      const bw = Math.min(30, 700 / N), bx = 30, by = 300;
      g.texto(bx, by - 18, `búfer de a: ${N} elementos de ${item} bytes (dtype ${item === 8 ? 'int64' : item === 4 ? 'int32' : 'int8'})`, { tam: 12, ancla: 'l', color: C.tinta2 });
      for (let k = 0; k < N; k++) {
        const i = Math.floor(k / K), j = k % K;
        const sel = paso >= 1 && seleccion.has(`${i},${j}`);
        const cambiado = R.vista && primero && primero[0] === i && primero[1] === j && escrito > 0.5;
        g.celda(bx + k * bw, by, bw, 28, cambiado ? 99 : k, { color: cambiado ? C.naranja : sel && R.vista ? C.rosa : C.azul, fondo: sel || cambiado ? 0.28 : 0.08, tam: bw < 26 ? 10 : 12 });
        if (k % 2 === 0 || bw > 26) g.texto(bx + k * bw + bw / 2, by + 40, k * item, { fuente: 'mono', tam: 9, color: C.tenue });
      }
      g.texto(bx + N * bw + 6, by + 40, 'byte', { tam: 10, color: C.tenue, ancla: 'l' });

      // ── el resultado ──
      if (paso < 1) return;
      const q = paso === 1 ? p : 1;
      const rx = 400, ry = 46;
      const fr = R.forma.length === 1 ? 1 : R.forma[0], kr = R.forma.length === 1 ? R.forma[0] : R.forma[1];
      const rw = Math.min(42, 330 / Math.max(kr, 1)), rh = 32;
      g.texto(rx, 20, `r = ${nombreOp()}`, { fuente: 'mono', tam: 13, ancla: 'l', color: R.vista ? C.rosaT : C.naranjaT, peso: 600, alfa: q });
      for (let a = 0; a < fr; a++) for (let b = 0; b < kr; b++) {
        const [i, j] = R.fuente[R.forma.length === 1 ? 0 : a][R.forma.length === 1 ? a * kr + b : b];
        const esPrimero = a === 0 && b === 0;
        const v = esPrimero && escrito > 0.5 ? 99 : R.valor(i, j);
        const qq = ease(tramo(q, (a * kr + b) / (fr * kr + 3), (a * kr + b + 4) / (fr * kr + 3)));
        g.celda(rx + b * rw, ry + a * rh, rw, rh, v, { color: esPrimero && escrito > 0.5 ? C.naranja : R.vista ? C.rosa : C.naranja, fondo: 0.18, alfa: qq });
        if (R.vista && paso === 1 && qq > 0.2) {
          const k = i * K + j;
          g.linea([[rx + b * rw + rw / 2, ry + a * rh + rh], [bx + k * bw + bw / 2, by]], { color: C.rosa, ancho: 1, alfa: 0.35 * qq });
        }
      }
      const lin = R.vista
        ? [`VISTA · forma ${tupla(R.forma)}`, `desplazamiento ${R.desp} B · strides ${tupla(R.strides)}`, 'mismo búfer que a: 0 bytes copiados']
        : [`COPIA · forma ${tupla(R.forma)}`, `búfer nuevo de ${R.forma.reduce((x, y) => x * y, 1) * item} bytes`, R.nota || 'el indexado avanzado no puede describirse con pasos'];
      lin.forEach((t, k) => g.texto(rx, ry + fr * rh + 18 + k * 17, t, { fuente: 'mono', tam: 11.5, ancla: 'l', color: k === 0 ? (R.vista ? C.rosaT : C.naranjaT) : C.tinta2, peso: k === 0 ? 600 : 400, alfa: q }));

      // búfer nuevo de la copia
      if (!R.vista) {
        const n = R.fuente.flat().length, cy = by + 62;
        g.texto(bx, cy - 6, 'búfer nuevo de r:', { tam: 12, ancla: 'l', color: C.naranjaT, alfa: q });
        R.fuente.flat().forEach(([i, j], k) => {
          const x0 = mezclar(bx + (i * K + j) * bw, bx + 120 + k * bw, ease(tramo(q, 0.1 + k / (n + 4), 0.5 + k / (n + 4))));
          const y0 = mezclar(by, cy - 14, ease(tramo(q, 0.1 + k / (n + 4), 0.5 + k / (n + 4))));
          g.celda(x0, y0, bw, 28, k === 0 && escrito > 0.5 ? 99 : R.valor(i, j), { color: C.naranja, fondo: k === 0 && escrito > 0.5 ? 0.4 : 0.18, tam: bw < 26 ? 10 : 12 });
        });
      }
      if (paso >= 2) {
        const msg = R.vista ? `r${R.forma.length === 1 ? '[0]' : '[0, 0]'} = 99  →  también cambia a: comparten búfer` : `r${R.forma.length === 1 ? '[0]' : '[0, 0]'} = 99  →  a no cambia: búfer propio`;
        g.texto(rx, 270, msg, { fuente: 'mono', tam: 12, ancla: 'l', color: C.naranjaT, peso: 600, alfa: escrito });
        g.texto(rx, 290, `np.shares_memory(a, r)  →  ${R.vista ? 'True' : 'False'}`, { fuente: 'mono', tam: 12, ancla: 'l', color: R.vista ? C.verdeT : C.rojoT, alfa: escrito });
        if (e.aplanar && R.aplanable != null) g.texto(rx, 310, `r.reshape(-1): ${R.aplanable ? 'vista (los pasos encajan)' : 'COPIA (los pasos no encajan)'}`, { fuente: 'mono', tam: 12, ancla: 'l', color: R.aplanable ? C.verdeT : C.rojoT, alfa: escrito });
      }
    });
    L.etiquetar(`Matriz a de forma (${e.filas}, ${e.cols}); operación ${nombreOp()}; el resultado es una ${R.vista ? 'vista' : 'copia'}.`);
  }

  const control = pasos(cuerpo, {
    narraciones: [
      () => `<b>Paso 1. El búfer.</b> La matriz es solo una forma de <em>leer</em> la tira de bytes de abajo. Avanzar una columna son ${e.item} bytes; avanzar una fila, ${e.cols * e.item}: por eso <code>strides = (${e.cols * e.item}, ${e.item})</code>.`,
      () => { const R = calcular(); return R.vista
        ? `<b>Paso 2. La operación.</b> <code>${nombreOp()}</code> se describe con el <em>mismo</em> búfer: empieza en el byte ${R.desp} y salta <code>${tupla(R.strides)}</code>. Las líneas rosas muestran qué celdas lee. No se copia nada.`
        : `<b>Paso 2. La operación.</b> <code>${nombreOp()}</code> elige elementos que ningún par de pasos puede describir (orden arbitrario o huecos irregulares), así que NumPy los <em>copia</em> a un búfer nuevo (naranja).`; },
      () => { const R = calcular(); return R.vista
        ? `<b>Paso 3. Escribir.</b> Escribir en <code>r</code> escribe en el búfer de <code>a</code>: el 99 aparece en los dos. Si quieres conservar el original: <code>r = ${nombreOp()}.copy()</code>.${e.aplanar && R.aplanable != null ? ` Y aplanar <code>r</code> ${R.aplanable ? 'sigue siendo una vista: sus elementos están equiespaciados en memoria.' : 'obliga a copiar: sus elementos no forman una progresión aritmética de direcciones.'}` : ''}`
        : '<b>Paso 3. Escribir.</b> Escribir en <code>r</code> solo cambia su búfer propio; <code>a</code> queda intacta. (Ojo: <code>a[mascara] = 99</code> sí escribe en <code>a</code>: es una asignación con índice, no una copia.)'; },
    ],
    dibujar,
    duracion: 1300,
  });

  const m = mandos(cuerpo);
  selector(m, { nombre: 'operación', opciones: OPS, valor: e.op, alCambiar: (v) => { e.op = v; visibles(); control.refrescar(); } });
  const sl = [
    deslizador(m, { nombre: 'inicio fila i0', min: 0, max: 2, valor: e.i0, formato: String, alCambiar: (v) => { e.i0 = v; control.refrescar(); } }),
    deslizador(m, { nombre: 'paso fila si', min: 1, max: 2, valor: e.si, formato: String, alCambiar: (v) => { e.si = v; control.refrescar(); } }),
    deslizador(m, { nombre: 'inicio col j0', min: 0, max: 3, valor: e.j0, formato: String, alCambiar: (v) => { e.j0 = v; control.refrescar(); } }),
    deslizador(m, { nombre: 'paso col sj', min: 1, max: 3, valor: e.sj, formato: String, alCambiar: (v) => { e.sj = v; control.refrescar(); } }),
  ];
  function visibles() { sl.forEach((s, k) => { m.querySelectorAll('label')[k + 1].style.display = e.op === 'rebanada' ? '' : 'none'; }); }
  visibles();
  m.append(el('span', { class: 'w-lectura', style: 'margin:0', texto: 'Cambia la operación y recorre los tres pasos.' }));
}
