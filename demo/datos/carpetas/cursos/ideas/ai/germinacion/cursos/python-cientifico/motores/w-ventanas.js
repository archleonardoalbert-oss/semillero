// resample('W').mean() corta la serie diaria en semanas sin solapamiento; rolling(k).mean() desliza una ventana
// de k días. Con «usar como predictor» se ve la fuga: sin shift(1), la ventana incluye el día que se quiere predecir.
import { C, lienzo, pasos, mandos, deslizador, boton, plano, ejes, rng } from './motor.js';

const N = 42;

export default function (cuerpo) {
  const e = { k: 7, dia: 20, shift: false };
  const u = rng(5);
  const patron = [0.8, 0.85, 0.9, 1.0, 1.15, 1.45, 0.85];
  const v = Array.from({ length: N }, (_, i) => Math.round((22 + 0.25 * i) * patron[i % 7] + 8 * (u() - 0.5)));
  const L = lienzo(cuerpo, { alto: 360, etiqueta: 'Serie diaria, medias semanales y media móvil' });
  const P = plano({ x: 60, y: 40, w: 660, h: 250 }, { x: [-0.8, N - 0.2], y: [0, 60] });
  const semanas = Array.from({ length: N / 7 }, (_, s) => v.slice(7 * s, 7 * s + 7).reduce((a, b) => a + b, 0) / 7);
  const movil = () => v.map((_, i) => {
    const fin = e.shift ? i - 1 : i;
    return fin - e.k + 1 >= 0 ? v.slice(fin - e.k + 1, fin + 1).reduce((a, b) => a + b, 0) / e.k : NaN;
  });
  function dibujar(paso, p) {
    const q = (k) => (paso > k ? 1 : paso === k ? p : 0);
    const r = movil();
    L.dibujar((g) => {
      ejes(g, P, { marcasX: [0, 7, 14, 21, 28, 35], marcasY: [0, 20, 40, 60], fmtX: (x) => `día ${x}`, fmtY: String, nombreY: 'unidades por día' });
      if (paso >= 1) for (let s = 0; s < semanas.length; s++) if (s % 2 === 0) g.rect(P.X(7 * s - 0.5), P.caja.y, P.X(7 * s + 6.5) - P.X(7 * s - 0.5), P.caja.h, { color: C.naranja, alfa: 0.07 * q(1) });
      const ancho = P.sx * 0.62;
      const fin = e.shift ? e.dia - 1 : e.dia, ini = fin - e.k + 1;
      v.forEach((val, i) => {
        const dentro = paso >= 2 && i >= ini && i <= fin;
        const objetivo = paso >= 2 && i === e.dia;
        const h = val * Math.min(1, q(0) * 1.3);
        g.rect(P.X(i) - ancho / 2, P.Y(h), ancho, P.Y(0) - P.Y(h), { color: dentro ? C.rosa : C.azul, alfa: dentro ? 0.75 : 0.4, radio: 2 });
        if (objetivo) g.rect(P.X(i) - ancho / 2 - 2, P.Y(val) - 2, ancho + 4, P.Y(0) - P.Y(val) + 4, { color: C.tinta, relleno: false, ancho: 1.5, radio: 2 });
      });
      if (paso >= 1) semanas.forEach((m, s) => g.linea([[P.X(7 * s - 0.5), P.Y(m)], [P.X(7 * s + 6.5), P.Y(m)]], { color: C.naranjaT, ancho: 3, alfa: paso === 1 ? Math.min(1, q(1) * 6 - s) : 1 }));
      if (paso >= 2) {
        g.rect(P.X(ini - 0.5), P.caja.y + 2, P.X(fin + 0.5) - P.X(ini - 0.5), P.caja.h - 2, { color: C.rosaT, relleno: false, ancho: 1.6, radio: 4 });
        const pts = [];
        r.forEach((y, i) => { if (Number.isFinite(y) && (paso >= 3 || i <= e.dia)) pts.push([P.X(i), P.Y(y)]); });
        g.linea(pts, { color: C.rosaT, ancho: 2.2 });
        if (Number.isFinite(r[e.dia])) { g.circulo(P.X(e.dia), P.Y(r[e.dia]), 5, { color: C.rosaT }); }
        g.texto(P.X(e.dia), P.caja.y - 10, `día ${e.dia}`, { tam: 11, color: C.tinta, peso: 600 });
      }
      g.texto(P.caja.x, P.caja.y + P.caja.h + 34, paso >= 1 ? `resample("W").mean(): ${semanas.length} valores` : '', { fuente: 'mono', tam: 12, ancla: 'l', color: C.naranjaT });
      if (paso >= 2) g.texto(P.caja.x + 330, P.caja.y + P.caja.h + 34, `${e.shift ? 'shift(1).' : ''}rolling(${e.k}).mean(): ${N} valores`, { fuente: 'mono', tam: 12, ancla: 'l', color: C.rosaT });
    });
  }
  const control = pasos(cuerpo, {
    narraciones: [
      '<b>Paso 1. La serie diaria</b> de un producto, con todos los días (el calendario ya está relleno). Se ve el pico de los sábados.',
      '<b>Paso 2. <code>resample("W").mean()</code></b> corta en semanas naturales, sin solapamiento: <b>un valor por semana</b> (líneas naranjas). Cambia la frecuencia de la serie.',
      () => `<b>Paso 3. <code>${e.shift ? 'shift(1).' : ''}rolling(${e.k}).mean()</code></b> calcula, para cada día, la media de la ventana rosa. La frecuencia no cambia: <b>un valor por día</b> (los ${e.k - 1 + (e.shift ? 1 : 0)} primeros son NaN).${e.shift ? ' Con <code>shift(1)</code> la ventana termina el día <em>anterior</em>: se puede usar para predecir el día marcado.' : ' La ventana <b>incluye</b> el día marcado: si la usas para predecir ese día, le estás dando la respuesta (fuga).'}`,
      () => `<b>Paso 4. Las dos juntas.</b> Con k = 7, la media móvil borra el patrón semanal; con k = 3, lo conserva a medias. Activa «usar como predictor» y mira cómo la ventana se aparta un día.`,
    ],
    dibujar, duracion: 1500,
  });
  const m = mandos(cuerpo);
  deslizador(m, { nombre: 'k (días de la ventana)', min: 2, max: 14, valor: e.k, formato: String, alCambiar: (x) => { e.k = x; control.refrescar(); } });
  deslizador(m, { nombre: 'día marcado', min: 15, max: N - 1, valor: e.dia, formato: String, alCambiar: (x) => { e.dia = x; control.refrescar(); } });
  boton(m, 'usar como predictor (shift(1))', (x) => { e.shift = x; control.refrescar(); }, { alternar: false });
}
