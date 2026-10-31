// La web de una asignatura dice en qué página está (por el puente); esa ruta no es de fiar. Solo se acepta una
// página de la raíz del curso que se está viendo: devuelve su documento para las glosas, o null.
export function documentoDeCurso(ruta, nodo) {
  let r;
  try {
    r = decodeURIComponent(String(ruta ?? ''));
  } catch {
    return null;
  }
  const m = r.match(/\/germinacion\/cursos\/([a-z0-9-]+)\/([a-z0-9-]+\.html)$/);
  return m && m[1] === nodo && !r.includes('/../') ? `germinacion/cursos/${m[1]}/${m[2]}` : null;
}
