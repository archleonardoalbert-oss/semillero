// El puente de Semillero dentro de la web propia de una asignatura (la incluye cada página con
// <script type="module" src="/semillero-puente.js">). La web corre aislada (origen opaco): solo habla con
// Semillero por postMessage. Envía la selección del usuario (para pedir una glosa), pinta las glosas que
// Semillero le manda y avisa al pulsar una. Fuera de Semillero (o en el visor exportado) no hace nada visible.
import { serializar, crearAncla, localizar } from '../lib/ancla.js';
import { aportar } from '../lib/resaltado.js';

const dentro = window.parent !== window;
const raiz = () => document.querySelector('main') ?? document.body;
const enviar = (m) => dentro && window.parent.postMessage({ ...m, pagina: location.pathname }, '*');

const estilo = document.createElement('style');
estilo.textContent = `
  ::highlight(glosa-explicar) { background-color: rgb(94 224 224 / 0.22); }
  ::highlight(glosa-corregir) { background-color: rgb(255 143 122 / 0.24); }
  ::highlight(glosa-viva) { background-color: rgb(230 200 110 / 0.3); }
`;
document.head.append(estilo);

// --- Tema claro / oscuro ------------------------------------------------------------------------------
// Semillero decide el tema (interruptor en su barra) y lo pasa en la URL (?tema=) y por mensaje. La web lo
// aplica con su script en línea del <head> (para no parpadear) y con estilos en :root[data-tema="oscuro"].
// Aquí se mantiene al día: data-tema, color-scheme y el evento «semillero-tema» para los motores.
const RE_TEMA = /^(claro|oscuro)$/;
const temaDelSistema = () => (matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro');
function aplicarTema(tema) {
  if (!RE_TEMA.test(tema ?? '')) return;
  const html = document.documentElement;
  const cambia = html.dataset.tema !== tema;
  html.dataset.tema = tema;
  html.style.colorScheme = tema === 'oscuro' ? 'dark' : 'light';
  if (cambia) document.dispatchEvent(new CustomEvent('semillero-tema', { detail: { tema } }));
}
aplicarTema(new URLSearchParams(location.search).get('tema') ?? document.documentElement.dataset.tema ?? temaDelSistema());
// API para la web: leer el tema y pedir cambiarlo (Semillero lo guarda y lo devuelve por mensaje).
window.semillero = Object.freeze({
  get tema() { return document.documentElement.dataset.tema; },
  cambiarTema(tema) {
    if (!RE_TEMA.test(tema ?? '')) return;
    if (dentro) enviar({ tipo: 'semillero-cambiar-tema', tema });
    else aplicarTema(tema);
  },
});

// --- Transiciones entre páginas -------------------------------------------------------------------------
// La web corre aislada y el navegador no hace @view-transition entre sus páginas: se anima la salida (con
// html[data-saliendo]) y la entrada (al cargar). Estilos por defecto con :where() (especificidad 0): la web
// los sustituye con los suyos. La duración de la salida se lee de --semillero-salida (por defecto 200ms).
const transiciones = document.createElement('style');
transiciones.textContent = `
  @media (prefers-reduced-motion: no-preference) {
    @keyframes semillero-entrada { from { opacity: 0; transform: translateY(10px); } }
    :where(html:not([data-saliendo])) :where(main) { animation: semillero-entrada 0.55s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
    :where(html[data-saliendo]) :where(main) { opacity: 0; transform: translateY(-6px); transition: opacity 0.2s ease, transform 0.2s ease; }
  }
`;
document.head.prepend(transiciones);
const menosMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
document.addEventListener('click', (e) => {
  const a = e.target.closest?.('a[href]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (a.target && a.target !== '_self') return;
  if (a.hasAttribute('download')) return;
  const url = new URL(a.href, location.href);
  const carpeta = location.pathname.replace(/[^/]*$/, '');
  if (url.host !== location.host || !url.pathname.startsWith(carpeta) || !/\.html$/.test(url.pathname)) return;
  if (url.pathname === location.pathname) return; // la misma página (anclas, href="#"): sin transición
  e.preventDefault();
  url.searchParams.set('tema', document.documentElement.dataset.tema ?? temaDelSistema());
  const css = getComputedStyle(document.documentElement).getPropertyValue('--semillero-salida').trim();
  const ms = menosMovimiento() ? 0 : Math.min(800, css.endsWith('ms') ? parseFloat(css) : css.endsWith('s') ? parseFloat(css) * 1000 : 200) || 0;
  document.documentElement.dataset.saliendo = '';
  setTimeout(() => location.assign(url.href), ms);
});
// Al volver con «atrás» (caché de páginas), la página no puede quedarse en su estado de salida.
addEventListener('pageshow', () => delete document.documentElement.dataset.saliendo);

// Selección → Semillero ofrece Explicar / Corregir.
document.addEventListener('pointerup', () => setTimeout(() => {
  const sel = getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return enviar({ tipo: 'semillero-sin-seleccion' });
  const rango = sel.getRangeAt(0);
  if (!raiz().contains(rango.commonAncestorContainer)) return;
  const fragmento = serializar(raiz(), rango);
  if (!fragmento.markdown.trim()) return;
  const r = rango.getBoundingClientRect();
  enviar({ tipo: 'semillero-seleccion', fragmento, ancla: crearAncla(raiz(), rango), rect: { x: r.left + r.width / 2, y: r.bottom } });
}, 10));

// Glosas de esta página que manda Semillero: se resaltan sin tocar el DOM de la web.
let marcadas = [];
window.addEventListener('message', (ev) => {
  if (ev.source !== window.parent) return;
  const m = ev.data;
  if (m?.tipo === 'semillero-glosas') {
    marcadas = [];
    const porNombre = { 'glosa-explicar': [], 'glosa-corregir': [], 'glosa-viva': [] };
    for (const g of m.glosas ?? []) {
      const r = localizar(raiz(), g.ancla);
      if (!r) continue;
      marcadas.push({ id: g.id, r });
      porNombre[g.estado === 'en-proceso' ? 'glosa-viva' : `glosa-${g.tipo}`]?.push(r);
    }
    aportar('puente', porNombre);
  } else if (m?.tipo === 'semillero-limpiar-seleccion') getSelection()?.removeAllRanges();
  else if (m?.tipo === 'semillero-tema') aplicarTema(m.tema);
});

// Pulsar sobre un fragmento glosado abre su glosa en Semillero.
document.addEventListener('click', (e) => {
  if (!marcadas.length || !getSelection()?.isCollapsed) return;
  const pos = document.caretPositionFromPoint?.(e.clientX, e.clientY);
  const nodo = pos?.offsetNode ?? document.caretRangeFromPoint?.(e.clientX, e.clientY)?.startContainer;
  const offset = pos?.offset ?? document.caretRangeFromPoint?.(e.clientX, e.clientY)?.startOffset;
  if (!nodo) return;
  const g = marcadas.find(({ r }) => r.isPointInRange(nodo, offset));
  if (g) enviar({ tipo: 'semillero-abrir-glosa', id: g.id });
});

document.addEventListener('keydown', (e) => e.key === 'Escape' && enviar({ tipo: 'semillero-tecla', tecla: 'Escape' }));
const avisarPagina = () => enviar({ tipo: 'semillero-pagina', titulo: document.title, tema: document.documentElement.dataset.tema });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avisarPagina);
else avisarPagina();
