// Comprueba la web de una asignatura antes de aceptarla: abre cada página en un Chromium sin pantalla, sirviendo
// la carpeta del curso, y exige que cargue sin errores de JavaScript, sin pedir nada fuera del propio curso (el curso
// debe funcionar sin conexión), con contenido real y con el puente de Semillero (glosas). Nunca lanza: informa.
// Exige además un modo oscuro de verdad (se mide la luminosidad de la página en claro y en oscuro) y que no se
// desborde a lo ancho en un móvil. Con `capturas` deja cada página en claro, oscuro y móvil para revisarla.
// También lo usa la sesión redactora: `node server/cursos/probar-sitio.js <carpeta del curso> [--capturas <dir>] [páginas…]`.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MIME = {
  html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8',
  json: 'application/json', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
  woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', wasm: 'application/wasm', glb: 'model/gltf-binary', gltf: 'model/gltf+json',
  mp4: 'video/mp4', webm: 'video/webm', mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav', pdf: 'application/pdf', txt: 'text/plain; charset=utf-8', csv: 'text/csv; charset=utf-8',
};
const MIN_TEXTO = 300;
const DIFERENCIA_TEMAS = 0.25; // luminosidad media (0-1) que debe separar el modo claro del oscuro
const ANCHO_MOVIL = 390;
// El puente real (el que construye Vite); si aún no está construido, uno mínimo que aplica el tema igual.
const PUENTE = fileURLToPath(new URL('../../web/dist/semillero-puente.js', import.meta.url));
const PUENTE_MINIMO = `const t = new URLSearchParams(location.search).get('tema'); if (t) document.documentElement.dataset.tema = t;
window.semillero = { get tema() { return document.documentElement.dataset.tema; }, cambiarTema(t) { document.documentElement.dataset.tema = t; document.dispatchEvent(new CustomEvent('semillero-tema', { detail: { tema: t } })); } };`;

// El Chromium que ya tiene instalado Playwright en esta máquina (o el que diga SEMILLERO_CHROMIUM).
async function chromium() {
  if (process.env.SEMILLERO_CHROMIUM) return process.env.SEMILLERO_CHROMIUM;
  const base = path.join(os.homedir(), '.cache/ms-playwright');
  const dirs = (await fs.readdir(base).catch(() => [])).filter((d) => /^chromium-\d+$/.test(d)).sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
  for (const d of dirs) {
    const exe = path.join(base, d, 'chrome-linux64/chrome');
    if (await fs.access(exe).then(() => true, () => false)) return exe;
  }
  return null;
}

function servir(dir) {
  const raiz = path.resolve(dir);
  const srv = http.createServer(async (req, res) => {
    let url;
    try {
      url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    } catch {
      return res.writeHead(400).end();
    }
    if (url === '/semillero-puente.js') {
      res.writeHead(200, { 'content-type': MIME.js });
      return res.end((await fs.readFile(PUENTE).catch(() => null)) ?? PUENTE_MINIMO);
    }
    // Las piezas que importa el puente (como en Semillero).
    if (/^\/assets\/[A-Za-z0-9_.-]+\.js$/.test(url)) {
      const pieza = await fs.readFile(path.join(path.dirname(PUENTE), url)).catch(() => null);
      if (pieza) {
        res.writeHead(200, { 'content-type': MIME.js });
        return res.end(pieza);
      }
    }
    const ruta = path.resolve(raiz, `.${url}`);
    if (!ruta.startsWith(raiz + path.sep) && ruta !== raiz) return res.writeHead(403).end();
    const datos = await fs.readFile(ruta).catch(() => null);
    if (!datos) return res.writeHead(404).end();
    res.writeHead(200, { 'content-type': MIME[path.extname(ruta).slice(1).toLowerCase()] ?? 'application/octet-stream' });
    res.end(datos);
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv)));
}

// Luminosidad media (0-1) de una captura, decodificada en el propio Chromium.
async function luminosidad(lienzo, png) {
  return lienzo.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = new OffscreenCanvas(80, 50);
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, 80, 50);
    const d = g.getImageData(0, 0, 80, 50).data;
    const lin = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    let s = 0;
    for (let k = 0; k < d.length; k += 4) s += 0.2126 * lin(d[k]) + 0.7152 * lin(d[k + 1]) + 0.0722 * lin(d[k + 2]);
    return s / (d.length / 4);
  }, png.toString('base64'));
}

