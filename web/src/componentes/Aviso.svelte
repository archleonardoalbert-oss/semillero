<script>
  import { fly } from 'svelte/transition';
  import { global } from '../lib/estado.svelte.js';

  let temporizador;
  $effect(() => {
    const a = global.aviso;
    clearTimeout(temporizador);
    // Las pausas por cuota se quedan hasta que el usuario las cierre.
    if (a && a.tipo !== 'pausa') temporizador = setTimeout(() => (global.aviso = null), 5000);
  });
</script>

{#if global.aviso}
  {#key global.aviso.id}
    <div class="aviso {global.aviso.tipo}" role="status" in:fly={{ y: 30, duration: 420 }} out:fly={{ y: 30, duration: 200 }}>
      <p>{global.aviso.texto}</p>
      <button class="boton discreto" onclick={() => (global.aviso = null)} aria-label="Cerrar aviso">Cerrar</button>
    </div>
  {/key}
{/if}

<style>
  .aviso {
    position: fixed;
    right: 1.5rem;
    bottom: 1.5rem;
    z-index: 50;
    display: flex;
    align-items: center;
    gap: 1rem;
    max-width: min(34rem, calc(100vw - 3rem));
    padding: 0.9rem 1rem 0.9rem 1.2rem;
    border: 1px solid var(--linea-viva);
    border-left: 3px solid var(--liquen-tenue);
    border-radius: var(--radio-s);
    background: rgb(19 31 28 / 0.96);
    box-shadow: 0 30px 60px -20px rgb(0 0 0 / 0.6);
  }
  .aviso.pausa {
    border-left-color: var(--pausada);
  }
  .aviso.error {
    border-left-color: var(--rechazada);
  }
  p {
    margin: 0;
  }
</style>
