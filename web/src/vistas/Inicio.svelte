<script>
  import Micelio from '../componentes/Micelio.svelte';
  import BotonPrincipal from '../componentes/BotonPrincipal.svelte';
  import PanelSeleccion from '../componentes/PanelSeleccion.svelte';
  import SelectorTipo from '../componentes/SelectorTipo.svelte';
  import { catalogo, cargarTipos } from '../lib/tipos.svelte.js';
  import { global, refrescar, avisar } from '../lib/estado.svelte.js';
  import { api } from '../lib/api.js';
  import { ir, enlace } from '../lib/ruta.svelte.js';
  import { COLOR_ESTADO } from '../lib/estados.js';

  const COLORES = ['#9ec5ff', '#6fe3a5', '#f0b45a', '#b39cff', '#5ee0e0', '#e88fb4'];

  let panel = $state(null);
  let nombre = $state('');
  let color = $state(COLORES[0]);
  let creando = $state(false);
  let tipo = $state(null);
  let descripcion = $state('');
  cargarTipos();
  const nombreTipo = (id) => catalogo.tipos.find((t) => t.id === id)?.nombre ?? '';

  let r = $derived(global.resumen);
  let contadores = $derived([
    { estado: 'aceptada', n: r?.aceptadas ?? 0, texto: (n) => (n === 1 ? 'aceptada' : 'aceptadas') },
    { estado: 'cambios', n: r?.cambios ?? 0, texto: (n) => (n === 1 ? 'cambio sugerido' : 'cambios sugeridos') },
    { estado: 'no-recomendada', n: r?.noRecomendadas ?? 0, texto: (n) => (n === 1 ? 'no recomendada' : 'no recomendadas') },
    { estado: 'rechazada', n: r?.rechazadas ?? 0, texto: (n) => (n === 1 ? 'rechazada rotundamente' : 'rechazadas rotundamente') },
    { estado: 'en-proceso', n: r?.enProceso ?? 0, texto: () => 'en proceso' },
    { estado: 'aclaracion', n: r?.aclaracion ?? 0, texto: (n) => (n === 1 ? 'necesita aclaración' : 'necesitan aclaración') },
  ]);

  async function crearCarpeta(ev) {
    ev.preventDefault();
    if (!nombre.trim() || !tipo) return;
    creando = true;
    try {
      const c = await api.crearCarpeta({ nombre, color, tipo, descripcion });
      nombre = '';
      tipo = null;
      descripcion = '';
      color = COLORES[(COLORES.indexOf(color) + 1) % COLORES.length];
      refrescar();
      ir(enlace.carpeta(c.id));
    } catch (e) {
      avisar(`No se pudo crear el bancal: ${e.message}`, 'error');
    } finally {
      creando = false;
    }
  }
</script>

