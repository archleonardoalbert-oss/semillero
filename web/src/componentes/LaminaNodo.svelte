<script>
  import { onDestroy } from 'svelte';
  import { cubicOut, cubicIn } from 'svelte/easing';
  import { api } from '../lib/api.js';
  import { renderizar } from '../lib/render.js';
  import { avisar } from '../lib/estado.svelte.js';
  import { crearAutoguardado } from '../lib/autoguardado.js';
  import Glosable from './Glosable.svelte';
  import Editor from './Editor.svelte';
  import Taller from './Taller.svelte';
  import { diferencias } from '../lib/diff.js';

  // La lámina de un nodo: brota desde el nodo pulsado y ocupa la pantalla.
  let { nodo, mapa, progreso, ref, base, glosas, desde, bloqueado = false, alCerrar, alIrA, alCambiar } = $props();

  const ESTADOS = {
    estudio: [['pendiente', 'Pendiente'], ['en-curso', 'Estudiando'], ['hecho', 'Dominado']],
    incognita: [['abierta', 'Abierta'], ['atacando', 'Atacándola'], ['resuelta', 'Resuelta']],
  };
  const TIPO_RECURSO = { libro: 'Libro', articulo: 'Artículo', curso: 'Curso', web: 'Web', otro: 'Recurso' };

  let documento = $state(null);
  let fallo = $state(null);
  let recarga = $state(0);
  $effect(() => {
    recarga;
    fallo = null;
    api.documento(ref.carpetaId, ref.ideaId, `germinacion/${nodo.documento}`)
      .then((t) => (documento = t))
      .catch(() => (fallo = 'La sesión aún no ha escrito el documento de este nodo.'));
  });

  // Las incógnitas tienen taller: pantalla dividida con el enunciado a la izquierda.
  let conTaller = $derived(nodo.tipo === 'incognita');
  let cita = $state('');
  let comparando = $state(null); // { md, titulo }: una propuesta o versión comparada con el enunciado vigente
  let bloques = $derived(comparando && documento !== null ? diferencias(documento, comparando.md) : null);

  let estado = $derived(progreso?.nodos?.[nodo.id]?.estado ?? ESTADOS[nodo.tipo][0][0]);
  let recursos = $derived((mapa.recursos ?? []).filter((r) => nodo.recursos.includes(r.id)));
  let requiere = $derived(mapa.nodos.filter((n) => nodo.depende.includes(n.id)));
  let abre = $derived(mapa.nodos.filter((n) => n.depende.includes(nodo.id)));

  async function marcar(e) {
    try {
      await api.marcarNodo(ref.carpetaId, ref.ideaId, nodo.id, { estado: e });
      alCambiar();
    } catch (err) {
      avisar(`No se pudo guardar: ${err.message}`, 'error');
    }
  }

  const notas = crearAutoguardado(async (texto) => {
    try {
      await api.marcarNodo(ref.carpetaId, ref.ideaId, nodo.id, { notas: texto });
      alCambiar();
    } catch (err) {
      avisar(`No se pudieron guardar tus notas: ${err.message}`, 'error');
    }
  }, 1200);
  onDestroy(() => notas.vaciar());

  // Se abre como un círculo que crece desde el nodo pulsado.
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

  // Escape cierra la lámina salvo que haya una glosa o un panel abiertos encima.
  const tecla = (e) => e.key === 'Escape' && !document.querySelector('.hoja, .panel') && alCerrar();
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
          <span class="marca-tipo">◇</span>{nodo.abierto ? 'Problema abierto' : 'Incógnita'}{#if nodo.dificultad}<span class="dif">dificultad {nodo.dificultad}</span>{/if}
        {:else}
          <span class="marca-tipo">●</span>Ruta de estudio{#if nodo.duracion}<span class="dif">{nodo.duracion}</span>{/if}
        {/if}
      </p>
      <h1>{nodo.titulo}</h1>
      {#if nodo.resumen}<p class="resumen">{nodo.resumen}</p>{/if}
      <div class="estados" role="radiogroup" aria-label="Tu progreso">
        {#each ESTADOS[nodo.tipo] as [valor, texto] (valor)}
          <button role="radio" aria-checked={estado === valor} class:elegido={estado === valor} class={valor} onclick={() => marcar(valor)}>{texto}</button>
        {/each}
      </div>
    </header>

    <div class="cuerpo" class:dividida={conTaller}>
      <div class="columna">
      <article class="documento">
        {#if bloques}
          <div class="comparacion">
            <p class="aviso-comparacion">{comparando.titulo}, comparada con el enunciado vigente.
              <button class="enlace" onclick={() => (comparando = null)}>Volver al enunciado</button></p>
            {#each bloques as b, k (k)}
              <div class="bloque {b.tipo} manuscrito">{@html renderizar(b.texto, base)}</div>
            {/each}
          </div>
        {:else if documento !== null}
          <Glosable html={renderizar(documento, base)} documento="germinacion/{nodo.documento}" autor="claude" {glosas} {base} {bloqueado} flotante
            alCitar={conTaller ? (md) => (cita = md) : null} />
        {:else if fallo}
          <p class="vacio">{fallo}</p>
        {:else}
          <p class="vacio">Cargando…</p>
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
                    {#if r.archivo}<a class="boton" href="/archivos/{base}/germinacion/{r.archivo.split('/').map(encodeURIComponent).join('/')}" target="_blank" rel="noopener">Abrir PDF</a>{/if}
                    {#if r.url}<a class="boton discreto" href={r.url} target="_blank" rel="noopener noreferrer">Fuente original</a>{/if}
                  </span>
                </li>
              {/each}
            </ul>
          </section>
        {/if}

        <section>
          <h2>Tus notas</h2>
          <div class="notas">
            <Editor valor={progreso?.nodos?.[nodo.id]?.notas ?? ''} {base} alCambiar={(md) => notas.programar(md)}
              marcador="Lo que vas aprendiendo, dudas, avances… La sesión los leerá cuando le comuniques tus avances." />
          </div>
        </section>
      </aside>
      </div>
      {#if conTaller}
        <div class="lado-taller">
          <Taller {ref} {nodo} {base} bind:cita alVerDocumento={(md, titulo) => (comparando = md === null ? null : { md, titulo })}
            alCambioEnunciado={() => recarga++} />
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
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
  .estados {
    display: inline-flex;
    padding: 0.25rem;
    border: 1px solid var(--linea);
    border-radius: 999px;
    background: var(--humus-hondo);
  }
  .estados button {
    padding: 0.4rem 1rem;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--liquen-tenue);
    cursor: pointer;
    transition: background 0.3s, color 0.3s;
  }
  .estados button.elegido {
    background: var(--superficie-alta);
    color: var(--liquen);
  }
  .estados button.elegido:is(.en-curso, .atacando) {
    color: var(--proceso);
  }
  .estados button.elegido.hecho {
    color: var(--aceptada);
  }
  .estados button.elegido.resuelta {
    color: var(--pausada);
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
  .notas {
    padding: 0.3rem 0.8rem;
    border: 1px solid var(--linea);
    border-radius: var(--radio-s);
    background: var(--humus-hondo);
  }
  /* Incógnitas: el enunciado y lo suyo a la izquierda; el taller fijo a la derecha. */
  .cuerpo.dividida {
    grid-template-columns: minmax(0, 1fr) minmax(24rem, 38rem);
    gap: 2.5rem;
  }
  .columna {
    display: grid;
    gap: 3rem;
    min-width: 0;
  }
  .cuerpo:not(.dividida) .columna {
    display: contents;
  }
  .dividida .lateral {
    position: static;
    grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
  }
  .lado-taller {
    position: sticky;
    top: 1rem;
    height: calc(100vh - 2rem);
  }
  .comparacion .bloque {
    margin: 0 0 0.8rem;
    padding: 0.2rem 0.8rem;
    border-left: 3px solid transparent;
    border-radius: 0 8px 8px 0;
  }
  .bloque.quitado {
    border-left-color: var(--rechazada);
    background: rgb(196 106 90 / 0.1);
    text-decoration: line-through;
    text-decoration-color: rgb(196 106 90 / 0.6);
    opacity: 0.75;
  }
  .bloque.nuevo {
    border-left-color: var(--aceptada);
    background: rgb(111 227 165 / 0.08);
  }
  .aviso-comparacion {
    margin: 0 0 1rem;
    color: var(--cambios);
    font-size: var(--t-1);
  }
  .enlace {
    margin-left: 0.5rem;
    border: 0;
    background: none;
    color: var(--tu);
    cursor: pointer;
  }
  @media (max-width: 1100px) {
    .cuerpo.dividida {
      grid-template-columns: 1fr;
    }
    .lado-taller {
      position: static;
      height: 75vh;
    }
    .cuerpo {
      grid-template-columns: 1fr;
    }
    .lateral {
      position: static;
    }
  }
</style>
