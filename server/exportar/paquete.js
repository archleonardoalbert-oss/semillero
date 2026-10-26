// Arma la carpeta de una germinación exportada: la página del visor, datos.json y SOLO los archivos que
// usan los documentos incluidos y los recursos. Nada de sesiones, estados, notas, talleres ni exámenes.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';
import { datosTipo } from '../engine/tipos.js';
import { validarMapa } from '../engine/mapa.js';
import { validarIndice, escenasDe, documentosDe } from '../engine/indice.js';

export const RUTA_VISOR = fileURLToPath(new URL('../../web/dist-visor/', import.meta.url));

// Los bloques internos de Semillero (caminos, propuestas…) son interacción con la sesión: fuera.
const sinBloques = (md) => String(md ?? '').replace(/```semillero-[a-z-]+[^\n]*\n[\s\S]*?```[ \t]*\n?/g, '');

// Las imágenes solo pueden salir de estas carpetas de la idea y ser imágenes de verdad.
const RE_IMAGEN_PERMITIDA = /^(figuras|adjuntos|germinacion\/recursos)\/.+\.(png|jpe?g|gif|webp|svg|avif)$/i;
const RE_RECURSO = /^germinacion\/recursos\/([a-z0-9-]+\/)?[^/\\]+$/;
const RE_ESCENA = /^germinacion\/escenas\/[a-z0-9-]+\/[a-z0-9-]+\.js$/;

// Las imágenes que citan los textos, tal como las lee el renderizador (texto alternativo con corchetes,
// rutas entre <> con espacios…). Las URL externas y absolutas no son archivos de la idea.
function imagenesDe(md) {
  const rutas = [];
  const marked = new Marked();
  marked.walkTokens(marked.lexer(String(md ?? '')), (t) => {
    if (t.type === 'image' && t.href && !/^([a-z][a-z0-9+.-]*:|\/|\\)/i.test(t.href)) rutas.push(t.href);
  });
  return rutas;
}

async function leerMapa(dirIdea, respaldo) {
  const valido = (texto) => {
    try {
      const v = texto && validarMapa(JSON.parse(texto));
      return v?.ok && v.mapa.fase === 'mapa' ? v.mapa : null;
    } catch {
      return null;
    }
  };
  // Mientras una sesión escribe, el mapa en disco puede estar a medias: entonces vale el último bueno.
  return valido(await fs.readFile(path.join(dirIdea, 'germinacion/mapa.json'), 'utf8').catch(() => null)) ?? valido(await respaldo?.());
}

export async function prepararSitio({ cfg, ideas, carpetas, ref, destino, visor = RUTA_VISOR, respaldo = null }) {
  const dirIdea = path.join(cfg.datos, 'carpetas', ref.carpetaId, 'ideas', ref.ideaId);
  const mapa = await leerMapa(dirIdea, respaldo);
  if (!mapa) throw new Error('sin-mapa');
  const [idea, carpeta] = await Promise.all([ideas.obtener(ref.carpetaId, ref.ideaId), carpetas.obtener(ref.carpetaId)]);

  const documentos = {};
  for (const n of mapa.nodos) {
    documentos[n.id] = sinBloques(await fs.readFile(path.join(dirIdea, 'germinacion', n.documento), 'utf8').catch(() => ''));
  }
  // Cursos: cada asignatura redactada lleva su índice y sus documentos (claves «nodos/<nodo>/<doc>.md»).
  // De redaccion.json (sesiones, intentos) no sale nada.
  const indices = {};
  const escenas = new Set();
  for (const n of mapa.nodos.filter((x) => x.tipo === 'estudio')) {
    let v = null;
    try {
      v = validarIndice(JSON.parse(await fs.readFile(path.join(dirIdea, 'germinacion/nodos', n.id, 'indice.json'), 'utf8')), n.id);
    } catch {
      continue;
    }
    if (!v.ok) continue;
    indices[n.id] = v.indice;
    for (const doc of documentosDe(v.indice)) {
      documentos[doc] = sinBloques(await fs.readFile(path.join(dirIdea, 'germinacion', doc), 'utf8').catch(() => ''));
      for (const e of escenasDe(documentos[doc], n.id).validas) escenas.add(`germinacion/${e.archivo}`);
    }
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
    indices,
    raices,
  };

  if (visor && !(await fs.stat(path.join(visor, 'visor.html')).catch(() => null))) throw new Error('visor-no-construido');
  await fs.mkdir(destino, { recursive: true });
  if (visor) {
    // La página del visor es la portada del ejecutable; escena.html reproduce las escenas de los cursos.
    await fs.cp(visor, destino, { recursive: true });
    await fs.rename(path.join(destino, 'visor.html'), path.join(destino, 'index.html'));
  }
  await fs.writeFile(path.join(destino, 'datos.json'), JSON.stringify(datos));
  // El puerto preferido del visor depende de la idea, no de la fecha: así el navegador recuerda lo visto.
  await fs.writeFile(path.join(destino, 'puerto'), String(41000 + (crypto.createHash('sha1').update(`${ref.carpetaId}/${ref.ideaId}`).digest().readUInt32BE(0) % 8000)));

  // Archivos: las imágenes que citan los textos (relativas a la idea, con su codificación de URL deshecha)
  // y los recursos (nombre literal, relativo a germinacion/).
  const rutas = new Set();
  const recursosCurso = Object.values(indices).flatMap((x) => x.recursos);
  const textos = [...Object.values(documentos), mapa.resumen ?? '', ...raices.map((r) => r.md), ...[...(mapa.recursos ?? []), ...recursosCurso].map((r) => r.nota ?? '')];
  for (const t of textos) {
    for (const href of imagenesDe(t)) {
      let rel;
      try {
        rel = path.posix.normalize(decodeURIComponent(href.replace(/^\.\//, '')));
      } catch {
        continue;
      }
      if (RE_IMAGEN_PERMITIDA.test(rel)) rutas.add(rel);
    }
  }
  for (const r of [...(mapa.recursos ?? []), ...recursosCurso]) {
    const rel = r.archivo && path.posix.normalize(`germinacion/${r.archivo}`);
    if (rel && RE_RECURSO.test(rel)) rutas.add(rel);
  }
  for (const e of escenas) if (RE_ESCENA.test(e)) rutas.add(e);

  // Cada archivo se embebe con un nombre seguro (go:embed rechaza muchos nombres: «aux», apóstrofos, rayas…);
  // archivos.json dice qué ruta original corresponde a cada uno y el lanzador la traduce al servirla.
  const manifiesto = {};
  const base = await fs.realpath(dirIdea);
  await fs.mkdir(path.join(destino, 'archivos'), { recursive: true });
  for (const rel of rutas) {
    if (rel.startsWith('..') || path.isAbsolute(rel)) continue;
    const real = await fs.realpath(path.join(base, rel)).catch(() => null);
    if (!real || !real.startsWith(base + path.sep) || !(await fs.stat(real)).isFile()) continue;
    const ext = (path.extname(rel).toLowerCase().match(/^\.[a-z0-9]{1,8}$/) ?? [''])[0];
    const seguro = crypto.createHash('sha1').update(rel).digest('hex').slice(0, 20) + ext;
    await fs.copyFile(real, path.join(destino, 'archivos', seguro));
    manifiesto[rel] = seguro;
  }
  await fs.writeFile(path.join(destino, 'archivos.json'), JSON.stringify(manifiesto));
  return datos;
}
