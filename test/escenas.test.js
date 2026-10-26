// El comprobador de escenas: ejecuta cada escena de un curso en Node, aislada, antes de aceptarla.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { probarEscena } from '../server/escenas/probar.js';

async function escena(codigo) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'semillero-escena-'));
  const ruta = path.join(dir, 'e.js');
  await fs.writeFile(ruta, codigo);
  return ruta;
}

const BUENA = `export default (S) => {
  const P = S.plano({ x: 60, y: 30, w: 620, h: 330 }, { t: [-1, 5], y: [-2, 2] });
  return S.definirEscena({
    alto: 400,
    entradas: [{ id: 'k', tipo: 'deslizador', etiqueta: 'k', valor: 1, min: 0, max: 3, paso: 0.1 }],
    pasos: 3,
    leyenda: { cian: 'sen(kt)' },
    dibujar(g, c, { paso, p }) {
      S.ejes(g, P);
      if (paso >= 1) S.grafica(g, P, (t) => Math.sin(c.e.k * t), { p: paso === 1 ? p : 1 });
      if (paso >= 2) g.tex('f', 400, 30, 'y = \\\\sin(kt)', { alfa: S.ease(p) });
      g.ctx.beginPath(); g.ctx.arc(10, 10, 4, 0, 6.28); g.ctx.fill();
    },
    asas: (c) => [{ id: 'k', x: P.X(1), y: P.Y(0), mover: (x) => ({ k: P.T(x) }) }],
  });
};`;

test('una escena bien hecha pasa y dice cuántos pasos tiene', async () => {
  const r = await probarEscena(await escena(BUENA));
  assert.equal(r.ok, true, r.errores?.join('\n'));
  assert.equal(r.pasos, 3);
});

test('una excepción en un paso se informa con el paso', async () => {
  const r = await probarEscena(await escena(BUENA.replace("if (paso >= 2) g.tex", "if (paso >= 2) null.x; if (paso >= 2) g.tex")));
  assert.equal(r.ok, false);
  assert.match(r.errores.join('\n'), /paso 3/);
});

test('coordenadas que no son números se detectan', async () => {
  const r = await probarEscena(await escena(BUENA.replace("g.ctx.beginPath();", "g.circulo(NaN, 10, 3);")));
  assert.equal(r.ok, false);
  assert.match(r.errores.join('\n'), /NaN|no numéric/);
});

test('una escena que no termina se corta', { timeout: 60000 }, async () => {
  const r = await probarEscena(await escena('export default (S) => S.definirEscena({ pasos: 1, dibujar() { for (;;); } });'), { limiteMs: 3000 });
  assert.equal(r.ok, false);
  assert.match(r.errores.join('\n'), /tiempo/);
});

test('una escena no puede leer archivos ajenos ni escribir', async () => {
  const r = await probarEscena(await escena(`import fs from 'node:fs';
fs.readFileSync('/etc/hostname');
export default (S) => S.definirEscena({ pasos: 1, dibujar() {} });`));
  assert.equal(r.ok, false);
  assert.match(r.errores.join('\n'), /ERR_ACCESS_DENIED|acceso/i);
});

test('sin definirEscena o con un alto absurdo no vale', async () => {
  assert.equal((await probarEscena(await escena('export default 42;'))).ok, false);
  assert.equal((await probarEscena(await escena('export default (S) => S.definirEscena({ pasos: 1, alto: 9000, dibujar() {} });'))).ok, false);
});
