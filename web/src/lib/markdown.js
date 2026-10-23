import { Marked } from 'marked';
import katex from 'katex';

const ENTORNOS = /^\*\*(Definición|Teorema|Lema|Proposición|Corolario|Observación|Ejemplo|Demostración|Conjetura|Hipótesis)\b/;
const sinTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const escapar = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function tex(fuente, displayMode) {
  return katex.renderToString(fuente, { displayMode, throwOnError: false, strict: 'ignore', trust: false });
}

const matematicas = {
  extensions: [
    {
      name: 'mathBloque',
      level: 'block',
      start: (src) => src.indexOf('$$'),
      tokenizer(src) {
        const m = src.match(/^\$\$([\s\S]+?)\$\$[ \t]*(?:\n|$)/);
        if (m) return { type: 'mathBloque', raw: m[0], text: m[1].trim() };
      },
      renderer: (t) => `${tex(t.text, true)}\n`,
    },
    {
      name: 'mathLinea',
      level: 'inline',
      start: (src) => src.indexOf('$'),
      tokenizer(src) {
        // Sin espacio al abrir ni al cerrar, y sin cifra justo después: «$5 y $10» no es matemática.
        const m = src.match(/^\$\$([^$]+?)\$\$|^\$(?!\s)((?:\\.|[^\\$\n])+?)(?<!\s)\$(?!\d)/);
        if (m) return { type: 'mathLinea', raw: m[0], text: (m[1] ?? m[2]).trim(), display: Boolean(m[1]) };
      },
      renderer: (t) => tex(t.text, t.display),
    },
  ],
};

export function crearRenderizador(purificador) {
  return function renderizar(md, baseArchivos = '') {
    const resolver = (href) =>
      /^(https?:|data:|\/)/i.test(href) || !baseArchivos ? href : `/archivos/${baseArchivos}/${href.replace(/^\.\//, '')}`;

    const marked = new Marked({ gfm: true, breaks: false });
    marked.use(matematicas);
    marked.use({
      renderer: {
        image({ href, title, text }) {
          const src = escapar(resolver(href ?? ''));
          const pie = title || text;
          const img = `<img src="${src}" alt="${escapar(text ?? '')}" loading="lazy">`;
          return pie ? `<figure>${img}<figcaption>${escapar(pie)}</figcaption></figure>` : img;
        },
        link({ href, title, tokens }) {
          const texto = this.parser.parseInline(tokens);
          const externo = /^https?:/i.test(href);
          const t = title ? ` title="${escapar(title)}"` : '';
          return `<a href="${escapar(href)}"${t}${externo ? ' target="_blank" rel="noopener noreferrer"' : ''}>${texto}</a>`;
        },
        blockquote({ tokens, raw }) {
          const cuerpo = this.parser.parse(tokens);
          const m = raw.replace(/^>\s*/, '').match(ENTORNOS);
          if (!m) return `<blockquote>${cuerpo}</blockquote>\n`;
          return `<aside class="entorno entorno-${sinTildes(m[1])}">${cuerpo}</aside>\n`;
        },
      },
    });

    const html = marked.parse(String(md ?? ''));
    return purificador.sanitize(html, {
      ADD_ATTR: ['target'],
      ADD_TAGS: ['semantics', 'annotation'],
    });
  };
}

// Crepe solo reconoce $$…$$ como bloque si los delimitadores van en su propia línea.
export const normalizarParaEditor = (md) => String(md ?? '').replace(/^\$\$([^\n]+?)\$\$[ \t]*$/gm, '$$$$\n$1\n$$$$');
