// El índice de un nodo de estudio redactado (cursos de «Aprender algo nuevo»): sus conferencias, clases
// prácticas, demostraciones para valientes y recursos. Lo escribe la sesión redactora del nodo en
// germinacion/nodos/<nodo>/indice.json; todas sus rutas deben quedar dentro de las carpetas de ese nodo.

const RE_ID = /^[a-z0-9-]{1,40}$/;
const TIPOS_RECURSO = new Set(['libro', 'articulo', 'curso', 'web', 'video', 'otro']);
const esTexto = (v) => typeof v === 'string' && v.trim().length > 0;
const esLista = (v) => Array.isArray(v);

class Invalido extends Error {}
const exigir = (cond, motivo) => {
  if (!cond) throw new Invalido(motivo);
};

// Los bloques ```escena con {"archivo": "escenas/<nodo>/<nombre>.js", "titulo", "pie"} de un documento.
const RE_BLOQUE = /```escena[ \t]*\n([\s\S]*?)```/g;
export function escenasDe(md, nodo) {
  const re = new RegExp(`^escenas/${nodo}/[a-z0-9-]{1,60}\\.js$`);
  const validas = [];
  const invalidas = [];
  for (const m of String(md ?? '').matchAll(RE_BLOQUE)) {
    let e = null;
    try {
      e = JSON.parse(m[1]);
    } catch {
      /* se informa abajo */
    }
    if (e && typeof e === 'object' && re.test(e.archivo ?? '')) validas.push({ archivo: e.archivo, titulo: String(e.titulo ?? ''), pie: String(e.pie ?? '') });
    else invalidas.push(m[1].trim().slice(0, 200));
  }
  return { validas, invalidas };
}

export function validarIndice(indice, nodo) {
  try {
    exigir(RE_ID.test(nodo ?? ''), `nodo inválido: ${nodo}`);
    exigir(indice && typeof indice === 'object' && !Array.isArray(indice), 'el índice no es un objeto JSON');
    exigir(indice.version === 1, 'version debe ser 1');
    const reDoc = new RegExp(`^nodos/${nodo}/[a-z0-9-]{1,60}\\.md$`);
    const reArchivo = new RegExp(`^recursos/${nodo}/[^/\\\\]+$`);
    const conferencias = indice.conferencias ?? [];
    const practicas = indice.practicas ?? [];
    const valientes = indice.valientes ?? [];
    const recursos = indice.recursos ?? [];
    exigir([conferencias, practicas, valientes, recursos].every(esLista), 'conferencias, practicas, valientes y recursos deben ser listas');
    exigir(conferencias.length > 0, 'un nodo redactado necesita al menos una conferencia');

    const ids = new Set();
    const documentos = new Set();
    const pieza = (x, clase) => {
      exigir(RE_ID.test(x?.id ?? ''), `id inválido en ${clase}: ${x?.id}`);
      exigir(!ids.has(x.id), `id duplicado: ${x.id}`);
      ids.add(x.id);
      exigir(esTexto(x.titulo), `${clase} ${x.id} no tiene título`);
      exigir(reDoc.test(x.documento ?? ''), `documento inválido en ${x.id}: debe ser nodos/${nodo}/<nombre>.md`);
      exigir(!documentos.has(x.documento), `documento repetido: ${x.documento}`);
      documentos.add(x.documento);
    };
    for (const c of conferencias) {
      pieza(c, 'la conferencia');
      c.objetivos ??= [];
      exigir(esLista(c.objetivos) && c.objetivos.every(esTexto), `los objetivos de ${c.id} deben ser textos`);
    }
    const idsConf = new Set(conferencias.map((c) => c.id));
    for (const p of practicas) {
      pieza(p, 'la práctica');
      p.conferencias ??= [];
      exigir(esLista(p.conferencias), `conferencias de ${p.id} debe ser una lista`);
      for (const c of p.conferencias) exigir(idsConf.has(c), `la práctica ${p.id} cita la conferencia ${c}, que no existe`);
    }
    for (const v of valientes) pieza(v, 'la demostración');

    const idsRec = new Set();
    for (const r of recursos) {
      exigir(RE_ID.test(r?.id ?? ''), `id de recurso inválido: ${r?.id}`);
      exigir(!idsRec.has(r.id), `id de recurso duplicado: ${r.id}`);
      idsRec.add(r.id);
      exigir(TIPOS_RECURSO.has(r.tipo), `tipo de recurso inválido en ${r.id}: ${r.tipo}`);
      exigir(esTexto(r.titulo), `el recurso ${r.id} no tiene título`);
      exigir(esTexto(r.url) || esTexto(r.archivo), `el recurso ${r.id} necesita url o archivo`);
      if (r.url) exigir(/^https?:\/\//.test(r.url), `url inválida en ${r.id}`);
      if (r.archivo) exigir(reArchivo.test(r.archivo) && !r.archivo.includes('..'), `archivo de ${r.id} fuera de recursos/${nodo}/`);
      r.conferencias ??= [];
      exigir(esLista(r.conferencias) && r.conferencias.every((c) => idsConf.has(c)), `el recurso ${r.id} cita conferencias que no existen`);
    }
    return { ok: true, indice: { version: 1, conferencias, practicas, valientes, recursos } };
  } catch (e) {
    if (e instanceof Invalido) return { ok: false, motivo: e.message };
    throw e;
  }
}

// Todos los documentos de un índice, en orden de lectura.
export const documentosDe = (indice) => [...indice.conferencias, ...indice.practicas, ...indice.valientes].map((x) => x.documento);
