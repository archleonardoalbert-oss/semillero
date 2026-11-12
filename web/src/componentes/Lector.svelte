<script>
  import { RAIZ_ARCHIVOS } from '../lib/archivos.js';
  import { untrack } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { renderizar } from '../lib/render.js';
  import { escenas } from '../lib/escenas.js';

  // El lector de una asignatura de curso: una conferencia, clase práctica o demostración para valientes a la
  // vez, con sus escenas animadas montadas en el texto, el índice de la asignatura al lado y los recursos que
  // cita. `cargar(documento)` devuelve el Markdown (la app lo pide a la API; el visor exportado, a su copia).
  // `Glosable` llega como componente desde la app (con `glosas`); el visor exportado no lo pasa, para no
  // arrastrar el estado de la app ni su WebSocket: allí el texto se lee sin pedir explicaciones.
  // `aviso`: un texto destacado sobre el documento (p. ej. que es un borrador de una asignatura sin terminar).
  // `total`: en un borrador, cuántas conferencias tendrá la asignatura según su plan (no solo las ya escritas).
  let { nodo, indice, inicial, base, glosas = null, Glosable = null, cargar, alCerrar, aviso = null, total = null } = $props();

  const TIPO_RECURSO = { libro: 'Libro', articulo: 'Artículo', curso: 'Curso', web: 'Web', video: 'Vídeo', otro: 'Recurso' };
  let piezas = $derived([
    ...indice.conferencias.map((x, k) => ({ ...x, clase: 'conferencia', rotulo: `Conferencia ${Number(x.id.match(/^c(\d+)/)?.[1]) || k + 1} de ${total ?? indice.conferencias.length}`, corto: `${k + 1}` })),
    ...indice.practicas.map((x, k) => ({ ...x, clase: 'practica', rotulo: `Clase práctica ${k + 1}`, corto: `P${k + 1}` })),
    ...indice.valientes.map((x) => ({ ...x, clase: 'valiente', rotulo: 'Demostración para valientes', corto: '⚔' })),
  ]);
  let actual = $state(inicial);
  let pieza = $derived(piezas.find((x) => x.id === actual) ?? piezas[0]);
  let pos = $derived(piezas.indexOf(pieza));
  let recursos = $derived(indice.recursos.filter((r) => !r.conferencias?.length || r.conferencias.includes(pieza.id) || pieza.conferencias?.some((c) => r.conferencias.includes(c))));

  let texto = $state(null);
  let fallo = $state(null);
  let hoja = $state();
  $effect(() => {
    const doc = pieza.documento;
    let vigente = true; // al cambiar rápido de documento, la respuesta del anterior se descarta
    texto = null;
    fallo = null;
    cargar(`germinacion/${doc}`)
      .then((t) => vigente && (texto = t))
      .catch(() => vigente && (fallo = 'No se pudo cargar este documento.'));
    untrack(() => hoja?.scrollTo({ top: 0 }));
    return () => (vigente = false);
  });

  const archivo = (r) => `${RAIZ_ARCHIVOS}/${base}/germinacion/${r.archivo.split('/').map(encodeURIComponent).join('/')}`;
  const esPdf = (r) => /\.pdf$/i.test(r.archivo);
  const ir = (k) => k >= 0 && k < piezas.length && (actual = piezas[k].id);
  function tecla(e) {
    if (e.key !== 'Escape' || document.querySelector('aside.hoja, div.panel')) return;
    if (e.target.closest?.('textarea, input, [contenteditable="true"]')) return;
    e.stopPropagation();
    alCerrar();
  }
</script>

<svelte:window onkeydown={tecla} />

