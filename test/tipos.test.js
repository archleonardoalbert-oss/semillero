import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { crearAlmacenCarpetas } from '../server/store/carpetas.js';
import { crearAjustes } from '../server/store/ajustes.js';
import { TIPOS, tiposParaInterfaz, bloqueBancal } from '../server/engine/tipos.js';
import { promptSistema, promptGerminacion, promptExamen, promptVerificador, promptTaller, parsearExamen } from '../server/engine/prompt.js';
import { cfgTemporal } from './helpers.js';

test('hay exactamente seis tipos, con explicación, criterios y ejemplos', () => {
  assert.deepEqual(Object.keys(TIPOS), ['academico', 'negocio', 'producto', 'creativo', 'aprendizaje', 'otro']);
  for (const t of tiposParaInterfaz()) {
    assert.ok(t.nombre && t.resumen, t.id);
    assert.ok(t.comoJuzga.length >= 3, t.id);
    assert.ok(t.ejemplos.length >= 2, t.id);
    assert.ok(!('analisis' in t), 'la interfaz no recibe las instrucciones internas');
  }
});

test('cada tipo lleva sus criterios a todas las sesiones', () => {
  assert.match(promptSistema('negocio'), /LTV:CAC/);
  assert.match(promptSistema('negocio'), /no había necesidad de mercado/);
  assert.match(promptSistema('aprendizaje'), /OIT/);
  for (const f of ['LinkedIn', 'Indeed', 'EURES', 'Skills for Jobs', 'Por países', 'Por sectores', 'Tabla de fuentes']) assert.ok(promptSistema('aprendizaje').includes(f), f);
  assert.match(promptSistema('producto'), /TRL/);
  assert.match(promptSistema('creativo'), /comp titles/);
  assert.match(promptSistema(), /Investigación académica/);
  assert.match(promptGerminacion('negocio'), /Hipótesis que validar/);
  assert.match(promptVerificador('negocio'), /Validada/);
  assert.match(promptVerificador('negocio'), /lo que la gente \*\*hace\*\*/);
  assert.match(promptTaller('creativo'), /Decisión creativa/);
  assert.match(promptExamen('negocio'), /caso práctico/);
});

test('el bloque del bancal incluye tipo, descripción y contexto', () => {
  const b = bloqueBancal({ nombre: 'Negocios', tipo: 'negocio', descripcion: 'Negocios locales con poco capital' }, { pais: 'Cuba', capital: '2000 USD' });
  assert.match(b, /Negocio o emprendimiento/);
  assert.match(b, /Negocios locales con poco capital/);
  assert.match(b, /Cuba/);
  assert.match(bloqueBancal({ nombre: 'X' }, {}), /no lo ha rellenado/);
});

test('un examen puede ser un caso práctico', () => {
  const e = parsearExamen('```semillero-examen\n{"modo":"caso","preguntas":[{"id":"p1","enunciado":"Entrega tu modelo de costes","puntos":10}]}\n```');
  assert.equal(e.modo, 'caso');
  assert.equal(parsearExamen('```semillero-examen\n{"preguntas":[{"id":"p1","enunciado":"x","puntos":1}]}\n```').modo, 'examen');
});

test('los bancales tienen tipo obligatorio y descripción; los antiguos son académicos', async () => {
  const cfg = await cfgTemporal();
  const carpetas = crearAlmacenCarpetas(cfg);
  await assert.rejects(carpetas.crear({ nombre: 'X', tipo: 'inventado' }), /tipo-invalido/);
  const c = await carpetas.crear({ nombre: 'Negocios', tipo: 'negocio', descripcion: 'Locales' });
  assert.equal((await carpetas.obtener(c.id)).tipo, 'negocio');
  assert.equal((await carpetas.obtener(c.id)).descripcion, 'Locales');
  await fs.writeFile(path.join(cfg.datos, 'carpetas/negocios/carpeta.json'), JSON.stringify({ id: 'negocios', nombre: 'Negocios', orden: 0 }));
  assert.equal((await carpetas.obtener('negocios')).tipo, 'academico');
  await assert.rejects(carpetas.actualizar('negocios', { tipo: 'malo' }), /tipo-invalido/);
});

