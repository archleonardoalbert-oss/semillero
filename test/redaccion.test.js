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

// --- Hallazgos de la revisión final ---
test('R1: apagar detiene las redacciones y deja el nodo como estaba; al arrancar, lo interrumpido se restaura ANTES de que la cola commitee', async () => {
  const x = await curso({ paralelo: 1 });
  await x.motor.planificar(x.ref);
  await hasta(() => x.llamadas.length === 1);
  const l = x.llamadas[0];
  l.senal.addEventListener('abort', () => l.resolve({ codigo: 130, abortado: true }));
  const parcial = path.join(x.dir, 'germinacion/nodos', l.nodo, 'c01.md');
  await fs.mkdir(path.dirname(parcial), { recursive: true });
  await fs.writeFile(parcial, 'a medias');
  await x.motor.apagar();
  assert.equal(await x.estadoNodo(l.nodo), 'pendiente');
  await assert.rejects(fs.access(parcial), 'lo escrito a medias se descarta');

  // Un corte de luz: el nodo quedó «redactando» con archivos a medias y el servidor arranca de nuevo.
  const y = await curso({ paralelo: 1 });
  await y.motor.planificar(y.ref);
  await hasta(() => y.llamadas.length === 1);
  const p2 = path.join(y.dir, 'germinacion/nodos', y.llamadas[0].nodo, 'c01.md');
  await fs.mkdir(path.dirname(p2), { recursive: true });
  await fs.writeFile(p2, 'a medias');
  await y.motor.restaurarInterrumpidas();
  await y.cola.recuperar(); // hace commit de «todo»: ya no debe encontrar lo de la redacción
  await assert.rejects(fs.access(p2));
});

test('R2: reintentar dos veces seguidas lanza una sola sesión', async () => {
  const x = await curso();
  await fs.writeFile(path.join(x.dir, 'germinacion/redaccion.json'), JSON.stringify({ nodos: { e1: { estado: 'error', error: 'x' }, e2: { estado: 'lista' } } }));
  await Promise.allSettled([x.motor.reintentar(x.ref, 'e1'), x.motor.reintentar(x.ref, 'e1')]);
  await hasta(() => x.llamadas.length >= 1);
  await esperar(300);
  assert.equal(x.llamadas.filter((l) => l.nodo === 'e1').length, 1);
});

test('R3: si la idea ya no existe, la redacción no recrea su carpeta', async () => {
  const x = await curso({ paralelo: 1 });
  await x.motor.planificar(x.ref);
  await hasta(() => x.llamadas.length === 1);
  await x.ideas.borrar(x.ref.carpetaId, x.ref.ideaId);
  x.llamadas[0].resolve({ codigo: 0, abortado: false, resultado: { is_error: true, result: 'fallo' } });
  await esperar(600);
  await assert.rejects(fs.access(path.join(x.dir, 'germinacion/redaccion.json')));
});

// --- Pausa manual de la germinación (decisión del usuario, 2026-10-26) ---
test('pausar detiene y guarda cada redacción, no arranca nada más y continuar retoma cada una donde estaba', async () => {
  const x = await curso({ paralelo: 1 });
  await x.motor.planificar(x.ref);
  await hasta(() => x.llamadas.length === 1);
  const l = x.llamadas[0];
  const otro = l.nodo === 'e1' ? 'e2' : 'e1';
  l.senal.addEventListener('abort', () => l.resolve({ codigo: 130, abortado: true }));
  const parcial = path.join(x.dir, 'germinacion/nodos', l.nodo, 'c01.md');
  await fs.mkdir(path.dirname(parcial), { recursive: true });
  await fs.writeFile(parcial, 'media conferencia');

  await x.motor.pausar(x.ref); // vuelve cuando todo está detenido y guardado
  assert.equal(await x.estadoNodo(l.nodo), 'pausada');
  assert.equal(await x.estadoNodo(otro), 'pausada');
  assert.equal(await fs.readFile(parcial, 'utf8'), 'media conferencia');
  assert.ok(await x.guard.commiteado(path.relative(x.cfg.datos, parcial)), 'lo escrito queda guardado');
  assert.equal(x.motor.ocupada(x.ref), true, 'pausada sigue contando como ocupada (no se toca el plan)');
  await x.motor.planificar(x.ref);
  await x.motor.recuperar();
  await esperar(200);
  assert.equal(x.llamadas.length, 1, 'ni planificar ni un reinicio la reanudan');
  assert.equal((await x.motor.estado(x.ref)).pausada, true);

  await x.motor.continuar(x.ref);
  assert.ok(await hasta(() => x.llamadas.length === 2));
  assert.equal(x.llamadas[1].nodo, l.nodo, 'primero sigue la que estaba en marcha');
  assert.equal(x.llamadas[1].resume, `sesion-${l.nodo}`);
  assert.match(x.llamadas[1].mensaje, /Continúa donde lo dejaste/);
  assert.match(x.llamadas[1].mensaje, /no un rechazo de lo que estabas haciendo/);
  await x.terminar(1);
  assert.ok(await hasta(() => x.llamadas.length === 3), 'después, la que esperaba en la fila');
  assert.equal(x.llamadas[2].resume, null);
});

