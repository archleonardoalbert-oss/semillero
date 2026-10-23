export const VEREDICTOS = new Set(['aceptada', 'cambios', 'no-recomendada', 'rechazada', 'aclaracion']);
const RE_ID = /^[a-z0-9-]{1,40}$/;
const TIPOS_CAMINO = new Set(['variacion', 'idea-nueva']);
const RE_BLOQUE = /\n?```semillero-caminos[ \t]*\n([\s\S]*?)\n```[ \t]*\n?/;

// Los caminos que propone el dictamen. Devuelve null si el bloque no es válido.
function validarCaminos(texto) {
  let lista;
  try {
    lista = JSON.parse(texto);
  } catch {
    return null;
  }
  if (!Array.isArray(lista) || lista.length < 1 || lista.length > 6) return null;
  const ids = new Set();
  for (const c of lista) {
    if (!RE_ID.test(c?.id ?? '') || ids.has(c.id) || !TIPOS_CAMINO.has(c.tipo)) return null;
    if (typeof c.titulo !== 'string' || !c.titulo.trim() || typeof c.descripcion !== 'string' || !c.descripcion.trim()) return null;
    ids.add(c.id);
  }
  return lista.map(({ id, tipo, titulo, descripcion }) => ({ id, tipo, titulo: titulo.trim(), descripcion: descripcion.trim() }));
}

// Lee el frontmatter que cada sesión deja al principio de su dictamen.
// Devuelve null ante cualquier forma inválida: el servidor nunca adivina un veredicto.
export function parsearDictamen(texto) {
  const limpio = String(texto ?? '').replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const m = limpio.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return null;
  const campos = {};
  for (const linea of m[1].split('\n')) {
    const par = linea.match(/^([a-zA-Z]+):\s*(.*)$/);
    if (par) campos[par[1]] = par[2].trim().replace(/^(["'])(.*)\1$/, '$2');
  }
  const etapa = Number(campos.etapa);
  if (!VEREDICTOS.has(campos.veredicto) || ![1, 2].includes(etapa) || !campos.resumen) return null;
  let cuerpo = m[2].replace(/^\n+/, '');
  let caminos = [];
  const bloque = cuerpo.match(RE_BLOQUE);
  const validos = bloque && validarCaminos(bloque[1]);
  if (validos) {
    caminos = validos;
    cuerpo = cuerpo.replace(RE_BLOQUE, '\n');
  }
  return {
    meta: { veredicto: campos.veredicto, etapa, resumen: campos.resumen, etiqueta: campos.etiqueta?.slice(0, 80) || null },
    cuerpo,
    caminos,
  };
}
