// Tests de la revisión final: cada uno reproduce un hallazgo antes de su arreglo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { crearAlmacenCarpetas } from '../server/store/carpetas.js';
import { crearAlmacenIdeas } from '../server/store/ideas.js';
import { crearAjustes } from '../server/store/ajustes.js';
import { crearGuard } from '../server/engine/guard.js';
import { crearCola } from '../server/engine/cola.js';
import { mensajeEjecucion } from '../server/engine/prompt.js';
import { crearAutoguardado } from '../web/src/lib/autoguardado.js';
import { cfgTemporal } from './helpers.js';

const esperar = (ms = 30) => new Promise((r) => setTimeout(r, ms));
async function hasta(cond, ms = 4000) {
  const t0 = Date.now();
  while (!(await cond()) && Date.now() - t0 < ms) await esperar(20);
}

async function entorno({ ejecutar } = {}) {
  const cfg = await cfgTemporal();
  const guard = crearGuard(cfg);
  await guard.iniciar();
  const carpetas = crearAlmacenCarpetas(cfg, { proteger: guard.proteger });
  await carpetas.crear({ nombre: 'IA' });
  const ideas = crearAlmacenIdeas(cfg, { proteger: guard.proteger });
  const ajustes = crearAjustes(cfg, { proteger: guard.proteger });
  const llamadas = [];
  const ej = ejecutar ?? ((op) => new Promise((resolve) => {
    llamadas.push({ ...op, resolve });
    if (op.senal.aborted) resolve({ codigo: 130, abortado: true });
    op.senal.addEventListener('abort', () => resolve({ codigo: 130, abortado: true }));
  }));
  const nuevaCola = () => crearCola({ cfg, ideas, carpetas, ajustes, guard, ejecutar: ej, notificar: async () => {} });
  const idea = await ideas.crear('ia', { titulo: 'X', cuerpo: 'original' });
  const ref = { carpetaId: 'ia', ideaId: idea.id };
  return { cfg, guard, ideas, ajustes, llamadas, nuevaCola, ref };
}

test('#1 los ajustes guardados sobreviven a la verificación del guard', async () => {
  const { guard, ajustes } = await entorno();
  await ajustes.guardar({ paralelo: 2 });
  const { restaurados } = await guard.verificar({ propios: [], ajenosActivos: [] });
  assert.deepEqual(restaurados, []);
  assert.equal((await ajustes.leer()).paralelo, 2);
});

test('#2 «No conversation found» borra la sesión aunque no fuera nueva', async () => {
  const { ideas, nuevaCola, ref } = await entorno({
    ejecutar: async () => ({ codigo: 1, abortado: false, stderr: 'Error: No conversation found with session ID: abc' }),
  });
  await ideas.actualizar('ia', ref.ideaId, { estado: 'detenida', sessionId: 'abc', interrumpida: true });
  const cola = nuevaCola();
  await cola.lanzar([ref]);
  await hasta(async () => (await ideas.obtener('ia', ref.ideaId)).estado === 'error');
  const i = await ideas.obtener('ia', ref.ideaId);
  assert.equal(i.estado, 'error');
  assert.equal(i.sessionId, null);
  assert.equal(i.interrumpida, false);
});

test('#2 una sesión nueva abortada antes de arrancar no deja sessionId', async () => {
  const { ideas, nuevaCola, ref, llamadas } = await entorno();
  const cola = nuevaCola();
  await cola.lanzar([ref]);
  await hasta(() => llamadas.length === 1);
  await cola.detener([ref]); // claude nunca emitió system/init
  await hasta(async () => (await ideas.obtener('ia', ref.ideaId)).estado === 'detenida');
  const i = await ideas.obtener('ia', ref.ideaId);
  assert.equal(i.sessionId, null);
  assert.equal(i.interrumpida, false);
});

test('#3 recuperar no marca como interrumpida una réplica que solo estaba en cola', async () => {
  const { ideas, nuevaCola, ref } = await entorno();
  await ideas.actualizar('ia', ref.ideaId, { estado: 'en-proceso', sessionId: 'abc', interrumpida: false });
  await nuevaCola().recuperar();
  assert.equal((await ideas.obtener('ia', ref.ideaId)).interrumpida, false);
});

