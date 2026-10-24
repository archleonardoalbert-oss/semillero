import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { crearAlmacenCarpetas } from '../server/store/carpetas.js';
import { crearAlmacenIdeas } from '../server/store/ideas.js';
import { crearAlmacenGerminacion } from '../server/store/germinacion.js';
import { crearAlmacenTalleres } from '../server/store/talleres.js';
import { crearAjustes } from '../server/store/ajustes.js';
import { crearGuard } from '../server/engine/guard.js';
import { crearCola } from '../server/engine/cola.js';
import { crearMotorTaller } from '../server/engine/taller.js';
import { parsearRespuestaTaller } from '../server/engine/prompt.js';
import { MAPA, copia } from './fixtures/mapas.js';
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
      op.alEvento({ type: 'system', subtype: 'init', session_id: `taller-${llamadas.length}` });
    });
  async function responder(n, texto, { escribir = {}, error } = {}) {
    await hasta(() => llamadas[n]);
    const l = llamadas[n];
    for (const [rel, contenido] of Object.entries(escribir)) {
      await fs.mkdir(path.dirname(path.join(l.cwd, rel)), { recursive: true });
      await fs.writeFile(path.join(l.cwd, rel), contenido);
    }
    if (error) l.resolve({ codigo: 1, abortado: false, stderr: error });
    else l.resolve({ codigo: 0, abortado: false, resultado: { is_error: false, result: texto } });
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
  const otra = await ideas.crear('ia', { titulo: 'Superposición', cuerpo: 'y' });
  const rutaIdea = `carpetas/ia/ideas/${idea.id}`;
  for (const [id, mapa] of [[idea.id, MAPA], [otra.id, { ...copia(MAPA), nodos: [{ ...MAPA.nodos[2], id: 'i9', titulo: 'Superposición de hechos', depende: [] }] }]]) {
    const dir = path.join(cfg.datos, 'carpetas/ia/ideas', id, 'germinacion');
    await fs.mkdir(path.join(dir, 'nodos'), { recursive: true });
    await fs.writeFile(path.join(dir, 'mapa.json'), JSON.stringify({ ...mapa, recursos: MAPA.recursos }));
    for (const n of mapa.nodos) await fs.writeFile(path.join(dir, n.documento), `## El problema\n\n${n.titulo}\n`);
  }
  await guard.commitear('todo', 'mapas');
  await ideas.actualizar('ia', idea.id, { estado: 'aceptada', trabajo: 'germinacion', sessionId: 'GERM' });
  const ajustes = crearAjustes(cfg);
  const germinacion = crearAlmacenGerminacion(cfg, { proteger: guard.proteger });
  const colaFalso = crearFalso();
  const cola = crearCola({ cfg, ideas, carpetas, ajustes, guard, germinacion, ejecutar: colaFalso.ejecutar, notificar: async () => {} });
  const talleres = crearAlmacenTalleres(cfg, { proteger: guard.proteger });
  const falso = crearFalso();
  const motor = crearMotorTaller({ cfg, ideas, talleres, germinacion, guard, cola, ajustes, ejecutar: falso.ejecutar });
  const ref = { carpetaId: 'ia', ideaId: idea.id };
  const leer = () => talleres.leer('ia', idea.id, 'i1');
  const libre = () => hasta(async () => (await leer()).estado !== 'en-proceso');
  return { cfg, ideas, motor, talleres, falso, colaFalso, cola, ref, rutaIdea, leer, libre, otra, guard };
}

test('parsearRespuestaTaller extrae propuesta y conexiones', () => {
  const r = parsearRespuestaTaller('Vas bien.\n\n```semillero-propuesta\n{"resumen": "Se acota a la cabeza"}\n```\n\n```semillero-conexiones\n[{"carpetaId":"ia","ideaId":"x","nodo":"i9","relacion":"Mismo mecanismo"}]\n```\n');
  assert.equal(r.cuerpo, 'Vas bien.');
  assert.equal(r.propuesta.resumen, 'Se acota a la cabeza');
  assert.equal(r.conexiones[0].nodo, 'i9');
  const mal = parsearRespuestaTaller('Hola\n```semillero-conexiones\nno json\n```');
  assert.deepEqual(mal.conexiones, []);
  assert.equal(mal.propuesta, null);
});

