// Valida el mapa de germinación que escribe la sesión. El servidor nunca muestra un mapa a medias:
// si algo no cuadra, se conserva el anterior y se explica el motivo.

const RE_ID = /^[a-z0-9-]{1,40}$/;
const RE_DOCUMENTO = /^nodos\/[a-z0-9-]+\.md$/;
const RE_ARCHIVO = /^recursos\/[^/\\]+$/;
const TIPOS_NODO = new Set(['estudio', 'incognita']);
// `prueba`: un ejercicio corto de verdad que corrige la sesión; `multiple`: varias opciones marcables.
const TIPOS_PREGUNTA = new Set(['abierta', 'escala', 'opciones', 'prueba', 'multiple']);
const TIPOS_RECURSO = new Set(['libro', 'articulo', 'curso', 'web', 'otro']);

const esTexto = (v) => typeof v === 'string' && v.trim().length > 0;
const esLista = (v) => Array.isArray(v);

class Invalido extends Error {}
const exigir = (cond, motivo) => {
  if (!cond) throw new Invalido(motivo);
};

function validarPreguntas(diagnostico) {
  exigir(diagnostico && esLista(diagnostico.preguntas) && diagnostico.preguntas.length > 0, 'el diagnóstico necesita al menos una pregunta');
  const ids = new Set();
  for (const p of diagnostico.preguntas) {
    exigir(RE_ID.test(p?.id ?? ''), `id de pregunta inválido: ${p?.id}`);
    exigir(!ids.has(p.id), `id de pregunta duplicado: ${p.id}`);
    ids.add(p.id);
    exigir(esTexto(p.texto), `la pregunta ${p.id} no tiene texto`);
    exigir(TIPOS_PREGUNTA.has(p.tipo), `tipo de pregunta inválido en ${p.id}: ${p.tipo}`);
    if (p.tipo === 'escala') exigir(esLista(p.niveles) && p.niveles.length === 5 && p.niveles.every(esTexto), `la escala ${p.id} necesita 5 niveles`);
    if (p.tipo === 'opciones' || p.tipo === 'multiple') exigir(esLista(p.opciones) && p.opciones.length >= 2 && p.opciones.every(esTexto), `la pregunta ${p.id} necesita al menos 2 opciones`);
  }
}

function sinCiclos(nodos) {
  const porId = new Map(nodos.map((n) => [n.id, n]));
  const estado = new Map(); // id → 1 visitando, 2 hecho
  const visitar = (id, camino) => {
    if (estado.get(id) === 2) return;
    exigir(estado.get(id) !== 1, `hay un ciclo de dependencias: ${[...camino, id].join(' → ')}`);
    estado.set(id, 1);
    for (const d of porId.get(id).depende) visitar(d, [...camino, id]);
    estado.set(id, 2);
  };
  for (const n of nodos) visitar(n.id, []);
}

