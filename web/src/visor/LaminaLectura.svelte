<script>
  import { getContext } from 'svelte';
  import { cubicOut, cubicIn } from 'svelte/easing';
  import { renderizar } from '../lib/render.js';
  import ProgramaAsignatura from '../componentes/ProgramaAsignatura.svelte';
  import Lector from '../componentes/Lector.svelte';

  // La lámina de un nodo en una germinación exportada: solo lectura. El documento, lo que requiere y abre,
  // y los recursos con su archivo embebido. Sin estados, notas, taller ni registros.
  // `indice` y `documentos`: en un curso, la asignatura redactada (conferencias, prácticas, demostraciones).
  let { nodo, mapa, documento, base, desde, indice = null, documentos = {}, alCerrar, alIrA } = $props();
  let leyendo = $state(null);

  const vocabActual = getContext('vocab') ?? (() => undefined);
  let vocab = $derived(vocabActual() ?? { hoja: 'Incógnita', fruto: 'Problema abierto' });
  const TIPO_RECURSO = { libro: 'Libro', articulo: 'Artículo', curso: 'Curso', web: 'Web', otro: 'Recurso' };

  let recursos = $derived((mapa.recursos ?? []).filter((r) => nodo.recursos.includes(r.id)));
  let requiere = $derived(mapa.nodos.filter((n) => nodo.depende.includes(n.id)));
  let abre = $derived(mapa.nodos.filter((n) => n.depende.includes(nodo.id)));
  const archivo = (r) => `/archivos/${base}/germinacion/${r.archivo.split('/').map(encodeURIComponent).join('/')}`;
  const esPdf = (r) => /\.pdf$/i.test(r.archivo);

  function brotar(_n, { x, y, duration = 650 }) {
    return {
      duration,
      easing: cubicOut,
      css: (t) => `clip-path: circle(${t * 150}% at ${x}px ${y}px); opacity: ${Math.min(1, t * 3)}`,
    };
  }
  function cerrarse(_n, { x, y }) {
    return { duration: 380, easing: cubicIn, css: (t) => `clip-path: circle(${t * 150}% at ${x}px ${y}px)` };
  }
  const tecla = (e) => e.key === 'Escape' && !document.querySelector('.lectura, .lector') && alCerrar();
</script>

<svelte:window onkeydown={tecla} />

