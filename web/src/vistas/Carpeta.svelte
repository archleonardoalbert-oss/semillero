<script>
  import { api } from '../lib/api.js';
  import { renderizar } from '../lib/render.js';
  import { global, refrescar, avisar } from '../lib/estado.svelte.js';
  import { ir, enlace } from '../lib/ruta.svelte.js';
  import { ETIQUETA_ESTADO, COLOR_ESTADO } from '../lib/estados.js';
  import { tipoDe, cargarTipos } from '../lib/tipos.svelte.js';
  import SelectorTipo from '../componentes/SelectorTipo.svelte';

  let { carpetaId } = $props();

  let ideas = $state(null);
  let notas = $state('');
  let titulo = $state('');
  let nombre = $state('');
  let creando = $state(false);
  let descripcion = $state('');
  let cambiandoTipo = $state(false);
  cargarTipos();
  // La descripción solo se sincroniza cuando cambia en el servidor, no con cada refresco: así no pisa lo que se escribe.
  let descripcionGuardada = null;
  $effect(() => {
    const d = carpeta?.descripcion ?? '';
    if (d !== descripcionGuardada) {
      if (descripcion === (descripcionGuardada ?? '')) descripcion = d;
      descripcionGuardada = d;
    }
  });

  let carpeta = $derived(global.carpetas.find((c) => c.id === carpetaId));
  $effect(() => {
    if (carpeta) nombre = carpeta.nombre;
  });
  $effect(() => {
    global.resumen;
    api.ideas({ carpeta: carpetaId }).then((r) => (ideas = r.reverse()));
  });
  api.notasCarpeta(carpetaId).then((r) => (notas = r.texto)).catch(() => {});

  const tieneNotas = $derived(notas.replace(/^# .*\n/, '').trim().length > 0);
  const fecha = (iso) => new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });

  async function nueva(ev) {
    ev.preventDefault();
    if (!titulo.trim()) return;
    creando = true;
    try {
      const i = await api.crearIdea(carpetaId, { titulo, cuerpo: '' });
      refrescar();
      ir(enlace.idea(carpetaId, i.id));
    } catch (e) {
      avisar(`No se pudo crear la idea: ${e.message}`, 'error');
      creando = false;
    }
  }

  async function renombrar() {
    if (!nombre.trim() || nombre === carpeta.nombre) return (nombre = carpeta.nombre);
    await api.editarCarpeta(carpetaId, { nombre }).catch((e) => avisar(e.message, 'error'));
    refrescar();
  }

  async function guardarDescripcion() {
    if (descripcion.trim() === (carpeta.descripcion ?? '')) return;
    await api.editarCarpeta(carpetaId, { descripcion }).catch((e) => avisar(e.message, 'error'));
    refrescar();
  }

  async function cambiarTipo(t) {
    const nombreTipo = tipoDe({ tipo: t })?.nombre ?? t;
    if (!confirm(`¿Fijar «${nombreTipo}» como tipo de este bancal? No se podrá cambiar después.`)) return;
    try {
      await api.editarCarpeta(carpetaId, { tipo: t });
      cambiandoTipo = false;
      refrescar();
    } catch (e) {
      avisar(e.message === 'tipo-fijo' ? 'El tipo de este bancal ya está fijado.' : e.message, 'error');
    }
  }

  async function borrar() {
    if (!confirm(`¿Borrar el bancal «${carpeta.nombre}»?`)) return;
    try {
      await api.borrarCarpeta(carpetaId);
      refrescar();
      ir(enlace.inicio());
    } catch (e) {
      avisar(e.message === 'carpeta-no-vacia' ? 'Solo se puede borrar un bancal vacío.' : e.message, 'error');
    }
  }
</script>

