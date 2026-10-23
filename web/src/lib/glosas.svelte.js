import { api } from './api.js';
import { suscribir } from './estado.svelte.js';
import { crearTranscripcion } from './eventos.js';

// Glosas de una idea: lista viva (WebSocket) y la transcripción en directo de las que están en marcha.
export function crearGlosas(ref) {
  const estado = $state({ lista: [], version: 0 });
  const vivas = new Map(); // id → transcripción

  async function cargar() {
    estado.lista = await api.glosas(ref.carpetaId, ref.ideaId);
  }

  function poner(g) {
    const i = estado.lista.findIndex((x) => x.id === g.id);
    if (i === -1) estado.lista = [...estado.lista, g];
    // Una respuesta HTTP tardía no puede devolver a «en proceso» una glosa que ya terminó.
    else if (!(g.estado === 'en-proceso' && estado.lista[i].estado !== 'en-proceso' && estado.lista[i].mensajes.length >= g.mensajes.length)) {
      estado.lista[i] = g;
    }
    if (g.estado !== 'en-proceso') vivas.delete(g.id);
  }

  const quitar = suscribir(ref, (msg) => {
    if (msg.tipo === 'reconexion') cargar();
    else if (msg.tipo === 'glosa') poner(msg.glosa);
    else if (msg.tipo === 'glosa-evento') {
      if (!vivas.has(msg.id)) vivas.set(msg.id, crearTranscripcion());
      vivas.get(msg.id).aplicar(msg.ev);
      estado.version++;
    }
  });

  async function pedir(datos) {
    const g = await api.pedirGlosa(ref.carpetaId, ref.ideaId, datos);
    vivas.set(g.id, crearTranscripcion());
    poner(g);
    return g;
  }

  async function seguir(id, prompt) {
    vivas.set(id, crearTranscripcion());
    poner(await api.seguirGlosa(ref.carpetaId, ref.ideaId, id, prompt));
  }

  // Lo último que está haciendo una glosa en marcha, para mostrarlo en una línea.
  function enVivo(id) {
    estado.version;
    const t = vivas.get(id);
    if (!t) return null;
    const ultimo = t.bloques.at(-1);
    const texto = t.bloques.findLast((b) => b.tipo === 'texto')?.texto ?? '';
    return { ultimo, texto };
  }

  cargar();
  return { estado, cargar, pedir, seguir, enVivo, destruir: quitar };
}
