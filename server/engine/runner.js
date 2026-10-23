import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';

// Lanza claude, reenvía cada línea stream-json y la guarda en el registro.
export function ejecutar({ cfg, args, cwd, rutaRegistro, alEvento, senal }) {
  return new Promise((resolve) => {
    fs.mkdirSync(path.dirname(rutaRegistro), { recursive: true });
    const registro = fs.createWriteStream(rutaRegistro, { flags: 'a' });
    const salida = { codigo: null, resultado: undefined, rateLimit: undefined, abortado: false, stderr: '' };
    let terminado = false;

    const hijo = spawn(cfg.claudeBin, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });

    const terminar = (extra = {}) => {
      if (terminado) return;
      terminado = true;
      senal.removeEventListener('abort', abortar);
      registro.end(() => resolve({ ...salida, ...extra }));
    };

    function abortar() {
      salida.abortado = true;
      hijo.kill('SIGINT');
      const t = setTimeout(() => hijo.exitCode === null && hijo.kill('SIGTERM'), 5000);
      t.unref();
    }
    if (senal.aborted) abortar();
    else senal.addEventListener('abort', abortar);

    readline.createInterface({ input: hijo.stdout }).on('line', (linea) => {
      let ev;
      try {
        ev = JSON.parse(linea);
      } catch {
        return;
      }
      registro.write(linea + '\n');
      if (ev.type === 'rate_limit_event') salida.rateLimit = ev.rate_limit_info;
      if (ev.type === 'result') salida.resultado = ev;
      alEvento(ev);
    });
    hijo.stderr.on('data', (d) => {
      salida.stderr = (salida.stderr + d).slice(-4000);
    });
    hijo.on('error', (e) => terminar({ codigo: -1, errorArranque: e.message }));
    hijo.on('close', (codigo) => {
      salida.codigo = codigo;
      terminar();
    });
  });
}