// --- Control manual: nada se redacta hasta «Comenzar»; mandos globales y por asignatura ---
test('terminar el plan no arranca la redacción: hace falta «Comenzar»; después, lo nuevo se redacta solo', async () => {
  const x = await curso();
  const idea = await x.ideas.obtener(x.ref.carpetaId, x.ref.ideaId);
  x.cola.emit('idea', { ref: x.ref, idea });
  await esperar(250);
  assert.equal(x.llamadas.length, 0, 'sin «Comenzar» no se gasta cuota');
  await x.motor.comenzar(x.ref);
  assert.ok(await hasta(() => x.llamadas.length === 2));
  assert.equal((await x.motor.estado(x.ref)).iniciada, true);
});

test('cada asignatura se puede comenzar, pausar y continuar por separado', async () => {
  const x = await curso();
  await x.motor.comenzarNodo(x.ref, 'e2');
  assert.ok(await hasta(() => x.llamadas.length === 1));
  assert.equal(x.llamadas[0].nodo, 'e2');
  assert.equal(await x.estadoNodo('e1'), undefined, 'las demás no se tocan');
  const l = x.llamadas[0];
  l.senal.addEventListener('abort', () => l.resolve({ codigo: 130, abortado: true }));
  await x.motor.pausarNodo(x.ref, 'e2');
  assert.equal(await x.estadoNodo('e2'), 'pausada');
  assert.equal(x.motor.ocupada(x.ref), true, 'con una asignatura a medias no se toca el plan');
  await x.motor.continuarNodo(x.ref, 'e2');
  assert.ok(await hasta(() => x.llamadas.length === 2));
  assert.equal(x.llamadas[1].resume, 'sesion-e2');
  await assert.rejects(x.motor.continuarNodo(x.ref, 'e1'), /estado-invalido/);
});

test('pausar una asignatura que espera turno la saca de la fila sin lanzar nada', async () => {
  const x = await curso({ paralelo: 1 });
  await x.motor.comenzar(x.ref);
  await hasta(() => x.llamadas.length === 1);
  const enEspera = x.llamadas[0].nodo === 'e1' ? 'e2' : 'e1';
  await x.motor.pausarNodo(x.ref, enEspera);
  await x.terminar(0);
  await esperar(300);
  assert.equal(x.llamadas.length, 1);
  assert.equal(await x.estadoNodo(enEspera), 'pausada');
});

// --- Revisión de la pausa manual ---
test('P1: continuar una pausa no arranca el curso si nunca se pulsó «Comenzar»', async () => {
  const x = await curso();
  await x.motor.pausar(x.ref);
  await x.motor.continuar(x.ref);
  await esperar(300);
  assert.equal(x.llamadas.length, 0);
});

test('P2: una pausa que coincide con el fin de cuota gana: el nodo no vuelve a arrancar al volver la cuota', async () => {
  const x = await curso({ paralelo: 1 });
  await x.motor.comenzar(x.ref);
  await hasta(() => x.llamadas.length === 1);
  const l = x.llamadas[0];
  l.senal.addEventListener('abort', () => setTimeout(() => l.resolve({ codigo: 130, abortado: true }), 50));
  l.alEvento(CUOTA(0.95)); // la cuota la corta…
  await x.motor.pausar(x.ref); // …y a la vez el usuario pausa
  x.cola.registrarCuota(CUOTA(0.1));
  await esperar(400);
  assert.equal(x.llamadas.length, 1, 'nada arranca con la idea en pausa');
  assert.equal(await x.estadoNodo(l.nodo), 'pausada');
});

test('P5: continuar mientras la pausa aún termina deja todo en marcha, nada atascado en pausa', async () => {
  const x = await curso({ paralelo: 1 });
  await x.motor.comenzar(x.ref);
  await hasta(() => x.llamadas.length === 1);
  const l = x.llamadas[0];
  l.senal.addEventListener('abort', () => setTimeout(() => l.resolve({ codigo: 130, abortado: true }), 150));
  const pausa = x.motor.pausar(x.ref);
  await esperar(20);
  await x.motor.continuar(x.ref);
  await pausa;
  assert.ok(await hasta(() => x.llamadas.length === 2), 'la sesión cortada sigue');
  assert.equal(x.llamadas[1].resume, `sesion-${l.nodo}`);
});