test('#3 el mensaje de reanudar incluye la réplica pendiente', () => {
  const m = mensajeEjecucion({
    tipo: 'reanudar', idea: { titulo: 'X' }, carpeta: { nombre: 'IA' }, rutaIdea: 'r', archivoDestino: 'r/hilo/004-claude.md',
    replica: '¿Y con dopamina?',
  });
  assert.match(m, /¿Y con dopamina\?/);
  assert.match(m, /Escribe tu dictamen en r\/hilo\/004-claude\.md$/);
});

test('#4 al recuperar se revierten los cambios ilegítimos y el dictamen a medias', async () => {
  const { cfg, ideas, nuevaCola, ref } = await entorno();
  const dir = path.join(cfg.datos, 'carpetas/ia/ideas', ref.ideaId);
  await ideas.actualizar('ia', ref.ideaId, { estado: 'en-proceso', sessionId: 'abc', interrumpida: true, archivoDestino: '002-claude.md' });
  await fs.writeFile(path.join(dir, 'hilo/001-usuario.md'), 'manipulado');
  await fs.writeFile(path.join(dir, 'hilo/002-claude.md'), '# a medias');
  // El servidor «se reinicia».
  const guard2 = crearGuard(cfg);
  await guard2.iniciar();
  await nuevaCola().recuperar();
  assert.equal(await fs.readFile(path.join(dir, 'hilo/001-usuario.md'), 'utf8'), 'original');
  await assert.rejects(fs.access(path.join(dir, 'hilo/002-claude.md')));
  assert.equal((await ideas.obtener('ia', ref.ideaId)).estado, 'detenida');
});

test('#4 al recuperar, un dictamen completo escrito antes del corte se acepta', async () => {
  const { cfg, ideas, nuevaCola, ref } = await entorno();
  const dir = path.join(cfg.datos, 'carpetas/ia/ideas', ref.ideaId);
  await ideas.actualizar('ia', ref.ideaId, { estado: 'en-proceso', sessionId: 'abc', interrumpida: true, archivoDestino: '002-claude.md' });
  await fs.writeFile(path.join(dir, 'hilo/002-claude.md'), '---\nveredicto: rechazada\netapa: 1\nresumen: No\n---\nx');
  await crearGuard(cfg).iniciar();
  await nuevaCola().recuperar();
  assert.equal((await ideas.obtener('ia', ref.ideaId)).estado, 'rechazada');
});

test('#5 reanudar tras reinicio (sin cuota en memoria) no vuelve a pausar', async () => {
  const { ideas, nuevaCola, ref, llamadas } = await entorno();
  await ideas.actualizar('ia', ref.ideaId, { estado: 'pausada', sessionId: 'abc', interrumpida: true });
  const cola = nuevaCola();
  await cola.recuperar();
  await cola.reanudar([ref]);
  await hasta(() => llamadas.length === 1);
  llamadas[0].alEvento({
    type: 'rate_limit_event',
    rate_limit_info: { unifiedWindows: { five_hour: { utilization: 0.95, resetsAt: 4102444800 }, seven_day: { utilization: 0.2, resetsAt: 4102444800 } } },
  });
  await esperar(150);
  assert.equal((await ideas.obtener('ia', ref.ideaId)).estado, 'en-proceso');
});

test('#7 apagar deja las ejecuciones en detenida', async () => {
  const { ideas, nuevaCola, ref, llamadas } = await entorno();
  const cola = nuevaCola();
  await cola.lanzar([ref]);
  await hasta(() => llamadas.length === 1);
  await cola.apagar();
  assert.equal((await ideas.obtener('ia', ref.ideaId)).estado, 'detenida');
});

test('#7 un index.lock huérfano no impide arrancar', async () => {
  const { cfg } = await entorno();
  await fs.writeFile(path.join(cfg.datos, '.git/index.lock'), '');
  await crearGuard(cfg).iniciar();
});

test('#6 el autoguardado se puede vaciar al salir', async () => {
  const guardados = [];
  const a = crearAutoguardado(async (v) => guardados.push(v), 1500);
  a.programar('uno');
  a.programar('dos');
  await a.vaciar();
  assert.deepEqual(guardados, ['dos']);
  await a.vaciar();
  assert.deepEqual(guardados, ['dos']);
});
