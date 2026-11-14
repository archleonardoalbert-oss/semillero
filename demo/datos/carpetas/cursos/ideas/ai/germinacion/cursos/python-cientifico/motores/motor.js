// Motor común de las visualizaciones. Arquitectura: estado explícito → dibujo determinista (depende solo del estado,
// del paso y del progreso p ∈ [0, 1] de la animación del paso) → mandos que cambian el estado y redibujan.

// Los colores salen de las variables CSS del tema actual (css/curso.css). Al cambiar de tema se releen y
// todos los lienzos se redibujan; los motores que construyen HTML con colores se suscriben con alCambiarTema.
const VARS = {
  azul: '--azul', naranja: '--naranja', naranjaT: '--naranja-t', rosa: '--rosa', rosaT: '--rosa-t', verde: '--verde', verdeT: '--verde-t',
  rojo: '--rojo', rojoT: '--rojo-t', celeste: '--celeste', tinta: '--tinta', tinta2: '--tinta-2', tenue: '--tenue',
  regla: '--regla', regla2: '--regla-2', papel: '--papel', papel2: '--papel-2', carta: '--carta', carta2: '--carta-2',
};
export const C = {
  azul: '#0072b2', naranja: '#e69f00', naranjaT: '#8a5700', rosa: '#cc79a7', rosaT: '#9c4778', verde: '#009e73', verdeT: '#006e50',
  rojo: '#d55e00', rojoT: '#a84600', celeste: '#56b4e9', tinta: '#1b1e25', tinta2: '#464b57', tenue: '#666b7a',
  regla: '#d8d1c0', regla2: '#e7e1d3', papel: '#f3efe4', papel2: '#ebe6d8', carta: '#fffdf8', carta2: '#faf7ef',
};
export const oscuro = () => document.documentElement.dataset.tema === 'oscuro';
function leerColores() {
  const cs = getComputedStyle(document.documentElement);
  for (const [k, v] of Object.entries(VARS)) { const x = cs.getPropertyValue(v).trim(); if (x) C[k] = x; }
}
const alTema = new Set();
export const alCambiarTema = (fn) => { alTema.add(fn); return fn; };
let temaVisto = null;
function revisarTema() {
  const t = document.documentElement.dataset.tema ?? 'claro';
  if (t === temaVisto) return;
  temaVisto = t;
  leerColores();
  for (const fn of alTema) { try { fn(t); } catch (e) { console.error(e); } }
}
leerColores();
temaVisto = document.documentElement.dataset.tema ?? 'claro';
document.addEventListener('semillero-tema', revisarTema);
new MutationObserver(revisarTema).observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });
export const FUENTE = { mono: "'JetBrains Mono', ui-monospace, monospace", sans: "'Bricolage', system-ui, sans-serif", serif: "'Literata', Georgia, serif" };
export const quieto = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export const ease = (p) => { const x = Math.min(1, Math.max(0, p)); return x * x * (3 - 2 * x); };
export const tramo = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
export const mezclar = (a, b, p) => a + (b - a) * p;
export const limitar = (x, a, b) => Math.min(b, Math.max(a, x));

/** Generador determinista (mulberry32): la misma semilla da la misma secuencia. */
export function rng(semilla) {
  let a = (Number(semilla) * 2654435761) >>> 0;
  const u = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  u.normal = () => { const u1 = Math.max(1e-12, u()), u2 = u(); return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); };
  u.entero = (a0, b0) => a0 + Math.floor(u() * (b0 - a0));
  return u;
}

export function el(tag, atributos = {}, ...hijos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(atributos)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'texto') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const h of hijos.flat()) if (h != null) e.append(h);
  return e;
}

export function fmtBytes(b) {
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (b >= 1000 && i < u.length - 1) { b /= 1000; i++; }
  return `${b >= 100 || i === 0 ? Math.round(b) : b.toFixed(b >= 10 ? 1 : 2)} ${u[i]}`.replace('.', ',');
}
export const fmt = (x, d = 2) => (Number.isInteger(x) ? String(x) : x.toFixed(d)).replace('-', '−').replace('.', ',');

