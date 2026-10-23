import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { crearAlmacenCarpetas } from '../server/store/carpetas.js';
import { crearAlmacenIdeas } from '../server/store/ideas.js';
import { crearAlmacenGlosas } from '../server/store/glosas.js';
import { crearAjustes } from '../server/store/ajustes.js';
import { crearGuard } from '../server/engine/guard.js';
import { crearCola } from '../server/engine/cola.js';
import { crearMotorGlosas } from '../server/engine/glosas.js';
import { parsearRespuestaGlosa, argsGlosa } from '../server/engine/prompt.js';
import { AJUSTES_POR_DEFECTO } from '../server/config.js';
import { cfgTemporal } from './helpers.js';

const esperar = (ms = 20) => new Promise((r) => setTimeout(r, ms));
async function hasta(cond, ms = 4000) {
  const t0 = Date.now();
  while (!(await cond())) {
    if (Date.now() - t0 > ms) return;
    await esperar();
  }
}

const DICTAMEN = '---\nveredicto: aceptada\netapa: 2\nresumen: Buena\n---\n\nLa función $f(x)=x^2$ es lineal.\n';

// ejecutar falso: cada llamada queda pendiente hasta que el test la responde.
function crearFalso() {
  const llamadas = [];
  const ejecutar = (op) =>
    new Promise((resolve) => {
      llamadas.push({ ...op, resolve, mensaje: op.args[op.args.indexOf('-p') + 1] });
      op.alEvento({ type: 'system', subtype: 'init', session_id: `fork-${llamadas.length}` });
    });
  async function responder(n, texto, { escribir = {} } = {}) {
    await hasta(() => llamadas[n]);
    const l = llamadas[n];
    for (const [rel, contenido] of Object.entries(escribir)) {
      await fs.mkdir(path.dirname(path.join(l.cwd, rel)), { recursive: true });
      await fs.writeFile(path.join(l.cwd, rel), contenido);
    }
    l.resolve({ codigo: 0, abortado: false, resultado: { type: 'result', is_error: false, result: texto } });
  }
  return { ejecutar, llamadas, responder };
}

async function preparar({ sesion = 'S', estado = 'aceptada' } = {}) {
  const cfg = await cfgTemporal();
  const guard = crearGuard(cfg);
  await guard.iniciar();
  const carpetas = crearAlmacenCarpetas(cfg, { proteger: guard.proteger });
  await carpetas.crear({ nombre: 'IA' });
  const ideas = crearAlmacenIdeas(cfg, { proteger: guard.proteger });
  const idea = await ideas.crear('ia', { titulo: 'Red', cuerpo: 'Mi idea' });
  const rutaIdea = `carpetas/ia/ideas/${idea.id}`;
  await fs.writeFile(path.join(cfg.datos, rutaIdea, 'hilo/002-claude.md'), DICTAMEN);
  await guard.commitear('todo', 'dictamen');
  await ideas.actualizar('ia', idea.id, { estado, sessionId: sesion });
  const ajustes = crearAjustes(cfg);
  const colaFalso = crearFalso();
  const cola = crearCola({ cfg, ideas, carpetas, ajustes, guard, ejecutar: colaFalso.ejecutar, notificar: async () => {} });
  const glosas = crearAlmacenGlosas(cfg, { proteger: guard.proteger });
  const falso = crearFalso();
  const motor = crearMotorGlosas({ cfg, ideas, glosas, guard, cola, ajustes, ejecutar: falso.ejecutar });
  const ref = { carpetaId: 'ia', ideaId: idea.id };
  const pedido = (extra = {}) => ({
    tipo: 'explicar',
    documento: 'hilo/002-claude.md',
    ancla: { exacto: '$f(x)=x^2$', prefijo: 'La función ', sufijo: ' es lineal.' },
    fragmento: { markdown: '$f(x)=x^2$', imagenes: [] },
    prompt: '',
    ...extra,
  });
  const lista = (id) => hasta(async () => (await glosas.obtener('ia', idea.id, id)).estado !== 'en-proceso');
  return { cfg, ideas, glosas, motor, falso, colaFalso, cola, ref, rutaIdea, pedido, lista, guard };
}

