<script>
  import { untrack } from 'svelte';
  import { fade } from 'svelte/transition';
  import PanelGlosa from './PanelGlosa.svelte';
  import { documentoDeCurso } from '../lib/curso.js';

  // La web propia de una asignatura, a pantalla completa y aislada (sandbox sin mismo origen: no puede tocar
  // Semillero). Habla con Semillero solo por postMessage a través de su puente: la selección para glosar, las
  // glosas que se pintan y la página en la que está. Sin `glosas` (visor exportado) solo se lee.
  // `HojaGlosa` llega como componente desde la app para no arrastrar su estado al visor exportado.
  let { nodo, carpeta, pagina = 'index.html', glosas = null, HojaGlosa = null, base = '', aviso = null, alCerrar } = $props();

  let marco = $state();
  let titulo = $state('');
  // La página la decide el puente al cargar; hasta entonces, la pedida.
  let documentoCargado = $state(null);
  // null: aún no ha cargado (vale la pedida); false: la web está en una página que no se puede glosar.
  let documento = $derived(documentoCargado === false ? null : (documentoCargado ?? `germinacion/cursos/${nodo.id}/${pagina}`));
  let panel = $state(null); // { x, y, vistaPrevia, fragmento, ancla }
  let abierta = $state(null);
  // Solo la página inicial: después navega la propia web (y el puente avisa de dónde está).
  const src = untrack(() => `${carpeta}${pagina}`);

  function alMensaje(ev) {
    if (!marco || ev.source !== marco.contentWindow) return;
    const m = ev.data ?? {};
    if (m.tipo === 'semillero-pagina') {
      titulo = String(m.titulo ?? '');
      // La página la dice la web (no es de fiar): solo se glosa si es una página de este curso.
      documentoCargado = documentoDeCurso(m.pagina, nodo.id) ?? false;
      panel = null;
      enviarGlosas();
    } else if (m.tipo === 'semillero-seleccion' && glosas && documento) {
      const r = marco.getBoundingClientRect();
      const md = String(m.fragmento?.markdown ?? '');
      panel = {
        x: Math.min(innerWidth - 180, Math.max(180, r.left + Number(m.rect?.x ?? 0))),
        y: Math.min(innerHeight - 220, r.top + Number(m.rect?.y ?? 0) + 10),
        vistaPrevia: md.length > 220 ? `${md.slice(0, 220)}…` : md,
        fragmento: m.fragmento,
        ancla: m.ancla,
      };
    } else if (m.tipo === 'semillero-sin-seleccion') panel = null;
    else if (m.tipo === 'semillero-abrir-glosa') abierta = m.id;
    else if (m.tipo === 'semillero-tecla' && m.tecla === 'Escape') escape();
  }

  // Las glosas de la página visible, para que el puente las resalte.
  function enviarGlosas() {
    if (!glosas || !marco?.contentWindow) return;
    const lista = glosas.estado.lista
      .filter((g) => documento && g.documento === documento)
      .map((g) => ({ id: g.id, ancla: $state.snapshot(g.ancla), tipo: g.tipo, estado: g.estado }));
    marco.contentWindow.postMessage({ tipo: 'semillero-glosas', glosas: lista }, '*');
  }
  $effect(() => {
    glosas?.estado.lista;
    documento;
    enviarGlosas();
  });

  async function enviar({ tipo, prompt, profundidad }) {
    const { fragmento, ancla } = panel;
    panel = null;
    marco?.contentWindow?.postMessage({ tipo: 'semillero-limpiar-seleccion' }, '*');
    try {
      const g = await glosas.pedir({ tipo, prompt, profundidad, documento, ancla, fragmento });
      abierta = g.id;
    } catch (e) {
      glosas.alFallar?.(e);
    }
  }

  function escape() {
    if (panel) panel = null;
    else if (abierta) abierta = null;
    else alCerrar();
  }
  const tecla = (e) => e.key === 'Escape' && !document.querySelector('aside.hoja') && escape();
  let glosaAbierta = $derived(abierta ? glosas?.estado.lista.find((g) => g.id === abierta) : null);
</script>

<svelte:window onmessage={alMensaje} onkeydown={tecla} />

<div class="visor-curso" role="dialog" aria-label="Curso: {nodo.titulo}" transition:fade={{ duration: 220 }}>
  <header>
    <button class="volver" onclick={alCerrar}>
      <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" /></svg>
      {nodo.titulo}
    </button>
    {#if titulo}<span class="pagina">{titulo}</span>{/if}
    {#if aviso}<span class="aviso" title={aviso}>Borrador</span>{/if}
  </header>
  <iframe bind:this={marco} {src} title="Curso: {nodo.titulo}" sandbox="allow-scripts allow-popups"></iframe>
</div>

<!-- Las glosas van en una capa por encima del curso (que ocupa toda la pantalla). -->
<div class="capa-glosas">
  {#if panel}
    <PanelGlosa x={panel.x} y={panel.y} vistaPrevia={panel.vistaPrevia} puedeCorregir={true} alEnviar={enviar} alCerrar={() => (panel = null)} />
  {/if}
  {#if glosaAbierta && HojaGlosa}
    <HojaGlosa glosa={glosaAbierta} {glosas} {base} alCerrar={() => (abierta = null)} />
  {/if}
</div>

<style>
  .visor-curso {
    position: fixed;
    inset: 0;
    z-index: 46;
    display: flex;
    flex-direction: column;
    background: #000;
  }
  header {
    display: flex;
    align-items: center;
    gap: 1rem;
    height: 2.6rem;
    padding: 0 0.8rem;
    background: var(--humus-hondo);
    border-bottom: 1px solid var(--linea);
  }
  .volver {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.25rem 0.7rem 0.25rem 0.4rem;
    border: 1px solid var(--linea);
    border-radius: 999px;
    background: transparent;
    color: var(--liquen-tenue);
    font-size: var(--t-1);
    cursor: pointer;
  }
  .volver:hover {
    color: var(--liquen);
    border-color: var(--linea-viva);
  }
  .volver svg {
    width: 0.9rem;
    height: 0.9rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .pagina {
    overflow: hidden;
    color: var(--liquen-apagado);
    font-size: var(--t-1);
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .aviso {
    margin-left: auto;
    padding: 0.1rem 0.6rem;
    border: 1px solid var(--proceso);
    border-radius: 999px;
    color: var(--proceso);
    font-size: 0.72rem;
    cursor: help;
  }
  .capa-glosas {
    position: fixed;
    inset: 0;
    z-index: 47;
    pointer-events: none;
  }
  .capa-glosas > :global(*) {
    pointer-events: auto;
  }
  iframe {
    flex: 1;
    width: 100%;
    border: 0;
    background: #fff;
  }
</style>
