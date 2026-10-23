import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export function slugify(texto) {
  const slug = String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return slug || 'sin-titulo';
}

export async function existe(ruta) {
  try {
    await fs.access(ruta);
    return true;
  } catch {
    return false;
  }
}

export async function slugUnico(dir, base) {
  let candidato = base;
  for (let n = 2; await existe(path.join(dir, candidato)); n++) candidato = `${base}-${n}`;
  return candidato;
}

export async function escribirAtomico(ruta, contenido) {
  await fs.mkdir(path.dirname(ruta), { recursive: true });
  const tmp = `${ruta}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  await fs.writeFile(tmp, contenido);
  await fs.rename(tmp, ruta);
}

export async function leerJSON(ruta, defecto) {
  try {
    return JSON.parse(await fs.readFile(ruta, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return defecto;
    throw e;
  }
}

export function escribirJSON(ruta, valor) {
  return escribirAtomico(ruta, JSON.stringify(valor, null, 2) + '\n');
}

// Resuelve `relativa` dentro de `base`; cualquier intento de salir lanza.
export function rutaSegura(base, relativa) {
  if (typeof relativa !== 'string' || path.isAbsolute(relativa) || relativa.includes('\0')) {
    throw new Error('ruta-invalida');
  }
  const raiz = path.resolve(base);
  const final = path.resolve(raiz, relativa);
  if (final !== raiz && !final.startsWith(raiz + path.sep)) throw new Error('ruta-invalida');
  return final;
}
