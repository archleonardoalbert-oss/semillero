// Construye la demo pública de solo lectura del Semillero en dist-demo/ (la ejecuta GitHub Actions al leer
// raven.json). Usa solo lo que hay en el repo: la instantánea pública de demo/datos (dos ideas autorizadas),
// un servidor desechable con Claude desactivado, la grabación de las respuestas de la API y la compilación
// en modo demo. Uso, desde la raíz del repo: node demo/construir.mjs
import { spawn, execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, mkdirSync, readdirSync, statSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const IDEAS = 'cursos/ai neurociencia/ablacion-virtual-espectral-del-conectoma-de-c-elegans-frente';
const DESTINO = 'dist-demo';
const puertoLibre = () => new Promise((ok) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
const esperar = async (url, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if ((await fetch(url)).ok) return; } catch {} await new Promise((r) => setTimeout(r, 250)); } throw new Error(`El servidor de demo no respondió en ${url}`); };
const archivos = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? archivos(p) : [p]; });

const tmp = mkdtempSync(join(tmpdir(), 'semillero-demo-'));
let servidor;
try {
  // el servidor sirve la interfaz compilada (web/dist): en un clon limpio no existe todavía
  execFileSync('npm', ['run', 'build', '--silent'], { stdio: 'inherit' });
  cpSync('demo/datos', join(tmp, 'demo-datos'), { recursive: true });  // el servidor puede escribir: trabaja sobre una copia
  const puerto = await puertoLibre();
  servidor = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, SEMILLERO_DATOS: join(tmp, 'demo-datos'), SEMILLERO_PUERTO: String(puerto), SEMILLERO_CLAUDE: '/bin/false' }, stdio: 'ignore' });
  await esperar(`http://127.0.0.1:${puerto}/api/resumen`);
  execFileSync(process.execPath, ['demo/grabar.mjs', tmp, String(puerto)], { env: { ...process.env, IDEAS }, stdio: 'inherit' });
  servidor.kill(); servidor = null;

  execFileSync('npx', ['vite', 'build', '--config', 'vite.demo.config.js', '--logLevel', 'warn'], { cwd: 'web', stdio: 'inherit' });
  rmSync(DESTINO, { recursive: true, force: true });
  cpSync('web/dist-demo', DESTINO, { recursive: true });
  mkdirSync(join(DESTINO, 'demo/archivos'), { recursive: true });
  cpSync(join(tmp, 'paquete-demo.json'), join(DESTINO, 'demo/paquete.json'));
  cpSync(join(tmp, 'demo-datos/carpetas'), join(DESTINO, 'demo/archivos/carpetas'), { recursive: true });
  for (const f of archivos(join(DESTINO, 'demo/archivos'))) {
    if (f.endsWith('/idea.json')) unlinkSync(f);
    // las webs de curso piden el puente en la raíz del sitio; en Raven vive junto a la demo (/semillero/)
    else if (f.endsWith('.html')) writeFileSync(f, readFileSync(f, 'utf8').replaceAll('src="/semillero-puente.js"', 'src="/semillero/semillero-puente.js"'));
  }
  console.log(`Demo del Semillero en ${DESTINO}`);
} finally {
  servidor?.kill();
  rmSync(tmp, { recursive: true, force: true });
}
