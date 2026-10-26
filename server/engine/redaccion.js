// Redacción automática de un curso («Aprender algo nuevo»): cuando la germinación deja aceptado el plan de
// estudios, cada nodo de estudio (una asignatura) lo redacta una sesión dedicada con contexto limpio, con tantas
// en paralelo como diga Ajustes y sin arrancar ninguna mientras la investigación está pausada por cuota.
// Cada sesión solo puede escribir en las carpetas de su nodo; lo demás se revierte. El nodo se acepta si su
// índice es válido, sus documentos existen y TODAS sus escenas pasan la comprobación en Node.
import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ejecutar as ejecutarReal } from './runner.js';
import { validarMapa } from './mapa.js';
import { validarIndice, escenasDe, documentosDe } from './indice.js';
import { tipoDe, bloqueBancal } from './tipos.js';
import { argsRedaccion, mensajeRedaccion } from './curso.js';
import { listaRespuestas } from './prompt.js';
import { probarEscena } from '../escenas/probar.js';
import { RE_LIMITE } from './cola.js';

const INTENTOS = 2; // la redacción y una corrección en la misma sesión
const sinComodin = (p) => p.replace(/\/\*\*$/, '');

export function crearMotorRedaccion({ cfg, ideas, carpetas, germinacion, guard, cola, ajustes, ejecutar = ejecutarReal, probar = probarEscena }) {
  const emisor = new EventEmitter();
  const activas = new Map(); // 'c/i/n' → { objetivos, control, motivo }
  const fila = []; // [{ ref, nodo }] pendientes de arrancar, en orden
  const objetivosActivos = () => [...activas.values()].flatMap((a) => a.objetivos);
  cola.registrarEscritor(objetivosActivos);

  const clave = (ref, n) => `${ref.carpetaId}/${ref.ideaId}/${n}`;
  const rutaIdea = (ref) => ideas.relIdea(ref.carpetaId, ref.ideaId);
  const relEstado = (ref) => `${rutaIdea(ref)}/germinacion/redaccion.json`;
  const objetivosNodo = (ref, n) => {
    const r = rutaIdea(ref);
    return [`${r}/germinacion/nodos/${n}/**`, `${r}/germinacion/escenas/${n}/**`, `${r}/germinacion/recursos/${n}/**`, `${r}/figuras/${n}/**`];
  };

  async function leerEstado(ref) {
    const t = await fs.readFile(path.join(cfg.datos, relEstado(ref)), 'utf8').catch(() => null);
    try {
      return t ? JSON.parse(t) : { nodos: {} };
    } catch {
      return { nodos: {} };
    }
  }
  // Las escrituras del estado van serializadas por idea y commiteadas (el guard no las revierte).
  const cadenas = new Map();
  function cambiarNodo(ref, n, parche) {
    const k = `${ref.carpetaId}/${ref.ideaId}`;
    const turno = (cadenas.get(k) ?? Promise.resolve()).then(() =>
      guard.proteger([relEstado(ref)], async () => {
        const e = await leerEstado(ref);
        // Una idea borrada mientras se redactaba: no se recrea su carpeta.
        if (!(await fs.stat(path.join(cfg.datos, rutaIdea(ref), 'idea.json')).catch(() => null))) return e;
        e.nodos[n] = { ...(e.nodos[n] ?? {}), ...parche, actualizado: new Date().toISOString() };
        await fs.mkdir(path.dirname(path.join(cfg.datos, relEstado(ref))), { recursive: true });
        await fs.writeFile(path.join(cfg.datos, relEstado(ref)), `${JSON.stringify(e, null, 2)}\n`);
        return e;
      }, `redacción ${k}/${n}`));
    cadenas.set(k, turno.catch(() => {}));
    return turno.then((e) => {
      emisor.emit('redaccion', { ref, nodos: e.nodos });
      return e;
    });
  }

  async function mapaDe(ref) {
    const v = validarMapa(await germinacion.leerMapa(ref.carpetaId, ref.ideaId));
    return v.ok && v.mapa.fase === 'mapa' ? v.mapa : null;
  }
  async function esCurso(ref) {
    const carpeta = await carpetas.obtener(ref.carpetaId).catch(() => null);
    return carpeta && tipoDe(carpeta) === 'aprendizaje' ? carpeta : null;
  }

  // Marca como pendientes las asignaturas que aún no están listas ni en marcha y las pone en la fila.
  async function planificar(ref) {
    if (!(await esCurso(ref))) return;
    const mapa = await mapaDe(ref);
    if (!mapa) return;
    const estado = await leerEstado(ref);
    for (const n of mapa.nodos.filter((x) => x.tipo === 'estudio')) {
      const e = estado.nodos[n.id]?.estado;
      if (e === 'lista' || e === 'error' || activas.has(clave(ref, n.id)) || fila.some((f) => clave(f.ref, f.nodo) === clave(ref, n.id))) continue;
      if (e !== 'pendiente') await cambiarNodo(ref, n.id, { estado: 'pendiente', error: null, intentos: 0 });
      fila.push({ ref, nodo: n.id });
    }
    await bombear();
  }

  // La cuota es una sola para todo Semillero: con la investigación pausada, o con alguna ventana por encima
  // de su umbral (y aún sin reiniciar), no se arranca nada; lo que esté en marcha se detiene y se retomará.
  async function sinCuota() {
    const { umbral5h, umbral7d } = await ajustes.leer();
    const { pausadaPorCuota, cuota } = cola.estado();
    const ahora = Date.now() / 1000;
    const superada = (u, umbral, reinicio) => (u ?? 0) >= umbral && !(reinicio && ahora >= reinicio);
    return pausadaPorCuota || superada(cuota?.cincoHoras, umbral5h, cuota?.resetsAt5h) || superada(cuota?.sieteDias, umbral7d, cuota?.resetsAt7d);
  }

  let bombeando = false;
  async function bombear() {
    if (bombeando) return;
    bombeando = true;
    try {
      const { paralelo } = await ajustes.leer();
      while (fila.length && activas.size < paralelo && !(await sinCuota())) {
        const { ref, nodo } = fila.shift();
        if (activas.has(clave(ref, nodo))) continue; // nunca dos sesiones sobre el mismo nodo
        const a = { objetivos: objetivosNodo(ref, nodo), control: new AbortController(), motivo: null };
        activas.set(clave(ref, nodo), a);
        a.promesa = correr(ref, nodo).catch((e) => console.error('[redaccion]', e));
      }
    } finally {
      bombeando = false;
    }
  }
  async function vigilarCuota() {
    if (await sinCuota()) {
      for (const a of activas.values()) {
        if (a.motivo) continue;
        a.motivo = 'pausa';
        a.control.abort();
      }
    } else if (fila.length) await bombear();
  }
  // Cada aviso de la cola (también los de cuota) y un latido por si el reinicio de la ventana llega en silencio.
  const latido = setInterval(() => vigilarCuota().catch(() => {}), 60000);
  latido.unref?.();
  cola.on?.('cola', () => vigilarCuota().catch(() => {}));

  async function correr(ref, n) {
    const k = clave(ref, n);
    const a = activas.get(k);
    const { objetivos } = a;
    let final;
    try {
      const carpeta = await esCurso(ref);
      const mapa = await mapaDe(ref);
      const nodo = mapa?.nodos.find((x) => x.id === n && x.tipo === 'estudio');
      if (!carpeta || !nodo) throw new Error('El nodo ya no existe en el plan de estudios');
      await cambiarNodo(ref, n, { estado: 'redactando', error: null });
      const idea = await ideas.obtener(ref.carpetaId, ref.ideaId);
      const progreso = await germinacion.leerProgreso(ref.carpetaId, ref.ideaId);
      const estado = await leerEstado(ref);
      const dependencias = nodo.depende
        .map((d) => mapa.nodos.find((x) => x.id === d))
        .map((d) => ({ ...d, indice: estado.nodos[d.id]?.estado === 'lista' }));
      const { contexto } = await ajustes.leer();
      // Tras una pausa por cuota se retoma la misma sesión, que sigue donde lo dejó.
      const previo = estado.nodos[n] ?? {};
      let sesion = previo.reanudar && previo.sesion ? previo.sesion : null;
      let mensaje = sesion ? mensajeRedaccion({ nodo, continuar: true }) : `${bloqueBancal(carpeta, contexto)}\n\n${mensajeRedaccion({
        idea, rutaIdea: rutaIdea(ref), nodo, mapa, dependencias,
        respuestasDiagnostico: listaRespuestas(mapa, progreso.respuestas),
        idiomas: Array.isArray(progreso.respuestas?.idiomas) ? progreso.respuestas.idiomas : [],
      })}`;
      for (let intento = 1; intento <= INTENTOS; intento++) {
        const marca = new Date().toISOString().replace(/[:.]/g, '-');
        const r = await ejecutar({
          cfg,
          args: argsRedaccion({ sessionId: sesion, ajustes: await ajustes.leer(), mensaje }),
          cwd: cfg.datos,
          rutaRegistro: path.join(ideas.dirIdea(ref.carpetaId, ref.ideaId), 'registro', 'redaccion', `${n}-${marca}.jsonl`),
          alEvento: (ev) => {
            if (ev.type === 'system' && ev.subtype === 'init' && ev.session_id) sesion = ev.session_id;
            emisor.emit('redaccion-evento', { ref, nodo: n, ev });
            cola.registrarCuota(ev);
          },
          senal: a.control.signal,
        });
        const ajenos = [...cola.objetivosAjenos(objetivosActivos), ...[...activas].filter(([x]) => x !== k).flatMap(([, o]) => o.objetivos)];
        await guard.verificar({ propios: objetivos, ajenosActivos: ajenos });
        if (a.motivo === 'detener') {
          // Apagado: lo escrito a medias se descarta y el nodo empezará de nuevo en el próximo arranque.
          await guard.restaurar(objetivos);
          final = { estado: 'pendiente', error: null, reanudar: false };
          break;
        }
        if (a.motivo === 'pausa' || (r.resultado?.is_error && RE_LIMITE.test(String(r.resultado.result ?? '')))) {
          // Sin cuota: lo escrito se guarda y el nodo vuelve a la fila para seguir en la misma sesión.
          await guard.commitear(objetivos.map(sinComodin), `redacción ${k} (pausada por cuota)`);
          final = { estado: 'pendiente', error: null, sesion, reanudar: Boolean(sesion) };
          fila.unshift({ ref, nodo: n });
          break;
        }
        if (r.errorArranque || r.resultado?.is_error || !r.resultado) {
          final = { estado: 'error', error: r.errorArranque ?? String(r.resultado?.result || r.stderr?.trim().split('\n').at(-1) || 'La sesión no respondió') };
          break;
        }
        const v = await revisar(ref, n);
        if (v.ok) {
          await fs.writeFile(path.join(cfg.datos, rutaIdea(ref), 'germinacion/nodos', n, 'indice.json'), `${JSON.stringify(v.indice, null, 2)}\n`);
          await guard.commitear(objetivos.map(sinComodin), `redacción ${k}`);
          final = { estado: 'lista', error: null, intentos: intento, sesion, reanudar: false };
          break;
        }
        if (intento === INTENTOS || !sesion) {
          await guard.restaurar(objetivos);
          final = { estado: 'error', error: v.motivo, intentos: intento, reanudar: false };
          break;
        }
        mensaje = mensajeRedaccion({ nodo, reintento: v.motivo });
      }
    } catch (e) {
      await guard.restaurar(objetivos).catch(() => {});
      final = { estado: 'error', error: String(e.message ?? e) };
    }
    // El estado final se escribe antes de liberar el hueco: un planificar en medio no vuelve a encolar el nodo.
    try {
      await cambiarNodo(ref, n, final);
    } finally {
      activas.delete(k);
    }
    if (a.motivo !== 'detener') await bombear();
  }

  // Lo que la sesión dejó: índice válido, documentos presentes y escenas que funcionan.
  async function revisar(ref, n) {
    const base = path.join(cfg.datos, rutaIdea(ref), 'germinacion');
    let indice;
    try {
      indice = JSON.parse(await fs.readFile(path.join(base, 'nodos', n, 'indice.json'), 'utf8'));
    } catch (e) {
      return { ok: false, motivo: `falta germinacion/nodos/${n}/indice.json o no es JSON válido (${e.message})` };
    }
    const v = validarIndice(indice, n);
    if (!v.ok) return { ok: false, motivo: `el índice no es válido: ${v.motivo}` };
    const fallos = [];
    for (const doc of documentosDe(v.indice)) {
      const md = await fs.readFile(path.join(base, doc), 'utf8').catch(() => null);
      if (!md?.trim()) {
        fallos.push(`falta el documento ${doc} o está vacío`);
        continue;
      }
      const { validas, invalidas } = escenasDe(md, n);
      for (const x of invalidas) fallos.push(`bloque escena mal formado en ${doc}: ${x} (debe ser JSON con "archivo": "escenas/${n}/<nombre>.js")`);
      for (const e of validas) {
        const ruta = path.join(base, e.archivo);
        if (!(await fs.stat(ruta).catch(() => null))) {
          fallos.push(`${doc} cita la escena ${e.archivo}, que no existe`);
          continue;
        }
        const p = await probar(ruta);
        if (!p.ok) fallos.push(`la escena ${e.archivo} no pasa la comprobación: ${p.errores.join('; ')}`);
      }
    }
    for (const r of v.indice.recursos) {
      if (r.archivo && !(await fs.stat(path.join(base, r.archivo)).catch(() => null))) fallos.push(`el recurso ${r.id} cita ${r.archivo}, que no existe (quita "archivo" si no se pudo descargar)`);
    }
    return fallos.length ? { ok: false, motivo: fallos.slice(0, 12).join(' | ') } : { ok: true, indice: v.indice };
  }

  // Estado de la redacción de una idea y los índices de los nodos listos (para la interfaz).
  async function estado(ref) {
    const e = await leerEstado(ref);
    const indices = {};
    for (const [n, x] of Object.entries(e.nodos)) {
      if (x.estado !== 'lista') continue;
      try {
        const v = validarIndice(JSON.parse(await fs.readFile(path.join(cfg.datos, rutaIdea(ref), 'germinacion/nodos', n, 'indice.json'), 'utf8')), n);
        if (v.ok) indices[n] = v.indice;
      } catch {
        /* sin índice legible: se mostrará como pendiente de revisión */
      }
    }
    return { nodos: e.nodos, indices };
  }

  const ocupada = (ref) => [...activas.keys(), ...fila.map((f) => clave(f.ref, f.nodo))].some((k) => k.startsWith(`${ref.carpetaId}/${ref.ideaId}/`));

  // Un nodo en error se vuelve a redactar desde cero. La reserva es síncrona: dos clics no lanzan dos sesiones.
  const reservados = new Set();
  async function reintentar(ref, n) {
    const k = clave(ref, n);
    if (reservados.has(k) || activas.has(k) || fila.some((f) => clave(f.ref, f.nodo) === k)) throw new Error('en-proceso');
    reservados.add(k);
    try {
      const e = await leerEstado(ref);
      if (e.nodos[n]?.estado !== 'error') throw new Error('estado-invalido');
      await cambiarNodo(ref, n, { estado: 'pendiente', error: null, intentos: 0, reanudar: false });
      fila.push({ ref, nodo: n });
    } finally {
      reservados.delete(k);
    }
    await bombear();
  }

  // Al apagar el servidor: se detienen las sesiones (lo escrito a medias se descarta) y se espera a que cierren.
  async function apagar() {
    clearInterval(latido);
    fila.length = 0;
    const enMarcha = [...activas.values()];
    for (const a of enMarcha) {
      a.motivo = 'detener';
      a.control.abort();
    }
    await Promise.allSettled(enMarcha.map((a) => a.promesa));
  }

  // Al arrancar, ANTES de que la cola haga commit de lo que encuentre: lo que se estaba redactando cuando se
  // cortó vuelve a lo último bueno (si no, lo escrito a medias quedaría como bueno).
  async function restaurarInterrumpidas() {
    for (const idea of await ideas.listar()) {
      const ref = { carpetaId: idea.carpetaId, ideaId: idea.id };
      const e = await leerEstado(ref);
      for (const [n, x] of Object.entries(e.nodos)) {
        if (x.estado !== 'redactando') continue;
        await guard.restaurar(objetivosNodo(ref, n));
        await cambiarNodo(ref, n, { estado: 'pendiente', reanudar: false });
      }
    }
  }

  // Después de la cola (que ya sabe si la investigación está pausada): se retoma todo lo pendiente.
  async function recuperar() {
    await restaurarInterrumpidas();
    for (const idea of await ideas.listar()) {
      const ref = { carpetaId: idea.carpetaId, ideaId: idea.id };
      const e = await leerEstado(ref);
      if (Object.values(e.nodos).some((x) => x.estado === 'pendiente')) await planificar(ref);
    }
  }

  // Cuando la germinación de un curso deja aceptado el plan de estudios, se redacta lo que falte.
  cola.on?.('idea', ({ ref, idea }) => {
    if (idea?.trabajo === 'germinacion' && idea.estado === 'aceptada' && idea.germinacion?.fase === 'mapa') planificar(ref).catch((e) => console.error('[redaccion]', e));
  });

  return Object.assign(emisor, { planificar, estado, ocupada, reintentar, recuperar, restaurarInterrumpidas, apagar, objetivosActivos, detenerLatido: () => clearInterval(latido) });
}
