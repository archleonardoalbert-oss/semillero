// Acción de Svelte: monta en un documento ya renderizado sus escenas de curso, cada una en un iframe aislado
// (sandbox="allow-scripts": origen opaco, sin acceso a la API ni a los datos). La escena avisa de su alto
// y el iframe crece con ella. Vigila el contenedor: los documentos se re-renderizan (glosas, enmiendas).
let siguiente = 0;
const ALTO_INICIAL = 560;

export function escenas(nodo) {
  const marcos = new Set();
  const alMensaje = (ev) => {
    if (ev.data?.tipo !== 'semillero-escena-alto') return;
    for (const f of marcos) if (f.contentWindow === ev.source) f.style.height = `${Math.min(2400, Math.max(140, Number(ev.data.alto) || ALTO_INICIAL))}px`;
  };
  window.addEventListener('message', alMensaje);
  const montar = () => {
    for (const f of [...marcos]) if (!f.isConnected) marcos.delete(f);
    for (const fig of nodo.querySelectorAll('figure.escena-curso[data-escena]')) {
      if (fig.querySelector('iframe')) continue;
      const f = document.createElement('iframe');
      f.setAttribute('sandbox', 'allow-scripts');
      f.setAttribute('loading', 'lazy');
      f.title = fig.dataset.titulo || 'Escena animada';
      f.className = 'marco-escena';
      f.style.height = `${ALTO_INICIAL}px`;
      f.src = `/escena.html?${new URLSearchParams({ m: fig.dataset.escena, t: fig.dataset.titulo ?? '', id: `e${++siguiente}` })}`;
      (fig.querySelector('.hueco-escena') ?? fig).append(f);
      marcos.add(f);
    }
  };
  montar();
  const obs = new MutationObserver(montar);
  obs.observe(nodo, { childList: true, subtree: true });
  return {
    destroy() {
      obs.disconnect();
      window.removeEventListener('message', alMensaje);
    },
  };
}
