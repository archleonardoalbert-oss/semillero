import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { crearAlmacenCarpetas } from '../server/store/carpetas.js';
import { crearAlmacenIdeas } from '../server/store/ideas.js';
import { cfgTemporal } from './helpers.js';

const CAMINOS = [
  { id: 'jacobiano', tipo: 'variacion', titulo: 'Usar el jacobiano ajustado', descripcion: 'Con el modelo de Creamer.' },
  { id: 'datos-mosca', tipo: 'variacion', titulo: 'Pasar a FlyWire', descripcion: 'Escala.' },
  { id: 'no-normal', tipo: 'idea-nueva', titulo: 'No normalidad del conectoma', descripcion: 'Medir qué neuronas generan la no normalidad.' },
];
const DICTAMEN = `---\nveredicto: no-recomendada\netapa: 2\nresumen: Pobre\netiqueta: Resultados pobres\n---\n\nTexto\n\n\`\`\`semillero-caminos\n${JSON.stringify(CAMINOS)}\n\`\`\`\n`;

async function preparar() {
  const cfg = await cfgTemporal();
  await crearAlmacenCarpetas(cfg).crear({ nombre: 'Neuro' });
  const ideas = crearAlmacenIdeas(cfg);
  const idea = await ideas.crear('neuro', { titulo: 'Ablación espectral', cuerpo: 'Mi idea' });
  await fs.writeFile(path.join(cfg.datos, 'carpetas/neuro/ideas', idea.id, 'hilo/002-claude.md'), DICTAMEN);
  await ideas.actualizar('neuro', idea.id, { estado: 'no-recomendada', veredicto: 'no-recomendada' });
  const elegir = (camino, comentario) => ideas.elegirCamino('neuro', idea.id, { dictamen: '002-claude.md', camino, comentario });
  const obtener = () => ideas.obtener('neuro', idea.id);
  return { cfg, ideas, idea, elegir, obtener };
}

test('los caminos del dictamen llegan con el hilo', async () => {
  const { obtener } = await preparar();
  assert.equal((await obtener()).hilo[1].caminos.length, 3);
});

test('elegir una variación crea la réplica pendiente y fija la elección', async () => {
  const { elegir, obtener } = await preparar();
  await elegir('jacobiano', 'Centrado en la cabeza');
  const idea = await obtener();
  assert.equal(idea.estado, 'replica-pendiente');
  assert.deepEqual(idea.eleccion, { dictamen: '002-claude.md', camino: 'jacobiano' });
  const replica = idea.hilo.at(-1);
  assert.equal(replica.autor, 'usuario');
  assert.match(replica.contenido, /Usar el jacobiano ajustado/);
  assert.match(replica.contenido, /Centrado en la cabeza/);
});

test('volver a elegir la misma variación la desmarca y restaura el veredicto', async () => {
  const { elegir, obtener } = await preparar();
  await elegir('jacobiano');
  await elegir('jacobiano');
  const idea = await obtener();
  assert.equal(idea.estado, 'no-recomendada');
  assert.equal(idea.eleccion, null);
  assert.equal(idea.hilo.length, 2);
});

test('otra variación sustituye a la anterior', async () => {
  const { elegir, obtener } = await preparar();
  await elegir('jacobiano');
  await elegir('datos-mosca');
  const idea = await obtener();
  assert.equal(idea.eleccion.camino, 'datos-mosca');
  assert.equal(idea.hilo.length, 3);
  assert.ok(!idea.hilo.at(-1).contenido.includes('jacobiano'));
});

test('al desmarcar se conserva lo que el usuario escribió en la réplica', async () => {
  const { elegir, obtener, ideas, idea } = await preparar();
  await elegir('jacobiano');
  await ideas.responder('neuro', idea.id, 'Y además quiero comparar con Yan.');
  await elegir('jacobiano');
  const final = await obtener();
  assert.equal(final.estado, 'replica-pendiente');
  assert.equal(final.hilo.at(-1).contenido.trim(), 'Y además quiero comparar con Yan.');
});

test('una idea nueva se crea con su origen y queda enlazada', async () => {
  const { elegir, obtener, ideas, idea } = await preparar();
  await elegir('no-normal', 'Mirando el conectoma con signo');
  const original = await obtener();
  assert.equal(original.estado, 'no-recomendada');
  assert.equal(original.derivadas.length, 1);
  const nueva = await ideas.obtener('neuro', original.derivadas[0].ideaId);
  assert.equal(nueva.titulo, 'No normalidad del conectoma');
  assert.equal(nueva.estado, 'borrador');
  assert.deepEqual(nueva.origen, { carpetaId: 'neuro', ideaId: idea.id, camino: 'no-normal' });
  assert.match(nueva.hilo[0].contenido, /Mirando el conectoma con signo/);
  assert.match(nueva.hilo[0].contenido, new RegExp(`carpetas/neuro/ideas/${idea.id}`));
});

test('desmarcar una idea nueva la borra si sigue en borrador, pero no si ya se analizó', async () => {
  const { elegir, obtener, ideas } = await preparar();
  await elegir('no-normal');
  const id = (await obtener()).derivadas[0].ideaId;
  await elegir('no-normal');
  await assert.rejects(ideas.obtener('neuro', id), /idea-no-existe/);
  assert.deepEqual((await obtener()).derivadas, []);
  await elegir('no-normal');
  const id2 = (await obtener()).derivadas[0].ideaId;
  await ideas.actualizar('neuro', id2, { estado: 'aceptada' });
  await assert.rejects(elegir('no-normal'), /ya-analizada/);
});

test('no se elige con la idea en proceso ni un camino que no existe', async () => {
  const { elegir, ideas, idea } = await preparar();
  await assert.rejects(elegir('inventado'), /camino-invalido/);
  await ideas.actualizar('neuro', idea.id, { estado: 'en-proceso' });
  await assert.rejects(elegir('jacobiano'), /en-proceso/);
});
