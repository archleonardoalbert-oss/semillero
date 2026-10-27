import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import { crearGuard } from '../engine/guard.js';
import { crearCola } from '../engine/cola.js';
import { crearAlmacenCarpetas } from '../store/carpetas.js';
import { crearAlmacenIdeas } from '../store/ideas.js';
import { crearAjustes } from '../store/ajustes.js';
import { crearAlmacenGlosas } from '../store/glosas.js';
import { crearAlmacenGerminacion } from '../store/germinacion.js';
import { crearAlmacenTalleres } from '../store/talleres.js';
import { crearMotorTaller } from '../engine/taller.js';
import { crearAlmacenExamenes } from '../store/examenes.js';
import { crearMotorExamenes } from '../engine/examenes.js';
import { crearAlmacenVerificaciones } from '../store/verificaciones.js';
import { crearMotorVerificacion } from '../engine/verificacion.js';
import { crearMotorGlosas } from '../engine/glosas.js';
import { crearMotorRedaccion } from '../engine/redaccion.js';
import { validarMapa } from '../engine/mapa.js';
import { tiposParaInterfaz, esTipo } from '../engine/tipos.js';
import { rutaSegura, slugify } from '../store/fsutil.js';
import { registrarWs } from './ws.js';
import { prepararSitio, RUTA_VISOR } from '../exportar/paquete.js';
import { compilar, SISTEMAS } from '../exportar/compilar.js';

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist');

const MIME = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  svg: 'image/svg+xml', md: 'text/markdown; charset=utf-8', json: 'application/json', jsonl: 'application/x-ndjson',
  pdf: 'application/pdf', txt: 'text/plain; charset=utf-8',
};

// Lo que puede cargar una escena aislada (ver el gancho onRequest).
const RE_PARA_ESCENAS = /^\/(escena\.html|assets\/[^/]+|archivos\/carpetas\/[a-z0-9-]+\/ideas\/[a-z0-9-]+\/germinacion\/escenas\/[a-z0-9-]+\/[a-z0-9-]+\.js)$/;
const RE_MODULO_ESCENA = /\/germinacion\/escenas\/[a-z0-9-]+\/[a-z0-9-]+\.js$/;

const ESTADO_HTTP = {
  'ruta-invalida': 400, 'extension-invalida': 400, 'nombre-vacio': 400, 'titulo-vacio': 400, 'refs-invalidos': 400,
  'tipo-invalido': 400, 'documento-invalido': 400, 'prompt-vacio': 400, 'fragmento-vacio': 400,
  'carpeta-no-existe': 404, 'idea-no-existe': 404, 'registro-no-existe': 404, 'glosa-no-existe': 404, cuota: 409,
  'carpeta-no-vacia': 409, 'sin-dictamen': 409, 'en-proceso': 409, 'no-aceptada': 409, 'no-germinable': 409, 'no-disponible': 409,
  'respuestas-invalidas': 400, 'so-invalido': 400, redactando: 409, 'tipo-fijo': 409, 'sin-mapa': 409, 'visor-no-construido': 409, 'tipo-invalido': 400, 'requiere-examen': 409, 'examen-abierto': 409, 'examen-cerrado': 409, 'tiempo-agotado': 409,
  'dificultad-invalida': 400, 'pregunta-invalida': 400, 'examen-no-existe': 404, 'verificacion-no-existe': 404, 'ya-resuelta': 409, 'requiere-verificacion': 409, 'sin-propuesta': 409, 'version-invalida': 400, 'camino-invalido': 400, 'ya-analizada': 409, 'nodo-invalido': 400, 'estado-invalido': 400,
};

function agrupar(carpetas, ideas, extra = () => ({})) {
  return carpetas
    .map((carpeta) => ({
      carpeta,
      ideas: ideas.filter((i) => i.carpetaId === carpeta.id).map((i) => ({ ...i, ...extra(i) })),
    }))
    .filter((g) => g.ideas.length);
}

