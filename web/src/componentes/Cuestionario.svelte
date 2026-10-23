<script>
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { renderizar } from '../lib/render.js';
  import { crearAutoguardado } from '../lib/autoguardado.js';
  import { onDestroy } from 'svelte';
  import Editor from './Editor.svelte';

  // Diagnóstico: las preguntas de la sesión para saber de dónde parte el usuario.
  let { diagnostico, respuestas: iniciales = {}, base, alGuardar, alEnviar } = $props();

  let respuestas = $state({ ...iniciales });
  let enviando = $state(false);
  let preguntas = $derived(diagnostico.preguntas);
  let hechas = $derived(preguntas.filter((p) => String(respuestas[p.id] ?? '').trim()).length);

  const guardado = crearAutoguardado((r) => alGuardar(r), 800);
  onDestroy(() => guardado.vaciar());

  function poner(id, valor) {
    respuestas[id] = valor;
    guardado.programar({ ...respuestas });
  }

  const nivelDe = (p) => {
    const v = respuestas[p.id];
    const i = p.niveles.findIndex((n, k) => v === `${k}: ${n}`);
    return i;
  };

  async function enviar() {
    enviando = true;
    try {
      await guardado.vaciar();
      await alEnviar({ ...respuestas });
    } finally {
      enviando = false;
    }
  }
</script>

<section class="cuestionario" in:fly={{ y: 30, duration: 600, easing: cubicOut }}>
  <header>
    <h2>Antes de trazar el camino</h2>
    {#if diagnostico.intro}<div class="intro manuscrito">{@html renderizar(diagnostico.intro, base)}</div>{/if}
  </header>

  <ol>
    {#each preguntas as p, i (p.id)}
      <li class:respondida={String(respuestas[p.id] ?? '').trim()} in:fly={{ y: 20, duration: 500, delay: 120 + i * 70, easing: cubicOut }}>
        <span class="num">{i + 1}</span>
        <div class="enunciado manuscrito">{@html renderizar(p.texto, base)}</div>
        {#if p.tipo === 'escala'}
          <div class="escala" role="radiogroup" aria-label="Nivel">
            {#each p.niveles as n, k (k)}
              <button role="radio" aria-checked={nivelDe(p) === k} class:elegido={nivelDe(p) === k} class:bajo={nivelDe(p) >= k}
                onclick={() => poner(p.id, `${k}: ${n}`)} title={n}>
                <span class="punto"></span>
                <span class="k">{k}</span>
              </button>
            {/each}
          </div>
          <p class="descripcion">{nivelDe(p) >= 0 ? p.niveles[nivelDe(p)] : 'Elige el nivel que mejor te describa.'}</p>
        {:else if p.tipo === 'opciones'}
          <div class="opciones">
            {#each p.opciones as o (o)}
              <button class:elegido={respuestas[p.id] === o} onclick={() => poner(p.id, o)}>{o}</button>
            {/each}
          </div>
        {:else}
          <div class="abierta">
            <Editor valor={respuestas[p.id] ?? ''} {base} alCambiar={(md) => poner(p.id, md)} marcador="Cuéntalo con tus palabras; puedes escribir fórmulas con $…$" />
          </div>
        {/if}
      </li>
    {/each}
  </ol>

  <footer>
    <span class="cuenta">{hechas} de {preguntas.length} respondidas (se guarda solo)</span>
    <button class="boton primario" disabled={enviando || hechas === 0} onclick={enviar}>Enviar respuestas y seguir germinando</button>
  </footer>
</section>

<style>
  .cuestionario {
    position: relative;
    z-index: 2;
    max-width: 52rem;
    margin: 0 auto;
    padding: 2rem 0 5rem;
  }
  h2 {
    margin: 0.2rem 0 0.8rem;
    font-family: var(--serif);
    font-weight: 400;
    font-size: var(--t4);
    line-height: 1.1;
  }
  .intro {
    color: var(--liquen-tenue);
  }
  ol {
    margin: 2rem 0 0;
    padding: 0;
    list-style: none;
    counter-reset: p;
  }
  li {
    position: relative;
    padding: 1.4rem 0 1.6rem 3.4rem;
    border-top: 1px solid var(--linea);
  }
  .num {
    position: absolute;
    left: 0;
    top: 1.35rem;
    width: 2.1rem;
    height: 2.1rem;
    display: grid;
    place-items: center;
    border: 1px solid var(--linea-viva);
    border-radius: 50%;
    font-family: var(--serif);
    font-size: 1.1rem;
    color: var(--liquen-tenue);
    transition: background 0.4s, color 0.4s, border-color 0.4s;
  }
  .respondida .num {
    background: rgb(111 227 165 / 0.15);
    border-color: var(--aceptada);
    color: var(--aceptada);
  }
  .enunciado :global(p:last-child) {
    margin-bottom: 0.6rem;
  }
  /* La escala: cinco estadios de crecimiento unidos por un tallo. */
  .escala {
    position: relative;
    display: flex;
    justify-content: space-between;
    max-width: 30rem;
    margin-top: 0.4rem;
  }
  .escala::before {
    content: '';
    position: absolute;
    left: 0.9rem;
    right: 0.9rem;
    top: 0.9rem;
    border-top: 1px solid var(--linea-viva);
  }
  .escala button {
    position: relative;
    display: grid;
    justify-items: center;
    gap: 0.25rem;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
  }
  .punto {
    width: 1.8rem;
    height: 1.8rem;
    border: 1.5px solid var(--linea-viva);
    border-radius: 50%;
    background: var(--humus);
    transition: background 0.3s, border-color 0.3s, transform 0.3s var(--curva-muelle);
  }
  .escala button.bajo .punto {
    border-color: var(--aceptada);
    background: rgb(111 227 165 / 0.15);
  }
  .escala button.elegido .punto {
    background: var(--aceptada);
    transform: scale(1.15);
    box-shadow: 0 0 14px rgb(111 227 165 / 0.5);
  }
  .escala button:hover .punto {
    transform: scale(1.12);
  }
  .k {
    font-family: var(--sans);
    font-size: 0.75rem;
    color: var(--liquen-apagado);
  }
  .descripcion {
    margin: 0.6rem 0 0;
    min-height: 1.5em;
    color: var(--liquen-tenue);
    font-family: var(--serif);
    font-style: italic;
  }
  .opciones {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .opciones button {
    padding: 0.45rem 0.95rem;
    border: 1px solid var(--linea-viva);
    border-radius: 999px;
    background: transparent;
    cursor: pointer;
    transition: background 0.25s, border-color 0.25s, color 0.25s;
  }
  .opciones button:hover {
    border-color: var(--liquen-tenue);
  }
  .opciones button.elegido {
    border-color: var(--aceptada);
    background: rgb(111 227 165 / 0.14);
    color: var(--aceptada);
  }
  .abierta {
    padding: 0.4rem 0.8rem;
    border: 1px solid var(--linea);
    border-radius: var(--radio-s);
    background: var(--humus-hondo);
  }
  footer {
    position: sticky;
    bottom: 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 1rem;
    padding: 0.8rem 1rem;
    border: 1px solid var(--linea-viva);
    border-radius: 999px;
    background: rgb(19 31 28 / 0.9);
    backdrop-filter: blur(10px);
  }
  .cuenta {
    padding-left: 0.5rem;
    font-size: var(--t-1);
    color: var(--liquen-tenue);
  }
</style>
