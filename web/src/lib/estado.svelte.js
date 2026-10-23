import { api } from './api.js';

// Estado compartido por todas las vistas, alimentado por la API y el WebSocket.
export const global = $state({
  resumen: null,
  cola: null,
  carpetas: [],
  conectado: false,
  aviso: null,
});

const oyentes = new Map(); // 'carpeta/idea' → Set<fn>
const clave = (ref) => `${ref.carpetaId}/${ref.ideaId}`;

export function suscribir(ref, fn) {
  const k = clave(ref);
  if (!oyentes.has(k)) oyentes.set(k, new Set());
  oyentes.get(k).add(fn);
  return () => oyentes.get(k)?.delete(fn);
}

let pendiente = null;
export function refrescar() {
  clearTimeout(pendiente);
  pendiente = setTimeout(async () => {
    try {
      const [resumen, carpetas] = await Promise.all([api.resumen(), api.carpetas()]);
      global.resumen = resumen;
      global.cola = resumen.cola;
      global.carpetas = carpetas;
    } catch (e) {
      console.error('No se pudo refrescar', e);
    }
  }, 60);
}

export function avisar(texto, tipo = 'info') {
  global.aviso = { texto, tipo, id: Date.now() };
}

function conectar() {
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
  ws.onopen = () => {
    global.conectado = true;
    refrescar();
  };
  ws.onclose = () => {
    global.conectado = false;
    setTimeout(conectar, 1500);
  };
  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.tipo === 'cola') global.cola = msg.datos;
    else if (msg.tipo === 'idea') {
      refrescar();
      for (const fn of oyentes.get(clave(msg.ref)) ?? []) fn(msg);
    } else if (msg.tipo === 'evento') {
      for (const fn of oyentes.get(clave(msg.ref)) ?? []) fn(msg);
    } else if (msg.tipo === 'pausa') {
      const pct = Math.round(100 * Math.max(msg.datos.cuota?.cincoHoras ?? 0, msg.datos.cuota?.sieteDias ?? 0));
      avisar(`Investigación pausada: la cuota de Claude llegó al ${pct} %. Cuando quieras seguir, pulsa «Reanudar Investigación».`, 'pausa');
      refrescar();
    }
  };
}

conectar();
