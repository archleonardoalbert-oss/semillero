import path from 'node:path';
import { AJUSTES_POR_DEFECTO } from '../config.js';
import { leerJSON, escribirJSON } from './fsutil.js';

export function crearAjustes(cfg) {
  const ruta = path.join(cfg.datos, 'estado.json');

  async function leer() {
    return { ...AJUSTES_POR_DEFECTO, ...(await leerJSON(ruta, {})) };
  }

  async function guardar(parcial) {
    const nuevo = { ...(await leer()), ...parcial };
    nuevo.paralelo = Math.min(5, Math.max(1, Math.round(Number.isFinite(Number(nuevo.paralelo)) ? Number(nuevo.paralelo) : 5)));
    for (const k of ['umbral5h', 'umbral7d']) nuevo[k] = Math.min(1, Math.max(0.05, Number(nuevo[k]) || 0.9));
    await escribirJSON(ruta, nuevo);
    return nuevo;
  }

  return { leer, guardar };
}