test('el contexto se guarda saneado en ajustes', async () => {
  const cfg = await cfgTemporal();
  const ajustes = crearAjustes(cfg);
  await ajustes.guardar({ contexto: { pais: 'Cuba', capital: 'poco', raro: 'x', metas: 'y'.repeat(5000) } });
  const a = await ajustes.leer();
  assert.equal(a.contexto.pais, 'Cuba');
  assert.equal(a.contexto.raro, undefined);
  assert.equal(a.contexto.metas.length, 2000);
});

// --- Cada sesión recibe su tipo, la descripción del bancal y el contexto ---
import { crearAlmacenIdeas } from '../server/store/ideas.js';
import { crearAlmacenGerminacion } from '../server/store/germinacion.js';
import { crearAlmacenTalleres } from '../server/store/talleres.js';
import { crearAlmacenExamenes } from '../server/store/examenes.js';
import { crearAlmacenVerificaciones } from '../server/store/verificaciones.js';
import { crearGuard } from '../server/engine/guard.js';
import { crearCola } from '../server/engine/cola.js';
import { crearMotorTaller } from '../server/engine/taller.js';
import { crearMotorExamenes } from '../server/engine/examenes.js';
import { crearMotorVerificacion } from '../server/engine/verificacion.js';
import { MAPA } from './fixtures/mapas.js';

const esperar = (ms = 20) => new Promise((r) => setTimeout(r, ms));
async function hasta(cond, ms = 4000) {
  const t0 = Date.now();
  while (!(await cond())) {
    if (Date.now() - t0 > ms) return;
    await esperar();
  }
}
function falso() {
  const llamadas = [];
  return {
    llamadas,
    ejecutar: (op) => new Promise((resolve) => {
      llamadas.push({ ...op, resolve, mensaje: op.args[op.args.indexOf('-p') + 1], sistema: op.args[op.args.indexOf('--append-system-prompt') + 1] });
      op.alEvento({ type: 'system', subtype: 'init', session_id: 's' });
    }),
  };
}

async function negocio() {
  const cfg = await cfgTemporal();
  const guard = crearGuard(cfg);
  await guard.iniciar();
  const carpetas = crearAlmacenCarpetas(cfg, { proteger: guard.proteger });
  await carpetas.crear({ nombre: 'Negocios', tipo: 'negocio', descripcion: 'Negocios locales con poco capital' });
  const ideas = crearAlmacenIdeas(cfg, { proteger: guard.proteger });
  const idea = await ideas.crear('negocios', { titulo: 'Cafetería', cuerpo: 'Una cafetería de especialidad' });
  const dir = path.join(cfg.datos, 'carpetas/negocios/ideas', idea.id, 'germinacion');
  await fs.mkdir(path.join(dir, 'nodos'), { recursive: true });
  await fs.writeFile(path.join(dir, 'mapa.json'), JSON.stringify(MAPA));
  for (const n of MAPA.nodos) await fs.writeFile(path.join(dir, n.documento), `# ${n.titulo}`);
  await guard.commitear('todo', 'x');
  const ajustes = crearAjustes(cfg, { proteger: guard.proteger });
  await ajustes.guardar({ contexto: { pais: 'Cuba', capital: '2000 USD' } });
  const germinacion = crearAlmacenGerminacion(cfg, { proteger: guard.proteger });
  const f = falso();
  const cola = crearCola({ cfg, ideas, carpetas, ajustes, guard, germinacion, ejecutar: f.ejecutar, notificar: async () => {} });
  const ref = { carpetaId: 'negocios', ideaId: idea.id };
  return { cfg, guard, carpetas, ideas, ajustes, germinacion, cola, f, ref };
}

