import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const ejecutarArchivo = promisify(execFile);
const CONVERTIR = new URL('./convertir.py', import.meta.url).pathname;

// Lo que la herramienta Read de Claude lee tal cual.
const DIRECTOS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'ipynb']);
const OFICINA = new Set(['docx', 'docm', 'dotx', 'pptx', 'pptm', 'ppsx', 'xlsx', 'xlsm', 'odt', 'odp', 'ods', 'ott', 'epub', 'rtf', 'zip']);
const VIDEO = new Set(['mp4', 'm4v', 'mov', 'webm', 'mkv', 'avi', 'mpeg', 'mpg', 'ogv', '3gp']);
const AUDIO = new Set(['mp3', 'wav', 'ogg', 'oga', 'm4a', 'flac', 'aac', 'opus', 'wma']);
const ANTIGUOS = { doc: '.docx', xls: '.xlsx', ppt: '.pptx' };
const FOTOGRAMAS = 8;

// ¿Es texto? Sin bytes nulos y UTF-8 válido en su comienzo.
async function esTexto(ruta) {
  const f = await fs.open(ruta);
  try {
    const { buffer, bytesRead } = await f.read(Buffer.alloc(64 * 1024), 0, 64 * 1024, 0);
    const b = buffer.subarray(0, bytesRead);
    if (b.includes(0)) return false;
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(b.subarray(0, Math.max(0, bytesRead - 4)));
      return true;
    } catch {
      return false;
    }
  } finally {
    await f.close();
  }
}

// Prepara la versión que una sesión de Claude puede leer de un adjunto. Devuelve
// { tipo: 'directo' | 'convertido' | 'ilegible', lectura: [rutas relativas a la carpeta de adjuntos], aviso }.
export async function prepararLectura(ruta, dirLectura, { tiempo = 120000 } = {}) {
  const nombre = path.basename(ruta);
  const ext = nombre.includes('.') ? nombre.split('.').pop().toLowerCase() : '';
  const rel = (f) => `${path.basename(dirLectura)}/${f}`;
  if (DIRECTOS.has(ext)) return { tipo: 'directo', lectura: [], aviso: null };
  try {
    if (OFICINA.has(ext)) {
      await fs.mkdir(dirLectura, { recursive: true });
      await ejecutarArchivo('python3', ['-I', CONVERTIR, ruta, path.join(dirLectura, `${nombre}.md`)], { timeout: tiempo });
      return { tipo: 'convertido', lectura: [rel(`${nombre}.md`)], aviso: null };
    }
    if (VIDEO.has(ext)) {
      await fs.mkdir(dirLectura, { recursive: true });
      const { stdout } = await ejecutarArchivo('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', ruta], { timeout: tiempo });
      const duracion = Number.parseFloat(stdout) || 0;
      const lectura = [];
      for (let k = 0; k < FOTOGRAMAS; k++) {
        const f = `${nombre}-${String(k + 1).padStart(2, '0')}.jpg`;
        const t = duracion ? (duracion * (k + 0.5)) / FOTOGRAMAS : k;
        await ejecutarArchivo('ffmpeg', ['-v', 'error', '-y', '-ss', t.toFixed(2), '-i', ruta, '-frames:v', '1', '-vf', 'scale=min(1280\\,iw):-2', path.join(dirLectura, f)], { timeout: tiempo }).catch(() => {});
        if (await fs.stat(path.join(dirLectura, f)).then((s) => s.size > 0, () => false)) lectura.push(rel(f));
      }
      if (!lectura.length) throw new Error('sin fotogramas');
      return { tipo: 'convertido', lectura, aviso: `Vídeo: la sesión ve ${lectura.length} fotogramas repartidos por su duración, no el sonido.` };
    }
  } catch {
    return { tipo: 'ilegible', lectura: [], aviso: 'No se pudo convertir este archivo: queda guardado, pero la sesión solo verá su nombre.' };
  }
  if (ANTIGUOS[ext]) return { tipo: 'ilegible', lectura: [], aviso: `Formato antiguo de Office: guárdalo como ${ANTIGUOS[ext]} o PDF para que la sesión pueda leerlo.` };
  if (AUDIO.has(ext)) return { tipo: 'ilegible', lectura: [], aviso: 'Audio: la sesión no puede escucharlo; solo verá su nombre.' };
  if (await esTexto(ruta)) return { tipo: 'directo', lectura: [], aviso: null };
  return { tipo: 'ilegible', lectura: [], aviso: 'La sesión no puede leer este formato: queda guardado, pero solo verá su nombre.' };
}
