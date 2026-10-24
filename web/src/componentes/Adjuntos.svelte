<script>
  import { avisar } from '../lib/estado.svelte.js';

  // Lista de adjuntos (imágenes o documentos) con botón para añadir, también arrastrando o pegando.
  // `alSubir(archivo)` devuelve la ruta guardada; `alCambiar(rutas)` recibe la lista nueva.
  let { rutas = [], base, alSubir, alCambiar, deshabilitado = false, acepta = 'image/*,.pdf,.txt,.md,.py,.ipynb,.tex' } = $props();

  let subiendo = $state(0);
  let encima = $state(false);

  async function subir(archivos) {
    let lista = [...rutas];
    for (const a of archivos) {
      subiendo++;
      try {
        lista = [...lista, await alSubir(a)];
        alCambiar(lista);
      } catch (e) {
        avisar(e.message === 'extension-invalida' ? `No se admite «${a.name}»: imágenes o documentos (PDF, txt, md, py, ipynb, tex).` : `No se pudo adjuntar: ${e.message}`, 'error');
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
  const nombre = (r) => r.split('/').at(-1);
  const imagen = (r) => /\.(png|jpe?g|gif|webp)$/i.test(r);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="adjuntos" class:encima ondragover={(e) => (e.preventDefault(), (encima = true))} ondragleave={() => (encima = false)} ondrop={soltar}>
  {#each rutas as r, k (r)}
    <span class="adjunto">
      {#if imagen(r)}<img src="/archivos/{base}/{r}" alt="" />{/if}
      <a href="/archivos/{base}/{r}" target="_blank" rel="noopener">{nombre(r)}</a>
      {#if !deshabilitado}<button aria-label="Quitar {nombre(r)}" onclick={() => alCambiar(rutas.filter((_, j) => j !== k))}>×</button>{/if}
    </span>
  {/each}
  {#if subiendo}<span class="subiendo">Subiendo…</span>{/if}
  {#if !deshabilitado}
    <label class="anadir">
      Adjuntar imagen o documento
      <input type="file" multiple accept={acepta} onchange={(e) => (subir([...e.currentTarget.files]), (e.currentTarget.value = ''))} />
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
