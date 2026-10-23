import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { crearAlmacenCarpetas } from '../server/store/carpetas.js';
import { crearAlmacenIdeas } from '../server/store/ideas.js';
import { crearAlmacenGerminacion } from '../server/store/germinacion.js';
import { crearAjustes } from '../server/store/ajustes.js';
import { crearGuard } from '../server/engine/guard.js';
import { crearCola } from '../server/engine/cola.js';
import { MAPA, DIAGNOSTICO, copia } from './fixtures/mapas.js';
import { cfgTemporal } from './helpers.js';

const esperar = (ms = 20) => new Promise((r) => setTimeout(r, ms));
async function hasta(cond, ms = 4000) {
  const t0 = Date.now();
  while (!(await cond())) {
    if (Date.now() - t0 > ms) return;
    await esperar();
  }
}

function crearFalso() {
  const llamadas = [];
  const ejecutar = (op) =>
    new Promise((resolve) => {
      llamadas.push({ ...op, resolve, mensaje: op.args[op.args.indexOf('-p') + 1], sistema: op.args[op.args.indexOf('--append-system-prompt') + 1] });
      op.alEvento({ type: 'system', subtype: 'init' });
      op.senal.addEventListener('abort', () => resolve({ codigo: 130, abortado: true }));
    });
  return { ejecutar, llamadas };
}

async function preparar({ estado = 'aceptada' } = {}) {
  const cfg = await cfgTemporal();
  const guard = crearGuard(cfg);
  await guard.iniciar();
  const carpetas = crearAlmacenCarpetas(cfg, { proteger: guard.proteger });
  await carpetas.crear({ nombre: 'IA' });
  const ideas = crearAlmacenIdeas(cfg, { proteger: guard.proteger });
  const idea = await ideas.crear('ia', { titulo: 'Memoria FFN', cuerpo: 'x' });
  const rutaIdea = `carpetas/ia/ideas/${idea.id}`;
  await fs.writeFile(path.join(cfg.datos, rutaIdea, 'hilo/002-claude.md'), '---\nveredicto: aceptada\netapa: 2\nresumen: Sí\n---\nCuerpo');
  await guard.commitear('todo', 'dictamen');
  await ideas.actualizar('ia', idea.id, { estado, sessionId: 'S', resumen: 'Sí' });
  const germinacion = crearAlmacenGerminacion(cfg, { proteger: guard.proteger });
  const falso = crearFalso();
  const cola = crearCola({ cfg, ideas, carpetas, ajustes: crearAjustes(cfg), guard, germinacion, ejecutar: falso.ejecutar, notificar: async () => {} });
  const ref = { carpetaId: 'ia', ideaId: idea.id };
  const dir = path.join(cfg.datos, rutaIdea, 'germinacion');
  // La sesión falsa escribe el mapa (y lo que se le pida) y termina.
  async function terminar(n, { mapa, extra = {} } = {}) {
    await hasta(() => falso.llamadas[n]);
    await fs.mkdir(path.join(dir, 'nodos'), { recursive: true });
    if (mapa !== undefined) await fs.writeFile(path.join(dir, 'mapa.json'), typeof mapa === 'string' ? mapa : JSON.stringify(mapa));
    for (const [rel, c] of Object.entries(extra)) {
      await fs.mkdir(path.dirname(path.join(cfg.datos, rel)), { recursive: true });
      await fs.writeFile(path.join(cfg.datos, rel), c);
    }
    falso.llamadas[n].resolve({ codigo: 0, abortado: false, resultado: { is_error: false } });
    await hasta(async () => (await ideas.obtener('ia', idea.id)).estado !== 'en-proceso');
  }
  const obtener = () => ideas.obtener('ia', idea.id);
  return { cfg, cola, ideas, germinacion, falso, ref, dir, rutaIdea, terminar, obtener };
}

test('germinar una aceptada retoma la sesión principal con el prompt de germinación', async () => {
  const { cola, falso, ref, obtener } = await preparar();
  await cola.germinar(ref, {});
  await hasta(() => falso.llamadas[0]);
  const args = falso.llamadas[0].args;
  assert.equal(args[args.indexOf('--resume') + 1], 'S');
  assert.match(falso.llamadas[0].sistema, /germinación/i);
  assert.match(falso.llamadas[0].mensaje, /mapa\.json/);
  assert.match(falso.llamadas[0].mensaje, /diagn[oó]stico/i);
  const idea = await obtener();
  assert.equal(idea.estado, 'en-proceso');
  assert.equal(idea.trabajo, 'germinacion');
  assert.equal(idea.germinacion.fase, 'preparando');
});

test('germinar una no aceptada falla', async () => {
  const { cola, ref } = await preparar({ estado: 'rechazada' });
  await assert.rejects(cola.germinar(ref, {}), /no-aceptada/);
});

test('un mapa válido deja la idea aceptada con su fase', async () => {
  const { cola, ref, terminar, obtener } = await preparar();
  await cola.germinar(ref, {});
  await terminar(0, { mapa: copia(DIAGNOSTICO) });
  const idea = await obtener();
  assert.equal(idea.estado, 'aceptada');
  assert.equal(idea.germinacion.fase, 'diagnostico');
  assert.ok(idea.germinacion.ultima);
});

test('un mapa inválido se restaura y deja error', async () => {
  const { cola, ref, terminar, obtener, germinacion } = await preparar();
  await cola.germinar(ref, {});
  await terminar(0, { mapa: copia(DIAGNOSTICO) });
  await cola.germinar(ref, {});
  await terminar(1, { mapa: '{"version": 1, "fase": "mapa", "nodos": [' });
  const idea = await obtener();
  assert.equal(idea.estado, 'error');
  assert.match(idea.error, /^Mapa inválido: /);
  assert.equal((await germinacion.leerMapa(ref.carpetaId, ref.ideaId)).fase, 'diagnostico');
});

