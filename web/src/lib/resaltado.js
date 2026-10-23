// Resaltado de fragmentos glosados con la CSS Custom Highlight API: no toca el DOM del documento.
// Varias piezas de la página (cada dictamen, cada réplica) aportan sus rangos a los mismos resaltados.
const NOMBRES = ['glosa-explicar', 'glosa-corregir', 'glosa-viva', 'glosa-foco'];
const aportes = new Map(); // dueño → { nombre: Range[] }

const soportado = () => typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined';

function recomponer() {
  if (!soportado()) return;
  for (const n of NOMBRES) {
    const rangos = [...aportes.values()].flatMap((a) => a[n] ?? []);
    if (rangos.length) CSS.highlights.set(n, new Highlight(...rangos));
    else CSS.highlights.delete(n);
  }
}

export function aportar(dueno, porNombre) {
  aportes.set(dueno, porNombre);
  recomponer();
}

export function retirar(dueno) {
  aportes.delete(dueno);
  recomponer();
}