export async function construirApp(cfg, { cola: colaInyectada, ejecutarGlosa, ejecutarTaller, ejecutarEvaluacion, ejecutarRedaccion, compilarExportacion = compilar, visorExportacion = RUTA_VISOR } = {}) {
  const app = Fastify({ logger: false, bodyLimit: 2 * 1024 * 1024 });
  const guard = crearGuard(cfg);
  await guard.iniciar();
  const carpetas = crearAlmacenCarpetas(cfg, { proteger: guard.proteger });
  const ideas = crearAlmacenIdeas(cfg, { proteger: guard.proteger });
  const ajustes = crearAjustes(cfg, { proteger: guard.proteger });
  const germinacion = crearAlmacenGerminacion(cfg, { proteger: guard.proteger });
  const cola = colaInyectada ?? crearCola({ cfg, ideas, carpetas, ajustes, guard, germinacion });
  app.decorate('cola', cola);
  const glosas = crearAlmacenGlosas(cfg, { proteger: guard.proteger });
  const motorGlosas = crearMotorGlosas({ cfg, ideas, glosas, guard, cola, ajustes, ...(ejecutarGlosa && { ejecutar: ejecutarGlosa }) });
  app.decorate('glosas', motorGlosas);
  const talleres = crearAlmacenTalleres(cfg, { proteger: guard.proteger });
  const motorTaller = crearMotorTaller({ cfg, ideas, carpetas, talleres, germinacion, guard, cola, ajustes, ...(ejecutarTaller && { ejecutar: ejecutarTaller }) });
  app.decorate('talleres', motorTaller);
  const examenes = crearAlmacenExamenes(cfg, { proteger: guard.proteger });
  const motorExamenes = crearMotorExamenes({ cfg, ideas, carpetas, examenes, germinacion, guard, cola, ajustes, ...(ejecutarEvaluacion && { ejecutar: ejecutarEvaluacion }) });
  app.decorate('examenes', motorExamenes);
  const verificaciones = crearAlmacenVerificaciones(cfg, { proteger: guard.proteger });
  const motorVerificacion = crearMotorVerificacion({ cfg, ideas, carpetas, verificaciones, germinacion, guard, cola, ajustes, ...(ejecutarEvaluacion && { ejecutar: ejecutarEvaluacion }) });
  app.decorate('verificaciones', motorVerificacion);
  const motorRedaccion = crearMotorRedaccion({ cfg, ideas, carpetas, germinacion, guard, cola, ajustes, ...(ejecutarRedaccion && { ejecutar: ejecutarRedaccion }) });
  app.decorate('redaccion', motorRedaccion);
  cola.registrarPausaManual?.((ref) => motorRedaccion.pausadaManual(ref));
  app.addHook('onClose', async () => motorRedaccion.detenerLatido());

  // Solo esta máquina: Host contra DNS rebinding y Origin contra webs ajenas abiertas en el navegador.
  const hostsValidos = new Set([`127.0.0.1:${cfg.puerto}`, `localhost:${cfg.puerto}`]);
  const origenesValidos = new Set([...hostsValidos].flatMap((h) => [`http://${h}`]).concat(['http://localhost:5173', 'http://127.0.0.1:5173']));
  app.addHook('onRequest', async (req, reply) => {
    const host = req.headers.host ?? '';
    const origen = req.headers.origin;
    const hostOk = hostsValidos.has(host) || /^(localhost|127\.0\.0\.1):5173$/.test(host);
    // Las escenas de los cursos corren en un iframe aislado (origen opaco: «Origin: null»). Solo pueden pedir
    // su reproductor, el código de la app y los módulos de escenas: nada de la API ni de los datos de la idea.
    const deEscena = origen === 'null' && ['GET', 'HEAD'].includes(req.method) && RE_PARA_ESCENAS.test(req.url.split('?')[0]);
    if (!hostOk || (origen && !origenesValidos.has(origen) && !deEscena)) return reply.code(403).send({ error: 'origen-no-permitido' });
    if (deEscena) reply.header('access-control-allow-origin', '*');
  });

  app.setErrorHandler((err, req, reply) => {
    const codigo = ESTADO_HTTP[err.message] ?? err.statusCode ?? 500;
    if (codigo >= 500) console.error('[api]', req.method, req.url, err);
    reply.code(codigo).send({ error: err.message });
  });

  app.addContentTypeParser(/^(image\/.+|application\/octet-stream)$/, { parseAs: 'buffer', bodyLimit: 20 * 1024 * 1024 },
    (req, body, done) => done(null, body));

  await app.register(fastifyWebsocket);
  registrarWs(app, cola, motorGlosas, motorTaller, motorExamenes, motorVerificacion, motorRedaccion);

  const refsDe = (body) => {
    const refs = body?.refs;
    if (!Array.isArray(refs) || refs.some((r) => slugify(r?.carpetaId) !== r?.carpetaId || slugify(r?.ideaId) !== r?.ideaId)) {
      throw new Error('refs-invalidos');
    }
    return refs.map(({ carpetaId, ideaId }) => ({ carpetaId, ideaId }));
  };

  app.get('/api/resumen', async () => {
    const todas = await ideas.listar();
    const cuenta = (e) => todas.filter((i) => i.estado === e).length;
    return {
      aceptadas: cuenta('aceptada'), rechazadas: cuenta('rechazada'), enProceso: cuenta('en-proceso'),
      aclaracion: cuenta('aclaracion'), cambios: cuenta('cambios'), noRecomendadas: cuenta('no-recomendada'), pausadas: cuenta('pausada'), borradores: cuenta('borrador'),
      pendientes: todas.filter((i) => ['borrador', 'replica-pendiente', 'detenida', 'error'].includes(i.estado)).length,
      total: todas.length, cola: cola.estado(),
    };
  });

  app.get('/api/carpetas', async () => {
    const [cs, todas] = await Promise.all([carpetas.listar(), ideas.listar()]);
    return cs.map((c) => ({ ...c, ideas: todas.filter((i) => i.carpetaId === c.id).map(({ id, titulo, estado }) => ({ id, titulo, estado })) }));
  });
  app.post('/api/carpetas', async (req, reply) => reply.code(201).send(await carpetas.crear(req.body ?? {})));
  app.patch('/api/carpetas/:c', async (req) => {
    const { nombre, color, tipo, descripcion } = req.body ?? {};
    // Se valida todo antes de escribir nada: o se aplica el cambio entero o ninguna parte.
    if (nombre !== undefined && !String(nombre ?? '').trim()) throw new Error('nombre-vacio');
    if (tipo !== undefined && !esTipo(tipo)) throw new Error('tipo-invalido');
    const parche = { ...(tipo !== undefined && { tipo }), ...(descripcion !== undefined && { descripcion }), ...(color !== undefined && { color }) };
    if (Object.keys(parche).length) await carpetas.actualizar(req.params.c, parche);
    if (nombre !== undefined) await carpetas.renombrar(req.params.c, nombre);
    return carpetas.obtener(req.params.c);
  });
  app.delete('/api/carpetas/:c', async (req, reply) => {
    await carpetas.borrar(req.params.c);
    return reply.code(204).send();
  });
  app.get('/api/carpetas/:c/notas', async (req) => {
    await carpetas.obtener(req.params.c);
    return { texto: await fsp.readFile(rutaSegura(cfg.datos, `carpetas/${req.params.c}/notas.md`), 'utf8').catch(() => '') };
  });
  app.get('/api/notas-globales', async () => ({
    texto: await fsp.readFile(path.join(cfg.datos, 'notas-globales.md'), 'utf8').catch(() => ''),
  }));

  app.get('/api/ideas', async (req) => ideas.listar({ estado: req.query.estado || undefined, carpetaId: req.query.carpeta || undefined }));
  app.post('/api/carpetas/:c/ideas', async (req, reply) => reply.code(201).send(await ideas.crear(req.params.c, req.body ?? {})));
  app.get('/api/carpetas/:c/ideas/:i', async (req) => ideas.obtener(req.params.c, req.params.i));
  app.patch('/api/carpetas/:c/ideas/:i', async (req) => {
    const { titulo, cuerpo } = req.body ?? {};
    await ideas.editarOriginal(req.params.c, req.params.i, { titulo, cuerpo });
    return ideas.obtener(req.params.c, req.params.i);
  });
  app.delete('/api/carpetas/:c/ideas/:i', async (req, reply) => {
    // Con su curso redactándose, las sesiones seguirían escribiendo en la carpeta borrada.
    if (app.redaccion?.ocupada({ carpetaId: req.params.c, ideaId: req.params.i })) throw new Error('redactando');
    await ideas.borrar(req.params.c, req.params.i);
    return reply.code(204).send();
  });
  app.post('/api/carpetas/:c/ideas/:i/replica', async (req) => {
    await ideas.responder(req.params.c, req.params.i, String(req.body?.cuerpo ?? ''));
    return ideas.obtener(req.params.c, req.params.i);
  });
  app.post('/api/carpetas/:c/ideas/:i/camino', async (req) => {
    const { dictamen, camino, comentario } = req.body ?? {};
    await ideas.elegirCamino(req.params.c, req.params.i, { dictamen: String(dictamen ?? ''), camino: String(camino ?? ''), comentario });
    return ideas.obtener(req.params.c, req.params.i);
  });
  app.post('/api/carpetas/:c/ideas/:i/adjuntos', async (req, reply) => {
    if (!Buffer.isBuffer(req.body)) throw new Error('extension-invalida');
    const ruta = await ideas.guardarAdjunto(req.params.c, req.params.i, String(req.query.nombre ?? ''), req.body);
    return reply.code(201).send({ ruta });
  });

  app.get('/api/carpetas/:c/ideas/:i/registros', async (req) => {
    const dir = path.join(ideas.dirIdea(req.params.c, req.params.i), 'registro');
    return (await fsp.readdir(dir).catch(() => [])).filter((a) => a.endsWith('.jsonl')).sort();
  });
  app.get('/api/carpetas/:c/ideas/:i/registros/:archivo', async (req, reply) => {
    const dir = path.join(ideas.dirIdea(req.params.c, req.params.i), 'registro');
    // Solo los registros de análisis y germinación (no los de exámenes, glosas… en subcarpetas).
    if (!/^[^/\\]+\.jsonl$/.test(req.params.archivo)) throw new Error('ruta-invalida');
    const texto = await fsp.readFile(rutaSegura(dir, req.params.archivo), 'utf8').catch((e) => {
      throw new Error(e.message === 'ruta-invalida' ? e.message : 'registro-no-existe');
    });
    return reply.type('application/x-ndjson').send(texto);
  });

  app.get('/api/carpetas/:c/ideas/:i/glosas', async (req) => {
    await ideas.obtener(req.params.c, req.params.i);
    return glosas.listar(req.params.c, req.params.i);
  });
  app.post('/api/carpetas/:c/ideas/:i/glosas', async (req, reply) =>
    reply.code(201).send(await motorGlosas.pedir({ carpetaId: req.params.c, ideaId: req.params.i }, req.body ?? {})));
  app.post('/api/carpetas/:c/ideas/:i/glosas/:g/seguir', async (req) =>
    motorGlosas.seguir({ carpetaId: req.params.c, ideaId: req.params.i }, req.params.g, req.body?.prompt));

  const refDe = (req) => ({ carpetaId: req.params.c, ideaId: req.params.i });
  app.post('/api/carpetas/:c/ideas/:i/germinar', async (req) => {
    const { peticion, forzar, camino, comentario, cuerpo } = req.body ?? {};
    // El camino se busca en el último dictamen: el cliente solo manda su id.
    let elegido = null;
    if (camino) {
      const idea = await ideas.obtener(req.params.c, req.params.i);
      elegido = idea.hilo.findLast((m) => m.autor === 'claude')?.caminos.find((x) => x.id === camino && x.tipo === 'variacion');
      if (!elegido) throw new Error('camino-invalido');
    }
    // Mientras las asignaturas de un curso se redactan, el plan de estudios no se toca.
    if (motorRedaccion.ocupada(refDe(req))) throw new Error('redactando');
    await cola.germinar(refDe(req), {
      peticion: String(peticion ?? '').slice(0, 20000), forzar: Boolean(forzar), camino: elegido, comentario: String(comentario ?? '').slice(0, 5000),
      ...(typeof cuerpo === 'string' && { cuerpo }),
    });
    return ideas.obtener(req.params.c, req.params.i);
  });
  // Pausa manual de una germinación: la sesión principal y todas las redacciones de la idea se detienen guardando
  // lo escrito y su conversación. Responde cuando todo está detenido. «Continuar» retoma cada una donde estaba.
  app.post('/api/carpetas/:c/ideas/:i/germinacion/pausar', async (req) => {
    const ref = refDe(req);
    const idea = await ideas.obtener(ref.carpetaId, ref.ideaId);
    if (idea.trabajo !== 'germinacion') throw new Error('no-germinable');
    // La sesión principal cuenta como pausada si estaba en marcha, esperando en cola o pausada por la cuota.
    const principal = ['en-proceso', 'pausada'].includes(idea.estado);
    if (idea.estado === 'en-proceso') {
      await cola.detener([ref]);
      for (let k = 0; k < 120 && (await ideas.obtener(ref.carpetaId, ref.ideaId)).estado === 'en-proceso'; k++) await new Promise((r) => setTimeout(r, 250));
    }
    await motorRedaccion.pausar(ref, { principal });
    return ideas.obtener(ref.carpetaId, ref.ideaId);
  });
  app.post('/api/carpetas/:c/ideas/:i/germinacion/continuar', async (req) => {
    const ref = refDe(req);
    const idea = await ideas.obtener(ref.carpetaId, ref.ideaId);
    if (idea.trabajo !== 'germinacion') throw new Error('no-germinable');
    const { principal } = (await motorRedaccion.continuar(ref)) ?? {};
    // La sesión principal, si se pausó, sigue en su conversación («continúa donde la dejaste»).
    const ahora = await ideas.obtener(ref.carpetaId, ref.ideaId);
    if (ahora.estado === 'pausada') await cola.reanudar([ref]);
    else if (principal || ahora.estado === 'detenida') await cola.germinar(ref, {});
    return ideas.obtener(ref.carpetaId, ref.ideaId);
  });
  // Mandos de la redacción del curso: «Comenzar» todas y, por asignatura, comenzar, pausar o continuar.
  const RD = '/api/carpetas/:c/ideas/:i/germinacion/redaccion';
  app.post(`${RD}/comenzar`, async (req) => {
    await motorRedaccion.comenzar(refDe(req));
    return motorRedaccion.estado(refDe(req));
  });
  for (const [accion, fn] of [['comenzar', 'comenzarNodo'], ['pausar', 'pausarNodo'], ['continuar', 'continuarNodo']]) {
    app.post(`${RD}/:n/${accion}`, async (req) => {
      await motorRedaccion[fn](refDe(req), req.params.n);
      return motorRedaccion.estado(refDe(req));
    });
  }
  app.post('/api/carpetas/:c/ideas/:i/germinacion/redaccion/:n/reintentar', async (req) => {
    await motorRedaccion.reintentar(refDe(req), req.params.n);
    return motorRedaccion.estado(refDe(req));
  });
  app.get('/api/carpetas/:c/ideas/:i/germinacion', async (req) => {
    await ideas.obtener(req.params.c, req.params.i);
    const [enDisco, progreso] = await Promise.all([
      germinacion.leerMapa(req.params.c, req.params.i),
      germinacion.leerProgreso(req.params.c, req.params.i),
    ]);
    // Mientras una sesión escribe, el mapa en disco puede estar a medias: se sirve el último bueno.
    let v = enDisco && validarMapa(enDisco);
    if (!v?.ok) {
      const texto = await guard.commiteado(`carpetas/${req.params.c}/ideas/${req.params.i}/germinacion/mapa.json`);
      try {
        v = texto && validarMapa(JSON.parse(texto));
      } catch {
        v = null;
      }
    }
    return { mapa: v?.ok ? v.mapa : null, progreso, redaccion: await motorRedaccion.estado(refDe(req)) };
  });
  app.put('/api/carpetas/:c/ideas/:i/germinacion/respuestas', async (req) => {
    await ideas.obtener(req.params.c, req.params.i);
    return germinacion.guardarRespuestas(req.params.c, req.params.i, req.body?.respuestas);
  });
  app.patch('/api/carpetas/:c/ideas/:i/germinacion/nodos/:n', async (req) => {
    await ideas.obtener(req.params.c, req.params.i);
    const { estado, notas } = req.body ?? {};
    return germinacion.marcarNodo(req.params.c, req.params.i, req.params.n, { estado, notas });
  });

  const T = '/api/carpetas/:c/ideas/:i/germinacion/talleres/:n';
  app.get(T, async (req) => {
    await ideas.obtener(req.params.c, req.params.i);
    const [taller, entrantes] = await Promise.all([
      talleres.leer(req.params.c, req.params.i, req.params.n),
      talleres.conexionesEntrantes(req.params.c, req.params.i, req.params.n),
    ]);
    return { taller, entrantes };
  });
  app.post(`${T}/mensajes`, async (req) => motorTaller.enviar(refDe(req), req.params.n, { texto: req.body?.texto, adjuntos: req.body?.adjuntos }));
  app.post(`${T}/adjuntos`, async (req, reply) => {
    if (!Buffer.isBuffer(req.body)) throw new Error('extension-invalida');
    await ideas.obtener(req.params.c, req.params.i);
    const ruta = await talleres.guardarAdjunto(req.params.c, req.params.i, req.params.n, String(req.query.nombre ?? ''), req.body);
    return reply.code(201).send({ ruta });
  });
  app.post(`${T}/propuesta`, async (req) => {
    const accion = req.body?.accion;
    if (accion === 'aplicar') return motorTaller.aplicar(refDe(req), req.params.n);
    if (accion === 'descartar') return motorTaller.descartar(refDe(req), req.params.n);
    throw new Error('ruta-invalida');
  });
  app.post(`${T}/restaurar`, async (req) => motorTaller.restaurar(refDe(req), req.params.n, req.body?.version));

  const X = '/api/carpetas/:c/ideas/:i/germinacion/examenes/:n';
  app.get(X, async (req) => {
    await ideas.obtener(req.params.c, req.params.i);
    return examenes.listar(req.params.c, req.params.i, req.params.n);
  });
  app.post(X, async (req, reply) => reply.code(201).send(await motorExamenes.generar(refDe(req), req.params.n, { dificultad: req.body?.dificultad })));
  app.get(`${X}/:x`, async (req) => examenes.leer(req.params.c, req.params.i, req.params.n, req.params.x));
  app.put(`${X}/:x/respuestas/:p`, async (req) =>
    motorExamenes.responder(refDe(req), req.params.n, req.params.x, { pregunta: req.params.p, texto: req.body?.texto, adjuntos: req.body?.adjuntos }));
  app.post(`${X}/:x/adjuntos`, async (req, reply) => {
    if (!Buffer.isBuffer(req.body)) throw new Error('extension-invalida');
    const ruta = await motorExamenes.adjuntar(refDe(req), req.params.n, req.params.x, String(req.query.pregunta ?? ''), String(req.query.nombre ?? ''), req.body);
    return reply.code(201).send({ ruta });
  });
  app.post(`${X}/:x/entregar`, async (req) => motorExamenes.entregar(refDe(req), req.params.n, req.params.x));
  app.post(`${X}/:x/corregir`, async (req) => motorExamenes.reintentarCorreccion(refDe(req), req.params.n, req.params.x));

  const V = '/api/carpetas/:c/ideas/:i/germinacion/verificaciones/:n';
  app.get(V, async (req) => {
    await ideas.obtener(req.params.c, req.params.i);
    return verificaciones.listar(req.params.c, req.params.i, req.params.n);
  });
  app.post(V, async (req, reply) => reply.code(201).send(await motorVerificacion.enviar(refDe(req), req.params.n, { texto: req.body?.texto, adjuntos: req.body?.adjuntos })));
  app.post(`${V}/adjuntos`, async (req, reply) => {
    if (!Buffer.isBuffer(req.body)) throw new Error('extension-invalida');
    await ideas.obtener(req.params.c, req.params.i);
    const ruta = await verificaciones.guardarAdjunto(req.params.c, req.params.i, req.params.n, String(req.query.nombre ?? ''), req.body);
    return reply.code(201).send({ ruta });
  });

  const agrupadas = async (filtro, extra) => agrupar(await carpetas.listar(), (await ideas.listar()).filter(filtro), extra);
  app.get('/api/pendientes', async () => ideas.pendientes());
  app.get('/api/pausadas', async () => agrupadas((i) => i.estado === 'pausada', () => ({ etiqueta: 'PAUSADA' })));
  app.get('/api/activas', async () => {
    const { ejecutando, enCola } = cola.estado();
    const k = (r) => `${r.carpetaId}/${r.ideaId}`;
    const corriendo = new Set(ejecutando.map(k));
    const esperando = new Set(enCola.map(k));
    return agrupadas(
      (i) => corriendo.has(`${i.carpetaId}/${i.id}`) || esperando.has(`${i.carpetaId}/${i.id}`),
      (i) => ({ etiqueta: corriendo.has(`${i.carpetaId}/${i.id}`) ? 'EN CURSO' : 'EN COLA' }),
    );
  });

  for (const accion of ['lanzar', 'detener', 'reanudar']) {
    app.post(`/api/analisis/${accion}`, async (req) => {
      const refs = refsDe(req.body);
      await cola[accion](refs);
      return cola.estado();
    });
  }

  app.get('/api/ajustes', async () => ajustes.leer());
  app.get('/api/tipos', async () => tiposParaInterfaz());

  // Exportar la germinación como un ejecutable autónomo (Linux o Windows) que se descarga.
  app.get('/api/carpetas/:c/ideas/:i/exportar/:so', async (req, reply) => {
    const { c, i, so } = req.params;
    if (!Object.hasOwn(SISTEMAS, so)) throw new Error('so-invalido');
    // Con una sesión trabajando en la idea el mapa y los documentos pueden estar a medio reescribir.
    if ((await ideas.obtener(c, i)).estado === 'en-proceso') throw new Error('en-proceso');
    const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'semillero-exportar-'));
    const limpiar = () => fsp.rm(tmp, { recursive: true, force: true });
    try {
      await prepararSitio({
        cfg, ideas, carpetas, ref: { carpetaId: c, ideaId: i }, destino: path.join(tmp, 'sitio'), visor: visorExportacion,
        respaldo: () => guard.commiteado(`carpetas/${c}/ideas/${i}/germinacion/mapa.json`),
      });
      const nombre = `${slugify((await ideas.obtener(c, i)).titulo) || 'idea'}-germinacion${so === 'windows' ? '.exe' : '-linux'}`;
      const salida = path.join(tmp, nombre);
      await compilarExportacion({ sitio: path.join(tmp, 'sitio'), so, salida });
      const flujo = fs.createReadStream(salida);
      flujo.on('close', limpiar);
      reply.header('content-disposition', `attachment; filename="${nombre}"`);
      reply.header('content-length', (await fsp.stat(salida)).size);
      return reply.type('application/octet-stream').send(flujo);
    } catch (e) {
      await limpiar();
      throw e;
    }
  });
  app.put('/api/ajustes', async (req) => ajustes.guardar(req.body ?? {}));

  app.get('/archivos/*', async (req, reply) => {
    const rel = req.params['*'];
    // Los registros de ejecución (stream completo de las sesiones, con su pensamiento) no se sirven:
    // en los exámenes contienen la rúbrica.
    if (rel.split('/').some((s) => s.startsWith('.') || s === 'registro')) throw new Error('ruta-invalida');
    const ruta = rutaSegura(cfg.datos, rel);
    const st = await fsp.stat(ruta).catch(() => null);
    if (!st?.isFile()) return reply.code(404).send({ error: 'no-existe' });
    const ext = path.extname(ruta).slice(1).toLowerCase();
    reply.header('cache-control', 'no-cache');
    if (ext === 'svg') reply.header('content-security-policy', "default-src 'none'; style-src 'unsafe-inline'");
    // Solo los módulos de escenas se sirven como código (y solo los carga el reproductor aislado).
    if (ext === 'js' && RE_MODULO_ESCENA.test(rel)) return reply.type('text/javascript; charset=utf-8').send(fs.createReadStream(ruta));
    return reply.type(MIME[ext] ?? 'application/octet-stream').send(fs.createReadStream(ruta));
  });

  if (fs.existsSync(DIST)) {
    await app.register(fastifyStatic, {
      root: DIST,
      // El reproductor de escenas: sin poder conectarse a nada, y solo con código de este mismo servidor.
      setHeaders(res, ruta) {
        if (path.basename(ruta) !== 'escena.html') return;
        // Según la versión, @fastify/static pasa la respuesta cruda o la de Fastify.
        const host = `http://${(res.req ?? res.request)?.headers?.host ?? '127.0.0.1'}`;
        (res.setHeader ? res.setHeader.bind(res) : res.header.bind(res))('content-security-policy', `default-src 'none'; script-src ${host}; style-src ${host} 'unsafe-inline'; font-src ${host} data:; img-src ${host} data:; connect-src 'none'; base-uri 'none'; form-action 'none'`);
      },
    });
    app.setNotFoundHandler((req, reply) => {
      if (req.method === 'GET' && !req.url.startsWith('/api/')) return reply.sendFile('index.html');
      reply.code(404).send({ error: 'no-existe' });
    });
  }

  return app;
}
