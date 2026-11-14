// Generador de la web de la asignatura «Python científico». Convierte fuente/paginas/*.md en las páginas .html de la
// raíz del curso y copia tipografías, KaTeX y figuras. Uso: node fuente/construir.mjs   (desde cualquier carpeta)
// Usa marked y KaTeX de node_modules de Semillero (ver DISENO.md). La salida es estática: no hace falta para leer.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const CURSO = path.resolve(AQUI, '..');
const NM = process.env.SEMILLERO_NODE_MODULES ?? 'node_modules';
const { marked } = await import(path.join(NM, 'marked/lib/marked.esm.js'));
const katex = (await import(path.join(NM, 'katex/dist/katex.mjs'))).default;

// ─────────────────────────── El programa (orden de navegación) ───────────────────────────
export const PIEZAS = [
  { id: 'index', corto: '⌂', grupo: 0, titulo: 'Portada' },
  { id: 'c01-entorno', corto: 'c1', grupo: 1 }, { id: 'c02-ndarray', corto: 'c2', grupo: 1 },
  { id: 'c03-vectores', corto: 'c3', grupo: 1 }, { id: 'c04-aleatoriedad', corto: 'c4', grupo: 1 },
  { id: 'c05-datos-sucios', corto: 'c5', grupo: 1 }, { id: 'c06-agregar', corto: 'c6', grupo: 1 },
  { id: 'c07-visualizacion', corto: 'c7', grupo: 1 }, { id: 'c08-proyecto', corto: 'c8', grupo: 1 },
  { id: 'p01-entorno', corto: 'p1', grupo: 2 }, { id: 'p02-vectorizar', corto: 'p2', grupo: 2 },
  { id: 'p03-pandas', corto: 'p3', grupo: 2 }, { id: 'p04-paquete', corto: 'p4', grupo: 2 },
  { id: 'v01-einsum', corto: 'v1', grupo: 3 }, { id: 'v02-memoria-distancias', corto: 'v2', grupo: 3 },
  { id: 'v03-reshape-vista', corto: 'v3', grupo: 3 },
];
// Orden de lectura recomendado (para «anterior / siguiente»): cada práctica tras sus conferencias.
const LECTURA = ['index', 'c01-entorno', 'p01-entorno', 'c02-ndarray', 'c03-vectores', 'c04-aleatoriedad', 'p02-vectorizar',
  'c05-datos-sucios', 'c06-agregar', 'c07-visualizacion', 'p03-pandas', 'c08-proyecto', 'p04-paquete',
  'v01-einsum', 'v02-memoria-distancias', 'v03-reshape-vista'];
const TIPO = { c: 'Conferencia', p: 'Clase práctica', v: 'Para valientes' };

// ─────────────────────────── Utilidades ───────────────────────────
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/<[^>]+>/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

function frontMatter(texto) {
  const m = texto.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return { meta: {}, cuerpo: texto };
  const meta = {};
  for (const linea of m[1].split('\n')) {
    const i = linea.indexOf(':');
    if (i < 0) continue;
    const k = linea.slice(0, i).trim(), v = linea.slice(i + 1).trim();
    meta[k] = v.includes(' | ') || k === 'objetivos' ? v.split(' | ').map((x) => x.trim()).filter(Boolean) : v;
  }
  return { meta, cuerpo: texto.slice(m[0].length) };
}