test('la germinación no puede escribir progreso.json ni el hilo', async () => {
  const { cola, ref, terminar, germinacion, rutaIdea, cfg } = await preparar();
  await germinacion.guardarRespuestas(ref.carpetaId, ref.ideaId, { p1: 'Bien' });
  await cola.germinar(ref, {});
  await terminar(0, {
    mapa: copia(DIAGNOSTICO),
    extra: { [`${rutaIdea}/germinacion/progreso.json`]: '{"hackeado":true}', [`${rutaIdea}/hilo/001-usuario.md`]: 'pisado' },
  });
  assert.deepEqual((await germinacion.leerProgreso(ref.carpetaId, ref.ideaId)).respuestas, { p1: 'Bien' });
  assert.equal(await fs.readFile(path.join(cfg.datos, rutaIdea, 'hilo/001-usuario.md'), 'utf8'), 'x');
});

test('las respuestas del diagnóstico llegan en el mensaje', async () => {
  const { cola, falso, ref, terminar, germinacion } = await preparar();
  await cola.germinar(ref, {});
  await terminar(0, { mapa: copia(DIAGNOSTICO) });
  await germinacion.guardarRespuestas(ref.carpetaId, ref.ideaId, { p1: 'Bien', p3: 'Sé derivar $\\nabla f$' });
  await cola.germinar(ref, {});
  await hasta(() => falso.llamadas[1]);
  const m = falso.llamadas[1].mensaje;
  assert.match(m, /¿Cuánto álgebra lineal sabes\?/);
  assert.match(m, /Bien/);
  assert.match(m, /Sé derivar/);
  assert.match(m, /mapa completo/);
});

test('el mapa vivo envía los avances y la petición, y luego los da por comunicados', async () => {
  const { cola, falso, ref, terminar, germinacion } = await preparar();
  await cola.germinar(ref, {});
  await terminar(0, { mapa: copia(MAPA) });
  await germinacion.marcarNodo(ref.carpetaId, ref.ideaId, 'e1', { estado: 'hecho', notas: 'Terminé el libro de Strang.' });
  await cola.germinar(ref, { peticion: 'Profundiza en la incógnita i1.' });
  await hasta(() => falso.llamadas[1]);
  const m = falso.llamadas[1].mensaje;
  assert.match(m, /Álgebra lineal/);
  assert.match(m, /hecho/);
  assert.match(m, /Strang/);
  assert.match(m, /Profundiza en la incógnita i1/);
  await terminar(1, { mapa: copia(MAPA) });
  assert.equal(await germinacion.cambiosDesdeEnvio(ref.carpetaId, ref.ideaId, copia(MAPA)), '');
});

test('reanudar una germinación pausada usa el mensaje de germinación', async () => {
  const { cola, falso, ref, ideas, obtener } = await preparar();
  await cola.germinar(ref, {});
  await hasta(() => falso.llamadas[0]);
  falso.llamadas[0].alEvento({
    type: 'rate_limit_event',
    rate_limit_info: { unifiedWindows: { five_hour: { utilization: 0.95, resetsAt: 4102444800 } } },
  });
  await hasta(async () => (await obtener()).estado === 'pausada');
  assert.equal((await obtener()).estado, 'pausada');
  await cola.reanudar([ref]);
  await hasta(() => falso.llamadas[1]);
  assert.match(falso.llamadas[1].sistema, /germinación/i);
  assert.match(falso.llamadas[1].mensaje, /germinación/i);
  assert.match(falso.llamadas[1].mensaje, /mapa\.json/);
  assert.equal((await ideas.obtener(ref.carpetaId, ref.ideaId)).trabajo, 'germinacion');
});

test('una germinación detenida se retoma desde Comenzar Análisis como germinación', async () => {
  const { cola, falso, ref, obtener, ideas } = await preparar();
  await cola.germinar(ref, {});
  await hasta(() => falso.llamadas[0]);
  await cola.detener([ref]);
  await hasta(async () => (await obtener()).estado === 'detenida');
  const grupos = await ideas.pendientes();
  assert.equal(grupos[0].ideas[0].etiqueta, 'GERMINACIÓN');
  await cola.lanzar([ref]);
  await hasta(() => falso.llamadas[1]);
  assert.match(falso.llamadas[1].sistema, /germinación/i);
});

test('cambiosDesdeEnvio lista nodos con estado nuevo y notas nuevas', async () => {
  const { germinacion, ref } = await preparar();
  await germinacion.marcarNodo(ref.carpetaId, ref.ideaId, 'i1', { estado: 'atacando' });
  await germinacion.marcarNodo(ref.carpetaId, ref.ideaId, 'e2', { notas: 'Duda con la atención.' });
  const t = await germinacion.cambiosDesdeEnvio(ref.carpetaId, ref.ideaId, copia(MAPA));
  assert.match(t, /¿Dónde vive un hecho\?.*atacando/);
  assert.match(t, /Transformers[\s\S]*Duda con la atención/);
  await assert.rejects(germinacion.marcarNodo(ref.carpetaId, ref.ideaId, 'e1', { estado: 'volando' }), /estado-invalido/);
});

test('al retomar tras un mapa inválido la sesión recibe el motivo', async () => {
  const { cola, falso, ref, terminar } = await preparar();
  await cola.germinar(ref, {});
  await terminar(0, { mapa: { fase: 'diagnostico' } });
  await cola.germinar(ref, {});
  await hasta(() => falso.llamadas[1]);
  assert.match(falso.llamadas[1].mensaje, /rechazado: version debe ser 1/);
});
