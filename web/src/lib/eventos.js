// Convierte el flujo stream-json de claude en bloques legibles, como en la terminal.
const MAX_RESULTADO = 600;

function detallesHerramienta(bloque, input) {
  if (!input || typeof input !== 'object') return;
  bloque.entrada = input;
  if (input.query) bloque.query = input.query;
  if (input.url) bloque.url = input.url;
  if (input.file_path || input.path || input.pattern) bloque.ruta = input.file_path ?? input.path ?? input.pattern;
  if (input.command) bloque.comando = input.command;
}

function textoResultado(contenido) {
  if (typeof contenido === 'string') return contenido;
  if (Array.isArray(contenido)) return contenido.map((c) => (c.type === 'text' ? c.text : `[${c.type}]`)).join('\n');
  return '';
}

export function crearTranscripcion() {
  const bloques = [];
  const porIndice = new Map();
  const herramientas = new Map(); // id → bloque
  let parcial = false;
  let ultimaCuota = null;

  const nuevo = (b) => (bloques.push(b), b);

  function herramienta(id, nombre, input) {
    let b = herramientas.get(id);
    if (!b) {
      b = nuevo({ tipo: 'herramienta', herramienta: nombre, id, terminado: true });
      herramientas.set(id, b);
    }
    detallesHerramienta(b, input);
    return b;
  }

  function aplicar(ev) {
    if (ev.type === 'stream_event') {
      parcial = true;
      const e = ev.event;
      if (e.type === 'message_start') porIndice.clear();
      else if (e.type === 'content_block_start') {
        const cb = e.content_block;
        if (cb.type === 'thinking') porIndice.set(e.index, nuevo({ tipo: 'pensamiento', texto: '', terminado: false }));
        else if (cb.type === 'text') porIndice.set(e.index, nuevo({ tipo: 'texto', texto: cb.text ?? '', terminado: false }));
        else if (cb.type === 'tool_use' || cb.type === 'server_tool_use') {
          const b = herramienta(cb.id, cb.name, cb.input);
          b.terminado = false;
          b.json = '';
          porIndice.set(e.index, b);
        }
      } else if (e.type === 'content_block_delta') {
        const b = porIndice.get(e.index);
        const d = e.delta;
        if (!b) return;
        if (d.type === 'thinking_delta') b.texto += d.thinking ?? '';
        else if (d.type === 'text_delta') b.texto += d.text ?? '';
        else if (d.type === 'input_json_delta') {
          b.json += d.partial_json ?? '';
          const q = b.json.match(/"(query|url|file_path|command)"\s*:\s*"((?:\\.|[^"\\])*)/);
          if (q) b[{ query: 'query', url: 'url', file_path: 'ruta', command: 'comando' }[q[1]]] = q[2];
        }
      } else if (e.type === 'content_block_stop') {
        const b = porIndice.get(e.index);
        if (!b) return;
        b.terminado = true;
        if (b.tipo === 'herramienta' && b.json) {
          try {
            detallesHerramienta(b, JSON.parse(b.json));
          } catch {
            /* JSON incompleto: se queda con lo extraído al vuelo */
          }
          delete b.json;
        }
      }
      return;
    }

    if (ev.type === 'assistant') {
      for (const c of ev.message?.content ?? []) {
        if (c.type === 'tool_use' || c.type === 'server_tool_use') herramienta(c.id, c.name, c.input);
        else if (!parcial && c.type === 'text') nuevo({ tipo: 'texto', texto: c.text, terminado: true });
        else if (!parcial && c.type === 'thinking' && c.thinking) nuevo({ tipo: 'pensamiento', texto: c.thinking, terminado: true });
      }
      return;
    }

    if (ev.type === 'user') {
      for (const c of ev.message?.content ?? []) {
        if (c?.type !== 'tool_result') continue;
        const texto = textoResultado(c.content);
        nuevo({
          tipo: 'resultado',
          herramientaId: c.tool_use_id,
          herramienta: herramientas.get(c.tool_use_id)?.herramienta,
          texto: texto.length > MAX_RESULTADO ? `${texto.slice(0, MAX_RESULTADO - 1)}…` : texto,
          error: Boolean(c.is_error),
          terminado: true,
        });
      }
      return;
    }

    if (ev.type === 'rate_limit_event') {
      const pct = Math.round(100 * (ev.rate_limit_info?.unifiedWindows?.five_hour?.utilization ?? 0));
      if (pct !== ultimaCuota) {
        ultimaCuota = pct;
        nuevo({ tipo: 'sistema', texto: `Cuota de 5 h al ${pct} %`, terminado: true });
      }
      return;
    }

    if (ev.type === 'system') {
      if (ev.subtype === 'init') nuevo({ tipo: 'sistema', texto: `Sesión iniciada (${ev.model ?? 'claude'})`, terminado: true });
      else if (ev.subtype === 'permission_denied') {
        nuevo({ tipo: 'sistema', texto: `Permiso denegado: ${ev.tool_name ?? 'herramienta'}`, terminado: true, error: true });
      }
      return;
    }

    if (ev.type === 'result') {
      const min = ((ev.duration_ms ?? 0) / 60000).toFixed(1).replace('.', ',');
      nuevo({
        tipo: 'sistema',
        texto: ev.is_error ? `Terminado con error: ${ev.result ?? ev.subtype}` : `Terminado en ${min} min`,
        terminado: true,
        error: Boolean(ev.is_error),
      });
    }
  }

  return { aplicar, bloques };
}

// «2026-10-23T05-12-33-123Z.jsonl» → Date
export function fechaRegistro(nombre) {
  const m = nombre.match(/^(\d{4}-\d\d-\d\d)T(\d\d)-(\d\d)-(\d\d)-(\d+)Z/);
  return m ? new Date(`${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z`) : null;
}