// ─────────────────────────── Resaltado de código (Python y bash) ───────────────────────────
const KW = new Set('False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield'.split(' '));
const BI = new Set('print len range sum min max abs int float str list dict set tuple zip enumerate sorted isinstance type open round any all next super self np pd plt torch sns pytest'.split(' '));
function resaltar(codigo, lengua) {
  if (!['python', 'py', 'bash', 'sh', 'powershell', 'toml', 'ini', 'pycon'].includes(lengua)) return esc(codigo);
  const py = lengua.startsWith('py');
  const re = py
    ? /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|\b[rbfRBF]{0,2}"(?:\\.|[^"\\\n])*"|\b[rbfRBF]{0,2}'(?:\\.|[^'\\\n])*')|(\b\d[\d_]*(?:\.\d*)?(?:[eE][+-]?\d+)?j?\b)|(^[ \t]*@[\w.]+)|([A-Za-z_]\w*)/gm
    : /(#[^\n]*)|("(?:\\.|[^"\\\n])*"|'[^'\n]*')|(\b\d+(?:\.\d+)?\b)|(\s--?[A-Za-z][\w-]*)|(^\s*[A-Za-z_][\w.-]*|\$\{?\w+\}?)/gm;
  let salida = '', ultimo = 0;
  for (const m of codigo.matchAll(re)) {
    salida += esc(codigo.slice(ultimo, m.index));
    const [t, com, cad, num, dec, pal] = m;
    if (com) salida += `<span class="tk-c">${esc(t)}</span>`;
    else if (cad) salida += `<span class="tk-s">${esc(t)}</span>`;
    else if (num) salida += `<span class="tk-n">${esc(t)}</span>`;
    else if (dec) salida += py ? `<span class="tk-d">${esc(t)}</span>` : `<span class="tk-o">${esc(t)}</span>`;
    else if (pal) {
      if (py) salida += KW.has(t) ? `<span class="tk-k">${t}</span>` : BI.has(t) ? `<span class="tk-b">${t}</span>` : t;
      else salida += `<span class="tk-k">${esc(t)}</span>`;
    } else salida += esc(t);
    ultimo = m.index + t.length;
  }
  return salida + esc(codigo.slice(ultimo));
}

// ─────────────────────────── Markdown con extensiones ───────────────────────────
let RESERVA = [];
const guardar = (html, tipo = 'I') => { RESERVA.push(html); return `@@${tipo}${RESERVA.length - 1}@@`; };
function restaurar(html) {
  let previo;
  do {
    previo = html;
    html = html.replace(/<p>@@B(\d+)@@<\/p>/g, (_, i) => RESERVA[i]).replace(/@@[BI](\d+)@@/g, (_, i) => RESERVA[i]);
  } while (html !== previo);
  return html;
}

function tex(codigo, display) {
  const limpio = codigo.replace(/^\s*>\s?/gm, '');
  return katex.renderToString(limpio, { displayMode: display, throwOnError: false, strict: 'ignore', output: 'htmlAndMathml' });
}