test('un fallo de red o de acceso guarda lo escrito y la sesión: volver a redactar retoma esa conversación', async () => {
  const x = await curso({ paralelo: 1 });
  await x.motor.comenzarNodo(x.ref, 'e1');
  await hasta(() => x.llamadas.length === 1);
  const parcial = path.join(x.dir, 'germinacion/nodos/e1/c01.md');
  await fs.mkdir(path.dirname(parcial), { recursive: true });
  await fs.writeFile(parcial, 'media conferencia');
  x.llamadas[0].resolve({ codigo: 1, abortado: false, resultado: { is_error: true, result: "API Error: Can't reach the API server — check your internet or DNS (EAI_AGAIN)" } });
  assert.ok(await hasta(async () => (await x.estadoNodo('e1')) === 'error'));
  assert.ok(await x.guard.commiteado(path.relative(x.cfg.datos, parcial)), 'lo escrito queda guardado');
  await x.motor.comenzarNodo(x.ref, 'e1');
  assert.ok(await hasta(() => x.llamadas.length === 2));
  assert.equal(x.llamadas[1].resume, 'sesion-e1');
  assert.match(x.llamadas[1].mensaje, /Continúa donde lo dejaste/);
});

test('continuar o comenzar una asignatura a mano la pone a trabajar aunque el resto siga en pausa', async () => {
  const x = await curso({ paralelo: 2 });
  await x.motor.comenzar(x.ref);
  await hasta(() => x.llamadas.length === 2);
  for (const l of x.llamadas) l.senal.addEventListener('abort', () => l.resolve({ codigo: 130, abortado: true }));
  await x.motor.pausar(x.ref);
  assert.equal(await x.estadoNodo('e1'), 'pausada');
  await x.motor.continuarNodo(x.ref, 'e1');
  assert.ok(await hasta(() => x.llamadas.length === 3), 'la asignatura elegida arranca');
  assert.equal(x.llamadas[2].nodo, 'e1');
  assert.ok(await hasta(async () => (await x.estadoNodo('e1')) === 'redactando'));
  await esperar(200);
  assert.equal(x.llamadas.length, 3, 'las demás siguen en pausa');
  assert.equal(await x.estadoNodo('e2'), 'pausada');
});

test('la lámina puede mostrar en vivo qué hace la sesión y cuántos tokens lleva, y el total queda guardado', async () => {
  const x = await curso({ paralelo: 1 });
  const avisos = [];
  x.motor.on('redaccion-actividad', (m) => avisos.push(m));
  await x.motor.comenzarNodo(x.ref, 'e1');
  await hasta(() => x.llamadas.length === 1);
  const l = x.llamadas[0];
  l.alEvento({ type: 'assistant', message: { id: 'm1', content: [{ type: 'tool_use', id: 't1', name: 'WebSearch', input: { query: 'Hatcher' } }] } });
  l.alEvento({ type: 'stream_event', event: { type: 'message_delta', usage: { input_tokens: 5, cache_read_input_tokens: 1000, output_tokens: 200 } } });
  const vivo = (await x.motor.estado(x.ref)).actividad.e1;
  assert.match(vivo.accion.texto, /Buscando en la web: «Hatcher»/);
  assert.equal(vivo.tokens.generados, 200);
  assert.ok(await hasta(() => avisos.length > 0));
  assert.equal(avisos.at(-1).nodo, 'e1');
  await x.terminar(0);
  assert.ok(await hasta(async () => (await x.estadoNodo('e1')) === 'lista'));
  const e = await x.motor.estado(x.ref);
  assert.deepEqual(e.nodos.e1.tokens, { generados: 200, leidos: 1005 });
  assert.equal(e.actividad.e1, undefined, 'ya no está en marcha');
});

test('al arrancar, una asignatura que pusiste en marcha a mano dentro de una idea en pausa sigue (no se queda atascada)', async () => {
  const x = await curso();
  await fs.writeFile(path.join(x.dir, 'germinacion/redaccion.json'), JSON.stringify({ iniciada: true, pausada: true, nodos: { e1: { estado: 'pendiente' }, e2: { estado: 'pausada' } } }));
  await x.motor.recuperar();
  assert.ok(await hasta(() => x.llamadas.length === 1));
  assert.equal(x.llamadas[0].nodo, 'e1');
  await esperar(200);
  assert.equal(x.llamadas.length, 1);
});

test('mientras se redacta, los documentos ya escritos se listan como borradores para poder leerlos', async () => {
  const x = await curso({ paralelo: 1 });
  await x.motor.comenzarNodo(x.ref, 'e1');
  await hasta(() => x.llamadas.length === 1);
  const dir = path.join(x.dir, 'germinacion/nodos/e1');
  await fs.mkdir(dir, { recursive: true });
  for (const f of ['c01-grupos-libres.md', 'c02-presentaciones.md', 'p01-practica.md', 'notas-internas.txt']) await fs.writeFile(path.join(dir, f), `# ${f}`);
  const b = (await x.motor.estado(x.ref)).borradores.e1;
  assert.deepEqual(b.map((d) => d.archivo), ['c01-grupos-libres.md', 'c02-presentaciones.md', 'p01-practica.md']);
  assert.deepEqual(b.map((d) => d.clase), ['conferencia', 'conferencia', 'practica']);
  assert.equal(b[0].documento, 'nodos/e1/c01-grupos-libres.md');
  await x.terminar(0);
  assert.ok(await hasta(async () => (await x.estadoNodo('e1')) === 'lista'));
  assert.equal((await x.motor.estado(x.ref)).borradores.e1, undefined, 'una asignatura lista se lee por su índice');
});
