<script>
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { api } from '../lib/api.js';
  import { renderizar } from '../lib/render.js';
  import { avisar, refrescar } from '../lib/estado.svelte.js';
  import { ir, enlace, reemplazar } from '../lib/ruta.svelte.js';
  import Arbol from '../componentes/Arbol.svelte';
  import Cuestionario from '../componentes/Cuestionario.svelte';
  import LaminaNodo from '../componentes/LaminaNodo.svelte';
  import EnVivo from '../componentes/EnVivo.svelte';
  import { setContext } from 'svelte';
  import { vocabDe, cargarTipos } from '../lib/tipos.svelte.js';

  // La página de una idea que germina: el árbol (o la plántula mientras se prepara) a pantalla completa.
  // `nodo`: si la ruta lo trae (p. ej. desde una conexión de otro taller), su lámina se abre al cargar.
  let { idea, ref, base, glosas, carpeta, nodo: nodoInicial = undefined, alVerManuscrito } = $props();

  let datos = $state(null);
  // El vocabulario del tipo del bancal («Hipótesis que validar», «Validada»…) para todo lo que cuelga de aquí.
  cargarTipos();
  let vocab = $derived(vocabDe(carpeta));
  setContext('vocab', () => vocab);
  let lamina = $state(null); // { nodo, desde }: se conserva mientras la lámina se cierra
  let laminaAbierta = $state(false);
  const abrirLamina = (nodo, desde) => ((lamina = { nodo, desde }), (laminaAbierta = true));
  let redactando = $state(false);
  let peticion = $state('');
  let enviando = $state(false);
  let viendoVision = $state(false);
  let vivoAbierto = $state(true);

  async function cargar() {
    try {
      datos = await api.germinacion(ref.carpetaId, ref.ideaId);
    } catch (e) {
      avisar(`No se pudo cargar la germinación: ${e.message}`, 'error');
    }
  }
  // Recarga cuando la idea cambia (fin de una ejecución, por ejemplo).
  $effect(() => {
    idea.actualizada;
    cargar();
  });

  let mapa = $derived(datos?.mapa);
  // El nodo de la URL se abre una vez por cada valor distinto (una conexión a otro nodo de la misma idea
  // cambia el valor); al cerrar la lámina se quita de la URL para que no se reabra.
  let atendido = null;
  $effect(() => {
    if (!nodoInicial || nodoInicial === atendido || !mapa) return;
    const n = mapa.nodos.find((x) => x.id === nodoInicial);
    if (!n) return;
    atendido = nodoInicial;
    abrirLamina(n, { x: innerWidth / 2, y: innerHeight / 2 });
  });
  function cerrarLamina() {
    laminaAbierta = false;
    atendido = null;
    if (nodoInicial) reemplazar(enlace.idea(ref.carpetaId, ref.ideaId));
  }
  // Las raíces del árbol: cada mensaje del manuscrito, en orden.
  let raices = $derived.by(() => {
    let dictamenes = 0;
    return idea.hilo.map((m) => ({
      id: m.archivo,
      etiqueta: m.n === 1 ? 'Tu idea' : m.autor === 'claude' ? `Dictamen ${++dictamenes}` : 'Tu réplica',
    }));
  });
  let progreso = $derived(datos?.progreso);
  // Recuento real de estados: lo de estudio y lo de las incógnitas.
  let recuento = $derived.by(() => {
    const r = { pendiente: 0, 'en-curso': 0, hecho: 0, abierta: 0, atacando: 0, resuelta: 0 };
    for (const n of mapa?.nodos ?? []) {
      const e = progreso?.nodos?.[n.id]?.estado;
      if (n.tipo === 'estudio') r[e === 'hecho' || e === 'en-curso' ? e : 'pendiente']++;
      else r[e === 'resuelta' || e === 'atacando' ? e : 'abierta']++;
    }
    return r;
  });
  let enProceso = $derived(idea.estado === 'en-proceso');
  let fase = $derived(mapa?.fase ?? 'preparando');
  let diagnosticando = $derived(fase === 'diagnostico' && !enProceso && idea.estado !== 'pausada');

  // Lo que el usuario ha cambiado y la sesión aún no sabe.
  let cambios = $derived.by(() => {
    if (!progreso || !mapa) return [];
    return mapa.nodos.filter((n) => {
      const a = progreso.nodos[n.id] ?? {};
      const b = progreso.enviado?.nodos?.[n.id] ?? {};
      return (a.estado ?? '') !== (b.estado ?? '') || (a.notas ?? '') !== (b.notas ?? '');
    });
  });

  let estadoTexto = $derived.by(() => {
    if (idea.estado === 'pausada') return 'Pausada por la cuota. Reanúdala con «Reanudar Investigación» en la portada.';
    if (idea.estado === 'detenida') return 'Detenida. Puedes retomarla cuando quieras.';
    if (idea.estado === 'error') return `La última ejecución falló: ${idea.error ?? 'sin detalle'}`;
    if (enProceso) return fase === 'preparando' ? 'La sesión está preparando tus preguntas…' : fase === 'diagnostico' ? 'La sesión está investigando y trazando tu mapa…' : 'La sesión está reajustando el mapa…';
    if (fase === 'diagnostico') return 'Responde al diagnóstico para que la sesión trace tu camino.';
    return null;
  });

  async function germinar(texto = '') {
    enviando = true;
    try {
      await api.germinar(ref.carpetaId, ref.ideaId, texto);
      refrescar();
      return true;
    } catch (e) {
      avisar(e.message === 'en-proceso' ? 'La sesión ya está trabajando en esta idea.' : `No se pudo enviar: ${e.message}`, 'error');
      return false;
    } finally {
      enviando = false;
    }
  }

  async function enviarRespuestas(respuestas) {
    try {
      await api.responderDiagnostico(ref.carpetaId, ref.ideaId, respuestas);
    } catch (e) {
      avisar(`No se pudieron guardar tus respuestas: ${e.message}`, 'error');
      return;
    }
    await germinar();
  }

  let avisadoGuardado = false;
  function guardarRespuestas(r) {
    return api.responderDiagnostico(ref.carpetaId, ref.ideaId, r).catch((e) => {
      if (!avisadoGuardado) avisar(`No se están guardando tus respuestas: ${e.message}`, 'error');
      avisadoGuardado = true;
    });
  }

  async function enviarAvances() {
    if (await germinar(peticion)) {
      peticion = '';
      redactando = false;
      avisar('Enviado: la sesión está reajustando tu mapa.');
    }
  }

  // Exportar: un ejecutable autónomo con la germinación completa para leerla en otro ordenador.
  let exportando = $state(false); // panel abierto
  let compilando = $state(null); // 'linux' | 'windows' mientras se genera
  const NOMBRE_SO = { linux: 'Linux', windows: 'Windows' };
  async function exportar(so) {
    compilando = so;
    try {
      const { nombre, blob } = await api.exportar(ref.carpetaId, ref.ideaId, so);
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      avisar(`Descargado ${nombre}.`);
    } catch (e) {
      avisar(
        { 'sin-mapa': 'Esta germinación todavía no tiene árbol que exportar.', 'visor-no-construido': 'Falta construir el visor: ejecuta npm run build.' }[e.message]
          ?? `No se pudo exportar: ${e.message}`,
        'error',
      );
    } finally {
      compilando = null;
    }
  }

  function irANodo(id) {
    const n = mapa.nodos.find((x) => x.id === id);
    if (n) abrirLamina(n, { x: innerWidth / 2, y: innerHeight / 2 });
  }
