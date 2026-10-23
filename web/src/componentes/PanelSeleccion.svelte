<script>
  import { fade, scale } from 'svelte/transition';
  import { api } from '../lib/api.js';
  import { crearSeleccion } from '../lib/seleccion.js';
  import { global, refrescar, avisar } from '../lib/estado.svelte.js';
  import { ETIQUETA_ESTADO } from '../lib/estados.js';

  let { modo, alCerrar, alCambiarModo } = $props();

  const TEXTOS = {
    comenzar: {
      titulo: 'Qué ideas analizar',
      vacio: 'No hay ideas pendientes. Escribe una idea nueva o responde a un dictamen y aparecerá aquí.',
      accion: (n) => `Analizar ${n} ${n === 1 ? 'idea' : 'ideas'}`, api: 'lanzar', fuente: api.pendientes,
      hecho: (n) => `${n === 1 ? 'Idea enviada' : `${n} ideas enviadas`} a análisis.`,
    },
    detener: {
      titulo: 'Qué análisis detener',
      vacio: 'No hay ningún análisis en marcha.',
      accion: (n) => `Detener ${n}`, api: 'detener', fuente: api.activas,
      hecho: (n) => `${n === 1 ? 'Análisis detenido' : `${n} análisis detenidos`}. Lo hecho hasta ahora se conserva.`,
    },
    reanudar: {
      titulo: 'Qué investigaciones reanudar',
      vacio: 'No hay investigaciones pausadas.',
      accion: (n) => `Reanudar ${n}`, api: 'reanudar', fuente: api.pausadas,
      hecho: (n) => `${n === 1 ? 'Investigación reanudada' : `${n} investigaciones reanudadas`}.`,
    },
  };

  let t = $derived(TEXTOS[modo]);
  let grupos = $state(null);
  let sel = $state(null);
  let version = $state(0); // la selección es un objeto plano: esto avisa a Svelte de cada cambio
  let enviando = $state(false);

  $effect(() => {
    const m = modo;
    grupos = null;
    TEXTOS[m].fuente().then((g) => {
      grupos = g;
      sel = crearSeleccion(g);
      version++;
    });
  });

  const cambiar = (fn) => (fn(), version++);
  let n = $derived((version, sel?.refs().length ?? 0));
  let hayActivas = $derived((global.cola?.ejecutando?.length ?? 0) + (global.cola?.enCola?.length ?? 0) > 0);

  let reinicio = $derived.by(() => {
    const s = global.cola?.cuota?.resetsAt5h;
    if (!s || s * 1000 < Date.now()) return null;
    return new Date(s * 1000).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  });

  async function confirmar() {
    enviando = true;
    try {
      await api.analisis(t.api, sel.refs());
      avisar(t.hecho(n));
      refrescar();
      alCerrar();
    } catch (e) {
      avisar(`No se pudo completar: ${e.message}`, 'error');
    } finally {
      enviando = false;
    }
  }

  function tecla(e) {
    if (e.key === 'Escape') alCerrar();
  }
</script>

<svelte:window onkeydown={tecla} />

