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
