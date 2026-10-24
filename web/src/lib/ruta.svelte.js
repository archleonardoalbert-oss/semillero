import { tick } from 'svelte';

const PATRONES = [
  ['inicio', /^#?\/?$/],
  ['carpeta', /^#\/carpeta\/([^/]+)$/],
  ['idea', /^#\/idea\/([^/]+)\/([^/]+)(?:\/nodo\/([^/]+))?$/],
  ['lista', /^#\/lista\/([^/]+)$/],
  ['ajustes', /^#\/ajustes$/],
  ['notas', /^#\/notas$/],
];

function interpretar(hash) {
  for (const [nombre, re] of PATRONES) {
    const m = hash.match(re);
    if (m) return { nombre, params: m.slice(1).map((p) => (p === undefined ? undefined : decodeURIComponent(p))) };
  }
  return { nombre: 'inicio', params: [] };
}

export const ruta = $state(interpretar(location.hash));

async function aplicar(destino) {
  const cambiar = async () => {
    Object.assign(ruta, destino);
    await tick();
    window.scrollTo({ top: 0 });
  };
  if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    await document.startViewTransition(cambiar).finished.catch(() => {});
  } else await cambiar();
}

export function ir(hash) {
  if (hash === location.hash) return;
  history.pushState(null, '', hash);
  aplicar(interpretar(hash));
}

window.addEventListener('popstate', () => aplicar(interpretar(location.hash)));

export const enlace = {
  inicio: () => '#/',
  carpeta: (c) => `#/carpeta/${encodeURIComponent(c)}`,
  idea: (c, i, nodo) => `#/idea/${encodeURIComponent(c)}/${encodeURIComponent(i)}${nodo ? `/nodo/${encodeURIComponent(nodo)}` : ''}`,
  lista: (estado) => `#/lista/${estado}`,
  ajustes: () => '#/ajustes',
  notas: () => '#/notas',
};
