<script>
  import { onMount } from 'svelte';
  import { disponer, trazo } from '../lib/arbol.js';

  // El árbol vivo de la germinación. Se arrastra para moverlo, la rueda amplía y el doble clic lo encaja.
  let { mapa, progreso, titulo, clave, alAbrirNodo, alAbrirSemilla } = $props();

  const COLOR_RECURSO = { libro: '#9ec5ff', articulo: '#f0b45a', curso: '#6fe3a5', web: '#93a69e', otro: '#93a69e' };
  const ETIQUETA_RECURSO = { libro: 'Libro', articulo: 'Artículo', curso: 'Curso', web: 'Web', otro: 'Recurso' };

  let lienzo = $state();
  let ancho = $state(1200);
  let alto = $state(800);
  let vista = $state({ x: 0, y: 0, k: 1 });
  let arrastre = null;
  let hoja = $state(null); // recurso bajo el puntero
  let encima = $state(null);

  let d = $derived(disponer(mapa));
  let recursos = $derived(new Map((mapa?.recursos ?? []).map((r) => [r.id, r])));

  // Qué nodos son nuevos para este navegador: solo esos florecen con animación.
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
    }, 4000);
    return () => clearTimeout(t);
  });
  const retraso = (n) => (nuevos.has(n.id) ? 250 + n.nivel * 260 + (n.tipo === 'incognita' ? 160 : 0) : 0);

  function estadoDe(n) {
    const e = progreso?.nodos?.[n.id]?.estado;
    if (n.tipo === 'incognita') return e === 'resuelta' || e === 'atacando' ? e : 'abierta';
    return e === 'hecho' || e === 'en-curso' ? e : 'pendiente';
  }

  function encajar() {
    const { caja } = d;
    const k = Math.min(ancho / caja.ancho, alto / caja.alto, 1.25);
    vista = { k, x: ancho / 2 - (caja.x + caja.ancho / 2) * k, y: alto / 2 - (caja.y + caja.alto / 2) * k };
  }

  onMount(() => {
    const ro = new ResizeObserver(([e]) => {
      ancho = e.contentRect.width;
      alto = e.contentRect.height;
    });
    ro.observe(lienzo);
    return () => ro.disconnect();
  });

  // Encaja al entrar y cada vez que el mapa cambia de forma.
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
    if (e.button !== 0 || e.target.closest('.nodo, .semilla')) return;
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

  const corto = (t, max = 34) => (t.length > max ? `${t.slice(0, max - 1)}…` : t);
  const ladoEtiqueta = (n) => (n.tipo === 'incognita' && n.x < 0 ? 'izquierda' : 'derecha');
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="lienzo" bind:this={lienzo} class:arrastrando={arrastre} onwheel={rueda} onpointerdown={bajar}
  onpointermove={mover} onpointerup={soltar} onpointercancel={soltar} ondblclick={(e) => !e.target.closest('.nodo') && encajar()}>
  <svg width={ancho} height={alto} role="img" aria-label="Mapa de germinación de {titulo}">
    <defs>
      <!-- En espacio de usuario: un degradado por caja no pinta trazos rectos verticales (caja de ancho 0). -->
      <linearGradient id="savia" gradientUnits="userSpaceOnUse" x1="0" y1="20" x2="0" y2={d.caja.y + 60}>
        <stop offset="0" stop-color="#3f6b57" />
        <stop offset="1" stop-color="#6fe3a5" stop-opacity="0.55" />
      </linearGradient>
      <radialGradient id="aura-semilla">
        <stop offset="0" stop-color="#6fe3a5" stop-opacity="0.35" />
        <stop offset="1" stop-color="#6fe3a5" stop-opacity="0" />
      </radialGradient>
      <filter id="brillo" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="5" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>

    <g transform="translate({vista.x} {vista.y}) scale({vista.k})">
      <!-- Suelo: un horizonte tenue bajo la semilla. -->
      <ellipse cx="0" cy="26" rx="260" ry="18" fill="url(#aura-semilla)" opacity="0.6" />
      <line x1="-420" y1="22" x2="420" y2="22" class="suelo" />

      {#each d.ramas as r (`${r.deId}-${r.aId}`)}
        {@const n = d.nodos.find((x) => x.id === r.aId)}
        <path d={trazo(r)} class="rama" class:hacia-incognita={n.tipo === 'incognita'} class:crece={nuevos.has(r.aId)}
          stroke-width={r.grosor} pathLength="1" style:--retraso="{Math.max(0, retraso(n) - 220)}ms"
          class:encendida={estadoDe(n) === 'hecho' || estadoDe(n) === 'resuelta'} />
      {/each}

      {#each d.hojas as h (`${h.nodo}-${h.recurso}`)}
        {@const r = recursos.get(h.recurso)}
        {@const n = d.nodos.find((x) => x.id === h.nodo)}
        <g class="hoja" class:brota={nuevos.has(h.nodo)} style:--retraso="{retraso(n) + 380}ms"
          transform="translate({h.x} {h.y}) rotate({h.angulo + 90})"
          onpointerenter={() => (hoja = { r, x: h.x, y: h.y })} onpointerleave={() => (hoja = null)}>
          <path d="M0 0 C -6 -6, -6 -16, 0 -22 C 6 -16, 6 -6, 0 0 Z" fill={COLOR_RECURSO[r?.tipo] ?? '#93a69e'} />
          <line x1="0" y1="0" x2="0" y2="-20" class="nervio" />
        </g>
      {/each}

      <!-- La semilla: la idea y su dictamen. -->
      <g class="semilla" role="button" tabindex="0" aria-label="Abrir el manuscrito de la idea"
        onclick={alAbrirSemilla} onkeydown={(e) => e.key === 'Enter' && alAbrirSemilla()}>
        <circle r="46" fill="url(#aura-semilla)" />
        <path d="M0 -20 C 15 -16, 20 0, 0 18 C -20 0, -15 -16, 0 -20 Z" class="cuerpo-semilla" />
        <path d="M0 -14 C 4 -6, 4 6, 0 12" class="surco" />
        <text y="50" class="titulo-semilla">{corto(titulo, 48)}</text>
        <text y="70" class="pista">Pulsa para leer la idea y su dictamen</text>
      </g>

      {#each d.nodos as n (n.id)}
        {@const e = estadoDe(n)}
        <g class="nodo {n.tipo} {e}" class:florece={nuevos.has(n.id)} class:abierto-problema={n.nodo.abierto}
          style:--retraso="{retraso(n)}ms" transform="translate({n.x} {n.y})" role="button" tabindex="0"
          aria-label="{n.tipo === 'incognita' ? 'Incógnita' : 'Estudio'}: {n.nodo.titulo}"
          onclick={(ev) => abrir(n, ev)} onkeydown={(ev) => ev.key === 'Enter' && abrir(n, ev)}
          onpointerenter={() => (encima = n.id)} onpointerleave={() => (encima = null)}>
          <g class="forma">
            {#if n.tipo === 'incognita'}
              {#if n.nodo.abierto}<circle r="27" class="halo" />{/if}
              <rect x="-13" y="-13" width="26" height="26" rx="3" transform="rotate(45)" class="cuerpo" filter={e !== 'abierta' ? 'url(#brillo)' : null} />
              <text y="5" class="signo">?</text>
            {:else}
              <circle r="17" class="cuerpo" filter={e !== 'pendiente' ? 'url(#brillo)' : null} />
              <circle r="9" class="nucleo" />
            {/if}
          </g>
          <g class="etiqueta {ladoEtiqueta(n)}">
            <text x={ladoEtiqueta(n) === 'izquierda' ? -32 : 32} y="-2" class="titulo-nodo">{encima === n.id ? n.nodo.titulo : corto(n.nodo.titulo)}</text>
            <text x={ladoEtiqueta(n) === 'izquierda' ? -32 : 32} y="16" class="sub">
              {n.tipo === 'incognita' ? (n.nodo.abierto ? 'Problema abierto' : 'Incógnita') + (n.nodo.dificultad ? ` · ${n.nodo.dificultad}` : '') : (n.nodo.duracion ?? 'Estudio')}
            </text>
          </g>
        </g>
      {/each}
    </g>
  </svg>

  {#if hoja?.r}
    <div class="aviso-hoja" style:left="{vista.x + hoja.x * vista.k}px" style:top="{vista.y + hoja.y * vista.k - 14}px">
      <span class="tipo" style:color={COLOR_RECURSO[hoja.r.tipo]}>{ETIQUETA_RECURSO[hoja.r.tipo] ?? 'Recurso'}{hoja.r.archivo ? ' · descargado' : ''}</span>
      <strong>{hoja.r.titulo}</strong>
      {#if hoja.r.autores}<span>{hoja.r.autores}{hoja.r.anio ? `, ${hoja.r.anio}` : ''}</span>{/if}
    </div>
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
    stroke: var(--linea);
    stroke-dasharray: 2 6;
  }
  .rama {
    fill: none;
    stroke: url(#savia);
    stroke-linecap: round;
    opacity: 0.85;
  }
  .rama.hacia-incognita {
    stroke: rgb(179 156 255 / 0.45);
  }
  .rama.encendida {
    opacity: 1;
    filter: drop-shadow(0 0 4px rgb(111 227 165 / 0.6));
  }
  .rama.crece {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    animation: trazar 900ms var(--curva) forwards var(--retraso);
  }
  @keyframes trazar {
    to {
      stroke-dashoffset: 0;
    }
  }
  .hoja path {
    opacity: 0.85;
  }
  .hoja .nervio {
    stroke: rgb(12 21 19 / 0.5);
    stroke-width: 0.8;
  }
  .hoja.brota {
    animation: brotar 500ms var(--curva-muelle) both var(--retraso);
  }
  @keyframes brotar {
    from {
      opacity: 0;
      scale: 0;
    }
  }
  .semilla {
    cursor: pointer;
  }
  .cuerpo-semilla {
    fill: #8a6a3d;
    stroke: #f0b45a;
    stroke-width: 1.5;
    transition: filter 0.3s;
  }
  .surco {
    fill: none;
    stroke: #f0b45a;
    stroke-width: 1;
    opacity: 0.6;
  }
  .semilla:hover .cuerpo-semilla,
  .semilla:focus-visible .cuerpo-semilla {
    filter: drop-shadow(0 0 10px #f0b45a);
  }
  .titulo-semilla {
    fill: var(--liquen);
    font-family: var(--serif);
    font-size: 19px;
    text-anchor: middle;
  }
  .pista {
    fill: var(--liquen-apagado);
    font-family: var(--sans);
    font-size: 11px;
    text-anchor: middle;
    opacity: 0;
    transition: opacity 0.3s;
  }
  .semilla:hover .pista {
    opacity: 1;
  }
  .nodo {
    cursor: pointer;
    outline: none;
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
  .nodo.florece .etiqueta {
    animation: aparecer 500ms var(--curva) both calc(var(--retraso) + 250ms);
  }
  @keyframes florecer {
    from {
      transform: scale(0) rotate(-40deg);
    }
  }
  @keyframes aparecer {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
  }
  /* Estudio: pendiente apagado, en curso con pulso, hecho encendido. */
  .estudio .cuerpo {
    fill: var(--humus);
    stroke: var(--liquen-apagado);
    stroke-width: 2;
  }
  .estudio .nucleo {
    fill: var(--linea-viva);
  }
  .estudio.en-curso .cuerpo {
    stroke: var(--proceso);
  }
  .estudio.en-curso .nucleo {
    fill: var(--proceso);
    animation: latir 1.8s ease-in-out infinite;
  }
  .estudio.hecho .cuerpo {
    fill: rgb(111 227 165 / 0.18);
    stroke: var(--aceptada);
  }
  .estudio.hecho .nucleo {
    fill: var(--aceptada);
  }
  /* Incógnita: rombo violeta; resuelta se vuelve fruto dorado. */
  .incognita .cuerpo {
    fill: rgb(179 156 255 / 0.08);
    stroke: var(--aclaracion);
    stroke-width: 2;
  }
  .incognita .signo {
    fill: var(--aclaracion);
    font-family: var(--serif);
    font-size: 17px;
    font-weight: 600;
    text-anchor: middle;
    pointer-events: none;
  }
  .incognita.atacando .cuerpo {
    fill: rgb(179 156 255 / 0.25);
    animation: latir 1.8s ease-in-out infinite;
  }
  .incognita.resuelta .cuerpo {
    fill: rgb(230 200 110 / 0.3);
    stroke: var(--pausada);
  }
  .incognita.resuelta .signo {
    fill: var(--pausada);
  }
  .halo {
    fill: none;
    stroke: var(--aclaracion);
    stroke-width: 1;
    stroke-dasharray: 3 5;
    opacity: 0.7;
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
  .titulo-nodo {
    fill: var(--liquen);
    font-family: var(--serif);
    font-size: 17px;
  }
  .sub {
    fill: var(--liquen-apagado);
    font-family: var(--sans);
    font-size: 11.5px;
  }
  .etiqueta.izquierda text {
    text-anchor: end;
  }
  .estudio.pendiente .titulo-nodo {
    fill: var(--liquen-tenue);
  }
  .aviso-hoja {
    position: absolute;
    z-index: 2;
    display: grid;
    gap: 0.1rem;
    max-width: 20rem;
    padding: 0.5rem 0.7rem;
    border: 1px solid var(--linea-viva);
    border-radius: 8px;
    background: rgb(19 31 28 / 0.95);
    transform: translate(-50%, -100%);
    pointer-events: none;
    font-size: var(--t-1);
    color: var(--liquen-tenue);
  }
  .aviso-hoja strong {
    font-family: var(--serif);
    font-weight: 500;
    font-size: 0.95rem;
    color: var(--liquen);
  }
  .aviso-hoja .tipo {
    font-size: 0.7rem;
    font-weight: 600;
  }
</style>
