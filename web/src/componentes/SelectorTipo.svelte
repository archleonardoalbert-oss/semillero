<script>
  import { catalogo, cargarTipos } from '../lib/tipos.svelte.js';

  // Elegir el tipo de un bancal: a la izquierda la lista cerrada; a la derecha, la ficha del tipo que se mira
  // (al pasar el ratón o con el foco) o del elegido: qué es, cómo se juzgarán sus ideas y ejemplos.
  let { valor = null, alElegir } = $props();

  cargarTipos();
  let mirado = $state(null);
  let ficha = $derived(catalogo.tipos.find((t) => t.id === (mirado ?? valor)) ?? null);
</script>

<div class="selector">
  <div class="lista" role="radiogroup" aria-label="Tipo del bancal" onmouseleave={() => (mirado = null)}>
    {#each catalogo.tipos as t (t.id)}
      <button type="button" role="radio" aria-checked={valor === t.id} class:elegido={valor === t.id} class:mirado={mirado === t.id}
        onmouseenter={() => (mirado = t.id)} onfocus={() => (mirado = t.id)} onblur={() => (mirado = null)} onclick={() => alElegir(t.id)}>
        {t.nombre}
      </button>
    {/each}
  </div>

  <div class="ficha" aria-live="polite">
    {#if ficha}
      <h3>{ficha.nombre}{#if valor === ficha.id}<span class="sello">elegido</span>{/if}</h3>
      <p class="resumen">{ficha.resumen}</p>
      <h4>Cómo se juzgarán sus ideas</h4>
      <ul>{#each ficha.comoJuzga as c, i (i)}<li>{c}</li>{/each}</ul>
      <h4>Ideas que encajan aquí</h4>
      <ul class="ejemplos">{#each ficha.ejemplos as e, i (i)}<li>{e}</li>{/each}</ul>
    {:else}
      <p class="guia">Elige qué clase de ideas vas a sembrar en este bancal. Cada tipo se juzga con los criterios de su campo: pasa por encima de uno para ver cómo.</p>
    {/if}
  </div>
</div>

<style>
  .selector {
    display: grid;
    grid-template-columns: minmax(12rem, 15rem) 1fr;
    gap: 1.6rem;
    margin: 1.2rem 0;
  }
  .lista {
    display: flex;
    flex-direction: column;
    border-left: 1px solid var(--linea);
  }
  .lista button {
    padding: 0.55rem 0.9rem;
    border: 0;
    border-left: 2px solid transparent;
    margin-left: -1px;
    background: none;
    color: var(--liquen-tenue);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: color 0.2s, border-color 0.2s;
  }
  .lista button.mirado,
  .lista button:hover {
    color: var(--liquen);
  }
  .lista button.elegido {
    color: var(--liquen);
    border-left-color: var(--tu);
  }
  .lista button:focus-visible {
    outline: 1px solid var(--liquen-tenue);
    outline-offset: -1px;
  }
  .ficha {
    min-height: 18rem;
  }
  h3 {
    display: flex;
    align-items: baseline;
    gap: 0.8rem;
    margin: 0;
    font-family: var(--serif);
    font-weight: 400;
    font-size: var(--t3);
  }
  .sello {
    font-family: inherit;
    font-size: 0.55em;
    font-style: italic;
    color: var(--tu);
  }
  .resumen {
    margin: 0.4rem 0 1.1rem;
    font-family: var(--serif);
    font-style: italic;
    color: var(--liquen);
  }
  h4 {
    margin: 1rem 0 0.4rem;
    font-weight: 500;
    font-size: 0.95em;
    color: var(--liquen);
  }
  ul {
    margin: 0;
    padding-left: 1.1rem;
    color: var(--liquen-tenue);
    line-height: 1.55;
  }
  li + li {
    margin-top: 0.3rem;
  }
  .ejemplos li {
    font-style: italic;
  }
  .guia {
    margin: 0;
    color: var(--liquen-tenue);
  }
  @media (max-width: 720px) {
    .selector {
      grid-template-columns: 1fr;
    }
  }
</style>
