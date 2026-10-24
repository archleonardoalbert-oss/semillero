<script>
  import { onDestroy } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { api } from '../lib/api.js';
  import { renderizar } from '../lib/render.js';
  import { suscribir, avisar } from '../lib/estado.svelte.js';
  import { crearTranscripcion } from '../lib/eventos.js';
  import Editor from './Editor.svelte';
  import Adjuntos from './Adjuntos.svelte';

  // Enviar la solución de una incógnita al verificador independiente y ver su informe.
  // Con `inicial` se muestra una verificación del registro.
  let { ref, nodo, base, inicial = null, alCerrar } = $props();

  let v = $state(inicial);
  let texto = $state('');
  let adjuntos = $state([]);
  let enviando = $state(false);
  let version = $state(0);
  let transcripcion = crearTranscripcion();

  const quitar = suscribir(ref, (msg) => {
    if (!v || msg.nodo !== nodo.id) return;
    if (msg.tipo === 'verificacion' && msg.verificacion.id === v.id) v = msg.verificacion;
    else if (msg.tipo === 'verificacion-evento' && msg.id === v.id) {
      transcripcion.aplicar(msg.ev);
      version++;
    }
  });
  onDestroy(quitar);

  let vivo = $derived.by(() => {
    version;
    return transcripcion.bloques.at(-1);
  });

  async function enviar() {
    if (!texto.trim() && !adjuntos.length) return;
    if (!confirm('El verificador es implacable: solo acepta un resultado concluyente que cierre el problema sin lugar a dudas. ¿Enviar?')) return;
    enviando = true;
    try {
      v = await api.verificar(ref.carpetaId, ref.ideaId, nodo.id, { texto, adjuntos });
    } catch (e) {
      avisar({ 'en-proceso': 'Ya hay una verificación o una ejecución en marcha en esta idea.', 'ya-resuelta': 'Esta incógnita ya está resuelta.', cuota: 'La investigación está pausada por cuota.' }[e.message] ?? `No se pudo enviar: ${e.message}`, 'error');
    } finally {
      enviando = false;
    }
  }

  const ACCION = { WebSearch: 'Contrastando con la literatura', WebFetch: 'Leyendo una fuente', Read: 'Leyendo tu envío', Bash: 'Rehaciendo cálculos', Write: 'Escribiendo los problemas nuevos' };
  const tecla = (e) => e.key === 'Escape' && !e.target.closest?.('textarea, [contenteditable="true"]') && alCerrar();
</script>

<svelte:window onkeydown={tecla} />

