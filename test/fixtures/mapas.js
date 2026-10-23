// Mapas de germinación de ejemplo para los tests.
export const MAPA = {
  version: 1,
  fase: 'mapa',
  resumen: 'Camino hacia memorias editables.',
  nodos: [
    { id: 'e1', tipo: 'estudio', titulo: 'Álgebra lineal', resumen: 'Bases', documento: 'nodos/e1.md', depende: [], recursos: ['r1'], duracion: '2 semanas' },
    { id: 'e2', tipo: 'estudio', titulo: 'Transformers', resumen: 'Arquitectura', documento: 'nodos/e2.md', depende: ['e1'], recursos: [] },
    { id: 'i1', tipo: 'incognita', titulo: '¿Dónde vive un hecho?', resumen: 'Localizar', documento: 'nodos/i1.md', depende: ['e2'], recursos: ['r1'], abierto: true, dificultad: 'alta' },
  ],
  recursos: [{ id: 'r1', tipo: 'articulo', titulo: 'Key-Value Memories', autores: 'Geva et al.', anio: 2021, url: 'https://arxiv.org/abs/2012.14913', archivo: 'recursos/geva.pdf', nota: 'Base' }],
};

export const DIAGNOSTICO = {
  version: 1,
  fase: 'diagnostico',
  resumen: '',
  diagnostico: {
    intro: 'Antes de trazar la ruta necesito saber de dónde partes.',
    preguntas: [
      { id: 'p1', texto: '¿Cuánto álgebra lineal sabes?', tipo: 'escala', niveles: ['Nada', 'Algo', 'Lo básico', 'Bien', 'Experto'] },
      { id: 'p2', texto: '¿Has entrenado una red?', tipo: 'opciones', opciones: ['Nunca', 'Con tutorial', 'Por mi cuenta'] },
      { id: 'p3', texto: 'Cuéntame tu experiencia con $\\nabla$.', tipo: 'abierta' },
    ],
  },
  nodos: [],
  recursos: [],
};

export const copia = (o) => structuredClone(o);
