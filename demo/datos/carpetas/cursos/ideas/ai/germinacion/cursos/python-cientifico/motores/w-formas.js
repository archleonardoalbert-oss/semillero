// Práctica de recuperación: predecir la forma de una expresión de NumPy (o decir que da error), con corrección
// inmediata y la regla que se aplica. Las preguntas se generan al azar con semilla: siempre hay una más.
import { el, rng } from './motor.js';

const tupla = (t) => (t.length === 1 ? `(${t[0]},)` : `(${t.join(', ')})`);

function broadcast(a, b) {
  const n = Math.max(a.length, b.length), A = Array(n - a.length).fill(1).concat(a), B = Array(n - b.length).fill(1).concat(b);
  const r = [];
  for (let k = 0; k < n; k++) {
    if (A[k] !== B[k] && A[k] !== 1 && B[k] !== 1) return { error: `el eje ${k} (alineando por la derecha) tiene ${A[k]} frente a ${B[k]}: ni iguales ni 1` };
    r.push(Math.max(A[k], B[k]));
  }
  return { forma: r, explica: `alineadas: ${tupla(A)} y ${tupla(B)}; cada eje igual o 1, y gana el mayor` };
}

function preguntaIndexado(u) {
  const d = [u.entero(2, 6), u.entero(3, 7), u.entero(2, 5)];
  const [n, m, k] = d;
  const casos = [
    () => ({ e: 'x[0]', f: [m, k], x: 'un entero elimina su eje' }),
    () => ({ e: 'x[:, 1]', f: [n, k], x: 'el entero elimina el eje 1; la rebanada «:» conserva el 0' }),
    () => ({ e: 'x[:, 1:2]', f: [n, 1, k], x: 'una rebanada conserva el eje, con la longitud del rango (1)' }),
    () => ({ e: 'x[..., 0]', f: [n, m], x: '«...» son todos los ejes que faltan; el entero elimina el último' }),
    () => ({ e: 'x[[0, 1, 1]]', f: [3, m, k], x: 'una lista de 3 enteros en el eje 0 da longitud 3 (copia)' }),
    () => ({ e: 'x.T', f: [k, m, n], x: '.T invierte el orden de TODOS los ejes' }),
    () => ({ e: `x.reshape(-1, ${k})`, f: [n * m, k], x: `−1 = «lo que haga falta»: ${n * m * k} / ${k} = ${n * m}` }),
    () => ({ e: 'x.sum(axis=1)', f: [n, k], x: 'el eje de axis desaparece' }),
    () => ({ e: 'x.mean(axis=(0, 2))', f: [m], x: 'desaparecen los ejes 0 y 2' }),
    () => ({ e: 'x.max(axis=0, keepdims=True)', f: [1, m, k], x: 'keepdims deja el eje reducido con longitud 1' }),
    () => ({ e: 'x[:, None]', f: [n, 1, m, k], x: 'None inserta un eje de longitud 1 en esa posición' }),
    () => ({ e: 'x[0, :, 1]', f: [m], x: 'dos enteros eliminan dos ejes' }),
    () => ({ e: 'np.stack([x, x])', f: [2, n, m, k], x: 'stack crea un eje nuevo (por defecto, el primero)' }),
    () => ({ e: 'np.concatenate([x, x])', f: [2 * n, m, k], x: 'concatenate pega a lo largo de un eje existente (el 0)' }),
    () => ({ e: `x @ np.ones((${k}, 7))`, f: [n, m, 7], x: '@ multiplica los dos últimos ejes; los anteriores son lote' }),
  ];
  const c = casos[u.entero(0, casos.length)]();
  return { contexto: `x = np.zeros(${tupla(d)})`, expresion: c.e, forma: c.f, explica: c.x };
}

function preguntaBroadcast(u) {
  const base = [u.entero(1, 6), u.entero(2, 6), u.entero(2, 6)];
  const nA = u.entero(1, 4), nB = u.entero(1, 4);
  const hacer = (n) => base.slice(3 - n).map((v) => (u() < 0.35 ? 1 : v));
  let A = hacer(nA), B = hacer(nB);
  if (u() < 0.3) { const k = u.entero(0, B.length); B[k] = B[k] + 1 + u.entero(0, 2); }
  const r = broadcast(A, B);
  return { contexto: `a = np.zeros(${tupla(A)})\nb = np.zeros(${tupla(B)})`, expresion: 'a + b', forma: r.forma ?? null, explica: r.error ?? r.explica };
}

function leer(texto) {
  const t = texto.trim().toLowerCase();
  if (!t) return undefined;
  if (/error|falla|no se puede/.test(t)) return null;
  const nums = t.replace(/[()[\]\s]/g, '').split(',').filter((x) => x !== '');
  if (!nums.length || nums.some((x) => !/^\d+$/.test(x))) return undefined;
  return nums.map(Number);
}

export default function (cuerpo, opciones = {}, { almacen }) {
  const nivel = opciones.nivel ?? 'indexado';
  const clave = `formas:${nivel}`;
  const marcador = almacen.leer(clave, { bien: 0, total: 0 });
  let semilla = Math.floor(Math.random() * 1e9), q;
  const caja = el('div', { class: 'drill' });
  const codigo = el('div', { class: 'q', 'aria-live': 'polite' });
  const entrada = el('input', { type: 'text', placeholder: nivel === 'broadcast' ? 'p. ej. (3, 4)  o  error' : 'p. ej. (3, 4)', 'aria-label': 'Tu respuesta: la forma' });
  const comprobar = el('button', { type: 'button', class: 'w-boton primario', texto: 'Comprobar' });
  const otra = el('button', { type: 'button', class: 'w-boton', texto: 'Otra pregunta' });
  const resultado = el('div', { class: 'w-lectura', 'aria-live': 'polite' });
  const cuenta = el('span', { class: 'w-lectura', style: 'margin:0' });
  caja.append(codigo, el('div', { class: 'fila' }, el('span', { texto: 'forma →' }), entrada, comprobar, otra, cuenta), resultado);
  cuerpo.append(caja);

  const pintarCuenta = () => { cuenta.textContent = marcador.total ? `aciertos: ${marcador.bien} de ${marcador.total}` : ''; };
  function nueva() {
    const u = rng(semilla++);
    q = nivel === 'broadcast' ? preguntaBroadcast(u) : preguntaIndexado(u);
    codigo.textContent = `${q.contexto}\n${q.expresion}   # ¿forma?`;
    entrada.value = ''; resultado.textContent = ''; comprobar.disabled = false;
  }
  function corregir() {
    const r = leer(entrada.value);
    if (r === undefined) { resultado.innerHTML = '<span class="w-error">Escribe una tupla como (3, 4), o «error».</span>'; return; }
    const ok = r === null ? q.forma === null : q.forma !== null && r.length === q.forma.length && r.every((v, k) => v === q.forma[k]);
    marcador.total++; if (ok) marcador.bien++;
    almacen.escribir(clave, marcador);
    const sol = q.forma === null ? 'ValueError (no se puede hacer broadcasting)' : tupla(q.forma);
    resultado.innerHTML = `${ok ? '<span class="w-ok">✓ Correcto.</span>' : `<span class="w-error">✗ Es ${sol}.</span>`} <span>Regla: ${q.explica}.</span>`;
    comprobar.disabled = true;
    pintarCuenta();
  }
  comprobar.addEventListener('click', corregir);
  entrada.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); if (!comprobar.disabled) corregir(); else nueva(); } });
  otra.addEventListener('click', nueva);
  nueva(); pintarCuenta();
}
