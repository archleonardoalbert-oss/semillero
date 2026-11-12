// Modo demo (portafolio, solo lectura) y raíz de los archivos de las ideas. Sin dependencias: lo usan
// también el visor exportado y Node (tests), donde import.meta.env no existe.
export const DEMO = typeof import.meta.env !== 'undefined' && !!import.meta.env.VITE_DEMO;
// En la demo publicada los archivos son estáticos y viven junto a la página.
export const RAIZ_ARCHIVOS = DEMO ? 'demo/archivos' : '/archivos';