export function validarMapa(mapa) {
  try {
    exigir(mapa && typeof mapa === 'object' && !Array.isArray(mapa), 'el mapa no es un objeto JSON');
    exigir(mapa.version === 1, 'version debe ser 1');
    exigir(mapa.fase === 'diagnostico' || mapa.fase === 'mapa', `fase inválida: ${mapa.fase}`);
    exigir(typeof (mapa.resumen ?? '') === 'string', 'resumen debe ser texto');
    const nodos = mapa.nodos ?? [];
    const recursos = mapa.recursos ?? [];
    exigir(esLista(nodos) && esLista(recursos), 'nodos y recursos deben ser listas');

    if (mapa.fase === 'diagnostico' || mapa.diagnostico) validarPreguntas(mapa.diagnostico);
    if (mapa.fase === 'mapa') exigir(nodos.length > 0, 'un mapa necesita al menos un nodo');

    const idsRecursos = new Set();
    for (const r of recursos) {
      exigir(RE_ID.test(r?.id ?? ''), `id de recurso inválido: ${r?.id}`);
      exigir(!idsRecursos.has(r.id), `id de recurso duplicado: ${r.id}`);
      idsRecursos.add(r.id);
      exigir(TIPOS_RECURSO.has(r.tipo), `tipo de recurso inválido en ${r.id}: ${r.tipo}`);
      exigir(esTexto(r.titulo), `el recurso ${r.id} no tiene título`);
      exigir(esTexto(r.url) || esTexto(r.archivo), `el recurso ${r.id} necesita url o archivo`);
      if (r.url) exigir(/^https?:\/\//.test(r.url), `url inválida en ${r.id}`);
      if (r.archivo) exigir(RE_ARCHIVO.test(r.archivo) && !r.archivo.includes('..'), `archivo fuera de germinacion/recursos en ${r.id}`);
    }

    const idsNodos = new Set();
    for (const n of nodos) {
      exigir(RE_ID.test(n?.id ?? ''), `id de nodo inválido: ${n?.id}`);
      exigir(!idsNodos.has(n.id), `id de nodo duplicado: ${n.id}`);
      idsNodos.add(n.id);
    }
    for (const n of nodos) {
      exigir(TIPOS_NODO.has(n.tipo), `tipo de nodo inválido en ${n.id}: ${n.tipo}`);
      exigir(esTexto(n.titulo), `el nodo ${n.id} no tiene título`);
      exigir(RE_DOCUMENTO.test(n.documento ?? ''), `documento inválido en ${n.id}: debe ser nodos/<id>.md`);
      n.depende ??= [];
      n.recursos ??= [];
      exigir(esLista(n.depende) && esLista(n.recursos), `depende y recursos de ${n.id} deben ser listas`);
      for (const d of n.depende) exigir(idsNodos.has(d), `el nodo ${n.id} depende de ${d}, que no existe`);
      for (const r of n.recursos) exigir(idsRecursos.has(r), `el nodo ${n.id} cita el recurso ${r}, que no existe`);
      // El plan de conferencias de una asignatura (cursos de aprendizaje): lo redacta después una sesión dedicada.
      if (n.plan !== undefined) {
        exigir(n.tipo === 'estudio' && esLista(n.plan) && n.plan.length > 0, `el plan de ${n.id} debe ser una lista no vacía (solo en nodos de estudio)`);
        for (const c of n.plan) {
          exigir(esTexto(c?.titulo), `una conferencia del plan de ${n.id} no tiene título`);
          c.objetivos ??= [];
          exigir(esLista(c.objetivos) && c.objetivos.every(esTexto), `los objetivos de «${c.titulo}» en el plan de ${n.id} deben ser textos`);
        }
      }
    }
    sinCiclos(nodos);
    return { ok: true, mapa: { ...mapa, nodos, recursos } };
  } catch (e) {
    if (e instanceof Invalido) return { ok: false, motivo: e.message };
    throw e;
  }
}

// La última pregunta del diagnóstico de un curso: en qué idiomas quiere el usuario los documentos.
// La añade Semillero, no la sesión, para que nunca falte. El orden en que marca los idiomas importa:
// las conferencias se escriben en el primero.
export const IDIOMAS = ['Español', 'English', 'Français', 'Deutsch', 'Português', 'Italiano', 'Русский', '中文', '日本語'];
export const PREGUNTA_IDIOMAS = {
  id: 'idiomas',
  tipo: 'multiple',
  texto: '¿En qué idiomas quieres los documentos del curso? Puedes marcar varios: todo el material estará solo en ellos y las conferencias se escribirán en el primero que marques.',
  opciones: IDIOMAS,
};
export function conPreguntaIdiomas(mapa) {
  if (!mapa?.diagnostico?.preguntas) return mapa;
  const preguntas = mapa.diagnostico.preguntas.filter((p) => p.id !== 'idiomas');
  return { ...mapa, diagnostico: { ...mapa.diagnostico, preguntas: [...preguntas, PREGUNTA_IDIOMAS] } };
}
