<script>
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { COLOR_ESTADO, ETIQUETA_ESTADO } from '../lib/estados.js';
  import Caminos from './Caminos.svelte';
  import Editor from './Editor.svelte';

  // Última recomendación antes de germinar una idea que Claude no aceptó tal cual: elegir un camino
  // o retocar la idea aquí mismo. Germinar con esa versión equivale a aceptarla (decisión del usuario).
  let { idea, dictamen, base, alGerminar, alCerrar } = $props();

  const original = idea.hilo.find((m) => m.n === 1)?.contenido ?? '';
  let cuerpo = $state(original);
  let elegido = $state(null);
  let comentario = $state('');
  let ocupado = $state(false);

  let veredicto = $derived(dictamen?.meta?.veredicto ?? idea.veredicto);
  let variaciones = $derived((dictamen?.caminos ?? []).filter((c) => c.tipo === 'variacion'));

  async function germinar() {
    ocupado = true;
    try {
      await alGerminar({ camino: elegido, comentario: elegido ? comentario : '', ...(cuerpo !== original && { cuerpo }) });
    } finally {
      ocupado = false;
    }
  }

  const tecla = (e) => e.key === 'Escape' && !ocupado && alCerrar();
</script>

<svelte:window onkeydown={tecla} />

<button class="velo" aria-label="Cerrar" onclick={alCerrar} transition:fade={{ duration: 220 }}></button>
<div class="modal" role="dialog" aria-label="Antes de germinar" style:--sello={COLOR_ESTADO[veredicto]}
  transition:fly={{ y: 30, duration: 420, easing: cubicOut }}>
  <header>
    <h2>Antes de germinar</h2>
    <button class="cerrar" onclick={alCerrar} aria-label="Cerrar">×</button>
  </header>

  <div class="aviso">
    <p class="veredicto">
      Claude no la aceptó tal cual: <strong>{ETIQUETA_ESTADO[veredicto]}</strong>{#if idea.etiqueta}, «{idea.etiqueta}»{/if}.
    </p>
    {#if dictamen?.meta?.resumen}<p class="resumen">{dictamen.meta.resumen}</p>{/if}
    <p class="explica">
      Una última recomendación: elige uno de los caminos que propone o ajusta tu idea aquí abajo. La sesión germinará esa
      versión como si estuviera aceptada, sin volver a analizarla.
    </p>
  </div>

  {#if variaciones.length}
    <Caminos caminos={variaciones} {base} dictamen={dictamen.archivo} modo="germinar" bind:elegido bind:comentario />
  {/if}

  <section class="texto">
    <h4>Tu idea</h4>
    <div class="editor">
      <Editor valor={original} {base} alCambiar={(md) => (cuerpo = md)} marcador="Describe tu idea…" />
    </div>
    {#if cuerpo !== original}<p class="cambio">Has modificado la idea: la sesión la releerá antes de germinar.</p>{/if}
  </section>

  <footer>
    <button class="boton discreto" onclick={alCerrar} disabled={ocupado}>Cancelar</button>
    <button class="boton primario" onclick={germinar} disabled={ocupado}>Germinar con esta versión</button>
  </footer>
</div>

<style>
  .velo {
    position: fixed;
    inset: 0;
    z-index: 45;
    border: 0;
    background: rgb(7 13 12 / 0.7);
    backdrop-filter: blur(3px);
  }
  .modal {
    position: fixed;
    z-index: 46;
    top: 4vh;
    left: 50%;
    width: min(62rem, 94vw);
    max-height: 92vh;
    overflow-y: auto;
    padding: 1.6rem 2rem 1.4rem;
    border: 1px solid var(--linea-viva);
    border-radius: var(--radio-m);
    background:
      radial-gradient(70% 40% at 0% 0%, rgb(111 227 165 / 0.08), transparent 70%),
      var(--humus);
    box-shadow: 0 40px 120px -30px rgb(0 0 0 / 0.9);
    translate: -50% 0;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  h2 {
    margin: 0;
    font-family: var(--serif);
    font-weight: 400;
    font-size: var(--t3);
    color: var(--aceptada);
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
    margin: 1rem 0 0.4rem;
    padding: 0.9rem 1.1rem;
    border-left: 3px solid var(--sello);
    border-radius: 0 10px 10px 0;
    background: color-mix(in srgb, var(--sello) 8%, var(--humus-hondo));
  }
  .aviso p {
    margin: 0 0 0.5rem;
  }
  .veredicto strong {
    color: var(--sello);
  }
  .resumen {
    font-family: var(--serif);
    font-style: italic;
    font-size: 1.05rem;
  }
  .explica {
    color: var(--liquen-tenue);
    font-size: 0.92rem;
  }
  .texto h4 {
    margin: 1.6rem 0 0.6rem;
    font-family: var(--serif);
    font-weight: 500;
    font-size: var(--t1);
  }
  .editor {
    padding: 0.3rem 0.9rem;
    border: 1px solid var(--linea);
    border-radius: var(--radio-s);
    background: var(--humus-hondo);
  }
  .cambio {
    margin: 0.4rem 0 0;
    font-size: var(--t-1);
    color: var(--tu);
  }
  footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    margin-top: 1.4rem;
  }
</style>
