<script>
  import { renderizar } from '../lib/render.js';

  // La glosa al margen: cabecera, el arranque de la respuesta y un botón para leerla entera.
  let { glosa, glosas, base, activa = false, alAbrir } = $props();

  const ETIQUETA = { explicar: 'Explicación', corregir: 'Corrección' };
  const VEREDICTO = { acertada: 'Tenías razón', parcial: 'Razón a medias', erronea: 'No era un error' };

  let respuesta = $derived(glosa.mensajes.findLast((m) => m.autor === 'claude')?.contenido ?? '');
  let vivo = $derived(glosa.estado === 'en-proceso' ? glosas.enVivo(glosa.id) : null);
  let preguntas = $derived(glosa.mensajes.filter((m) => m.autor === 'usuario').length);
</script>

<button class="tarjeta {glosa.tipo}" class:activa class:viva={glosa.estado === 'en-proceso'} class:error={glosa.estado === 'error'}
  onclick={alAbrir}>
  <span class="cabeza">
    <span class="tipo">{ETIQUETA[glosa.tipo]}{glosa.profundidad ? ` ${glosa.profundidad}` : ''}</span>
    {#if glosa.correccion}<span class="veredicto {glosa.correccion}">{VEREDICTO[glosa.correccion]}</span>{/if}
    {#if glosa.enmendado}<span class="enmienda">enmendado</span>{/if}
    {#if preguntas > 1}<span class="n">{preguntas} preguntas</span>{/if}
  </span>
  {#if glosa.estado === 'en-proceso'}
    <span class="pensando">
      <span class="puntos"><i></i><i></i><i></i></span>
      {#if vivo?.texto}Escribiendo…{:else if vivo?.ultimo?.tipo === 'herramienta'}{vivo.ultimo.herramienta === 'WebSearch' ? 'Buscando' : 'Consultando'}…{:else}Pensando…{/if}
    </span>
  {:else if glosa.estado === 'error'}
    <span class="fallo">No se pudo responder: {glosa.error}</span>
  {:else}
    <span class="extracto manuscrito">{@html renderizar(respuesta, base)}</span>
  {/if}
</button>

<style>
  .tarjeta {
    position: relative;
    display: block;
    width: 100%;
    padding: 0.7rem 0.85rem 0.75rem;
    border: 1px solid var(--linea);
    border-left: 2px solid var(--acento);
    border-radius: 3px 10px 10px 3px;
    background: linear-gradient(90deg, color-mix(in srgb, var(--acento) 7%, transparent), transparent 80%), var(--humus);
    text-align: left;
    cursor: pointer;
    transition: border-color 0.25s, transform 0.35s var(--curva), box-shadow 0.25s;
  }
  .explicar {
    --acento: var(--explicar);
  }
  .corregir {
    --acento: var(--corregir);
  }
  .tarjeta:hover,
  .tarjeta.activa {
    border-color: color-mix(in srgb, var(--acento) 45%, var(--linea));
    transform: translateX(-3px);
    box-shadow: 0 10px 30px -14px rgb(0 0 0 / 0.8);
  }
  .cabeza {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.35rem 0.6rem;
    font-family: var(--sans);
    font-size: 0.72rem;
  }
  .tipo {
    font-weight: 600;
    color: var(--acento);
  }
  .veredicto,
  .enmienda,
  .n {
    color: var(--liquen-tenue);
  }
  .veredicto.acertada {
    color: var(--aceptada);
  }
  .veredicto.parcial {
    color: var(--cambios);
  }
  .veredicto.erronea {
    color: var(--rechazada);
  }
  .extracto {
    display: block;
    max-height: 9.5rem;
    margin-top: 0.35rem;
    overflow: hidden;
    font-size: 0.86rem;
    line-height: 1.5;
    mask-image: linear-gradient(#000 60%, transparent);
  }
  .extracto :global(:is(h1, h2, h3)) {
    font-size: 0.95rem;
    margin: 0.4rem 0 0.2rem;
  }
  .extracto :global(.katex-display) {
    margin: 0.4rem 0;
  }
  .pensando,
  .fallo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.4rem;
    font-family: var(--sans);
    font-size: 0.8rem;
    color: var(--liquen-tenue);
  }
  .fallo {
    color: var(--rechazada);
  }
  .puntos {
    display: inline-flex;
    gap: 3px;
  }
  .puntos i {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--acento);
    animation: brillo 1.2s ease-in-out infinite;
  }
  .puntos i:nth-child(2) {
    animation-delay: 0.15s;
  }
  .puntos i:nth-child(3) {
    animation-delay: 0.3s;
  }
  @keyframes brillo {
    50% {
      opacity: 0.2;
      transform: translateY(-2px);
    }
  }
</style>