{#if carpeta}
  <div class="pagina">
    <header style:--color={carpeta.color}>
      <input class="nombre" bind:value={nombre} onblur={renombrar} onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        aria-label="Nombre del bancal" maxlength="60" />
      <p>
        {tipoDe(carpeta)?.nombre ?? ''}, {ideas?.length ?? '…'} {ideas?.length === 1 ? 'idea' : 'ideas'}
        {#if !carpeta.tipoFijado}
          <button class="enlace" onclick={() => (cambiandoTipo = !cambiandoTipo)}>{cambiandoTipo ? 'Elegirlo más tarde' : 'Elegir el tipo'}</button>
        {/if}
      </p>
      <textarea class="descripcion" bind:value={descripcion} onblur={guardarDescripcion} rows="2" maxlength="2000"
        aria-label="Descripción del bancal" placeholder="Añade una descripción: de qué va este bancal y qué buscas. Las sesiones la leen."></textarea>
    </header>

    {#if cambiandoTipo && !carpeta.tipoFijado}
      <div class="tipo">
        <p class="nota">Este bancal es anterior a los tipos y se está juzgando como Investigación académica. El tipo decide cómo se juzgan sus ideas y <strong>solo se elige una vez</strong>: después ya no se puede cambiar. Lo ya analizado no cambia; las sesiones nuevas y las que retomes usarán sus criterios.</p>
        <SelectorTipo valor={null} alElegir={cambiarTipo} />
      </div>
    {/if}

    <form class="sembrar" onsubmit={nueva}>
      <input class="campo" bind:value={titulo} placeholder="Título de una idea nueva" maxlength="140" />
      <button class="boton primario" disabled={!titulo.trim() || creando}>Escribir idea</button>
    </form>

    {#if ideas?.length}
      <ul class="ideas">
        {#each ideas as i (i.id)}
          <li>
            <a href={enlace.idea(carpetaId, i.id)} onclick={(e) => (e.preventDefault(), ir(enlace.idea(carpetaId, i.id)))}>
              <span class="punto" style:background={COLOR_ESTADO[i.estado]} class:late={i.estado === 'en-proceso'}></span>
              <span class="titulo">{i.titulo}</span>
              <span class="estado">{ETIQUETA_ESTADO[i.estado]}</span>
              <time>{fecha(i.creada)}</time>
              {#if i.resumen}<span class="resumen">{i.resumen}</span>{/if}
            </a>
          </li>
        {/each}
      </ul>
    {:else if ideas}
      <p class="vacio">Este bancal está vacío. Escribe arriba el título de tu primera idea.</p>
    {/if}

    <details class="memoria" open={tieneNotas}>
      <summary>Memoria de este bancal</summary>
      {#if tieneNotas}
        <div class="manuscrito">{@html renderizar(notas)}</div>
      {:else}
        <p class="vacio">Aquí anotarán las sesiones de Claude lo que vayan aprendiendo sobre este tema.</p>
      {/if}
    </details>

    {#if ideas && !ideas.length}
      <button class="boton discreto" onclick={borrar}>Borrar bancal</button>
    {/if}
  </div>
{:else}
  <p class="vacio">Cargando…</p>
{/if}

<style>
  .pagina {
    max-width: 52rem;
    padding: 3rem 0 6rem;
  }
  header {
    border-left: 4px solid var(--color);
    padding-left: 1.2rem;
  }
  .nombre {
    width: 100%;
    padding: 0;
    border: 0;
    background: none;
    color: var(--liquen);
    font-family: var(--serif);
    font-size: var(--t5);
    line-height: 1.05;
  }
  .nombre:focus {
    outline: none;
  }
  header p {
    margin: 0.3rem 0 0;
    color: var(--liquen-tenue);
  }
  .enlace {
    margin-left: 0.8rem;
    padding: 0;
    border: 0;
    background: none;
    color: var(--tu);
    font: inherit;
    cursor: pointer;
  }
  .enlace:hover {
    text-decoration: underline;
  }
  .descripcion {
    width: 100%;
    margin-top: 0.7rem;
    padding: 0.3rem 0;
    border: 0;
    border-bottom: 1px dashed transparent;
    background: none;
    color: var(--liquen);
    font-family: var(--serif);
    font-size: var(--t1);
    font-style: italic;
    resize: vertical;
  }
  .descripcion:hover,
  .descripcion:focus {
    outline: none;
    border-bottom-color: var(--linea-viva);
  }
  .tipo {
    margin-top: 1.6rem;
    padding: 1.2rem 1.4rem 0.4rem;
    border: 1px solid var(--linea);
    background: var(--superficie);
  }
  .nota {
    margin: 0;
    color: var(--liquen-tenue);
    font-size: var(--t-1);
  }
  .sembrar {
    display: flex;
    gap: 0.8rem;
    margin: 2.2rem 0 1.4rem;
  }
  .ideas {
    margin: 0;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--linea);
  }
  .ideas li {
    border-bottom: 1px solid var(--linea);
  }
  .ideas a {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    align-items: center;
    gap: 0.2rem 1rem;
    padding: 0.85rem 0.4rem;
    text-decoration: none;
    transition: background 0.2s;
  }
  .ideas a:hover {
    background: var(--superficie);
  }
  .punto {
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;
  }
  .punto.late {
    box-shadow: 0 0 10px var(--proceso);
  }
  .titulo {
    font-family: var(--serif);
    font-size: var(--t1);
  }
  .estado,
  time {
    font-size: var(--t-1);
    color: var(--liquen-tenue);
  }
  time {
    color: var(--liquen-apagado);
  }
  .resumen {
    grid-column: 2 / -1;
    font-family: var(--serif);
    font-style: italic;
    color: var(--liquen-tenue);
  }
  .memoria {
    margin: 3rem 0 2rem;
  }
  .memoria summary {
    cursor: pointer;
    font-family: var(--serif);
    font-size: var(--t2);
  }
  .vacio {
    color: var(--liquen-tenue);
  }
  @media (max-width: 640px) {
    .ideas a {
      grid-template-columns: auto 1fr;
    }
    .estado,
    time {
      grid-column: 2;
    }
  }
</style>
