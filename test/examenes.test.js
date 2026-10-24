import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { crearAlmacenCarpetas } from '../server/store/carpetas.js';
import { crearAlmacenIdeas } from '../server/store/ideas.js';
import { crearAlmacenGerminacion } from '../server/store/germinacion.js';
import { crearAlmacenExamenes } from '../server/store/examenes.js';
import { crearAjustes } from '../server/store/ajustes.js';
import { crearGuard } from '../server/engine/guard.js';
import { crearCola } from '../server/engine/cola.js';
import { crearMotorExamenes, LIMITE_SUFICIENTE_MS } from '../server/engine/examenes.js';
import { parsearExamen, parsearCorreccion } from '../server/engine/prompt.js';
import { MAPA } from './fixtures/mapas.js';
import { cfgTemporal } from './helpers.js';

const esperar = (ms = 20) => new Promise((r) => setTimeout(r, ms));
async function hasta(cond, ms = 4000) {
  const t0 = Date.now();
  while (!(await cond())) {
    if (Date.now() - t0 > ms) return;
    await esperar();
  }
}

const EXAMEN = '```semillero-examen\n' + JSON.stringify({ instrucciones: 'Justifica cada paso.', preguntas: [
  { id: 'p1', enunciado: 'Demuestra que $A^\\top A$ es semidefinida positiva.', puntos: 2 },
  { id: 'p2', enunciado: 'Calcula la SVD de $\\begin{pmatrix}1&0\\\\0&2\\end{pmatrix}$.', puntos: 3 },
] }) + '\n```';
const correccion = (nota) => 'Corregido.\n```semillero-correccion\n' + JSON.stringify({ nota, comentario: 'Bien en general.', preguntas: [
  { id: 'p1', nota: 2, comentario: 'Correcto; un signo mal copiado, sin penalizar.' },
  { id: 'p2', nota: nota >= 3 ? 3 : 0, comentario: 'x' },
] }) + '\n```';

function crearFalso() {
  const llamadas = [];
  const ejecutar = (op) =>
    new Promise((resolve) => {
      llamadas.push({ ...op, resolve, mensaje: op.args[op.args.indexOf('-p') + 1], sistema: op.args[op.args.indexOf('--append-system-prompt') + 1] });
      op.alEvento({ type: 'system', subtype: 'init', session_id: `examen-${llamadas.length}` });
    });
  async function responder(n, texto, { error } = {}) {
    await hasta(() => llamadas[n]);
    if (error) llamadas[n].resolve({ codigo: 1, abortado: false, stderr: error });
    else llamadas[n].resolve({ codigo: 0, abortado: false, resultado: { is_error: false, result: texto } });
  }
  return { ejecutar, llamadas, responder };
}

async function preparar() {
  const cfg = await cfgTemporal();
  const guard = crearGuard(cfg);
  await guard.iniciar();
  const carpetas = crearAlmacenCarpetas(cfg, { proteger: guard.proteger });
  await carpetas.crear({ nombre: 'IA' });
  const ideas = crearAlmacenIdeas(cfg, { proteger: guard.proteger });
  const idea = await ideas.crear('ia', { titulo: 'Memoria FFN', cuerpo: 'x' });
  const dir = path.join(cfg.datos, 'carpetas/ia/ideas', idea.id, 'germinacion');
  await fs.mkdir(path.join(dir, 'nodos'), { recursive: true });
  await fs.writeFile(path.join(dir, 'mapa.json'), JSON.stringify(MAPA));
  for (const n of MAPA.nodos) await fs.writeFile(path.join(dir, n.documento), `# ${n.titulo}`);
  await guard.commitear('todo', 'mapa');
  await ideas.actualizar('ia', idea.id, { estado: 'aceptada', trabajo: 'germinacion' });
  const ajustes = crearAjustes(cfg);
  const germinacion = crearAlmacenGerminacion(cfg, { proteger: guard.proteger });
  const cola = crearCola({ cfg, ideas, carpetas, ajustes, guard, germinacion, ejecutar: crearFalso().ejecutar, notificar: async () => {} });
  const examenes = crearAlmacenExamenes(cfg, { proteger: guard.proteger });
  const falso = crearFalso();
  let ahora = Date.parse('2026-10-24T10:00:00Z');
  const temporizadores = [];
  const motor = crearMotorExamenes({
    cfg, ideas, examenes, germinacion, guard, cola, ajustes, ejecutar: falso.ejecutar,
    reloj: () => ahora, temporizar: (fn, ms) => temporizadores.push({ fn, ms }),
  });
  const ref = { carpetaId: 'ia', ideaId: idea.id };
  const leer = (id) => examenes.leer('ia', idea.id, 'e1', id);
  const hastaEstado = (id, e) => hasta(async () => (await leer(id)).estado === e);
  const avanzar = (ms) => (ahora += ms);
  return { cfg, motor, examenes, germinacion, falso, ref, leer, hastaEstado, avanzar, temporizadores, ideas };
}

