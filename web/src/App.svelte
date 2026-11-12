<script>
  import { DEMO } from './lib/archivos.js';
  import { ruta, ir, enlace } from './lib/ruta.svelte.js';
  import { global } from './lib/estado.svelte.js';
  import Aviso from './componentes/Aviso.svelte';
  import Inicio from './vistas/Inicio.svelte';
  import Carpeta from './vistas/Carpeta.svelte';
  import Idea from './vistas/Idea.svelte';
  import Lista from './vistas/Lista.svelte';
  import Ajustes from './vistas/Ajustes.svelte';
  import Notas from './vistas/Notas.svelte';

  const navegar = (e, destino) => (e.preventDefault(), ir(destino));
</script>

{#if DEMO}
  <div class="demo">
    <span><b>Demo de solo lectura</b> · dos ideas reales analizadas por Claude. Lee los dictámenes, las réplicas y el árbol de germinación.</span>
    <a href="../">← Volver a Raven</a>
  </div>
{/if}

<header class="barra">
  <a class="marca" href={enlace.inicio()} onclick={(e) => navegar(e, enlace.inicio())}>
    <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 27V14m0 0c-1-4.5-5.5-6.5-9-5.5 1 4.5 4.5 6.5 9 5.5m0 0c1-4.5 5.5-6.5 9-5.5-1 4.5-4.5 6.5-9 5.5" /></svg>
    Semillero
  </a>
  <nav>
    <a href={enlace.notas()} onclick={(e) => navegar(e, enlace.notas())} class:actual={ruta.nombre === 'notas'}>Memoria</a>
    {#if !DEMO}<a href={enlace.ajustes()} onclick={(e) => navegar(e, enlace.ajustes())} class:actual={ruta.nombre === 'ajustes'}>Ajustes</a>{/if}
    <span class="conexion" class:viva={global.conectado} title={global.conectado ? 'Conectado al servidor' : 'Sin conexión con el servidor'}></span>
  </nav>
</header>

<main>
  {#if ruta.nombre === 'carpeta'}
    {#key ruta.params[0]}<Carpeta carpetaId={ruta.params[0]} />{/key}
  {:else if ruta.nombre === 'idea'}
    {#key `${ruta.params[0]}/${ruta.params[1]}`}<Idea carpetaId={ruta.params[0]} ideaId={ruta.params[1]} nodo={ruta.params[2]} />{/key}
  {:else if ruta.nombre === 'lista'}
    {#key ruta.params[0]}<Lista estado={ruta.params[0]} />{/key}
  {:else if ruta.nombre === 'ajustes'}
    <Ajustes />
  {:else if ruta.nombre === 'notas'}
    <Notas />
  {:else}
    <Inicio />
  {/if}
</main>

<Aviso />

<style>
  .demo {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1.2rem;
    align-items: center;
    justify-content: center;
    padding: 0.55rem 1rem;
    font-size: 0.9rem;
    text-align: center;
    background: color-mix(in oklab, #7c5cff 22%, var(--humus));
    border-bottom: 1px solid color-mix(in oklab, #7c5cff 45%, transparent);
  }
  .demo a { font-weight: 600; white-space: nowrap; }
  .barra {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.9rem 2rem;
    background: linear-gradient(var(--humus) 40%, transparent);
  }
  .marca {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
    font-size: var(--t1);
    letter-spacing: -0.03em;
    text-decoration: none;
    font-variation-settings: 'wdth' 85;
  }
  .marca svg {
    width: 1.5rem;
    height: 1.5rem;
    fill: none;
    stroke: var(--aceptada);
    stroke-width: 2;
    stroke-linecap: round;
  }
  nav {
    display: flex;
    align-items: center;
    gap: 1.4rem;
  }
  nav a {
    color: var(--liquen-tenue);
    text-decoration: none;
  }
  nav a:hover,
  nav a.actual {
    color: var(--liquen);
  }
  .conexion {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--rechazada);
  }
  .conexion.viva {
    background: var(--aceptada);
    box-shadow: 0 0 8px var(--aceptada);
  }
  main {
    padding: 0 2rem;
  }
  @media (max-width: 640px) {
    .barra,
    main {
      padding-inline: 1rem;
    }
  }
</style>
