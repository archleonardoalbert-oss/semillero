<script>
  import { onMount, tick } from 'svelte';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { expandirRango, serializar, crearAncla, localizar } from '../lib/ancla.js';
  import { aportar, retirar } from '../lib/resaltado.js';
  import { avisar } from '../lib/estado.svelte.js';
  import PanelGlosa from './PanelGlosa.svelte';
  import TarjetaGlosa from './TarjetaGlosa.svelte';
  import HojaGlosa from './HojaGlosa.svelte';

  // Un documento renderizado en el que se puede seleccionar cualquier cosa (texto, fórmulas, imágenes)
  // para pedir que Claude la explique o corregirla. Las glosas quedan ancladas al fragmento.
  // `desfase`: distancia (rem) del borde derecho de este bloque al margen de la página.
  let { html, documento, autor, glosas, base, bloqueado = false, desfase = 2.5, flotante = false, alCitar = null } = $props();

  const yo = {};
  const ANCHO_MARGEN = '(min-width: 1710px)';
  let raiz = $state();
  let contenido = $state();
  let panel = $state(null);
  let posiciones = $state([]);
  let huerfanas = $state([]);
  let alturas = $state({});
  let abierta = $state(null);
  let anchoSuficiente = $state(matchMedia(ANCHO_MARGEN).matches);
  let margen = $derived(anchoSuficiente && !flotante);

  let mias = $derived(glosas.estado.lista.filter((g) => g.documento === documento));
  let glosaAbierta = $derived(mias.find((g) => g.id === abierta) ?? null);

  // Las tarjetas bajan lo justo para no solaparse; la guía las une a su fragmento.
  let colocadas = $derived.by(() => {
    let suelo = -Infinity;
    return posiciones.map((p) => {
      const y = Math.max(p.top, suelo + 12);
      suelo = y + (alturas[p.glosa.id] ?? 110);
      return { ...p, y };
    });
  });

  function ubicar() {
    if (!contenido) return;
    const origen = contenido.getBoundingClientRect();
    for (const img of contenido.querySelectorAll('img.glosada')) img.classList.remove('glosada');
    const ps = [];
    const hs = [];
    const res = { 'glosa-explicar': [], 'glosa-corregir': [], 'glosa-viva': [], 'glosa-foco': [] };
    for (const g of mias) {
      const r = localizar(contenido, g.ancla);
      if (!r) {
        hs.push(g);
        continue;
      }
      const caja = r.getBoundingClientRect();
      ps.push({ glosa: g, top: caja.top - origen.top, rango: r });
      res[g.estado === 'en-proceso' ? 'glosa-viva' : `glosa-${g.tipo}`].push(r);
      if (g.id === abierta) res['glosa-foco'].push(r);
      // Las imágenes no se pueden resaltar con la API: se marcan con una clase.
      for (const img of contenido.querySelectorAll('img')) if (r.intersectsNode(img)) img.classList.add('glosada');
    }
    aportar(yo, res);
    posiciones = ps.sort((a, b) => a.top - b.top);
    huerfanas = hs;
  }

  $effect(() => {
    html;
    mias;
    abierta;
    tick().then(ubicar);
  });

  onMount(() => {
    const mq = matchMedia(ANCHO_MARGEN);
    const alCambiarAncho = () => (anchoSuficiente = mq.matches);
    mq.addEventListener('change', alCambiarAncho);
    const ro = new ResizeObserver(() => ubicar());
    ro.observe(contenido);
    document.fonts?.ready.then(ubicar);
    const alCargar = () => ubicar();
    contenido.addEventListener('load', alCargar, true);
    const fuera = (e) => panel && !raiz.contains(e.target) && (panel = null);
    document.addEventListener('pointerdown', fuera);
    return () => {
      mq.removeEventListener('change', alCambiarAncho);
      ro.disconnect();
      contenido?.removeEventListener('load', alCargar, true);
      document.removeEventListener('pointerdown', fuera);
      retirar(yo);
    };
  });

  function abrirPanel(rango) {
    if (!rango) return;
    const caja = rango.getBoundingClientRect();
    const origen = raiz.getBoundingClientRect();
    const fragmento = serializar(contenido, rango);
    if (!fragmento.markdown) return;
    panel = {
      x: Math.min(Math.max(caja.left + caja.width / 2 - origen.left, 120), origen.width - 120),
      y: caja.bottom - origen.top + 12,
      rango,
      vistaPrevia: fragmento.markdown.length > 220 ? `${fragmento.markdown.slice(0, 220)}…` : fragmento.markdown,
    };
  }

  function alSoltar() {
    if (bloqueado) return;
    // Tras el pointerup la selección ya está asentada.
    setTimeout(() => {
      const sel = getSelection();
      if (!sel.rangeCount || sel.isCollapsed) return;
      const r = sel.getRangeAt(0);
      if (!contenido.contains(r.commonAncestorContainer)) return;
      abrirPanel(expandirRango(contenido, r));
    });
  }

  function puntoEn(e) {
    if (document.caretPositionFromPoint) {
      const p = document.caretPositionFromPoint(e.clientX, e.clientY);
      return p && [p.offsetNode, p.offset];
    }
    const r = document.caretRangeFromPoint?.(e.clientX, e.clientY);
    return r && [r.startContainer, r.startOffset];
  }

  function alClic(e) {
    if (!getSelection().isCollapsed) return;
    // Una imagen, figura o fórmula se selecciona entera con un solo clic.
    const pieza = e.target.closest('figure, img, .katex-display, .katex');
    if (pieza && contenido.contains(pieza) && !bloqueado) {
      const r = document.createRange();
      r.selectNode(pieza);
      const ampliado = expandirRango(contenido, r);
      getSelection().removeAllRanges();
      getSelection().addRange(ampliado);
      abrirPanel(ampliado);
      return;
    }
    // Un clic sobre un fragmento glosado abre su glosa.
    const punto = puntoEn(e);
    if (!punto) return;
    const p = posiciones.find((x) => x.rango.isPointInRange(...punto));
    if (p) abierta = p.glosa.id;
  }

  async function enviar({ tipo, prompt, profundidad }) {
    const { rango } = panel;
    const datos = { tipo, prompt, profundidad, documento, ancla: crearAncla(contenido, rango), fragmento: serializar(contenido, rango) };
    panel = null;
    getSelection().removeAllRanges();
    try {
      const g = await glosas.pedir(datos);
      if (!margen) abierta = g.id;
    } catch (e) {
      const texto = {
        'en-proceso': 'Espera a que termine el análisis de esta idea para glosarla.',
        cuota: 'La investigación está pausada por cuota: las glosas también esperan.',
      }[e.message];
      avisar(texto ?? `No se pudo glosar: ${e.message}`, 'error');
    }
  }