test('argsGlosa: bifurcar, retomar o empezar de cero', () => {
  const a = argsGlosa({ sessionId: 'S', bifurcar: true, ajustes: AJUSTES_POR_DEFECTO, mensaje: 'm' });
  assert.equal(a[a.indexOf('--resume') + 1], 'S');
  assert.ok(a.includes('--fork-session'));
  assert.equal(a[a.indexOf('--model') + 1], 'opus');
  const b = argsGlosa({ sessionId: 'G', bifurcar: false, ajustes: AJUSTES_POR_DEFECTO, mensaje: 'm' });
  assert.ok(b.includes('--resume') && !b.includes('--fork-session'));
  const c = argsGlosa({ sessionId: null, bifurcar: false, ajustes: AJUSTES_POR_DEFECTO, mensaje: 'm' });
  assert.ok(!c.includes('--resume') && !c.includes('--session-id'));
});

test('parsearRespuestaGlosa lee el frontmatter de corrección', () => {
  assert.deepEqual(parsearRespuestaGlosa('---\ncorreccion: parcial\n---\n\nTexto'), { correccion: 'parcial', cuerpo: 'Texto' });
  assert.deepEqual(parsearRespuestaGlosa('Solo texto'), { correccion: null, cuerpo: 'Solo texto' });
});

test('explicar bifurca la sesión principal y guarda la respuesta', async () => {
  const { motor, falso, glosas, ref, pedido, lista } = await preparar();
  const g = await motor.pedir(ref, pedido({ prompt: '¿Por qué?' }));
  assert.equal(g.estado, 'en-proceso');
  await hasta(() => falso.llamadas[0]);
  const args = falso.llamadas[0].args;
  assert.equal(args[args.indexOf('--resume') + 1], 'S');
  assert.ok(args.includes('--fork-session'));
  assert.match(falso.llamadas[0].mensaje, /\$f\(x\)=x\^2\$/);
  assert.match(falso.llamadas[0].mensaje, /¿Por qué\?/);
  await falso.responder(0, 'Es una **parábola**.');
  await lista(g.id);
  const final = await glosas.obtener(ref.carpetaId, ref.ideaId, g.id);
  assert.equal(final.estado, 'lista');
  assert.equal(final.sessionId, 'fork-1');
  assert.equal(final.mensajes.at(-1).autor, 'claude');
  assert.equal(final.mensajes.at(-1).contenido, 'Es una **parábola**.');
});

test('seguir retoma la sesión de la glosa sin bifurcar', async () => {
  const { motor, falso, ref, pedido, lista } = await preparar();
  const g = await motor.pedir(ref, pedido());
  await falso.responder(0, 'Uno');
  await lista(g.id);
  await motor.seguir(ref, g.id, '¿Y en 3D?');
  await hasta(() => falso.llamadas[1]);
  const args = falso.llamadas[1].args;
  assert.equal(args[args.indexOf('--resume') + 1], 'fork-1');
  assert.ok(!args.includes('--fork-session'));
  assert.match(falso.llamadas[1].mensaje, /¿Y en 3D\?/);
});

test('sin sesión principal la glosa empieza de cero', async () => {
  const { motor, falso, ref, pedido } = await preparar({ sesion: null });
  await motor.pedir(ref, pedido());
  await hasta(() => falso.llamadas[0]);
  assert.ok(!falso.llamadas[0].args.includes('--resume'));
});

