<script>
  import { onDestroy } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { api } from '../lib/api.js';
  import { renderizar } from '../lib/render.js';
  import { suscribir, avisar } from '../lib/estado.svelte.js';
  import { crearTranscripcion } from '../lib/eventos.js';
  import { crearAutoguardado } from '../lib/autoguardado.js';
  import Editor from './Editor.svelte';
  import Adjuntos from './Adjuntos.svelte';

  // Examen de dominio de un nodo de estudio. Sin `inicial` se elige la dificultad y se genera uno nuevo;
  // con `inicial` (un examen del registro) se muestra en su estado: abierto, corrigiendo o corregido.
  let { ref, nodo, base, inicial = null, alCerrar } = $props();

  const NIVELES = [
    { id: 'suficiente', nombre: 'Suficiente', tiempo: '4 h 30 min',
      texto: 'Lo que vas a necesitar más adelante en tu idea para entender y atacar sus incógnitas y problemas abiertos. Ni más ni menos.' },
    { id: 'avanzado', nombre: 'Avanzado', tiempo: 'Sin límite',
      texto: 'Demuestra que estás completamente cómodo con toda la rama: teoremas centrales, demostraciones, técnicas y casos límite.' },
    { id: 'experto', nombre: 'Experto', tiempo: 'Sin límite',
      texto: 'Implacable. Problemas avanzados y reales, endurecidos, incluso de temas que no parecen de esta rama: tendrás que ver la conexión.' },
  ];

  let examen = $state(inicial);
  let elegida = $state('suficiente');
  let pidiendo = $state(false);
  let ahora = $state(Date.now());
  let version = $state(0);
  let transcripcion = crearTranscripcion();
  const reloj = setInterval(() => (ahora = Date.now()), 1000);

  const quitar = suscribir(ref, (msg) => {
    if (!examen || msg.nodo !== nodo.id) return;
    if (msg.tipo === 'examen' && msg.examen.id === examen.id) {
      examen = msg.examen;
      if (!['generando', 'corrigiendo'].includes(examen.estado)) (transcripcion = crearTranscripcion()), version++;
    } else if (msg.tipo === 'examen-evento' && msg.id === examen.id) {
      transcripcion.aplicar(msg.ev);
      version++;
    } else if (msg.tipo === 'reconexion') api.examen(ref.carpetaId, ref.ideaId, nodo.id, examen.id).then((e) => (examen = e));
  });
  onDestroy(() => {
    quitar();
    clearInterval(reloj);
    for (const g of guardados.values()) g.vaciar();
  });

  let vivo = $derived.by(() => {
    version;
    const b = transcripcion.bloques;
    return { ultimo: b.at(-1) };
  });

  async function generar() {
    pidiendo = true;
    try {
      examen = await api.generarExamen(ref.carpetaId, ref.ideaId, nodo.id, elegida);
    } catch (e) {
      avisar(
        { 'examen-abierto': 'Ya tienes un examen sin terminar en este nodo: ábrelo desde el registro.', 'en-proceso': 'La sesión de la idea está trabajando: espera a que termine.', cuota: 'La investigación está pausada por cuota.' }[e.message] ?? `No se pudo generar: ${e.message}`,
        'error',
      );
    } finally {
      pidiendo = false;
    }
  }

  // Respuestas: el texto se guarda solo (1 s tras dejar de escribir); los adjuntos, al momento.
  const guardados = new Map();
  function guardadoDe(p) {
    if (!guardados.has(p)) {
      guardados.set(p, crearAutoguardado(async (texto) => {
        try {
          examen = await api.responderExamen(ref.carpetaId, ref.ideaId, nodo.id, examen.id, p, { texto });
        } catch (e) {
          avisar(e.message === 'tiempo-agotado' || e.message === 'examen-cerrado' ? 'El examen ya está cerrado.' : `No se pudo guardar la respuesta: ${e.message}`, 'error');
        }
      }, 1000));
    }
    return guardados.get(p);
  }
  async function cambiarAdjuntos(p, adjuntos) {
    try {
      examen = await api.responderExamen(ref.carpetaId, ref.ideaId, nodo.id, examen.id, p, { adjuntos });
    } catch (e) {
      avisar(`No se pudo guardar: ${e.message}`, 'error');
    }
  }

  async function entregar() {
    const sin = examen.preguntas.filter((p) => !examen.respuestas?.[p.id]?.texto?.trim() && !examen.respuestas?.[p.id]?.adjuntos?.length).length;
    if (!confirm(sin ? `Te quedan ${sin} preguntas sin responder. ¿Entregar igualmente?` : '¿Entregar el examen? Ya no podrás cambiar las respuestas.')) return;
    for (const g of guardados.values()) await g.vaciar();
    try {
      examen = await api.entregarExamen(ref.carpetaId, ref.ideaId, nodo.id, examen.id);
    } catch (e) {
      avisar(`No se pudo entregar: ${e.message}`, 'error');
    }
  }

  async function recorregir() {
    try {
      examen = await api.recorregirExamen(ref.carpetaId, ref.ideaId, nodo.id, examen.id);
    } catch (e) {
      avisar(`No se pudo corregir: ${e.message}`, 'error');
    }
  }

  let restante = $derived(examen?.limite ? Math.max(0, Date.parse(examen.limite) - ahora) : null);
  const reloj2 = (ms) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };
  let nivel = $derived(NIVELES.find((n) => n.id === (examen?.dificultad ?? elegida)));
  const ACCION = { WebSearch: 'Buscando problemas', WebFetch: 'Leyendo una fuente', Read: 'Leyendo', Bash: 'Preparando figuras' };
  const tecla = (e) => e.key === 'Escape' && (!examen || examen.estado !== 'abierto') && alCerrar();
