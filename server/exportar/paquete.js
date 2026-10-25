// Arma la carpeta de una germinación exportada: la página del visor, datos.json y SOLO los archivos que
// usan los documentos incluidos y los recursos. Nada de sesiones, estados, notas, talleres ni exámenes.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { datosTipo } from '../engine/tipos.js';

export const RUTA_VISOR = fileURLToPath(new URL('../../web/dist-visor/', import.meta.url));

// Imágenes de Markdown y <img src>: lo único que el renderizador resuelve contra la carpeta de la idea.
// Los bloques internos de Semillero (caminos, propuestas…) son interacción con la sesión: fuera.
const sinBloques = (md) => String(md ?? '').replace(/```semillero-[a-z-]+[^\n]*\n[\s\S]*?```[ \t]*\n?/g, '');
const RE_IMAGEN = /!\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^)]*["'])?\s*\)|<img\b[^>]*\bsrc=["']([^"']+)["']/gi;

export async function prepararSitio({ cfg, ideas, carpetas, ref, destino, visor = RUTA_VISOR }) {
  const dirIdea = path.join(cfg.datos, 'carpetas', ref.carpetaId, 'ideas', ref.ideaId);
  const mapa = JSON.parse(await fs.readFile(path.join(dirIdea, 'germinacion/mapa.json'), 'utf8').catch(() => 'null'));
  if (mapa?.fase !== 'mapa') throw new Error('sin-mapa');
  const [idea, carpeta] = await Promise.all([ideas.obtener(ref.carpetaId, ref.ideaId), carpetas.obtener(ref.carpetaId)]);

  const documentos = {};
  for (const n of mapa.nodos) {
    documentos[n.id] = sinBloques(await fs.readFile(path.join(dirIdea, 'germinacion', n.documento), 'utf8').catch(() => ''));
  }
  // Raíces: la idea original y el dictamen vigente (el último); ni réplicas ni dictámenes anteriores.
  const original = idea.hilo.find((m) => m.n === 1);
  const dictamen = idea.hilo.filter((m) => m.autor === 'claude' && m.meta).at(-1);
  const raices = [
    ...(original ? [{ id: 'idea', etiqueta: 'Tu idea', md: sinBloques(original.contenido) }] : []),
    ...(dictamen ? [{ id: 'dictamen', etiqueta: 'Dictamen', md: sinBloques(dictamen.contenido) }] : []),
  ];
  const { diagnostico: _d, ...mapaPublico } = mapa;

  const datos = {
    version: 1,
    exportado: new Date().toISOString(),
    titulo: idea.titulo,
    bancal: { nombre: carpeta.nombre, color: carpeta.color },
    vocab: datosTipo(carpeta).vocab,
    mapa: mapaPublico,
    documentos,
    raices,
  };

  if (visor && !(await fs.stat(path.join(visor, 'index.html')).catch(() => null))) throw new Error('visor-no-construido');
  await fs.mkdir(destino, { recursive: true });
  if (visor) await fs.cp(visor, destino, { recursive: true });
  await fs.writeFile(path.join(destino, 'datos.json'), JSON.stringify(datos));

  // Archivos: las imágenes que citan los textos (relativas a la idea) y los recursos (relativos a germinacion/).
  const textos = [...Object.values(documentos), mapa.resumen ?? '', ...raices.map((r) => r.md), ...(mapa.recursos ?? []).map((r) => r.nota ?? '')];
  const rutas = new Set();
  for (const t of textos) for (const m of String(t).matchAll(RE_IMAGEN)) rutas.add(m[1] ?? m[2]);
  for (const r of mapa.recursos ?? []) if (r.archivo) rutas.add(`germinacion/${r.archivo}`);
  const base = await fs.realpath(dirIdea);
  for (const ruta of rutas) await copiarDentro(base, ruta, path.join(destino, 'archivos/idea'));
  return datos;
}

// Copia una ruta relativa de la idea solo si de verdad está dentro de ella (ni `..`, ni absolutas, ni enlaces que salgan).
async function copiarDentro(base, ruta, destinoBase) {
  if (/^[a-z][a-z0-9+.-]*:|^\/|^\\/i.test(ruta)) return;
  let rel;
  try {
    rel = path.posix.normalize(decodeURIComponent(ruta.replace(/^\.\//, '')));
  } catch {
    return;
  }
  if (rel.startsWith('..') || path.isAbsolute(rel)) return;
  const real = await fs.realpath(path.join(base, rel)).catch(() => null);
  if (!real || !real.startsWith(base + path.sep)) return;
  if (!(await fs.stat(real)).isFile()) return;
  const destino = path.join(destinoBase, rel);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.copyFile(real, destino);
}
