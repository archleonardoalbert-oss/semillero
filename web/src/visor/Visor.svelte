<script>
  import { setContext } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { renderizar } from '../lib/render.js';
  import Arbol from '../componentes/Arbol.svelte';
  import LaminaLectura from './LaminaLectura.svelte';

  // Una germinación exportada, solo para leer: el árbol, los documentos de los nodos, la Visión del camino,
  // la idea y el dictamen. Nada de sesiones ni estados. Los datos vienen de datos.json, junto a la página.
  const BASE = 'idea';

  let datos = $state(null);
  let fallo = $state(null);
  fetch('datos.json')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
    .then((d) => {
      datos = d;
      document.title = d.titulo;
    })
    .catch((e) => (fallo = e.message));

  let vocab = $derived(datos?.vocab);
  setContext('vocab', () => vocab);

  let lamina = $state(null); // { nodo, desde }
  let laminaAbierta = $state(false);
  const abrirLamina = (nodo, desde) => ((lamina = { nodo, desde }), (laminaAbierta = true));
  function irANodo(id) {
    const n = datos.mapa.nodos.find((x) => x.id === id);
    if (n) abrirLamina(n, { x: innerWidth / 2, y: innerHeight / 2 });
  }

  // Panel lateral de lectura: la Visión del camino o una raíz (la idea o el dictamen).
  let panel = $state(null); // { titulo, md }
  const abrirRaiz = (id) => {
    const r = datos.raices.find((x) => x.id === id);
    if (r) panel = { titulo: r.etiqueta, md: r.md };
  };

  // El ejecutable termina cuando se cierra la última pestaña: esta conexión le dice que seguimos aquí.
  let desconectado = $state(false);
  const vivo = new EventSource('__vivo');
  vivo.onopen = () => (desconectado = false);
  vivo.onerror = () => (desconectado = vivo.readyState !== EventSource.OPEN);

  const tecla = (e) => e.key === 'Escape' && panel && (panel = null);
</script>

<svelte:window onkeydown={tecla} />

