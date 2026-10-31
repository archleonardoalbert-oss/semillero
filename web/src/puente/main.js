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
const avisarPagina = () => enviar({ tipo: 'semillero-pagina', titulo: document.title });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avisarPagina);
else avisarPagina();