/** Lienzo HiDPI en coordenadas lógicas de `ancho` px; se reescala con el contenedor. */
export function lienzo(cont, { alto = 360, ancho = 760, etiqueta = 'Visualización' } = {}) {
  const marco = el('div', { class: 'w-lienzo' });
  const canvas = el('canvas', { role: 'img', 'aria-label': etiqueta });
  marco.append(canvas);
  cont.append(marco);
  const ctx = canvas.getContext('2d');
  let escala = 1, ultimo = null;
  const ajustar = () => {
    const w = marco.clientWidth || ancho, dpr = window.devicePixelRatio || 1;
    escala = w / ancho;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(alto * escala * dpr);
    canvas.style.height = `${alto * escala}px`;
    if (ultimo) dibujar(ultimo);
  };
  const g = pincel(ctx);
  const dibujar = (fn) => {
    ultimo = fn;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * escala, 0, 0, dpr * escala, 0, 0);
    fn(g);
  };
  if ('ResizeObserver' in window) new ResizeObserver(ajustar).observe(marco);
  alCambiarTema(() => ultimo && dibujar(ultimo));
  ajustar();
  document.fonts?.ready?.then(() => ultimo && dibujar(ultimo));
  return {
    canvas, g, ancho, get alto() { return alto; }, dibujar,
    cambiarAlto(h) { if (h !== alto) { alto = h; ajustar(); } },
    aLogico(ev) { const r = canvas.getBoundingClientRect(); return [(ev.clientX - r.left) / escala, (ev.clientY - r.top) / escala]; },
    etiquetar(t) { canvas.setAttribute('aria-label', t); },
  };
}

export function pincel(ctx) {
  const g = {
    ctx,
    rect(x, y, w, h, { color = C.tinta, relleno = true, alfa = 1, radio = 0, ancho = 1, guion = null } = {}) {
      if (alfa <= 0 || w === 0 || h === 0) return;
      ctx.save(); ctx.globalAlpha = alfa; ctx.beginPath();
      if (w < 0) { x += w; w = -w; } if (h < 0) { y += h; h = -h; }
      if (radio && ctx.roundRect) ctx.roundRect(x, y, w, h, Math.min(radio, w / 2, h / 2)); else ctx.rect(x, y, w, h);
      if (relleno) { ctx.fillStyle = color; ctx.fill(); } else { ctx.strokeStyle = color; ctx.lineWidth = ancho; if (guion) ctx.setLineDash(guion); ctx.stroke(); }
      ctx.restore();
    },
    linea(pts, { color = C.tinta, ancho = 1.5, alfa = 1, guion = null, cierre = false, relleno = null } = {}) {
      if (pts.length < 2 || alfa <= 0) return;
      ctx.save(); ctx.globalAlpha = alfa; ctx.strokeStyle = color; ctx.lineWidth = ancho; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (guion) ctx.setLineDash(guion);
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      if (cierre) ctx.closePath();
      if (relleno) { ctx.fillStyle = relleno; ctx.fill(); }
      if (ancho > 0) ctx.stroke();
      ctx.restore();
    },
    circulo(x, y, r, { color = C.tinta, relleno = true, alfa = 1, ancho = 1.5 } = {}) {
      if (alfa <= 0 || r <= 0) return;
      ctx.save(); ctx.globalAlpha = alfa; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      if (relleno) { ctx.fillStyle = color; ctx.fill(); } else { ctx.strokeStyle = color; ctx.lineWidth = ancho; ctx.stroke(); }
      ctx.restore();
    },
    flecha(x1, y1, x2, y2, { color = C.tinta, ancho = 1.5, alfa = 1, punta = 8 } = {}) {
      const L = Math.hypot(x2 - x1, y2 - y1);
      if (L < 1 || alfa <= 0) return;
      const a = Math.atan2(y2 - y1, x2 - x1), pk = Math.min(punta, L * 0.5);
      g.linea([[x1, y1], [x2 - pk * 0.8 * Math.cos(a), y2 - pk * 0.8 * Math.sin(a)]], { color, ancho, alfa });
      ctx.save(); ctx.globalAlpha = alfa; ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - pk * Math.cos(a - 0.42), y2 - pk * Math.sin(a - 0.42));
      ctx.lineTo(x2 - pk * Math.cos(a + 0.42), y2 - pk * Math.sin(a + 0.42));
      ctx.closePath(); ctx.fill(); ctx.restore();
    },
    texto(x, y, t, { color = C.tinta, tam = 13, ancla = 'c', base = 'm', fuente = 'sans', peso = 500, alfa = 1, max } = {}) {
      if (alfa <= 0 || t == null) return;
      ctx.save(); ctx.globalAlpha = alfa; ctx.fillStyle = color;
      ctx.font = `${peso} ${tam}px ${FUENTE[fuente] ?? fuente}`;
      ctx.textAlign = ancla === 'l' ? 'left' : ancla === 'r' ? 'right' : 'center';
      ctx.textBaseline = base === 't' ? 'top' : base === 'b' ? 'alphabetic' : 'middle';
      ctx.fillText(String(t), x, y, max);
      ctx.restore();
    },
    medir(t, { tam = 13, fuente = 'sans', peso = 500 } = {}) {
      ctx.save(); ctx.font = `${peso} ${tam}px ${FUENTE[fuente] ?? fuente}`; const w = ctx.measureText(String(t)).width; ctx.restore(); return w;
    },
    /** Una celda de memoria o de tabla con su valor. */
    celda(x, y, w, h, valor, { color = C.azul, alfa = 1, fondo = 0.12, tam = 13, colorTexto = C.tinta, grueso = 1.3, guion = null } = {}) {
      if (alfa <= 0) return;
      g.rect(x + 1, y + 1, w - 2, h - 2, { color, alfa: alfa * fondo, radio: 3 });
      g.rect(x + 1, y + 1, w - 2, h - 2, { color, alfa, relleno: false, ancho: grueso, radio: 3, guion });
      if (valor != null) g.texto(x + w / 2, y + h / 2 + 0.5, valor, { color: colorTexto, tam, fuente: 'mono', alfa });
    },
    recortar(x, y, w, h, fn) { ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); fn(); ctx.restore(); },
  };
  return g;
}

