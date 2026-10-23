import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existe } from '../store/fsutil.js';

const exec = promisify(execFile);

// Un patrón es una ruta exacta o un prefijo terminado en "/**".
export function casa(ruta, patron) {
  return patron.endsWith('/**') ? ruta.startsWith(patron.slice(0, -2)) : ruta === patron;
}

// Protege los textos del usuario: datos/ es un repo git; el servidor commitea
// cada escritura suya al momento, así que lo no commiteado fuera de lo permitido
// a una sesión es ajeno y se restaura.
export function crearGuard(cfg) {
  let cadena = Promise.resolve();
  const enSerie = (fn) => {
    const r = cadena.then(fn, fn);
    cadena = r.catch(() => {});
    return r;
  };
  const git = (...args) => exec('git', args, { cwd: cfg.datos, maxBuffer: 64 * 1024 * 1024 });

  async function iniciar() {
    await fs.mkdir(cfg.datos, { recursive: true });
    await enSerie(async () => {
      const nuevo = !(await existe(path.join(cfg.datos, '.git')));
      if (nuevo) {
        await git('init', '-q');
        await git('config', 'user.name', 'Semillero');
        await git('config', 'user.email', 'semillero@localhost');
        await git('config', 'core.quotepath', 'false');
      }
      // Solo este servidor usa este repo: un lock al arrancar es de un cierre brusco anterior.
      await fs.rm(path.join(cfg.datos, '.git/index.lock'), { force: true });
      await fs.writeFile(path.join(cfg.datos, '.gitignore'), '**/registro/\n*.tmp\n');
      // En un repo existente NO se commitea todo: lo pendiente puede venir de una sesión cortada
      // y cola.recuperar() decide qué es legítimo.
      if (nuevo) await git('add', '-A');
      else await git('add', '--', '.gitignore');
      await git('commit', '-q', '--allow-empty', '-m', 'inicio');
    });
  }

  async function cambiosSinBloqueo() {
    const { stdout } = await git('status', '--porcelain', '-z', '-uall');
    return stdout
      .split('\0')
      .filter(Boolean)
      .map((e) => ({ codigo: e.slice(0, 2), ruta: e.slice(3) }));
  }

  const cambios = () => enSerie(cambiosSinBloqueo);

  async function commitearSinBloqueo(rutas, mensaje) {
    if (rutas === 'todo') await git('add', '-A');
    else {
      // git add falla con rutas inexistentes; las borradas siguen contando si estaban trackeadas.
      const validas = [];
      for (const r of rutas) {
        if ((await existe(path.join(cfg.datos, r))) || (await git('ls-files', '--', r)).stdout.trim()) validas.push(r);
      }
      if (!validas.length) return;
      await git('add', '-A', '--', ...validas);
    }
    try {
      await git('diff', '--cached', '--quiet');
    } catch {
      await git('commit', '-q', '-m', mensaje);
    }
  }

  const commitear = (rutas, mensaje) => enSerie(() => commitearSinBloqueo(rutas, mensaje));

  // Escritura del servidor + commit como una sola operación: verificar nunca ve el estado intermedio.
  const proteger = (rutas, fn, mensaje = 'usuario') =>
    enSerie(async () => {
      const r = await fn();
      await commitearSinBloqueo(typeof rutas === 'function' ? rutas(r) : rutas, mensaje);
      return r;
    });

  function verificar({ propios, ajenosActivos }) {
    return enSerie(async () => {
      const permitidos = [...propios, ...ajenosActivos];
      const restaurados = [];
      for (const { codigo, ruta } of await cambiosSinBloqueo()) {
        if (permitidos.some((p) => casa(ruta, p))) continue;
        if (codigo === '??') await fs.rm(path.join(cfg.datos, ruta), { force: true });
        else await git('checkout', 'HEAD', '--', ruta);
        restaurados.push(ruta);
      }
      return { restaurados };
    });
  }

  return { iniciar, commitear, proteger, verificar, cambios };
}