</script>

<div class="glosable" bind:this={raiz} style:--desfase="{desfase}rem">
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="manuscrito contenido" bind:this={contenido} onpointerup={alSoltar} onclick={alClic} onkeyup={(e) => e.shiftKey && alSoltar()}>
    {@html html}
  </div>

  {#if margen}
    <div class="margen" aria-label="Glosas">
      {#each colocadas as p (p.glosa.id)}
        <span class="guia {p.glosa.tipo}" style:top="{p.top + 11}px" style:--caida="{p.y - p.top}px"></span>
        <div class="sitio" style:top="{p.y}px" bind:clientHeight={alturas[p.glosa.id]}
          in:fly={{ x: 24, duration: 420, easing: cubicOut }}>
          <TarjetaGlosa glosa={p.glosa} {glosas} {base} activa={abierta === p.glosa.id} alAbrir={() => (abierta = p.glosa.id)} />
        </div>
      {/each}
    </div>
  {:else}
    {#each posiciones as p, i (p.glosa.id)}
      <button class="marca {p.glosa.tipo}" class:viva={p.glosa.estado === 'en-proceso'} style:top="{p.top}px"
        onclick={() => (abierta = p.glosa.id)} aria-label="Abrir glosa {i + 1}">{i + 1}</button>
    {/each}
  {/if}

  {#if huerfanas.length}
    <div class="huerfanas">
      <p>Glosas sobre fragmentos que ya no están en este texto</p>
      {#each huerfanas as g (g.id)}
        <TarjetaGlosa glosa={g} {glosas} {base} alAbrir={() => (abierta = g.id)} />
      {/each}
    </div>
  {/if}

  {#if panel}
    <PanelGlosa x={panel.x} y={panel.y} vistaPrevia={panel.vistaPrevia} puedeCorregir={autor === 'claude'}
      alEnviar={enviar} alCerrar={() => (panel = null)}
      alCitar={alCitar ? () => (alCitar(serializar(contenido, panel.rango).markdown), (panel = null), getSelection().removeAllRanges()) : null} />
  {/if}
</div>

{#if glosaAbierta}
  <HojaGlosa glosa={glosaAbierta} {glosas} {base} alCerrar={() => (abierta = null)} />
{/if}

<style>
  .glosable {
    position: relative;
  }
  .contenido :global(img),
  .contenido :global(.katex-display),
  .contenido :global(.katex) {
    cursor: pointer;
  }
  .contenido :global(img.glosada) {
    outline: 2px solid rgb(94 224 224 / 0.45);
    outline-offset: 4px;
  }
  .margen {
    position: absolute;
    top: 0;
    left: calc(100% + var(--desfase));
    width: 20rem;
  }
  .sitio {
    position: absolute;
    left: 0;
    width: 100%;
    transition: top 0.45s var(--curva);
  }
  /* Hilo fino desde el fragmento hasta su tarjeta. */
  .guia {
    position: absolute;
    left: calc(-1 * var(--desfase) + 0.4rem);
    width: calc(var(--desfase) - 0.4rem);
    height: max(1px, var(--caida));
    border-top: 1px dashed var(--acento);
    border-right: 1px dashed var(--acento);
    border-top-right-radius: 8px;
    opacity: 0.45;
    pointer-events: none;
    transition: top 0.45s var(--curva), height 0.45s var(--curva);
  }
  .explicar {
    --acento: var(--explicar);
  }
  .corregir {
    --acento: var(--corregir);
  }
  .marca {
    position: absolute;
    right: calc(-1 * var(--desfase) + 0.3rem);
    width: 1.5rem;
    height: 1.5rem;
    border: 1px solid var(--acento);
    border-radius: 50%;
    background: var(--humus);
    color: var(--acento);
    font-family: var(--sans);
    font-size: 0.7rem;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.2s var(--curva-muelle);
  }
  .marca:hover {
    transform: scale(1.15);
  }
  .marca.viva {
    animation: latir 1.3s ease-in-out infinite;
  }
  @keyframes latir {
    50% {
      box-shadow: 0 0 12px var(--acento);
    }
  }
  .huerfanas {
    display: grid;
    gap: 0.6rem;
    margin-top: 1.5rem;
    max-width: 30rem;
  }
  .huerfanas p {
    margin: 0;
    font-size: var(--t-1);
    color: var(--liquen-apagado);
  }
</style>
