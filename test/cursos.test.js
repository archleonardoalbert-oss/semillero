// Semillero VIII: los bancales «Aprender algo nuevo» generan cursos universitarios.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { crearAlmacenCarpetas } from '../server/store/carpetas.js';
import { crearAlmacenIdeas } from '../server/store/ideas.js';
import { crearAjustes } from '../server/store/ajustes.js';
import { crearGuard } from '../server/engine/guard.js';
import { crearCola } from '../server/engine/cola.js';
import { crearAlmacenGerminacion } from '../server/store/germinacion.js';
import { cfgTemporal } from './helpers.js';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function hasta(cond, ms = 4000) {
  const t0 = Date.now();
  while (!(await cond())) {
    if (Date.now() - t0 > ms) return;
    await esperar(20);
  }
}

// ejecutar falso: cada llamada queda pendiente hasta que el test la termina.
function crearEjecutarFalso() {
  const llamadas = [];
  const ejecutar = (op) =>
    new Promise((resolve) => {
      llamadas.push({
        ...op, resolve,
        mensaje: op.args[op.args.indexOf('-p') + 1],
        sistema: op.args[op.args.indexOf('--append-system-prompt') + 1],
      });
      op.alEvento({ type: 'system', subtype: 'init' });
      op.senal?.addEventListener('abort', () => resolve({ codigo: 130, abortado: true }));
    });
  return { ejecutar, llamadas };
}

// Un bancal de aprendizaje con una idea corta y directa.
export async function aprendizaje({ tipo = 'aprendizaje' } = {}) {
  const cfg = await cfgTemporal();
  const guard = crearGuard(cfg);
  await guard.iniciar();
  const carpetas = crearAlmacenCarpetas(cfg, { proteger: guard.proteger });
  await carpetas.crear({ nombre: 'Aprender', tipo });
  const ideas = crearAlmacenIdeas(cfg, { proteger: guard.proteger });
  const idea = await ideas.crear('aprender', { titulo: 'Topología algebraica', cuerpo: 'Quiero aprender topología algebraica.' });
  const ajustes = crearAjustes(cfg, { proteger: guard.proteger });
  const falso = crearEjecutarFalso();
  const germinacion = crearAlmacenGerminacion(cfg, { proteger: guard.proteger });
  const cola = crearCola({ cfg, ideas, carpetas, ajustes, guard, germinacion, ejecutar: falso.ejecutar, notificar: async () => {} });
  const ref = { carpetaId: 'aprender', ideaId: idea.id };
  const dirIdea = path.join(cfg.datos, 'carpetas/aprender/ideas', idea.id);
  return { cfg, guard, carpetas, ideas, ajustes, germinacion, falso, cola, ref, dirIdea };
}

async function terminarConDictamen(x, n, dictamen) {
  await hasta(() => x.falso.llamadas[n]);
  const l = x.falso.llamadas[n];
  const destino = l.mensaje.match(/Escribe tu dictamen en (\S+)$/)[1];
  await fs.mkdir(path.dirname(path.join(l.cwd, destino)), { recursive: true });
  await fs.writeFile(path.join(l.cwd, destino), dictamen);
  l.resolve({ codigo: 0, abortado: false, resultado: { subtype: 'success', is_error: false } });
  await hasta(async () => (await x.ideas.obtener(x.ref.carpetaId, x.ref.ideaId)).estado !== 'en-proceso');
}

const RECHAZO = '---\nveredicto: rechazada\netapa: 1\nresumen: No merece la pena\netiqueta: Habilidad en declive\n---\n\nCuerpo';

