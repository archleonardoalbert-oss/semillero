import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { slugify, slugUnico, escribirAtomico, escribirJSON, leerJSON } from './fsutil.js';
import { crearAlmacenCarpetas } from './carpetas.js';
import { parsearDictamen } from '../engine/veredicto.js';
import { prepararLectura } from '../adjuntos/lectura.js';

export const ESTADOS_PENDIENTES = new Set(['borrador', 'replica-pendiente', 'detenida', 'error']);
const RE_MENSAJE = /^(\d{3})-(usuario|claude)\.md$/;

export function crearAlmacenIdeas(cfg, { alEscribir = async () => {}, proteger: protegerOpcion, lectura: prepararLecturaDe = prepararLectura } = {}) {
  const carpetas = crearAlmacenCarpetas(cfg);
  // Cada escritura del usuario va con su commit en una sola operación (ver guard.proteger).
  const proteger = protegerOpcion ?? (async (rutas, fn) => {
    const r = await fn();
    await alEscribir(typeof rutas === 'function' ? rutas(r) : rutas);
    return r;
  });
  const dirIdeas = (c) => path.join(cfg.datos, 'carpetas', slugify(c) === c ? c : '__invalida__', 'ideas');
  const dirIdea = (c, i) => path.join(dirIdeas(c), slugify(i) === i ? i : '__invalida__');
  const rel = (c, i, ...resto) => ['carpetas', c, 'ideas', i, ...resto].join('/');

  async function leerIdea(c, i) {
    const idea = await leerJSON(path.join(dirIdea(c, i), 'idea.json'), null);
    if (!idea) throw new Error('idea-no-existe');
    return idea;
  }

  async function mensajes(c, i) {
    const idea = await leerJSON(path.join(dirIdea(c, i), 'idea.json'), null);
    const dir = path.join(dirIdea(c, i), 'hilo');
    const archivos = (await fs.readdir(dir).catch(() => [])).filter((a) => RE_MENSAJE.test(a)).sort();
    return Promise.all(
      archivos.map(async (archivo) => {
        const [, n, autor] = archivo.match(RE_MENSAJE);
        const contenido = await fs.readFile(path.join(dir, archivo), 'utf8');
        const m = { n: Number(n), autor, archivo, contenido };
        if (autor === 'usuario') m.adjuntos = (idea?.adjuntos ?? []).filter((a) => a.mensaje === Number(n));
        if (autor === 'claude') {
          const p = parsearDictamen(contenido);
          m.meta = p?.meta ?? null;
          m.caminos = p?.caminos ?? [];
          if (p) m.contenido = p.cuerpo;
        }
        return m;
      }),
    );
  }

  async function guardarIdea(idea) {
    await escribirJSON(path.join(dirIdea(idea.carpetaId, idea.id), 'idea.json'), idea);
  }

  // `parche` puede ser una función de la idea actual: así se lee y se escribe dentro del mismo turno del guard.
  function actualizar(c, i, parche) {
    return proteger([rel(c, i, 'idea.json')], async () => {
      const actual = await leerIdea(c, i);
      const idea = { ...actual, ...(typeof parche === 'function' ? parche(actual) : parche), id: i, carpetaId: c, actualizada: new Date().toISOString() };
      await guardarIdea(idea);
      return idea;
    });
  }

  async function crear(c, { titulo, cuerpo = '' }) {
    await carpetas.obtener(c);
    if (!String(titulo ?? '').trim()) throw new Error('titulo-vacio');
    return proteger(
      (idea) => [rel(c, idea.id, 'idea.json'), rel(c, idea.id, 'hilo', '001-usuario.md')],
      async () => {
        await fs.mkdir(dirIdeas(c), { recursive: true });
        const id = await slugUnico(dirIdeas(c), slugify(titulo));
        const ahora = new Date().toISOString();
        const idea = { id, carpetaId: c, titulo: titulo.trim(), creada: ahora, actualizada: ahora, estado: 'borrador' };
        await guardarIdea(idea);
        await escribirAtomico(path.join(dirIdea(c, id), 'hilo', '001-usuario.md'), cuerpo);
        return idea;
      },
    );
  }

  async function obtener(c, i) {
    return { ...(await leerIdea(c, i)), hilo: await mensajes(c, i) };
  }

  async function listar({ carpetaId, estado } = {}) {
    const ids = carpetaId ? [carpetaId] : (await carpetas.listar()).map((x) => x.id);
    const todas = [];
    for (const c of ids) {
      for (const i of await fs.readdir(dirIdeas(c)).catch(() => [])) {
        const idea = await leerJSON(path.join(dirIdea(c, i), 'idea.json'), null);
        if (idea && (!estado || idea.estado === estado)) todas.push(idea);
      }
    }
    return todas.sort((a, b) => a.creada.localeCompare(b.creada));
  }

  const tieneDictamen = async (c, i) => (await mensajes(c, i)).some((m) => m.autor === 'claude');

  async function editarOriginal(c, i, { titulo, cuerpo }) {
    const parche = {};
    if (titulo !== undefined) {
      if (!String(titulo).trim()) throw new Error('titulo-vacio');
      parche.titulo = String(titulo).trim();
    }
    if (cuerpo !== undefined) {
      const idea = await leerIdea(c, i);
      if (idea.estado === 'en-proceso') throw new Error('en-proceso');
      await proteger([rel(c, i, 'hilo', '001-usuario.md')], () =>
        escribirAtomico(path.join(dirIdea(c, i), 'hilo', '001-usuario.md'), cuerpo),
      );
      const actual = (await mensajes(c, i)).find((m) => m.n === 1)?.contenido;
      if (actual !== undefined && (await tieneDictamen(c, i))) {
        Object.assign(parche, { estado: 'replica-pendiente', editadaTrasDictamen: true });
      }
    }
    return actualizar(c, i, parche);
  }

  async function numeroSiguiente(c, i) {
    const ms = await mensajes(c, i);
    return (ms.at(-1)?.n ?? 0) + 1;
  }

  async function siguienteArchivo(c, i) {
    return `${String(await numeroSiguiente(c, i)).padStart(3, '0')}-claude.md`;
  }

  async function responder(c, i, cuerpo, adjuntos = []) {
    const ms = await mensajes(c, i);
    // Solo adjuntos ya subidos a esta idea y aún sin mensaje.
    const fichas = (await leerIdea(c, i)).adjuntos ?? [];
    const rutas = [...new Set((Array.isArray(adjuntos) ? adjuntos : []).map(String))];
    if (rutas.some((r) => !fichas.some((f) => f.ruta === r && f.mensaje === null))) throw new Error('ruta-invalida');
    if (!String(cuerpo).trim() && !rutas.length) throw new Error('replica-vacia');
    if (!ms.some((m) => m.autor === 'claude')) throw new Error('sin-dictamen');
    const idea = await leerIdea(c, i);
    if (idea.estado === 'en-proceso') throw new Error('en-proceso');
    // Varias réplicas seguidas se acumulan en el mismo mensaje pendiente.
    const ultimo = ms.at(-1);
    const archivo = ultimo.autor === 'usuario' && ultimo.n > 1
      ? ultimo.archivo
      : `${String(ultimo.n + 1).padStart(3, '0')}-usuario.md`;
    const texto = ultimo.autor === 'usuario' && ultimo.n > 1 ? [ultimo.contenido, cuerpo].filter((t) => t.trim()).join('\n\n') : cuerpo;
    await proteger([rel(c, i, 'hilo', archivo)], () => escribirAtomico(path.join(dirIdea(c, i), 'hilo', archivo), texto));
    const n = Number(archivo.slice(0, 3));
    return actualizar(c, i, (actual) => ({ estado: 'replica-pendiente', adjuntos: (actual.adjuntos ?? []).map((f) => (rutas.includes(f.ruta) ? { ...f, mensaje: n } : f)) }));
  }

  async function pendientes() {
    const grupos = [];
    for (const carpeta of await carpetas.listar()) {
      const ideas = [];
      for (const idea of await listar({ carpetaId: carpeta.id })) {
        if (!ESTADOS_PENDIENTES.has(idea.estado)) continue;
        const etiqueta = idea.trabajo === 'germinacion' ? 'GERMINACIÓN' : (await tieneDictamen(carpeta.id, idea.id)) ? 'ANALIZADA' : 'NUEVA';
        ideas.push({ ...idea, etiqueta });
      }
      if (ideas.length) grupos.push({ carpeta, ideas });
    }
    return grupos;
  }

  // Cualquier archivo: se guarda tal cual en adjuntos/ y, si una sesión no puede leerlo, se prepara su versión
  // legible en adjuntos/lectura/. Con `mensaje` queda unido a ese mensaje del hilo (1 = la idea original);
  // sin él espera a que una réplica lo lleve. Devuelve su ficha.
  // La conversión (que puede tardar minutos con un vídeo) se hace fuera de los datos y sin el candado del guard;
  // solo copiar el resultado y apuntarlo en idea.json van dentro, en un único turno.
  const reservados = new Set(); // nombres elegidos por subidas que aún se están convirtiendo
  async function adjuntar(c, i, nombre, buffer, { mensaje = null } = {}) {
    const idea = await leerIdea(c, i);
    if (mensaje !== null && mensaje !== 1) throw new Error('ruta-invalida');
    if (mensaje === 1 && idea.estado === 'en-proceso') throw new Error('en-proceso');
    const base = path.basename(String(nombre ?? '')).trim();
    if (!base) throw new Error('nombre-vacio');
    const m = base.match(/^(.*?)(?:\.([A-Za-z0-9]{1,10}))?$/);
    let ext = (m[2] ?? '').toLowerCase();
    let raiz = slugify(m[1] || 'archivo') || 'archivo';
    // .tmp lo ignora el git de los datos; «lectura» y «registro» son nombres de carpeta reservados.
    if (ext === 'tmp') [raiz, ext] = [`${raiz}-tmp`, ''];
    if (!ext && ['lectura', 'registro'].includes(raiz)) raiz = `${raiz}-archivo`;
    const dir = path.join(dirIdea(c, i), 'adjuntos');
    const libre = async (a) => !reservados.has(path.join(dir, a)) && !(await fs.access(path.join(dir, a)).then(() => true, () => false));
    let a = ext ? `${raiz}.${ext}` : raiz;
    for (let n = 2; !(await libre(a)); n++) a = ext ? `${raiz}-${n}.${ext}` : `${raiz}-${n}`;
    reservados.add(path.join(dir, a));
    const temporal = await fs.mkdtemp(path.join(os.tmpdir(), 'semillero-adjunto-'));
    try {
      await fs.writeFile(path.join(temporal, a), buffer);
      const l = await prepararLecturaDe(path.join(temporal, a), path.join(temporal, 'lectura'));
      const ficha = { ruta: `adjuntos/${a}`, nombre: base, tamano: buffer.length, tipo: l.tipo, lectura: l.lectura.map((x) => `adjuntos/${x}`), aviso: l.aviso, mensaje };
      const archivos = [ficha.ruta, ...ficha.lectura];
      await proteger([...archivos.map((x) => rel(c, i, x)), rel(c, i, 'idea.json')], async () => {
        for (const x of archivos) {
          const destino = path.join(dirIdea(c, i), x);
          await fs.mkdir(path.dirname(destino), { recursive: true });
          await fs.copyFile(path.join(temporal, x.replace(/^adjuntos\//, '')), destino);
        }
        const actual = await leerIdea(c, i);
        const parche = { adjuntos: [...(actual.adjuntos ?? []), ficha] };
        // Adjuntar a la idea original tras un dictamen es como editarla: la sesión debe volver a leerla.
        if (mensaje === 1 && (await tieneDictamen(c, i))) Object.assign(parche, { estado: 'replica-pendiente', editadaTrasDictamen: true });
        await guardarIdea({ ...actual, ...parche, actualizada: new Date().toISOString() });
      });
      return ficha;
    } finally {
      reservados.delete(path.join(dir, a));
      await fs.rm(temporal, { recursive: true, force: true });
    }
  }

  // Compatibilidad: las imágenes pegadas en el editor solo necesitan su ruta.
  async function guardarAdjunto(c, i, nombre, buffer) {
    return (await adjuntar(c, i, nombre, buffer)).ruta;
  }

  // Quita un adjunto de la idea original (o uno aún sin enviar) y borra el archivo y su versión legible.
  // Quitarlo de una idea ya dictaminada es como editarla: queda pendiente de reanálisis.
  async function quitarAdjunto(c, i, ruta) {
    const previa = await leerIdea(c, i);
    if (previa.estado === 'en-proceso') throw new Error('en-proceso');
    const ficha = (previa.adjuntos ?? []).find((a) => a.ruta === ruta);
    if (!ficha || (ficha.mensaje !== null && ficha.mensaje !== 1)) throw new Error('ruta-invalida');
    const archivos = [ficha.ruta, ...ficha.lectura];
    await proteger([...archivos.map((a) => rel(c, i, a)), rel(c, i, 'idea.json')], async () => {
      for (const a of archivos) await fs.rm(path.join(dirIdea(c, i), a), { force: true });
      const actual = await leerIdea(c, i);
      const parche = { adjuntos: (actual.adjuntos ?? []).filter((a) => a.ruta !== ruta) };
      if (ficha.mensaje === 1 && (await tieneDictamen(c, i))) Object.assign(parche, { estado: 'replica-pendiente', editadaTrasDictamen: true });
      await guardarIdea({ ...actual, ...parche, actualizada: new Date().toISOString() });
    });
    return leerIdea(c, i);
  }


  // Bloque que marca, dentro de una réplica, qué camino eligió el usuario (se puede quitar sin tocar su texto).
  const RE_ELECCION = /<!-- camino:[a-z0-9-]+ -->[\s\S]*?<!-- \/camino -->\n*/;
  // Sin marcadores de comentario HTML dentro: cortarían el bloque.
  const neutro = (t) => String(t ?? '').replace(/<!--|-->/g, '');
  const bloqueEleccion = (cam, comentario) =>
    `<!-- camino:${cam.id} -->\n**Elijo el camino «${neutro(cam.titulo)}»**, la variación que propusiste en tu dictamen.` +
    `${comentario ? `\n\n${neutro(comentario)}` : ''}\n<!-- /camino -->\n\n`;

  // Una réplica sin texto se borra, salvo que lleve adjuntos (entonces sigue siendo una réplica).
  const conAdjuntos = (idea, archivo) => (idea.adjuntos ?? []).some((a) => a.mensaje === Number(archivo.slice(0, 3)));
  async function escribirReplica(c, i, archivo, texto) {
    const ruta = path.join(dirIdea(c, i), 'hilo', archivo);
    const queda = texto.trim() || conAdjuntos(await leerIdea(c, i), archivo);
    await proteger([rel(c, i, 'hilo', archivo)], () => (queda ? escribirAtomico(ruta, texto) : fs.rm(ruta, { force: true })));
  }

  // Elegir (o desmarcar) uno de los caminos que propone el último dictamen.
  async function elegirCamino(c, i, { dictamen, camino, comentario = '' }) {
    const idea = await leerIdea(c, i);
    if (idea.estado === 'en-proceso') throw new Error('en-proceso');
    // Una idea pausada o que germina no recibe análisis: la elección nunca se enviaría.
    if (idea.estado === 'pausada' || idea.trabajo === 'germinacion') throw new Error('no-disponible');
    const ms = await mensajes(c, i);
    const ultimo = ms.findLast((m) => m.autor === 'claude');
    const misma = idea.eleccion?.dictamen === dictamen && idea.eleccion?.camino === camino;
    // Si el camino elegido ya no está en el dictamen (p. ej. tras una enmienda), aún se puede quitar.
    const cam = (ultimo?.archivo === dictamen ? ultimo.caminos.find((x) => x.id === camino) : null)
      ?? (misma ? { id: camino, tipo: 'variacion' } : null);
    if (!cam) throw new Error('camino-invalido');
    const nota = String(comentario ?? '').trim().slice(0, 5000);

    if (cam.tipo === 'idea-nueva') {
      const derivadas = idea.derivadas ?? [];
      const previa = derivadas.find((d) => d.dictamen === dictamen && d.camino === camino);
      if (previa) {
        const hija = await leerIdea(c, previa.ideaId).catch(() => null);
        if (hija && (hija.estado !== 'borrador' || (await tieneDictamen(c, previa.ideaId)))) throw new Error('ya-analizada');
        if (hija) await borrar(c, previa.ideaId);
        return actualizar(c, i, { derivadas: derivadas.filter((d) => d !== previa) });
      }
      const cuerpo = [
        cam.descripcion,
        ...(nota ? ['', nota] : []),
        '',
        `*Surge del dictamen de «${idea.titulo}» (carpetas/${c}/ideas/${i}), donde Claude la propuso como idea aparte.*`,
      ].join('\n');
      const hija = await crear(c, { titulo: cam.titulo, cuerpo });
      await actualizar(c, hija.id, { origen: { carpetaId: c, ideaId: i, camino } });
      return actualizar(c, i, { derivadas: [...derivadas, { dictamen, camino, carpetaId: c, ideaId: hija.id }] });
    }

    // Variación: una sola a la vez, guardada como réplica pendiente para el próximo análisis.
    const pendiente = ms.at(-1)?.autor === 'usuario' && ms.at(-1).n > 1 ? ms.at(-1) : null;
    const resto = (pendiente?.contenido ?? '').replace(RE_ELECCION, '');
    const archivo = pendiente?.archivo ?? `${String(ms.at(-1).n + 1).padStart(3, '0')}-usuario.md`;
    if (misma) {
      await escribirReplica(c, i, archivo, resto);
      // Sigue pendiente si queda texto en la réplica o una edición de la idea sin analizar.
      const pendienteAun = resto.trim() || conAdjuntos(idea, archivo) || idea.editadaTrasDictamen;
      return actualizar(c, i, { eleccion: null, estado: pendienteAun ? 'replica-pendiente' : (idea.veredicto ?? ultimo.meta?.veredicto ?? idea.estado) });
    }
    await escribirReplica(c, i, archivo, bloqueEleccion(cam, nota) + resto);
    return actualizar(c, i, { eleccion: { dictamen, camino }, estado: 'replica-pendiente' });
  }

  async function borrar(c, i) {
    const idea = await leerIdea(c, i);
    if (idea.estado === 'en-proceso') throw new Error('en-proceso');
    await proteger([rel(c, i)], () => fs.rm(dirIdea(c, i), { recursive: true, force: true }));
    // Una idea derivada de otra: la original deja de enlazarla.
    const o = idea.origen;
    const madre = o && (await leerIdea(o.carpetaId, o.ideaId).catch(() => null));
    if (madre?.derivadas?.some((d) => d.ideaId === i)) {
      await actualizar(o.carpetaId, o.ideaId, { derivadas: madre.derivadas.filter((d) => d.ideaId !== i) });
    }
  }

  return {
    crear, obtener, listar, actualizar, editarOriginal, responder, siguienteArchivo,
    numeroSiguiente, pendientes, guardarAdjunto, adjuntar, quitarAdjunto, borrar, mensajes, elegirCamino,
    dirIdea, relIdea: (c, i) => rel(c, i),
  };
}
