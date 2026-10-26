// Comprueba una escena antes de aceptarla en un curso (ver hijo.mjs). Nunca lanza: devuelve un informe.
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HIJO = fileURLToPath(new URL('./hijo.mjs', import.meta.url));
const REPO = fileURLToPath(new URL('../../', import.meta.url));

export function probarEscena(ruta, { limiteMs = 15000 } = {}) {
  // Solo puede leer el motor de escenas, KaTeX y la propia escena: nada de los datos del usuario (que suelen
  // vivir dentro del repositorio), ni escribir, ni lanzar procesos. Node 24 aún no limita la red.
  const lectura = ['web/src/escena/', 'server/escenas/', 'node_modules/katex/', 'package.json'].map((p) => `--allow-fs-read=${path.join(REPO, p)}`);
  const args = ['--permission', ...lectura, `--allow-fs-read=${path.resolve(ruta)}`, HIJO, path.resolve(ruta)];
  return new Promise((resolve) => {
    execFile(process.execPath, args, { timeout: limiteMs, maxBuffer: 1024 * 1024, killSignal: 'SIGKILL' }, (err, stdout, stderr) => {
      if (err?.killed) return resolve({ ok: false, errores: [`la escena tardó más de ${limiteMs / 1000} s en dibujarse (¿un bucle sin fin?): se agotó el tiempo`] });
      try {
        resolve(JSON.parse(stdout.trim().split('\n').at(-1)));
      } catch {
        resolve({ ok: false, errores: [String(stderr || err?.message || 'la comprobación no respondió').trim().split('\n').slice(-3).join(' ')] });
      }
    });
  });
}
