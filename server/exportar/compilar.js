// Compila el lanzador Go con el sitio embebido: un solo archivo estático por sistema operativo.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const ejecutar = promisify(execFile);
const LANZADOR = fileURLToPath(new URL('./lanzador/', import.meta.url));
export const SISTEMAS = { linux: 'linux', windows: 'windows' };

// Una compilación cada vez: cada una copia el sitio entero y ocupa CPU y disco.
let cola = Promise.resolve();

export function compilar({ sitio, so, salida }) {
  if (!Object.hasOwn(SISTEMAS, so)) return Promise.reject(new Error('so-invalido'));
  const turno = cola.then(() => compilarAhora({ sitio, so, salida }));
  cola = turno.catch(() => {});
  return turno;
}

async function compilarAhora({ sitio, so, salida }) {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'semillero-go-'));
  try {
    for (const f of ['main.go', 'go.mod']) await fs.copyFile(path.join(LANZADOR, f), path.join(tmp, f));
    await fs.cp(sitio, path.join(tmp, 'sitio'), { recursive: true });
    await ejecutar('go', ['build', '-trimpath', '-ldflags', '-s -w', '-o', salida, '.'], {
      cwd: tmp,
      env: { ...process.env, GOOS: SISTEMAS[so], GOARCH: 'amd64', CGO_ENABLED: '0', GOTOOLCHAIN: 'local', GOFLAGS: '' },
      maxBuffer: 16 * 1024 * 1024,
    });
    return salida;
  } catch (e) {
    throw new Error(`compilacion-fallida: ${String(e.stderr ?? e.message).slice(0, 2000)}`);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}
