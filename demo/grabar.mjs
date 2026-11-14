// Recorre la app del Semillero (servidor de demo en el puerto dado) y graba cada GET a /api en un paquete JSON.
// Uso: node demo/grabar.mjs <carpeta de trabajo con demo-datos/> <puerto>   (lo llama demo/construir.mjs)
import { writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { chromium } from 'playwright-core';

// Chromium: el de $CHROME, el del sistema (en GitHub Actions, google-chrome) o el de playwright
function rutaChrome() {
  const candidatos = [process.env.CHROME, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  const pw = homedir() + '/.cache/ms-playwright';
  if (existsSync(pw)) { const d = readdirSync(pw).filter((x) => /^chromium-\d+$/.test(x)).sort().at(-1); if (d) candidatos.push(`${pw}/${d}/chrome-linux64/chrome`); }
  const r = candidatos.find((c) => c && existsSync(c)); if (!r) throw new Error('No encuentro Chromium (define CHROME)'); return r;
}
const navegador = () => chromium.launch({ executablePath: rutaChrome(), args: ['--no-sandbox'] });

const [S, PUERTO = '4418'] = process.argv.slice(2), B = `http://localhost:${PUERTO}/`;
const paquete = {};
const guardar = async (url, r) => {
  const u = new URL(url); if (!u.pathname.startsWith('/api/')) return;
  const clave = u.pathname + u.search; if (paquete[clave]) return;
  const tipo = r.headers()['content-type'] || '';
  let cuerpo; try { cuerpo = tipo.startsWith('application/json') ? await r.json() : await r.text(); } catch { return; }
  paquete[clave] = { estado: r.status(), json: tipo.startsWith('application/json'), cuerpo };
};
const nav = await navegador(); const p = await nav.newPage();
p.on('response', (r) => r.request().method() === 'GET' && guardar(r.url(), r));
const vistos = new Set(), cola = ['#/'];
const ideas = process.env.IDEAS.trim().split(/\s+/).map((par) => par.split('/'));
for (const [c, i] of ideas) {
  cola.push(`#/idea/${c}/${i}`, `#/carpeta/${c}`);
  try { for (const n of JSON.parse(readFileSync(`${S}/demo-datos/carpetas/${c}/ideas/${i}/germinacion/mapa.json`)).nodos) cola.push(`#/idea/${c}/${i}/nodo/${n.id}`); } catch {}
}
await p.goto(B, { waitUntil: 'networkidle' });
while (cola.length) {
  const h = cola.shift(); if (vistos.has(h)) continue; vistos.add(h);
  await p.evaluate((h) => { location.hash = h; }, h); await p.waitForTimeout(1500);
  await p.waitForLoadState('networkidle').catch(() => {});
  const enlaces = await p.$$eval('a[href^="#/"]', (as) => as.map((a) => a.getAttribute('href')));
  for (const e of enlaces) if (!vistos.has(e) && !e.startsWith('#/ajustes')) cola.push(e);
}
// GET directos que la interfaz pide solo al pulsar pestañas.
const directo = async (ruta) => { const r = await p.request.get(B.slice(0, -1) + ruta); await guardar(B.slice(0, -1) + ruta, { status: () => r.status(), headers: () => r.headers(), json: () => r.json(), text: () => r.text() }); };
for (const [c, i] of ideas) {
  const base = `/api/carpetas/${c}/ideas/${encodeURIComponent(i)}`;
  for (const s of ['', '/glosas', '/germinacion']) await directo(base + s);
  const g = `${S}/demo-datos/carpetas/${c}/ideas/${i}/germinacion`;
  let nodos = []; try { nodos = JSON.parse(readFileSync(`${g}/mapa.json`)).nodos.map((n) => n.id); } catch {}
  for (const n of nodos) {
    for (const t of ['talleres', 'examenes', 'verificaciones']) await directo(`${base}/germinacion/${t}/${encodeURIComponent(n)}`);
    try { for (const x of readdirSync(`${g}/examenes/${n}`)) await directo(`${base}/germinacion/examenes/${encodeURIComponent(n)}/${x.replace(/\.json$/, '')}`); } catch {}
  }
}
for (const r of ['/api/resumen', '/api/carpetas', '/api/ideas', '/api/tipos', '/api/pendientes', '/api/pausadas', '/api/activas', '/api/notas-globales', ...ideas.map(([c]) => `/api/carpetas/${c}/notas`)]) await directo(r);
// Los registros internos de cada ejecución no se publican.
for (const k of Object.keys(paquete)) if (/\/registros/.test(k)) paquete[k] = { estado: 200, json: true, cuerpo: [] };
writeFileSync(`${S}/paquete-demo.json`, JSON.stringify(paquete, (k, v) => (k === 'sessionId' ? undefined : v)));
console.log('vistas:', vistos.size, '· respuestas:', Object.keys(paquete).length);
await nav.close();
