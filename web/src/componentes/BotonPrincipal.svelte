<script>
  import { fly } from 'svelte/transition';
  import { modoBoton, TEXTO_BOTON } from '../lib/boton.js';

  let { cola, pausadas = 0, alPulsar } = $props();
  let modo = $derived(modoBoton({ cola, pausadas }));
  let activas = $derived((cola?.ejecutando?.length ?? 0) + (cola?.enCola?.length ?? 0));
</script>

<button class="principal {modo}" onclick={() => alPulsar(modo)}>
  <span class="anillo" aria-hidden="true"></span>
  <span class="texto">
    {#key modo}
      <span in:fly={{ y: 14, duration: 380, delay: 120 }} out:fly={{ y: -14, duration: 220 }}>{TEXTO_BOTON[modo]}</span>
    {/key}
  </span>
  {#if modo === 'detener'}
    <span class="cuenta">{cola.ejecutando.length} en marcha{cola.enCola.length ? `, ${cola.enCola.length} en cola` : ''}</span>
  {:else if modo === 'reanudar'}
    <span class="cuenta">{pausadas} {pausadas === 1 ? 'pausada' : 'pausadas'}{activas ? `, ${activas} en marcha` : ''}</span>
  {/if}
</button>

<style>
  .principal {
    --tono: var(--liquen);
    position: relative;
    display: grid;
    justify-items: start;
    gap: 2px;
    min-width: 17rem;
    padding: 1.05rem 1.6rem 1.05rem 3.6rem;
    border: 1px solid color-mix(in srgb, var(--tono) 45%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--tono) 9%, var(--humus-hondo));
    cursor: pointer;
    text-align: left;
    transition: border-color 0.4s, background 0.4s, transform 0.25s var(--curva-muelle), box-shadow 0.4s;
    box-shadow: 0 0 0 0 transparent, 0 20px 60px -20px color-mix(in srgb, var(--tono) 45%, transparent);
  }
  .principal:hover {
    transform: translateY(-2px);
    border-color: var(--tono);
  }
  .principal:active {
    transform: scale(0.98);
  }
  .principal.detener {
    --tono: var(--proceso);
  }
  .principal.reanudar {
    --tono: var(--pausada);
  }
  .texto {
    display: grid;
    font-size: var(--t1);
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--tono);
    transition: color 0.4s;
  }
  .texto > span {
    grid-area: 1 / 1;
  }
  .cuenta {
    font-size: var(--t-1);
    color: var(--liquen-tenue);
  }
  /* Una semilla que germina: gira mientras hay sesiones trabajando. */
  .anillo {
    position: absolute;
    left: 1.2rem;
    top: 50%;
    width: 1.5rem;
    height: 1.5rem;
    margin-top: -0.75rem;
    border-radius: 50%;
    border: 2px solid var(--tono);
    border-right-color: transparent;
    transition: border-color 0.4s;
  }
  .detener .anillo {
    animation: girar 1.4s linear infinite;
  }
  .comenzar .anillo {
    border-right-color: var(--tono);
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
  }
  .reanudar .anillo {
    border-radius: 3px;
    border-width: 0 5px;
    border-color: var(--tono);
    width: 1.1rem;
    margin-left: 0.2rem;
  }
  @keyframes girar {
    to {
      transform: rotate(360deg);
    }
  }
</style>
