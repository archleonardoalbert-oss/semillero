<script>
  import { onMount, tick } from 'svelte';
  import { api } from '../lib/api.js';
  import { suscribir } from '../lib/estado.svelte.js';
  import { crearTranscripcion, fechaRegistro } from '../lib/eventos.js';

  // Sin `archivo`: retransmisión en directo. Con `archivo`: repaso de una ejecución pasada.
  let { ref, archivo = null, etiqueta = 'Analizando en directo' } = $props();

  const trans = crearTranscripcion();
  let version = $state(0);
  let caja;
  let pegado = true;
  let inicio = $state(null);
  let ahora = $state(Date.now());
  const vistos = new Set();

  function aplicar(ev) {
    if (ev.uuid) {
      if (vistos.has(ev.uuid)) return;
      vistos.add(ev.uuid);
    }
    trans.aplicar(ev);
  }

  async function bajar() {
    version++;
    await tick();
    if (pegado && caja) caja.scrollTop = caja.scrollHeight;
  }

  onMount(() => {
    let buffer = [];
    let listo = false;
    const quitar = archivo
      ? () => {}
      : suscribir(ref, (msg) => {
          if (msg.tipo !== 'evento') return;
          if (listo) {
            aplicar(msg.ev);
            bajar();
          } else buffer.push(msg.ev);
        });

    (async () => {
      const lista = archivo ? [archivo] : await api.registros(ref.carpetaId, ref.ideaId);
      const ultimo = lista.at(-1);
      if (ultimo) {
        inicio = fechaRegistro(ultimo);
        const texto = await api.registro(ref.carpetaId, ref.ideaId, ultimo);
        for (const l of texto.split('\n')) {
          if (!l.trim()) continue;
          try {
            aplicar(JSON.parse(l));
          } catch {
            /* línea a medio escribir */
          }
        }
      }
      for (const ev of buffer) aplicar(ev);
      buffer = [];
      listo = true;
      bajar();
    })();

    const reloj = archivo ? null : setInterval(() => (ahora = Date.now()), 1000);
    return () => {
      quitar();
      clearInterval(reloj);
    };
  });

  function alDesplazar() {
    pegado = caja.scrollHeight - caja.scrollTop - caja.clientHeight < 40;
  }

  let bloques = $derived((version, [...trans.bloques]));
  let transcurrido = $derived.by(() => {
    if (!inicio || archivo) return '';
    const s = Math.max(0, Math.round((ahora - inicio.getTime()) / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  });

  const ACCION = {
    WebSearch: 'Buscando', WebFetch: 'Leyendo', Read: 'Leyendo', Write: 'Escribiendo', Edit: 'Editando',
    Glob: 'Buscando archivos', Grep: 'Buscando en archivos', Bash: 'Ejecutando', ToolSearch: 'Preparando herramienta',
  };
  const corta = (ruta) => ruta?.replace(/^.*?\/(carpetas\/|notas-globales)/, '$1') ?? '';
</script>

<section class="envivo" class:repaso={archivo}>
  <header>
    {#if archivo}
      <span>Repaso del análisis del {inicio?.toLocaleString('es') ?? ''}</span>
    {:else}
      <span class="directo"><span class="luz"></span>{etiqueta}</span>
      <span class="reloj">{transcurrido}</span>
    {/if}
  </header>
  <div class="flujo" bind:this={caja} onscroll={alDesplazar}>
    {#if !bloques.length}
      <p class="sistema">Esperando a que la sesión empiece…</p>
    {/if}
    {#each bloques as b, i (i)}
      {#if b.tipo === 'pensamiento'}
        {#if b.texto}<p class="pensamiento" class:vivo={!b.terminado}>{b.texto}</p>{/if}
      {:else if b.tipo === 'texto'}
        {#if b.texto}<p class="texto">{b.texto}</p>{/if}
      {:else if b.tipo === 'herramienta'}
        <p class="herramienta" class:vivo={!b.terminado}>
          <span class="verbo">{ACCION[b.herramienta] ?? b.herramienta}</span>
          {#if b.query}<span class="q">«{b.query}»</span>
          {:else if b.url}<a href={b.url} target="_blank" rel="noopener noreferrer">{b.url}</a>
          {:else if b.comando}<code>{b.comando}</code>
          {:else if b.ruta}<span class="ruta">{corta(b.ruta)}</span>{/if}
        </p>
      {:else if b.tipo === 'resultado'}
        <details class="resultado" class:error={b.error}>
          <summary>{b.error ? 'Falló' : 'Resultado'}{b.herramienta ? ` de ${b.herramienta}` : ''}</summary>
          <pre>{b.texto}</pre>
        </details>
      {:else}
        <p class="sistema" class:error={b.error}>{b.texto}</p>
      {/if}
    {/each}
  </div>
</section>

<style>
  .envivo {
    margin: 0 0 2.5rem;
    border: 1px solid rgb(94 224 224 / 0.3);
    border-radius: var(--radio-m);
    background: var(--humus-hondo);
    overflow: hidden;
    box-shadow: 0 0 60px -30px var(--proceso);
  }
  .envivo.repaso {
    border-color: var(--linea);
    box-shadow: none;
    margin-top: 1rem;
  }
  header {
    display: flex;
    justify-content: space-between;
    padding: 0.6rem 1rem;
    border-bottom: 1px solid var(--linea);
    font-size: var(--t-1);
    color: var(--liquen-tenue);
  }
  .directo {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--proceso);
  }
  .luz {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--proceso);
    animation: luz 1.2s ease-in-out infinite;
  }
  @keyframes luz {
    50% {
      opacity: 0.3;
    }
  }
  .reloj {
    font-family: var(--mono);
  }
  .flujo {
    max-height: 60vh;
    overflow-y: auto;
    padding: 0.8rem 1rem 1rem;
    font-family: var(--mono);
    font-size: 0.8rem;
    line-height: 1.6;
  }
  p {
    margin: 0 0 0.45rem;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .pensamiento {
    color: var(--liquen-apagado);
    font-style: italic;
  }
  .pensamiento::before {
    content: '∴ ';
    font-style: normal;
  }
  .texto {
    color: var(--liquen);
  }
  .herramienta {
    color: var(--liquen-tenue);
  }
  .herramienta::before {
    content: '› ';
    color: var(--proceso);
  }
  .verbo {
    color: var(--proceso);
  }
  .q {
    color: var(--claude);
  }
  .herramienta a,
  .ruta {
    color: var(--tu);
  }
  .vivo::after {
    content: '▍';
    margin-left: 0.2em;
    animation: luz 0.9s steps(2) infinite;
    color: var(--proceso);
  }
  .resultado {
    margin: -0.2rem 0 0.5rem 1rem;
    color: var(--liquen-apagado);
  }
  .resultado summary {
    cursor: pointer;
  }
  .resultado pre {
    margin: 0.3rem 0;
    white-space: pre-wrap;
    font: inherit;
  }
  .sistema {
    color: var(--liquen-apagado);
    font-size: 0.72rem;
  }
  .error {
    color: var(--rechazada);
  }
  code {
    font: inherit;
    color: var(--aclaracion);
  }
</style>
