// Disposición del árbol de germinación como una lámina botánica: bajo el suelo, las raíces (los
// mensajes del manuscrito); el tronco, la ruta de estudio por capas; la copa, las incógnitas (hojas)
// y los problemas abiertos (frutos). Los títulos van en dos columnas laterales con líneas guía, como
// las leyendas de una lámina, así que nunca se pisan. Coordenadas SVG: y negativa = arriba.

const BASE_TRONCO = 80; // altura del primer nodo del tronco sobre el suelo
const CAPA = 105; // altura entre capas del tronco
const ANCHO_TRONCO = 70; // separación entre nodos de una misma capa
const RADIO_COPA = 190; // primer anillo de la copa
const ANILLO = 115; // separación entre anillos
const ARCO = [-165, -15]; // la copa ocupa el arco superior (grados)
const HUECO_COPA = 82; // distancia mínima entre incógnitas de un mismo anillo
const MAX_TITULO = 38;
const CHAR = 7.3; // ancho medio de un carácter de los títulos (px)
const ALTO_ETQ = 36; // dos líneas: título y subtítulo
const SEP_COLUMNA = 70; // de los nodos más externos a la columna de títulos
const SEP_RAIZ = 140;

const truncar = (t) => (t.length > MAX_TITULO ? `${t.slice(0, MAX_TITULO - 1).trimEnd()}…` : t);
const anchoTexto = (t) => Math.ceil(t.length * CHAR) + 8;

function niveles(lista, porId, filtro) {
  const nivel = new Map();
  const calcular = (id, pila = new Set()) => {
    if (nivel.has(id)) return nivel.get(id);
    if (pila.has(id)) return 0;
    pila.add(id);
    const deps = porId.get(id).depende.filter((d) => porId.has(d) && filtro(porId.get(d)));
    const v = deps.length ? Math.max(...deps.map((d) => calcular(d, pila))) + 1 : 0;
    nivel.set(id, v);
    return v;
  };
  for (const n of lista) calcular(n.id);
  return nivel;
}

