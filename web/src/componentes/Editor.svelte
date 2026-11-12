<script>
  import { RAIZ_ARCHIVOS } from '../lib/archivos.js';
  import { onMount } from 'svelte';
  import { Crepe } from '@milkdown/crepe';
  import '@milkdown/crepe/theme/common/style.css';
  import { normalizarParaEditor } from '../lib/markdown.js';

  // Editor WYSIWYG: se escribe Markdown y se ve ya formateado, con LaTeX de KaTeX.
  let { valor = '', base, marcador = 'Escribe…', alCambiar, alSubirImagen, soloLectura = false, autofoco = false } = $props();

  let raiz;
  let crepe;

  const aUrl = (url) => (/^(https?:|data:|blob:|\/)/i.test(url) ? url : `${RAIZ_ARCHIVOS}/${base}/${url}`);

  onMount(() => {
    crepe = new Crepe({
      root: raiz,
      defaultValue: normalizarParaEditor(valor),
      features: { [Crepe.Feature.AI]: false, [Crepe.Feature.TopBar]: false },
      featureConfigs: {
        [Crepe.Feature.Placeholder]: { text: marcador, mode: 'doc' },
        [Crepe.Feature.Latex]: { katexOptions: { throwOnError: false, strict: 'ignore' } },
        [Crepe.Feature.ImageBlock]: {
          onUpload: alSubirImagen,
          proxyDomURL: aUrl,
          blockUploadPlaceholderText: 'o pega aquí un enlace',
          blockCaptionPlaceholderText: 'Pie de figura',
          blockUploadButton: 'Subir imagen',
          blockConfirmButton: 'Aceptar',
          inlineUploadButton: 'Subir',
          inlineUploadPlaceholderText: 'o pega un enlace',
          inlineConfirmButton: 'Aceptar',
        },
      },
    });
    crepe.on((l) => l.markdownUpdated((_ctx, md, previo) => md !== previo && alCambiar?.(md)));
    crepe.create().then(() => {
      crepe.setReadonly(soloLectura);
      if (autofoco) raiz.querySelector('.ProseMirror')?.focus();
    });
    return () => crepe.destroy();
  });

  $effect(() => {
    crepe?.setReadonly(soloLectura);
  });
</script>

<div class="editor" class:solo-lectura={soloLectura} bind:this={raiz}></div>

<style>
  .editor :global(.milkdown) {
    --crepe-color-background: transparent;
    --crepe-color-on-background: var(--liquen);
    --crepe-color-surface: var(--superficie);
    --crepe-color-surface-low: var(--superficie-alta);
    --crepe-color-on-surface: var(--liquen);
    --crepe-color-on-surface-variant: var(--liquen-tenue);
    --crepe-color-outline: var(--linea-viva);
    --crepe-color-primary: var(--tu);
    --crepe-color-secondary: var(--superficie-alta);
    --crepe-color-on-secondary: var(--liquen);
    --crepe-color-inverse: var(--liquen);
    --crepe-color-on-inverse: var(--humus);
    --crepe-color-inline-code: var(--aclaracion);
    --crepe-color-error: var(--rechazada);
    --crepe-color-hover: var(--superficie-alta);
    --crepe-color-selected: rgb(158 197 255 / 0.16);
    --crepe-color-inline-area: var(--superficie);
    --crepe-base-font-size: 19px;
    --crepe-font-title: var(--serif);
    --crepe-font-default: var(--serif);
    --crepe-font-code: var(--mono);
    --crepe-shadow-1: 0 2px 8px rgb(0 0 0 / 0.4);
    --crepe-shadow-2: 0 8px 30px rgb(0 0 0 / 0.5);
    background: transparent;
  }
  .editor :global(.milkdown .ProseMirror) {
    padding: 0.4rem 0 1rem 0;
    font-family: var(--serif);
    line-height: 1.65;
  }
  .editor :global(.milkdown .ProseMirror p) {
    font-size: 1.12rem;
  }
  .editor :global(.milkdown .ProseMirror :is(h1, h2, h3)) {
    font-family: var(--sans);
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .editor :global(.milkdown .ProseMirror blockquote) {
    border-left-color: var(--tu);
  }
  .editor :global(.milkdown .milkdown-block-handle) {
    color: var(--liquen-apagado);
  }
</style>
