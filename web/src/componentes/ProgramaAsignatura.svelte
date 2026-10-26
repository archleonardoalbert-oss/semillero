<script>
  // El programa de una asignatura de curso en la lámina de su nodo: sus conferencias, clases prácticas y
  // demostraciones para valientes, o, mientras se redacta, el plan previsto y en qué punto va.
  let { nodo, estado = null, indice = null, alAbrir, alReintentar = null } = $props();

  const ESTADO = {
    pendiente: 'En espera: se redactará en cuanto haya una sesión libre.',
    redactando: 'Una sesión dedicada está redactando esta asignatura: conferencias, prácticas, escenas y recursos.',
  };
</script>

<section class="programa">
  {#if indice}
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
    {#if estado?.estado === 'error'}
      <p class="aviso error">La redacción falló: {estado.error}</p>
      {#if alReintentar}<button class="boton" onclick={alReintentar}>Volver a redactarla</button>{/if}
    {:else}
      <p class="aviso"><span class="luz" class:viva={estado?.estado === 'redactando'}></span>{ESTADO[estado?.estado] ?? ESTADO.pendiente}</p>
    {/if}
    {#if nodo.plan?.length}
      <ol class="lista prevista">
        {#each nodo.plan as c, k (k)}
          <li><span class="n">{k + 1}</span><span class="t"><strong>{c.titulo}</strong></span></li>
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
  .prevista li {
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
    opacity: 0.55;
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
