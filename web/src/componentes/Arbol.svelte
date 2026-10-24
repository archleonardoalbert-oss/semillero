<script>
  import { onMount } from 'svelte';
  import { disponer, trazo, trazoRaiz } from '../lib/arbol.js';

  // El árbol vivo de la germinación como lámina botánica: raíces (el manuscrito), tronco (lo que hay
  // que estudiar) y copa (hojas: incógnitas; frutos: problemas abiertos). Se arrastra para moverlo,
  // la rueda amplía y el doble clic lo encaja.
  let { mapa, progreso, titulo, clave, raices = [], alAbrirNodo, alAbrirRaiz } = $props();

  let lienzo = $state();
  let ancho = $state(1200);
  let alto = $state(800);
  let vista = $state({ x: 0, y: 0, k: 1 });
  let arrastre = null;
  let encima = $state(null);

  let d = $derived(disponer(mapa, { raices }));
  let porId = $derived(new Map(d.nodos.map((n) => [n.id, n])));

  // Al pasar por un nodo se ilumina lo que lo sostiene: sus dependencias, hasta el suelo.
  let camino = $derived.by(() => {
    if (!encima) return null;
    const vistos = new Set();
    const pila = [encima];
    while (pila.length) {
      const id = pila.pop();
      if (vistos.has(id)) continue;
      vistos.add(id);
      for (const dep of porId.get(id)?.nodo.depende ?? []) pila.push(dep);
    }
    return vistos;
  });

  // Qué nodos son nuevos para este navegador: solo esos crecen con animación.
  const claveVistos = `semillero:vistos:${clave}`;
  let vistos = new Set();
  try {
    vistos = new Set(JSON.parse(localStorage.getItem(claveVistos) ?? '[]'));
  } catch {
    vistos = new Set();
  }
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let nuevos = $derived(new Set(reducido ? [] : d.nodos.filter((n) => !vistos.has(n.id)).map((n) => n.id)));
  $effect(() => {
    const ids = d.nodos.map((n) => n.id);
    const t = setTimeout(() => {
      try {
        localStorage.setItem(claveVistos, JSON.stringify(ids));
      } catch {
        /* sin almacenamiento: volverá a animarse, nada más */
      }
    }, 5000);
    return () => clearTimeout(t);
  });
  const retraso = (n) => (nuevos.has(n.id) ? 300 + (n.tipo === 'estudio' ? n.nivel * 220 : 1400 + n.nivel * 260) : 0);

  function estadoDe(n) {
    const e = progreso?.nodos?.[n.id]?.estado;
    if (n.tipo === 'incognita') return e === 'resuelta' || e === 'atacando' ? e : 'abierta';
    return e === 'hecho' || e === 'en-curso' ? e : 'pendiente';
  }

  // Encaja el árbol en el hueco que dejan libre la cabecera (arriba) y la leyenda (abajo).
  const MARGEN = { arriba: 150, abajo: 70, lados: 30 };
  function encajar() {
    const { caja } = d;
    const w = ancho - 2 * MARGEN.lados;
    const h = alto - MARGEN.arriba - MARGEN.abajo;
    const k = Math.min(w / caja.ancho, h / caja.alto, 1.15);
    vista = { k, x: ancho / 2 - (caja.x + caja.ancho / 2) * k, y: MARGEN.arriba + h / 2 - (caja.y + caja.alto / 2) * k };
  }

  onMount(() => {
    const ro = new ResizeObserver(([e]) => {
      ancho = e.contentRect.width;
      alto = e.contentRect.height;
    });
    ro.observe(lienzo);
    return () => ro.disconnect();
  });

  let firma = '';
  $effect(() => {
    const f = `${d.caja.ancho}x${d.caja.alto}|${ancho}x${alto}`;
    if (f !== firma) {
      firma = f;
      encajar();
    }
  });

  function rueda(e) {
    e.preventDefault();
    const r = lienzo.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    const k = Math.min(3, Math.max(0.2, vista.k * Math.exp(-e.deltaY * 0.0015)));
    vista = { k, x: px - ((px - vista.x) * k) / vista.k, y: py - ((py - vista.y) * k) / vista.k };
  }
  function bajar(e) {
    if (e.button !== 0 || e.target.closest('.nodo, .raiz, .etiqueta')) return;
    arrastre = { x: e.clientX, y: e.clientY, vx: vista.x, vy: vista.y };
    lienzo.setPointerCapture(e.pointerId);
  }
  function mover(e) {
    if (!arrastre) return;
    vista = { ...vista, x: arrastre.vx + e.clientX - arrastre.x, y: arrastre.vy + e.clientY - arrastre.y };
  }
  const soltar = () => (arrastre = null);

  function abrir(n, e) {
    const r = e.currentTarget.getBoundingClientRect();
    alAbrirNodo(n.nodo, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
  }

  // Orientación de una hoja: apunta en la dirección de la rama que la sostiene.
  function giro(n) {
    const rama = d.ramas.find((r) => r.aId === n.id && r.clase !== 'enlace') ?? d.ramas.find((r) => r.aId === n.id);
    if (!rama) return 0;
    return (Math.atan2(n.y - rama.de.y, n.x - rama.de.x) * 180) / Math.PI + 90;
  }
  const atenuado = (id) => camino && !camino.has(id);
  let encimaNodo = $derived(encima ? porId.get(encima) : null);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="lienzo" bind:this={lienzo} class:arrastrando={arrastre} onwheel={rueda} onpointerdown={bajar}
  onpointermove={mover} onpointerup={soltar} onpointercancel={soltar} ondblclick={(e) => !e.target.closest('.nodo, .raiz') && encajar()}>
  <svg width={ancho} height={alto} role="img" aria-label="Mapa de germinación de {titulo}">
    <defs>
      <linearGradient id="savia" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={d.caja.y + 80}>
        <stop offset="0" stop-color="#5b4a33" />
        <stop offset="0.35" stop-color="#3f6b57" />
        <stop offset="1" stop-color="#6fe3a5" stop-opacity="0.7" />
      </linearGradient>
      <linearGradient id="tierra" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2a2218" stop-opacity="0.75" />
        <stop offset="1" stop-color="#0c1513" stop-opacity="0" />
      </linearGradient>
      <radialGradient id="aura-fruto">
        <stop offset="0" stop-color="#e88fb4" stop-opacity="0.35" />
        <stop offset="1" stop-color="#e88fb4" stop-opacity="0" />
      </radialGradient>
      <filter id="brillo" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="4" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>

    <g transform="translate({vista.x} {vista.y}) scale({vista.k})">
      <!-- Suelo. -->
      <rect x={d.caja.x - 400} y="0" width={d.caja.ancho + 800} height={d.caja.y + d.caja.alto + 200} fill="url(#tierra)" />
      <line x1={d.caja.x - 400} y1="0" x2={d.caja.x + d.caja.ancho + 400} y2="0" class="suelo" />

      <!-- Raíces: el manuscrito de la idea. -->
      {#each d.raices as r (r.id)}
        <g class="raiz" role="button" tabindex="0" aria-label="Abrir en el manuscrito: {r.etiqueta}"
          onclick={() => alAbrirRaiz?.(r.id)} onkeydown={(e) => e.key === 'Enter' && alAbrirRaiz?.(r.id)}>
          <path d={trazoRaiz(r)} class="trazo-raiz" />
          <circle cx={r.x} cy={r.y} r="5" class="punta" />
          <text x={r.etq.x} y={r.etq.y} class="etq-raiz">{r.etiqueta}</text>
        </g>
      {/each}

      <!-- Ramas: tronco grueso, ramas a las hojas y enlaces finos entre incógnitas. -->
      {#each d.ramas as r (`${r.deId}-${r.aId}`)}
        {@const n = porId.get(r.aId)}
        <path d={trazo(r)} class="rama {r.clase}" class:crece={nuevos.has(r.aId)} class:apagada={atenuado(r.aId)}
          class:encendida={estadoDe(n) === 'hecho' || estadoDe(n) === 'resuelta'}
          stroke-width={r.grosor} pathLength="1" style:--retraso="{Math.max(0, retraso(n) - 250)}ms" />
      {/each}

      <!-- Líneas guía de los títulos. -->
      {#each d.nodos as n (n.id)}
        <polyline points={n.etq.guia.map((p) => `${p.x},${p.y}`).join(' ')} class="guia" class:viva={encima === n.id}
          class:apagada={atenuado(n.id)} class:aparece={nuevos.has(n.id)} style:--retraso="{retraso(n) + 300}ms" />
      {/each}

      <!-- La semilla en el cuello: abre el manuscrito completo. -->
      <g class="cuello" role="button" tabindex="0" aria-label="Abrir el manuscrito de la idea"
        onclick={() => alAbrirRaiz?.(null)} onkeydown={(e) => e.key === 'Enter' && alAbrirRaiz?.(null)}>
        <path d="M0 -14 C 11 -11, 15 0, 0 13 C -15 0, -11 -11, 0 -14 Z" class="grano" />
      </g>

      {#each d.nodos as n (n.id)}
        {@const e = estadoDe(n)}
        <g class="nodo {n.forma} {e}" class:florece={nuevos.has(n.id)} class:apagada={atenuado(n.id)}
          style:--retraso="{retraso(n)}ms" transform="translate({n.x} {n.y})" role="button" tabindex="0"
          aria-label="{n.forma === 'tronco' ? 'Estudio' : n.forma === 'fruto' ? 'Problema abierto' : 'Incógnita'}: {n.nodo.titulo}"
          onclick={(ev) => abrir(n, ev)} onkeydown={(ev) => ev.key === 'Enter' && abrir(n, ev)}
          onpointerenter={() => (encima = n.id)} onpointerleave={() => (encima = null)}>
          <g class="forma">
            {#if n.forma === 'tronco'}
              <circle r="13" class="nudo" filter={e !== 'pendiente' ? 'url(#brillo)' : null} />
              <circle r="5.5" class="corazon" />
            {:else if n.forma === 'fruto'}
              <circle r="30" fill="url(#aura-fruto)" />
              <circle r="21" class="halo" />
              <path d="M0 -15 C 11 -15, 15 -4, 13 5 C 10 14, -10 14, -13 5 C -15 -4, -11 -15, 0 -15 Z" class="cuerpo-fruto" filter={e !== 'abierta' ? 'url(#brillo)' : null} />
              <path d="M0 -15 C 1 -19, 4 -21, 7 -22" class="pedunculo" />
            {:else}
              <g transform="rotate({giro(n)})">
                <path d="M0 14 C -12 4, -12 -10, 0 -20 C 12 -10, 12 4, 0 14 Z" class="cuerpo-hoja" filter={e !== 'abierta' ? 'url(#brillo)' : null} />
                <line x1="0" y1="12" x2="0" y2="-16" class="nervio" />
              </g>
            {/if}
          </g>
        </g>
        <g class="etiqueta" class:apagada={atenuado(n.id)} class:viva={encima === n.id} class:aparece={nuevos.has(n.id)}
          style:--retraso="{retraso(n) + 300}ms" role="button" tabindex="-1"
          onclick={(ev) => abrir(n, ev)} onkeydown={() => {}}
          onpointerenter={() => (encima = n.id)} onpointerleave={() => (encima = null)}>
          <text x={n.etq.x} y={n.etq.y} text-anchor={n.etq.anchor} class="titulo-nodo {n.forma}">{n.etq.texto}</text>
          <text x={n.etq.x} y={n.etq.y + 15} text-anchor={n.etq.anchor} class="sub">{n.etq.sub}</text>
        </g>
      {/each}
    </g>
  </svg>

  {#if encimaNodo && encimaNodo.etq.texto !== encimaNodo.nodo.titulo}
    <div class="titulo-completo">{encimaNodo.nodo.titulo}</div>
  {/if}
</div>

<style>
  .lienzo {
    position: absolute;
    inset: 0;
    overflow: hidden;
    cursor: grab;
    touch-action: none;
  }
  .lienzo.arrastrando {
    cursor: grabbing;
  }
  svg {
    display: block;
  }
  .suelo {
    stroke: #5b4a33;
    stroke-width: 1.5;
  }
  .trazo-raiz {
    fill: none;
    stroke: #8a6a3d;
    stroke-width: 2;
    stroke-linecap: round;
    opacity: 0.8;
    transition: stroke 0.25s, opacity 0.25s;
  }
  .punta {
    fill: #f0b45a;
    opacity: 0.85;
  }
  .etq-raiz {
    fill: var(--liquen-tenue);
    font-family: var(--sans);
    font-size: 12px;
    text-anchor: middle;
  }
  .raiz {
    cursor: pointer;
  }
  .raiz:hover .trazo-raiz,
  .raiz:focus-visible .trazo-raiz {
    stroke: #f0b45a;
    opacity: 1;
  }
  .raiz:hover .etq-raiz {
    fill: var(--claude);
  }
  .grano {
    fill: #8a6a3d;
    stroke: #f0b45a;
    stroke-width: 1.5;
  }
  .cuello {
    cursor: pointer;
  }
  .cuello:hover .grano {
    filter: drop-shadow(0 0 8px #f0b45a);
  }
  .rama {
    fill: none;
    stroke-linecap: round;
    transition: opacity 0.3s;
  }
  .rama.tronco {
    stroke: url(#savia);
  }
  .rama.rama {
    stroke: rgb(111 227 165 / 0.55);
  }
  .rama.enlace {
    stroke: rgb(179 156 255 / 0.4);
    stroke-dasharray: 0.01 0.012;
  }
  .rama.encendida {
    filter: drop-shadow(0 0 4px rgb(111 227 165 / 0.6));
  }
  .rama.crece {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    animation: trazar 1000ms var(--curva) forwards var(--retraso);
  }
  @keyframes trazar {
    to {
      stroke-dashoffset: 0;
    }
  }
  .guia {
    fill: none;
    stroke: var(--linea-viva);
    stroke-width: 0.8;
    stroke-dasharray: 2 4;
    transition: stroke 0.25s, opacity 0.25s;
  }
  .guia.viva {
    stroke: var(--liquen-tenue);
    stroke-dasharray: none;
  }
  .apagada {
    opacity: 0.22;
  }
  .aparece {
    animation: aparecer 600ms var(--curva) both var(--retraso);
  }
  @keyframes aparecer {
    from {
      opacity: 0;
    }
  }
  .nodo {
    cursor: pointer;
    outline: none;
    transition: opacity 0.3s;
  }
  .nodo .forma {
    transition: transform 0.35s var(--curva-muelle);
  }
  .nodo:hover .forma,
  .nodo:focus-visible .forma {
    transform: scale(1.18);
  }
  .nodo.florece .forma {
    animation: florecer 700ms var(--curva-muelle) both var(--retraso);
  }
  @keyframes florecer {
    from {
      transform: scale(0) rotate(-40deg);
    }
  }
  /* Tronco: nudos de la madera. */
  .nudo {
    fill: #1c2a24;
    stroke: #6b8f7a;
    stroke-width: 2;
  }
  .corazon {
    fill: #3f6b57;
  }
  .tronco.en-curso .nudo {
    stroke: var(--proceso);
  }
  .tronco.en-curso .corazon {
    fill: var(--proceso);
    animation: latir 1.8s ease-in-out infinite;
  }
  .tronco.hecho .nudo {
    stroke: var(--aceptada);
    fill: rgb(111 227 165 / 0.2);
  }
  .tronco.hecho .corazon {
    fill: var(--aceptada);
  }
  /* Hojas: incógnitas. Frutos: problemas abiertos. Lo resuelto madura en dorado. */
  .cuerpo-hoja {
    fill: rgb(179 156 255 / 0.16);
    stroke: var(--aclaracion);
    stroke-width: 1.6;
  }
  .nervio {
    stroke: var(--aclaracion);
    stroke-width: 0.8;
    opacity: 0.6;
  }
  .hoja.atacando .cuerpo-hoja,
  .fruto.atacando .cuerpo-fruto {
    animation: latir 1.8s ease-in-out infinite;
  }
  .hoja.atacando .cuerpo-hoja {
    fill: rgb(179 156 255 / 0.35);
  }
  .hoja.resuelta .cuerpo-hoja {
    fill: rgb(230 200 110 / 0.35);
    stroke: var(--pausada);
  }
  .cuerpo-fruto {
    fill: rgb(232 143 180 / 0.2);
    stroke: #e88fb4;
    stroke-width: 1.8;
  }
  .pedunculo {
    fill: none;
    stroke: #6fe3a5;
    stroke-width: 1.5;
    stroke-linecap: round;
  }
  .fruto.atacando .cuerpo-fruto {
    fill: rgb(232 143 180 / 0.4);
  }
  .fruto.resuelta .cuerpo-fruto {
    fill: rgb(230 200 110 / 0.45);
    stroke: var(--pausada);
  }
  .halo {
    fill: none;
    stroke: #e88fb4;
    stroke-width: 1;
    stroke-dasharray: 3 5;
    opacity: 0.6;
    transform-box: fill-box;
    transform-origin: center;
    animation: girar 24s linear infinite;
  }
  @keyframes girar {
    to {
      rotate: 360deg;
    }
  }
  @keyframes latir {
    50% {
      opacity: 0.45;
    }
  }
  .etiqueta {
    cursor: pointer;
    transition: opacity 0.3s;
  }
  .titulo-nodo {
    fill: var(--liquen);
    font-family: var(--serif);
    font-size: 15px;
  }
  .titulo-nodo.tronco {
    fill: var(--liquen-tenue);
  }
  .titulo-nodo.fruto {
    fill: #f2c3d6;
  }
  .etiqueta.viva .titulo-nodo {
    fill: #fff;
  }
  .sub {
    fill: var(--liquen-apagado);
    font-family: var(--sans);
    font-size: 11px;
  }
  .titulo-completo {
    position: absolute;
    left: 50%;
    bottom: 3.2rem;
    max-width: min(46rem, 80%);
    padding: 0.5rem 0.9rem;
    border: 1px solid var(--linea-viva);
    border-radius: 10px;
    background: rgb(19 31 28 / 0.95);
    color: var(--liquen);
    font-family: var(--serif);
    font-size: 1.02rem;
    text-align: center;
    transform: translateX(-50%);
    pointer-events: none;
  }
</style>
