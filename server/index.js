import { crearConfig } from './config.js';
import { construirApp } from './api/rutas.js';

const cfg = crearConfig();
const app = await construirApp(cfg);
await app.glosas.recuperar(); // antes que la cola: deshace lo que dejaron a medias
await app.talleres.recuperar();
await app.examenes.recuperar();
await app.verificaciones.recuperar();
await app.cola.recuperar();
app.examenes.reanudarCorrecciones();
await app.listen({ host: cfg.host, port: cfg.puerto });
console.log(`Semillero en http://localhost:${cfg.puerto} · datos en ${cfg.datos}`);

for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, async () => {
    await app.cola.apagar();
    await app.close();
    process.exit(0);
  });
}