export function mandos(cont) { const d = el('div', { class: 'w-mandos' }); cont.append(d); return d; }

export function deslizador(cont, { nombre, min, max, paso = 1, valor, formato = (v) => fmt(v, 2), alCambiar }) {
  const out = el('output', { texto: formato(valor) });
  const inp = el('input', { type: 'range', min, max, step: paso, value: valor, 'aria-label': nombre.replace(/<[^>]+>/g, '') });
  const obj = { valor: Number(valor) };
  inp.addEventListener('input', () => { obj.valor = Number(inp.value); out.textContent = formato(obj.valor); alCambiar?.(obj.valor); });
  obj.poner = (v) => { obj.valor = v; inp.value = v; out.textContent = formato(v); };
  cont.append(el('label', {}, el('span', { class: 'nom', html: nombre }), inp, out));
  return obj;
}

export function selector(cont, { nombre, opciones, valor, alCambiar }) {
  const s = el('select', { 'aria-label': nombre.replace(/<[^>]+>/g, '') }, opciones.map(([v, t]) => el('option', { value: v, texto: t, selected: String(v) === String(valor) })));
  const obj = { valor: String(valor) };
  s.addEventListener('change', () => { obj.valor = s.value; alCambiar?.(s.value); });
  obj.poner = (v) => { obj.valor = String(v); s.value = String(v); };
  cont.append(el('label', {}, el('span', { class: 'nom', html: nombre }), s));
  return obj;
}

export function boton(cont, texto, alClic, { primario = false, alternar = null } = {}) {
  const b = el('button', { type: 'button', class: `w-boton${primario ? ' primario' : ''}`, html: texto });
  if (alternar != null) b.setAttribute('aria-pressed', String(alternar));
  b.addEventListener('click', () => {
    if (alternar != null) { const v = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(v)); alClic(v); }
    else alClic();
  });
  cont.append(b);
  return b;
}

/**
 * Pasos discretos, controlados por el estudiante: ◀ ▶ ↺, puntos para saltar y una narración por paso.
 * `dibujar(paso, p)` se llama en cada fotograma de la animación del paso (p de 0 a 1) y en reposo con p = 1.
 */