<div class="velo" transition:fade={{ duration: 200 }}></div>
<div class="verificacion" class:aceptada={v?.estado === 'aceptada'} class:rechazada={v?.estado === 'rechazada'} role="dialog" aria-label="Verificación"
  transition:fly={{ y: 30, duration: 420, easing: cubicOut }}>
  <header>
    <div>
      <p class="de">Verificación de la solución</p>
      <h2>{nodo.titulo}</h2>
    </div>
    <button class="cerrar" onclick={alCerrar} aria-label="Cerrar">×</button>
  </header>

  <div class="cuerpo">
    {#if !v}
      <p class="intro">
        Envía lo que te permite afirmar que lo has resuelto: la demostración, el experimento, los datos o el código. Lo juzgará
        una sesión independiente con rigor total: solo se marca como resuelto un resultado concluyente que cierre el problema.
        El taller puede ayudarte a redactarlo, pero la decisión es del verificador.
      </p>
      <div class="editor">
        <Editor valor="" {base} alCambiar={(md) => (texto = md)} marcador="Tu resultado: enunciado preciso de lo que demuestras, la demostración o el método, y la discusión." />
      </div>
      <Adjuntos rutas={adjuntos} {base} acepta="image/*,.pdf,.txt,.md,.csv,.py,.ipynb,.json,.tex"
        alSubir={(a) => api.adjuntarVerificacion(ref.carpetaId, ref.ideaId, nodo.id, a).then((r) => r.ruta)} alCambiar={(r) => (adjuntos = r)} />
      <div class="acciones"><button class="boton primario" disabled={enviando || (!texto.trim() && !adjuntos.length)} onclick={enviar}>Enviar a verificación</button></div>
    {:else if v.estado === 'revisando'}
      <div class="espera">
        <span class="luz"></span>
        <p>El verificador está revisando tu solución…</p>
        {#if vivo?.tipo === 'herramienta'}<p class="accion">{ACCION[vivo.herramienta] ?? 'Trabajando'}{vivo.query ? `: «${vivo.query}»` : ''}</p>{/if}
      </div>
    {:else if v.estado === 'error'}
      <p class="fallo">La verificación no pudo completarse: {v.error}</p>
    {:else}
      <div class="veredicto">
        <div class="sello">{v.estado === 'aceptada' ? 'Resuelta' : 'No concluyente'}</div>
        <p class="resumen">{v.resumen}</p>
      </div>
      {#if v.aviso}<p class="aviso">{v.aviso}</p>{/if}
      {#if v.nodosNuevos?.length}<p class="crece">El árbol crece: tu resultado abre {v.nodosNuevos.length} {v.nodosNuevos.length === 1 ? 'problema nuevo' : 'problemas nuevos'}.</p>{/if}
      <div class="informe manuscrito">{@html renderizar(v.informe, base)}</div>
      <details class="envio">
        <summary>Lo que enviaste</summary>
        <div class="manuscrito">{@html renderizar(v.texto || '_(sin texto)_', base)}</div>
        {#if v.adjuntos?.length}<Adjuntos rutas={v.adjuntos} {base} deshabilitado alSubir={() => {}} alCambiar={() => {}} />{/if}
      </details>
    {/if}
  </div>
</div>

<style>
  .velo {
    position: fixed;
    inset: 0;
    z-index: 48;
    background: rgb(7 13 12 / 0.75);
    backdrop-filter: blur(3px);
  }
  .verificacion {
    --tono: #e88fb4;
    position: fixed;
    z-index: 49;
    inset: 3vh 50% auto auto;
    translate: 50% 0;
    display: flex;
    flex-direction: column;
    width: min(60rem, 95vw);
    max-height: 94vh;
    border: 1px solid var(--linea-viva);
    border-top: 3px solid var(--tono);
    border-radius: var(--radio-m);
    background: var(--humus);
    box-shadow: 0 40px 120px -30px rgb(0 0 0 / 0.9);
  }
  .verificacion.aceptada {
    --tono: var(--pausada);
  }
  .verificacion.rechazada {
    --tono: var(--rechazada);
  }
  header {
    display: flex;
    align-items: start;
    gap: 1rem;
    padding: 1.3rem 1.8rem 0.8rem;
    border-bottom: 1px solid var(--linea);
  }
  header > div {
    flex: 1;
  }
  .de {
    margin: 0;
    font-size: var(--t-1);
    font-weight: 600;
    color: var(--tono);
  }
  h2 {
    margin: 0.2rem 0 0;
    font-family: var(--serif);
    font-weight: 400;
    font-size: var(--t3);
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
  .cuerpo {
    overflow-y: auto;
    padding: 1.2rem 1.8rem 1.6rem;
  }
  .intro {
    color: var(--liquen-tenue);
  }
  .editor {
    margin: 0.8rem 0 0.4rem;
    padding: 0.3rem 0.9rem;
    border: 1px solid var(--linea);
    border-radius: var(--radio-s);
    background: var(--humus-hondo);
  }
  .acciones {
    display: flex;
    justify-content: flex-end;
    margin-top: 1rem;
  }
  .espera {
    display: grid;
    justify-items: center;
    gap: 0.4rem;
    padding: 4rem 0;
    color: var(--liquen-tenue);
  }
  .luz {
    width: 0.8rem;
    height: 0.8rem;
    border-radius: 50%;
    background: var(--tono);
    animation: latir 1.2s ease-in-out infinite;
  }
  @keyframes latir {
    50% {
      opacity: 0.35;
      transform: scale(0.75);
    }
  }
  .accion {
    font-size: var(--t-1);
    color: var(--tono);
  }
  .fallo {
    color: var(--rechazada);
  }
  .veredicto {
    display: grid;
    justify-items: center;
    gap: 0.6rem;
    padding: 1rem 0 1.4rem;
  }
  .sello {
    padding: 0.3em 0.9em;
    border: 2px solid var(--tono);
    border-radius: 4px;
    color: var(--tono);
    font-family: var(--serif);
    font-variant: small-caps;
    letter-spacing: 0.12em;
    font-size: var(--t2);
    transform: rotate(-4deg);
    animation: estampar 700ms var(--curva-muelle) both 200ms;
  }
  @keyframes estampar {
    from {
      opacity: 0;
      transform: rotate(-12deg) scale(1.8);
    }
  }
  .resumen {
    margin: 0;
    max-width: 40rem;
    text-align: center;
    font-family: var(--serif);
    font-size: var(--t1);
    font-style: italic;
  }
  .aviso,
  .crece {
    font-size: var(--t-1);
    color: var(--liquen-tenue);
  }
  .crece {
    color: var(--aceptada);
  }
  .envio {
    margin-top: 1.5rem;
    color: var(--liquen-tenue);
  }
  .envio summary {
    cursor: pointer;
  }
</style>