test('corregir acertado enmienda el dictamen, se commitea y actualiza el veredicto', async () => {
  const { motor, falso, ideas, glosas, guard, ref, rutaIdea, pedido, lista } = await preparar();
  const g = await motor.pedir(ref, pedido({ tipo: 'corregir', prompt: 'No es lineal, es cuadrática.' }));
  const enmendado = DICTAMEN.replace('veredicto: aceptada', 'veredicto: rechazada').replace('es lineal', '~~es lineal~~<ins>es cuadrática</ins>');
  await falso.responder(0, '---\ncorreccion: acertada\n---\n\nTienes razón.', { escribir: { [`${rutaIdea}/hilo/002-claude.md`]: enmendado } });
  await lista(g.id);
  const final = await glosas.obtener(ref.carpetaId, ref.ideaId, g.id);
  assert.equal(final.correccion, 'acertada');
  assert.equal(final.enmendado, true);
  assert.equal(final.mensajes.at(-1).contenido, 'Tienes razón.');
  const idea = await ideas.obtener(ref.carpetaId, ref.ideaId);
  assert.equal(idea.estado, 'rechazada');
  assert.deepEqual(idea.enmendados, ['hilo/002-claude.md']);
  assert.deepEqual((await guard.cambios()).filter((c) => !c.ruta.includes('registro')), []);
});

test('una glosa no puede tocar otros archivos', async () => {
  const { cfg, motor, falso, ref, rutaIdea, pedido, lista } = await preparar();
  const g = await motor.pedir(ref, pedido());
  await falso.responder(0, 'Hecho', { escribir: { [`${rutaIdea}/hilo/001-usuario.md`]: 'pisado', [`${rutaIdea}/hilo/002-claude.md`]: 'pisado' } });
  await lista(g.id);
  assert.equal(await fs.readFile(path.join(cfg.datos, rutaIdea, 'hilo/001-usuario.md'), 'utf8'), 'Mi idea');
  assert.equal(await fs.readFile(path.join(cfg.datos, rutaIdea, 'hilo/002-claude.md'), 'utf8'), DICTAMEN);
});

test('una explicación puede dejar figuras en figuras/glosas', async () => {
  const { cfg, motor, falso, ref, rutaIdea, pedido, lista } = await preparar();
  const g = await motor.pedir(ref, pedido());
  await hasta(() => falso.llamadas[0]);
  assert.match(falso.llamadas[0].mensaje, new RegExp(`figuras/glosas/${g.id}/`));
  await falso.responder(0, '![F](f.png)', { escribir: { [`${rutaIdea}/figuras/glosas/${g.id}/f.png`]: 'png', [`${rutaIdea}/figuras/otra.png`]: 'x' } });
  await lista(g.id);
  assert.equal(await fs.readFile(path.join(cfg.datos, rutaIdea, `figuras/glosas/${g.id}/f.png`), 'utf8'), 'png');
  await assert.rejects(fs.access(path.join(cfg.datos, rutaIdea, 'figuras/otra.png')));
});

test('rechaza glosas con la idea en proceso', async () => {
  const { motor, ref, pedido } = await preparar({ estado: 'en-proceso' });
  await assert.rejects(motor.pedir(ref, pedido()), /en-proceso/);
});

test('corregir sin prompt o sobre un documento del usuario falla', async () => {
  const { motor, ref, pedido } = await preparar();
  await assert.rejects(motor.pedir(ref, pedido({ tipo: 'corregir', prompt: '  ' })), /prompt-vacio/);
  await assert.rejects(motor.pedir(ref, pedido({ tipo: 'corregir', prompt: 'x', documento: 'hilo/001-usuario.md' })), /documento-invalido/);
  await assert.rejects(motor.pedir(ref, pedido({ documento: '../../x.md' })), /documento-invalido/);
});

