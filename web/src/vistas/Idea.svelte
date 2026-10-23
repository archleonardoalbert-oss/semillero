<script>
  import { onDestroy } from 'svelte';
  import { slide } from 'svelte/transition';
  import Editor from '../componentes/Editor.svelte';
  import Dictamen from '../componentes/Dictamen.svelte';
  import EnVivo from '../componentes/EnVivo.svelte';
  import { api, rutaIdea } from '../lib/api.js';
  import { renderizar } from '../lib/render.js';
  import { suscribir, refrescar, avisar, global } from '../lib/estado.svelte.js';
  import { ir, enlace } from '../lib/ruta.svelte.js';
  import { ETIQUETA_ESTADO, COLOR_ESTADO } from '../lib/estados.js';
  import { fechaRegistro } from '../lib/eventos.js';
  import { crearAutoguardado } from '../lib/autoguardado.js';

  let { carpetaId, ideaId } = $props();
  const ref = { carpetaId, ideaId };
  const base = rutaIdea(carpetaId, ideaId);

  let idea = $state(null);
  let error = $state(null);
  let guardado = $state('');
  let titulo = $state('');
  let replica = $state('');
  let versionReplica = $state(0);
  let enviando = $state(false);
  let registros = $state([]);
  let repaso = $state(null);

  let carpeta = $derived(global.carpetas.find((c) => c.id === carpetaId));
  let hayDictamen = $derived(idea?.hilo.some((m) => m.autor === 'claude'));
  let enProceso = $derived(idea?.estado === 'en-proceso');
  let ultimo = $derived(idea?.hilo.at(-1));
  let replicaPendiente = $derived(ultimo?.autor === 'usuario' && ultimo.n > 1 ? ultimo : null);

  async function cargar() {
    try {
      idea = await api.idea(carpetaId, ideaId);
      titulo = idea.titulo;
      registros = await api.registros(carpetaId, ideaId);
    } catch (e) {
      error = e.codigo === 404 ? 'Esta idea ya no existe.' : e.message;
    }
  }
  cargar();
  const quitar = suscribir(ref, (msg) => msg.tipo === 'idea' && cargar());
  onDestroy(quitar);

  const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

  // Autoguardado del texto original: 1,5 s después de dejar de escribir, o ya mismo al salir.
  const autoguardado = crearAutoguardado(async (md) => {
    try {
      const nueva = await api.editarIdea(carpetaId, ideaId, { cuerpo: md });
      if (idea) idea = { ...idea, estado: nueva.estado, editadaTrasDictamen: nueva.editadaTrasDictamen };
      guardado = 'Guardado';
      refrescar();
    } catch (e) {
      guardado = '';
      avisar(`No se pudo guardar: ${e.message}`, 'error');
    }
  }, 1500);
  function alEditarOriginal(md) {
    guardado = 'Guardando…';
    autoguardado.programar(md);
  }
  const alDescargar = (e) => {
    if (!autoguardado.hayPendiente()) return;
    autoguardado.vaciar();
    e.preventDefault();
  };
  window.addEventListener('beforeunload', alDescargar);
  onDestroy(() => {
    window.removeEventListener('beforeunload', alDescargar);
    autoguardado.vaciar();
  });

  async function guardarTitulo() {
    const t = titulo.trim();
    if (!t || t === idea.titulo) return (titulo = idea.titulo);
    try {
      await api.editarIdea(carpetaId, ideaId, { titulo: t });
      idea.titulo = t;
      refrescar();
    } catch (e) {
      avisar(`No se pudo renombrar: ${e.message}`, 'error');
    }
  }

  async function subir(archivo) {
    const { ruta } = await api.subirAdjunto(carpetaId, ideaId, archivo);
    return ruta;
  }

  async function enviarReplica() {
    if (!replica.trim()) return;
    enviando = true;
    try {
      idea = await api.responder(carpetaId, ideaId, replica);
      replica = '';
      versionReplica++;
      refrescar();
      avisar('Réplica guardada. Se enviará a la misma sesión en el próximo análisis.');
    } catch (e) {
      avisar(`No se pudo guardar la réplica: ${e.message}`, 'error');
    } finally {
      enviando = false;
    }
  }

  async function borrar() {
    if (!confirm(`¿Borrar «${idea.titulo}» con todo su hilo y sus dictámenes? No se puede deshacer.`)) return;
    try {
      await api.borrarIdea(carpetaId, ideaId);
      refrescar();
      ir(enlace.carpeta(carpetaId));
    } catch (e) {
      avisar(`No se pudo borrar: ${e.message}`, 'error');
    }
  }
</script>

