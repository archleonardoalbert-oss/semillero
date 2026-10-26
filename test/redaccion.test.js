// El motor de redacción: cada asignatura (nodo de estudio) de un curso la redacta una sesión dedicada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { crearAlmacenCarpetas } from '../server/store/carpetas.js';
import { crearAlmacenIdeas } from '../server/store/ideas.js';
import { crearAjustes } from '../server/store/ajustes.js';
import { crearAlmacenGerminacion } from '../server/store/germinacion.js';
import { crearGuard } from '../server/engine/guard.js';
import { crearCola } from '../server/engine/cola.js';
import { crearMotorRedaccion } from '../server/engine/redaccion.js';
import { cfgTemporal } from './helpers.js';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function hasta(cond, ms = 6000) {
  const t0 = Date.now();
  while (!(await cond())) {
    if (Date.now() - t0 > ms) return false;
    await esperar(20);
  }
  return true;
}

const MAPA = {
  version: 1,
  fase: 'mapa',
  resumen: 'Curso de topología',
  nodos: [
    { id: 'e1', tipo: 'estudio', titulo: 'Grupos', documento: 'nodos/e1.md', depende: [], recursos: [], plan: [{ titulo: 'Grupos libres', objetivos: ['Presentar un grupo'] }] },
    { id: 'e2', tipo: 'estudio', titulo: 'Homología', documento: 'nodos/e2.md', depende: ['e1'], recursos: [] },
    { id: 'i1', tipo: 'incognita', titulo: 'Homología del toro', documento: 'nodos/i1.md', depende: ['e2'], recursos: [] },
  ],
  recursos: [],
};

const ESCENA_BUENA = 'export default (S) => S.definirEscena({ alto: 300, pasos: 2, dibujar(g, c, { paso, p }) { g.circulo(100 + paso * 50, 100, 10 * p); } });';
const ESCENA_ROTA = 'export default (S) => S.definirEscena({ alto: 300, pasos: 2, dibujar(g, c, { paso }) { if (paso === 1) throw new Error("se rompe"); } });';

function indiceDe(n) {
  return {
    version: 1,
    conferencias: [{ id: 'c01', titulo: `Conferencia de ${n}`, documento: `nodos/${n}/c01.md`, objetivos: ['Algo verificable'] }],
    practicas: [{ id: 'p01', titulo: 'Práctica', documento: `nodos/${n}/p01.md`, conferencias: ['c01'] }],
    valientes: [],
    recursos: [{ id: 'r1', tipo: 'libro', titulo: 'Hatcher', url: 'https://pi.math.cornell.edu/~hatcher/AT/ATpage.html', archivo: `recursos/${n}/hatcher.pdf`, idioma: 'English', conferencias: ['c01'] }],
  };
}