test('parsearExamen y parsearCorreccion validan los bloques', () => {
  const e = parsearExamen(EXAMEN);
  assert.equal(e.preguntas.length, 2);
  assert.equal(e.puntos, 5);
  assert.equal(parsearExamen('sin bloque'), null);
  const c = parsearCorreccion(correccion(4), e.preguntas);
  assert.equal(c.nota, 4);
  assert.equal(c.aprobado, true);
  assert.equal(parsearCorreccion(correccion(2.5), e.preguntas).aprobado, false);
  assert.equal(parsearCorreccion('```semillero-correccion\n{"nota": 9}\n```', e.preguntas), null);
});

test('generar un examen Suficiente: sesión nueva, contexto aguas abajo y límite de 4 h 30 min', async () => {
  const { motor, falso, ref, leer, hastaEstado, temporizadores } = await preparar();
  const ex = await motor.generar(ref, 'e1', { dificultad: 'suficiente' });
  await hasta(() => falso.llamadas[0]);
  const { args, mensaje, sistema } = falso.llamadas[0];
  assert.ok(!args.includes('--resume'));
  assert.equal(args[args.indexOf('--model') + 1], 'opus');
  assert.match(sistema, /examinador/i);
  assert.match(mensaje, /suficiente/i);
  assert.match(mensaje, /¿Dónde vive un hecho\?/); // incógnita aguas abajo de e1
  await falso.responder(0, EXAMEN);
  await hastaEstado(ex.id, 'abierto');
  const e = await leer(ex.id);
  assert.equal(e.preguntas.length, 2);
  assert.equal(Date.parse(e.limite) - Date.parse(e.inicio), LIMITE_SUFICIENTE_MS);
  assert.equal(LIMITE_SUFICIENTE_MS, 4.5 * 3600 * 1000);
  assert.ok(temporizadores.some((t) => t.ms === LIMITE_SUFICIENTE_MS));
});

test('avanzado y experto no tienen límite; experto pide buscar problemas reales', async () => {
  const { motor, falso, ref, leer, hastaEstado } = await preparar();
  const ex = await motor.generar(ref, 'e1', { dificultad: 'experto' });
  await hasta(() => falso.llamadas[0]);
  assert.match(falso.llamadas[0].mensaje, /experto/i);
  assert.match(falso.llamadas[0].mensaje, /fuentes/i);
  await falso.responder(0, EXAMEN);
  await hastaEstado(ex.id, 'abierto');
  assert.equal((await leer(ex.id)).limite, null);
});

test('responder, entregar y aprobar marca el nodo como dominado', async () => {
  const { motor, falso, ref, leer, hastaEstado, germinacion } = await preparar();
  const ex = await motor.generar(ref, 'e1', { dificultad: 'avanzado' });
  await falso.responder(0, EXAMEN);
  await hastaEstado(ex.id, 'abierto');
  await motor.responder(ref, 'e1', ex.id, { pregunta: 'p1', texto: 'Para todo $x$, $x^\\top A^\\top A x = \\|Ax\\|^2 \\ge 0$.' });
  await motor.entregar(ref, 'e1', ex.id);
  await hasta(() => falso.llamadas[1]);
  const a = falso.llamadas[1].args;
  assert.equal(a[a.indexOf('--resume') + 1], 'examen-1');
  assert.match(falso.llamadas[1].mensaje, /\\\|Ax\\\|\^2/);
  await falso.responder(1, correccion(4.5));
  await hastaEstado(ex.id, 'corregido');
  const e = await leer(ex.id);
  assert.equal(e.correccion.nota, 4.5);
  assert.equal(e.correccion.aprobado, true);
  const n = (await germinacion.leerProgreso(ref.carpetaId, ref.ideaId)).nodos.e1;
  assert.equal(n.estado, 'hecho');
  assert.deepEqual(n.dominio, { dificultad: 'avanzado', nota: 4.5, examen: ex.id });
});

