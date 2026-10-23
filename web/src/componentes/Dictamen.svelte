<script>
  import { renderizar } from '../lib/render.js';
  import { COLOR_ESTADO } from '../lib/estados.js';

  let { mensaje, base, fecha } = $props();

  const SELLO = { aceptada: 'Aceptada', cambios: 'Cambio sugerido', rechazada: 'Rechazada', aclaracion: 'Necesita aclaración' };
  const ETAPA = { 1: 'Etapa 1: filtro', 2: 'Etapa 2: investigación profunda' };
  let meta = $derived(mensaje.meta);
  let html = $derived(renderizar(mensaje.contenido, base));
</script>

<article class="dictamen" style:--sello={COLOR_ESTADO[meta?.veredicto] ?? 'var(--claude)'}>
  <header>
    <div class="firma">
      <h3>Dictamen de Claude</h3>
      <p>{meta ? ETAPA[meta.etapa] : 'Sin veredicto legible'}{fecha ? `, ${fecha}` : ''}</p>
    </div>
    {#if meta}
      <div class="sello" aria-label="Veredicto: {SELLO[meta.veredicto]}">{SELLO[meta.veredicto]}</div>
    {/if}
  </header>
  {#if meta?.resumen}
    <p class="resumen">{meta.resumen}</p>
  {/if}
  <div class="manuscrito">{@html html}</div>
</article>

<style>
  .dictamen {
    position: relative;
    margin: 3rem 0 3rem 2.2rem;
    padding: 2rem 2.2rem 1.4rem;
    background: linear-gradient(180deg, var(--claude-velo), transparent 70%);
    border: 1px solid rgb(240 180 90 / 0.18);
    border-radius: 2px var(--radio-m) var(--radio-m) var(--radio-m);
  }
  .dictamen::before {
    content: '';
    position: absolute;
    left: -2.2rem;
    top: 2.3rem;
    width: 1.6rem;
    border-top: 1px solid rgb(240 180 90 / 0.4);
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 1rem;
  }
  h3 {
    margin: 0;
    font-family: var(--serif);
    font-weight: 500;
    font-size: var(--t1);
    font-variant: small-caps;
    letter-spacing: 0.08em;
    color: var(--claude);
  }
  .firma p {
    margin: 0.1rem 0 0;
    font-family: var(--serif);
    font-style: italic;
    color: var(--liquen-tenue);
  }
  /* El sello: el único gesto teatral de la página. */
  .sello {
    flex: none;
    padding: 0.35em 0.9em;
    border: 2px solid var(--sello);
    border-radius: 4px;
    color: var(--sello);
    font-family: var(--serif);
    font-weight: 600;
    font-variant: small-caps;
    letter-spacing: 0.12em;
    font-size: var(--t1);
    transform: rotate(-5deg);
    box-shadow: inset 0 0 0 3px rgb(12 21 19), inset 0 0 0 4px color-mix(in srgb, var(--sello) 50%, transparent);
    animation: estampar 700ms var(--curva-muelle) both 200ms;
  }
  @keyframes estampar {
    from {
      opacity: 0;
      transform: rotate(-14deg) scale(1.8);
    }
  }
  .resumen {
    margin: 1.4rem 0 0.6rem;
    font-family: var(--serif);
    font-size: var(--t2);
    font-style: italic;
    line-height: 1.3;
    color: var(--liquen);
  }
  @media (max-width: 640px) {
    .dictamen {
      margin-left: 0;
      padding: 1.4rem 1.1rem 1rem;
    }
    .dictamen::before {
      display: none;
    }
  }
</style>