test('el primer mensaje empieza una sesión nueva con el resumen de contexto y el índice global', async () => {
  const { motor, falso, ref, libre, leer, otra } = await preparar();
  await motor.enviar(ref, 'i1', { texto: 'Obtuve ρ = 0,83 al quitar AVA.' });
  await hasta(() => falso.llamadas[0]);
  const { args, mensaje, sistema } = falso.llamadas[0];
  assert.ok(!args.includes('--resume'));
  assert.equal(args[args.indexOf('--model') + 1], 'opus');
  assert.match(sistema, /taller/i);
  assert.match(mensaje, /¿Dónde vive un hecho\?/);
  assert.match(mensaje, /germinacion\/nodos\/i1\.md/);
  assert.match(mensaje, /Transformers/); // su dependencia
  assert.match(mensaje, new RegExp(`${otra.id}.*i9.*Superposición de hechos`));
  assert.match(mensaje, /ρ = 0,83/);
  await falso.responder(0, 'Eso es relevante porque…');
  await libre();
  const t = await leer();
  assert.equal(t.sessionId, 'taller-1');
  assert.equal(t.mensajes.at(-1).contenido, 'Eso es relevante porque…');
});

test('el segundo mensaje retoma la sesión del taller', async () => {
  const { motor, falso, ref, libre } = await preparar();
  await motor.enviar(ref, 'i1', { texto: 'uno' });
  await falso.responder(0, 'a');
  await libre();
  await motor.enviar(ref, 'i1', { texto: 'dos' });
  await hasta(() => falso.llamadas[1]);
  const a = falso.llamadas[1].args;
  assert.equal(a[a.indexOf('--resume') + 1], 'taller-1');
  assert.ok(!/Índice de incógnitas/.test(falso.llamadas[1].mensaje));
});

test('una propuesta se detecta, se aplica archivando la versión y se puede descartar', async () => {
  const { cfg, motor, falso, ref, rutaIdea, libre, leer, talleres } = await preparar();
  const propuesta = `${rutaIdea}/germinacion/talleres/i1/propuesta.md`;
  await motor.enviar(ref, 'i1', { texto: 'He visto que solo pasa en la cabeza.' });
  await falso.responder(0, 'Propongo acotarlo.\n```semillero-propuesta\n{"resumen":"Acotar a la cabeza"}\n```', { escribir: { [propuesta]: '## El problema\n\nAcotado.\n' } });
  await libre();
  assert.equal((await leer()).propuesta.resumen, 'Acotar a la cabeza');
  await motor.aplicar(ref, 'i1');
  const doc = path.join(cfg.datos, rutaIdea, 'germinacion/nodos/i1.md');
  assert.equal(await fs.readFile(doc, 'utf8'), '## El problema\n\nAcotado.\n');
  const t = await leer();
  assert.equal(t.propuesta, null);
  assert.equal(t.versiones.length, 1);
  assert.match(await fs.readFile(path.join(cfg.datos, rutaIdea, 'germinacion/talleres/i1/versiones/001.md'), 'utf8'), /¿Dónde vive un hecho\?/);
  await talleres.restaurar('ia', ref.ideaId, 'i1', 1);
  assert.match(await fs.readFile(doc, 'utf8'), /¿Dónde vive un hecho\?/);
  await motor.enviar(ref, 'i1', { texto: 'otra' });
  await falso.responder(1, 'Otra.\n```semillero-propuesta\n{"resumen":"x"}\n```', { escribir: { [propuesta]: 'Otra versión' } });
  await libre();
  await motor.descartar(ref, 'i1');
  assert.equal((await leer()).propuesta, null);
  await assert.rejects(fs.access(path.join(cfg.datos, propuesta)));
});

test('las conexiones válidas se guardan, las inválidas no, y el destino las ve como entrantes', async () => {
  const { motor, falso, ref, libre, leer, talleres, otra } = await preparar();
  await motor.enviar(ref, 'i1', { texto: 'x' });
  const bloque = JSON.stringify([
    { carpetaId: 'ia', ideaId: otra.id, nodo: 'i9', relacion: 'Misma superposición' },
    { carpetaId: 'ia', ideaId: 'no-existe', nodo: 'i1', relacion: 'x' },
    { carpetaId: 'ia', ideaId: otra.id, nodo: 'zz', relacion: 'x' },
  ]);
  await falso.responder(0, `Conecta con otra idea.\n\`\`\`semillero-conexiones\n${bloque}\n\`\`\``);
  await libre();
  const t = await leer();
  assert.equal(t.conexiones.length, 1);
  assert.equal(t.mensajes.at(-1).contenido, 'Conecta con otra idea.');
  const entrantes = await talleres.conexionesEntrantes('ia', otra.id, 'i9');
  assert.equal(entrantes[0].desde.nodo, 'i1');
  assert.equal(entrantes[0].relacion, 'Misma superposición');
});

