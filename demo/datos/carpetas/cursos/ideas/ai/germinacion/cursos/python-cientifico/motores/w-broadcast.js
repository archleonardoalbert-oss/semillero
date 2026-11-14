// Las cuatro reglas del broadcasting aplicadas a A + B, con formas elegidas por el estudiante.
import { C, lienzo, pasos, mandos, selector, ease, tramo } from './motor.js';

const tupla = (s) => (s.length === 1 ? `(${s[0]},)` : `(${s.join(', ')})`);
const FORMAS = ['(1,)', '(2,)', '(3,)', '(4,)', '(1, 1)', '(1, 3)', '(1, 4)', '(2, 1)', '(3, 1)', '(4, 1)', '(2, 3)', '(3, 3)', '(3, 4)', '(4, 3)', '(4, 4)'];
const leer = (t) => t.replace(/[()\s]/g, '').split(',').filter(Boolean).map(Number);

export default function (cuerpo, opciones = {}) {
  const e = { A: opciones.A ?? '(3, 1)', B: opciones.B ?? '(4,)' };
  const L = lienzo(cuerpo, { alto: 380, etiqueta: 'Broadcasting de dos arreglos' });

  function calc() {
    const a = leer(e.A), b = leer(e.B);
    const ap = a.length === 1 ? [1, a[0]] : a, bp = b.length === 1 ? [1, b[0]] : b;
    const ok = [0, 1].map((k) => ap[k] === bp[k] || ap[k] === 1 || bp[k] === 1);
    return { a, b, ap, bp, ok, compatible: ok[0] && ok[1], r: [0, 1].map((k) => Math.max(ap[k], bp[k])) };
  }
  const va = (i, j) => 10 * i + j, vb = (i, j) => 100 * (i + 1) + 0 * j + (j + 1);

  function dibujar(paso, p) {
    const R = calc();
    const q = (k) => (paso > k ? 1 : paso === k ? p : 0);
    const S = 38, XA = 30, XB = 250, XR = 500, Y0 = 70;
    L.dibujar((g) => {
      g.texto(XA, 30, `A: ${tupla(R.a)}`, { fuente: 'mono', tam: 15, ancla: 'l', color: C.azul, peso: 600 });
      g.texto(XB, 30, `B: ${tupla(R.b)}`, { fuente: 'mono', tam: 15, ancla: 'l', color: C.rosaT, peso: 600 });
      g.texto(XB - 30, Y0 + 60, '+', { tam: 26, color: C.tinta2 });
      const est = R.compatible ? ease(tramo(q(2), 0, 0.9)) : 0;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const dentroR = i < R.r[0] && j < R.r[1];
        if (i < R.ap[0] && j < R.ap[1]) g.celda(XA + j * S, Y0 + i * S, S, S, va(i, j), { color: C.azul, fondo: 0.15 });
        else if (dentroR && est > 0) g.celda(XA + j * S, Y0 + i * S, S, S, va(R.ap[0] === 1 ? 0 : i, R.ap[1] === 1 ? 0 : j), { color: C.azul, fondo: 0.04, alfa: est, guion: [3, 3], grueso: 1, colorTexto: C.tenue });
        if (i < R.bp[0] && j < R.bp[1]) g.celda(XB + j * S, Y0 + i * S, S, S, vb(i, j), { color: C.rosa, fondo: 0.15, tam: 12 });
        else if (dentroR && est > 0) g.celda(XB + j * S, Y0 + i * S, S, S, vb(R.bp[0] === 1 ? 0 : i, R.bp[1] === 1 ? 0 : j), { color: C.rosa, fondo: 0.04, alfa: est, guion: [3, 3], grueso: 1, colorTexto: C.tenue, tam: 12 });
      }
      // Paso 2: alinear por la derecha y comparar
      if (paso >= 1) {
        const yT = 260, xc = [300, 380], qq = q(1);
        g.texto(250, yT, 'eje', { tam: 12, ancla: 'r', color: C.tenue, alfa: qq });
        g.texto(250, yT + 26, 'A', { tam: 13, ancla: 'r', color: C.azul, alfa: qq, peso: 600 });
        g.texto(250, yT + 52, R.b.length === 1 ? 'B (con un 1 por la izquierda)' : 'B', { tam: 13, ancla: 'r', color: C.rosaT, alfa: qq, peso: 600 });
        [0, 1].forEach((k) => {
          const qk = ease(tramo(qq, 0.3 * k, 0.5 + 0.3 * k));
          g.texto(xc[k], yT, k, { fuente: 'mono', tam: 12, color: C.tenue, alfa: qk });
          g.texto(xc[k], yT + 26, R.ap[k], { fuente: 'mono', tam: 16, color: C.azul, alfa: qk, peso: 600 });
          g.texto(xc[k], yT + 52, R.bp[k], { fuente: 'mono', tam: 16, color: R.b.length === 1 && k === 0 ? C.tenue : C.rosaT, alfa: qk, peso: 600 });
          g.texto(xc[k], yT + 82, R.ok[k] ? '✓ compatible' : '✗ incompatible', { tam: 12, color: R.ok[k] ? C.verdeT : C.rojoT, alfa: qk, peso: 700 });
        });
      }
      // Paso 4: el resultado
      if (paso >= 3) {
        const qq = q(3);
        g.texto(XR - 30, Y0 + 60, '=', { tam: 26, color: C.tinta2, alfa: qq });
        if (R.compatible) {
          g.texto(XR, 30, `A + B: ${tupla(R.r)}`, { fuente: 'mono', tam: 15, ancla: 'l', color: C.naranjaT, peso: 600, alfa: qq });
          for (let i = 0; i < R.r[0]; i++) for (let j = 0; j < R.r[1]; j++) {
            const qi = ease(tramo(qq, (i * R.r[1] + j) / (R.r[0] * R.r[1] + 4), (i * R.r[1] + j + 5) / (R.r[0] * R.r[1] + 4)));
            const v = va(R.ap[0] === 1 ? 0 : i, R.ap[1] === 1 ? 0 : j) + vb(R.bp[0] === 1 ? 0 : i, R.bp[1] === 1 ? 0 : j);
            g.celda(XR + j * S, Y0 + i * S, S, S, v, { color: C.naranja, fondo: 0.2, alfa: qi, tam: 12 });
          }
        } else {
          g.texto(XR, Y0 + 40, 'ValueError', { fuente: 'mono', tam: 17, ancla: 'l', color: C.rojoT, peso: 600, alfa: qq });
          g.texto(XR, Y0 + 66, 'operands could not be', { fuente: 'mono', tam: 12, ancla: 'l', color: C.rojoT, alfa: qq });
          g.texto(XR, Y0 + 84, `broadcast together with shapes`, { fuente: 'mono', tam: 12, ancla: 'l', color: C.rojoT, alfa: qq });
          g.texto(XR, Y0 + 102, `${tupla(R.a)} ${tupla(R.b)}`, { fuente: 'mono', tam: 12, ancla: 'l', color: C.rojoT, alfa: qq });
        }
      }
    });
  }

  const control = pasos(cuerpo, {
    narraciones: [
      () => `<b>Paso 1. Las formas.</b> <code>A</code> es <code>${e.A}</code> y <code>B</code> es <code>${e.B}</code>. ¿Se pueden sumar? Predícelo antes de avanzar.`,
      () => { const R = calc(); return `<b>Paso 2. Alinear por la derecha.</b> ${R.b.length === 1 || R.a.length === 1 ? 'Al arreglo con menos ejes se le añaden ejes de longitud 1 <em>por la izquierda</em>. ' : ''}Eje a eje, las longitudes deben ser iguales o una de ellas 1. ${R.compatible ? 'Aquí lo son.' : 'Aquí un eje falla.'}`; },
      () => { const R = calc(); return R.compatible
        ? '<b>Paso 3. Estirar los unos.</b> Cada eje de longitud 1 se repite hasta la longitud del otro (en gris discontinuo). NumPy no copia nada: usa <em>paso 0</em> en ese eje, así que todas las posiciones leen el mismo byte.'
        : '<b>Paso 3.</b> Un eje incompatible no se puede estirar: no existe una forma común.'; },
      () => { const R = calc(); return R.compatible
        ? `<b>Paso 4. El resultado</b> tiene en cada eje el máximo: <code>${tupla(R.r)}</code>. Solo él ocupa memoria nueva.`
        : '<b>Paso 4.</b> NumPy lanza <code>ValueError</code>. Si la intención era operar por filas, añade el eje a mano (<code>[:, None]</code>) o usa <code>keepdims=True</code> al reducir.'; },
    ],
    dibujar, duracion: 1200,
  });
  const m = mandos(cuerpo);
  const ops = FORMAS.map((f) => [f, f]);
  selector(m, { nombre: 'forma de <b style="color:var(--azul-t)">A</b>', opciones: ops, valor: e.A, alCambiar: (v) => { e.A = v; control.ir(0, false); } });
  selector(m, { nombre: 'forma de <b style="color:var(--rosa-t)">B</b>', opciones: ops, valor: e.B, alCambiar: (v) => { e.B = v; control.ir(0, false); } });
}
