<script>
  import { onMount } from 'svelte';
  import { ir, enlace } from '../lib/ruta.svelte.js';
  import { ETIQUETA_ESTADO, COLOR_ESTADO } from '../lib/estados.js';

  let { carpetas = [] } = $props();

  let lienzo;
  let contenedor;
  let ancho = $state(800);
  let alto = $state(480);
  let foco = $state(null); // { tipo: 'idea'|'carpeta', x, y, ... }

  // Pseudoaleatorio estable por id: la red no "salta" entre recargas.
  function semilla(texto) {
    let h = 2166136261;
    for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return () => {
      h = Math.imul(h ^ (h >>> 15), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
  }

  function construirRed(cs, w, h) {
    const nodos = [];
    const hubs = [];
    const hilos = [];
    const n = cs.length;
    const cx = w / 2;
    const cy = h / 2;
    cs.forEach((c, k) => {
      const azar = semilla(c.id);
      const ang = -Math.PI / 2 + (k / Math.max(n, 1)) * Math.PI * 2 + (azar() - 0.5) * 0.4;
      const rx = n === 1 ? 0 : w * 0.34;
      const ry = n === 1 ? 0 : h * 0.3;
      const hub = { carpeta: c, x: cx + Math.cos(ang) * rx, y: cy + Math.sin(ang) * ry, fase: azar() * 6.28 };
      hubs.push(hub);
      const escala = Math.min(1, (Math.min(w, h) / 520) * (n > 4 ? 0.8 : 1));
      c.ideas.forEach((idea, j) => {
        const az = semilla(`${c.id}/${idea.id}`);
        const a = j * 2.39996 + az() * 0.5;
        const d = (34 + 20 * Math.sqrt(j + 1)) * escala;
        const nodo = {
          idea, carpeta: c, hub,
          x: hub.x + Math.cos(a) * d, y: hub.y + Math.sin(a) * d * 0.82,
          fase: az() * 6.28, r: 3.2 + az() * 1.6,
        };
        nodos.push(nodo);
        hilos.push({ a: hub, b: nodo, curva: (az() - 0.5) * 0.6, fase: az(), estado: idea.estado });
      });
    });
    // Cada idea se enlaza con su vecina más cercana del mismo bancal.
    for (const nodo of nodos) {
      let mejor = null;
      let dist = Infinity;
      for (const otro of nodos) {
        if (otro === nodo || otro.carpeta !== nodo.carpeta) continue;
        const d = (otro.x - nodo.x) ** 2 + (otro.y - nodo.y) ** 2;
        if (d < dist) [dist, mejor] = [d, otro];
      }
      if (mejor && nodos.indexOf(mejor) > nodos.indexOf(nodo)) {
        hilos.push({ a: nodo, b: mejor, curva: 0.25, fase: nodo.fase / 6.28, fino: true, estado: nodo.idea.estado });
      }
    }
    // Los bancales se comunican: anillo de filamentos largos entre hubs.
    if (hubs.length > 1) {
      hubs.forEach((hub, k) => {
        const sig = hubs[(k + 1) % hubs.length];
        if (hubs.length === 2 && k === 1) return;
        hilos.push({ a: hub, b: sig, curva: 0.35, fase: hub.fase / 6.28, largo: true });
      });
    }
    return { nodos, hubs, hilos };
  }

  let red = $derived(construirRed(carpetas, ancho, alto));
  // Con movimiento reducido no hay bucle: se redibuja solo cuando cambia la red.
  let redibujar = null;
  $effect(() => {
    red;
    redibujar?.();
  });

  function punto(h, t, desp) {
    const { a, b } = h;
    const ax = a.x + desp.x * (a.hub ? 1 : 0.6);
    const ay = a.y + desp.y * (a.hub ? 1 : 0.6);
    const bx = b.x + desp.x * (b.hub ? 1 : 0.6);
    const by = b.y + desp.y * (b.hub ? 1 : 0.6);
    const mx = (ax + bx) / 2 - (by - ay) * h.curva;
    const my = (ay + by) / 2 + (bx - ax) * h.curva;
    const u = 1 - t;
    return [u * u * ax + 2 * u * t * mx + t * t * bx, u * u * ay + 2 * u * t * my + t * t * by];
  }

  onMount(() => {
    const ctx = lienzo.getContext('2d');
    const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const inicio = performance.now();
    let raton = { x: 0, y: 0 };
    let marco;

    const obs = new ResizeObserver(([e]) => {
      ancho = Math.max(320, e.contentRect.width);
      alto = Math.max(300, e.contentRect.height);
    });
    obs.observe(contenedor);

    function onMove(ev) {
      const r = lienzo.getBoundingClientRect();
      raton = { x: (ev.clientX - r.left) / r.width - 0.5, y: (ev.clientY - r.top) / r.height - 0.5 };
      const px = ev.clientX - r.left;
      const py = ev.clientY - r.top;
      let mejor = null;
      let dist = 16 ** 2;
      for (const n of red.nodos) {
        const d = (n.x - px) ** 2 + (n.y - py) ** 2;
        if (d < dist) [dist, mejor] = [d, n];
      }
      if (mejor) foco = { tipo: 'idea', x: mejor.x, y: mejor.y, nodo: mejor };
      else {
        const hub = red.hubs.find((h) => Math.abs(h.x - px) < 70 && Math.abs(h.y + 2 - py) < 16);
        foco = hub ? { tipo: 'carpeta', x: hub.x, y: hub.y, hub } : null;
      }
    }
    lienzo.addEventListener('pointermove', onMove);
    lienzo.addEventListener('pointerleave', () => (foco = null));

    function dibujar(ahora) {
      const t = (ahora - inicio) / 1000;
      const dpr = devicePixelRatio || 1;
      if (lienzo.width !== Math.round(ancho * dpr)) {
        lienzo.width = Math.round(ancho * dpr);
        lienzo.height = Math.round(alto * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, ancho, alto);
      const brote = quieto ? 1 : Math.min(1, t / 1.8);
      const crecer = 1 - (1 - brote) ** 3;
      const desp = { x: raton.x * -14, y: raton.y * -10 };

      // Filamentos: crecen desde los bancales al entrar y llevan pulsos de savia.
      for (const h of red.hilos) {
        const activo = h.estado === 'en-proceso';
        const pasos = 28;
        const hasta = Math.max(1, Math.round(pasos * crecer));
        ctx.beginPath();
        for (let s = 0; s <= hasta; s++) {
          const [x, y] = punto(h, s / pasos, desp);
          const ond = quieto ? 0 : Math.sin(t * 0.8 + s * 0.5 + h.fase * 6) * 0.6;
          s === 0 ? ctx.moveTo(x, y + ond) : ctx.lineTo(x, y + ond);
        }
        ctx.strokeStyle = activo ? 'rgb(94 224 224 / 0.35)' : h.largo ? 'rgb(147 166 158 / 0.10)' : 'rgb(147 166 158 / 0.16)';
        ctx.lineWidth = h.fino ? 0.6 : h.largo ? 0.8 : 1;
        ctx.stroke();

        if (!quieto && brote === 1) {
          const vel = activo ? 0.45 : 0.06;
          const p = (t * vel + h.fase) % 1;
          const [x, y] = punto(h, p, desp);
          const g = ctx.createRadialGradient(x, y, 0, x, y, activo ? 7 : 4);
          g.addColorStop(0, activo ? 'rgb(94 224 224 / 0.9)' : 'rgb(216 226 220 / 0.35)');
          g.addColorStop(1, 'rgb(0 0 0 / 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, activo ? 7 : 4, 0, 6.29);
          ctx.fill();
        }
      }

      // Semillas: color y pulso según el estado de cada idea.
      for (const n of red.nodos) {
        const aparece = Math.min(1, Math.max(0, (crecer - 0.55) / 0.45));
        if (!aparece) continue;
        const x = n.x + desp.x * 0.6 + (quieto ? 0 : Math.sin(t * 0.6 + n.fase) * 1.2);
        const y = n.y + desp.y * 0.6 + (quieto ? 0 : Math.cos(t * 0.5 + n.fase) * 1.2);
        const e = n.idea.estado;
        const color = COLOR_ESTADO[e] ?? COLOR_ESTADO.borrador;
        let r = n.r * aparece;
        let brillo = 10;
        if (e === 'en-proceso' && !quieto) {
          const latido = (Math.sin(t * 3 + n.fase) + 1) / 2;
          r *= 1 + latido * 0.5;
          brillo = 14 + latido * 18;
        }
        if (e === 'rechazada') brillo = 0;
        const enfocado = foco?.nodo === n;
        ctx.save();
        ctx.globalAlpha = e === 'rechazada' ? 0.55 : 1;
        ctx.shadowColor = color;
        ctx.shadowBlur = enfocado ? 26 : brillo;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, enfocado ? r + 2.5 : r, 0, 6.29);
        ctx.fill();
        if (e === 'aceptada') {
          // Una aceptada ya ha brotado: dos hojitas sobre la semilla.
          ctx.shadowBlur = 0;
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(x, y - r);
          ctx.quadraticCurveTo(x - 5, y - r - 6, x - 7, y - r - 3);
          ctx.moveTo(x, y - r);
          ctx.quadraticCurveTo(x + 5, y - r - 7, x + 7, y - r - 4);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Nombres de los bancales.
      ctx.font = '500 13px "Bricolage Grotesque Variable", system-ui';
      ctx.textAlign = 'center';
      for (const hub of red.hubs) {
        const enf = foco?.hub === hub;
        ctx.globalAlpha = crecer;
        ctx.fillStyle = enf ? '#d8e2dc' : '#93a69e';
        ctx.fillText(hub.carpeta.nombre, hub.x + desp.x, hub.y + desp.y + 4);
        ctx.fillStyle = hub.carpeta.color;
        ctx.beginPath();
        ctx.arc(hub.x + desp.x, hub.y + desp.y - 12, 2.2, 0, 6.29);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (!quieto) marco = requestAnimationFrame(dibujar);
    }

    if (quieto) redibujar = () => dibujar(performance.now());
    else marco = requestAnimationFrame(dibujar);

    const pausar = () => {
      cancelAnimationFrame(marco);
      if (!document.hidden && !quieto) marco = requestAnimationFrame(dibujar);
    };
    document.addEventListener('visibilitychange', pausar);

    return () => {
      cancelAnimationFrame(marco);
      obs.disconnect();
      document.removeEventListener('visibilitychange', pausar);
    };
  });

  function pulsar() {
    if (foco?.tipo === 'idea') ir(enlace.idea(foco.nodo.carpeta.id, foco.nodo.idea.id));
    else if (foco?.tipo === 'carpeta') ir(enlace.carpeta(foco.hub.carpeta.id));
  }
</script>

<div class="micelio" bind:this={contenedor}>
  <canvas
    bind:this={lienzo}
    style:width="{ancho}px"
    style:height="{alto}px"
    style:cursor={foco ? 'pointer' : 'default'}
    onclick={pulsar}
    aria-label="Red de ideas: cada punto es una idea y su color indica el estado"
  ></canvas>
  {#if foco?.tipo === 'idea'}
    <div class="ficha" style:left="{foco.x}px" style:top="{foco.y}px">
      <span class="titulo">{foco.nodo.idea.titulo}</span>
      <span class="estado" style:color={COLOR_ESTADO[foco.nodo.idea.estado]}>{ETIQUETA_ESTADO[foco.nodo.idea.estado]}</span>
    </div>
  {/if}
</div>

<style>
  .micelio {
    position: absolute;
    inset: 0;
  }
  canvas {
    display: block;
  }
  .ficha {
    position: absolute;
    transform: translate(-50%, calc(-100% - 18px));
    display: grid;
    gap: 2px;
    padding: 0.5em 0.8em;
    max-width: 280px;
    background: rgb(19 31 28 / 0.92);
    border: 1px solid var(--linea-viva);
    border-radius: var(--radio-s);
    backdrop-filter: blur(6px);
    pointer-events: none;
    animation: aparecer 160ms var(--curva);
  }
  .titulo {
    font-family: var(--serif);
    font-size: var(--t1);
    line-height: 1.2;
  }
  .estado {
    font-size: var(--t-1);
  }
  @keyframes aparecer {
    from {
      opacity: 0;
      transform: translate(-50%, calc(-100% - 10px));
    }
  }
</style>
