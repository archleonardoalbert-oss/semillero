import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { crearAlmacenCarpetas } from '../server/store/carpetas.js';
import { crearAlmacenIdeas } from '../server/store/ideas.js';
import { crearAlmacenGerminacion } from '../server/store/germinacion.js';
import { crearAlmacenVerificaciones } from '../server/store/verificaciones.js';
import { crearAjustes } from '../server/store/ajustes.js';
import { crearGuard } from '../server/engine/guard.js';
import { crearCola } from '../server/engine/cola.js';
import { crearMotorVerificacion } from '../server/engine/verificacion.js';
import { parsearVeredictoVerificacion } from '../server/engine/prompt.js';
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

function crearFalso() {
  const llamadas = [];
  const ejecutar = (op) =>
    new Promise((resolve) => {
      llamadas.push({ ...op, resolve, mensaje: op.args[op.args.indexOf('-p') + 1], sistema: op.args[op.args.indexOf('--append-system-prompt') + 1] });
      op.alEvento({ type: 'system', subtype: 'init', session_id: `verif-${llamadas.length}` });
    });
  async function responder(n, texto, { escribir = {} } = {}) {
    await hasta(() => llamadas[n]);
    const l = llamadas[n];
    for (const [rel, c] of Object.entries(escribir)) {
      await fs.mkdir(path.dirname(path.join(l.cwd, rel)), { recursive: true });
      await fs.writeFile(path.join(l.cwd, rel), c);
    }
    l.resolve({ codigo: 0, abortado: false, resultado: { is_error: false, result: texto } });
  }
  return { ejecutar, llamadas, responder };
}

const veredicto = (resuelto, resumen = 'r') => `Informe.\n\n\`\`\`semillero-veredicto\n${JSON.stringify({ resuelto, resumen })}\n\`\`\``;

async function preparar() {
  const cfg = await cfgTemporal();
  const guard = crearGuard(cfg);
  await guard.iniciar();
  const carpetas = crearAlmacenCarpetas(cfg, { proteger: guard.proteger });
  await carpetas.crear({ nombre: 'IA' });
  const ideas = crearAlmacenIdeas(cfg, { proteger: guard.proteger });
  const idea = await ideas.crear('ia', { titulo: 'Memoria FFN', cuerpo: 'x' });
  const rutaIdea = `carpetas/ia/ideas/${idea.id}`;
  const dir = path.join(cfg.datos, rutaIdea, 'germinacion');
  await fs.mkdir(path.join(dir, 'nodos'), { recursive: true });
  await fs.writeFile(path.join(dir, 'mapa.json'), JSON.stringify(MAPA));
  for (const n of MAPA.nodos) await fs.writeFile(path.join(dir, n.documento), `# ${n.titulo}`);
  await guard.commitear('todo', 'mapa');
  await ideas.actualizar('ia', idea.id, { estado: 'aceptada', trabajo: 'germinacion', sessionId: 'G' });
  const ajustes = crearAjustes(cfg);
  const germinacion = crearAlmacenGerminacion(cfg, { proteger: guard.proteger });
  const colaFalso = crearFalso();
  const cola = crearCola({ cfg, ideas, carpetas, ajustes, guard, germinacion, ejecutar: colaFalso.ejecutar, notificar: async () => {} });
  const verificaciones = crearAlmacenVerificaciones(cfg, { proteger: guard.proteger });
  const falso = crearFalso();
  const motor = crearMotorVerificacion({ cfg, ideas, verificaciones, germinacion, guard, cola, ajustes, ejecutar: falso.ejecutar });
  const ref = { carpetaId: 'ia', ideaId: idea.id };
  const fin = (id) => hasta(async () => (await verificaciones.leer('ia', idea.id, 'i1', id)).estado !== 'revisando');
  return { cfg, motor, verificaciones, germinacion, falso, cola, ref, rutaIdea, fin, ideas };
}