<div class="velo" transition:fade={{ duration: 200 }} onclick={alCerrar} role="presentation"></div>
<div class="panel {modo}" role="dialog" aria-modal="true" aria-labelledby="titulo-panel" transition:scale={{ start: 0.94, duration: 320, opacity: 0 }}>
  <header>
    <h2 id="titulo-panel">{t.titulo}</h2>
    <button class="boton discreto" onclick={alCerrar}>Cerrar</button>
  </header>

  {#if modo === 'reanudar' && reinicio}
    <p class="nota">La ventana de 5 horas se reinicia a las {reinicio}. Si reanudas antes, seguirá trabajando aunque la cuota pase del umbral.</p>
  {/if}

  {#if !grupos}
    <p class="cargando">Cargando…</p>
  {:else if !grupos.length}
    <p class="vacio">{t.vacio}</p>
  {:else}
      <label class="todas">
        <input type="checkbox" checked={(version, sel.estadoTodas() === 'todas')} indeterminate={(version, sel.estadoTodas() === 'parcial')}
          onchange={() => cambiar(sel.alternarTodas)} />
        <span class="caja"></span>
        Marcar todas
      </label>
      <div class="grupos">
        {#each grupos as g (g.carpeta.id)}
          <fieldset>
            <label class="carpeta">
              <input type="checkbox" checked={(version, sel.estadoCarpeta(g.carpeta.id) === 'todas')}
                indeterminate={(version, sel.estadoCarpeta(g.carpeta.id) === 'parcial')}
                onchange={() => cambiar(() => sel.alternarCarpeta(g.carpeta.id))} />
              <span class="caja"></span>
              <span class="marca" style:background={g.carpeta.color}></span>
              {g.carpeta.nombre}
            </label>
            {#each g.ideas as i (i.id)}
              <label class="idea">
                <input type="checkbox" checked={(version, sel.marcada(g.carpeta.id, i.id))} onchange={() => cambiar(() => sel.alternarIdea(g.carpeta.id, i.id))} />
                <span class="caja"></span>
                <span class="titulo">{i.titulo}</span>
                {#if ['detenida', 'error'].includes(i.estado)}<span class="estado">{ETIQUETA_ESTADO[i.estado]}</span>{/if}
                <span class="etiqueta e-{i.etiqueta.toLowerCase().replace(' ', '-')}">{i.etiqueta}</span>
              </label>
            {/each}
          </fieldset>
        {/each}
      </div>
  {/if}

  <footer>
    <div class="secundarias">
      {#if modo !== 'comenzar'}
        <button class="boton discreto" onclick={() => alCambiarModo('comenzar')}>Analizar ideas nuevas</button>
      {/if}
      {#if modo === 'reanudar' && hayActivas}
        <button class="boton discreto" onclick={() => alCambiarModo('detener')}>Detener análisis en marcha</button>
      {/if}
    </div>
    <button class="boton primario" disabled={!n || enviando} onclick={confirmar}>{t.accion(n)}</button>
  </footer>
</div>

<style>
  .velo {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgb(7 13 12 / 0.7);
    backdrop-filter: blur(3px);
  }
  .panel {
    --tono: var(--liquen);
    position: fixed;
    z-index: 41;
    left: 50%;
    top: 50%;
    translate: -50% -50%;
    display: flex;
    flex-direction: column;
    width: min(38rem, calc(100vw - 2rem));
    max-height: min(44rem, calc(100vh - 3rem));
    border: 1px solid var(--linea-viva);
    border-top: 2px solid var(--tono);
    border-radius: var(--radio-m);
    background: var(--superficie);
    box-shadow: 0 40px 120px -30px rgb(0 0 0 / 0.8);
  }
  .panel.detener {
    --tono: var(--proceso);
  }
  .panel.reanudar {
    --tono: var(--pausada);
  }
  header,
  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.25rem;
  }
  header {
    border-bottom: 1px solid var(--linea);
  }
  footer {
    border-top: 1px solid var(--linea);
    flex-wrap: wrap;
  }
  h2 {
    margin: 0;
    font-family: var(--serif);
    font-weight: 400;
    font-size: var(--t2);
  }
  .nota,
  .vacio,
  .cargando {
    margin: 0;
    padding: 0.9rem 1.25rem 0;
    color: var(--liquen-tenue);
  }
  .nota {
    color: var(--pausada);
  }
  .grupos {
    overflow-y: auto;
    padding: 0 1.25rem 1rem;
  }
  fieldset {
    margin: 0.8rem 0 0;
    padding: 0;
    border: 0;
  }
  label {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.45rem 0.4rem;
    border-radius: var(--radio-s);
    cursor: pointer;
  }
  label:hover {
    background: var(--superficie-alta);
  }
  .todas {
    margin: 0.8rem 1.25rem 0;
    color: var(--liquen-tenue);
  }
  .carpeta {
    font-weight: 600;
  }
  .idea {
    padding-left: 2.1rem;
  }
  .titulo {
    flex: 1;
    font-family: var(--serif);
    font-size: var(--t1);
    line-height: 1.25;
  }
  .marca {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 50%;
  }
  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .caja {
    flex: none;
    width: 1.05rem;
    height: 1.05rem;
    border: 1.5px solid var(--liquen-apagado);
    border-radius: 50% 50% 50% 2px;
    transform: rotate(-45deg);
    transition: background 0.2s, border-color 0.2s, transform 0.3s var(--curva-muelle);
  }
  input:checked + .caja {
    background: var(--tono);
    border-color: var(--tono);
    transform: rotate(-45deg) scale(1.08);
    box-shadow: 0 0 12px color-mix(in srgb, var(--tono) 60%, transparent);
  }
  input:indeterminate + .caja {
    border-color: var(--tono);
    background: linear-gradient(45deg, transparent 40%, var(--tono) 40% 60%, transparent 60%);
  }
  input:focus-visible + .caja {
    outline: 2px solid var(--proceso);
    outline-offset: 3px;
  }
  .etiqueta {
    flex: none;
    padding: 0.1em 0.6em;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    border: 1px solid currentColor;
  }
  .e-nueva {
    color: var(--nueva);
  }
  .e-analizada {
    color: var(--tu);
  }
  .e-en-curso {
    color: var(--proceso);
  }
  .e-en-cola {
    color: var(--liquen-tenue);
  }
  .e-pausada {
    color: var(--pausada);
  }
  .estado {
    color: var(--rechazada);
    font-size: var(--t-1);
  }
  .secundarias {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
</style>