{#if error}
  <p class="error">{error}</p>
{:else if idea}
  <article class="pagina">
    <nav class="migas">
      <a href={enlace.carpeta(carpetaId)} onclick={(e) => (e.preventDefault(), ir(enlace.carpeta(carpetaId)))}>
        <span style:background={carpeta?.color}></span>{carpeta?.nombre ?? carpetaId}
      </a>
    </nav>

    <textarea class="titulo" rows="1" bind:value={titulo} onblur={guardarTitulo}
      onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), e.currentTarget.blur())} aria-label="Título de la idea" maxlength="140"></textarea>

    <p class="estado">
      <span class="punto" class:late={enProceso} style:background={COLOR_ESTADO[idea.estado]}></span>
      {ETIQUETA_ESTADO[idea.estado]}
      {#if idea.estado === 'error' && idea.error}<span class="detalle">: {idea.error}</span>{/if}
      <span class="creada">Escrita el {fecha(idea.creada)}</span>
    </p>

    {#if enProceso}
      <EnVivo {ref} />
    {/if}

    {#each idea.hilo as m (m.archivo)}
      {#if m.autor === 'usuario'}
        <section class="tu" class:original={m.n === 1}>
          <header>
            <span class="voz">{m.n === 1 ? 'Tu idea' : 'Tu réplica'}</span>
            {#if m.n === 1 && !enProceso}<span class="guardado">{guardado}</span>{/if}
          </header>
          {#if m.n === 1}
            <Editor valor={m.contenido} {base} soloLectura={enProceso} alCambiar={alEditarOriginal} alSubirImagen={subir}
              autofoco={!m.contenido} marcador="Describe tu idea con todo el detalle que puedas: qué es, por qué se te ocurrió, cómo crees que funcionaría…" />
          {:else}
            <div class="manuscrito">{@html renderizar(m.contenido, base)}</div>
            {#if m === replicaPendiente && !enProceso}
              <p class="espera">Pendiente de análisis: se enviará a la sesión al pulsar «Comenzar Análisis».</p>
            {/if}
          {/if}
        </section>
      {:else}
        <Dictamen mensaje={m} {base} fecha={m === idea.hilo.findLast((x) => x.autor === 'claude') ? fecha(idea.ultimoVeredicto) : ''} />
      {/if}
    {/each}

    {#if hayDictamen && !enProceso}
      <section class="tu replica" class:urgente={idea.estado === 'aclaracion'}>
        <header>
          <span class="voz">{idea.estado === 'aclaracion' ? 'Claude necesita que le aclares esto' : replicaPendiente ? 'Añadir a tu réplica' : 'Responder al dictamen'}</span>
        </header>
        {#key versionReplica}
          <Editor valor="" {base} alCambiar={(md) => (replica = md)} alSubirImagen={subir}
            marcador="Cuestiona el veredicto, aporta datos nuevos o pide que profundice en algo…" />
        {/key}
        <div class="acciones">
          <button class="boton" disabled={!replica.trim() || enviando} onclick={enviarReplica}>Guardar réplica</button>
        </div>
      </section>
    {/if}

    {#if registros.length}
      <details class="registros">
        <summary>Registros de análisis ({registros.length})</summary>
        <ul>
          {#each registros as r (r)}
            <li>
              <button class="boton discreto" onclick={() => (repaso = repaso === r ? null : r)}>
                {fechaRegistro(r)?.toLocaleString('es') ?? r}
              </button>
            </li>
          {/each}
        </ul>
        {#if repaso}
          <div transition:slide><EnVivo {ref} archivo={repaso} /></div>
        {/if}
      </details>
    {/if}

    <footer class="pie">
      <button class="boton discreto" onclick={borrar} disabled={enProceso}>Borrar idea</button>
    </footer>
  </article>
{/if}

<style>
  .pagina {
    max-width: 46rem;
    margin: 0 auto;
    padding: 2.5rem 0 6rem;
  }
  .migas a {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--liquen-tenue);
    text-decoration: none;
  }
  .migas span {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
  }
  .titulo {
    width: 100%;
    margin: 0.6rem 0 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--liquen);
    font-family: var(--serif);
    font-size: var(--t5);
    line-height: 1.05;
    letter-spacing: -0.015em;
    resize: none;
    field-sizing: content;
    overflow: hidden;
  }
  .titulo:focus {
    outline: none;
    text-decoration: underline dotted var(--linea-viva);
    text-underline-offset: 0.2em;
  }
  .estado {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin: 0.8rem 0 2rem;
    color: var(--liquen-tenue);
  }
  .punto {
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;
  }
  .punto.late {
    animation: latir 1.6s ease-in-out infinite;
  }
  @keyframes latir {
    50% {
      transform: scale(1.5);
      box-shadow: 0 0 14px var(--proceso);
    }
  }
  .detalle {
    color: var(--rechazada);
  }
  .creada {
    margin-left: auto;
    font-size: var(--t-1);
    color: var(--liquen-apagado);
  }
  /* Tu voz: filete azul a la izquierda y encabezado en sans. */
  .tu {
    position: relative;
    padding: 0.2rem 0 0.2rem 1.4rem;
    border-left: 2px solid var(--tu);
  }
  .tu + .tu {
    margin-top: 2rem;
  }
  .tu header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 0.2rem;
  }
  .voz {
    font-family: var(--sans);
    font-weight: 600;
    color: var(--tu);
  }
  .guardado,
  .espera {
    font-size: var(--t-1);
    color: var(--liquen-apagado);
  }
  .replica {
    margin-top: 3rem;
    padding-top: 0.6rem;
    padding-bottom: 0.6rem;
    border-left-style: dashed;
    background: linear-gradient(90deg, var(--tu-velo), transparent 60%);
  }
  .replica.urgente {
    border-left: 3px solid var(--aclaracion);
    background: linear-gradient(90deg, rgb(179 156 255 / 0.09), transparent 70%);
  }
  .replica.urgente .voz {
    color: var(--aclaracion);
  }
  .acciones {
    display: flex;
    justify-content: flex-end;
  }
  .registros {
    margin-top: 3rem;
    color: var(--liquen-tenue);
  }
  .registros summary {
    cursor: pointer;
  }
  .registros ul {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin: 0.6rem 0;
    padding: 0;
    list-style: none;
  }
  .pie {
    margin-top: 4rem;
    padding-top: 1rem;
    border-top: 1px solid var(--linea);
  }
  .error {
    padding: 4rem 0;
    color: var(--liquen-tenue);
  }
</style>