test('la verificación de un análisis no revierte lo que escribe una glosa activa', async () => {
  const { cfg, motor, falso, colaFalso, cola, ideas, ref, pedido } = await preparar();
  // Una segunda idea se analiza mientras la glosa de la primera está escribiendo.
  const otra = await ideas.crear('ia', { titulo: 'Otra', cuerpo: 'x' });
  await motor.pedir(ref, pedido());
  await hasta(() => falso.llamadas[0]);
  const g = (await motor.objetivosActivos())[0].replace(/\/\*\*$/, '');
  await fs.mkdir(path.join(cfg.datos, g), { recursive: true });
  await fs.writeFile(path.join(cfg.datos, g, 'g.png'), 'png');
  await cola.lanzar([{ carpetaId: 'ia', ideaId: otra.id }]);
  await hasta(() => colaFalso.llamadas[0]);
  colaFalso.llamadas[0].resolve({ codigo: 0, abortado: false, resultado: { is_error: false } });
  await hasta(async () => (await ideas.obtener('ia', otra.id)).estado !== 'en-proceso');
  assert.equal(await fs.readFile(path.join(cfg.datos, g, 'g.png'), 'utf8'), 'png');
});

test('recuperar marca como error las glosas cortadas y restaura su documento', async () => {
  const { cfg, glosas, motor, ref, rutaIdea } = await preparar();
  const g = await glosas.crear(ref.carpetaId, ref.ideaId, {
    tipo: 'corregir', documento: 'hilo/002-claude.md', ancla: {}, fragmento: { markdown: 'x', imagenes: [] },
    mensajes: [{ autor: 'usuario', contenido: 'mal' }],
  });
  await fs.writeFile(path.join(cfg.datos, rutaIdea, 'hilo/002-claude.md'), 'a medias');
  await motor.recuperar();
  assert.equal((await glosas.obtener(ref.carpetaId, ref.ideaId, g.id)).estado, 'error');
  assert.equal(await fs.readFile(path.join(cfg.datos, rutaIdea, 'hilo/002-claude.md'), 'utf8'), DICTAMEN);
});

// --- Revisión final ---
const ENMENDADO = DICTAMEN.replace('veredicto: aceptada', 'veredicto: rechazada');

test('I3: una corrección no pisa una réplica pendiente', async () => {
  const { motor, falso, ideas, ref, rutaIdea, pedido, lista } = await preparar();
  await ideas.responder(ref.carpetaId, ref.ideaId, 'Una réplica');
  const g = await motor.pedir(ref, pedido({ tipo: 'corregir', prompt: 'mal' }));
  await falso.responder(0, '---\ncorreccion: acertada\n---\nSí', { escribir: { [`${rutaIdea}/hilo/002-claude.md`]: ENMENDADO } });
  await lista(g.id);
  const idea = await ideas.obtener(ref.carpetaId, ref.ideaId);
  assert.equal(idea.estado, 'replica-pendiente');
  assert.deepEqual(idea.enmendados, ['hilo/002-claude.md']);
});

test('I4: corregir el dictamen de una idea que germina no le cambia el estado', async () => {
  const { motor, falso, ideas, ref, rutaIdea, pedido, lista } = await preparar();
  await ideas.actualizar(ref.carpetaId, ref.ideaId, { trabajo: 'germinacion', germinacion: { fase: 'mapa' } });
  const g = await motor.pedir(ref, pedido({ tipo: 'corregir', prompt: 'mal' }));
  await falso.responder(0, '---\ncorreccion: acertada\n---\nSí', { escribir: { [`${rutaIdea}/hilo/002-claude.md`]: ENMENDADO } });
  await lista(g.id);
  assert.equal((await ideas.obtener(ref.carpetaId, ref.ideaId)).estado, 'aceptada');
});

test('I5: dos correcciones a la vez sobre el mismo documento no se permiten', async () => {
  const { motor, ref, pedido } = await preparar();
  await motor.pedir(ref, pedido({ tipo: 'corregir', prompt: 'mal' }));
  await assert.rejects(motor.pedir(ref, pedido({ tipo: 'corregir', prompt: 'otra' })), /en-proceso/);
});

