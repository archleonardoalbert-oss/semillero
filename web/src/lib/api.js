// Cliente de la API local. Los errores llevan el código que manda el servidor.
async function pedir(metodo, url, cuerpo, { tipo } = {}) {
  const opciones = { method: metodo, headers: {} };
  if (cuerpo instanceof Blob) {
    opciones.body = cuerpo;
    opciones.headers['content-type'] = tipo ?? (cuerpo.type || 'application/octet-stream');
  } else if (cuerpo !== undefined) {
    opciones.body = JSON.stringify(cuerpo);
    opciones.headers['content-type'] = 'application/json';
  }
  const r = await fetch(url, opciones);
  if (r.status === 204) return null;
  const esJson = r.headers.get('content-type')?.startsWith('application/json');
  const datos = esJson ? await r.json() : await r.text();
  if (!r.ok) throw Object.assign(new Error(datos?.error ?? `HTTP ${r.status}`), { codigo: r.status });
  return datos;
}

const idea = (c, i) => `/api/carpetas/${encodeURIComponent(c)}/ideas/${encodeURIComponent(i)}`;

export const api = {
  resumen: () => pedir('GET', '/api/resumen'),
  carpetas: () => pedir('GET', '/api/carpetas'),
  crearCarpeta: (datos) => pedir('POST', '/api/carpetas', datos),
  editarCarpeta: (c, datos) => pedir('PATCH', `/api/carpetas/${encodeURIComponent(c)}`, datos),
  borrarCarpeta: (c) => pedir('DELETE', `/api/carpetas/${encodeURIComponent(c)}`),
  notasCarpeta: (c) => pedir('GET', `/api/carpetas/${encodeURIComponent(c)}/notas`),
  notasGlobales: () => pedir('GET', '/api/notas-globales'),
  ideas: ({ estado, carpeta } = {}) =>
    pedir('GET', `/api/ideas?${new URLSearchParams({ ...(estado && { estado }), ...(carpeta && { carpeta }) })}`),
  crearIdea: (c, datos) => pedir('POST', `/api/carpetas/${encodeURIComponent(c)}/ideas`, datos),
  idea: (c, i) => pedir('GET', idea(c, i)),
  editarIdea: (c, i, datos) => pedir('PATCH', idea(c, i), datos),
  borrarIdea: (c, i) => pedir('DELETE', idea(c, i)),
  responder: (c, i, cuerpo) => pedir('POST', `${idea(c, i)}/replica`, { cuerpo }),
  subirAdjunto: (c, i, archivo) =>
    pedir('POST', `${idea(c, i)}/adjuntos?nombre=${encodeURIComponent(archivo.name || 'imagen.png')}`, archivo),
  registros: (c, i) => pedir('GET', `${idea(c, i)}/registros`),
  registro: (c, i, a) => pedir('GET', `${idea(c, i)}/registros/${encodeURIComponent(a)}`),
  glosas: (c, i) => pedir('GET', `${idea(c, i)}/glosas`),
  pedirGlosa: (c, i, datos) => pedir('POST', `${idea(c, i)}/glosas`, datos),
  seguirGlosa: (c, i, g, prompt) => pedir('POST', `${idea(c, i)}/glosas/${encodeURIComponent(g)}/seguir`, { prompt }),
  // `datos`: la petición (texto) o { peticion, forzar, camino, comentario, cuerpo }.
  germinar: (c, i, datos = {}) => pedir('POST', `${idea(c, i)}/germinar`, typeof datos === 'string' ? { peticion: datos } : datos),
  elegirCamino: (c, i, datos) => pedir('POST', `${idea(c, i)}/camino`, datos),
  germinacion: (c, i) => pedir('GET', `${idea(c, i)}/germinacion`),
  responderDiagnostico: (c, i, respuestas) => pedir('PUT', `${idea(c, i)}/germinacion/respuestas`, { respuestas }),
  marcarNodo: (c, i, n, datos) => pedir('PATCH', `${idea(c, i)}/germinacion/nodos/${encodeURIComponent(n)}`, datos),
  documento: (c, i, rel) => pedir('GET', `/archivos/carpetas/${encodeURIComponent(c)}/ideas/${encodeURIComponent(i)}/${rel}`),
  taller: (c, i, n) => pedir('GET', `${idea(c, i)}/germinacion/talleres/${encodeURIComponent(n)}`),
  enviarTaller: (c, i, n, datos) => pedir('POST', `${idea(c, i)}/germinacion/talleres/${encodeURIComponent(n)}/mensajes`, datos),
  adjuntarTaller: (c, i, n, archivo) =>
    pedir('POST', `${idea(c, i)}/germinacion/talleres/${encodeURIComponent(n)}/adjuntos?nombre=${encodeURIComponent(archivo.name || 'adjunto.png')}`, archivo,
      { tipo: archivo.type?.startsWith('image/') ? archivo.type : 'application/octet-stream' }),
  propuestaTaller: (c, i, n, accion) => pedir('POST', `${idea(c, i)}/germinacion/talleres/${encodeURIComponent(n)}/propuesta`, { accion }),
  restaurarTaller: (c, i, n, version) => pedir('POST', `${idea(c, i)}/germinacion/talleres/${encodeURIComponent(n)}/restaurar`, { version }),
  pendientes: () => pedir('GET', '/api/pendientes'),
  pausadas: () => pedir('GET', '/api/pausadas'),
  activas: () => pedir('GET', '/api/activas'),
  analisis: (accion, refs) => pedir('POST', `/api/analisis/${accion}`, { refs }),
  ajustes: () => pedir('GET', '/api/ajustes'),
  guardarAjustes: (datos) => pedir('PUT', '/api/ajustes', datos),
};

export const urlArchivo = (rutaIdea, relativa) => `/archivos/${rutaIdea}/${relativa}`;
export const rutaIdea = (c, i) => `carpetas/${c}/ideas/${i}`;
