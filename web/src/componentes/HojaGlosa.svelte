<script>
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { renderizar } from '../lib/render.js';
  import { avisar } from '../lib/estado.svelte.js';

  // La glosa completa: el fragmento citado, el hilo de preguntas y respuestas, y una caja para seguir.
  let { glosa, glosas, base, alCerrar } = $props();

  const ETIQUETA = { explicar: 'Explicación', corregir: 'Corrección' };
  const VEREDICTO = {
    acertada: 'Tenías razón: el texto se ha enmendado donde dependía del error.',
    parcial: 'Tenías razón en parte: se ha enmendado lo que dependía del error.',
    erronea: 'No era un error: Claude explica por qué.',
  };
  const ACCION = { WebSearch: 'Buscando', WebFetch: 'Leyendo', Read: 'Leyendo', Bash: 'Calculando', Write: 'Escribiendo', Edit: 'Enmendando' };

  let prompt = $state('');
  let enviando = $state(false);
  let vivo = $derived(glosa.estado === 'en-proceso' ? glosas.enVivo(glosa.id) : null);
  let enCurso = $derived(glosa.estado === 'en-proceso');

  async function seguir() {
    if (!prompt.trim() || enviando || glosa.estado === 'en-proceso') return;
    enviando = true;
    try {
      await glosas.seguir(glosa.id, prompt);
      prompt = '';
    } catch (e) {
      avisar(e.message === 'en-proceso' ? 'Espera a que termine: la idea o esta glosa están en marcha.' : e.message === 'cuota' ? 'La investigación está pausada por cuota; las glosas también esperan.' : `No se pudo preguntar: ${e.message}`, 'error');
    } finally {
      enviando = false;
    }
  }

  const tecla = (e) => e.key === 'Escape' && alCerrar();
</script>

<svelte:window onkeydown={tecla} />

<button class="velo" aria-label="Cerrar la glosa" onclick={alCerrar} transition:fade={{ duration: 200 }}></button>
<aside class="hoja {glosa.tipo}" transition:fly={{ x: 60, duration: 380, easing: cubicOut, opacity: 0 }} aria-label="Glosa">
  <header>
    <span class="tipo">{ETIQUETA[glosa.tipo]}{#if glosa.profundidad} {glosa.profundidad}{/if}</span>
    <button class="cerrar" onclick={alCerrar} aria-label="Cerrar">×</button>
  </header>

  <blockquote class="fragmento manuscrito">{@html renderizar(glosa.fragmento.markdown.replace(/\]\((carpetas\/)/g, '](/archivos/$1'), '')}</blockquote>

  {#if glosa.correccion}
    <p class="veredicto {glosa.correccion}">{VEREDICTO[glosa.correccion]}</p>
  {/if}
  {#if glosa.aviso}<p class="aviso">{glosa.aviso}</p>{/if}

  <div class="hilo">
    {#each glosa.mensajes as m, i (i)}
      {#if m.autor === 'usuario'}
        {#if m.contenido}<p class="pregunta">{m.contenido}</p>{/if}
      {:else}
        <div class="respuesta manuscrito">{@html renderizar(m.contenido, base)}</div>
      {/if}
    {/each}
    {#if enCurso}
      <div class="vivo">
        <span class="luz"></span>
        {#if vivo?.ultimo?.tipo === 'herramienta'}
          {ACCION[vivo.ultimo.herramienta] ?? 'Trabajando'}{vivo.ultimo.query ? `: «${vivo.ultimo.query}»` : '…'}
        {:else if vivo?.texto}
          Escribiendo la respuesta…
        {:else}
          Pensando…
        {/if}
      </div>
      {#if vivo?.texto}<div class="respuesta manuscrito borrador">{@html renderizar(vivo.texto, base)}</div>{/if}
    {:else if glosa.estado === 'error'}
      <p class="fallo">No se pudo responder: {glosa.error}</p>
    {/if}
  </div>

  <footer>
    <textarea bind:value={prompt} rows="2" placeholder="Seguir preguntando sobre este fragmento…" disabled={enCurso}
      onkeydown={(e) => e.key === 'Enter' && (e.ctrlKey || e.metaKey) && seguir()}></textarea>
    <button class="boton" disabled={!prompt.trim() || enCurso || enviando} onclick={seguir}>Preguntar</button>
  </footer>
</aside>

<style>
  .velo {
    position: fixed;
    inset: 0;
    z-index: 40;
    border: 0;
    background: rgb(7 13 12 / 0.45);
    cursor: default;
  }
  .hoja {
    position: fixed;
    z-index: 41;
    top: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    width: min(46rem, 94vw);
    border-left: 1px solid var(--linea-viva);
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--acento) 6%, transparent), transparent 30%),
      var(--humus);
    box-shadow: -30px 0 80px -30px rgb(0 0 0 / 0.9);
  }
  .explicar {
    --acento: var(--explicar);
  }
  .corregir {
    --acento: var(--corregir);
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.1rem 1.6rem 0.4rem;
  }
  .tipo {
    font-family: var(--serif);
    font-size: var(--t2);
    font-variant: small-caps;
    letter-spacing: 0.06em;
    color: var(--acento);
  }
  .cerrar {
    width: 2rem;
    height: 2rem;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--liquen-tenue);
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
  }
  .cerrar:hover {
    background: var(--superficie);
    color: var(--liquen);
  }
  .fragmento {
    margin: 0.4rem 1.6rem 0.8rem;
    padding: 0.6rem 0.9rem;
    max-height: 30vh;
    overflow: auto;
    border-left: 2px solid var(--acento);
    background: var(--humus-hondo);
    border-radius: 0 8px 8px 0;
    font-size: 0.95rem;
  }
  .veredicto,
  .aviso {
    margin: 0 1.6rem 0.6rem;
    font-family: var(--sans);
    font-size: var(--t-1);
  }
  .veredicto.acertada {
    color: var(--aceptada);
  }
  .veredicto.parcial {
    color: var(--cambios);
  }
  .veredicto.erronea,
  .aviso {
    color: var(--liquen-tenue);
  }
  .hilo {
    flex: 1;
    overflow-y: auto;
    padding: 0.4rem 1.6rem 1.2rem;
  }
  .pregunta {
    margin: 1rem 0 0.6rem;
    padding: 0.5rem 0.8rem;
    border-left: 2px solid var(--tu);
    background: var(--tu-velo);
    font-family: var(--sans);
    font-size: 0.9rem;
    color: var(--tu);
    white-space: pre-wrap;
  }
  .respuesta {
    margin: 0.6rem 0 1.2rem;
  }
  .borrador {
    opacity: 0.75;
  }
  .vivo {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    margin: 1rem 0 0.4rem;
    font-family: var(--sans);
    font-size: var(--t-1);
    color: var(--acento);
  }
  .luz {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--acento);
    animation: latir 1.2s ease-in-out infinite;
  }
  @keyframes latir {
    50% {
      opacity: 0.3;
      transform: scale(0.7);
    }
  }
  .fallo {
    color: var(--rechazada);
  }
  footer {
    display: flex;
    gap: 0.6rem;
    align-items: end;
    padding: 0.9rem 1.6rem 1.2rem;
    border-top: 1px solid var(--linea);
  }
  textarea {
    flex: 1;
    padding: 0.55rem 0.7rem;
    border: 1px solid var(--linea);
    border-radius: 8px;
    background: var(--humus-hondo);
    color: var(--liquen);
    font: inherit;
    font-size: 0.9rem;
    resize: vertical;
  }
  textarea:focus {
    outline: none;
    border-color: var(--linea-viva);
  }
</style>