test('la sesión del taller no puede escribir fuera de lo permitido', async () => {
  const { cfg, motor, falso, ref, rutaIdea, libre } = await preparar();
  await motor.enviar(ref, 'i1', { texto: 'x' });
  await falso.responder(0, 'Hecho', { escribir: { [`${rutaIdea}/germinacion/nodos/i1.md`]: 'pisado', [`${rutaIdea}/figuras/talleres/i1/f.png`]: 'png' } });
  await libre();
  assert.match(await fs.readFile(path.join(cfg.datos, rutaIdea, 'germinacion/nodos/i1.md'), 'utf8'), /¿Dónde vive/);
  assert.equal(await fs.readFile(path.join(cfg.datos, rutaIdea, 'figuras/talleres/i1/f.png'), 'utf8'), 'png');
});

test('adjuntos: extensión válida se guarda y llega a la sesión; inválida se rechaza', async () => {
  const { motor, falso, ref, talleres } = await preparar();
  const ruta = await talleres.guardarAdjunto('ia', ref.ideaId, 'i1', 'resultados ρ.csv', Buffer.from('a,b'));
  assert.match(ruta, /^germinacion\/talleres\/i1\/adjuntos\/resultados.*\.csv$/);
  await assert.rejects(talleres.guardarAdjunto('ia', ref.ideaId, 'i1', 'x.sh', Buffer.from('rm')), /extension-invalida/);
  await motor.enviar(ref, 'i1', { texto: 'mira', adjuntos: [ruta] });
  await hasta(() => falso.llamadas[0]);
  assert.match(falso.llamadas[0].mensaje, new RegExp(ruta.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('no se envía con la idea en proceso, ni a un nodo de estudio, ni dos a la vez', async () => {
  const { motor, ref, ideas } = await preparar();
  await assert.rejects(motor.enviar(ref, 'e1', { texto: 'x' }), /nodo-invalido/);
  await motor.enviar(ref, 'i1', { texto: 'x' });
  await assert.rejects(motor.enviar(ref, 'i1', { texto: 'y' }), /en-proceso/);
  await ideas.actualizar('ia', ref.ideaId, { estado: 'en-proceso' });
  await assert.rejects(motor.enviar(ref, 'i3', { texto: 'x' }), /en-proceso|nodo-invalido/);
});

test('aplicar con la idea en proceso da en-proceso', async () => {
  const { motor, falso, ref, rutaIdea, libre, ideas } = await preparar();
  await motor.enviar(ref, 'i1', { texto: 'x' });
  await falso.responder(0, 'P\n```semillero-propuesta\n{"resumen":"r"}\n```', { escribir: { [`${rutaIdea}/germinacion/talleres/i1/propuesta.md`]: 'nuevo' } });
  await libre();
  await ideas.actualizar('ia', ref.ideaId, { estado: 'en-proceso' });
  await assert.rejects(motor.aplicar(ref, 'i1'), /en-proceso/);
});

test('si la sesión del taller se perdió, se empieza otra con el contexto y el historial', async () => {
  const { motor, falso, ref, libre, leer } = await preparar();
  await motor.enviar(ref, 'i1', { texto: 'uno' });
  await falso.responder(0, 'respuesta uno');
  await libre();
  await motor.enviar(ref, 'i1', { texto: 'dos' });
  await falso.responder(1, '', { error: 'No conversation found with session ID: taller-1' });
  await hasta(() => falso.llamadas[2]);
  assert.ok(!falso.llamadas[2].args.includes('--resume'));
  assert.match(falso.llamadas[2].mensaje, /respuesta uno/);
  await falso.responder(2, 'retomado');
  await libre();
  assert.equal((await leer()).mensajes.at(-1).contenido, 'retomado');
});

test('la germinación no revierte la propuesta que escribe un taller activo', async () => {
  const { cfg, motor, falso, colaFalso, cola, ref, rutaIdea, ideas } = await preparar();
  await motor.enviar(ref, 'i1', { texto: 'x' });
  await hasta(() => falso.llamadas[0]);
  const propuesta = path.join(cfg.datos, rutaIdea, 'germinacion/talleres/i1/propuesta.md');
  await fs.mkdir(path.dirname(propuesta), { recursive: true });
  await fs.writeFile(propuesta, 'a medias');
  await cola.germinar(ref, {});
  await hasta(() => colaFalso.llamadas[0]);
  colaFalso.llamadas[0].resolve({ codigo: 0, abortado: false, resultado: { is_error: false } });
  await hasta(async () => (await ideas.obtener('ia', ref.ideaId)).estado !== 'en-proceso');
  assert.equal(await fs.readFile(propuesta, 'utf8'), 'a medias');
});

// --- Revisión final ---

test('I1: no se aplica una propuesta mientras una corrección enmienda ese enunciado', async () => {
  const { motor, falso, ref, rutaIdea, libre, cola } = await preparar();
  await motor.enviar(ref, 'i1', { texto: 'x' });
  await falso.responder(0, 'P\n```semillero-propuesta\n{"resumen":"r"}\n```', { escribir: { [`${rutaIdea}/germinacion/talleres/i1/propuesta.md`]: 'nuevo' } });
  await libre();
  cola.registrarEscritor(() => [`${rutaIdea}/germinacion/nodos/i1.md`]);
  await assert.rejects(motor.aplicar(ref, 'i1'), /en-proceso/);
});

test('I2: un mapa con un documento manipulado no permite escribir fuera de nodos/', async () => {
  const { cfg, motor, falso, ref, rutaIdea, libre } = await preparar();
  await motor.enviar(ref, 'i1', { texto: 'x' });
  await falso.responder(0, 'P\n```semillero-propuesta\n{"resumen":"r"}\n```', { escribir: { [`${rutaIdea}/germinacion/talleres/i1/propuesta.md`]: 'nuevo' } });
  await libre();
  const ruta = path.join(cfg.datos, rutaIdea, 'germinacion/mapa.json');
  const m = JSON.parse(await fs.readFile(ruta, 'utf8'));
  m.nodos[2].documento = '../../../../../fuera.md';
  await fs.writeFile(ruta, JSON.stringify(m));
  await motor.aplicar(ref, 'i1');
  await assert.rejects(fs.access(path.join(cfg.datos, '../fuera.md')));
  assert.equal(await fs.readFile(path.join(cfg.datos, rutaIdea, 'germinacion/nodos/i1.md'), 'utf8'), 'nuevo');
});

test('menor: la versión archivada se etiqueta como lo que era antes de aplicar', async () => {
  const { motor, falso, ref, rutaIdea, libre, leer } = await preparar();
  await motor.enviar(ref, 'i1', { texto: 'x' });
  await falso.responder(0, 'P\n```semillero-propuesta\n{"resumen":"Acotar a la cabeza"}\n```', { escribir: { [`${rutaIdea}/germinacion/talleres/i1/propuesta.md`]: 'nuevo' } });
  await libre();
  await motor.aplicar(ref, 'i1');
  assert.match((await leer()).versiones[0].resumen, /^Antes de: Acotar a la cabeza/);
});

test('menor: recuperar desbloquea talleres cortados aunque el mapa no esté o no tenga el nodo', async () => {
  const { cfg, motor, talleres, ref, rutaIdea, leer } = await preparar();
  await talleres.actualizar('ia', ref.ideaId, 'i1', { estado: 'en-proceso' });
  await fs.writeFile(path.join(cfg.datos, rutaIdea, 'germinacion/mapa.json'), '{"a medias');
  await motor.recuperar();
  assert.equal((await leer()).estado, 'error');
});

test('menor: una conexión solo vale hacia una incógnita', async () => {
  const { motor, falso, ref, libre, leer, otra } = await preparar();
  await motor.enviar(ref, 'i1', { texto: 'x' });
  await falso.responder(0, `C\n\`\`\`semillero-conexiones\n${JSON.stringify([{ carpetaId: 'ia', ideaId: otra.id, nodo: 'e1', relacion: 'x' }])}\n\`\`\``);
  await libre();
  assert.deepEqual((await leer()).conexiones, []);
});

test('menor: el taller usa siempre Opus', async () => {
  const { motor, falso, ref, cfg } = await preparar();
  await fs.writeFile(path.join(cfg.datos, 'estado.json'), JSON.stringify({ modelo: 'sonnet' }));
  await motor.enviar(ref, 'i1', { texto: 'x' });
  await hasta(() => falso.llamadas[0]);
  const a = falso.llamadas[0].args;
  assert.equal(a[a.indexOf('--model') + 1], 'opus');
});