export function pasos(cont, { narraciones, dibujar, duracion = 1100 }) {
  const N = narraciones.length;
  let paso = 0, p = 1, t0 = 0, anim = 0;
  const barra = el('div', { class: 'w-pasos' });
  const ant = el('button', { type: 'button', class: 'w-boton', 'aria-label': 'Paso anterior', html: '◀' });
  const sig = el('button', { type: 'button', class: 'w-boton primario', 'aria-label': 'Paso siguiente', html: 'Paso ▶' });
  const rep = el('button', { type: 'button', class: 'w-boton', 'aria-label': 'Repetir la animación del paso', html: '↺' });
  const puntos = el('div', { class: 'puntos', role: 'group', 'aria-label': 'Ir a un paso' });
  const botones = narraciones.map((_, k) => el('button', { type: 'button', 'aria-label': `Paso ${k + 1} de ${N}`, onclick: () => ir(k) }));
  puntos.append(...botones);
  const cuenta = el('span', { class: 'w-lectura', style: 'margin:0' });
  barra.append(ant, sig, rep, puntos, cuenta);
  const narra = el('div', { class: 'w-narra', 'aria-live': 'polite' });
  cont.append(barra, narra);
  const pintar = () => dibujar(paso, ease(p));
  const bucle = (t) => {
    p = Math.min(1, (t - t0) / duracion);
    pintar();
    if (p < 1) anim = requestAnimationFrame(bucle); else anim = 0;
  };
  function ir(k, animar = true) {
    paso = limitar(k, 0, N - 1);
    botones.forEach((b, i) => { b.className = i < paso ? 'hecho' : i === paso ? 'actual' : ''; });
    ant.disabled = paso === 0; sig.disabled = paso === N - 1;
    cuenta.textContent = `${paso + 1} / ${N}`;
    const n = narraciones[paso];
    narra.innerHTML = typeof n === 'function' ? n() : n;
    if (animar) { narra.classList.remove('cambia'); void narra.offsetWidth; narra.classList.add('cambia'); }
    cancelAnimationFrame(anim);
    if (!animar || quieto()) { p = 1; pintar(); return; }
    p = 0; t0 = performance.now(); anim = requestAnimationFrame(bucle);
  }
  ant.addEventListener('click', () => ir(paso - 1));
  sig.addEventListener('click', () => ir(paso + 1));
  rep.addEventListener('click', () => ir(paso));
  barra.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { ir(paso + 1); e.preventDefault(); } if (e.key === 'ArrowLeft') { ir(paso - 1); e.preventDefault(); } });
  ir(0, false);
  return {
    get paso() { return paso; },
    ir,
    /** Redibuja en reposo (tras cambiar un mando) y refresca la narración. */
    refrescar() { cancelAnimationFrame(anim); p = 1; const n = narraciones[paso]; narra.innerHTML = typeof n === 'function' ? n() : n; pintar(); },
  };
}

/** Plano cartesiano en una caja de píxeles lógicos. */
export function plano(caja, { x: [x0, x1], y: [y0, y1] }) {
  const sx = caja.w / (x1 - x0), sy = caja.h / (y1 - y0);
  return { caja, X: (v) => caja.x + (v - x0) * sx, Y: (v) => caja.y + caja.h - (v - y0) * sy, inv: (px) => x0 + (px - caja.x) / sx, sx, sy, x0, x1, y0, y1 };
}

/** Ejes sobrios: línea base, marcas y etiquetas en tinta tenue. */
export function ejes(g, P, { marcasX = [], marcasY = [], fmtX = (v) => fmt(v, 1), fmtY = (v) => fmt(v, 1), nombreX, nombreY, rejilla = true } = {}) {
  const { x, y, w, h } = P.caja;
  if (rejilla) for (const v of marcasY) g.linea([[x, P.Y(v)], [x + w, P.Y(v)]], { color: C.regla2, ancho: 1 });
  g.linea([[x, y + h], [x + w, y + h]], { color: C.tenue, ancho: 1 });
  for (const v of marcasX) { g.linea([[P.X(v), y + h], [P.X(v), y + h + 4]], { color: C.tenue, ancho: 1 }); g.texto(P.X(v), y + h + 14, fmtX(v), { color: C.tenue, tam: 11, fuente: 'mono' }); }
  for (const v of marcasY) g.texto(x - 6, P.Y(v), fmtY(v), { color: C.tenue, tam: 11, fuente: 'mono', ancla: 'r' });
  if (nombreX) g.texto(x + w, y + h + 30, nombreX, { color: C.tinta2, tam: 12, ancla: 'r' });
  if (nombreY) g.texto(x, y - 12, nombreY, { color: C.tinta2, tam: 12, ancla: 'l' });
}

export function leyenda(cont, items) {
  const d = el('div', { class: 'w-ley' }, items.map(([color, texto, borde]) => el('span', {}, el('i', { style: `background:${borde ? 'transparent' : color};border:1.5px ${borde ?? 'solid'} ${color}` }), texto)));
  cont.append(d);
  return d;
}