test('el análisis de una idea de negocio usa sus criterios, la descripción y el contexto', async () => {
  const { cola, f, ref } = await negocio();
  await cola.lanzar([ref]);
  await hasta(() => f.llamadas[0]);
  assert.match(f.llamadas[0].sistema, /Cómo juzgar una idea de negocio/);
  assert.match(f.llamadas[0].mensaje, /Negocios locales con poco capital/);
  assert.match(f.llamadas[0].mensaje, /Cuba/);
});

test('la germinación, el taller, el examen y la verificación también', async () => {
  const x = await negocio();
  await x.ideas.actualizar('negocios', x.ref.ideaId, { estado: 'aceptada', sessionId: 'S' });
  await x.cola.germinar(x.ref, {});
  await hasta(() => x.f.llamadas[0]);
  assert.match(x.f.llamadas[0].sistema, /Hipótesis que validar/);
  assert.match(x.f.llamadas[0].mensaje, /Cuba/);

  const tf = falso();
  const taller = crearMotorTaller({ ...x, talleres: crearAlmacenTalleres(x.cfg, { proteger: x.guard.proteger }), ejecutar: tf.ejecutar });
  const ef = falso();
  const examenes = crearMotorExamenes({ ...x, examenes: crearAlmacenExamenes(x.cfg, { proteger: x.guard.proteger }), ejecutar: ef.ejecutar });
  const vf = falso();
  const verif = crearMotorVerificacion({ ...x, verificaciones: crearAlmacenVerificaciones(x.cfg, { proteger: x.guard.proteger }), ejecutar: vf.ejecutar });
  x.f.llamadas[0].resolve({ codigo: 0, abortado: false, resultado: { is_error: false } });
  await hasta(async () => (await x.ideas.obtener('negocios', x.ref.ideaId)).estado !== 'en-proceso');

  await taller.enviar(x.ref, 'i1', { texto: 'hola' });
  await hasta(() => tf.llamadas[0]);
  assert.match(tf.llamadas[0].sistema, /Hipótesis que validar/);
  assert.match(tf.llamadas[0].mensaje, /Negocios locales/);

  await examenes.generar(x.ref, 'e1', { dificultad: 'suficiente' });
  await hasta(() => ef.llamadas[0]);
  assert.match(ef.llamadas[0].sistema, /caso práctico aplicado a la idea/);
  assert.match(ef.llamadas[0].mensaje, /Cuba/);

  await verif.enviar(x.ref, 'i1', { texto: 'tengo 12 preventas' });
  await hasta(() => vf.llamadas[0]);
  assert.match(vf.llamadas[0].sistema, /Validada/);
  assert.match(vf.llamadas[0].mensaje, /Negocios locales/);
});

test('un caso práctico Suficiente no tiene límite de tiempo', async () => {
  const x = await negocio();
  await x.ideas.actualizar('negocios', x.ref.ideaId, { estado: 'aceptada', trabajo: 'germinacion' });
  const ef = falso();
  const almacen = crearAlmacenExamenes(x.cfg, { proteger: x.guard.proteger });
  const examenes = crearMotorExamenes({ ...x, examenes: almacen, ejecutar: ef.ejecutar, temporizar: () => {} });
  const e = await examenes.generar(x.ref, 'e1', { dificultad: 'suficiente' });
  await hasta(() => ef.llamadas[0]);
  ef.llamadas[0].resolve({ codigo: 0, abortado: false, resultado: { is_error: false, result: '```semillero-examen\n{"modo":"caso","preguntas":[{"id":"p1","enunciado":"Tu modelo de costes","puntos":10}]}\n```' } });
  await hasta(async () => (await almacen.leer('negocios', x.ref.ideaId, 'e1', e.id)).estado === 'abierto');
  const ex = await almacen.leer('negocios', x.ref.ideaId, 'e1', e.id);
  assert.equal(ex.modo, 'caso');
  assert.equal(ex.limite, null);
});
