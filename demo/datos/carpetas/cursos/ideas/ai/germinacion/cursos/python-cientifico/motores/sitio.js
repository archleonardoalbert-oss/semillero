// Comportamiento común de todas las páginas: progreso (bytes visitados), índice de la página, predicciones,
// autoexplicaciones, botón de copiar y carga de los motores de visualización. Funciona sin almacenamiento.

const almacen = {
  leer(k, def) { try { const v = localStorage.getItem(`pyc:${k}`); return v == null ? def : JSON.parse(v); } catch { return def; } },
  escribir(k, v) { try { localStorage.setItem(`pyc:${k}`, JSON.stringify(v)); } catch { /* sin almacenamiento: no pasa nada */ } },
};

// 0. Ambiente: el fondo vivo, la escena de la portada, el interruptor de tema y la barra de lectura
const lienzoFondo = document.getElementById('fondo');
if (lienzoFondo) import('./fondo.js').then((m) => m.iniciarFondo(lienzoFondo)).catch((e) => console.error('fondo:', e));
const escena = document.querySelector('[data-heroe]');
if (escena) import('./heroe.js').then((m) => m.default(escena)).catch((e) => console.error('portada:', e));

const interruptor = document.querySelector('.interruptor');
interruptor?.addEventListener('click', () => {
  const nuevo = document.documentElement.dataset.tema === 'oscuro' ? 'claro' : 'oscuro';
  if (window.semillero?.cambiarTema) window.semillero.cambiarTema(nuevo);
  else { document.documentElement.dataset.tema = nuevo; document.dispatchEvent(new CustomEvent('semillero-tema', { detail: { tema: nuevo } })); }
});
const rotularInterruptor = () => interruptor?.setAttribute('aria-label', document.documentElement.dataset.tema === 'oscuro' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
rotularInterruptor();
new MutationObserver(rotularInterruptor).observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });

const progreso = document.querySelector('.barra .progreso');
if (progreso) {
  let pend = false;
  const medir = () => {
    pend = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progreso.style.setProperty('--leido', max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : '0');
  };
  window.addEventListener('scroll', () => { if (!pend) { pend = true; requestAnimationFrame(medir); } }, { passive: true });
  medir();
}

// Revelado discreto al entrar en pantalla, una sola vez (las secciones, motores y figuras; no cada párrafo)
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const io = new IntersectionObserver((entradas) => {
    for (const en of entradas) if (en.isIntersecting) { en.target.classList.add('visto'); io.unobserve(en.target); }
  }, { rootMargin: '0px 0px -6% 0px' });
  for (const n of document.querySelectorAll('.texto > h2, .texto > .widget, .texto > figure, .texto > .predice, .texto > .autoexp, .texto > .caja.umbral, .pie')) {
    const r = n.getBoundingClientRect();
    if (r.top < window.innerHeight) continue;          // lo que ya se ve al cargar no se esconde
    n.classList.add('aparece'); io.observe(n);
  }
}

// 1. Bytes del programa: visitados y actual
const pieza = document.body.dataset.pieza;
const vistos = new Set(almacen.leer('vistos', []));
vistos.add(pieza);
almacen.escribir('vistos', [...vistos]);
for (const b of document.querySelectorAll('.tira .byte')) if (vistos.has(b.dataset.pieza)) b.classList.add('visto');
document.querySelector('.tira .actual')?.scrollIntoView?.({ block: 'nearest', inline: 'center' });

// 2. Índice de la página: la sección en pantalla y las ya leídas
const enlaces = new Map([...document.querySelectorAll('.rail a[data-seccion]')].map((a) => [a.dataset.seccion, a]));
if (enlaces.size && 'IntersectionObserver' in window) {
  const secciones = [...enlaces.keys()].map((id) => document.getElementById(id)).filter(Boolean);
  const marcar = () => {
    const y = window.scrollY + window.innerHeight * 0.3;
    let actual = null;
    for (const s of secciones) if (s.offsetTop <= y) actual = s.id;
    for (const [id, a] of enlaces) {
      const s = document.getElementById(id);
      a.classList.toggle('aqui', id === actual);
      a.classList.toggle('leido', s.offsetTop < y && id !== actual);
    }
  };
  let pendiente = false;
  window.addEventListener('scroll', () => { if (!pendiente) { pendiente = true; requestAnimationFrame(() => { pendiente = false; marcar(); }); } }, { passive: true });
  marcar();
}

// 3. Predice antes de ver: elegir una opción la marca y abre la explicación
for (const caja of document.querySelectorAll('.predice')) {
  const correcta = Number(caja.dataset.correcta);
  const botones = [...caja.querySelectorAll('ol.opciones button')];
  const revela = caja.querySelector('details.revela');
  const clave = `pred:${pieza}:${[...document.querySelectorAll('.predice')].indexOf(caja)}`;
  const elegir = (i, guardar = true) => {
    botones.forEach((b, k) => {
      b.classList.remove('bien', 'mal');
      b.querySelector('.marca-r')?.remove();
      const marca = document.createElement('span');
      marca.className = 'marca-r';
      if (k === correcta) { b.classList.add('bien'); marca.textContent = k === i ? '✓ tu respuesta, correcta' : '✓ correcta'; b.append(marca); }
      else if (k === i) { b.classList.add('mal'); marca.textContent = '✗ tu respuesta'; b.append(marca); }
      b.setAttribute('aria-pressed', String(k === i));
    });
    if (revela) revela.open = true;
    if (guardar) almacen.escribir(clave, i);
  };
  botones.forEach((b, i) => b.addEventListener('click', () => elegir(i)));
  const previa = almacen.leer(clave, null);
  if (previa != null && botones[previa]) elegir(previa, false);
}

// 4. Autoexplicación: el texto se conserva entre visitas si hay almacenamiento
document.querySelectorAll('.autoexp textarea').forEach((t, i) => {
  const clave = `auto:${pieza}:${i}`;
  t.value = almacen.leer(clave, '');
  t.addEventListener('input', () => almacen.escribir(clave, t.value));
});

// 5. Copiar código (el portapapeles puede no estar disponible en un origen aislado: entonces se selecciona)
for (const b of document.querySelectorAll('.codigo .copiar')) {
  b.addEventListener('click', async () => {
    const codigo = b.parentElement.querySelector('code');
    try { await navigator.clipboard.writeText(codigo.innerText); b.textContent = '✓ copiado'; b.classList.add('hecho'); }
    catch {
      const r = document.createRange(); r.selectNodeContents(codigo);
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'seleccionado';
    }
    setTimeout(() => { b.textContent = 'copiar'; b.classList.remove('hecho'); }, 1600);
  });
}

// 6. Motores de visualización: cada figura.widget carga motores/w-<nombre>.js
for (const fig of document.querySelectorAll('figure.widget[data-widget]')) {
  const cuerpo = fig.querySelector('.w-cuerpo');
  const nombre = fig.dataset.widget;
  let opciones = {};
  try { opciones = JSON.parse(fig.dataset.opciones || '{}'); } catch { opciones = {}; }
  import(`./w-${nombre}.js`)
    .then((m) => { cuerpo.textContent = ''; m.default(cuerpo, opciones, { almacen, figura: fig }); })
    .catch((e) => {
      cuerpo.innerHTML = '<p class="w-error">No se pudo iniciar esta visualización.</p>';
      console.error(`motor ${nombre}:`, e);
    });
}
