import os from 'node:os';
import path from 'node:path';

export const AJUSTES_POR_DEFECTO = Object.freeze({
  modelo: 'opus',
  esfuerzo: 'high',
  paralelo: 5,
  umbral5h: 0.9,
  umbral7d: 0.9,
  ultimoAnalisis: null,
});

export function crearConfig({ datos } = {}) {
  return {
    datos: datos ?? process.env.SEMILLERO_DATOS ?? path.join(os.homedir(), 'Proyectos/semillero/datos'),
    puerto: Number(process.env.SEMILLERO_PUERTO ?? 4417),
    host: '127.0.0.1',
    claudeBin: process.env.SEMILLERO_CLAUDE ?? 'claude',
  };
}