test('I6: enmendar un nodo de la germinación se registra', async () => {
  const { cfg, motor, falso, ideas, ref, rutaIdea, pedido, lista } = await preparar();
  await fs.mkdir(path.join(cfg.datos, rutaIdea, 'germinacion/nodos'), { recursive: true });
  await fs.writeFile(path.join(cfg.datos, rutaIdea, 'germinacion/nodos/e1.md'), 'La función $f(x)=x^2$ es lineal.');
  const g = await motor.pedir(ref, pedido({ tipo: 'corregir', prompt: 'mal', documento: 'germinacion/nodos/e1.md' }));
  await falso.responder(0, '---\ncorreccion: acertada\n---\nSí', { escribir: { [`${rutaIdea}/germinacion/nodos/e1.md`]: 'Es ~~lineal~~<ins>cuadrática</ins>.' } });
  await lista(g.id);
  assert.deepEqual((await ideas.obtener(ref.carpetaId, ref.ideaId)).enmendados, ['germinacion/nodos/e1.md']);
});

test('I7: si la sesión principal ya no existe, la glosa empieza una sesión nueva', async () => {
  const { motor, falso, glosas, ref, pedido, lista } = await preparar();
  const g = await motor.pedir(ref, pedido());
  await hasta(() => falso.llamadas[0]);
  falso.llamadas[0].resolve({ codigo: 1, abortado: false, stderr: 'No conversation found with session ID: S' });
  await hasta(() => falso.llamadas[1]);
  assert.ok(!falso.llamadas[1].args.includes('--resume'));
  await falso.responder(1, 'Explicado');
  await lista(g.id);
  assert.equal((await glosas.obtener(ref.carpetaId, ref.ideaId, g.id)).estado, 'lista');
});

test('menor: dos «seguir» simultáneos solo lanzan una ejecución', async () => {
  const { motor, falso, ref, pedido, lista } = await preparar();
  const g = await motor.pedir(ref, pedido());
  await falso.responder(0, 'Uno');
  await lista(g.id);
  const r = await Promise.allSettled([motor.seguir(ref, g.id, 'a'), motor.seguir(ref, g.id, 'b')]);
  assert.equal(r.filter((x) => x.status === 'fulfilled').length, 1);
});

// --- Profundidad de las explicaciones ---
const modeloYEsfuerzo = (args) => [args[args.indexOf('--model') + 1], args[args.indexOf('--effort') + 1]];

test('una explicación superficial usa Sonnet con esfuerzo bajo', async () => {
  const { motor, falso, ref, pedido } = await preparar();
  const g = await motor.pedir(ref, pedido({ profundidad: 'superficial' }));
  await hasta(() => falso.llamadas[0]);
  assert.deepEqual(modeloYEsfuerzo(falso.llamadas[0].args), ['sonnet', 'low']);
  assert.equal(g.profundidad, 'superficial');
});

test('una explicación profunda usa Opus con esfuerzo medio, y seguir la hereda', async () => {
  const { motor, falso, ref, pedido, lista } = await preparar();
  const g = await motor.pedir(ref, pedido({ profundidad: 'profunda' }));
  await falso.responder(0, 'Uno');
  await lista(g.id);
  assert.deepEqual(modeloYEsfuerzo(falso.llamadas[0].args), ['opus', 'medium']);
  await motor.seguir(ref, g.id, 'más');
  await hasta(() => falso.llamadas[1]);
  assert.deepEqual(modeloYEsfuerzo(falso.llamadas[1].args), ['opus', 'medium']);
});

test('corregir usa el modelo y esfuerzo de Ajustes', async () => {
  const { motor, falso, ref, pedido } = await preparar();
  await motor.pedir(ref, pedido({ tipo: 'corregir', prompt: 'mal', profundidad: 'superficial' }));
  await hasta(() => falso.llamadas[0]);
  assert.deepEqual(modeloYEsfuerzo(falso.llamadas[0].args), ['opus', 'high']);
});
