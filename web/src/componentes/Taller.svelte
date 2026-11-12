<script>
  import { RAIZ_ARCHIVOS } from '../lib/archivos.js';
  import { onDestroy, tick } from 'svelte';
  import { fly, slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { api } from '../lib/api.js';
  import { renderizar } from '../lib/render.js';
  import { suscribir, avisar } from '../lib/estado.svelte.js';
  import { crearTranscripcion } from '../lib/eventos.js';
  import { ir, enlace } from '../lib/ruta.svelte.js';

  // El taller de una incógnita: conversación continua con su sesión dedicada, que asesora, corrige,
  // conecta con otras ideas y propone cómo evoluciona el enunciado (el usuario decide si aplicarlo).
  // `cita`: texto que la lámina pide añadir a la caja (al citar un fragmento del enunciado).
  // `alVerDocumento(md | null, titulo)`: muestra a la izquierda una propuesta o versión (null = el enunciado vigente).
  let { ref, nodo, base, cita = $bindable(''), alVerDocumento, alCambioEnunciado, alIrMismaIdea = null } = $props();

  let taller = $state(null);
  let entrantes = $state([]);
  let texto = $state('');
  let adjuntos = $state([]); // { ruta, nombre }
  let enviando = $state(false);
  let subiendo = $state(0);
  let verVersiones = $state(false);
  let version = $state(0);
  let caja = $state();
  let entrada = $state();
  let transcripcion = crearTranscripcion();

  const rutaTaller = `germinacion/talleres/${nodo.id}`;
  let enCurso = $derived(taller?.estado === 'en-proceso');

  async function cargar() {
    try {
      const r = await api.taller(ref.carpetaId, ref.ideaId, nodo.id);
      taller = r.taller;
      entrantes = r.entrantes;
      bajar();
    } catch (e) {
      avisar(`No se pudo cargar el taller: ${e.message}`, 'error');
    }
  }
  cargar();

  const quitar = suscribir(ref, (msg) => {
    if (msg.tipo === 'reconexion') cargar();
    if (msg.nodo !== nodo.id) return;
    if (msg.tipo === 'taller') {
      const antes = taller?.versiones?.length ?? 0;
      taller = msg.taller;
      if (msg.taller.estado !== 'en-proceso') {
        transcripcion = crearTranscripcion();
        version++;
      }
      if ((msg.taller.versiones?.length ?? 0) !== antes) alCambioEnunciado?.();
      bajar();
    } else if (msg.tipo === 'taller-evento') {
      transcripcion.aplicar(msg.ev);
      version++;
      bajar();
    }
  });
  onDestroy(quitar);

  async function bajar() {
    await tick();
    if (caja) caja.scrollTop = caja.scrollHeight;
  }

  // Lo que se cita desde el enunciado llega a la caja como cita en Markdown.
  $effect(() => {
    if (!cita) return;
    texto = `${texto ? `${texto}\n\n` : ''}> ${cita.replace(/\n/g, '\n> ')}\n\n`;
    cita = '';
    tick().then(() => entrada?.focus());
  });

  let vivo = $derived.by(() => {
    version;
    const b = transcripcion.bloques;
    return { ultimo: b.at(-1), texto: b.findLast((x) => x.tipo === 'texto')?.texto ?? '' };
  });

  async function subir(archivos) {
    for (const archivo of archivos) {
      subiendo++;
      try {
        const { ruta } = await api.adjuntarTaller(ref.carpetaId, ref.ideaId, nodo.id, archivo);
        adjuntos = [...adjuntos, { ruta, nombre: archivo.name || ruta.split('/').at(-1) }];
      } catch (e) {
        avisar(e.message === 'extension-invalida' ? `No se admite «${archivo.name}»: imágenes, PDF, txt, md, csv, py, ipynb o json.` : `No se pudo adjuntar: ${e.message}`, 'error');
      } finally {
        subiendo--;
      }
    }
  }

  function pegar(e) {
    const imagenes = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
    if (imagenes.length) {
      e.preventDefault();
      subir(imagenes);
    }
  }

  async function enviar() {
    if ((!texto.trim() && !adjuntos.length) || enviando || enCurso || subiendo) return;
    enviando = true;
    try {
      transcripcion = crearTranscripcion();
      version++;
      taller = await api.enviarTaller(ref.carpetaId, ref.ideaId, nodo.id, { texto, adjuntos: adjuntos.map((a) => a.ruta) });
      texto = '';
      adjuntos = [];
      bajar();
    } catch (e) {
      avisar(
        { 'en-proceso': 'Espera: la sesión de este taller o la germinación están trabajando.', cuota: 'La investigación está pausada por cuota; el taller también espera.' }[e.message] ?? `No se pudo enviar: ${e.message}`,
        'error',
      );
    } finally {
      enviando = false;
    }
  }

  async function verPropuesta() {
    const md = await api.documento(ref.carpetaId, ref.ideaId, `${rutaTaller}/propuesta.md`).catch(() => null);
    if (md !== null) alVerDocumento(md, 'Propuesta de la sesión');
  }

  async function decidir(accion) {
    try {
      taller = await api.propuestaTaller(ref.carpetaId, ref.ideaId, nodo.id, accion);
      alVerDocumento(null);
      if (accion === 'aplicar') {
        alCambioEnunciado?.();
        avisar('Enunciado actualizado. La versión anterior queda en el historial.');
      }
    } catch (e) {
      avisar(e.message === 'en-proceso' ? 'Espera a que termine la sesión o la germinación.' : `No se pudo: ${e.message}`, 'error');
    }
  }

  async function verVersion(v) {
    const md = await api.documento(ref.carpetaId, ref.ideaId, `${rutaTaller}/versiones/${String(v.n).padStart(3, '0')}.md`).catch(() => null);
    if (md !== null) alVerDocumento(md, `Versión ${v.n} (${new Date(v.fecha).toLocaleString('es')})`);
  }

  async function restaurar(v) {
    if (!confirm(`¿Restaurar la versión ${v.n} del enunciado? La vigente quedará también en el historial.`)) return;
    try {
      taller = await api.restaurarTaller(ref.carpetaId, ref.ideaId, nodo.id, v.n);
      alVerDocumento(null);
      alCambioEnunciado?.();
    } catch (e) {
      avisar(`No se pudo restaurar: ${e.message}`, 'error');
    }
  }

  // Dentro de la misma idea se abre la lámina directamente; si no, se navega a la otra idea.
  const irA = (c) =>
    c.carpetaId === ref.carpetaId && c.ideaId === ref.ideaId && alIrMismaIdea ? alIrMismaIdea(c.nodo) : ir(enlace.idea(c.carpetaId, c.ideaId, c.nodo));
  const ACCION = { WebSearch: 'Buscando', WebFetch: 'Leyendo una fuente', Read: 'Leyendo', Bash: 'Calculando', Write: 'Escribiendo la propuesta', Edit: 'Escribiendo' };
</script>

<section class="taller">
  <header>
    <h2>Taller con Claude</h2>
    <p>Una sesión dedicada a este problema: cuéntale tus avances y resultados, y te dirá si vas bien, qué te falta y con qué se conecta.</p>
  </header>

  {#if taller?.conexiones?.length || entrantes.length}
    <div class="conexiones">
      {#each taller?.conexiones ?? [] as c (`${c.carpetaId}/${c.ideaId}/${c.nodo}`)}
        <button class="conexion" onclick={() => irA(c)} title={c.relacion}>
          <span class="flecha">→</span><span class="rel">{c.relacion}</span>
        </button>
      {/each}
      {#each entrantes as c (`${c.desde.carpetaId}/${c.desde.ideaId}/${c.desde.nodo}`)}
        <button class="conexion entrante" onclick={() => irA(c.desde)} title={c.relacion}>
          <span class="flecha">←</span><span class="rel">{c.relacion}</span>
        </button>
      {/each}
    </div>
  {/if}

  <div class="hilo" bind:this={caja}>
    {#if taller && !taller.mensajes.length}
      <p class="vacio">
        Empieza contando por dónde vas: qué has leído, qué has intentado, qué resultados tienes (adjúntalos). La sesión
        leerá el enunciado, sus dependencias y las incógnitas de tus otras ideas antes de responder.
      </p>
    {/if}
    {#each taller?.mensajes ?? [] as m, i (i)}
      {#if m.autor === 'usuario'}
        <div class="tu" in:fly={{ y: 10, duration: 250 }}>
          {#if m.contenido}<div class="manuscrito">{@html renderizar(m.contenido, base)}</div>{/if}
          {#if m.adjuntos?.length}
            <ul class="adjuntos">
              {#each m.adjuntos as a (a)}
                <li><a href="{RAIZ_ARCHIVOS}/{base}/{a}" target="_blank" rel="noopener">{a.split('/').at(-1)}</a></li>
              {/each}
            </ul>
          {/if}
        </div>
      {:else}
        <div class="claude manuscrito" in:fly={{ y: 10, duration: 300 }}>{@html renderizar(m.contenido, base)}</div>
      {/if}
    {/each}
    {#if enCurso}
      <div class="vivo">
        <span class="luz"></span>
        {#if vivo.ultimo?.tipo === 'herramienta'}{ACCION[vivo.ultimo.herramienta] ?? 'Trabajando'}{vivo.ultimo.query ? `: «${vivo.ultimo.query}»` : '…'}{:else if vivo.texto}Escribiendo…{:else}Pensando…{/if}
      </div>
      {#if vivo.texto}<div class="claude manuscrito borrador">{@html renderizar(vivo.texto, base)}</div>{/if}
    {:else if taller?.estado === 'error'}
      <p class="fallo">La sesión no pudo responder: {taller.error}</p>
    {/if}
  </div>

  {#if taller?.propuesta}
    <div class="propuesta" transition:slide={{ duration: 300, easing: cubicOut }}>
      <p class="titulo-propuesta">La sesión propone una nueva versión del enunciado</p>
      <p class="resumen">{taller.propuesta.resumen}</p>
      <div class="acciones">
        <button class="boton discreto" onclick={verPropuesta}>Ver cambios</button>
        <button class="boton discreto" onclick={() => decidir('descartar')}>Descartar</button>
        <button class="boton primario" onclick={() => decidir('aplicar')}>Aplicar</button>
      </div>
    </div>
  {/if}

  {#if taller?.versiones?.length}
    <div class="versiones">
      <button class="boton discreto" onclick={() => (verVersiones = !verVersiones)}>Historial del enunciado ({taller.versiones.length})</button>
      {#if verVersiones}
        <ul transition:slide={{ duration: 250 }}>
          {#each [...taller.versiones].reverse() as v (v.n)}
            <li>
              <span>Versión {v.n}: {v.resumen || 'sin resumen'}</span>
              <button class="enlace" onclick={() => verVersion(v)}>Ver</button>
              <button class="enlace" onclick={() => restaurar(v)}>Restaurar</button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}

  <footer>
    {#if adjuntos.length || subiendo}
      <ul class="por-enviar">
        {#each adjuntos as a, k (a.ruta)}
          <li>{a.nombre}<button aria-label="Quitar" onclick={() => (adjuntos = adjuntos.filter((_, j) => j !== k))}>×</button></li>
        {/each}
        {#if subiendo}<li class="subiendo">Subiendo…</li>{/if}
      </ul>
    {/if}
    <textarea bind:this={entrada} bind:value={texto} rows="3" disabled={enCurso} onpaste={pegar}
      placeholder={enCurso ? 'La sesión está respondiendo…' : 'Tus avances, resultados, dudas… (puedes pegar imágenes)'}
      onkeydown={(e) => e.key === 'Enter' && (e.ctrlKey || e.metaKey) && enviar()}></textarea>
    <div class="pie">
      <label class="boton discreto adjuntar">
        Adjuntar
        <input type="file" multiple accept="image/*,.pdf,.txt,.md,.csv,.py,.ipynb,.json" onchange={(e) => (subir([...e.currentTarget.files]), (e.currentTarget.value = ''))} />
      </label>
      <span class="atajo">Ctrl + Enter</span>
      <button class="boton primario" disabled={(!texto.trim() && !adjuntos.length) || enviando || enCurso || subiendo > 0} onclick={enviar}>Enviar</button>
    </div>
  </footer>
</section>

<style>
  .taller {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    border: 1px solid rgb(179 156 255 / 0.3);
    border-radius: var(--radio-m);
    background:
      radial-gradient(90% 40% at 100% 0%, rgb(179 156 255 / 0.08), transparent 70%),
      var(--humus-hondo);
    overflow: hidden;
  }
  header {
    padding: 1rem 1.2rem 0.6rem;
    border-bottom: 1px solid var(--linea);
  }
  h2 {
    margin: 0;
    font-family: var(--serif);
    font-weight: 500;
    font-size: var(--t2);
    color: var(--aclaracion);
  }
  header p {
    margin: 0.2rem 0 0;
    font-size: var(--t-1);
    color: var(--liquen-tenue);
  }
  .conexiones {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    padding: 0.6rem 1.2rem;
    border-bottom: 1px solid var(--linea);
  }
  .conexion {
    display: inline-flex;
    gap: 0.35rem;
    max-width: 100%;
    padding: 0.3rem 0.7rem;
    border: 1px solid rgb(232 143 180 / 0.45);
    border-radius: 999px;
    background: rgb(232 143 180 / 0.08);
    color: var(--liquen);
    font-size: 0.78rem;
    text-align: left;
    cursor: pointer;
  }
  .conexion.entrante {
    border-color: rgb(158 197 255 / 0.45);
    background: rgb(158 197 255 / 0.08);
  }
  .conexion:hover {
    border-color: var(--liquen-tenue);
  }
  .flecha {
    color: var(--liquen-tenue);
  }
  .rel {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .hilo {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 1rem 1.2rem;
  }
  .vacio {
    color: var(--liquen-tenue);
    font-size: 0.92rem;
  }
  .tu {
    margin: 0.8rem 0 0.8rem 2.5rem;
    padding: 0.5rem 0.9rem;
    border-left: 2px solid var(--tu);
    border-radius: 0 10px 10px 0;
    background: var(--tu-velo);
  }
  .tu :global(.manuscrito) {
    font-size: 0.98rem;
  }
  .claude {
    margin: 0.8rem 0;
    font-size: 1rem;
  }
  .borrador {
    opacity: 0.7;
  }
  .adjuntos,
  .por-enviar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin: 0.3rem 0 0;
    padding: 0;
    list-style: none;
    font-size: 0.76rem;
  }
  .adjuntos a {
    color: var(--tu);
  }
  .por-enviar li {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.2rem 0.4rem 0.2rem 0.6rem;
    border: 1px solid var(--linea-viva);
    border-radius: 999px;
  }
  .por-enviar button {
    border: 0;
    background: none;
    color: var(--liquen-tenue);
    cursor: pointer;
  }
  .vivo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.8rem;
    font-size: var(--t-1);
    color: var(--aclaracion);
  }
  .luz {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--aclaracion);
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
  .propuesta {
    margin: 0 1.2rem 0.6rem;
    padding: 0.8rem 1rem;
    border: 1px solid rgb(207 227 106 / 0.45);
    border-radius: 10px;
    background: rgb(207 227 106 / 0.07);
  }
  .titulo-propuesta {
    margin: 0;
    font-weight: 600;
    color: var(--cambios);
    font-size: 0.85rem;
  }
  .propuesta .resumen {
    margin: 0.3rem 0 0.6rem;
    font-family: var(--serif);
    font-size: 1.02rem;
  }
  .acciones {
    display: flex;
    justify-content: flex-end;
    gap: 0.4rem;
  }
  .versiones {
    padding: 0 1.2rem 0.4rem;
  }
  .versiones ul {
    margin: 0.3rem 0;
    padding: 0;
    list-style: none;
    font-size: 0.82rem;
  }
  .versiones li {
    display: flex;
    gap: 0.6rem;
    align-items: baseline;
    padding: 0.2rem 0;
    color: var(--liquen-tenue);
  }
  .versiones li span {
    flex: 1;
  }
  .enlace {
    border: 0;
    background: none;
    color: var(--tu);
    cursor: pointer;
    font-size: 0.8rem;
  }
  footer {
    padding: 0.8rem 1.2rem 1rem;
    border-top: 1px solid var(--linea);
  }
  textarea {
    width: 100%;
    margin-top: 0.3rem;
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--linea);
    border-radius: 8px;
    background: var(--humus);
    color: var(--liquen);
    font: inherit;
    font-size: 0.92rem;
    line-height: 1.5;
    resize: vertical;
  }
  textarea:focus {
    outline: none;
    border-color: var(--linea-viva);
  }
  .pie {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  .adjuntar {
    position: relative;
    cursor: pointer;
  }
  .adjuntar input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
  .atajo {
    margin-left: auto;
    font-size: 0.7rem;
    color: var(--liquen-apagado);
  }
</style>
