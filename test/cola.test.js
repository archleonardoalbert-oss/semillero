import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { crearAlmacenCarpetas } from '../server/store/carpetas.js';
import { crearAlmacenIdeas } from '../server/store/ideas.js';
import { crearAjustes } from '../server/store/ajustes.js';
import { crearGuard } from '../server/engine/guard.js';
import { crearCola } from '../server/engine/cola.js';
import { cfgTemporal } from './helpers.js';

const DICTAMEN = '---\nveredicto: aceptada\netapa: 2\nresumen: Sí, con matices\n---\n\nCuerpo';
const esperar = (ms = 30) => new Promise((r) => setTimeout(r, ms));
// Sondea hasta que la condición se cumpla (las operaciones git hacen variable el tiempo).
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
      const llamada = { ...op, resolve, mensaje: op.args[op.args.indexOf('-p') + 1] };
      llamadas.push(llamada);
      if (op.senal.aborted) resolve({ codigo: 130, abortado: true });
      op.senal.addEventListener('abort', () => resolve({ codigo: 130, abortado: true }));
    });
  async function terminar(n, { dictamen = DICTAMEN } = {}) {
    const l = llamadas[n];
    const destino = l.mensaje.match(/Escribe tu dictamen en (\S+)$/)[1];
    if (dictamen) {
      await fs.mkdir(path.dirname(path.join(l.cwd, destino)), { recursive: true });
      await fs.writeFile(path.join(l.cwd, destino), dictamen);
    }
    l.resolve({ codigo: 0, abortado: false, resultado: { subtype: 'success', is_error: false } });
    await esperar(150);
  }
  const cuota = (n, utilizacion) =>
    llamadas[n].alEvento({
      type: 'rate_limit_event',
      rate_limit_info: {
        unifiedWindows: {
          five_hour: { utilization: utilizacion, resetsAt: 4102444800 },
          seven_day: { utilization: 0.2, resetsAt: 4102444800 },
        },
      },
    });
  return { ejecutar, llamadas, terminar, cuota };
}

async function preparar(nIdeas = 1) {
  const cfg = await cfgTemporal();
  const guard = crearGuard(cfg);
  await guard.iniciar();
  const carpetas = crearAlmacenCarpetas(cfg, { proteger: guard.proteger });
  await carpetas.crear({ nombre: 'IA' });
  const ideas = crearAlmacenIdeas(cfg, { proteger: guard.proteger });
  const refs = [];
  for (let n = 0; n < nIdeas; n++) {
    const idea = await ideas.crear('ia', { titulo: `Idea ${n}`, cuerpo: `cuerpo ${n}` });
    refs.push({ carpetaId: 'ia', ideaId: idea.id });
  }
  const falso = crearEjecutarFalso();
  const notificaciones = [];
  const cola = crearCola({
    cfg, ideas, carpetas, ajustes: crearAjustes(cfg), guard,
    ejecutar: falso.ejecutar,
    notificar: async (t, c) => notificaciones.push([t, c]),
  });
  const estado = async (n) => (await ideas.obtener('ia', refs[n].ideaId)).estado;
  return { cfg, ideas, cola, refs, falso, notificaciones, estado };
}

test('lanzar 7 ejecuta 5 y encola 2', async () => {
  const { cola, refs, falso } = await preparar(7);
  await cola.lanzar(refs);
  await esperar();
  assert.equal(cola.estado().ejecutando.length, 5);
  assert.equal(cola.estado().enCola.length, 2);
  await falso.terminar(0);
  await hasta(() => cola.estado().enCola.length === 1);
  assert.equal(cola.estado().ejecutando.length, 5);
  assert.equal(cola.estado().enCola.length, 1);
});

test('un dictamen válido deja la idea aceptada con su resumen', async () => {
  const { cola, refs, falso, ideas, estado } = await preparar();
  await cola.lanzar(refs);
  await esperar();
  assert.equal(await estado(0), 'en-proceso');
  await falso.terminar(0);
  const idea = await ideas.obtener('ia', refs[0].ideaId);
  assert.equal(idea.estado, 'aceptada');
  assert.equal(idea.resumen, 'Sí, con matices');
  assert.equal(idea.etapa, 2);
  assert.ok(idea.sessionId);
});

test('la primera ejecución usa --session-id y el mensaje inicial', async () => {
  const { cola, refs, falso } = await preparar();
  await cola.lanzar(refs);
  await esperar();
  assert.ok(falso.llamadas[0].args.includes('--session-id'));
  assert.match(falso.llamadas[0].mensaje, /Escribe tu dictamen en carpetas\/ia\/ideas\/idea-0\/hilo\/002-claude\.md$/);
});

test('sin dictamen la idea queda en error, nunca aceptada', async () => {
  const { cola, refs, falso, estado } = await preparar();
  await cola.lanzar(refs);
  await esperar();
  await falso.terminar(0, { dictamen: null });
  assert.equal(await estado(0), 'error');
});

