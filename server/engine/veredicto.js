const VEREDICTOS = new Set(['aceptada', 'rechazada', 'aclaracion', 'cambios']);

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
  return {
    meta: { veredicto: campos.veredicto, etapa, resumen: campos.resumen },
    cuerpo: m[2].replace(/^\n+/, ''),
  };
}