<div class="lamina {nodo.tipo}" in:brotar={desde} out:cerrarse={desde} role="dialog" aria-label={nodo.titulo}>
  <div class="interior">
    <button class="volver" onclick={alCerrar}>
      <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" /></svg>
      Volver al árbol
    </button>

    <header>
      <p class="clase">
        {#if nodo.tipo === 'incognita'}
          <span class="marca-tipo">◇</span>{nodo.abierto ? vocab.fruto : vocab.hoja}{#if nodo.dificultad}<span class="dif">dificultad {nodo.dificultad}</span>{/if}
        {:else}
          <span class="marca-tipo">●</span>Ruta de estudio{#if nodo.duracion}<span class="dif">{nodo.duracion}</span>{/if}
        {/if}
      </p>
      <h1>{nodo.titulo}</h1>
      {#if nodo.resumen}<p class="resumen">{nodo.resumen}</p>{/if}
    </header>

    {#if indice}
      <ProgramaAsignatura {nodo} {indice} alAbrir={(id) => (leyendo = id)} />
    {/if}

    <div class="cuerpo">
      <article class="documento manuscrito">
        {#if documento.trim()}
          {@html renderizar(documento, base)}
        {:else}
          <p class="vacio">Este nodo no tiene documento.</p>
        {/if}
      </article>

      <aside class="lateral">
        {#if requiere.length || abre.length}
          <section>
            {#if requiere.length}
              <h2>Requiere</h2>
              <ul class="enlaces">
                {#each requiere as n (n.id)}<li><button onclick={() => alIrA(n.id)}>{n.titulo}</button></li>{/each}
              </ul>
            {/if}
            {#if abre.length}
              <h2>Abre paso a</h2>
              <ul class="enlaces">
                {#each abre as n (n.id)}<li><button onclick={() => alIrA(n.id)}>{n.titulo}</button></li>{/each}
              </ul>
            {/if}
          </section>
        {/if}

        {#if recursos.length}
          <section>
            <h2>Recursos</h2>
            <ul class="recursos">
              {#each recursos as r (r.id)}
                <li class={r.tipo}>
                  <span class="tipo-recurso">{TIPO_RECURSO[r.tipo] ?? 'Recurso'}</span>
                  <strong>{r.titulo}</strong>
                  {#if r.autores}<span class="autores">{r.autores}{r.anio ? `, ${r.anio}` : ''}</span>{/if}
                  {#if r.nota}<div class="nota manuscrito">{@html renderizar(r.nota, base)}</div>{/if}
                  <span class="acciones">
                    {#if r.archivo}<a class="boton" href={archivo(r)} target="_blank" rel="noopener">{esPdf(r) ? 'Abrir PDF' : 'Abrir documento'}</a>{/if}
                    {#if r.url}<a class="boton discreto" href={r.url} target="_blank" rel="noopener noreferrer">Fuente original</a>{/if}
                  </span>
                </li>
              {/each}
            </ul>
          </section>
        {/if}
      </aside>
    </div>
  </div>
</div>

{#if leyendo && indice}
  <Lector {nodo} {indice} inicial={leyendo} {base}
    cargar={async (rel) => documentos[rel.replace(/^germinacion\//, '')] ?? Promise.reject(new Error('sin documento'))} alCerrar={() => (leyendo = null)} />
{/if}

<style>
  /* Los mismos estilos de lectura que LaminaNodo, sin lo interactivo (estados, taller, registro, notas). */
  .lamina {
    position: fixed;
    inset: 0;
    z-index: 35;
    overflow-y: auto;
    background:
      radial-gradient(80vw 50vh at 50% -10%, color-mix(in srgb, var(--acento) 9%, transparent), transparent 70%),
      var(--humus);
  }
  .estudio {
    --acento: var(--aceptada);
  }
  .incognita {
    --acento: var(--aclaracion);
  }
  .interior {
    max-width: 92rem;
    margin: 0 auto;
    padding: 1.4rem 2rem 6rem;
  }
  .volver {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.8rem 0.4rem 0.5rem;
    border: 1px solid var(--linea);
    border-radius: 999px;
    background: transparent;
    color: var(--liquen-tenue);
    cursor: pointer;
  }
  .volver:hover {
    color: var(--liquen);
    border-color: var(--linea-viva);
  }
  .volver svg {
    width: 1rem;
    height: 1rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  header {
    max-width: 60rem;
    margin: 2.2rem 0 2.5rem;
  }
  .clase {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    color: var(--acento);
    font-weight: 600;
  }
  .marca-tipo {
    font-size: 0.9em;
  }
  .dif {
    margin-left: 0.4rem;
    color: var(--liquen-tenue);
    font-weight: 400;
  }
  h1 {
    margin: 0.3rem 0 0.4rem;
    font-family: var(--serif);
    font-weight: 400;
    font-size: var(--t5);
    line-height: 1.04;
    letter-spacing: -0.015em;
  }
  .resumen {
    margin: 0 0 1.4rem;
    font-family: var(--serif);
    font-size: var(--t2);
    font-style: italic;
    color: var(--liquen-tenue);
  }
  .cuerpo {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 24rem;
    gap: 4rem;
    align-items: start;
  }
  .documento {
    min-width: 0;
    padding-right: 2.5rem;
  }
  .vacio {
    color: var(--liquen-tenue);
  }
  .lateral {
    position: sticky;
    top: 1rem;
    display: grid;
    gap: 2rem;
  }
  h2 {
    margin: 0 0 0.6rem;
    font-family: var(--serif);
    font-weight: 500;
    font-size: var(--t1);
  }
  h2 + .enlaces + h2 {
    margin-top: 1rem;
  }
  .enlaces {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .enlaces button {
    padding: 0.3rem 0.75rem;
    border: 1px solid var(--linea-viva);
    border-radius: 999px;
    background: transparent;
    cursor: pointer;
    font-size: var(--t-1);
  }
  .enlaces button:hover {
    border-color: var(--acento);
    color: var(--acento);
  }
  .recursos {
    display: grid;
    gap: 0.8rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .recursos li {
    display: grid;
    gap: 0.2rem;
    padding: 0.8rem 0.9rem;
    border: 1px solid var(--linea);
    border-left: 3px solid var(--color-recurso, var(--liquen-apagado));
    border-radius: 3px var(--radio-s) var(--radio-s) 3px;
    background: var(--humus-hondo);
  }
  .recursos .libro {
    --color-recurso: #9ec5ff;
  }
  .recursos .articulo {
    --color-recurso: #f0b45a;
  }
  .recursos .curso {
    --color-recurso: #6fe3a5;
  }
  .tipo-recurso {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--color-recurso, var(--liquen-tenue));
  }
  .recursos strong {
    font-family: var(--serif);
    font-weight: 500;
    font-size: 1.02rem;
    line-height: 1.3;
  }
  .autores {
    font-size: var(--t-1);
    color: var(--liquen-tenue);
  }
  .nota {
    font-size: 0.9rem;
    color: var(--liquen-tenue);
  }
  .acciones {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.4rem;
  }
  .acciones .boton {
    font-size: var(--t-1);
    text-decoration: none;
  }
  @media (max-width: 1100px) {
    .cuerpo {
      grid-template-columns: 1fr;
    }
    .lateral {
      position: static;
    }
  }
</style>