test('una idea de aprender nunca queda rechazada rotundamente: pasa a «no recomendada» y se puede germinar', async () => {
  const x = await aprendizaje();
  await x.cola.lanzar([x.ref]);
  await terminarConDictamen(x, 0, RECHAZO);
  const idea = await x.ideas.obtener(x.ref.carpetaId, x.ref.ideaId);
  assert.equal(idea.estado, 'no-recomendada');
  assert.equal(idea.veredicto, 'no-recomendada');
  // El manuscrito también lo dice, para que el dictamen y el estado no se contradigan.
  assert.match(idea.hilo.at(-1).contenido ?? '', /Cuerpo/);
  assert.equal(idea.hilo.at(-1).meta.veredicto, 'no-recomendada');
  await x.cola.germinar(x.ref, { forzar: true, comentario: 'Quiero hacerlo igualmente' });
  await hasta(() => x.falso.llamadas[1]);
  assert.ok(x.falso.llamadas[1], 'la germinación arranca');
});

test('en otros tipos el rechazo rotundo se mantiene', async () => {
  const x = await aprendizaje({ tipo: 'negocio' });
  await x.cola.lanzar([x.ref]);
  await terminarConDictamen(x, 0, RECHAZO);
  assert.equal((await x.ideas.obtener(x.ref.carpetaId, x.ref.ideaId)).estado, 'rechazada');
});

// --- Diagnóstico y plan del curso ---
import { validarMapa, conPreguntaIdiomas, IDIOMAS } from '../server/engine/mapa.js';
import { MAPA, DIAGNOSTICO, copia } from './fixtures/mapas.js';

test('el diagnóstico admite ejercicios de prueba y preguntas de varias opciones', () => {
  const d = copia(DIAGNOSTICO);
  d.diagnostico.preguntas.push(
    { id: 'p4', tipo: 'prueba', area: 'Álgebra lineal', texto: 'Calcula los autovalores de $\\begin{pmatrix}2&1\\\\1&2\\end{pmatrix}$.' },
    { id: 'p5', tipo: 'multiple', texto: '¿Qué has usado?', opciones: ['NumPy', 'MATLAB', 'Julia'] },
  );
  assert.equal(validarMapa(d).ok, true);
  d.diagnostico.preguntas.push({ id: 'p6', tipo: 'multiple', texto: 'x', opciones: ['una'] });
  assert.match(validarMapa(d).motivo, /al menos 2 opciones/);
});

test('los nodos de estudio pueden llevar el plan de sus conferencias', () => {
  const m = copia(MAPA);
  m.nodos[0].plan = [{ titulo: 'Espacios vectoriales', objetivos: ['Decidir si un conjunto es subespacio'] }, { titulo: 'Autovalores', objetivos: [] }];
  assert.equal(validarMapa(m).ok, true);
  m.nodos[0].plan = [{ titulo: '' }];
  assert.match(validarMapa(m).motivo, /plan/);
});

test('la pregunta de idiomas se añade al final una sola vez', () => {
  const d = conPreguntaIdiomas(copia(DIAGNOSTICO));
  const ultima = d.diagnostico.preguntas.at(-1);
  assert.equal(ultima.id, 'idiomas');
  assert.equal(ultima.tipo, 'multiple');
  assert.deepEqual(ultima.opciones, IDIOMAS);
  assert.equal(conPreguntaIdiomas(d).diagnostico.preguntas.filter((p) => p.id === 'idiomas').length, 1);
  assert.equal(validarMapa(d).ok, true);
});

async function terminarGerminacion(x, n, mapa) {
  await hasta(() => x.falso.llamadas[n]);
  const g = path.join(x.dirIdea, 'germinacion');
  await fs.mkdir(path.join(g, 'nodos'), { recursive: true });
  await fs.writeFile(path.join(g, 'mapa.json'), JSON.stringify(mapa));
  for (const nodo of mapa.nodos ?? []) await fs.writeFile(path.join(g, nodo.documento), `# ${nodo.titulo}`);
  x.falso.llamadas[n].resolve({ codigo: 0, abortado: false, resultado: { subtype: 'success', is_error: false } });
  await hasta(async () => (await x.ideas.obtener(x.ref.carpetaId, x.ref.ideaId)).estado !== 'en-proceso');
}