{#if datos}
  <section class="escenario">
    <div class="capa" in:fade={{ duration: 500 }}>
      <Arbol mapa={datos.mapa} progreso={{ nodos: {} }} titulo={datos.titulo} clave="exportada/{datos.titulo}"
        raices={datos.raices.map((r) => ({ id: r.id, etiqueta: r.etiqueta }))} alAbrirNodo={abrirLamina} alAbrirRaiz={abrirRaiz} />
    </div>

    <header class="cabecera">
      <p class="bancal"><span style:background={datos.bancal.color}></span>{datos.bancal.nombre}</p>
      <h1>{datos.titulo}</h1>
      <p class="fecha">Germinación exportada el {new Date(datos.exportado).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    </header>

    {#if datos.mapa.resumen}
      <nav class="acciones">
        <button class="boton discreto" onclick={() => (panel = { titulo: 'Visión del camino', md: datos.mapa.resumen })}>Visión del camino</button>
      </nav>
    {/if}

    <ul class="leyenda" aria-label="Leyenda">
      <li><span class="l-estudio"></span>Tronco: {vocab.estudio.toLowerCase()}</li>
      <li><span class="l-incognita"></span>Hoja: {vocab.hoja.toLowerCase()}</li>
      <li><span class="l-abierto"></span>Fruto: {vocab.fruto.toLowerCase()}</li>
      <li><span class="l-raiz"></span>Raíces: la idea y su dictamen</li>
      <li class="pista">Arrastra para moverte, usa la rueda para ampliar y haz doble clic para encajar</li>
    </ul>

    {#if desconectado}
      <p class="cerrado" transition:fade>El visor se ha cerrado. Vuelve a abrir el ejecutable para seguir navegando.</p>
    {/if}
  </section>

  {#if laminaAbierta && lamina}
    {#key lamina.nodo.id}
      <LaminaLectura nodo={lamina.nodo} desde={lamina.desde} mapa={datos.mapa} documento={datos.documentos[lamina.nodo.id] ?? ''} base={BASE}
        indice={datos.indices?.[lamina.nodo.id] ?? null} documentos={datos.documentos}
        alCerrar={() => (laminaAbierta = false)} alIrA={irANodo} />
    {/key}
  {/if}

  {#if panel}
    <button class="velo" aria-label="Cerrar" onclick={() => (panel = null)} transition:fade={{ duration: 200 }}></button>
    <aside class="lectura" transition:fly={{ x: -60, duration: 380, easing: cubicOut, opacity: 0 }}>
      <header><h2>{panel.titulo}</h2><button class="cerrar" onclick={() => (panel = null)} aria-label="Cerrar">×</button></header>
      <div class="manuscrito">{@html renderizar(panel.md, BASE)}</div>
    </aside>
  {/if}
{:else if fallo}
  <p class="aviso">No se pudo cargar la germinación: {fallo}</p>
{:else}
  <p class="aviso">Cargando…</p>
{/if}

<style>
  .escenario {
    position: relative;
    height: 100vh;
    min-height: 560px;
    overflow: hidden;
    background:
      radial-gradient(60% 50% at 50% 100%, rgb(111 227 165 / 0.07), transparent 70%),
      radial-gradient(40% 40% at 50% 30%, rgb(179 156 255 / 0.04), transparent 70%);
  }
  .capa {
    position: absolute;
    inset: 0;
  }
  .cabecera {
    position: absolute;
    top: 1.2rem;
    left: 2rem;
    max-width: min(34rem, 45vw);
    pointer-events: none;
  }
  .bancal {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    color: var(--liquen-tenue);
  }
  .bancal span {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
  }
  h1 {
    margin: 0.3rem 0 0.4rem;
    font-family: var(--serif);
    font-weight: 400;
    font-size: var(--t4);
    line-height: 1.05;
    text-shadow: 0 2px 20px var(--humus);
  }
  .fecha {
    margin: 0;
    color: var(--liquen-apagado);
    font-size: var(--t-1);
  }
  .acciones {
    position: absolute;
    top: 1.2rem;
    right: 2rem;
    display: flex;
    gap: 0.5rem;
    z-index: 3;
  }
  .leyenda {
    position: absolute;
    left: 2rem;
    bottom: 1.2rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1.2rem;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: var(--t-1);
    color: var(--liquen-tenue);
    pointer-events: none;
  }
  .leyenda li {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }
  .leyenda .pista {
    color: var(--liquen-apagado);
  }
  .leyenda span {
    display: inline-block;
    width: 0.8rem;
    height: 0.8rem;
  }
  .l-estudio {
    border: 2px solid #6b8f7a;
    border-radius: 50%;
  }
  .l-incognita {
    border: 1.5px solid var(--aclaracion);
    border-radius: 0 70% 0 70%;
    background: rgb(179 156 255 / 0.16);
  }
  .l-abierto {
    border: 1.5px solid #e88fb4;
    border-radius: 50%;
    background: rgb(232 143 180 / 0.2);
  }
  .l-raiz {
    border-bottom: 2px solid #8a6a3d;
    border-left: 2px solid #8a6a3d;
    border-radius: 0 0 0 70%;
  }
  .cerrado {
    position: absolute;
    top: 1.2rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 5;
    margin: 0;
    padding: 0.6rem 1.1rem;
    border: 1px solid var(--pausada);
    border-radius: 999px;
    background: var(--humus-hondo);
    color: var(--pausada);
    font-size: var(--t-1);
  }
  .velo {
    position: fixed;
    inset: 0;
    z-index: 40;
    border: 0;
    background: rgb(7 13 12 / 0.5);
  }
  .lectura {
    position: fixed;
    z-index: 41;
    top: 0;
    left: 0;
    bottom: 0;
    width: min(50rem, 94vw);
    padding: 1.4rem 2rem 3rem;
    overflow-y: auto;
    border-right: 1px solid var(--linea-viva);
    background: var(--humus);
  }
  .lectura header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .lectura h2 {
    margin: 0;
    font-family: var(--serif);
    font-weight: 400;
    font-size: var(--t3);
  }
  .cerrar {
    width: 2rem;
    height: 2rem;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--liquen-tenue);
    font-size: 1.5rem;
    cursor: pointer;
  }
  .aviso {
    padding: 3rem 2rem;
    color: var(--liquen-tenue);
  }
  @media (max-width: 900px) {
    .cabecera {
      max-width: 80vw;
    }
    .acciones {
      top: auto;
      bottom: 3.5rem;
    }
  }
</style>
