<script>
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { renderizar } from '../lib/render.js';
  import { ir, enlace } from '../lib/ruta.svelte.js';

  // Los caminos que propone un dictamen, como opciones de colores. Las variaciones van en la familia
  // de la savia (verdes) y las ideas nuevas en la de otra semilla (violetas).
  // `modo`: 'idea' (elegir variación o crear idea nueva) o 'germinar' (solo variaciones, sin guardar).
  let { caminos, base, idea = null, dictamen, activo = true, modo = 'idea', elegido = $bindable(null), comentario = $bindable(''), alElegir } = $props();

  const VERDES = ['#6fe3a5', '#a9e36a', '#5ee0c0', '#8fd88a', '#c3e88d', '#4fd1a5'];
  const VIOLETAS = ['#b39cff', '#9ec5ff', '#d79cff', '#8fa8ff', '#c8a2f0', '#a0b8ff'];
  const color = (c) => {
    const mismos = caminos.filter((x) => x.tipo === c.tipo);
    const k = mismos.indexOf(c);
    return (c.tipo === 'variacion' ? VERDES : VIOLETAS)[k % 6];
  };

  let visibles = $derived(modo === 'germinar' ? caminos.filter((c) => c.tipo === 'variacion') : caminos);
  let abierto = $state(null);
  let nota = $state('');
  let ocupado = $state(false);

  const derivada = (c) => idea?.derivadas?.find((d) => d.dictamen === dictamen && d.camino === c.id);
  const marcado = (c) =>
    modo === 'germinar' ? elegido === c.id : c.tipo === 'variacion' ? idea?.eleccion?.dictamen === dictamen && idea?.eleccion?.camino === c.id : Boolean(derivada(c));

  function tocar(c) {
    if (!activo) return;
    if (modo === 'germinar') {
      elegido = elegido === c.id ? null : c.id;
      abierto = elegido;
      return;
    }
    abierto = abierto === c.id ? null : c.id;
    nota = '';
  }

  async function confirmar(c) {
    ocupado = true;
    try {
      await alElegir(c, nota);
      abierto = null;
    } finally {
      ocupado = false;
    }
  }
</script>

<section class="caminos" class:apagados={!activo}>
  <h4>{modo === 'germinar' ? 'Elige un camino (opcional)' : 'Caminos que propone Claude'}</h4>
  <div class="fila">
    {#each visibles as c (c.id)}
      <button class="opcion {c.tipo}" class:marcado={marcado(c)} class:abierta={abierto === c.id} style:--tono={color(c)}
        disabled={!activo} aria-pressed={marcado(c)} onclick={() => tocar(c)}>
        <span class="tipo">{c.tipo === 'variacion' ? 'Variación' : 'Idea nueva'}</span>
        <span class="titulo">{c.titulo}</span>
        {#if marcado(c)}<span class="sello-opcion">{c.tipo === 'variacion' ? 'Elegido' : 'Creada'}</span>{/if}
      </button>
    {/each}
  </div>

  {#each visibles as c (c.id)}
    {#if abierto === c.id}
      <div class="detalle" style:--tono={color(c)} transition:slide={{ duration: 300, easing: cubicOut }}>
        <div class="manuscrito descripcion">{@html renderizar(c.descripcion, base)}</div>
        {#if modo === 'germinar'}
          <textarea bind:value={comentario} rows="2" placeholder="Comentario opcional para la sesión: cómo quieres enfocarlo…"></textarea>
        {:else if marcado(c)}
          <div class="acciones">
            {#if c.tipo === 'idea-nueva'}
              <button class="boton" onclick={() => ir(enlace.idea(derivada(c).carpetaId, derivada(c).ideaId))}>Abrir la idea creada</button>
              <button class="boton discreto" disabled={ocupado} onclick={() => confirmar(c)}>Borrar la idea creada</button>
            {:else}
              <button class="boton discreto" disabled={ocupado} onclick={() => confirmar(c)}>Quitar la elección</button>
            {/if}
          </div>
        {:else}
          <textarea bind:value={nota} rows="2" placeholder="Comentario opcional: matices, por dónde quieres llevarlo…"></textarea>
          <div class="acciones">
            <span class="pista">
              {c.tipo === 'variacion' ? 'Se analizará en esta misma sesión al pulsar «Comenzar Análisis».' : 'Se creará como idea aparte en este bancal, con su propio análisis.'}
            </span>
            <button class="boton primario" disabled={ocupado} onclick={() => confirmar(c)}>
              {c.tipo === 'variacion' ? 'Elegir esta variación' : 'Crear como idea nueva'}
            </button>
          </div>
        {/if}
      </div>
    {/if}
  {/each}
</section>

<style>
  .caminos {
    margin-top: 2rem;
    padding-top: 1.2rem;
    border-top: 1px solid rgb(240 180 90 / 0.18);
  }
  h4 {
    margin: 0 0 0.8rem;
    font-family: var(--serif);
    font-weight: 500;
    font-size: var(--t1);
    color: var(--liquen);
  }
  .fila {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }
  .opcion {
    position: relative;
    display: grid;
    gap: 0.15rem;
    max-width: 22rem;
    padding: 0.6rem 1rem 0.65rem;
    border: 1px solid color-mix(in srgb, var(--tono) 45%, transparent);
    border-radius: 14px;
    background: color-mix(in srgb, var(--tono) 7%, var(--humus-hondo));
    text-align: left;
    cursor: pointer;
    transition: transform 0.3s var(--curva-muelle), background 0.25s, box-shadow 0.25s, border-color 0.25s;
  }
  .opcion:hover:not(:disabled),
  .opcion.abierta {
    transform: translateY(-2px);
    border-color: var(--tono);
    box-shadow: 0 10px 26px -14px var(--tono);
  }
  .opcion.marcado {
    background: color-mix(in srgb, var(--tono) 22%, var(--humus-hondo));
    border-color: var(--tono);
    box-shadow: 0 0 0 1px var(--tono), 0 0 22px -6px var(--tono);
  }
  .tipo {
    font-family: var(--sans);
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--tono);
  }
  .titulo {
    font-family: var(--serif);
    font-size: 1.02rem;
    line-height: 1.25;
    color: var(--liquen);
  }
  .sello-opcion {
    position: absolute;
    top: -0.55rem;
    right: 0.7rem;
    padding: 0.05rem 0.5rem;
    border-radius: 999px;
    background: var(--tono);
    color: var(--humus);
    font-family: var(--sans);
    font-size: 0.66rem;
    font-weight: 700;
  }
  .apagados .opcion {
    opacity: 0.5;
    cursor: default;
  }
  .detalle {
    margin-top: 0.8rem;
    padding: 0.9rem 1.1rem;
    border-left: 3px solid var(--tono);
    border-radius: 0 10px 10px 0;
    background: color-mix(in srgb, var(--tono) 6%, var(--humus-hondo));
  }
  .descripcion {
    font-size: 0.98rem;
  }
  textarea {
    width: 100%;
    margin-top: 0.4rem;
    padding: 0.55rem 0.7rem;
    border: 1px solid var(--linea);
    border-radius: 8px;
    background: var(--humus);
    color: var(--liquen);
    font: inherit;
    font-size: 0.9rem;
    resize: vertical;
  }
  .acciones {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.6rem;
    margin-top: 0.6rem;
  }
  .pista {
    margin-right: auto;
    font-size: var(--t-1);
    color: var(--liquen-tenue);
  }
</style>