test('parsearVeredictoVerificacion', () => {
  assert.deepEqual(parsearVeredictoVerificacion(veredicto(true, 'Demostrado')).veredicto, { resuelto: true, resumen: 'Demostrado' });
  assert.equal(parsearVeredictoVerificacion('sin bloque').veredicto, null);
  assert.equal(parsearVeredictoVerificacion(veredicto(false)).informe, 'Informe.');
});

test('el verificador es una sesión nueva, rigurosa, que lee el enunciado, el taller y los adjuntos', async () => {
  const { motor, falso, ref, verificaciones } = await preparar();
  const adj = await verificaciones.guardarAdjunto('ia', ref.ideaId, 'i1', 'demo.pdf', Buffer.from('%PDF'));
  await motor.enviar(ref, 'i1', { texto: 'Demuestro que el hecho vive en la capa 7.', adjuntos: [adj] });
  await hasta(() => falso.llamadas[0]);
  const { args, mensaje, sistema } = falso.llamadas[0];
  assert.ok(!args.includes('--resume'));
  assert.equal(args[args.indexOf('--model') + 1], 'opus');
  assert.match(sistema, /rigor/i);
  assert.match(mensaje, /germinacion\/nodos\/i1\.md/);
  assert.match(mensaje, /talleres\/i1/);
  assert.match(mensaje, /capa 7/);
  assert.match(mensaje, /demo\.pdf/);
});

test('un rechazo guarda la explicación y no marca nada', async () => {
  const { motor, falso, ref, fin, verificaciones, germinacion } = await preparar();
  const v = await motor.enviar(ref, 'i1', { texto: 'Creo que sí.' });
  await falso.responder(0, '## Por qué no\n\nFalta el caso general.\n\n## Siguientes pasos\n\nAcótalo.\n\n```semillero-veredicto\n{"resuelto": false, "resumen": "No es concluyente"}\n```');
  await fin(v.id);
  const r = await verificaciones.leer('ia', ref.ideaId, 'i1', v.id);
  assert.equal(r.estado, 'rechazada');
  assert.match(r.informe, /Siguientes pasos/);
  assert.notEqual((await germinacion.leerProgreso(ref.carpetaId, ref.ideaId)).nodos.i1?.estado, 'resuelta');
});

test('una aceptación marca resuelta, guarda las implicaciones y hace crecer el árbol', async () => {
  const { cfg, motor, falso, ref, rutaIdea, fin, verificaciones, germinacion } = await preparar();
  const v = await motor.enviar(ref, 'i1', { texto: 'Demostración completa.' });
  await hasta(() => falso.llamadas[0]);
  const base = `${rutaIdea}/germinacion`;
  const ampliacion = {
    nodos: [{ id: 'i8', tipo: 'incognita', titulo: '¿Generaliza a otras capas?', resumen: 'nuevo', documento: 'nodos/i8.md', depende: ['i1'], recursos: [], abierto: true }],
    recursos: [],
  };
  await falso.responder(0, '## Qué implica\n\nMucho.\n\n```semillero-veredicto\n{"resuelto": true, "resumen": "Resuelto"}\n```', {
    escribir: { [`${base}/verificaciones/i1/${v.id}/ampliacion.json`]: JSON.stringify(ampliacion), [`${base}/nodos/i8.md`]: '## Cómo se llegó a este problema\n\nDe i1.' },
  });
  await fin(v.id);
  const r = await verificaciones.leer('ia', ref.ideaId, 'i1', v.id);
  assert.equal(r.estado, 'aceptada');
  assert.deepEqual(r.nodosNuevos, ['i8']);
  const n = (await germinacion.leerProgreso(ref.carpetaId, ref.ideaId)).nodos.i1;
  assert.equal(n.estado, 'resuelta');
  assert.equal(n.verificacion, v.id);
  const mapa = JSON.parse(await fs.readFile(path.join(cfg.datos, base, 'mapa.json'), 'utf8'));
  assert.ok(mapa.nodos.some((x) => x.id === 'i8'));
  assert.equal(mapa.nodos.length, MAPA.nodos.length + 1);
});