// Un curso con su mapa aceptado, y un ejecutar falso con el que el test decide qué escribe cada sesión.
async function curso({ tipo = 'aprendizaje', paralelo = 5 } = {}) {
  const cfg = await cfgTemporal();
  const guard = crearGuard(cfg);
  await guard.iniciar();
  const carpetas = crearAlmacenCarpetas(cfg, { proteger: guard.proteger });
  await carpetas.crear({ nombre: 'Aprender', tipo });
  const ideas = crearAlmacenIdeas(cfg, { proteger: guard.proteger });
  const idea = await ideas.crear('aprender', { titulo: 'Topología algebraica', cuerpo: 'Quiero aprender topología algebraica.' });
  const rutaIdea = ideas.relIdea('aprender', idea.id);
  const g = path.join(cfg.datos, rutaIdea, 'germinacion');
  await fs.mkdir(path.join(g, 'nodos'), { recursive: true });
  await fs.writeFile(path.join(g, 'mapa.json'), JSON.stringify(MAPA));
  for (const n of MAPA.nodos) await fs.writeFile(path.join(g, n.documento), `# ${n.titulo}`);
  await fs.writeFile(path.join(g, 'progreso.json'), JSON.stringify({ nodos: {}, respuestas: { idiomas: ['English', 'Español'] } }));
  await ideas.actualizar('aprender', idea.id, { estado: 'aceptada', trabajo: 'germinacion', germinacion: { fase: 'mapa' } });
  await guard.commitear('todo', 'curso de prueba');
  const ajustes = crearAjustes(cfg, { proteger: guard.proteger });
  await ajustes.guardar({ paralelo });
  const germinacion = crearAlmacenGerminacion(cfg, { proteger: guard.proteger });

  const llamadas = [];
  const ejecutar = (op) => new Promise((resolve) => {
    const mensaje = op.args[op.args.indexOf('-p') + 1];
    const nodo = mensaje.match(/nodo `([a-z0-9-]+)`|del nodo «[^»]+» \(([a-z0-9-]+)\)/)?.slice(1).find(Boolean);
    const resume = op.args.includes('--resume') ? op.args[op.args.indexOf('--resume') + 1] : null;
    llamadas.push({ ...op, mensaje, nodo, resume, sistema: op.args[op.args.indexOf('--append-system-prompt') + 1], resolve });
    op.alEvento({ type: 'system', subtype: 'init', session_id: `sesion-${nodo}` });
  });
  const colaEjecutar = () => new Promise(() => {});
  const cola = crearCola({ cfg, ideas, carpetas, ajustes, guard, germinacion, ejecutar: colaEjecutar, notificar: async () => {} });
  const motor = crearMotorRedaccion({ cfg, ideas, carpetas, germinacion, guard, cola, ajustes, ejecutar });
  const ref = { carpetaId: 'aprender', ideaId: idea.id };
  const dir = path.join(cfg.datos, rutaIdea);

  // Lo que escribe la sesión de un nodo: el índice, sus documentos, una escena y el PDF.
  async function escribir(n, { indice = indiceDe(n), escena = ESCENA_BUENA, extra = async () => {} } = {}) {
    await fs.mkdir(path.join(dir, 'germinacion/nodos', n), { recursive: true });
    await fs.mkdir(path.join(dir, 'germinacion/escenas', n), { recursive: true });
    await fs.mkdir(path.join(dir, 'germinacion/recursos', n), { recursive: true });
    await fs.writeFile(path.join(dir, 'germinacion/nodos', n, 'c01.md'), `# Conferencia\n\n\`\`\`escena\n{"archivo": "escenas/${n}/giro.js", "titulo": "Giro"}\n\`\`\`\n`);
    await fs.writeFile(path.join(dir, 'germinacion/nodos', n, 'p01.md'), '# Práctica');
    await fs.writeFile(path.join(dir, 'germinacion/escenas', n, 'giro.js'), escena);
    await fs.writeFile(path.join(dir, 'germinacion/recursos', n, 'hatcher.pdf'), '%PDF-1.4');
    await extra();
    await fs.writeFile(path.join(dir, 'germinacion/nodos', n, 'indice.json'), JSON.stringify(indice));
  }
  async function terminar(k, opciones) {
    await hasta(() => llamadas[k]);
    await escribir(llamadas[k].nodo, opciones);
    llamadas[k].resolve({ codigo: 0, abortado: false, resultado: { subtype: 'success', is_error: false, result: 'Hecho' } });
  }
  const estadoNodo = async (n) => (await motor.estado(ref)).nodos[n]?.estado;
  return { cfg, guard, ideas, cola, motor, ref, dir, llamadas, escribir, terminar, estadoNodo, ajustes };
}

