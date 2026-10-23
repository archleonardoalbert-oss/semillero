// Disposición del árbol de germinación: la semilla abajo, la ruta de estudio sube como un tallo
// por capas de dependencia y las incógnitas brotan a los lados. Coordenadas SVG (y negativa = arriba).

const CAPA = 150; // altura entre capas
const SEPARACION = 280; // entre estudios de una misma capa
const LADO = 230; // distancia lateral de una incógnita a su padre
const MINIMA = 96; // distancia mínima entre dos nodos
const RADIO_HOJA = 30;

export function disponer(mapa) {
  const nodos = mapa?.nodos ?? [];
  const porId = new Map(nodos.map((n) => [n.id, n]));

  // Nivel = camino de dependencias más largo hasta el nodo.
  const nivel = new Map();
  const calcular = (id, pila = new Set()) => {
    if (nivel.has(id)) return nivel.get(id);
    if (pila.has(id)) return 0;
    pila.add(id);
    const deps = porId.get(id).depende.filter((d) => porId.has(d));
    const v = deps.length ? Math.max(...deps.map((d) => calcular(d, pila))) + 1 : 0;
    nivel.set(id, v);
    return v;
  };
  for (const n of nodos) calcular(n.id);

  const pos = new Map(); // id → {x, y}
  const semilla = { x: 0, y: 0 };

  // Estudios: por capas, ordenados por el baricentro de sus padres para que las ramas no se crucen.
  const estudios = nodos.filter((n) => n.tipo === 'estudio');
  const capas = new Map();
  for (const n of estudios) {
    const v = nivel.get(n.id);
    if (!capas.has(v)) capas.set(v, []);
    capas.get(v).push(n);
  }
  for (const v of [...capas.keys()].sort((a, b) => a - b)) {
    const capa = capas.get(v);
    const centro = (n) => {
      const xs = n.depende.map((d) => pos.get(d)?.x).filter((x) => x !== undefined);
      return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
    };
    capa.sort((a, b) => centro(a) - centro(b));
    capa.forEach((n, k) => pos.set(n.id, { x: (k - (capa.length - 1) / 2) * SEPARACION, y: -(v + 1) * CAPA }));
  }

  // Incógnitas: cuelgan del padre de más nivel, alternando lados y apilándose hacia arriba.
  const incognitas = nodos.filter((n) => n.tipo === 'incognita').sort((a, b) => nivel.get(a.id) - nivel.get(b.id));
  const colgadas = new Map(); // padre → {izq, der}
  for (const n of incognitas) {
    const deps = n.depende.filter((d) => pos.has(d));
    const padre = deps.sort((a, b) => nivel.get(b) - nivel.get(a))[0] ?? null;
    const p = padre ? pos.get(padre) : semilla;
    const c = colgadas.get(padre) ?? { izq: 0, der: 0 };
    let lado = p.x > 1 ? 1 : p.x < -1 ? -1 : c.der <= c.izq ? 1 : -1;
    if (lado === 1 && c.der > c.izq + 1) lado = -1;
    else if (lado === -1 && c.izq > c.der + 1) lado = 1;
    const j = lado === 1 ? c.der++ : c.izq++;
    colgadas.set(padre, c);
    pos.set(n.id, { x: p.x + lado * (LADO + 40 * j), y: p.y - CAPA / 2 - 70 * j });
  }

  // Relajación: separa lo que haya quedado demasiado cerca (las incógnitas ceden antes que el tallo).
  const ids = nodos.map((n) => n.id);
  for (let vuelta = 0; vuelta < 200; vuelta++) {
    let movido = false;
    for (let a = 0; a < ids.length; a++) {
      for (let b = a + 1; b < ids.length; b++) {
        const pa = pos.get(ids[a]);
        const pb = pos.get(ids[b]);
        const d = Math.hypot(pa.x - pb.x, pa.y - pb.y);
        if (d >= MINIMA) continue;
        movido = true;
        const [fijo, movil] = porId.get(ids[b]).tipo === 'incognita' ? [pa, pb] : porId.get(ids[a]).tipo === 'incognita' ? [pb, pa] : [pa, pb];
        const dx = movil.x - fijo.x || (movil.x >= 0 ? 1 : -1);
        movil.x += Math.sign(dx) * (MINIMA - d + 4);
        if (d < MINIMA / 2) movil.y -= 24;
      }
    }
    if (!movido) break;
  }

  const salida = nodos.map((n) => ({ id: n.id, tipo: n.tipo, nivel: nivel.get(n.id), ...pos.get(n.id), nodo: n }));

  const ramas = [];
  for (const n of nodos) {
    const deps = n.depende.filter((d) => pos.has(d));
    const a = pos.get(n.id);
    const grosor = Math.max(1.4, 6.5 - 0.9 * nivel.get(n.id)) * (n.tipo === 'incognita' ? 0.6 : 1);
    if (!deps.length) ramas.push({ deId: null, aId: n.id, de: semilla, a, grosor });
    for (const d of deps) ramas.push({ deId: d, aId: n.id, de: pos.get(d), a, grosor });
  }

  // Hojas: los recursos se abren en abanico por encima de su nodo.
  const hojas = [];
  for (const n of nodos) {
    const p = pos.get(n.id);
    const rs = n.recursos ?? [];
    rs.forEach((r, k) => {
      const angulo = rs.length === 1 ? -60 : -150 + (120 * k) / (rs.length - 1);
      const rad = (angulo * Math.PI) / 180;
      hojas.push({ recurso: r, nodo: n.id, x: p.x + RADIO_HOJA * Math.cos(rad), y: p.y + RADIO_HOJA * Math.sin(rad), angulo });
    });
  }

  const puntos = [semilla, ...salida, ...hojas];
  const xs = puntos.map((p) => p.x);
  const ys = puntos.map((p) => p.y);
  const margen = { x: 220, arriba: 120, abajo: 150 };
  const caja = {
    x: Math.min(...xs) - margen.x,
    y: Math.min(...ys) - margen.arriba,
    ancho: Math.max(...xs) - Math.min(...xs) + 2 * margen.x,
    alto: Math.max(...ys) - Math.min(...ys) + margen.arriba + margen.abajo,
  };
  return { semilla, nodos: salida, ramas, hojas, caja };
}

// Rama orgánica: sale vertical del padre y llega vertical al hijo.
export function trazo({ de, a }) {
  const medio = (de.y + a.y) / 2;
  return `M ${de.x} ${de.y} C ${de.x} ${medio}, ${a.x} ${medio}, ${a.x} ${a.y}`;
}
