<script>
  import { scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  // Panel que brota junto a la selección: elegir Explicar o Corregir y escribir la petición.
  let { x, y, puedeCorregir, vistaPrevia, alEnviar, alCerrar } = $props();

  let tipo = $state(null);
  let prompt = $state('');
  let campo = $state();

  const TEXTO = {
    explicar: { titulo: 'Explicar', marcador: 'Opcional: qué no entiendes, hasta qué nivel quieres bajar…', boton: 'Pedir explicación' },
    corregir: { titulo: 'Corregir', marcador: 'Qué está mal y por qué (Claude lo comprobará con honestidad)…', boton: 'Enviar corrección' },
  };

  function elegir(t) {
    tipo = t;
    queueMicrotask(() => campo?.focus());
  }

  const valido = $derived(tipo === 'explicar' || prompt.trim().length > 0);

  function enviar() {
    if (valido) alEnviar({ tipo, prompt: prompt.trim() });
  }

  function tecla(e) {
    if (e.key === 'Escape') alCerrar();
    else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) enviar();
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="panel" class:abierto={tipo} class:corregir={tipo === 'corregir'} style:left="{x}px" style:top="{y}px"
  role="dialog" aria-label="Glosar el fragmento" tabindex="-1" onkeydown={tecla} onpointerdown={(e) => e.stopPropagation()}
  transition:scale={{ start: 0.85, duration: 220, easing: cubicOut }}>
  {#if !tipo}
    <div class="acciones">
      <button class="accion explicar" onclick={() => elegir('explicar')}>
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5v3M10 14.5v3M2.5 10h3M14.5 10h3M4.7 4.7l2 2M13.3 13.3l2 2M15.3 4.7l-2 2M6.7 13.3l-2 2" /></svg>
        Explicar
      </button>
      {#if puedeCorregir}
        <button class="accion corregir" onclick={() => elegir('corregir')}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 16.5l1-4 8.5-8.5 3 3-8.5 8.5-4 1zM11.5 5.5l3 3" /></svg>
          Corregir
        </button>
      {/if}
    </div>
  {:else}
    <p class="titulo">{TEXTO[tipo].titulo}</p>
    <p class="cita">{vistaPrevia}</p>
    <textarea bind:this={campo} bind:value={prompt} rows="3" placeholder={TEXTO[tipo].marcador}></textarea>
    <footer>
      <span class="atajo">Ctrl + Enter</span>
      <button class="boton discreto" onclick={alCerrar}>Cancelar</button>
      <button class="boton" disabled={!valido} onclick={enviar}>{TEXTO[tipo].boton}</button>
    </footer>
  {/if}
</div>

<style>
  .panel {
    position: absolute;
    z-index: 30;
    transform: translateX(-50%);
    padding: 0.35rem;
    border: 1px solid var(--linea-viva);
    border-radius: 12px;
    background: rgb(19 31 28 / 0.92);
    backdrop-filter: blur(14px);
    box-shadow: 0 18px 50px -12px rgb(0 0 0 / 0.7), 0 0 0 1px rgb(94 224 224 / 0.06);
    font-family: var(--sans);
    font-size: var(--t-1);
    transform-origin: 50% 0;
  }
  /* La pestaña que apunta al fragmento. */
  .panel::before {
    content: '';
    position: absolute;
    top: -6px;
    left: 50%;
    width: 10px;
    height: 10px;
    background: inherit;
    border-left: 1px solid var(--linea-viva);
    border-top: 1px solid var(--linea-viva);
    transform: translateX(-50%) rotate(45deg);
  }
  .panel.abierto {
    width: min(26rem, 86vw);
    padding: 0.9rem 1rem 0.8rem;
  }
  .acciones {
    display: flex;
    gap: 0.25rem;
  }
  .accion {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.45rem 0.8rem;
    border: 0;
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
    font-weight: 600;
    transition: background 0.2s, color 0.2s;
  }
  .accion svg {
    width: 1rem;
    height: 1rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .explicar {
    color: var(--explicar);
  }
  .corregir {
    color: var(--corregir);
  }
  .accion:hover,
  .accion:focus-visible {
    background: var(--superficie-alta);
  }
  .titulo {
    margin: 0 0 0.4rem;
    font-weight: 600;
    color: var(--explicar);
  }
  .panel.corregir .titulo {
    color: var(--corregir);
  }
  .cita {
    margin: 0 0 0.6rem;
    padding-left: 0.6rem;
    border-left: 2px solid var(--linea-viva);
    color: var(--liquen-tenue);
    font-family: var(--mono);
    font-size: 0.72rem;
    white-space: pre-wrap;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
  }
  textarea {
    width: 100%;
    padding: 0.55rem 0.65rem;
    border: 1px solid var(--linea);
    border-radius: 8px;
    background: var(--humus-hondo);
    color: var(--liquen);
    font: inherit;
    font-size: 0.85rem;
    line-height: 1.45;
    resize: vertical;
  }
  textarea:focus {
    outline: none;
    border-color: var(--linea-viva);
  }
  footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.6rem;
  }
  .atajo {
    margin-right: auto;
    color: var(--liquen-apagado);
    font-size: 0.7rem;
  }
</style>