test('suspender no domina el nodo y el registro se conserva', async () => {
  const { motor, falso, ref, hastaEstado, germinacion, examenes } = await preparar();
  const ex = await motor.generar(ref, 'e1', { dificultad: 'avanzado' });
  await falso.responder(0, EXAMEN);
  await hastaEstado(ex.id, 'abierto');
  await motor.entregar(ref, 'e1', ex.id);
  await falso.responder(1, correccion(2));
  await hastaEstado(ex.id, 'corregido');
  assert.notEqual((await germinacion.leerProgreso(ref.carpetaId, ref.ideaId)).nodos.e1?.estado, 'hecho');
  assert.equal((await examenes.listar('ia', ref.ideaId, 'e1')).length, 1);
});

test('no se responde ni se entrega dos veces un examen entregado', async () => {
  const { motor, falso, ref, hastaEstado } = await preparar();
  const ex = await motor.generar(ref, 'e1', { dificultad: 'avanzado' });
  await falso.responder(0, EXAMEN);
  await hastaEstado(ex.id, 'abierto');
  await motor.entregar(ref, 'e1', ex.id);
  await assert.rejects(motor.entregar(ref, 'e1', ex.id), /examen-cerrado/);
  await assert.rejects(motor.responder(ref, 'e1', ex.id, { pregunta: 'p1', texto: 'x' }), /examen-cerrado/);
});

test('al acabar el tiempo de Suficiente se entrega solo', async () => {
  const { motor, falso, ref, hastaEstado, temporizadores, avanzar } = await preparar();
  const ex = await motor.generar(ref, 'e1', { dificultad: 'suficiente' });
  await falso.responder(0, EXAMEN);
  await hastaEstado(ex.id, 'abierto');
  await motor.responder(ref, 'e1', ex.id, { pregunta: 'p1', texto: 'algo' });
  avanzar(LIMITE_SUFICIENTE_MS + 1000);
  await assert.rejects(motor.responder(ref, 'e1', ex.id, { pregunta: 'p2', texto: 'tarde' }), /examen-cerrado|tiempo-agotado/);
  temporizadores.at(-1).fn();
  await hasta(() => falso.llamadas[1]);
  assert.match(falso.llamadas[1].mensaje, /algo/);
  assert.match(falso.llamadas[1].mensaje, /tiempo/i);
});

test('al arrancar, un examen con el tiempo vencido se entrega', async () => {
  const { motor, falso, ref, hastaEstado, avanzar } = await preparar();
  const ex = await motor.generar(ref, 'e1', { dificultad: 'suficiente' });
  await falso.responder(0, EXAMEN);
  await hastaEstado(ex.id, 'abierto');
  avanzar(LIMITE_SUFICIENTE_MS + 1);
  await motor.recuperar();
  await hasta(() => falso.llamadas[1]);
  assert.ok(falso.llamadas[1]);
});

test('si la sesión del examen se perdió, se corrige en una nueva con el examen completo', async () => {
  const { motor, falso, ref, hastaEstado } = await preparar();
  const ex = await motor.generar(ref, 'e1', { dificultad: 'avanzado' });
  await falso.responder(0, EXAMEN);
  await hastaEstado(ex.id, 'abierto');
  await motor.entregar(ref, 'e1', ex.id);
  await falso.responder(1, '', { error: 'No conversation found with session ID: examen-1' });
  await hasta(() => falso.llamadas[2]);
  assert.ok(!falso.llamadas[2].args.includes('--resume'));
  assert.match(falso.llamadas[2].mensaje, /A\^\\top A/);
  await falso.responder(2, correccion(3));
  await hastaEstado(ex.id, 'corregido');
});

test('solo hay un examen abierto por nodo, y no en nodos de incógnita', async () => {
  const { motor, falso, ref, hastaEstado } = await preparar();
  await assert.rejects(motor.generar(ref, 'i1', { dificultad: 'avanzado' }), /nodo-invalido/);
  const ex = await motor.generar(ref, 'e1', { dificultad: 'avanzado' });
  await falso.responder(0, EXAMEN);
  await hastaEstado(ex.id, 'abierto');
  await assert.rejects(motor.generar(ref, 'e1', { dificultad: 'experto' }), /examen-abierto/);
  await assert.rejects(motor.generar(ref, 'e2', { dificultad: 'inventada' }), /dificultad-invalida/);
});
