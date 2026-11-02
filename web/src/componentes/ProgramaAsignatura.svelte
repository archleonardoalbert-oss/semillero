<script>
  import SesionEnVivo from './SesionEnVivo.svelte';
  // El programa de una asignatura de curso en la lámina de su nodo: sus conferencias, clases prácticas y
  // demostraciones para valientes o, mientras no está redactada, su estado y su mando (comenzar, pausar, continuar).
  // `alAccion(accion)` con 'comenzar' | 'pausar' | 'continuar' | 'estetica'; sin ella (visor exportado) no hay mandos.
  // `actividad`: lo que hace ahora la sesión que la redacta (solo mientras está en marcha).
  // `borradores`: lo ya escrito de una asignatura sin terminar ({ archivo, clase, documento }); `alAbrirBorrador(archivo)`.
  // `alEntrar`: abre la web propia de la asignatura (índice versión 2) por su portada.
  let { nodo, estado = null, indice = null, actividad = null, borradores = [], alAbrir, alAccion = null, alAbrirBorrador = null, alEntrar = null } = $props();

  // Cada conferencia del plan con su borrador (c01-…, c02-… en el orden del plan) y en qué punto está.
  let enCurso = $derived(estado?.estado === 'redactando' ? actividad?.documentoActual : null);
  let prevista = $derived((nodo.plan ?? []).map((c, k) => {
    const prefijo = `c${String(k + 1).padStart(2, '0')}`;
    const b = borradores.find((x) => x.clase === 'conferencia' && x.archivo.startsWith(prefijo));
    return { ...c, k, borrador: b ?? null, fase: b && b.archivo === enCurso ? 'escribiendo' : b ? 'escrita' : 'pendiente' };
  }));
  // Lo escrito que no es una conferencia del plan: prácticas, demostraciones o conferencias añadidas.
  let otros = $derived(borradores.filter((b) => !prevista.some((c) => c.borrador?.archivo === b.archivo)));
  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
  const NOMBRE = { conferencia: 'Conferencia', practica: 'Clase práctica', valiente: 'Demostración para valientes' };
  const legible = (archivo) => archivo.replace(/\.md$/, '').replace(/^[cpv]\d+-?/, '').replace(/-/g, ' ');
  const cifra = (n) => (n >= 1e6 ? `${(n / 1e6).toLocaleString('es', { maximumFractionDigits: 1 })} M` : n >= 1e3 ? `${Math.round(n / 1e3).toLocaleString('es')} k` : String(n ?? 0));

  const MANDO = {
    sin: { texto: 'Todavía sin redactar.', accion: 'comenzar', boton: 'Redactar esta asignatura' },
    pendiente: { texto: 'En espera de turno: se redactará en cuanto haya una sesión libre.', accion: 'pausar', boton: 'Pausar esta asignatura' },
    redactando: { texto: 'Una sesión dedicada está redactando esta asignatura: conferencias, prácticas, escenas y recursos.', accion: 'pausar', boton: 'Pausar esta asignatura', viva: true },
    pausada: { texto: 'En pausa. Lo escrito está guardado y la sesión seguirá exactamente donde estaba.', accion: 'continuar', boton: 'Continuar esta asignatura', primario: true },
    error: { accion: 'comenzar', boton: 'Volver a redactarla' },
  };
  let mando = $derived(
    estado?.estetica && ['pendiente', 'redactando'].includes(estado.estado)
      ? { ...MANDO[estado.estado], texto: estado.estado === 'pendiente' ? 'En espera de turno para rediseñar su estética.' : 'Su sesión está rediseñando la estética de la web: tema claro y oscuro, fondo, transiciones y acabados. El contenido no cambia.' }
      : (MANDO[estado?.estado] ?? MANDO.sin),
  );
  let mejorando = $state(false);
  async function mejorarEstetica() {
    mejorando = true;
    try {
      await alAccion('estetica');
    } finally {
      mejorando = false;
    }
  }
  let enviando = $state(false);
  async function pulsar() {
    enviando = true;
    try {
      await alAccion(mando.accion);
    } finally {
      enviando = false;
    }
  }
</script>