</script>

<svelte:window onkeydown={tecla} />

<div class="velo" transition:fade={{ duration: 200 }}></div>
<div class="examen {nivel?.id}" role="dialog" aria-label="Examen de {nodo.titulo}" transition:fly={{ y: 30, duration: 420, easing: cubicOut }}>
  <header>
    <div>
      <p class="de">Examen de dominio{examen ? `: ${nivel.nombre}` : ''}</p>
      <h2>{nodo.titulo}</h2>
    </div>
    {#if restante !== null && examen?.estado === 'abierto'}
      <div class="tiempo" class:poco={restante < 15 * 60 * 1000}>{reloj2(restante)}</div>
    {/if}
    <button class="cerrar" onclick={alCerrar} aria-label="Cerrar">×</button>
  </header>

  <div class="cuerpo">
    {#if !examen}
      <p class="intro">Para marcar este tema como dominado tienes que demostrarlo. Elige la dificultad: la sesión generará un examen nuevo ahora mismo, distinto en cada intento.</p>
      <div class="niveles" role="radiogroup" aria-label="Dificultad">
        {#each NIVELES as n (n.id)}
          <button class="nivel {n.id}" class:elegido={elegida === n.id} role="radio" aria-checked={elegida === n.id} onclick={() => (elegida = n.id)}>
            <span class="nombre">{n.nombre}</span>
            <span class="t">{n.tiempo}</span>
            <span class="texto">{n.texto}</span>
          </button>
        {/each}
      </div>
      <p class="pie-info">Se aprueba con 3 sobre 5. Puedes responder con texto y fórmulas, y adjuntar fotos o documentos en cada pregunta. Todos los intentos quedan en el registro.</p>
      <div class="acciones"><button class="boton primario" disabled={pidiendo} onclick={generar}>Generar examen {nivel.nombre.toLowerCase()}</button></div>
    {:else if examen.estado === 'generando' || examen.estado === 'corrigiendo'}
      <div class="espera">
        <span class="luz"></span>
        <p>{examen.estado === 'generando' ? 'La sesión está preparando tu examen…' : 'La sesión está corrigiendo tus respuestas…'}</p>
        {#if vivo.ultimo?.tipo === 'herramienta'}<p class="accion">{ACCION[vivo.ultimo.herramienta] ?? 'Trabajando'}{vivo.ultimo.query ? `: «${vivo.ultimo.query}»` : ''}</p>{/if}
      </div>
    {:else if examen.estado === 'error'}
      <p class="fallo">No se pudo generar el examen: {examen.error}</p>
    {:else if examen.estado === 'abierto'}
      {#if examen.instrucciones}<div class="instrucciones manuscrito">{@html renderizar(examen.instrucciones, base)}</div>{/if}
      <ol class="preguntas">
        {#each examen.preguntas as p, k (p.id)}
          <li class="pregunta">
            <header><span class="n">{k + 1}</span><span class="puntos">{p.puntos} {p.puntos === 1 ? 'punto' : 'puntos'}</span></header>
            <div class="enunciado manuscrito">{@html renderizar(p.enunciado, base)}</div>
            <div class="respuesta">
              <Editor valor={examen.respuestas?.[p.id]?.texto ?? ''} {base} alCambiar={(md) => guardadoDe(p.id).programar(md)}
                marcador="Tu respuesta, con fórmulas en $…$ y $$…$$, o adjunta fotos o documentos debajo." />
            </div>
            <Adjuntos rutas={examen.respuestas?.[p.id]?.adjuntos ?? []} {base}
              alSubir={(a) => api.adjuntarExamen(ref.carpetaId, ref.ideaId, nodo.id, examen.id, p.id, a).then((r) => r.ruta)}
              alCambiar={(rutas) => cambiarAdjuntos(p.id, rutas)} />
          </li>
        {/each}
      </ol>
      <div class="acciones fija"><span>Se guarda solo.</span><button class="boton primario" onclick={entregar}>Entregar examen</button></div>
    {:else}
      {#if examen.correccion}
        {@const c = examen.correccion}
        <div class="nota" class:aprobado={c.aprobado}>
          <div class="cifra">{c.nota.toFixed(1).replace('.', ',')}<small>/5</small></div>
          <div class="sello-nota">{c.aprobado ? (c.nota === 5 ? 'Dominio perfecto' : 'Aprobado') : 'Suspenso'}</div>
          {#if examen.automatico}<p class="auto">Se entregó solo al acabarse el tiempo.</p>{/if}
        </div>
        {#if c.comentario}<div class="general manuscrito">{@html renderizar(c.comentario, base)}</div>{/if}
        <ol class="preguntas corregidas">
          {#each examen.preguntas as p, k (p.id)}
            {@const cp = c.preguntas.find((x) => x.id === p.id)}
            {@const r = examen.respuestas?.[p.id]}
            <li class="pregunta">
              <header><span class="n">{k + 1}</span><span class="puntos" class:llena={cp?.nota === p.puntos}>{(cp?.nota ?? 0).toString().replace('.', ',')} / {p.puntos}</span></header>
              <div class="enunciado manuscrito">{@html renderizar(p.enunciado, base)}</div>
              <div class="tu-respuesta manuscrito">{@html renderizar(r?.texto?.trim() ? r.texto : '_(sin texto)_', base)}</div>
              {#if r?.adjuntos?.length}<Adjuntos rutas={r.adjuntos} {base} deshabilitado alSubir={() => {}} alCambiar={() => {}} />{/if}
              {#if cp?.comentario}<div class="comentario manuscrito">{@html renderizar(cp.comentario, base)}</div>{/if}
            </li>
          {/each}
        </ol>
      {:else}
        <p class="fallo">La corrección falló: {examen.error ?? 'sin detalle'}.</p>
        <div class="acciones"><button class="boton" onclick={recorregir}>Volver a corregir</button></div>
      {/if}
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
  .examen {
    position: fixed;
    z-index: 49;
    inset: 3vh 50% auto auto;
    translate: 50% 0;
    display: flex;
    flex-direction: column;
    width: min(64rem, 95vw);
    max-height: 94vh;
    border: 1px solid var(--linea-viva);
    border-top: 3px solid var(--tono);
    border-radius: var(--radio-m);
    background: var(--humus);
    box-shadow: 0 40px 120px -30px rgb(0 0 0 / 0.9);
  }
  .suficiente {
    --tono: var(--aceptada);
  }
  .avanzado {
    --tono: var(--proceso);
  }
  .experto {
    --tono: var(--pausada);
  }
  .examen > header {
    display: flex;
    align-items: start;
    gap: 1rem;
    padding: 1.3rem 1.8rem 0.8rem;
    border-bottom: 1px solid var(--linea);
  }
  .examen > header > div:first-child {
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
  .tiempo {
    padding: 0.4rem 0.8rem;
    border: 1px solid var(--linea-viva);
    border-radius: 8px;
    font-family: var(--mono);
    font-size: 1.1rem;
  }
  .tiempo.poco {
    color: var(--rechazada);
    border-color: var(--rechazada);
    animation: latir 1s ease-in-out infinite;
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
  .intro,
  .pie-info {
    color: var(--liquen-tenue);
  }
  .niveles {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.8rem;
    margin: 1rem 0;
  }
  .nivel {
    --tono-n: var(--aceptada);
    display: grid;
    align-content: start;
    gap: 0.35rem;
    padding: 1rem 1.1rem;
    border: 1px solid var(--linea-viva);
    border-radius: 12px;
    background: var(--humus-hondo);
    text-align: left;
    cursor: pointer;
    transition: border-color 0.25s, background 0.25s, transform 0.3s var(--curva-muelle);
  }
  .nivel.avanzado {
    --tono-n: var(--proceso);
  }
  .nivel.experto {
    --tono-n: var(--pausada);
  }
  .nivel:hover {
    transform: translateY(-2px);
  }
  .nivel.elegido {
    border-color: var(--tono-n);
    background: color-mix(in srgb, var(--tono-n) 9%, var(--humus-hondo));
    box-shadow: 0 0 0 1px var(--tono-n);
  }
  .nivel .nombre {
    font-family: var(--serif);
    font-size: var(--t2);
    color: var(--tono-n);
  }
  .nivel .t {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--liquen-tenue);
  }
  .nivel .texto {
    font-size: 0.88rem;
    line-height: 1.45;
    color: var(--liquen);
  }
  .acciones {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 0.8rem;
    margin-top: 1rem;
  }
  .acciones.fija {
    position: sticky;
    bottom: -1.6rem;
    padding: 0.8rem 0;
    background: linear-gradient(transparent, var(--humus) 40%);
  }
  .acciones span {
    font-size: var(--t-1);
    color: var(--liquen-apagado);
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
  .instrucciones {
    padding: 0.6rem 1rem;
    border-left: 3px solid var(--tono);
    background: var(--humus-hondo);
    border-radius: 0 8px 8px 0;
  }
  .preguntas {
    margin: 1rem 0 0;
    padding: 0;
    list-style: none;
  }
  .pregunta {
    padding: 1.2rem 0 1.4rem;
    border-top: 1px solid var(--linea);
  }
  .pregunta header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .n {
    display: grid;
    place-items: center;
    width: 1.9rem;
    height: 1.9rem;
    border: 1px solid var(--tono);
    border-radius: 50%;
    font-family: var(--serif);
    color: var(--tono);
  }
  .puntos {
    font-size: var(--t-1);
    color: var(--liquen-tenue);
  }
  .puntos.llena {
    color: var(--aceptada);
  }
  .respuesta {
    margin: 0.6rem 0 0.4rem;
    padding: 0.3rem 0.9rem;
    border: 1px solid var(--linea);
    border-radius: var(--radio-s);
    background: var(--humus-hondo);
  }
  .nota {
    display: grid;
    justify-items: center;
    gap: 0.3rem;
    padding: 1.2rem 0 1.6rem;
    --tono-nota: var(--rechazada);
  }
  .nota.aprobado {
    --tono-nota: var(--tono);
  }
  .cifra {
    font-family: var(--serif);
    font-size: 4.5rem;
    line-height: 1;
    color: var(--tono-nota);
  }
  .cifra small {
    font-size: 1.6rem;
    color: var(--liquen-tenue);
  }
  .sello-nota {
    padding: 0.3em 0.9em;
    border: 2px solid var(--tono-nota);
    border-radius: 4px;
    color: var(--tono-nota);
    font-family: var(--serif);
    font-variant: small-caps;
    letter-spacing: 0.12em;
    font-size: var(--t1);
    transform: rotate(-4deg);
    animation: estampar 700ms var(--curva-muelle) both 200ms;
  }
  @keyframes estampar {
    from {
      opacity: 0;
      transform: rotate(-12deg) scale(1.8);
    }
  }
  .auto {
    margin: 0.4rem 0 0;
    font-size: var(--t-1);
    color: var(--liquen-tenue);
  }
  .general {
    padding: 0.8rem 1rem;
    border-left: 3px solid var(--claude);
    background: var(--claude-velo);
    border-radius: 0 8px 8px 0;
  }
  .tu-respuesta {
    margin: 0.6rem 0;
    padding: 0.5rem 0.9rem;
    border-left: 2px solid var(--tu);
    background: var(--tu-velo);
    border-radius: 0 8px 8px 0;
  }
  .comentario {
    margin-top: 0.6rem;
    padding: 0.5rem 0.9rem;
    border-left: 2px solid var(--claude);
    border-radius: 0 8px 8px 0;
    background: var(--claude-velo);
    font-size: 0.97rem;
  }
  @media (max-width: 800px) {
    .niveles {
      grid-template-columns: 1fr;
    }
  }
</style>
