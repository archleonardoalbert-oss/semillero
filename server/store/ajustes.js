import path from 'node:path';
import { AJUSTES_POR_DEFECTO } from '../config.js';
import { leerJSON, escribirJSON } from './fsutil.js';
import { CLAVES_CONTEXTO } from '../engine/tipos.js';

export function crearAjustes(cfg, { proteger = (_rutas, fn) => fn() } = {}) {
  const ruta = path.join(cfg.datos, 'estado.json');

  async function leer() {
    return { ...AJUSTES_POR_DEFECTO, ...(await leerJSON(ruta, {})) };
  }

  // Con proteger, la escritura se commitea a la vez: el guard no la revierte al terminar una sesión.
  const guardar = (parcial) => proteger(['estado.json'], () => guardarSinProteger(parcial));

  async function guardarSinProteger(parcial) {
    const nuevo = { ...(await leer()), ...parcial };
    nuevo.paralelo = Math.min(5, Math.max(1, Math.round(Number.isFinite(Number(nuevo.paralelo)) ? Number(nuevo.paralelo) : 5)));
    for (const k of ['umbral5h', 'umbral7d']) nuevo[k] = Math.min(1, Math.max(0.05, Number(nuevo[k]) || 0.9));
    // «Tu contexto»: solo los campos conocidos, como texto acotado.
    const ctx = nuevo.contexto && typeof nuevo.contexto === 'object' ? nuevo.contexto : {};
    nuevo.contexto = Object.fromEntries(CLAVES_CONTEXTO.map((k) => [k, String(ctx[k] ?? '').slice(0, 2000)]));
    await escribirJSON(ruta, nuevo);
    return nuevo;
  }

  return { leer, guardar };
}
