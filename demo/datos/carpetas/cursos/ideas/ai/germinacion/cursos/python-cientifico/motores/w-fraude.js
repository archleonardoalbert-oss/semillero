// El detector de fraude del diagnóstico, con frecuencias naturales: 10 000 transacciones, cuántas son fraude,
// cuántas marca el detector y qué fracción de los positivos es fraude de verdad. Condicionar = filtrar.
import { C, lienzo, pasos, mandos, deslizador, rng, ease, tramo, mezclar, fmt } from './motor.js';

const N = 10000, COLS = 200, LADO = 3.2, X0 = 20, Y0 = 46;

export default function (cuerpo) {
  const e = { base: 0.01, sens: 0.99, espec: 0.95 };
  const L = lienzo(cuerpo, { alto: 420, etiqueta: 'Diez mil transacciones y un detector de fraude' });
  let d;
  function preparar() {
    const u = rng(11);
    const orden = Array.from({ length: N }, (_, i) => i);
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(u() * (i + 1)); [orden[i], orden[j]] = [orden[j], orden[i]]; }
    const nF = Math.round(N * e.base), tp = Math.round(nF * e.sens), fp = Math.round((N - nF) * (1 - e.espec));
    const tipo = new Uint8Array(N); // 0 legítima negativa, 1 legítima positiva (falsa alarma), 2 fraude detectado, 3 fraude no detectado
    orden.forEach((pos, k) => { tipo[pos] = k < tp ? 2 : k < nF ? 3 : k < nF + fp ? 1 : 0; });
    d = { nF, tp, fp, fn: nF - tp, tipo };
  }
  const color = (t, paso) => (paso === 0 ? (t >= 2 ? C.rojo : C.regla) : t === 2 ? C.rojo : t === 3 ? '#e9b08a' : t === 1 ? C.naranja : C.regla);

  function dibujar(paso, p) {
    const { tipo, tp, fp } = d;
    const q3 = paso >= 2 ? (paso === 2 ? p : 1) : 0;
    L.dibujar((g) => {
      g.texto(X0, 22, paso === 0 ? `10 000 transacciones: ${d.nF} son fraude (rojo)` : `el detector da positivo en ${tp + fp} (rojo intenso: fraudes detectados; naranja: falsas alarmas)`, { tam: 13, ancla: 'l', color: C.tinta });
      const ctx = g.ctx;
      for (let i = 0; i < N; i++) {
        const fila = Math.floor(i / COLS), col = i % COLS;
        const x = X0 + col * LADO * 1.12, y = Y0 + fila * LADO * 1.12;
        const t = tipo[i];
        const positivo = t === 1 || t === 2;
        ctx.fillStyle = color(t, paso);
        ctx.globalAlpha = positivo && paso >= 2 ? 1 - 0.75 * q3 : 1;
        ctx.fillRect(x, y, LADO, LADO);
      }
      ctx.globalAlpha = 1;
      if (paso >= 2) {
        // bloque de los positivos: fraudes (tp) y falsas alarmas (fp), en una cuadrícula aparte
        const total = tp + fp;
        const cols = Math.max(60, Math.ceil(total / 28)), yb = 262, lado = Math.min(4.2, 420 / (cols * 1.15));
        let iT = 0, iF = 0;
        for (let i = 0; i < N; i++) {
          const t = tipo[i];
          if (t !== 1 && t !== 2) continue;
          const k = t === 2 ? iT++ : tp + iF++;
          const fila0 = Math.floor(i / COLS), col0 = i % COLS;
          const x0 = X0 + col0 * LADO * 1.12, y0 = Y0 + fila0 * LADO * 1.12;
          const x1 = X0 + (k % cols) * lado * 1.15, y1 = yb + Math.floor(k / cols) * lado * 1.15;
          const s = ease(tramo(q3, 0.4 * (k / total), 0.6 + 0.4 * (k / total)));
          ctx.fillStyle = t === 2 ? C.rojo : C.naranja;
          ctx.fillRect(mezclar(x0, x1, s), mezclar(y0, y1, s), lado, lado);
        }
        g.texto(X0, yb - 14, `solo los ${total.toLocaleString('es')} positivos (condicionar = quedarse con ellos)`, { tam: 13, ancla: 'l', color: C.tinta, alfa: q3 });
        if (paso >= 3) {
          const pf = tp / Math.max(1, total);
          const xr = X0 + cols * lado * 1.15 + 30;
          g.texto(xr, yb + 6, 'P(fraude | positivo)', { fuente: 'mono', tam: 13, ancla: 'l', color: C.tinta, peso: 600 });
          g.texto(xr, yb + 32, `= ${tp} / (${tp} + ${fp})`, { fuente: 'mono', tam: 13, ancla: 'l', color: C.tinta2 });
          g.texto(xr, yb + 62, `= ${fmt(100 * pf, 1)} %`, { fuente: 'mono', tam: 22, ancla: 'l', color: C.rojoT, peso: 600 });
          g.texto(xr, yb + 92, `(el diagnóstico respondió ${fmt(100 * e.base * e.sens, 2)} %: es P(fraude y +),`, { tam: 11.5, ancla: 'l', color: C.tenue });
          g.texto(xr, yb + 108, 'el numerador; faltaba dividir entre P(+))', { tam: 11.5, ancla: 'l', color: C.tenue });
        }
      }
    });
    L.etiquetar(`De 10 000 transacciones, ${d.nF} son fraude; el detector marca ${tp} fraudes y ${fp} falsas alarmas; P(fraude | positivo) = ${fmt(100 * tp / Math.max(1, tp + fp), 1)} %.`);
  }

  preparar();
  const control = pasos(cuerpo, {
    narraciones: [
      () => `<b>Paso 1. La realidad.</b> Con una tasa base del ${fmt(100 * e.base, 1)} %, de 10 000 transacciones unas <b>${d.nF}</b> son fraude. En NumPy: <code>fraude = rng.random(n) &lt; ${e.base}</code>.`,
      () => `<b>Paso 2. El detector.</b> Detecta el ${fmt(100 * e.sens, 1)} % de los fraudes (${d.tp} de ${d.nF}) y da falsa alarma en el ${fmt(100 * (1 - e.espec), 1)} % de las legítimas: <b>${d.fp}</b>. Antes de seguir: de todos los positivos, ¿qué fracción crees que es fraude?`,
      () => `<b>Paso 3. Condicionar es filtrar.</b> «Sabiendo que dio positivo» significa quedarse solo con los ${d.tp + d.fp} positivos. En NumPy: <code>fraude[positivo]</code>.`,
      () => `<b>Paso 4. Contar.</b> Solo ${d.tp} de los ${d.tp + d.fp} positivos son fraude: <b>${fmt(100 * d.tp / Math.max(1, d.tp + d.fp), 1)} %</b>. Las falsas alarmas son pocas en proporción, pero se aplican a muchísimas más transacciones. Mueve la tasa base y mira cuánto cambia.`,
    ],
    dibujar, duracion: 1800,
  });
  const m = mandos(cuerpo);
  const cambia = () => { preparar(); control.refrescar(); };
  deslizador(m, { nombre: 'tasa base', min: 0.001, max: 0.2, paso: 0.001, valor: e.base, formato: (v) => `${fmt(100 * v, 1)} %`, alCambiar: (v) => { e.base = v; cambia(); } });
  deslizador(m, { nombre: 'sensibilidad', min: 0.5, max: 1, paso: 0.005, valor: e.sens, formato: (v) => `${fmt(100 * v, 1)} %`, alCambiar: (v) => { e.sens = v; cambia(); } });
  deslizador(m, { nombre: 'especificidad', min: 0.8, max: 0.999, paso: 0.001, valor: e.espec, formato: (v) => `${fmt(100 * v, 1)} %`, alCambiar: (v) => { e.espec = v; cambia(); } });
}