async function aceptadaYGerminando(opciones) {
  const x = await aprendizaje(opciones);
  await x.cola.lanzar([x.ref]);
  await terminarConDictamen(x, 0, '---\nveredicto: aceptada\netapa: 2\nresumen: Vale la pena\n---\n\nCuerpo');
  await x.cola.germinar(x.ref, {});
  return x;
}

test('al aceptar el diagnóstico de un curso se añade la pregunta de idiomas', async () => {
  const x = await aceptadaYGerminando();
  await terminarGerminacion(x, 1, DIAGNOSTICO);
  const mapa = JSON.parse(await fs.readFile(path.join(x.dirIdea, 'germinacion/mapa.json'), 'utf8'));
  assert.equal(mapa.diagnostico.preguntas.at(-1).id, 'idiomas');
  const otro = await aceptadaYGerminando({ tipo: 'academico' });
  await terminarGerminacion(otro, 1, DIAGNOSTICO);
  const m2 = JSON.parse(await fs.readFile(path.join(otro.dirIdea, 'germinacion/mapa.json'), 'utf8'));
  assert.ok(!m2.diagnostico.preguntas.some((p) => p.id === 'idiomas'));
});

test('las respuestas de varias opciones se guardan como lista y llegan a la sesión con los ejercicios marcados', async () => {
  const x = await aceptadaYGerminando();
  const d = copia(DIAGNOSTICO);
  d.diagnostico.preguntas.push({ id: 'p4', tipo: 'prueba', area: 'Álgebra', texto: 'Calcula $2+2$.' });
  await terminarGerminacion(x, 1, d);
  await x.germinacion.guardarRespuestas(x.ref.carpetaId, x.ref.ideaId, { p1: 'Algo', p4: '4, creo', idiomas: ['English', 'Español', 'Klingon'] });
  const p = await x.germinacion.leerProgreso(x.ref.carpetaId, x.ref.ideaId);
  assert.deepEqual(p.respuestas.idiomas, ['English', 'Español']);
  await x.cola.germinar(x.ref, {});
  await hasta(() => x.falso.llamadas[2]);
  const m = x.falso.llamadas[2].mensaje;
  assert.match(m, /Ejercicio de prueba \(Álgebra\)/);
  assert.match(m, /4, creo/);
  assert.match(m, /English, Español/);
  assert.match(m, /Idiomas del curso: English, Español/);
});

// --- Índice de un nodo redactado ---
import { validarIndice, escenasDe } from '../server/engine/indice.js';

const INDICE = {
  version: 1,
  conferencias: [
    { id: 'c01-espacios', titulo: 'Espacios vectoriales', resumen: 'Axiomas y ejemplos', objetivos: ['Decidir si un conjunto es subespacio'], documento: 'nodos/e1/c01-espacios.md' },
    { id: 'c02-autovalores', titulo: 'Autovalores', documento: 'nodos/e1/c02-autovalores.md' },
  ],
  practicas: [{ id: 'p01', titulo: 'Clase práctica 1', documento: 'nodos/e1/p01.md', conferencias: ['c01-espacios'] }],
  valientes: [{ id: 'v01-dimension', titulo: 'Toda base tiene el mismo cardinal', documento: 'nodos/e1/v01-dimension.md' }],
  recursos: [{ id: 'r-axler', tipo: 'libro', titulo: 'Linear Algebra Done Right', autores: 'Axler', anio: 2024, url: 'https://linear.axler.net', archivo: 'recursos/e1/axler-ladr4e.pdf', idioma: 'English', conferencias: ['c01-espacios'] }],
};