test('planificar lanza una sesión dedicada por asignatura (no por incógnita), con el redactor y sin retomar nada', async () => {
  const x = await curso();
  await x.motor.planificar(x.ref);
  assert.ok(await hasta(() => x.llamadas.length === 2));
  assert.deepEqual(x.llamadas.map((l) => l.nodo).sort(), ['e1', 'e2']);
  assert.ok(x.llamadas.every((l) => l.resume === null));
  assert.match(x.llamadas[0].sistema, /Redactor de asignaturas/);
  const e1 = x.llamadas.find((l) => l.nodo === 'e1');
  assert.match(e1.mensaje, /Grupos libres/);
  assert.match(e1.mensaje, /Escribe TODO en English/);
  assert.equal(x.motor.ocupada(x.ref), true);
  assert.equal(await x.estadoNodo('e1'), 'redactando');
});

test('respeta el límite de sesiones en paralelo', async () => {
  const x = await curso({ paralelo: 1 });
  await x.motor.planificar(x.ref);
  await hasta(() => x.llamadas.length === 1);
  await esperar(200);
  assert.equal(x.llamadas.length, 1);
  await x.terminar(0);
  assert.ok(await hasta(() => x.llamadas.length === 2), 'arranca la siguiente al terminar la primera');
});

test('un nodo bien redactado queda listo, normalizado y commiteado', async () => {
  const x = await curso();
  await x.motor.planificar(x.ref);
  await hasta(() => x.llamadas.length === 2);
  const k = x.llamadas.findIndex((l) => l.nodo === 'e1');
  await x.terminar(k);
  assert.ok(await hasta(async () => (await x.estadoNodo('e1')) === 'lista'));
  const rel = path.relative(x.cfg.datos, path.join(x.dir, 'germinacion/nodos/e1/indice.json'));
  assert.ok(await x.guard.commiteado(rel), 'el índice queda en el historial');
  const r = await x.motor.estado(x.ref);
  assert.equal(r.indices.e1.conferencias[0].titulo, 'Conferencia de e1');
});

test('un índice inválido se corrige en la misma sesión con el motivo; si vuelve a fallar, queda en error', async () => {
  const x = await curso();
  await x.motor.planificar(x.ref);
  await hasta(() => x.llamadas.length === 2);
  const k = x.llamadas.findIndex((l) => l.nodo === 'e1');
  const malo = { ...indiceDe('e1'), conferencias: [] };
  await x.terminar(k, { indice: malo });
  assert.ok(await hasta(() => x.llamadas.length === 3));
  const reintento = x.llamadas[2];
  assert.equal(reintento.resume, 'sesion-e1');
  assert.match(reintento.mensaje, /no se aceptó: .*conferencia/);
  await x.escribir('e1', { indice: malo });
  reintento.resolve({ codigo: 0, abortado: false, resultado: { is_error: false, result: 'ok' } });
  assert.ok(await hasta(async () => (await x.estadoNodo('e1')) === 'error'));
  assert.match((await x.motor.estado(x.ref)).nodos.e1.error, /conferencia/);
});

test('una escena que no pasa la comprobación invalida el nodo con el motivo', async () => {
  const x = await curso();
  await x.motor.planificar(x.ref);
  await hasta(() => x.llamadas.length === 2);
  await x.terminar(x.llamadas.findIndex((l) => l.nodo === 'e1'), { escena: ESCENA_ROTA });
  assert.ok(await hasta(() => x.llamadas.length === 3));
  assert.match(x.llamadas[2].mensaje, /escenas\/e1\/giro\.js.*se rompe/s);
});

test('lo que una sesión escribe fuera de sus carpetas se revierte', async () => {
  const x = await curso();
  await x.motor.planificar(x.ref);
  await hasta(() => x.llamadas.length === 2);
  const mapa = path.join(x.dir, 'germinacion/mapa.json');
  const antes = await fs.readFile(mapa, 'utf8');
  await x.terminar(x.llamadas.findIndex((l) => l.nodo === 'e1'), {
    extra: async () => {
      await fs.writeFile(mapa, '{"roto": true}');
      await fs.writeFile(path.join(x.dir, 'germinacion/progreso.json'), '{}');
    },
  });
  assert.ok(await hasta(async () => (await x.estadoNodo('e1')) === 'lista'));
  assert.equal(await fs.readFile(mapa, 'utf8'), antes);
});