<div class="lector {pieza.clase}" role="dialog" aria-label={pieza.titulo} bind:this={hoja} transition:fly={{ y: 24, duration: 420, easing: cubicOut }}>
  <nav class="barra">
    <button class="volver" onclick={alCerrar}>
      <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" /></svg>
      {nodo.titulo}
    </button>
  </nav>

  <div class="rejilla">
    <article>
      <header>
        {#if aviso}<p class="aviso-borrador">{aviso}</p>{/if}
        <p class="clase">{pieza.rotulo}</p>
        <h1>{pieza.titulo}</h1>
        {#if pieza.resumen}<p class="resumen">{pieza.resumen}</p>{/if}
        {#if pieza.objetivos?.length}
          <div class="objetivos">
            <h2>Al terminar podrás</h2>
            <ul>{#each pieza.objetivos as o, k (k)}<li>{o}</li>{/each}</ul>
          </div>
        {/if}
      </header>

      <div class="texto" use:escenas>
        {#key pieza.id}
          {#if texto !== null}
            <div in:fade={{ duration: 250 }}>
              {#if glosas && Glosable}
                <Glosable html={renderizar(texto, base)} documento="germinacion/{pieza.documento}" autor="claude" {glosas} {base} flotante />
              {:else}
                <div class="manuscrito">{@html renderizar(texto, base)}</div>
              {/if}
            </div>
          {:else if fallo}
            <p class="vacio">{fallo}</p>
          {:else}
            <p class="vacio">Cargando…</p>
          {/if}
        {/key}
      </div>

      <footer class="vecinos">
        {#if pos > 0}<button onclick={() => ir(pos - 1)}><small>Anterior</small>{piezas[pos - 1].titulo}</button>{:else}<span></span>{/if}
        {#if pos < piezas.length - 1}<button class="sig" onclick={() => ir(pos + 1)}><small>Siguiente</small>{piezas[pos + 1].titulo}</button>{/if}
      </footer>
    </article>

    <aside class="lateral">
      <section>
        <h2>En esta asignatura</h2>
        <ol class="indice">
          {#each piezas as x (x.id)}
            <li class:actual={x.id === pieza.id} class={x.clase}>
              <button onclick={() => (actual = x.id)}><span class="corto">{x.corto}</span>{x.titulo}</button>
            </li>
          {/each}
        </ol>
      </section>
      {#if recursos.length}
        <section>
          <h2>Para leer junto a esto</h2>
          <ul class="recursos">
            {#each recursos as r (r.id)}
              <li class={r.tipo}>
                <span class="tipo-recurso">{TIPO_RECURSO[r.tipo] ?? 'Recurso'}{r.idioma ? `, ${r.idioma}` : ''}</span>
                <strong>{r.titulo}</strong>
                {#if r.autores}<span class="autores">{r.autores}{r.anio ? `, ${r.anio}` : ''}</span>{/if}
                {#if r.nota}<div class="nota manuscrito">{@html renderizar(r.nota, base)}</div>{/if}
                <span class="acciones">
                  {#if r.archivo}<a class="boton" href={archivo(r)} target="_blank" rel="noopener">{esPdf(r) ? 'Abrir PDF' : 'Abrir'}</a>{/if}
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

<style>
  .lector {
    position: fixed;
    inset: 0;
    z-index: 45;
    overflow-y: auto;
    background:
      radial-gradient(70vw 45vh at 30% -10%, color-mix(in srgb, var(--acento) 8%, transparent), transparent 70%),
      var(--humus);
    --acento: var(--aceptada);
  }
  .practica {
    --acento: var(--cambios);
  }
  .valiente {
    --acento: var(--rechazada);
  }
  .barra {
    position: sticky;
    top: 0;
    z-index: 2;
    padding: 0.9rem 2rem;
    background: linear-gradient(var(--humus) 70%, transparent);
  }
  .volver {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.8rem 0.4rem 0.5rem;
    border: 1px solid var(--linea);
    border-radius: 999px;
    background: var(--humus);
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
  .rejilla {
    display: grid;
    grid-template-columns: minmax(0, 50rem) 21rem;
    gap: 4rem;
    justify-content: center;
    padding: 0.5rem 2rem 6rem;
  }
  header {
    margin: 1.2rem 0 2.4rem;
  }
  .aviso-borrador {
    margin: 0 0 1rem;
    padding: 0.5rem 0.9rem;
    border-left: 3px solid var(--proceso);
    background: var(--humus-hondo);
    color: var(--liquen-tenue);
    font-size: var(--t-1);
  }
  .clase {
    margin: 0;
    color: var(--acento);
    font-weight: 600;
  }
  h1 {
    margin: 0.3rem 0 0.5rem;
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
  .objetivos {
    padding: 0.9rem 1.2rem;
    border-left: 3px solid var(--acento);
    background: var(--humus-hondo);
    border-radius: 0 var(--radio-s) var(--radio-s) 0;
  }
  .objetivos h2 {
    margin: 0 0 0.4rem;
    font-size: var(--t-1);
    color: var(--acento);
  }
  .objetivos ul {
    margin: 0;
    padding-left: 1.1rem;
    color: var(--liquen);
  }
  .vacio {
    color: var(--liquen-tenue);
  }
  .vecinos {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 4rem;
    padding-top: 1.4rem;
    border-top: 1px solid var(--linea);
  }
  .vecinos button {
    display: grid;
    gap: 0.2rem;
    max-width: 45%;
    padding: 0.7rem 1rem;
    border: 1px solid var(--linea);
    border-radius: var(--radio-s);
    background: transparent;
    color: var(--liquen);
    text-align: left;
    cursor: pointer;
    font-family: var(--serif);
    font-size: var(--t1);
  }
  .vecinos .sig {
    margin-left: auto;
    text-align: right;
  }
  .vecinos button:hover {
    border-color: var(--acento);
  }
  .vecinos small {
    font-family: var(--sans);
    font-size: var(--t-1);
    color: var(--liquen-tenue);
  }
  .lateral {
    position: sticky;
    top: 4.5rem;
    align-self: start;
    display: grid;
    gap: 2rem;
    max-height: calc(100vh - 5.5rem);
    overflow-y: auto;
  }
  .lateral h2 {
    margin: 0 0 0.6rem;
    font-family: var(--serif);
    font-weight: 500;
    font-size: var(--t1);
  }
  .indice {
    margin: 0;
    padding: 0;
    list-style: none;
    border-left: 1px solid var(--linea);
  }
  .indice button {
    display: flex;
    gap: 0.6rem;
    width: 100%;
    margin-left: -1px;
    padding: 0.4rem 0.7rem;
    border: 0;
    border-left: 2px solid transparent;
    background: none;
    color: var(--liquen-tenue);
    text-align: left;
    cursor: pointer;
    font-size: 0.92rem;
  }
  .indice button:hover {
    color: var(--liquen);
  }
  .indice .actual button {
    color: var(--liquen);
    border-left-color: var(--acento);
  }
  .corto {
    flex: 0 0 1.8rem;
    color: var(--liquen-apagado);
    font-variant-numeric: tabular-nums;
  }
  .indice .practica .corto {
    color: var(--cambios);
  }
  .indice .valiente .corto {
    color: var(--rechazada);
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
  .recursos .curso,
  .recursos .video {
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
    line-height: 1.3;
  }
  .autores,
  .nota {
    font-size: var(--t-1);
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
    .rejilla {
      grid-template-columns: minmax(0, 1fr);
    }
    .lateral {
      position: static;
      max-height: none;
    }
  }
</style>
