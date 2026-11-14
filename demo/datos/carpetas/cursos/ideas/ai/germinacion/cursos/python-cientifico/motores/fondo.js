// El fondo de toda la asignatura: papel milimetrado (de día) o una memoria de fósforo (de noche). De vez en
// cuando, una «vista» recorre la retícula: se encienden celdas separadas por un paso fijo, como los strides de un
// ndarray, y se apagan despacio. Bajo contraste, 30 fotogramas por segundo como mucho, en pausa si la pestaña no
// se ve, y quieto (un fotograma) con prefers-reduced-motion.
const LADO = 26;                // lado de una celda, en píxeles CSS
const MAYOR = 4;                // una línea más marcada cada 4 celdas, como el papel milimetrado
const FPS = 30;

export function iniciarFondo(canvas) {
  const ctx = canvas.getContext('2d');
  const reticula = document.createElement('canvas');
  let W = 0, H = 0, dpr = 1, col = {}, oscuro = false, lectores = [], ultimo = 0, proximo = 0, raf = 0;
  const quieto = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function leer() {
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue(n).trim();
    oscuro = document.documentElement.dataset.tema === 'oscuro';
    col = { ret: v('--reticula') || '27, 30, 37', paleta: [v('--azul'), v('--rosa'), v('--naranja'), v('--verde')] };
  }

  function pintarReticula() {
    reticula.width = Math.ceil(W * dpr); reticula.height = Math.ceil(H * dpr);
    const g = reticula.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    // un velo de luz: más claro arriba a la izquierda (de día) o un halo azul (de noche)
    const halo = g.createRadialGradient(W * 0.18, H * 0.05, 0, W * 0.18, H * 0.05, Math.max(W, H) * 0.9);
    halo.addColorStop(0, oscuro ? 'rgba(70, 120, 200, 0.10)' : 'rgba(255, 255, 255, 0.55)');
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = halo; g.fillRect(0, 0, W, H);
    const fina = oscuro ? 0.045 : 0.055, gruesa = oscuro ? 0.085 : 0.095;
    for (let x = 0, i = 0; x <= W; x += LADO, i++) {
      g.fillStyle = `rgba(${col.ret}, ${i % MAYOR === 0 ? gruesa : fina})`;
      g.fillRect(Math.round(x), 0, 1, H);
    }
    for (let y = 0, j = 0; y <= H; y += LADO, j++) {
      g.fillStyle = `rgba(${col.ret}, ${j % MAYOR === 0 ? gruesa : fina})`;
      g.fillRect(0, Math.round(y), W, 1);
    }
  }

  function ajustar() {
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.ceil(W * dpr); canvas.height = Math.ceil(H * dpr);
    leer(); pintarReticula(); dibujar(performance.now());
  }

  // Un lector: n celdas desde (c0, f0) con paso (dc, df), en un color de la paleta.
  function nuevoLector(t, enReposo = false) {
    const cols = Math.floor(W / LADO), filas = Math.floor(H / LADO);
    const pasos = [[1, 0], [2, 0], [3, 0], [0, 1], [0, 2], [1, 1], [2, 1]];
    const [dc, df] = pasos[Math.floor(Math.random() * pasos.length)];
    const n = 4 + Math.floor(Math.random() * 6);
    const c0 = Math.floor(Math.random() * Math.max(1, cols - n * dc)), f0 = Math.floor(Math.random() * Math.max(1, filas - n * df));
    return { c0, f0, dc, df, n, color: Math.floor(Math.random() * 4), t0: enReposo ? t - 900 - Math.random() * 1200 : t, cadencia: 110 + Math.random() * 70, vida: 3200 + Math.random() * 1800 };
  }

  function dibujar(t) {
    const g = ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.drawImage(reticula, 0, 0);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const max = oscuro ? 0.30 : 0.16;
    // Zonas tranquilas: donde hay texto encima del fondo (títulos, índice, portada) no se enciende nada.
    const calma = [...document.querySelectorAll('.cabeza, .hero > div, .rail, .barra, .pie')].map((e) => e.getBoundingClientRect()).filter((r) => r.width && r.bottom > 0 && r.top < H);
    const tranquila = (x, y) => calma.some((r) => x + LADO > r.left - 8 && x < r.right + 8 && y + LADO > r.top - 8 && y < r.bottom + 8);
    for (const L of lectores) {
      for (let k = 0; k < L.n; k++) {
        const t1 = L.t0 + k * L.cadencia, edad = t - t1;
        if (edad < 0 || edad > L.vida) continue;
        const sube = Math.min(1, edad / 260), baja = 1 - Math.max(0, (edad - 600) / (L.vida - 600));
        const a = max * sube * baja;
        const x = (L.c0 + k * L.dc) * LADO, y = (L.f0 + k * L.df) * LADO;
        if (tranquila(x, y)) continue;
        g.globalAlpha = a;
        g.fillStyle = col.paleta[L.color];
        if (oscuro) { g.shadowColor = col.paleta[L.color]; g.shadowBlur = 12; }
        g.fillRect(x + 3, y + 3, LADO - 5, LADO - 5);
        g.shadowBlur = 0;
        // el «paso»: una marca fina hacia la siguiente celda de la vista
        if (k < L.n - 1 && edad > 200) {
          g.globalAlpha = a * 0.7;
          g.strokeStyle = col.paleta[L.color]; g.lineWidth = 1;
          g.beginPath(); g.moveTo(x + LADO / 2, y + LADO / 2); g.lineTo(x + LADO / 2 + L.dc * LADO, y + LADO / 2 + L.df * LADO); g.stroke();
        }
      }
    }
    g.globalAlpha = 1;
  }

  function bucle(t) {
    raf = requestAnimationFrame(bucle);
    if (t - ultimo < 1000 / FPS) return;
    ultimo = t;
    lectores = lectores.filter((L) => t - L.t0 < L.n * L.cadencia + L.vida);
    if (t > proximo && lectores.length < 6) { lectores.push(nuevoLector(t)); proximo = t + 900 + Math.random() * 1400; }
    dibujar(t);
  }

  function arrancar() {
    cancelAnimationFrame(raf);
    if (quieto() || document.hidden) {
      // un fotograma bonito y quieto: unas cuantas vistas encendidas
      const t = performance.now();
      if (!lectores.length) for (let i = 0; i < 5; i++) lectores.push(nuevoLector(t, true));
      dibujar(t);
      return;
    }
    raf = requestAnimationFrame(bucle);
  }

  let espera = 0;
  window.addEventListener('resize', () => { clearTimeout(espera); espera = setTimeout(ajustar, 120); });
  document.addEventListener('visibilitychange', arrancar);
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', arrancar);
  const retema = () => { leer(); pintarReticula(); dibujar(performance.now()); };
  document.addEventListener('semillero-tema', retema);
  new MutationObserver(retema).observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });
  ajustar();
  arrancar();
}