test('un índice de nodo válido se acepta y sus rutas quedan dentro del nodo', () => {
  const v = validarIndice(copia(INDICE), 'e1');
  assert.equal(v.ok, true, v.motivo);
  const fuera = copia(INDICE);
  fuera.conferencias[0].documento = 'nodos/e2/c01.md';
  assert.match(validarIndice(fuera, 'e1').motivo, /nodos\/e1\//);
  const recurso = copia(INDICE);
  recurso.recursos[0].archivo = 'recursos/axler.pdf';
  assert.match(validarIndice(recurso, 'e1').motivo, /recursos\/e1\//);
  const sinConf = copia(INDICE);
  sinConf.conferencias = [];
  assert.match(validarIndice(sinConf, 'e1').motivo, /conferencia/);
  const practicaMala = copia(INDICE);
  practicaMala.practicas[0].conferencias = ['c99'];
  assert.match(validarIndice(practicaMala, 'e1').motivo, /c99/);
});

test('las escenas citadas en una conferencia se extraen de sus bloques', () => {
  const md = 'Texto\n\n```escena\n{"archivo": "escenas/e1/base.js", "titulo": "Una base", "pie": "Arrastra los vectores"}\n```\n\nMás\n\n```escena\n{"archivo": "../fuera.js"}\n```\n';
  const e = escenasDe(md, 'e1');
  assert.deepEqual(e.validas.map((x) => x.archivo), ['escenas/e1/base.js']);
  assert.equal(e.invalidas.length, 1);
});

// --- Instrucciones de las sesiones de un curso ---
import { promptSistema, promptGerminacion } from '../server/engine/prompt.js';
import { promptRedactor, mensajeRedaccion, argsRedaccion } from '../server/engine/curso.js';
import { PROBAR_SITIO } from '../server/cursos/probar-sitio.js';

test('las sesiones de un curso reciben sus reglas: nunca rechazar, diagnóstico con prueba y plan universitario', () => {
  assert.match(promptSistema('aprendizaje'), /NUNCA «rechazada»/);
  assert.match(promptSistema('aprendizaje'), /cortas y directas/);
  const g = promptGerminacion('aprendizaje');
  for (const t of ['"tipo": "prueba"', 'plan de estudios universitario', 'Diseña hacia atrás', 'NO redactes las conferencias', 'Semillero la añade']) assert.ok(g.includes(t), t);
  const r = promptRedactor();
  for (const t of ['Manual del redactor de cursos', 'Inversión de la pericia', 'Freeman', 'Tversky', 'Ainsworth', 'web propia', '/semillero-puente.js', '"version": 2', 'NUNCA descargues de sitios piratas', PROBAR_SITIO]) assert.ok(r.includes(t), t);
  assert.ok(!r.includes('S.definirEscena'), 'el motor de EDO ya no se ofrece');
  assert.ok(argsRedaccion({ ajustes: { esfuerzo: 'high' }, mensaje: 'x' }).some((a) => a.includes('Bash(node:*)')));
  const m = mensajeRedaccion({
    idea: { titulo: 'Topología' }, rutaIdea: 'carpetas/a/ideas/t', nodo: { id: 'e1', titulo: 'Grupos', documento: 'nodos/e1.md', plan: [{ titulo: 'Grupos libres', objetivos: ['Presentar un grupo'] }] },
    mapa: {}, dependencias: [], respuestasDiagnostico: '### x', idiomas: ['English', 'Español'],
  });
  assert.match(m, /Escribe TODO en English/);
  assert.match(m, /1\. Grupos libres — objetivos: Presentar un grupo/);
  assert.match(m, /indice\.json$/);
});

// --- Escenas aisladas: qué puede pedir un iframe con origen opaco (Origin: null) ---
import { EventEmitter } from 'node:events';
import { construirApp } from '../server/api/rutas.js';

function colaFalsa() {
  const c = new EventEmitter();
  for (const m of ['lanzar', 'detener', 'reanudar', 'germinar']) c[m] = async () => {};
  c.estado = () => ({ ejecutando: [], enCola: [], pausadaPorCuota: false, cuota: null });
  c.recuperar = async () => {};
  c.objetivosActivos = () => [];
  c.registrarCuota = () => {};
  c.fijarAjenosExternos = () => {};
  c.registrarEscritor = () => {};
  c.objetivosAjenos = () => [];
  return c;
}

test('un iframe aislado solo puede cargar el reproductor, los recursos de la app y los módulos de escenas', async () => {
  const x = await aprendizaje();
  await fs.mkdir(path.join(x.dirIdea, 'germinacion/escenas/e1'), { recursive: true });
  await fs.writeFile(path.join(x.dirIdea, 'germinacion/escenas/e1/giro.js'), 'export default (S) => S.definirEscena({ pasos: 1, dibujar() {} });');
  const app = await construirApp(x.cfg, { cola: colaFalsa() });
  const pedir = (url) => app.inject({ method: 'GET', url, headers: { host: '127.0.0.1:4417', origin: 'null' } });
  const rel = path.relative(x.cfg.datos, x.dirIdea);
  const escena = await pedir(`/archivos/${rel}/germinacion/escenas/e1/giro.js`);
  assert.equal(escena.statusCode, 200);
  assert.match(escena.headers['content-type'], /text\/javascript/);
  assert.equal(escena.headers['access-control-allow-origin'], '*');
  assert.equal((await pedir('/api/carpetas')).statusCode, 403);
  assert.equal((await pedir(`/archivos/${rel}/hilo/001-usuario.md`)).statusCode, 403);
  // Un .js fuera de escenas/ no se sirve como código.
  await fs.writeFile(path.join(x.dirIdea, 'figuras-x.js'), 'alert(1)');
  const otro = await app.inject({ method: 'GET', url: `/archivos/${rel}/figuras-x.js`, headers: { host: '127.0.0.1:4417' } });
  assert.doesNotMatch(otro.headers['content-type'], /javascript/);
  const pagina = await pedir('/escena.html');
  if (pagina.statusCode === 200) {
    assert.match(pagina.headers['content-security-policy'], /connect-src 'none'/);
    assert.match(pagina.headers['content-security-policy'], /script-src http:\/\/127\.0\.0\.1:4417/);
  }
  await app.close();
});

import { documentoGlosable } from '../server/engine/glosas.js';
test('las conferencias de un curso admiten glosas como los documentos de los nodos', () => {
  for (const d of ['germinacion/nodos/e1.md', 'germinacion/nodos/e1/c01-espacios.md', 'hilo/002-claude.md']) assert.equal(documentoGlosable(d), true, d);
  for (const d of ['germinacion/nodos/e1/x/y.md', 'germinacion/nodos/../mapa.md', 'germinacion/nodos/e1/indice.json']) assert.equal(documentoGlosable(d), false, d);
});

test('R5: un «rechazada» entre comillas también se convierte, y solo en la cabecera', async () => {
  const x = await aprendizaje();
  await x.cola.lanzar([x.ref]);
  await terminarConDictamen(x, 0, '---\nveredicto: "rechazada"\netapa: 1\nresumen: No\n---\n\nTexto que cita\nveredicto: rechazada\n');
  const idea = await x.ideas.obtener(x.ref.carpetaId, x.ref.ideaId);
  assert.equal(idea.estado, 'no-recomendada');
  assert.match(idea.hilo.at(-1).contenido, /veredicto: rechazada/, 'el cuerpo no se toca');
});

test('R2/R3 API: no se borra una idea cuyo curso se está redactando', async () => {
  const x = await aprendizaje();
  const app = await construirApp(x.cfg, { cola: colaFalsa() });
  app.redaccion.ocupada = () => true;
  const r = await app.inject({ method: 'DELETE', url: `/api/carpetas/aprender/ideas/${x.ref.ideaId}`, headers: { host: '127.0.0.1:4417' } });
  assert.equal(r.statusCode, 409);
  await app.close();
});

// --- Límite de sesión de Claude a mitad de una germinación (caso real del 2026-10-26) ---
async function cortarGerminacion(x, n, resultado) {
  await hasta(() => x.falso.llamadas[n]);
  x.falso.llamadas[n].resolve({ codigo: 1, abortado: false, resultado });
  await hasta(async () => (await x.ideas.obtener(x.ref.carpetaId, x.ref.ideaId)).estado !== 'en-proceso');
}

test('«You\'ve hit your session limit» pausa la germinación (no es un error) y al reanudar se pide continuar', async () => {
  const x = await aceptadaYGerminando();
  await terminarGerminacion(x, 1, DIAGNOSTICO);
  await x.germinacion.guardarRespuestas(x.ref.carpetaId, x.ref.ideaId, { p1: 'Algo' });
  await x.cola.germinar(x.ref, {});
  await cortarGerminacion(x, 2, { subtype: 'success', is_error: true, result: "You've hit your session limit · resets 2:10am (America/Havana)" });
  const idea = await x.ideas.obtener(x.ref.carpetaId, x.ref.ideaId);
  assert.equal(idea.estado, 'pausada');
  assert.equal(idea.error ?? null, null);
  assert.equal(x.cola.estado().pausadaPorCuota, true);
  await x.cola.reanudar([x.ref]);
  await hasta(() => x.falso.llamadas[3]);
  assert.match(x.falso.llamadas[3].mensaje, /continúa donde la dejaste/);
  assert.doesNotMatch(x.falso.llamadas[3].mensaje, /Ahora investiga a fondo/);
});

test('tras un error a mitad de trabajo, «Retomar» pide continuar en la misma sesión, no empezar de nuevo', async () => {
  const x = await aceptadaYGerminando();
  await terminarGerminacion(x, 1, DIAGNOSTICO);
  await x.germinacion.guardarRespuestas(x.ref.carpetaId, x.ref.ideaId, { p1: 'Algo' });
  await x.cola.germinar(x.ref, {});
  await cortarGerminacion(x, 2, { subtype: 'error_during_execution', is_error: true, result: 'API Error: 500 Internal server error' });
  assert.equal((await x.ideas.obtener(x.ref.carpetaId, x.ref.ideaId)).estado, 'error');
  await x.cola.germinar(x.ref, {});
  await hasta(() => x.falso.llamadas[3]);
  assert.match(x.falso.llamadas[3].mensaje, /continúa donde la dejaste/);
});

test('al reanudar, la sesión sabe que la interrupción fue una pausa de Semillero y no una decisión del usuario', async () => {
  const x = await aceptadaYGerminando();
  await terminarGerminacion(x, 1, DIAGNOSTICO);
  await x.cola.germinar(x.ref, {});
  await cortarGerminacion(x, 2, { subtype: 'success', is_error: true, result: "You've hit your weekly limit · resets Oct 31" });
  await x.cola.reanudar([x.ref]);
  await hasta(() => x.falso.llamadas[3]);
  assert.match(x.falso.llamadas[3].mensaje, /no un rechazo de lo que estabas haciendo/);
});

test('la API pausa la germinación y sus redacciones de una vez, y continuar retoma la sesión principal', async () => {
  const x = await aprendizaje();
  const cola = colaFalsa();
  const llamadas = [];
  cola.detener = async (refs) => {
    llamadas.push(['detener', refs]);
    await x.ideas.actualizar('aprender', x.ref.ideaId, { estado: 'detenida' });
  };
  cola.germinar = async (ref, o) => llamadas.push(['germinar', ref, o]);
  const app = await construirApp(x.cfg, { cola });
  const pausas = [];
  app.redaccion.pausar = async (ref) => pausas.push(['pausar', ref]);
  app.redaccion.continuar = async (ref) => pausas.push(['continuar', ref]);
  const pedir = (url) => app.inject({ method: 'POST', url, headers: { host: '127.0.0.1:4417' } });
  const base = `/api/carpetas/aprender/ideas/${x.ref.ideaId}/germinacion`;
  await x.ideas.actualizar('aprender', x.ref.ideaId, { estado: 'en-proceso', trabajo: 'germinacion' });
  assert.equal((await pedir(`${base}/pausar`)).statusCode, 200);
  assert.deepEqual(llamadas[0], ['detener', [x.ref]]);
  assert.deepEqual(pausas[0], ['pausar', x.ref]);
  await x.ideas.actualizar('aprender', x.ref.ideaId, { estado: 'detenida', interrumpida: true });
  assert.equal((await pedir(`${base}/continuar`)).statusCode, 200);
  assert.deepEqual(pausas[1], ['continuar', x.ref]);
  assert.equal(llamadas[1][0], 'germinar');
  await app.close();
});

test('la API expone «Comenzar» y los mandos de cada asignatura', async () => {
  const x = await aprendizaje();
  const app = await construirApp(x.cfg, { cola: colaFalsa() });
  const hechas = [];
  for (const fn of ['comenzar', 'comenzarNodo', 'pausarNodo', 'continuarNodo']) app.redaccion[fn] = async (ref, n) => hechas.push([fn, n]);
  const base = `/api/carpetas/aprender/ideas/${x.ref.ideaId}/germinacion/redaccion`;
  for (const url of [`${base}/comenzar`, `${base}/e1/comenzar`, `${base}/e1/pausar`, `${base}/e1/continuar`]) {
    assert.equal((await app.inject({ method: 'POST', url, headers: { host: '127.0.0.1:4417' } })).statusCode, 200, url);
  }
  assert.deepEqual(hechas, [['comenzar', undefined], ['comenzarNodo', 'e1'], ['pausarNodo', 'e1'], ['continuarNodo', 'e1']]);
  await app.close();
});

test('P3: si la sesión principal esperaba en cola al pausar, continuar la relanza', async () => {
  const x = await aprendizaje();
  const cola = colaFalsa();
  const llamadas = [];
  cola.detener = async (refs) => {
    llamadas.push(['detener', refs]);
    await x.ideas.actualizar('aprender', x.ref.ideaId, { estado: 'aceptada' }); // en cola: vuelve a su estado previo
  };
  cola.germinar = async (ref) => llamadas.push(['germinar', ref]);
  const app = await construirApp(x.cfg, { cola });
  const pedir = (url) => app.inject({ method: 'POST', url, headers: { host: '127.0.0.1:4417' } });
  const base = `/api/carpetas/aprender/ideas/${x.ref.ideaId}/germinacion`;
  await x.ideas.actualizar('aprender', x.ref.ideaId, { estado: 'en-proceso', trabajo: 'germinacion' });
  await pedir(`${base}/pausar`);
  await pedir(`${base}/continuar`);
  assert.deepEqual(llamadas.map((l) => l[0]), ['detener', 'germinar']);
  await app.close();
});

test('P3b: «Reanudar Investigación» no reanuda una germinación que el usuario pausó a mano', async () => {
  const x = await aceptadaYGerminando();
  await terminarGerminacion(x, 1, DIAGNOSTICO);
  await x.cola.germinar(x.ref, {});
  await hasta(() => x.falso.llamadas[2]);
  x.falso.llamadas[2].resolve({ codigo: 1, abortado: false, resultado: { is_error: true, result: "You've hit your session limit · resets 2:10am" } });
  await hasta(async () => (await x.ideas.obtener(x.ref.carpetaId, x.ref.ideaId)).estado === 'pausada');
  x.cola.registrarPausaManual(() => true);
  await x.cola.reanudar([x.ref]);
  await esperar(200);
  assert.equal(x.falso.llamadas.length, 3);
});

test('escena.html se sirve con su propio sandbox (aunque alguien la abra fuera del iframe)', async () => {
  const x = await aprendizaje();
  const app = await construirApp(x.cfg, { cola: colaFalsa() });
  const r = await app.inject({ method: 'GET', url: '/escena.html', headers: { host: '127.0.0.1:4417' } });
  if (r.statusCode === 200) assert.match(r.headers['content-security-policy'], /sandbox allow-scripts/);
  await app.close();
});
