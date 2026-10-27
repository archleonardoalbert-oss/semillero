<script>
  import { onDestroy } from 'svelte';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  // Lo que está haciendo ahora mismo la sesión que redacta una asignatura: la acción actual, las anteriores y
  // sus tokens. Llega resumido del servidor (sin el pensamiento de la sesión).
  let { actividad } = $props();

  let ahora = $state(Date.now());
  const reloj = setInterval(() => (ahora = Date.now()), 1000);
  onDestroy(() => clearInterval(reloj));

  const hace = (iso) => {
    const s = Math.max(0, Math.round((ahora - Date.parse(iso)) / 1000));
    if (s < 60) return `hace ${s} s`;
    if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
    return `hace ${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
  };
  const durante = (iso) => hace(iso).replace(/^hace /, '');
  const cifra = (n) =>
    n >= 1e6 ? `${(n / 1e6).toLocaleString('es', { maximumFractionDigits: 1 })} M`
      : n >= 1e3 ? `${Math.round(n / 1e3).toLocaleString('es')} k`
        : String(n);
</script>

<section class="vivo" aria-live="polite">
  <header>
    <span class="luz"></span>
    <span>Sesión en marcha desde hace {durante(actividad.inicio)}</span>
  </header>

  {#key actividad.accion.texto}
    <p class="ahora" in:fly={{ y: 8, duration: 320, easing: cubicOut }}>
      {actividad.accion.texto}<span class="cuando">{hace(actividad.accion.desde)}</span>
    </p>
  {/key}

  {#if actividad.recientes.length > (actividad.recientes[0]?.texto === actividad.accion.texto ? 1 : 0)}
    <ol class="antes">
      {#each actividad.recientes.filter((r, k) => !(k === 0 && r.texto === actividad.accion.texto)).slice(0, 5) as r (r.hora + r.texto)}
        <li><span>{r.texto}</span><span class="cuando">{hace(r.hora)}</span></li>
      {/each}
    </ol>
  {/if}

  <dl class="tokens">
    <div><dt>generados</dt><dd>{cifra(actividad.tokens.generados)}</dd></div>
    <div><dt>leídos</dt><dd>{cifra(actividad.tokens.leidos)}</dd></div>
    {#if actividad.tokens.contexto}<div><dt>de contexto</dt><dd>{cifra(actividad.tokens.contexto)}</dd></div>{/if}
  </dl>
</section>

<style>
  .vivo {
    max-width: 44rem;
    padding: 1rem 1.3rem 1.1rem;
    border: 1px solid var(--linea);
    border-left: 3px solid var(--proceso);
    border-radius: 3px var(--radio-s) var(--radio-s) 3px;
    background: linear-gradient(90deg, rgb(94 224 224 / 0.05), transparent 60%), var(--humus-hondo);
  }
  header {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    color: var(--liquen-tenue);
    font-size: var(--t-1);
  }
  .luz {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--proceso);
    box-shadow: 0 0 10px var(--proceso);
    animation: latir 1.6s ease-in-out infinite;
  }
  @keyframes latir {
    50% {
      opacity: 0.35;
    }
  }
  .ahora {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    margin: 0.55rem 0 0.2rem;
    font-family: var(--serif);
    font-size: var(--t2);
    line-height: 1.25;
    color: var(--liquen);
  }
  .cuando {
    flex: 0 0 auto;
    font-family: var(--sans);
    font-size: 0.78rem;
    color: var(--liquen-apagado);
    font-variant-numeric: tabular-nums;
  }
  .antes {
    margin: 0.6rem 0 0;
    padding: 0.5rem 0 0;
    list-style: none;
    border-top: 1px solid var(--linea);
  }
  .antes li {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.2rem 0;
    color: var(--liquen-tenue);
    font-size: 0.9rem;
  }
  .antes li:nth-child(n + 3) {
    opacity: 0.7;
  }
  .antes li:nth-child(n + 5) {
    opacity: 0.45;
  }
  .tokens {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1.8rem;
    margin: 0.9rem 0 0;
  }
  .tokens div {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
  }
  .tokens dd {
    order: -1;
    margin: 0;
    font-family: var(--serif);
    font-size: var(--t1);
    color: var(--liquen);
    font-variant-numeric: tabular-nums;
  }
  .tokens dt {
    color: var(--liquen-apagado);
    font-size: var(--t-1);
  }
  @media (prefers-reduced-motion: reduce) {
    .luz {
      animation: none;
    }
  }
</style>
