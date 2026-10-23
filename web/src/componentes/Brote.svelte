<script>
  // La señal que aparece al pie de una idea aceptada: invitación a germinarla.
  import { ETIQUETA_ESTADO } from '../lib/estados.js';

  // `veredicto` distinto de aceptada: la señal avisa y el botón abre «Antes de germinar».
  let { alPulsar, ocupado = false, veredicto = 'aceptada', etiqueta = null } = $props();
  let aceptada = $derived(veredicto === 'aceptada');
</script>

<section class="brote">
  <svg viewBox="-40 -70 80 90" aria-hidden="true">
    <path d="M0 10 C 1 -10, -2 -30, 0 -52" class="tallo" pathLength="1" />
    <path d="M0 -36 C -12 -46, -26 -42, -30 -32 C -18 -28, -8 -30, 0 -36 Z" class="hoja izq" />
    <path d="M0 -52 C 11 -63, 26 -61, 30 -50 C 18 -45, 8 -46, 0 -52 Z" class="hoja der" />
    <path d="M0 2 C 8 4, 11 12, 0 20 C -11 12, -8 4, 0 2 Z" class="grano" />
  </svg>
  <div class="texto">
    <h3>{aceptada ? 'Esta idea merece crecer' : 'Puedes germinarla igualmente'}</h3>
    {#if !aceptada}
      <p class="matiz">
        Claude no la aceptó tal cual (<strong>{ETIQUETA_ESTADO[veredicto]}</strong>{etiqueta ? `: ${etiqueta}` : ''}). Antes de
        germinar te propondrá una última vez ajustarla o elegir uno de sus caminos.
      </p>
    {/if}
    <p>
      Al germinarla, la sesión te hará unas preguntas para saber de dónde partes. Después investigará a fondo y te
      trazará un mapa: qué estudiar y en qué orden, a qué incógnitas te enfrentas (algunas pueden ser problemas
      abiertos) y con qué libros y artículos, descargados cuando sean de libre acceso.
    </p>
    <button class="boton primario" disabled={ocupado} onclick={alPulsar}>Comenzar germinación</button>
  </div>
</section>

<style>
  .brote {
    position: relative;
    display: grid;
    grid-template-columns: 7rem 1fr;
    gap: 1.6rem;
    align-items: center;
    margin: 3.5rem 0 0 2.2rem;
    padding: 1.8rem 2rem;
    border: 1px solid rgb(111 227 165 / 0.3);
    border-radius: var(--radio-m);
    background:
      radial-gradient(90% 140% at 0% 100%, rgb(111 227 165 / 0.12), transparent 60%),
      var(--humus-hondo);
    overflow: hidden;
  }
  svg {
    width: 7rem;
    overflow: visible;
  }
  .tallo {
    fill: none;
    stroke: var(--aceptada);
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    animation: crecer 1.6s var(--curva) forwards 0.3s;
  }
  .hoja {
    fill: rgb(111 227 165 / 0.2);
    stroke: var(--aceptada);
    stroke-width: 1.2;
    transform-box: fill-box;
    animation: abrir 900ms var(--curva-muelle) both, mecer 4.5s ease-in-out infinite 2s;
  }
  .hoja.izq {
    transform-origin: 100% 80%;
    animation-delay: 1.1s, 2s;
  }
  .hoja.der {
    transform-origin: 0% 80%;
    animation-delay: 1.5s, 2.4s;
  }
  .grano {
    fill: #8a6a3d;
    stroke: var(--claude);
    stroke-width: 1.2;
  }
  @keyframes crecer {
    to {
      stroke-dashoffset: 0;
    }
  }
  @keyframes abrir {
    from {
      opacity: 0;
      scale: 0;
    }
  }
  @keyframes mecer {
    50% {
      rotate: 5deg;
    }
  }
  h3 {
    margin: 0 0 0.4rem;
    font-family: var(--serif);
    font-weight: 400;
    font-size: var(--t3);
    color: var(--aceptada);
  }
  .matiz {
    color: var(--liquen);
  }
  .matiz strong {
    color: var(--no-recomendada);
  }
  p {
    margin: 0 0 1.1rem;
    max-width: 52rem;
    color: var(--liquen-tenue);
    line-height: 1.6;
  }
  @media (max-width: 640px) {
    .brote {
      grid-template-columns: 1fr;
      margin-left: 0;
    }
  }
</style>
