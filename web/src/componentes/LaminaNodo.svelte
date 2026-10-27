<script>
  import { getContext } from 'svelte';
  import { onDestroy } from 'svelte';
  import { cubicOut, cubicIn } from 'svelte/easing';
  import { api } from '../lib/api.js';
  import { renderizar } from '../lib/render.js';
  import { avisar, suscribir } from '../lib/estado.svelte.js';
  import Examen from './Examen.svelte';
  import Verificacion from './Verificacion.svelte';
  import { crearAutoguardado } from '../lib/autoguardado.js';
  import Glosable from './Glosable.svelte';
  import Editor from './Editor.svelte';
  import Taller from './Taller.svelte';
  import { diferencias } from '../lib/diff.js';
  import ProgramaAsignatura from './ProgramaAsignatura.svelte';
  import Lector from './Lector.svelte';

  // La lámina de un nodo: brota desde el nodo pulsado y ocupa la pantalla.
  // `curso`: en los bancales de «Aprender algo nuevo», { estado, indice } de la redacción de esta asignatura.
  let { nodo, mapa, progreso, ref, base, glosas, desde, bloqueado = false, curso = null, alCerrar, alIrA, alCambiar, alAccionCurso = null } = $props();
  let leyendo = $state(null); // id de la conferencia, práctica o demostración abierta en el lector
  // Una asignatura sin terminar se lee por sus borradores: un índice provisional con lo ya escrito.
  let borrador = $state(null); // archivo del borrador abierto
  let indiceBorrador = $derived.by(() => {
    // La que la sesión está escribiendo ahora no se abre: puede estar a medias.
    const enCurso = curso?.estado?.estado === 'redactando' ? curso?.actividad?.documentoActual : null;
    const docs = (curso?.borradores ?? []).filter((b) => b.archivo !== enCurso);
    const titulo = (b, k) => {
      const i = Number(b.archivo.match(/^c(\d+)/)?.[1]) - 1;
      return (b.clase === 'conferencia' && nodo.plan?.[i]?.titulo) || b.archivo.replace(/\.md$/, '').replace(/^[cpv]\d+-?/, '').replace(/-/g, ' ') || `Documento ${k + 1}`;
    };
    const pieza = (b, k) => ({ id: b.archivo.replace(/\.md$/, ''), titulo: titulo(b, k), documento: b.documento });
    return {
      conferencias: docs.filter((b) => b.clase === 'conferencia').map(pieza),
      practicas: docs.filter((b) => b.clase === 'practica').map(pieza),
      valientes: docs.filter((b) => b.clase === 'valiente').map(pieza),
      recursos: [],
    };
  });

  const vocabActual = getContext('vocab') ?? (() => undefined);
  let vocab = $derived(vocabActual() ?? { hoja: 'Incógnita', fruto: 'Problema abierto', estadosIncognita: ['Abierta', 'Atacándola', 'Resuelta'], dominio: 'examen' });
  let ESTADOS = $derived({
    estudio: [['pendiente', 'Pendiente'], ['en-curso', 'Estudiando'], ['hecho', 'Dominado']],
    incognita: [['abierta', vocab.estadosIncognita[0]], ['atacando', vocab.estadosIncognita[1]], ['resuelta', vocab.estadosIncognita[2]]],
  });
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

  // Registro de exámenes (estudio) o verificaciones (incógnitas) del nodo.
  let registro = $state([]);
  let examenAbierto = $state(null); // { inicial }
  let verificacionAbierta = $state(null); // { inicial }
  async function cargarRegistro() {
    try {
      registro = nodo.tipo === 'estudio'
        ? await api.examenes(ref.carpetaId, ref.ideaId, nodo.id)
        : await api.verificaciones(ref.carpetaId, ref.ideaId, nodo.id);
    } catch {
      registro = [];
    }
  }
  $effect(() => {
    nodo.id;
    cargarRegistro();
  });
  const quitarRegistro = suscribir(ref, (msg) => {
    if (msg.nodo !== nodo.id) return;
    if (msg.tipo === 'examen' || msg.tipo === 'verificacion') {
      // Solo cuando cambia de estado: cada autoguardado del examen también emite un aviso.
      const x = msg.examen ?? msg.verificacion;
      if (registro.find((r) => r.id === x.id)?.estado !== x.estado) cargarRegistro();
      if (['corregido', 'aceptada'].includes(msg.examen?.estado ?? msg.verificacion?.estado)) alCambiar();
    }
  });
  onDestroy(quitarRegistro);
  let dominio = $derived(progreso?.nodos?.[nodo.id]?.dominio ?? null);
  const NOMBRE_NIVEL = { suficiente: 'Suficiente', avanzado: 'Avanzado', experto: 'Experto' };
  const fechaCorta = (iso) => (iso ? new Date(iso).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

  async function marcar(e) {
    // «Dominado» y «Resuelta» no se marcan: se ganan con un examen o una verificación.
    if (e === 'hecho') {
      const abierto = registro.find((x) => ['generando', 'abierto', 'corrigiendo'].includes(x.estado));
      examenAbierto = { inicial: abierto ?? null };
      return;
    }
    if (e === 'resuelta') {
      const enCurso = registro.find((x) => x.estado === 'revisando');
      verificacionAbierta = { inicial: enCurso ?? null };
      return;
    }
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
  function tecla(e) {
    if (e.key !== 'Escape' || document.querySelector('aside.hoja, div.panel, .examen, .verificacion, .lector')) return;
    // Escape mientras se escribe no cierra la lámina (se perdería lo escrito en el taller).
    if (e.target.closest?.('textarea, input, [contenteditable="true"]')) return;
    if (comparando) comparando = null;
    else alCerrar();
  }
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
          <span class="marca-tipo">◇</span>{nodo.abierto ? vocab.fruto : vocab.hoja}{#if nodo.dificultad}<span class="dif">dificultad {nodo.dificultad}</span>{/if}
        {:else}
          <span class="marca-tipo">●</span>Ruta de estudio{#if nodo.duracion}<span class="dif">{nodo.duracion}</span>{/if}
        {/if}
      </p>
      <h1>{nodo.titulo}</h1>
      {#if nodo.resumen}<p class="resumen">{nodo.resumen}</p>{/if}
      <div class="estados" role="radiogroup" aria-label="Tu progreso">
        {#each ESTADOS[nodo.tipo] as [valor, texto] (valor)}
          <button role="radio" aria-checked={estado === valor} class:elegido={estado === valor} class={valor} onclick={() => marcar(valor)}
            title={valor === 'hecho' ? (vocab.dominio === 'examen' ? 'Requiere aprobar un examen' : 'Requiere superar una prueba: caso práctico o examen') : valor === 'resuelta' ? 'Requiere pasar la verificación' : ''}>
            {texto}{#if (valor === 'hecho' || valor === 'resuelta') && estado !== valor}<span class="candado" aria-hidden="true"> ⌁</span>{/if}
          </button>
        {/each}
      </div>
      {#if dominio && estado === 'hecho'}
        <p class="dominio {dominio.dificultad}" class:perfecto={dominio.nota === 5}>
          Dominado en nivel {NOMBRE_NIVEL[dominio.dificultad]} con {String(dominio.nota).replace('.', ',')}/5
        </p>
      {/if}
    </header>

    {#if curso && nodo.tipo === 'estudio'}
      <ProgramaAsignatura {nodo} estado={curso.estado} indice={curso.indice} actividad={curso.actividad} borradores={curso.borradores ?? []}
        alAbrirBorrador={(archivo) => (borrador = archivo)} alAbrir={(id) => (leyendo = id)} alAccion={alAccionCurso} />
    {/if}

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
        {#if registro.length}
          <section>
            <h2>{nodo.tipo === 'estudio' ? 'Registro de exámenes' : 'Verificaciones'}</h2>
            <ul class="registro">
              {#each [...registro].reverse() as x (x.id)}
                <li>
                  <button onclick={() => (nodo.tipo === 'estudio' ? (examenAbierto = { inicial: x }) : (verificacionAbierta = { inicial: x }))}>
                    {#if nodo.tipo === 'estudio'}
                      <span class="nivel {x.dificultad}">{NOMBRE_NIVEL[x.dificultad]}</span>
                      <span class="res" class:ok={x.correccion?.aprobado}>
                        {x.correccion ? `${String(x.correccion.nota).replace('.', ',')}/5 ${x.correccion.aprobado ? 'aprobado' : 'suspenso'}` : { generando: 'generándose', abierto: 'sin entregar', corrigiendo: 'corrigiéndose', entregado: 'sin corregir', error: 'error' }[x.estado]}
                      </span>
                    {:else}
                      <span class="res" class:ok={x.estado === 'aceptada'}>{{ revisando: 'en revisión', aceptada: 'aceptada', rechazada: 'no concluyente', error: 'error' }[x.estado]}</span>
                      <span class="resumen-v">{x.resumen}</span>
                    {/if}
                    <span class="fecha">{fechaCorta(x.creado)}</span>
                  </button>
                </li>
              {/each}
            </ul>
          </section>
        {/if}
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
          <Taller {ref} {nodo} {base} bind:cita alIrMismaIdea={alIrA} alVerDocumento={(md, titulo) => (comparando = md === null ? null : { md, titulo })}
            alCambioEnunciado={() => recarga++} />
        </div>
      {/if}
    </div>
  </div>
</div>

{#if borrador && !curso?.indice && indiceBorrador.conferencias.length + indiceBorrador.practicas.length + indiceBorrador.valientes.length}
  <Lector {nodo} indice={indiceBorrador} inicial={borrador.replace(/\.md$/, '')} {base} total={nodo.plan?.length ?? null}
    aviso="Borrador: esta asignatura aún se está redactando. Cuando termine, Semillero la revisará entera (índice, escenas y recursos) y esta versión puede cambiar."
    cargar={(rel) => api.documento(ref.carpetaId, ref.ideaId, rel)} alCerrar={() => (borrador = null)} />
{/if}
{#if leyendo && curso?.indice}
  <Lector {nodo} indice={curso.indice} inicial={leyendo} {base} {glosas} {Glosable}
    cargar={(rel) => api.documento(ref.carpetaId, ref.ideaId, rel)} alCerrar={() => (leyendo = null)} />
{/if}
{#if examenAbierto}
  <Examen {ref} {nodo} {base} inicial={examenAbierto.inicial} alCerrar={() => (examenAbierto = null)} />
{/if}
{#if verificacionAbierta}
  <Verificacion {ref} {nodo} {base} inicial={verificacionAbierta.inicial} alCerrar={() => (verificacionAbierta = null)} />
{/if}

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
  .candado {
    opacity: 0.6;
  }
  .dominio {
    margin: 0.7rem 0 0;
    font-weight: 600;
    color: var(--tono-d);
  }
  .dominio.suficiente {
    --tono-d: var(--aceptada);
  }
  .dominio.avanzado {
    --tono-d: var(--proceso);
  }
  .dominio.experto {
    --tono-d: var(--pausada);
  }
  .dominio.perfecto {
    animation: brillo-d 1.6s ease-in-out infinite;
  }
  @keyframes brillo-d {
    50% {
      text-shadow: 0 0 12px var(--tono-d);
    }
  }
  .registro {
    display: grid;
    gap: 0.35rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .registro button {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.3rem 0.6rem;
    width: 100%;
    padding: 0.5rem 0.7rem;
    border: 1px solid var(--linea);
    border-radius: 8px;
    background: var(--humus-hondo);
    text-align: left;
    cursor: pointer;
    font-size: 0.85rem;
  }
  .registro button:hover {
    border-color: var(--linea-viva);
  }
  .registro .nivel {
    font-weight: 600;
  }
  .registro .nivel.suficiente {
    color: var(--aceptada);
  }
  .registro .nivel.avanzado {
    color: var(--proceso);
  }
  .registro .nivel.experto {
    color: var(--pausada);
  }
  .registro .res {
    color: var(--liquen-tenue);
  }
  .registro .res.ok {
    color: var(--aceptada);
  }
  .registro .resumen-v {
    flex-basis: 100%;
    color: var(--liquen);
  }
  .registro .fecha {
    margin-left: auto;
    color: var(--liquen-apagado);
    font-size: 0.75rem;
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