</script>

<section class="germinacion" class:con-vivo={enProceso && vivoAbierto}>
  <div class="escenario">
    {#if mapa?.fase === 'mapa'}
      <div class="capa" in:fade={{ duration: 500 }}>
        <Arbol {mapa} {progreso} titulo={idea.titulo} clave="{ref.carpetaId}/{ref.ideaId}" {raices}
          alAbrirNodo={abrirLamina} alAbrirRaiz={(archivo) => alVerManuscrito(archivo)} />
      </div>
    {:else}
      <!-- Plántula: la semilla brota mientras la sesión se prepara. -->
      <div class="plantula" class:quieta={!enProceso} class:atenuada={diagnosticando} in:fade={{ duration: 500 }}>
        <svg viewBox="-120 -260 240 300" aria-hidden="true">
          <ellipse cx="0" cy="12" rx="110" ry="10" class="tierra" />
          <path d="M0 0 C 2 -40, -4 -90, 0 -150" class="tallo" pathLength="1" />
          <path d="M0 -120 C -30 -140, -62 -128, -70 -104 C -40 -96, -14 -104, 0 -120 Z" class="cotiledon izq" />
          <path d="M0 -150 C 26 -176, 62 -170, 72 -146 C 42 -134, 16 -138, 0 -150 Z" class="cotiledon der" />
          <path d="M0 -18 C 16 -14, 22 2, 0 20 C -22 2, -16 -14, 0 -18 Z" class="grano" />
        </svg>
        <button class="semilla-texto" onclick={alVerManuscrito}>{idea.titulo}</button>
      </div>
    {/if}

    <header class="cabecera">
      <a class="migas" href={enlace.carpeta(ref.carpetaId)} onclick={(e) => (e.preventDefault(), ir(enlace.carpeta(ref.carpetaId)))}>
        <span style:background={carpeta?.color}></span>{carpeta?.nombre ?? ref.carpetaId}
      </a>
      <h1>{idea.titulo}</h1>
      <p class="fase">
        <span class="luz" class:viva={enProceso}></span>
        {fase === 'mapa' ? 'Germinando: mapa vivo' : fase === 'diagnostico' ? 'Germinando: diagnóstico' : 'Germinando: preparando'}
      </p>
      {#if mapa?.fase === 'mapa'}
        <dl class="recuento">
          <div><dt>Estudio</dt><dd><span>{recuento.pendiente}</span> pendientes, <span class="c">{recuento['en-curso']}</span> estudiando, <span class="d">{recuento.hecho}</span> dominados</dd></div>
          <div><dt>{vocab.recuento[0]}</dt><dd><span>{recuento.abierta}</span> {vocab.recuento[1]}, <span class="c">{recuento.atacando}</span> {vocab.recuento[2]}, <span class="r">{recuento.resuelta}</span> {vocab.recuento[3]}</dd></div>
        </dl>
      {/if}
      {#if estadoTexto}<p class="estado" class:error={idea.estado === 'error'}>{estadoTexto}</p>{/if}
      {#if idea.estado === 'error' || idea.estado === 'detenida' || (!enProceso && !mapa && datos && idea.estado !== 'pausada')}
        <button class="boton" disabled={enviando} onclick={() => germinar()}>Retomar la germinación</button>
      {/if}
    </header>

    <nav class="acciones">
      <button class="boton discreto" onclick={alVerManuscrito}>Manuscrito</button>
      {#if mapa?.resumen}<button class="boton discreto" onclick={() => (viendoVision = true)}>Visión del camino</button>{/if}
      {#if mapa?.fase === 'mapa'}
        <button class="boton" disabled={enProceso} onclick={() => (redactando = !redactando)}>
          Comunicar avances{#if cambios.length}<span class="cuenta">{cambios.length}</span>{/if}
        </button>
      {/if}
      {#if mapa?.fase === 'mapa'}
        <button class="boton discreto" aria-expanded={exportando} onclick={() => (exportando = !exportando)}>Exportar</button>
      {/if}
      {#if enProceso}<button class="boton discreto" onclick={() => (vivoAbierto = !vivoAbierto)}>{vivoAbierto ? 'Ocultar' : 'Ver'} la sesión</button>{/if}
    </nav>

    {#if mapa?.fase === 'mapa'}
      <ul class="leyenda" aria-label="Leyenda">
        <li><span class="l-estudio"></span>Tronco: {vocab.estudio.toLowerCase()}</li>
        <li><span class="l-incognita"></span>Hoja: {vocab.hoja.toLowerCase()}</li>
        <li><span class="l-abierto"></span>Fruto: {vocab.fruto.toLowerCase()}</li>
        <li><span class="l-raiz"></span>Raíces: el manuscrito</li>
        <li class="pista">Arrastra para moverte, usa la rueda para ampliar y haz doble clic para encajar</li>
      </ul>
    {/if}

    {#if exportando}
      <div class="exportador" transition:fly={{ y: -12, duration: 280, easing: cubicOut }}>
        <p>Un solo archivo con el árbol completo, los documentos de cada nodo, la Visión del camino, tu idea, el dictamen y todos los recursos descargados. Al abrirlo se abre en el navegador, solo para leer: sin sesiones ni estados.</p>
        <div class="pie">
          {#each ['linux', 'windows'] as so (so)}
            <button class="boton" disabled={compilando !== null} onclick={() => exportar(so)}>
              {compilando === so ? `Generando para ${NOMBRE_SO[so]}…` : `Para ${NOMBRE_SO[so]}`}
            </button>
          {/each}
        </div>
        <p class="nota">En Linux, antes de abrirlo dale permiso de ejecución: clic derecho, Propiedades, «Es ejecutable».</p>
      </div>
    {/if}

    {#if redactando}
      <div class="redactor" transition:fly={{ y: -12, duration: 280, easing: cubicOut }}>
        {#if cambios.length}
          <p>La sesión recibirá tus avances en:</p>
          <ul>{#each cambios as n (n.id)}<li>{n.titulo}</li>{/each}</ul>
        {:else}
          <p>No has marcado avances nuevos. Puedes pedir cambios igualmente.</p>
        {/if}
        <textarea bind:value={peticion} rows="4" placeholder="Pide lo que necesites: profundizar en una incógnita, otra ruta, más ejercicios, recursos más asequibles…"></textarea>
        <div class="pie">
          <button class="boton discreto" onclick={() => (redactando = false)}>Cancelar</button>
          <button class="boton primario" disabled={enviando || (!peticion.trim() && !cambios.length)} onclick={enviarAvances}>Enviar a la sesión</button>
        </div>
      </div>
    {/if}

    {#if enProceso && vivoAbierto}
      <aside class="vivo" transition:fly={{ x: 40, duration: 350, easing: cubicOut }}>
        <EnVivo {ref} etiqueta="Germinando en directo" />
      </aside>
    {/if}
  </div>

  {#if diagnosticando && mapa?.diagnostico}
    <div class="diagnostico">
      <Cuestionario diagnostico={mapa.diagnostico} respuestas={progreso?.respuestas ?? {}} {base}
        alGuardar={guardarRespuestas} alEnviar={enviarRespuestas} />
    </div>
  {/if}
</section>

{#if laminaAbierta && lamina}
  {#key lamina.nodo.id}
    <LaminaNodo nodo={mapa?.nodos.find((n) => n.id === lamina.nodo.id) ?? lamina.nodo} desde={lamina.desde} {mapa} {progreso} {ref} {base} {glosas} bloqueado={enProceso}
      alCerrar={cerrarLamina} alIrA={irANodo} alCambiar={cargar} />
  {/key}
{/if}

{#if viendoVision}
  <button class="velo" aria-label="Cerrar" onclick={() => (viendoVision = false)} transition:fade={{ duration: 200 }}></button>
  <aside class="vision" transition:fly={{ x: -60, duration: 380, easing: cubicOut, opacity: 0 }}>
    <header><h2>Visión del camino</h2><button class="cerrar" onclick={() => (viendoVision = false)} aria-label="Cerrar">×</button></header>
    <div class="manuscrito">{@html renderizar(mapa.resumen, base)}</div>
  </aside>
{/if}

<style>
  .germinacion {
    position: relative;
    margin: -0.5rem -2rem 0;
  }
  .escenario {
    position: relative;
    height: calc(100vh - 4.2rem);
    min-height: 560px;
    overflow: hidden;
    background:
      radial-gradient(60% 50% at 50% 100%, rgb(111 227 165 / 0.07), transparent 70%),
      radial-gradient(40% 40% at 50% 30%, rgb(179 156 255 / 0.04), transparent 70%);
  }
  .capa {
    position: absolute;
    inset: 0;
  }
  .cabecera {
    position: absolute;
    top: 1.2rem;
    left: 2rem;
    max-width: min(34rem, 45vw);
    pointer-events: none;
  }
  .cabecera > :global(*) {
    pointer-events: auto;
  }
  .migas {
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
  h1 {
    margin: 0.3rem 0 0.4rem;
    font-family: var(--serif);
    font-weight: 400;
    font-size: var(--t4);
    line-height: 1.05;
    text-shadow: 0 2px 20px var(--humus);
  }
  .fase {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    color: var(--aceptada);
  }
  .luz {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 50%;
    background: var(--aceptada);
  }
  .luz.viva {
    background: var(--proceso);
    animation: latir 1.4s ease-in-out infinite;
  }
  @keyframes latir {
    50% {
      opacity: 0.35;
      transform: scale(1.4);
    }
  }
  .recuento {
    display: grid;
    gap: 0.15rem;
    margin: 0.6rem 0 0;
    font-size: var(--t-1);
    color: var(--liquen-tenue);
  }
  .recuento div {
    display: flex;
    gap: 0.5rem;
  }
  .recuento dt {
    min-width: 5.5rem;
    color: var(--liquen-apagado);
  }
  .recuento dd {
    margin: 0;
  }
  .recuento span {
    font-weight: 700;
    color: var(--liquen);
  }
  .recuento .c {
    color: var(--proceso);
  }
  .recuento .d {
    color: var(--aceptada);
  }
  .recuento .r {
    color: var(--pausada);
  }
  .estado {
    margin: 0.5rem 0 0.8rem;
    color: var(--liquen-tenue);
  }
  .estado.error {
    color: var(--rechazada);
  }
  .acciones {
    position: absolute;
    top: 1.2rem;
    right: 2rem;
    display: flex;
    gap: 0.5rem;
    z-index: 3;
  }
  .con-vivo .acciones {
    right: calc(min(34rem, 38vw) + 3rem);
  }
  .cuenta {
    display: inline-grid;
    place-items: center;
    min-width: 1.3rem;
    height: 1.3rem;
    padding: 0 0.3rem;
    border-radius: 999px;
    background: var(--proceso);
    color: var(--humus);
    font-size: 0.72rem;
    font-weight: 700;
  }
  .leyenda {
    position: absolute;
    left: 2rem;
    bottom: 1.2rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1.2rem;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: var(--t-1);
    color: var(--liquen-tenue);
    pointer-events: none;
  }
  .leyenda li {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }
  .leyenda .pista {
    color: var(--liquen-apagado);
  }
  .leyenda span {
    display: inline-block;
    width: 0.8rem;
    height: 0.8rem;
  }
  .l-estudio {
    border: 2px solid #6b8f7a;
    border-radius: 50%;
  }
  .l-incognita {
    border: 1.5px solid var(--aclaracion);
    border-radius: 0 70% 0 70%;
    background: rgb(179 156 255 / 0.16);
  }
  .l-abierto {
    border: 1.5px solid #e88fb4;
    border-radius: 50%;
    background: rgb(232 143 180 / 0.2);
  }
  .l-raiz {
    border-bottom: 2px solid #8a6a3d;
    border-left: 2px solid #8a6a3d;
    border-radius: 0 0 0 70%;
  }
  .exportador {
    position: absolute;
    top: 4.6rem;
    right: 2rem;
    z-index: 4;
    width: min(26rem, 90vw);
    padding: 1rem 1.2rem;
    border: 1px solid var(--linea-viva);
    border-radius: var(--radio-s);
    background: var(--superficie);
  }
  .exportador p {
    margin: 0 0 0.8rem;
    color: var(--liquen-tenue);
    font-size: var(--t-1);
  }
  .exportador .pie {
    justify-content: flex-start;
  }
  .exportador .nota {
    margin: 0.8rem 0 0;
    color: var(--liquen-apagado);
  }
  .redactor {
    position: absolute;
    top: 4.2rem;
    right: 2rem;
    z-index: 4;
    width: min(30rem, 90vw);
    padding: 1rem 1.1rem;
    border: 1px solid var(--linea-viva);
    border-radius: var(--radio-m);
    background: rgb(19 31 28 / 0.96);
    backdrop-filter: blur(12px);
    box-shadow: 0 20px 60px -20px rgb(0 0 0 / 0.8);
  }
  .redactor p {
    margin: 0 0 0.4rem;
    color: var(--liquen-tenue);
    font-size: var(--t-1);
  }
  .redactor ul {
    margin: 0 0 0.8rem;
    padding-left: 1.1rem;
    font-family: var(--serif);
  }
  .redactor textarea {
    width: 100%;
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--linea);
    border-radius: 8px;
    background: var(--humus-hondo);
    color: var(--liquen);
    font: inherit;
    resize: vertical;
  }
  .pie {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.7rem;
  }
  .vivo {
    position: absolute;
    top: 1rem;
    right: 1.5rem;
    bottom: 1rem;
    z-index: 3;
    width: min(34rem, 38vw);
    overflow: hidden;
  }
  .vivo :global(.envivo) {
    margin: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: rgb(7 13 12 / 0.92);
    backdrop-filter: blur(8px);
  }
  .vivo :global(.flujo) {
    max-height: none;
    flex: 1;
  }
  /* Plántula. */
  .plantula {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    justify-items: center;
    transition: opacity 0.6s, filter 0.6s;
  }
  .plantula.atenuada {
    opacity: 0.18;
    filter: blur(2px);
  }
  .con-vivo .plantula {
    padding-right: min(34rem, 38vw);
  }
  .plantula svg {
    width: min(24rem, 60vw);
    overflow: visible;
  }
  .tierra {
    fill: rgb(111 227 165 / 0.08);
  }
  .tallo {
    fill: none;
    stroke: #6fe3a5;
    stroke-width: 3.5;
    stroke-linecap: round;
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    animation: crecer 2.6s var(--curva) forwards 0.4s;
  }
  .cotiledon {
    fill: rgb(111 227 165 / 0.18);
    stroke: #6fe3a5;
    stroke-width: 1.5;
    transform-box: fill-box;
    animation: desplegar 1.2s var(--curva-muelle) both, mecer 5s ease-in-out infinite 2.6s;
  }
  .cotiledon.izq {
    transform-origin: 100% 80%;
    animation-delay: 1.6s, 3s;
  }
  .cotiledon.der {
    transform-origin: 0% 80%;
    animation-delay: 2.2s, 3.4s;
  }
  .grano {
    fill: #8a6a3d;
    stroke: #f0b45a;
    stroke-width: 1.5;
  }
  .plantula:not(.quieta) .grano {
    animation: respirar 2.4s ease-in-out infinite;
  }
  @keyframes crecer {
    to {
      stroke-dashoffset: 0;
    }
  }
  @keyframes desplegar {
    from {
      opacity: 0;
      scale: 0;
    }
  }
  @keyframes mecer {
    50% {
      rotate: 4deg;
    }
  }
  @keyframes respirar {
    50% {
      filter: drop-shadow(0 0 10px #f0b45a);
    }
  }
  .semilla-texto {
    margin-top: 1rem;
    border: 0;
    background: none;
    color: var(--liquen-tenue);
    font-family: var(--serif);
    font-size: var(--t2);
    cursor: pointer;
  }
  .diagnostico {
    position: absolute;
    inset: 0;
    z-index: 2;
    overflow-y: auto;
    padding: 17rem 2rem 0;
  }
  .velo {
    position: fixed;
    inset: 0;
    z-index: 40;
    border: 0;
    background: rgb(7 13 12 / 0.5);
  }
  .vision {
    position: fixed;
    z-index: 41;
    top: 0;
    left: 0;
    bottom: 0;
    width: min(50rem, 94vw);
    padding: 1.4rem 2rem 3rem;
    overflow-y: auto;
    border-right: 1px solid var(--linea-viva);
    background: var(--humus);
  }
  .vision header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .vision h2 {
    margin: 0;
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
  @media (max-width: 900px) {
    .cabecera {
      max-width: 80vw;
    }
    .acciones {
      top: auto;
      bottom: 3.5rem;
    }
  }
</style>