export async function probarSitio(dir, paginas = ['index.html'], { esperaMs = 1500, capturas = null } = {}) {
  const guardadas = [];
  if (capturas) await fs.mkdir(capturas, { recursive: true });
  const errores = [];
  let chromiumPw;
  try {
    ({ chromium: chromiumPw } = await import('playwright-core'));
  } catch {
    return { ok: false, errores: ['falta playwright-core para comprobar la web'] };
  }
  const exe = await chromium();
  if (!exe) return { ok: false, errores: ['no hay ningún Chromium instalado para comprobar la web'] };
  const srv = await servir(dir);
  const origen = `http://127.0.0.1:${srv.address().port}`;
  const navegador = await chromiumPw.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const lienzo = await navegador.newPage();
  try {
    for (const pagina of paginas) {
      const fallos = [];
      const p = await navegador.newPage({ viewport: { width: 1280, height: 860 } });
      p.on('pageerror', (e) => fallos.push(`error de JavaScript: ${e.message}`));
      p.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && fallos.push(`error en consola: ${m.text().slice(0, 300)}`));
      await p.route('**/*', (ruta) => {
        const u = ruta.request().url();
        if (u.startsWith(origen) || u.startsWith('data:') || u.startsWith('blob:')) return ruta.continue();
        fallos.push(`pide algo de fuera del curso (debe ir descargado dentro de él): ${u.slice(0, 200)}`);
        return ruta.abort();
      });
      p.on('response', (r) => r.status() === 404 && fallos.push(`no existe: ${r.url().replace(origen, '')}`));
      try {
        await p.goto(`${origen}/${pagina}?tema=claro`, { waitUntil: 'load', timeout: 20000 });
        await p.waitForTimeout(esperaMs);
        const { texto, puente } = await p.evaluate(() => ({
          texto: (document.body?.innerText ?? '').trim().length,
          puente: Boolean(document.querySelector('script[src="/semillero-puente.js"]')),
        }));
        if (texto < MIN_TEXTO) fallos.push(`la página está vacía o tiene muy poco contenido (${texto} caracteres)`);
        if (!puente) fallos.push('falta <script type="module" src="/semillero-puente.js"></script> (las glosas no funcionarían)');
        // Modo claro y oscuro: la página entera debe cambiar de verdad.
        const nombre = pagina.replace(/\.html$/, '').replace(/[^a-z0-9-]/gi, '_');
        const claro = await p.screenshot();
        await p.evaluate(() => window.semillero?.cambiarTema('oscuro'));
        await p.waitForTimeout(900);
        const oscuro = await p.screenshot();
        const [lc, lo] = [await luminosidad(lienzo, claro), await luminosidad(lienzo, oscuro)];
        if (lc - lo < DIFERENCIA_TEMAS) {
          fallos.push(`no tiene modo oscuro (o no se distingue del claro): con data-tema="oscuro" la luminosidad media pasa de ${lc.toFixed(2)} a ${lo.toFixed(2)}; debe bajar al menos ${DIFERENCIA_TEMAS}`);
        }
        // Móvil: sin desbordar a lo ancho.
        await p.setViewportSize({ width: ANCHO_MOVIL, height: 800 });
        await p.waitForTimeout(400);
        const ancho = await p.evaluate(() => document.documentElement.scrollWidth);
        if (ancho > ANCHO_MOVIL + 2) fallos.push(`se desborda a lo ancho en un móvil (${ANCHO_MOVIL} px de pantalla, ${ancho} px de página)`);
        if (capturas) {
          const movil = await p.screenshot();
          for (const [sufijo, png] of [['claro', claro], ['oscuro', oscuro], ['movil', movil]]) {
            const f = path.join(capturas, `${nombre}-${sufijo}.png`);
            await fs.writeFile(f, png);
            guardadas.push(f);
          }
        }
      } catch (e) {
        fallos.push(`no se pudo cargar: ${e.message.split('\n')[0]}`);
      }
      await p.close();
      for (const f of [...new Set(fallos)].slice(0, 8)) errores.push(`${pagina}: ${f}`);
    }
  } finally {
    await navegador.close();
    srv.close();
  }
  return { ok: errores.length === 0, paginas: paginas.length, errores, ...(capturas && { capturas: guardadas }) };
}

// Uso desde la línea de órdenes (la sesión redactora): imprime el informe en JSON.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const k = args.indexOf('--capturas');
  const capturas = k >= 0 ? path.resolve(args.splice(k, 2)[1]) : null;
  const [dir, ...paginas] = args;
  const todas = paginas.length ? paginas : (await fs.readdir(dir)).filter((f) => f.endsWith('.html')).sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));
  console.log(JSON.stringify(await probarSitio(dir, todas, { capturas }), null, 2));
}
export const PROBAR_SITIO = fileURLToPath(import.meta.url);
