import { api } from './api.js';

// Catálogo de tipos de bancal (lo sirve el servidor) y su vocabulario en la interfaz.
export const catalogo = $state({ tipos: [] });

let carga = null;
export function cargarTipos() {
  carga ??= api.tipos().then((t) => (catalogo.tipos = t)).catch(() => (carga = null));
  return carga;
}

// Mientras carga el catálogo se usa el vocabulario académico, el de siempre.
const ACADEMICO = {
  estudio: 'Lo que estudiar', hoja: 'Incógnita', fruto: 'Problema abierto',
  estadosIncognita: ['Abierta', 'Atacándola', 'Resuelta'], resuelta: 'Resuelta',
  recuento: ['Problemas', 'abiertos', 'atacándolos', 'resueltos'],
  dominio: 'examen', enviarResultado: 'la demostración, el experimento, los datos o el código',
};

export const tipoDe = (carpeta) => catalogo.tipos.find((t) => t.id === (carpeta?.tipo ?? 'academico'));
export const vocabDe = (carpeta) => tipoDe(carpeta)?.vocab ?? ACADEMICO;