export function disponer(mapa, { raices = [] } = {}) {
  const nodos = mapa?.nodos ?? [];
  const porId = new Map(nodos.map((n) => [n.id, { ...n, depende: n.depende ?? [] }]));
  const estudios = [...porId.values()].filter((n) => n.tipo === 'estudio');
  const incognitas = [...porId.values()].filter((n) => n.tipo === 'incognita');
  const pos = new Map();

  // Tronco: capas por dependencias entre estudios, centradas y ordenadas por el baricentro de sus padres.
  const nivelT = niveles(estudios, porId, (d) => d.tipo === 'estudio');
  const capas = new Map();
  for (const n of estudios) {
    const v = nivelT.get(n.id);
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
    capa.forEach((n, k) => pos.set(n.id, { x: (k - (capa.length - 1) / 2) * ANCHO_TRONCO, y: -(BASE_TRONCO + v * CAPA) }));
  }
  const techo = estudios.length ? Math.min(...estudios.map((n) => pos.get(n.id).y)) : -BASE_TRONCO;
  const ancla = (id) => pos.get(id)?.x ?? 0;

  // Copa: anillos por profundidad entre incógnitas, en el arco superior, sin que se apiñen.
  const nivelC = niveles(incognitas, porId, (d) => d.tipo === 'incognita');
  const anillos = new Map();
  for (const n of incognitas) {
    const v = nivelC.get(n.id);
    if (!anillos.has(v)) anillos.set(v, []);
    anillos.get(v).push(n);
  }
  const centroCopa = { x: 0, y: techo - 40 };
  const arco = ((ARCO[1] - ARCO[0]) * Math.PI) / 180;
  let radio = RADIO_COPA - ANILLO;
  for (const v of [...anillos.keys()].sort((a, b) => a - b)) {
    const anillo = anillos.get(v);
    radio = Math.max(radio + ANILLO, (anillo.length * HUECO_COPA) / arco);
    // Cada incógnita mira hacia lo que la sostiene, para que las ramas no se crucen.
    const referencia = (n) => {
      const xs = n.depende.map(ancla).filter((x) => Number.isFinite(x));
      return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
    };
    anillo.sort((a, b) => referencia(a) - referencia(b));
    anillo.forEach((n, k) => {
      const t = anillo.length === 1 ? 0.5 : k / (anillo.length - 1);
      const ang = ((ARCO[0] + t * (ARCO[1] - ARCO[0])) * Math.PI) / 180;
      pos.set(n.id, { x: centroCopa.x + radio * Math.cos(ang), y: centroCopa.y + radio * Math.sin(ang) });
    });
  }

  const forma = (n) => (n.tipo === 'estudio' ? 'tronco' : n.abierto ? 'fruto' : 'hoja');
  const salida = [...porId.values()].map((n) => ({
    id: n.id, tipo: n.tipo, forma: forma(n), nivel: n.tipo === 'estudio' ? nivelT.get(n.id) : nivelC.get(n.id),
    ...pos.get(n.id), nodo: nodos.find((x) => x.id === n.id),
  }));

  // Ramas: el tronco nace del suelo; cada incógnita cuelga de su estudio más alto (o de otra incógnita);
  // el resto de dependencias entre incógnitas son enlaces finos.
  const ramas = [];
  for (const n of salida) {
    const deps = porId.get(n.id).depende.filter((d) => pos.has(d));
    if (n.tipo === 'estudio') {
      const dEst = deps.filter((d) => porId.get(d).tipo === 'estudio');
      const grosor = Math.max(3, 11 - 1.6 * n.nivel);
      if (!dEst.length) ramas.push({ deId: null, aId: n.id, de: { x: n.x * 0.35, y: 0 }, a: n, grosor, clase: 'tronco' });
      for (const d of dEst) ramas.push({ deId: d, aId: n.id, de: pos.get(d), a: n, grosor, clase: 'tronco' });
      continue;
    }
    const dEst = deps.filter((d) => porId.get(d).tipo === 'estudio').sort((a, b) => pos.get(a).y - pos.get(b).y);
    const dInc = deps.filter((d) => porId.get(d).tipo === 'incognita');
    const padre = dEst[0] ?? dInc[0] ?? null;
    const de = padre ? pos.get(padre) : { x: 0, y: techo };
    ramas.push({ deId: padre, aId: n.id, de, a: n, grosor: 2.2, clase: dEst[0] ? 'rama' : 'enlace' });
    for (const d of dInc) if (d !== padre) ramas.push({ deId: d, aId: n.id, de: pos.get(d), a: n, grosor: 1.2, clase: 'enlace' });
  }

  // Títulos: dos columnas, una a cada lado; dentro de cada una, en orden vertical y sin solaparse.
  const xs = salida.map((n) => n.x);
  const izquierda = Math.min(0, ...xs) - SEP_COLUMNA;
  const derecha = Math.max(0, ...xs) + SEP_COLUMNA;
  const columnas = { izq: [], der: [] };
  salida.forEach((n, k) => {
    const lado = n.x < -1 ? 'izq' : n.x > 1 ? 'der' : k % 2 ? 'izq' : 'der';
    columnas[lado].push(n);
  });
  for (const [lado, lista] of Object.entries(columnas)) {
    lista.sort((a, b) => a.y - b.y);
    // De arriba abajo, con hueco mínimo; luego se sube la columna entera si invade el suelo.
    let ultimo = -Infinity;
    const ys = lista.map((n) => (ultimo = Math.max(n.y, ultimo + ALTO_ETQ)));
    const exceso = Math.max(0, (ys.at(-1) ?? 0) - (-24));
    lista.forEach((n, k) => {
      const y = ys[k] - exceso;
      const texto = truncar(n.nodo.titulo);
      const sub = n.tipo === 'incognita' ? `${n.nodo.abierto ? 'Problema abierto' : 'Incógnita'}${n.nodo.dificultad ? `, dificultad ${n.nodo.dificultad}` : ''}` : (n.nodo.duracion ?? 'Estudio');
      const ancho = Math.max(anchoTexto(texto), anchoTexto(sub) - 10);
      const x = lado === 'izq' ? izquierda : derecha;
      n.etq = {
        texto, sub, x, y, anchor: lado === 'izq' ? 'end' : 'start',
        caja: { x: lado === 'izq' ? x - ancho : x, y: y - 14, ancho, alto: ALTO_ETQ - 2 },
        guia: [{ x: n.x, y: n.y }, { x: lado === 'izq' ? x + 8 : x - 8, y: y - 4 }],
      };
    });
  }

  // Raíces: una por mensaje del manuscrito, en abanico bajo el suelo; el título bajo cada punta.
  const salidaRaices = raices.map((r, k) => {
    const x = (k - (raices.length - 1) / 2) * SEP_RAIZ;
    const y = 95 + (k % 2) * 40;
    const ancho = anchoTexto(r.etiqueta);
    return { ...r, x, y, etq: { texto: r.etiqueta, x, y: y + 24, anchor: 'middle', caja: { x: x - ancho / 2, y: y + 10, ancho, alto: 20 } } };
  });

  const cajas = [...salida.map((n) => n.etq.caja), ...salidaRaices.map((r) => r.etq.caja), ...salida.map((n) => ({ x: n.x - 30, y: n.y - 30, ancho: 60, alto: 60 }))];
  const minX = Math.min(-200, ...cajas.map((c) => c.x));
  const maxX = Math.max(200, ...cajas.map((c) => c.x + c.ancho));
  const minY = Math.min(-120, ...cajas.map((c) => c.y));
  const maxY = Math.max(80, ...cajas.map((c) => c.y + c.alto));
  const margen = 40;
  return {
    semilla: { x: 0, y: 0 },
    nodos: salida,
    ramas,
    raices: salidaRaices,
    caja: { x: minX - margen, y: minY - margen, ancho: maxX - minX + 2 * margen, alto: maxY - minY + 2 * margen },
  };
}

// Rama orgánica: sale vertical del padre y llega vertical al hijo.
export function trazo({ de, a }) {
  const medio = (de.y + a.y) / 2;
  return `M ${de.x} ${de.y} C ${de.x} ${medio}, ${a.x} ${medio}, ${a.x} ${a.y}`;
}

// Raíz: del cuello del árbol a su punta, con una curva que se abre hacia fuera.
export function trazoRaiz(r) {
  return `M 0 4 C ${r.x * 0.15} ${r.y * 0.55}, ${r.x * 0.75} ${r.y * 0.45}, ${r.x} ${r.y}`;
}
