<script>
  import { api } from '../lib/api.js';
  import { global } from '../lib/estado.svelte.js';
  import { ir, enlace } from '../lib/ruta.svelte.js';
  import { COLOR_ESTADO } from '../lib/estados.js';

  let { estado } = $props();

  const TITULOS = {
    aceptada: 'Ideas aceptadas',
    cambios: 'Ideas con cambios sugeridos',
    rechazada: 'Ideas rechazadas',
    'en-proceso': 'Ideas en proceso',
    aclaracion: 'Ideas que necesitan tu aclaración',
    pausada: 'Ideas pausadas',
  };

  let ideas = $state(null);
  $effect(() => {
    global.resumen; // se recarga cuando cambia algún estado
    api.ideas({ estado }).then((r) => (ideas = r));
  });

  let grupos = $derived(
    global.carpetas
      .map((c) => ({ carpeta: c, ideas: (ideas ?? []).filter((i) => i.carpetaId === c.id) }))
      .filter((g) => g.ideas.length),
  );
  const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'long' }) : '');
</script>

<header class="cabecera">
  <h1 style:--tono={COLOR_ESTADO[estado]}>{TITULOS[estado] ?? 'Ideas'}</h1>
  {#if ideas}<p>{ideas.length} {ideas.length === 1 ? 'idea' : 'ideas'}</p>{/if}
</header>

{#if ideas && !ideas.length}
  <p class="nada">No hay ideas en este estado todavía.</p>
{/if}

{#each grupos as g (g.carpeta.id)}
  <section>
    <h2><span style:background={g.carpeta.color}></span>{g.carpeta.nombre}</h2>
    <ul>
      {#each g.ideas as i (i.id)}
        <li>
          <a href={enlace.idea(i.carpetaId, i.id)} onclick={(e) => (e.preventDefault(), ir(enlace.idea(i.carpetaId, i.id)))}>
            <span class="titulo">{i.titulo}</span>
            {#if i.resumen}<span class="resumen">{i.resumen}</span>{/if}
            <time>{fecha(i.ultimoVeredicto ?? i.actualizada)}</time>
          </a>
        </li>
      {/each}
    </ul>
  </section>
{/each}

<style>
  .cabecera {
    padding: 3rem 0 1.5rem;
  }
  h1 {
    margin: 0;
    font-family: var(--serif);
    font-weight: 400;
    font-size: var(--t5);
    line-height: 1.05;
    letter-spacing: -0.01em;
    text-decoration: underline;
    text-decoration-color: var(--tono);
    text-decoration-thickness: 2px;
    text-underline-offset: 0.18em;
  }
  .cabecera p,
  .nada {
    color: var(--liquen-tenue);
  }
  section {
    max-width: 52rem;
    margin-top: 2rem;
  }
  h2 {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin: 0 0 0.5rem;
    font-size: var(--t0);
    font-weight: 600;
    color: var(--liquen-tenue);
  }
  h2 span {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 50%;
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--linea);
  }
  li {
    border-bottom: 1px solid var(--linea);
  }
  a {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.2rem 1rem;
    padding: 0.9rem 0.4rem;
    text-decoration: none;
    transition: background 0.2s;
  }
  a:hover {
    background: var(--superficie);
  }
  .titulo {
    font-family: var(--serif);
    font-size: var(--t1);
  }
  .resumen {
    grid-row: 2;
    color: var(--liquen-tenue);
    font-family: var(--serif);
    font-style: italic;
  }
  time {
    grid-row: 1;
    grid-column: 2;
    color: var(--liquen-apagado);
    font-size: var(--t-1);
  }
</style>
