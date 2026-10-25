<script>
  import { api } from '../lib/api.js';
  import { global, avisar } from '../lib/estado.svelte.js';

  let a = $state(null);
  let guardando = $state(false);
  api.ajustes().then((r) => (a = { ...r, p5: Math.round(r.umbral5h * 100), p7: Math.round(r.umbral7d * 100) }));

  async function guardar(ev) {
    ev.preventDefault();
    guardando = true;
    try {
      const r = await api.guardarAjustes({
        modelo: a.modelo.trim() || 'opus', esfuerzo: a.esfuerzo, paralelo: a.paralelo,
        umbral5h: a.p5 / 100, umbral7d: a.p7 / 100,
      });
      a = { ...r, p5: Math.round(r.umbral5h * 100), p7: Math.round(r.umbral7d * 100) };
      avisar('Ajustes guardados.');
    } catch (e) {
      avisar(`No se pudieron guardar: ${e.message}`, 'error');
    } finally {
      guardando = false;
    }
  }

  const CONTEXTO = [
    ['pais', 'País o región', 'Dónde vives y desde dónde trabajarías. Cambia la normativa, el mercado y las oportunidades.', 1],
    ['capital', 'Capital disponible', 'Cuánto podrías invertir sin poner en riesgo lo esencial.', 1],
    ['tiempo', 'Tiempo disponible', 'Horas a la semana y durante cuánto tiempo, junto a tus estudios o tu trabajo.', 1],
    ['habilidades', 'Habilidades y formación', 'Lo que ya sabes hacer bien, lo que estudias y tu experiencia.', 3],
    ['metas', 'Metas', 'Qué quieres conseguir: ingresos, investigar, aprender, un portafolio, independencia…', 3],
  ];
  let contexto = $state(null);
  let guardandoContexto = $state(false);
  api.ajustes().then((r) => (contexto = { ...r.contexto }));

  async function guardarContexto(ev) {
    ev.preventDefault();
    guardandoContexto = true;
    try {
      contexto = { ...(await api.guardarAjustes({ contexto })).contexto };
      avisar('Contexto guardado: lo leerán todas las sesiones.');
    } catch (e) {
      avisar(`No se pudo guardar: ${e.message}`, 'error');
    } finally {
      guardandoContexto = false;
    }
  }

  const pct = (x) => (x == null ? 'sin datos' : `${Math.round(x * 100)} %`);
  const hora = (s) => (s ? new Date(s * 1000).toLocaleString('es', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : '');
</script>

<div class="pagina">
  <h1>Ajustes</h1>

  {#if contexto}
    <form class="contexto" onsubmit={guardarContexto}>
      <h2>Tu contexto</h2>
      <p class="nota">Todas las sesiones leen esto antes de juzgar una idea: una idea buena para alguien con capital y tiempo puede ser mala para ti. Rellena solo lo que quieras.</p>
      {#each CONTEXTO as [clave, nombre, ayuda, filas] (clave)}
        <label>
          <span>{nombre}</span>
          <textarea class="campo" rows={filas} maxlength="2000" bind:value={contexto[clave]}></textarea>
          <small>{ayuda}</small>
        </label>
      {/each}
      <button class="boton primario" disabled={guardandoContexto}>Guardar contexto</button>
    </form>
  {/if}

  <section class="cuota">
    <h2>Cuota de Claude</h2>
    {#if global.cola?.cuota}
      <dl>
        <dt>Ventana de 5 horas</dt>
        <dd>
          <span class="barra"><span style:width={pct(global.cola.cuota.cincoHoras)}></span></span>
          {pct(global.cola.cuota.cincoHoras)}, se reinicia {hora(global.cola.cuota.resetsAt5h)}
        </dd>
        <dt>Ventana de 7 días</dt>
        <dd>
          <span class="barra"><span style:width={pct(global.cola.cuota.sieteDias)}></span></span>
          {pct(global.cola.cuota.sieteDias)}, se reinicia {hora(global.cola.cuota.resetsAt7d)}
        </dd>
      </dl>
    {:else}
      <p class="nota">Se conocerá en cuanto una sesión empiece a trabajar.</p>
    {/if}
  </section>

  {#if a}
    <form onsubmit={guardar}>
      <label>
        <span>Modelo</span>
        <input class="campo" bind:value={a.modelo} />
        <small>Alias o nombre completo del modelo de Claude Code. Por defecto, opus.</small>
      </label>
      <label>
        <span>Esfuerzo de razonamiento</span>
        <select class="campo" bind:value={a.esfuerzo}>
          {#each ['low', 'medium', 'high', 'xhigh', 'max'] as e (e)}<option value={e}>{e}</option>{/each}
        </select>
      </label>
      <label>
        <span>Análisis en paralelo: {a.paralelo}</span>
        <input type="range" min="1" max="5" bind:value={a.paralelo} />
      </label>
      <label>
        <span>Pausar al llegar la ventana de 5 h al {a.p5} %</span>
        <input type="range" min="10" max="100" step="5" bind:value={a.p5} />
      </label>
      <label>
        <span>Pausar al llegar la ventana de 7 días al {a.p7} %</span>
        <input type="range" min="10" max="100" step="5" bind:value={a.p7} />
      </label>
      <button class="boton primario" disabled={guardando}>Guardar ajustes</button>
    </form>
  {/if}
</div>

<style>
  .pagina {
    max-width: 36rem;
    padding: 3rem 0 6rem;
  }
  h1 {
    margin: 0 0 2rem;
    font-family: var(--serif);
    font-weight: 400;
    font-size: var(--t5);
  }
  h2 {
    font-family: var(--serif);
    font-weight: 400;
    font-size: var(--t2);
    margin: 0 0 0.8rem;
  }
  .cuota {
    margin-bottom: 2.5rem;
  }
  .contexto {
    margin-bottom: 3rem;
    padding-bottom: 2.5rem;
    border-bottom: 1px solid var(--linea);
  }
  .contexto h2,
  .contexto .nota {
    margin: 0;
  }
  .contexto textarea {
    resize: vertical;
  }
  dl {
    display: grid;
    gap: 0.3rem;
    margin: 0;
  }
  dt {
    color: var(--liquen-tenue);
    font-size: var(--t-1);
  }
  dd {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    margin: 0 0 0.7rem;
  }
  .barra {
    flex: 0 0 10rem;
    height: 6px;
    border-radius: 3px;
    background: var(--superficie-alta);
    overflow: hidden;
  }
  .barra span {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--aceptada), var(--pausada) 80%, var(--rechazada));
    background-size: 10rem 100%;
  }
  form {
    display: grid;
    gap: 1.4rem;
  }
  label {
    display: grid;
    gap: 0.4rem;
  }
  small,
  .nota {
    color: var(--liquen-apagado);
  }
  input[type='range'] {
    accent-color: var(--aceptada);
  }
  form .boton {
    justify-self: start;
  }
</style>
