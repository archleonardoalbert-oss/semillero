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
