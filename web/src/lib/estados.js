export const ETIQUETA_ESTADO = Object.freeze({
  borrador: 'Sin analizar',
  'en-proceso': 'En proceso',
  aceptada: 'Aceptada',
  cambios: 'Cambio sugerido',
  rechazada: 'Rechazada',
  aclaracion: 'Necesita aclaración',
  'replica-pendiente': 'Réplica sin enviar',
  detenida: 'Detenida',
  pausada: 'Pausada',
  error: 'Error',
});

// Mismos valores que los tokens CSS: el lienzo no puede leer variables CSS en cada fotograma.
export const COLOR_ESTADO = Object.freeze({
  borrador: '#e8efe9',
  'en-proceso': '#5ee0e0',
  aceptada: '#6fe3a5',
  cambios: '#cfe36a',
  rechazada: '#c46a5a',
  aclaracion: '#b39cff',
  'replica-pendiente': '#9ec5ff',
  detenida: '#93a69e',
  pausada: '#e6c86e',
  error: '#ff8f7a',
});
