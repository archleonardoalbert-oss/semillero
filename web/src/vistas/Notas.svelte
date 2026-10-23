<script>
  import { api } from '../lib/api.js';
  import { renderizar } from '../lib/render.js';
  import { global } from '../lib/estado.svelte.js';

  let globales = $state('');
  let porCarpeta = $state([]);
  const util = (t) => t.replace(/^# .*\n/, '').trim();

  api.notasGlobales().then((r) => (globales = r.texto));
  $effect(() => {
    const cs = global.carpetas;
    Promise.all(cs.map(async (c) => ({ carpeta: c, texto: (await api.notasCarpeta(c.id)).texto }))).then((r) => (porCarpeta = r));
  });
</script>

<div class="pagina">
  <h1>Memoria</h1>
  <p class="intro">Lo que las sesiones de Claude han ido anotando para recordarlo en análisis futuros.</p>

  <section>
    <h2>Notas globales</h2>
    {#if util(globales)}
      <div class="manuscrito">{@html renderizar(globales)}</div>
    {:else}
      <p class="vacio">Todavía no hay notas globales.</p>
    {/if}
  </section>

  {#each porCarpeta.filter((p) => util(p.texto)) as p (p.carpeta.id)}
    <section>
      <h2><span style:background={p.carpeta.color}></span>{p.carpeta.nombre}</h2>
      <div class="manuscrito">{@html renderizar(p.texto.replace(/^# .*\n/, ''))}</div>
    </section>
  {/each}
</div>

<style>
  .pagina {
    max-width: 46rem;
    padding: 3rem 0 6rem;
  }
  h1 {
    margin: 0;
    font-family: var(--serif);
    font-weight: 400;
    font-size: var(--t5);
  }
  .intro,
  .vacio {
    color: var(--liquen-tenue);
  }
  section {
    margin-top: 2.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--linea);
  }
  h2 {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-family: var(--serif);
    font-weight: 400;
    font-size: var(--t3);
    margin: 0 0 0.6rem;
  }
  h2 span {
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;
  }
</style>