<section class="programa">
  {#if indice}
    {#if indice.version === 2 && alEntrar}
      <button class="entrar" onclick={alEntrar}>
        <span class="t-entrar">Entrar en el curso</span>
        <span class="s-entrar">Una web hecha solo para «{nodo.titulo}»: {plural(indice.conferencias.length, 'conferencia', 'conferencias')}{indice.practicas.length ? `, ${plural(indice.practicas.length, 'clase práctica', 'clases prácticas')}` : ''}{indice.valientes.length ? ` y ${plural(indice.valientes.length, 'demostración para valientes', 'demostraciones para valientes')}` : ''}</span>
      </button>
    {/if}
    {#if indice.version === 2 && alAccion && estado?.estado === 'lista'}
      <div class="estetica">
        <button class="boton discreto" disabled={mejorando} onclick={mejorarEstetica}>Mejorar la estética</button>
        <span>Su misma sesión rediseña lo visual (tema claro y oscuro, fondo vivo, transiciones) sin tocar el contenido.</span>
      </div>
      {#if estado.errorEstetica}<p class="error-estetica">El último rediseño no pasó la revisión y se conservó la web anterior: {estado.errorEstetica}</p>{/if}
    {/if}
    {#if estado?.tokens}<p class="consumo">Redactarla consumió {cifra(estado.tokens.generados)} tokens generados y {cifra(estado.tokens.leidos)} leídos.</p>{/if}
    <h2>Conferencias</h2>
    <ol class="lista">
      {#each indice.conferencias as c, k (c.id)}
        <li>
          <button onclick={() => alAbrir(c.id)}>
            <span class="n">{k + 1}</span>
            <span class="t"><strong>{c.titulo}</strong>{#if c.resumen}<small>{c.resumen}</small>{/if}</span>
          </button>
        </li>
      {/each}
    </ol>
    {#if indice.practicas.length}
      <h2>Clases prácticas</h2>
      <ol class="lista practicas">
        {#each indice.practicas as p, k (p.id)}
          <li><button onclick={() => alAbrir(p.id)}><span class="n">P{k + 1}</span><span class="t"><strong>{p.titulo}</strong></span></button></li>
        {/each}
      </ol>
    {/if}
    {#if indice.valientes.length}
      <h2>Demostraciones para valientes</h2>
      <ol class="lista valientes">
        {#each indice.valientes as v (v.id)}
          <li><button onclick={() => alAbrir(v.id)}><span class="n">⚔</span><span class="t"><strong>{v.titulo}</strong></span></button></li>
        {/each}
      </ol>
    {/if}
  {:else}
    <h2>Programa previsto</h2>
    <div class="mando">
      {#if estado?.estado === 'error'}
        <p class="aviso error">La redacción falló: {estado.error}</p>
      {:else}
        <p class="aviso"><span class="luz" class:viva={mando.viva}></span>{mando.texto}</p>
      {/if}
      {#if alAccion}
        <button class="boton" class:primario={mando.primario} disabled={enviando} onclick={pulsar}>{enviando ? 'Un momento…' : mando.boton}</button>
      {/if}
    </div>
    {#if actividad}
      <div class="en-vivo"><SesionEnVivo {actividad} /></div>
    {:else if estado?.tokens}
      <p class="consumo">Lleva consumidos {cifra(estado.tokens.generados)} tokens generados y {cifra(estado.tokens.leidos)} leídos.</p>
    {/if}
    {#if prevista.length}
      <ol class="lista prevista">
        {#each prevista as c (c.k)}
          <li class={c.fase}>
            {#if c.fase === 'escrita' && alAbrirBorrador}
              <button onclick={() => alAbrirBorrador(c.borrador.archivo)}>
                <span class="n">{c.k + 1}</span><span class="t"><strong>{c.titulo}</strong><small>Escrita: ábrela para leerla</small></span>
              </button>
            {:else}
              <div class="hueco">
                <span class="n">{c.k + 1}</span>
                <span class="t"><strong>{c.titulo}</strong>{#if c.fase === 'escribiendo'}<small>Escribiéndose ahora</small>{/if}</span>
              </div>
            {/if}
          </li>
        {/each}
      </ol>
    {/if}
    {#if otros.length}
      <h2>También escrito</h2>
      <ol class="lista prevista">
        {#each otros as b (b.archivo)}
          <li class={b.archivo === enCurso ? 'escribiendo' : 'escrita'}>
            {#if b.archivo !== enCurso && alAbrirBorrador}
              <button onclick={() => alAbrirBorrador(b.archivo)}><span class="t"><strong>{legible(b.archivo)}</strong><small>{NOMBRE[b.clase]}</small></span></button>
            {:else}
              <div class="hueco"><span class="t"><strong>{legible(b.archivo)}</strong><small>{NOMBRE[b.clase]}, escribiéndose ahora</small></span></div>
            {/if}
          </li>
        {/each}
      </ol>
    {/if}
  {/if}
</section>

<style>
  .programa {
    max-width: 60rem;
    margin: 0 0 3rem;
  }
  h2 {
    margin: 1.6rem 0 0.7rem;
    font-family: var(--serif);
    font-weight: 500;
    font-size: var(--t2);
  }
  h2:first-child {
    margin-top: 0;
  }
  .lista {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
    gap: 0.6rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .lista button,
  .prevista .hueco {
    display: flex;
    align-items: flex-start;
    gap: 0.8rem;
    width: 100%;
    height: 100%;
    padding: 0.8rem 1rem;
    border: 1px solid var(--linea);
    border-radius: var(--radio-s);
    background: var(--humus-hondo);
    color: var(--liquen);
    text-align: left;
  }
  .lista button {
    cursor: pointer;
    transition: border-color 0.2s, transform 0.2s;
  }
  .lista button:hover {
    border-color: var(--acento, var(--aceptada));
  }
  .n {
    flex: 0 0 auto;
    min-width: 1.8rem;
    font-family: var(--serif);
    font-size: var(--t2);
    line-height: 1;
    color: var(--acento, var(--aceptada));
    font-variant-numeric: oldstyle-nums;
  }
  .practicas .n {
    color: var(--cambios);
    font-size: var(--t1);
  }
  .valientes .n {
    color: var(--rechazada);
  }
  .t {
    display: grid;
    gap: 0.2rem;
  }
  .t strong {
    font-family: var(--serif);
    font-weight: 500;
    font-size: 1.05rem;
    line-height: 1.3;
  }
  .t small {
    color: var(--liquen-tenue);
    font-size: var(--t-1);
  }
  .prevista li {
    list-style: none;
  }
  .prevista .pendiente .hueco {
    opacity: 0.5;
  }
  /* La conferencia que se está escribiendo late; las ya escritas se abren como cualquier otra. */
  .prevista .escribiendo .hueco {
    border-color: var(--proceso);
    box-shadow: 0 0 0 1px var(--proceso), 0 0 18px rgb(94 224 224 / 0.25);
    animation: escribiendo 2s ease-in-out infinite;
  }
  .prevista .escribiendo small {
    color: var(--proceso);
  }
  .prevista .escrita small {
    color: var(--aceptada);
  }
  @keyframes escribiendo {
    50% {
      box-shadow: 0 0 0 1px var(--proceso), 0 0 4px rgb(94 224 224 / 0.1);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .prevista .escribiendo .hueco {
      animation: none;
    }
  }
  .entrar {
    display: grid;
    gap: 0.25rem;
    width: 100%;
    max-width: 44rem;
    margin: 0 0 1.6rem;
    padding: 1.1rem 1.4rem;
    border: 1px solid var(--aceptada);
    border-radius: var(--radio-s);
    background: linear-gradient(120deg, rgb(111 227 165 / 0.12), transparent 70%), var(--humus-hondo);
    color: var(--liquen);
    text-align: left;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .entrar:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 24px rgb(111 227 165 / 0.15);
  }
  .t-entrar {
    font-family: var(--serif);
    font-size: var(--t3);
  }
  .s-entrar {
    color: var(--liquen-tenue);
    font-size: var(--t-1);
  }
  .en-vivo {
    margin: 0 0 1.4rem;
  }
  .estetica {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 0.9rem;
    margin: -0.6rem 0 1.2rem;
    color: var(--liquen-apagado);
    font-size: var(--t-1);
  }
  .error-estetica {
    margin: -0.4rem 0 1.2rem;
    color: var(--rechazada, #e88);
    font-size: var(--t-1);
  }
  .consumo {
    margin: 0 0 1rem;
    color: var(--liquen-apagado);
    font-size: var(--t-1);
  }
  .mando {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem 1.2rem;
    margin: 0 0 1rem;
  }
  .mando .aviso {
    margin: 0;
  }
  .aviso {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin: 0 0 1rem;
    color: var(--liquen-tenue);
  }
  .aviso.error {
    color: var(--rechazada);
  }
  .luz {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 50%;
    background: var(--liquen-apagado);
  }
  .luz.viva {
    background: var(--proceso);
    box-shadow: 0 0 10px var(--proceso);
    animation: latir 1.6s ease-in-out infinite;
  }
  @keyframes latir {
    50% {
      opacity: 0.4;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .luz.viva {
      animation: none;
    }
  }
</style>