test('una ampliación inválida no toca el mapa, pero la resolución vale', async () => {
  const { cfg, motor, falso, ref, rutaIdea, fin, verificaciones, germinacion } = await preparar();
  const v = await motor.enviar(ref, 'i1', { texto: 'x' });
  await hasta(() => falso.llamadas[0]);
  const base = `${rutaIdea}/germinacion`;
  await falso.responder(0, veredicto(true), {
    escribir: { [`${base}/verificaciones/i1/${v.id}/ampliacion.json`]: JSON.stringify({ nodos: [{ id: 'e1', tipo: 'incognita', titulo: 'repetido', documento: 'nodos/e1.md', depende: ['zz'] }] }) },
  });
  await fin(v.id);
  const r = await verificaciones.leer('ia', ref.ideaId, 'i1', v.id);
  assert.equal(r.estado, 'aceptada');
  assert.match(r.aviso, /ampliación/i);
  assert.equal(JSON.parse(await fs.readFile(path.join(cfg.datos, base, 'mapa.json'), 'utf8')).nodos.length, MAPA.nodos.length);
  assert.equal((await germinacion.leerProgreso(ref.carpetaId, ref.ideaId)).nodos.i1.estado, 'resuelta');
});

test('el verificador no puede reescribir enunciados existentes ni otros archivos', async () => {
  const { cfg, motor, falso, ref, rutaIdea, fin } = await preparar();
  const v = await motor.enviar(ref, 'i1', { texto: 'x' });
  await hasta(() => falso.llamadas[0]);
  await falso.responder(0, veredicto(false), {
    escribir: { [`${rutaIdea}/germinacion/nodos/e1.md`]: 'pisado', [`${rutaIdea}/hilo/001-usuario.md`]: 'pisado' },
  });
  await fin(v.id);
  assert.equal(await fs.readFile(path.join(cfg.datos, rutaIdea, 'germinacion/nodos/e1.md'), 'utf8'), '# Álgebra lineal');
  assert.equal(await fs.readFile(path.join(cfg.datos, rutaIdea, 'hilo/001-usuario.md'), 'utf8'), 'x');
});

test('no se germina mientras se verifica; no se verifica dos veces a la vez ni lo ya resuelto', async () => {
  const { motor, falso, ref, fin, cola, germinacion } = await preparar();
  const v = await motor.enviar(ref, 'i1', { texto: 'x' });
  await hasta(() => falso.llamadas[0]);
  await assert.rejects(cola.germinar(ref, {}), /en-proceso/);
  await assert.rejects(motor.enviar(ref, 'i1', { texto: 'y' }), /en-proceso/);
  await falso.responder(0, veredicto(true));
  await fin(v.id);
  await assert.rejects(motor.enviar(ref, 'i1', { texto: 'z' }), /ya-resuelta/);
  await assert.rejects(motor.enviar(ref, 'e1', { texto: 'z' }), /nodo-invalido/);
  assert.equal((await germinacion.leerProgreso(ref.carpetaId, ref.ideaId)).nodos.i1.estado, 'resuelta');
});

test('el verificador no revierte la enmienda que una glosa hace a la vez en otro enunciado', async () => {
  const { cfg, motor, falso, ref, rutaIdea, fin, cola } = await preparar();
  const doc = `${rutaIdea}/germinacion/nodos/e2.md`;
  cola.registrarEscritor(() => [doc]);
  const v = await motor.enviar(ref, 'i1', { texto: 'x' });
  await hasta(() => falso.llamadas[0]);
  await fs.writeFile(path.join(cfg.datos, doc), 'enmienda de la glosa');
  await falso.responder(0, veredicto(false));
  await fin(v.id);
  assert.equal(await fs.readFile(path.join(cfg.datos, doc), 'utf8'), 'enmienda de la glosa');
});
