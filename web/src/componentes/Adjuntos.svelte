<script>
  import { RAIZ_ARCHIVOS } from '../lib/archivos.js';
  import { avisar } from '../lib/estado.svelte.js';

  // Lista de adjuntos (imágenes o documentos) con botón para añadir, también arrastrando o pegando.
  // `alSubir(archivo)` devuelve la ruta guardada (o su ficha: { ruta, nombre, aviso }); `alCambiar(lista)` recibe
  // la lista nueva, siempre construida sobre la actual (aunque haya varias subidas en marcha). Con `alQuitar(item)`
  // la × lo quita por su cuenta en vez de con alCambiar. `subiendo` (bindable): cuántas subidas hay en marcha.
  // `acepta` vacío: cualquier archivo.
  let {
    rutas = [], base, alSubir, alCambiar, alQuitar = null, deshabilitado = false, acepta = 'image/*,.pdf,.txt,.md,.py,.ipynb,.tex',
    etiqueta = 'Adjuntar imagen o documento', admitidos = 'imágenes o documentos (PDF, txt, md, py, ipynb, tex)', subiendo = $bindable(0),
  } = $props();

  let encima = $state(false);

  async function subir(archivos) {
    for (const a of archivos) {
      subiendo++;
      try {
        const nuevo = await alSubir(a);
        alCambiar([...rutas, nuevo]);
      } catch (e) {
        avisar(e.codigo === 413 ? `«${a.name}» es demasiado grande.` : e.message === 'extension-invalida' ? `No se admite «${a.name}»: ${admitidos}.` : `No se pudo adjuntar «${a.name}»: ${e.message}`, 'error');
      } finally {
        subiendo--;
      }
    }
  }

  function soltar(e) {
    e.preventDefault();
    encima = false;
    if (!deshabilitado) subir([...(e.dataTransfer?.files ?? [])]);
  }
  const ruta = (x) => (typeof x === 'string' ? x : x.ruta);
  const nombre = (x) => (typeof x === 'string' ? x : x.nombre ?? x.ruta).split('/').at(-1);
  const imagen = (x) => /\.(png|jpe?g|gif|webp)$/i.test(ruta(x));
  const aviso = (x) => (typeof x === 'string' ? null : x.aviso);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="adjuntos" class:encima ondragover={(e) => (e.preventDefault(), (encima = true))} ondragleave={() => (encima = false)} ondrop={soltar}>
  {#each rutas as r, k (ruta(r))}
    <span class="adjunto" class:con-aviso={aviso(r)} title={aviso(r)}>
      {#if imagen(r)}<img src="{RAIZ_ARCHIVOS}/{base}/{ruta(r)}" alt="" />{/if}
      <a href="{RAIZ_ARCHIVOS}/{base}/{ruta(r)}" target="_blank" rel="noopener">{nombre(r)}</a>
      {#if aviso(r)}<span class="marca" aria-label={aviso(r)}>!</span>{/if}
      {#if !deshabilitado}<button aria-label="Quitar {nombre(r)}" onclick={() => (alQuitar ? alQuitar(r) : alCambiar(rutas.filter((_, j) => j !== k)))}>×</button>{/if}
    </span>
  {/each}
  {#if subiendo}<span class="subiendo">Subiendo…</span>{/if}
  {#if !deshabilitado}
    <label class="anadir">
      {etiqueta}
      <input type="file" multiple accept={acepta || undefined} onchange={(e) => (subir([...e.currentTarget.files]), (e.currentTarget.value = ''))} />
    </label>
  {/if}
</div>

<style>
  .adjuntos {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem;
    border: 1px dashed transparent;
    border-radius: 8px;
    transition: border-color 0.2s, background 0.2s;
  }
  .adjuntos.encima {
    border-color: var(--tu);
    background: var(--tu-velo);
  }
  .adjunto {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.2rem 0.4rem 0.2rem 0.3rem;
    border: 1px solid var(--linea-viva);
    border-radius: 8px;
    font-size: 0.78rem;
  }
  .adjunto img {
    width: 2rem;
    height: 2rem;
    object-fit: cover;
    border-radius: 4px;
  }
  .adjunto.con-aviso {
    border-color: var(--proceso);
  }
  .marca {
    display: inline-grid;
    place-items: center;
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    background: var(--proceso);
    color: var(--humus-hondo);
    font-size: 0.66rem;
    font-weight: 700;
    cursor: help;
  }
  .adjunto a {
    color: var(--tu);
    max-width: 14rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .adjunto button {
    border: 0;
    background: none;
    color: var(--liquen-tenue);
    cursor: pointer;
  }
  .subiendo {
    font-size: 0.78rem;
    color: var(--liquen-tenue);
  }
  .anadir {
    position: relative;
    padding: 0.3rem 0.7rem;
    border: 1px solid var(--linea);
    border-radius: 999px;
    font-size: 0.78rem;
    color: var(--liquen-tenue);
    cursor: pointer;
  }
  .anadir:hover {
    border-color: var(--linea-viva);
    color: var(--liquen);
  }
  .anadir input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
</style>
