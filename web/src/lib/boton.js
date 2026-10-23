export const TEXTO_BOTON = Object.freeze({
  comenzar: 'Comenzar Análisis',
  detener: 'Detener Análisis',
  reanudar: 'Reanudar Investigación',
});

// Las pausadas mandan: mientras haya alguna, el botón principal sirve para reanudarlas.
export function modoBoton({ cola, pausadas }) {
  if (pausadas > 0) return 'reanudar';
  if ((cola?.ejecutando?.length ?? 0) + (cola?.enCola?.length ?? 0) > 0) return 'detener';
  return 'comenzar';
}