test('en un bancal que no es de aprendizaje no se redacta nada', async () => {
  const x = await curso({ tipo: 'academico' });
  await x.motor.planificar(x.ref);
  await esperar(200);
  assert.equal(x.llamadas.length, 0);
  assert.equal(x.motor.ocupada(x.ref), false);
});

const CUOTA = (u) => ({ type: 'rate_limit_event', rate_limit_info: { unifiedWindows: { five_hour: { utilization: u, resetsAt: 4102444800 }, seven_day: { utilization: 0.1, resetsAt: 4102444800 } } } });

test('con la cuota por encima del umbral no arranca ninguna redacción', async () => {
  const x = await curso();
  x.cola.registrarCuota(CUOTA(0.95));
  await x.motor.planificar(x.ref);
  await esperar(200);
  assert.equal(x.llamadas.length, 0);
  assert.equal(await x.estadoNodo('e1'), 'pendiente');
  x.cola.registrarCuota(CUOTA(0.2));
  assert.ok(await hasta(() => x.llamadas.length === 2), 'arranca cuando vuelve a haber cuota');
});

test('si la cuota cruza el umbral a mitad de una redacción, se detiene, guarda lo escrito y se retoma en la misma sesión', async () => {
  const x = await curso({ paralelo: 1 });
  await x.motor.planificar(x.ref);
  await hasta(() => x.llamadas.length === 1);
  const l = x.llamadas[0];
  // La sesión lleva media asignatura escrita cuando llega el aviso de cuota.
  await fs.mkdir(path.join(x.dir, 'germinacion/nodos', l.nodo), { recursive: true });
  await fs.writeFile(path.join(x.dir, 'germinacion/nodos', l.nodo, 'c01.md'), 'media conferencia');
  l.senal.addEventListener('abort', () => l.resolve({ codigo: 130, abortado: true }));
  l.alEvento(CUOTA(0.95));
  assert.ok(await hasta(async () => (await x.estadoNodo(l.nodo)) === 'pendiente'));
  assert.equal(await fs.readFile(path.join(x.dir, 'germinacion/nodos', l.nodo, 'c01.md'), 'utf8'), 'media conferencia');
  await esperar(150);
  assert.equal(x.llamadas.length, 1, 'no arranca nada más mientras no haya cuota');
  x.cola.registrarCuota(CUOTA(0.1));
  assert.ok(await hasta(() => x.llamadas.length === 2));
  assert.equal(x.llamadas[1].resume, `sesion-${l.nodo}`);
  assert.match(x.llamadas[1].mensaje, /continúa donde l/i);
});

test('al reiniciar, lo que se estaba redactando vuelve a empezar desde lo último bueno', async () => {
  const x = await curso();
  await x.motor.planificar(x.ref);
  await hasta(() => x.llamadas.length === 2);
  // A medio escribir cuando se apagó el servidor.
  await fs.mkdir(path.join(x.dir, 'germinacion/nodos/e1'), { recursive: true });
  await fs.writeFile(path.join(x.dir, 'germinacion/nodos/e1/c01.md'), 'a medias');
  const llamadas2 = [];
  const otro = crearMotorRedaccion({
    cfg: x.cfg, ideas: x.ideas, carpetas: crearAlmacenCarpetas(x.cfg, { proteger: x.guard.proteger }),
    germinacion: crearAlmacenGerminacion(x.cfg, { proteger: x.guard.proteger }), guard: x.guard, cola: x.cola, ajustes: x.ajustes,
    ejecutar: (op) => new Promise(() => llamadas2.push(op)),
  });
  await otro.recuperar();
  await assert.rejects(fs.access(path.join(x.dir, 'germinacion/nodos/e1/c01.md')));
  assert.ok(await hasta(() => llamadas2.length === 2), 'vuelve a lanzar las dos');
});
