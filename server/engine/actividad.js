// La actividad en vivo de una sesión de redacción: qué está haciendo, en lenguaje claro, sus últimas acciones
// y cuántos tokens lleva. Del pensamiento solo se dice «Pensando»: su contenido nunca sale del servidor.
const MAX_RECIENTES = 8;
const corto = (s, n = 90) => (String(s ?? '').length > n ? `${String(s).slice(0, n - 1)}…` : String(s ?? ''));
const nombre = (ruta) => String(ruta ?? '').split('/').pop() ?? '';
const sinExtension = (f) => f.replace(/\.[a-z0-9]+$/i, '');

// Qué es un archivo de la asignatura, para nombrarlo como lo entiende el usuario.
function queEs(ruta) {
  const f = nombre(ruta);
  if (/\/escenas\/[^/]+\/[^/]+\.js$/.test(ruta)) return `la escena «${sinExtension(f)}»`;
  if (/\/nodos\/[^/]+\/indice\.json$/.test(ruta)) return 'el índice de la asignatura';
  if (/\/nodos\/[^/]+\/c\d+[^/]*\.md$/.test(ruta)) return `la conferencia «${sinExtension(f)}»`;
  if (/\/nodos\/[^/]+\/p\d+[^/]*\.md$/.test(ruta)) return `la clase práctica «${sinExtension(f)}»`;
  if (/\/nodos\/[^/]+\/v\d+[^/]*\.md$/.test(ruta)) return `la demostración «${sinExtension(f)}»`;
  if (/\/figuras\//.test(ruta)) return `la figura «${f}»`;
  return `«${f}»`;
}

export function describir(herramienta, entrada = {}) {
  switch (herramienta) {
    case 'WebSearch':
      return `Buscando en la web: «${corto(entrada.query, 70)}»`;
    case 'WebFetch': {
      let host = '';
      try {
        host = new URL(entrada.url).host;
      } catch {
        /* sin url legible */
      }
      return host ? `Leyendo ${host}` : 'Leyendo una página web';
    }
    case 'Read':
      return `Leyendo ${queEs(entrada.file_path)}`;
    case 'Write': {
      const q = queEs(entrada.file_path);
      if (q === 'el índice de la asignatura') return 'Escribiendo el índice de la asignatura';
      if (q.startsWith('la escena')) return `Programando ${q}`;
      return `Escribiendo ${q}`;
    }
    case 'Edit':
      return `Corrigiendo ${queEs(entrada.file_path)}`;
    case 'Glob':
    case 'Grep':
      return 'Buscando entre los archivos';
    case 'Bash': {
      const c = String(entrada.command ?? '');
      if (/escenas\/hijo\.mjs/.test(c)) return 'Probando una escena';
      if (/\bcurl\b/.test(c)) {
        const destino = c.match(/-o\s+(\S+)/)?.[1];
        return destino ? `Descargando «${nombre(destino)}»` : 'Descargando un documento';
      }
      if (/\bpython3\b/.test(c)) return /matplotlib|figuras|savefig/.test(c) ? 'Generando una figura' : 'Calculando con Python';
      if (/^\s*(mkdir|ls)\b/.test(c)) return 'Organizando los archivos';
      return 'Ejecutando un comando';
    }
    default:
      return 'Trabajando';
  }
}

export function crearActividad({ previos = {}, ahora = () => Date.now() } = {}) {
  const tokens = { generados: previos.generados ?? 0, leidos: previos.leidos ?? 0, contexto: 0 };
  const inicio = new Date(ahora()).toISOString();
  let accion = { texto: 'Preparando la sesión', desde: inicio };
  const recientes = [];
  const vistas = new Set();
  // El último documento de lectura (conferencia, práctica o demostración) que escribió o corrigió la sesión.
  let documentoActual = null;

  const fijar = (texto) => {
    if (texto === accion.texto) return false;
    accion = { texto, desde: new Date(ahora()).toISOString() };
    if (texto !== 'Pensando' && texto !== 'Escribiendo su respuesta') {
      recientes.unshift({ texto, hora: accion.desde });
      recientes.length = Math.min(recientes.length, MAX_RECIENTES);
    }
    return true;
  };

  // Devuelve si cambió algo que merezca avisar a la interfaz.
  function alEvento(ev) {
    if (ev?.type === 'stream_event') {
      const e = ev.event ?? {};
      if (e.type === 'message_delta' && e.usage) {
        const u = e.usage;
        const leidos = (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
        tokens.generados += u.output_tokens ?? 0;
        tokens.leidos += leidos;
        tokens.contexto = leidos + (u.output_tokens ?? 0);
        return true;
      }
      if (e.type === 'content_block_start') {
        if (e.content_block?.type === 'thinking') return fijar('Pensando');
        if (e.content_block?.type === 'text') return fijar('Escribiendo su respuesta');
      }
      return false;
    }
    if (ev?.type === 'assistant') {
      let cambio = false;
      for (const b of ev.message?.content ?? []) {
        if (b.type !== 'tool_use' || vistas.has(b.id)) continue;
        vistas.add(b.id);
        if (b.name === 'Write' || b.name === 'Edit') {
          const doc = String(b.input?.file_path ?? '').match(/\/nodos\/[^/]+\/([cpv]\d+[a-z0-9-]*\.md)$/)?.[1];
          if (doc && doc !== documentoActual) {
            documentoActual = doc;
            cambio = true;
          }
        }
        cambio = fijar(describir(b.name, b.input)) || cambio;
      }
      return cambio;
    }
    return false;
  }

  return {
    alEvento,
    resumen: () => ({ accion, recientes: [...recientes], tokens: { ...tokens }, inicio, documentoActual }),
  };
}