test('dictamen con frontmatter inválido queda en error y se borra', async () => {
  const { cfg, cola, refs, falso, estado } = await preparar();
  await cola.lanzar(refs);
  await esperar();
  await falso.terminar(0, { dictamen: 'texto sin frontmatter' });
  assert.equal(await estado(0), 'error');
  await assert.rejects(fs.access(path.join(cfg.datos, 'carpetas/ia/ideas/idea-0/hilo/002-claude.md')));
});

test('la réplica retoma la misma sesión con --resume', async () => {
  const { cola, refs, falso, ideas } = await preparar();
  await cola.lanzar(refs);
  await esperar();
  await falso.terminar(0);
  const sesion = (await ideas.obtener('ia', refs[0].ideaId)).sessionId;
  await ideas.responder('ia', refs[0].ideaId, '¿Y con dopamina?');
  await cola.lanzar(refs);
  await esperar();
  const args = falso.llamadas[1].args;
  assert.equal(args[args.indexOf('--resume') + 1], sesion);
  assert.match(falso.llamadas[1].mensaje, /¿Y con dopamina\?/);
  assert.match(falso.llamadas[1].mensaje, /004-claude\.md$/);
});

test('detener una idea en cola la devuelve a su estado previo', async () => {
  const { cola, refs, estado } = await preparar(6);
  await cola.lanzar(refs);
  await esperar();
  await cola.detener([refs[5]]);
  await esperar();
  assert.equal(await estado(5), 'borrador');
  assert.equal(cola.estado().enCola.length, 0);
});

test('detener una idea en ejecución la deja detenida', async () => {
  const { cola, refs, estado } = await preparar();
  await cola.lanzar(refs);
  await esperar();
  await cola.detener(refs);
  await esperar(80);
  assert.equal(await estado(0), 'detenida');
  assert.equal(cola.estado().ejecutando.length, 0);
});

test('superar el 90 % de 5 h pausa las activas y desencola el resto', async () => {
  const { cola, refs, falso, estado, notificaciones } = await preparar(6);
  const pausas = [];
  cola.on('pausa', (p) => pausas.push(p));
  await cola.lanzar(refs);
  await esperar();
  falso.cuota(0, 0.95);
  await hasta(async () => (await estado(4)) === 'pausada' && (await estado(0)) === 'pausada');
  await hasta(async () => (await estado(5)) === 'borrador');
  for (let n = 0; n < 5; n++) assert.equal(await estado(n), 'pausada');
  assert.equal(await estado(5), 'borrador');
  assert.equal(notificaciones.length, 1);
  assert.equal(pausas.length, 1);
  assert.equal(cola.estado().pausadaPorCuota, true);
});

test('por debajo del umbral no se pausa', async () => {
  const { cola, refs, falso, estado } = await preparar();
  await cola.lanzar(refs);
  await esperar();
  falso.cuota(0, 0.89);
  await esperar();
  assert.equal(await estado(0), 'en-proceso');
});

test('reanudar ignora ideas que no están pausadas', async () => {
  const { cola, refs, falso } = await preparar();
  await cola.reanudar(refs);
  await esperar();
  assert.equal(falso.llamadas.length, 0);
});

test('reanudar una pausada continúa la sesión y no vuelve a pausar antes del reinicio', async () => {
  const { cola, refs, falso, estado } = await preparar();
  await cola.lanzar(refs);
  await esperar();
  falso.cuota(0, 0.95);
  await hasta(async () => (await estado(0)) === 'pausada');
  assert.equal(await estado(0), 'pausada');
  await cola.reanudar(refs);
  await hasta(() => falso.llamadas.length === 2);
  const l = falso.llamadas[1];
  assert.ok(l.args.includes('--resume'));
  assert.match(l.mensaje, /continúa donde la dejaste/);
  falso.cuota(1, 0.97);
  await esperar(50);
  assert.equal(await estado(0), 'en-proceso');
  await falso.terminar(1);
  await hasta(async () => (await estado(0)) === 'aceptada' && !cola.estado().pausadaPorCuota);
  assert.equal(await estado(0), 'aceptada');
  assert.equal(cola.estado().pausadaPorCuota, false);
});

test('recuperar pasa a detenida lo que quedó en proceso y relanzar usa --resume', async () => {
  const { cfg, ideas, refs, estado, falso } = await preparar();
  await ideas.actualizar('ia', refs[0].ideaId, { estado: 'en-proceso', sessionId: 'abc', interrumpida: true });
  const cola = crearCola({
    cfg, ideas, carpetas: crearAlmacenCarpetas(cfg), ajustes: crearAjustes(cfg), guard: crearGuard(cfg),
    ejecutar: falso.ejecutar, notificar: async () => {},
  });
  await cola.recuperar();
  assert.equal(await estado(0), 'detenida');
  await cola.lanzar(refs);
  await esperar();
  const args = falso.llamadas[0].args;
  assert.equal(args[args.indexOf('--resume') + 1], 'abc');
});

test('lanzar ignora ideas que ya están en proceso', async () => {
  const { cola, refs, falso } = await preparar();
  await cola.lanzar(refs);
  await esperar();
  await cola.lanzar(refs);
  await esperar();
  assert.equal(falso.llamadas.length, 1);
});