function protegerEnLinea(texto) {
  return texto
    .replace(/``\s?((?:[^`]|`(?!`))+?)\s?``/g, (_, c) => guardar(`<code>${esc(c)}</code>`))
    .replace(/`([^`\n]+)`/g, (_, c) => guardar(`<code>${esc(c)}</code>`))
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, c) => guardar(tex(c, true)))
    .replace(/(?<![\\$\w])\$(?!\s)([^$\n]+?)(?<![\s\\])\$(?![\w$])/g, (_, c) => guardar(tex(c, false)));
}
const enLinea = (t) => restaurar(marked.parseInline(protegerEnLinea(String(t ?? '').trim())));

const NIVEL = { concepto: 1, estrategia: 2, arranque: 3, desbloqueo: 4 };
function bloque(tipo, args, contenido) {
  const [antes, despues = ''] = contenido.split(/\n---\n/);
  switch (tipo) {
    case 'solucion':
      return `<details class="sol"><summary><span class="tag">Respuesta</span><span class="sum-t">${enLinea(args || 'Ver la respuesta')}</span></summary><div class="dentro">${fragmento(contenido)}</div></details>`;
    case 'pista': {
      const n = NIVEL[args.toLowerCase().split(/\s/)[0]] ?? 1;
      const barras = [1, 2, 3, 4].map((k) => `<i class="${k <= n ? 'on' : ''}"></i>`).join('');
      return `<details class="pista"><summary><span class="nivel" aria-hidden="true">${barras}</span><span class="tag">Pista ${n}</span><span class="sum-t">${enLinea(args)}</span></summary><div class="dentro">${fragmento(contenido)}</div></details>`;
    }
    case 'predice': {
      const lineas = antes.split('\n');
      const enunciado = [], opciones = [];
      let correcta = -1;
      for (const l of lineas) {
        const m = l.match(/^- \[( |x)\] (.*)$/);
        if (m) { if (m[1] === 'x') correcta = opciones.length; opciones.push(m[2]); } else enunciado.push(l);
      }
      const ops = opciones.map((o, i) => `<li><button type="button" data-i="${i}"><span class="letra">${'ABCDEFG'[i]}</span><span>${enLinea(o)}</span></button></li>`).join('');
      return `<div class="predice" data-correcta="${correcta}"><span class="etq">Predice antes de seguir</span><p class="q">${enLinea(args)}</p>${enunciado.join('\n').trim() ? fragmento(enunciado.join('\n')) : ''}<ol class="opciones">${ops}</ol><details class="revela"><summary>Comprométete con una opción y después mira la explicación</summary><div class="dentro">${fragmento(despues)}</div></details></div>`;
    }
    case 'autoexplica':
      return `<div class="autoexp"><span class="etq">Explícalo con tus palabras</span>${fragmento(`**${args}** ${antes}`)}<textarea aria-label="Tu explicación" placeholder="Escribe aquí tu explicación antes de abrir la respuesta modelo…"></textarea><details><summary>Compara con una respuesta modelo</summary><div class="dentro">${fragmento(despues)}</div></details></div>`;
    case 'widget': {
      const [nombre, ...resto] = args.split(' ');
      let opciones = '{}', pie = contenido.trim();
      if (pie.startsWith('{')) { const fin = pie.indexOf('\n'); opciones = fin < 0 ? pie : pie.slice(0, fin); pie = fin < 0 ? '' : pie.slice(fin + 1); }
      JSON.parse(opciones);
      return `<figure class="widget" data-widget="${esc(nombre)}" data-opciones="${esc(opciones)}"><div class="w-cab"><span class="w-tit">${enLinea(resto.join(' '))}</span><span class="w-tipo">motor interactivo</span></div><div class="w-cuerpo"><p class="sin-js">Esta visualización necesita JavaScript.</p></div>${pie ? `<figcaption>${enLinea(pie)}</figcaption>` : ''}</figure>`;
    }
    case 'error':
      return `<aside class="caja refuta"><p><strong>Error típico: ${enLinea(args)}</strong></p>${fragmento(contenido)}</aside>`;
    case 'umbral':
      return `<aside class="caja umbral"><p><strong>Concepto umbral: ${enLinea(args)}</strong></p>${fragmento(contenido)}</aside>`;
    case 'llevas':
      return `<div class="caja llevas"><p><strong>${enLinea(args || 'Ideas que te llevas')}</strong></p>${fragmento(contenido)}</div>`;
    case 'ancho':
      return `<div class="ancho">${fragmento(contenido)}</div>`;
    default:
      throw new Error(`bloque desconocido: ${tipo}`);
  }
}

const CAJAS = [
  [/^(Definición)/, 'def'], [/^(Teorema|Proposición|Lema|Corolario|Hipótesis)/, 'teo'], [/^(Observación)/, 'obs'],
  [/^(Ejemplo)/, 'ejemplo'], [/^(Objetivos)/, 'objetivos'], [/^(Prerrequisitos)/, 'prereq'], [/^(Problema para pensar|Problema)/, 'reto'],
  [/^(Regla)/, 'def'],
];
function postProcesar(html) {
  return html
    .replace(/<blockquote>\s*<p><strong>([\s\S]*?)<\/strong>/g, (m, t) => {
      const plano = t.replace(/<[^>]+>/g, '');
      const clase = CAJAS.find(([re]) => re.test(plano))?.[1] ?? 'nota';
      return `<div class="caja ${clase}"><p><strong>${t}</strong>`;
    })
    .replace(/<blockquote>/g, '<div class="caja nota">').replace(/<\/blockquote>/g, '</div>')
    .replace(/<table>/g, '<div class="tabla"><table>').replace(/<\/table>/g, '</table></div>')
    .replace(/<p><img src="([^"]+)" alt="([^"]*)"\s*\/?><\/p>/g, (_, src, alt) => `<figure><img src="${src}" alt="${alt}" loading="lazy"><figcaption>${alt}</figcaption></figure>`)
    .replace(/href="([a-z0-9-]+)\.md(#[^"]*)?"/g, (_, f, h = '') => `href="${f === 'python-cientifico' ? 'index' : f}.html${h}"`)
    .replace(/<a href="((?:https?:|\.\.\/\.\.\/recursos\/)[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener"');
}

function fragmento(texto) {
  // Bloques ::: (no anidados). Las cercas de código ya están protegidas.
  const lineas = texto.split('\n'), salida = [];
  for (let i = 0; i < lineas.length; i++) {
    const m = lineas[i].match(/^:::([a-z]+)\s*(.*)$/);
    if (!m) { salida.push(lineas[i]); continue; }
    let j = i + 1;
    while (j < lineas.length && lineas[j].trim() !== ':::') j++;
    if (j >= lineas.length) throw new Error(`bloque :::${m[1]} sin cerrar: ${lineas[i]}`);
    salida.push('', guardar(bloque(m[1], m[2].trim(), lineas.slice(i + 1, j).join('\n')), 'B'), '');
    i = j;
  }
  return postProcesar(marked.parse(protegerEnLinea(salida.join('\n')), { gfm: true }));
}

function documento(texto) {
  RESERVA = [];
  // Cercas de código, también dentro de citas («> ```python»): se quitan los prefijos y se deja un hueco.
  const sinCodigo = texto.replace(/^((?:>[ \t]?)*)```([\w-]*)[^\n]*\n([\s\S]*?)^\1```[ \t]*$/gm, (_, pre, lengua, cod) => {
    const limpio = pre ? cod.split('\n').map((l) => l.replace(/^(?:>[ \t]?)+/, (p) => p.slice(Math.min(p.length, pre.length)))).join('\n') : cod;
    const etiqueta = lengua && lengua !== 'text' ? `<span class="lengua">${esc(lengua)}</span>` : '';
    const ph = guardar(`<div class="codigo">${etiqueta}<button type="button" class="copiar" aria-label="Copiar el código">copiar</button><pre><code>${resaltar(limpio.replace(/\n$/, ''), lengua)}</code></pre></div>`, 'B');
    const vacio = pre.trimEnd();
    return pre ? `${vacio}\n${pre}${ph}\n${vacio}` : ph;
  });
  let html = restaurar(fragmento(sinCodigo));
  const toc = [];
  html = html.replace(/<h2>([\s\S]*?)<\/h2>/g, (_, t) => {
    const plano = t.replace(/<span class="katex-mathml">[\s\S]*?<\/math><\/span>/g, '').replace(/<[^>]+>/g, '');
    const m = plano.match(/^(\d+)\.\s+/);
    const id = slug(plano.replace(/^\d+\.\s+/, '')) || `s${toc.length + 1}`;
    const titulo = m ? t.replace(/^(\d+)\.\s+/, '') : t;
    toc.push({ id, titulo: plano.replace(/^\d+\.\s+/, ''), n: m?.[1] });
    return `<h2 id="${id}">${m ? `<span class="n">§ ${m[1]}</span>` : ''}${titulo}</h2>`;
  });
  html = html.replace(/<h3>([\s\S]*?)<\/h3>/g, (_, t) => `<h3 id="${slug(t)}">${t}</h3>`);
  return { html, toc };
}

// ─────────────────────────── Plantilla ───────────────────────────
function tira(actual, titulos) {
  const grupos = [0, 1, 2, 3].map((g) => PIEZAS.filter((p) => p.grupo === g).map((p) => {
    const tipo = p.id === 'index' ? '' : p.id[0];
    const t = titulos[p.id] ?? p.id;
    return `<a class="byte ${tipo}${p.id === actual ? ' actual' : ''}" href="${p.id}.html" data-pieza="${p.id}" title="${esc(t)}" aria-label="${esc(t)}"${p.id === actual ? ' aria-current="page"' : ''}>${p.corto}</a>`;
  }).join(''));
  return `<nav class="tira" aria-label="Programa de la asignatura">${grupos.map((g) => `<span class="grupo">${g}</span>`).join('')}</nav>`;
}

function pagina({ id, meta, html, toc, titulos }) {
  const k = LECTURA.indexOf(id);
  const ant = LECTURA[k - 1], sig = LECTURA[k + 1];
  const tipo = TIPO[id[0]] ?? '';
  const num = meta.num ? `<span class="num">${esc(meta.num)}</span>` : '';
  const cabeza = id === 'index' ? '' : `<header class="cabeza"><div class="tipo">${num}<span>${tipo}</span></div><h1>${enLinea(meta.titulo)}</h1>${meta.resumen ? `<p class="resumen">${enLinea(meta.resumen)}</p>` : ''}${meta.metas ? `<div class="metas">${[].concat(meta.metas).map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : ''}</header>`;
  const rail = toc.length ? `<aside class="rail" aria-label="En esta página"><h2>En esta página</h2><ol>${toc.map((s) => `<li><a href="#${s.id}" data-seccion="${s.id}">${esc(s.titulo)}</a></li>`).join('')}</ol>${id !== 'index' ? '<a class="volver" href="index.html">← Programa de la asignatura</a>' : ''}</aside>` : '<aside class="rail"></aside>';
  const pie = `<nav class="pie" aria-label="Anterior y siguiente">${ant ? `<a class="ant" href="${ant}.html"><small>← Anterior</small><span>${esc(titulos[ant])}</span></a>` : '<span></span>'}${sig ? `<a class="sig" href="${sig}.html"><small>Siguiente →</small><span>${esc(titulos[sig])}</span></a>` : ''}</nav>`;
  const tituloDoc = id === 'index' ? 'Python científico y entorno de trabajo' : `${meta.titulo.replace(/`/g, '')} · Python científico`;
  // En la portada, la escena de entrada va fuera de la hoja de lectura (delimitada en index.md con <!--heroe-->)
  let heroe = '';
  html = html.replace(/<!--heroe-->([\s\S]*?)<!--\/heroe-->/, (_, h) => { heroe = h; return ''; });
  const interruptor = `<button type="button" class="interruptor" aria-label="Cambiar de tema"><svg class="sol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg><svg class="luna" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/></svg></button>`;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script>document.documentElement.dataset.tema = new URLSearchParams(location.search).get('tema') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro')</script>
<script>document.documentElement.classList.add('js')</script>
<title>${esc(tituloDoc)}</title>
<meta name="description" content="${esc(meta.resumen ?? meta.lema ?? '')}">
<meta name="theme-color" content="#f3efe4" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0b0f15" media="(prefers-color-scheme: dark)">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' rx='3.5' fill='%231b1e25'/%3E%3Crect x='2.5' y='2.5' width='3' height='3' rx='.6' fill='%230072b2'/%3E%3Crect x='6.5' y='2.5' width='3' height='3' rx='.6' fill='%23555b66'/%3E%3Crect x='10.5' y='2.5' width='3' height='3' rx='.6' fill='%230072b2'/%3E%3Crect x='2.5' y='6.5' width='3' height='3' rx='.6' fill='%23555b66'/%3E%3Crect x='6.5' y='6.5' width='3' height='3' rx='.6' fill='%23e69f00'/%3E%3Crect x='10.5' y='6.5' width='3' height='3' rx='.6' fill='%23555b66'/%3E%3Crect x='2.5' y='10.5' width='3' height='3' rx='.6' fill='%230072b2'/%3E%3Crect x='6.5' y='10.5' width='3' height='3' rx='.6' fill='%23555b66'/%3E%3Crect x='10.5' y='10.5' width='3' height='3' rx='.6' fill='%23cc79a7'/%3E%3C/svg%3E">
<link rel="stylesheet" href="lib/katex/katex.min.css">
<link rel="stylesheet" href="css/curso.css">
<script type="module" src="/semillero-puente.js"></script>
<script type="module" src="motores/sitio.js"></script>
</head>
<body data-pieza="${id}"${id === 'index' ? ' class="portada"' : ''}>
<canvas id="fondo" aria-hidden="true"></canvas>
<a class="salto" href="#contenido">Saltar al contenido</a>
<header class="barra"><a class="marca" href="index.html"><span class="chip" aria-hidden="true">${'<i></i>'.repeat(9)}</span>Python científico</a>${tira(id, titulos)}${interruptor}<span class="progreso" aria-hidden="true"></span></header>
<div class="pagina">
${rail}
<main id="contenido">
${heroe}
${cabeza}
<article class="texto">
${html}
</article>
${pie}
</main>
</div>
</body>
</html>
`;
}

// ─────────────────────────── Copia de recursos ───────────────────────────
function copiar(origen, destino) {
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.copyFileSync(origen, destino);
}
function recursos() {
  const fs_ = (a, b) => copiar(path.join(NM, a), path.join(CURSO, b));
  fs_('katex/dist/katex.min.css', 'lib/katex/katex.min.css');
  fs_('katex/LICENSE', 'lib/katex/LICENSE');
  for (const f of fs.readdirSync(path.join(NM, 'katex/dist/fonts'))) if (f.endsWith('.woff2')) fs_(`katex/dist/fonts/${f}`, `lib/katex/fonts/${f}`);
  fs_('@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2', 'fuentes/bricolage-grotesque-wght.woff2');
  fs_('@fontsource/literata/files/literata-latin-400-normal.woff2', 'fuentes/literata-400.woff2');
  fs_('@fontsource/literata/files/literata-latin-400-italic.woff2', 'fuentes/literata-400-italic.woff2');
  fs_('@fontsource/literata/files/literata-latin-600-normal.woff2', 'fuentes/literata-600.woff2');
  fs_('@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2', 'fuentes/jetbrains-mono-400.woff2');
  fs_('@fontsource/jetbrains-mono/files/jetbrains-mono-latin-600-normal.woff2', 'fuentes/jetbrains-mono-600.woff2');
  fs_('@fontsource-variable/bricolage-grotesque/LICENSE', 'fuentes/LICENCIA-bricolage-grotesque.txt');
  fs_('@fontsource/literata/LICENSE', 'fuentes/LICENCIA-literata.txt');
  fs_('@fontsource/jetbrains-mono/LICENSE', 'fuentes/LICENCIA-jetbrains-mono.txt');
  const figuras = path.resolve(CURSO, '../../../figuras/python-cientifico');
  if (fs.existsSync(figuras)) for (const f of fs.readdirSync(figuras)) if (f.endsWith('.png')) copiar(path.join(figuras, f), path.join(CURSO, 'img', f));
}

// ─────────────────────────── Programa de la portada ───────────────────────────
function programa(metas) {
  const fila = (id) => {
    const m = metas[id];
    if (!m) return '';
    const cls = id[0];
    return `<a class="${cls}" href="${id}.html"><span class="cod">${id.slice(0, 3).toUpperCase()}</span><span><span class="t">${enLinea(m.titulo)}</span><span class="r">${enLinea(m.resumen ?? '')}</span></span><span class="h">${esc(m.horas ?? '')}</span></a>`;
  };
  const seccion = (titulo, ids) => `<h3>${titulo}</h3>${ids.map(fila).join('')}`;
  return `<div class="programa ancho">${seccion('Conferencias', PIEZAS.filter((p) => p.grupo === 1).map((p) => p.id))}${seccion('Clases prácticas', PIEZAS.filter((p) => p.grupo === 2).map((p) => p.id))}${seccion('Demostraciones para valientes', PIEZAS.filter((p) => p.grupo === 3).map((p) => p.id))}</div>`;
}

// ─────────────────────────── Principal ───────────────────────────
recursos();
const fuentes = {};
for (const p of PIEZAS) {
  const ruta = path.join(AQUI, 'paginas', `${p.id}.md`);
  if (fs.existsSync(ruta)) fuentes[p.id] = frontMatter(fs.readFileSync(ruta, 'utf8'));
}
const titulos = Object.fromEntries(Object.entries(fuentes).map(([id, f]) => [id, f.meta.titulo?.replace(/`/g, '') ?? id]));
const metas = Object.fromEntries(Object.entries(fuentes).map(([id, f]) => [id, f.meta]));
const resumenIndice = [];
for (const [id, { meta, cuerpo }] of Object.entries(fuentes)) {
  const cuerpoFinal = cuerpo.replace('{{programa}}', '\n:::ancho\n@@PROGRAMA@@\n:::\n');
  let { html, toc } = documento(cuerpoFinal);
  html = html.replace(/<p>@@PROGRAMA@@<\/p>|@@PROGRAMA@@/, programa(metas));
  fs.writeFileSync(path.join(CURSO, `${id}.html`), pagina({ id, meta, html, toc, titulos }));
  resumenIndice.push({ id, palabras: html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length });
}
console.log(JSON.stringify(resumenIndice));