<section class="vivero">
  {#if global.carpetas.length}
    <Micelio carpetas={global.carpetas} />
  {:else}
    <div class="vacio">
      <p class="invita">Aquí crecerán tus ideas.</p>
      <p>Empieza creando un bancal para el primer tema que te ronde la cabeza.</p>
    </div>
  {/if}

  <div class="pie-vivero">
    <ul class="leyenda">
      {#each contadores as c (c.estado)}
        <li>
          <a href={enlace.lista(c.estado)} onclick={(e) => (e.preventDefault(), ir(enlace.lista(c.estado)))}>
            <span class="punto" style:background={COLOR_ESTADO[c.estado]}></span>
            <span class="n">{c.n}</span>
            {c.texto(c.n)}
          </a>
        </li>
      {/each}
    </ul>
    <BotonPrincipal cola={global.cola} pausadas={r?.pausadas ?? 0} alPulsar={(m) => (panel = m)} />
  </div>
</section>

<section class="bancales">
  <h2>Bancales</h2>
  <ul>
    {#each global.carpetas as c (c.id)}
      <li>
        <a href={enlace.carpeta(c.id)} onclick={(e) => (e.preventDefault(), ir(enlace.carpeta(c.id)))}>
          <span class="marca" style:background={c.color}></span>
          <span class="nombre">{c.nombre}<small>{nombreTipo(c.tipo)}</small></span>
          <span class="semillas" aria-hidden="true">
            {#each c.ideas as i (i.id)}<span style:background={COLOR_ESTADO[i.estado]}></span>{/each}
          </span>
          <span class="cuantas">{c.ideas.length} {c.ideas.length === 1 ? 'idea' : 'ideas'}</span>
        </a>
      </li>
    {/each}
    <li class="nuevo">
      <form onsubmit={crearCarpeta}>
        <input class="campo" bind:value={nombre} placeholder="Nuevo bancal: IA, Neurociencia, Teoría de Números…" maxlength="60" />
        <div class="colores" role="radiogroup" aria-label="Color del bancal">
          {#each COLORES as k (k)}
            <button type="button" role="radio" aria-checked={color === k} aria-label="Color {k}" class:elegido={color === k}
              style:background={k} onclick={() => (color = k)}></button>
          {/each}
        </div>
        {#if nombre.trim()}
          <div class="detalle">
            <SelectorTipo valor={tipo} alElegir={(t) => (tipo = t)} />
            <textarea class="campo" bind:value={descripcion} rows="3" maxlength="2000"
              placeholder="Descripción (opcional): de qué va este bancal, qué buscas con estas ideas. Las sesiones la leerán."></textarea>
          </div>
        {/if}
        <button class="boton" disabled={!nombre.trim() || !tipo || creando} title={nombre.trim() && !tipo ? 'Elige antes el tipo del bancal' : ''}>Crear bancal</button>
      </form>
    </li>
  </ul>
</section>

{#if panel}
  <PanelSeleccion modo={panel} alCerrar={() => (panel = null)} alCambiarModo={(m) => (panel = m)} />
{/if}

<style>
  .vivero {
    position: relative;
    height: min(72vh, 760px);
    min-height: 420px;
    margin: 0 -2rem;
    border-bottom: 1px solid var(--linea);
    overflow: hidden;
  }
  .vacio {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    text-align: center;
    color: var(--liquen-tenue);
  }
  .invita {
    margin: 0 0 0.3em;
    font-family: var(--serif);
    font-size: var(--t4);
    font-style: italic;
    color: var(--liquen);
  }
  .pie-vivero {
    position: absolute;
    inset: auto 2rem 1.8rem;
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 2rem;
    flex-wrap: wrap;
    pointer-events: none;
  }
  .pie-vivero > :global(*) {
    pointer-events: auto;
  }
  .leyenda {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1.6rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .leyenda a {
    display: inline-flex;
    align-items: baseline;
    gap: 0.45em;
    color: var(--liquen-tenue);
    text-decoration: none;
    transition: color 0.2s;
  }
  .leyenda a:hover {
    color: var(--liquen);
  }
  .punto {
    width: 0.55em;
    height: 0.55em;
    border-radius: 50%;
    align-self: center;
    box-shadow: 0 0 10px currentColor;
  }
  .n {
    font-family: var(--serif);
    font-size: var(--t3);
    line-height: 1;
    color: var(--liquen);
    font-variant-numeric: oldstyle-nums;
  }
  .bancales {
    max-width: 62rem;
    padding: 3rem 0 5rem;
  }
  h2 {
    margin: 0 0 1rem;
    font-family: var(--serif);
    font-weight: 400;
    font-size: var(--t3);
  }
  .bancales ul {
    margin: 0;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--linea);
  }
  .bancales li {
    border-bottom: 1px solid var(--linea);
  }
  .bancales a {
    display: grid;
    grid-template-columns: auto minmax(8rem, 16rem) 1fr auto;
    align-items: center;
    gap: 1.2rem;
    padding: 1rem 0.5rem;
    text-decoration: none;
    transition: background 0.25s, padding 0.35s var(--curva);
  }
  .bancales a:hover {
    background: var(--superficie);
    padding-left: 1rem;
  }
  .marca {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
  }
  .nombre {
    font-family: var(--serif);
    font-size: var(--t2);
  }
  .semillas {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  .semillas span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }
  .cuantas {
    color: var(--liquen-tenue);
    font-size: var(--t-1);
  }
  .nuevo form {
    display: flex;
    gap: 1rem;
    align-items: center;
    padding: 1rem 0.5rem;
    flex-wrap: wrap;
  }
  .nuevo .campo {
    flex: 1 1 18rem;
  }
  .detalle {
    flex: 1 1 100%;
  }
  .detalle textarea {
    width: 100%;
    resize: vertical;
  }
  .bancales .nombre small {
    display: block;
    color: var(--liquen-apagado);
    font-size: var(--t-1);
  }
  .colores {
    display: flex;
    gap: 6px;
  }
  .colores button {
    width: 1.1rem;
    height: 1.1rem;
    border: 2px solid transparent;
    border-radius: 50%;
    cursor: pointer;
    outline-offset: 2px;
  }
  .colores button.elegido {
    border-color: var(--liquen);
  }
  @media (max-width: 640px) {
    .vivero {
      margin: 0 -1rem;
    }
    .pie-vivero {
      inset: auto 1rem 1rem;
    }
    .bancales a {
      grid-template-columns: auto 1fr auto;
    }
    .semillas {
      display: none;
    }
  }
</style>
