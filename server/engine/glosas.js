import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ejecutar as ejecutarReal } from './runner.js';
import { argsGlosa, mensajeGlosa, mensajeSeguimientoGlosa, parsearRespuestaGlosa } from './prompt.js';
import { parsearDictamen } from './veredicto.js';

const TIPOS = new Set(['explicar', 'corregir']);
const RE_DOCUMENTO = /^(hilo\/\d{3}-(claude|usuario)\.md|germinacion\/nodos\/[a-z0-9-]+\.md)$/;
const RE_DICTAMEN = /^hilo\/\d{3}-claude\.md$/;
const VEREDICTOS = new Set(['aceptada', 'rechazada', 'aclaracion', 'cambios']);
const MAX_FRAGMENTO = 20000;

const clave = (r) => `${r.carpetaId}/${r.ideaId}`;
const sinComodin = (p) => p.replace(/\/\*\*$/, '');

// Glosas: preguntas sobre un fragmento que se responden al momento en una copia aislada
// de la sesión de la idea (--fork-session), sin ocupar hueco en la cola de análisis.
export function crearMotorGlosas({ cfg, ideas, glosas, guard, cola, ajustes, ejecutar = ejecutarReal }) {
  const emisor = new EventEmitter();
  const activas = new Map(); // 'c/i/id' → { objetivos, documento, tipo }
  const reservadas = new Set(); // seguimientos aceptados que aún no han arrancado

  const objetivosActivos = () => [...activas.values()].flatMap((x) => x.objetivos);
  cola.fijarAjenosExternos(objetivosActivos);

  const objetivosDe = (rutaIdea, g) => [
    `${rutaIdea}/figuras/glosas/${g.id}/**`,
    ...(g.tipo === 'corregir' ? [`${rutaIdea}/${g.documento}`] : []),
  ];

  function validar({ tipo, documento, fragmento, prompt }) {
    if (!TIPOS.has(tipo)) throw new Error('tipo-invalido');
    if (!RE_DOCUMENTO.test(String(documento ?? ''))) throw new Error('documento-invalido');
    if (tipo === 'corregir' && documento.endsWith('-usuario.md')) throw new Error('documento-invalido');
    if (tipo === 'corregir' && !String(prompt ?? '').trim()) throw new Error('prompt-vacio');
    const markdown = String(fragmento?.markdown ?? '').slice(0, MAX_FRAGMENTO);
    if (!markdown.trim()) throw new Error('fragmento-vacio');
    const imagenes = (Array.isArray(fragmento.imagenes) ? fragmento.imagenes : [])
      .map(String)
      .filter((r) => /^carpetas\/[^.][^]*$/.test(r) && !r.split('/').includes('..'));
    return { markdown, imagenes };
  }

  async function comprobarIdea(ref) {
    const idea = await ideas.obtener(ref.carpetaId, ref.ideaId);
    if (idea.estado === 'en-proceso') throw new Error('en-proceso');
    if (cola.estado().pausadaPorCuota) throw new Error('cuota');
    return idea;
  }

  async function pedir(ref, datos) {
    const fragmento = validar(datos);
    // Dos correcciones a la vez sobre el mismo documento se pisarían las enmiendas.
    const prefijo = `${clave(ref)}/`;
    if (datos.tipo === 'corregir' && [...activas].some(([k, x]) => k.startsWith(prefijo) && x.tipo === 'corregir' && x.documento === datos.documento)) {
      throw new Error('en-proceso');
    }
    const idea = await comprobarIdea(ref);
    const rutaIdea = ideas.relIdea(ref.carpetaId, ref.ideaId);
    await fs.access(path.join(cfg.datos, rutaIdea, datos.documento)).catch(() => {
      throw new Error('documento-invalido');
    });
    const prompt = String(datos.prompt ?? '').trim();
    const g = await glosas.crear(ref.carpetaId, ref.ideaId, {
      tipo: datos.tipo,
      documento: datos.documento,
      ancla: datos.ancla ?? {},
      fragmento,
      mensajes: [{ autor: 'usuario', contenido: prompt, fecha: new Date().toISOString() }],
    });
    emisor.emit('glosa', { ref, glosa: g });
    const mensaje = mensajeGlosa({ tipo: g.tipo, rutaDocumento: `${rutaIdea}/${g.documento}`, fragmento, prompt, carpetaFiguras: `figuras/glosas/${g.id}` });
    correr(ref, g, { sessionId: idea.sessionId ?? null, bifurcar: true, mensaje });
    return g;
  }

  async function seguir(ref, id, prompt) {
    const texto = String(prompt ?? '').trim();
    if (!texto) throw new Error('prompt-vacio');
    const k = `${clave(ref)}/${id}`;
    // Reserva síncrona: dos «seguir» casi simultáneos no deben lanzar dos ejecuciones sobre la misma copia.
    if (activas.has(k) || reservadas.has(k)) throw new Error('en-proceso');
    reservadas.add(k);
    try {
      return await seguirReservada(ref, id, texto, k);
    } finally {
      reservadas.delete(k);
    }
  }

  async function seguirReservada(ref, id, texto) {
    const idea = await comprobarIdea(ref);
    const previa = await glosas.obtener(ref.carpetaId, ref.ideaId, id);
    if (previa.estado === 'en-proceso') throw new Error('en-proceso');
    const g = await glosas.actualizar(ref.carpetaId, ref.ideaId, id, (x) => ({
      estado: 'en-proceso',
      error: null,
      mensajes: [...x.mensajes, { autor: 'usuario', contenido: texto, fecha: new Date().toISOString() }],
    }));
    emisor.emit('glosa', { ref, glosa: g });
    // Si la primera petición nunca llegó a crear su copia, se bifurca ahora de la principal.
    const opciones = g.sessionId
      ? { sessionId: g.sessionId, bifurcar: false, mensaje: mensajeSeguimientoGlosa(texto) }
      : {
          sessionId: idea.sessionId ?? null,
          bifurcar: true,
          mensaje: mensajeGlosa({ tipo: g.tipo, rutaDocumento: `${ideas.relIdea(ref.carpetaId, ref.ideaId)}/${g.documento}`, fragmento: g.fragmento, prompt: texto, carpetaFiguras: `figuras/glosas/${g.id}` }),
        };
    correr(ref, g, opciones);
    return g;
  }

  function correr(ref, g, opciones) {
    ejecutarGlosa(ref, g, opciones).catch((e) => console.error('[glosas] fallo', clave(ref), g.id, e));
  }

  async function ejecutarGlosa(ref, g, { sessionId, bifurcar, mensaje }) {
    const k = `${clave(ref)}/${g.id}`;
    const rutaIdea = ideas.relIdea(ref.carpetaId, ref.ideaId);
    const objetivos = objetivosDe(rutaIdea, g);
    activas.set(k, { objetivos, documento: g.documento, tipo: g.tipo });
    const rutaDoc = path.join(cfg.datos, rutaIdea, g.documento);
    const antes = g.tipo === 'corregir' ? await fs.readFile(rutaDoc, 'utf8').catch(() => null) : null;
    let sesionNueva = null;
    let final;
    try {
      const lanzar = async (sesion) => {
        const marca = new Date().toISOString().replace(/[:.]/g, '-');
        return ejecutar({
          cfg,
          args: argsGlosa({ sessionId: sesion, bifurcar, ajustes: await ajustes.leer(), mensaje }),
          cwd: cfg.datos,
          rutaRegistro: path.join(ideas.dirIdea(ref.carpetaId, ref.ideaId), 'registro', 'glosas', `${g.id}-${marca}.jsonl`),
          alEvento: (ev) => {
            if (ev.type === 'system' && ev.subtype === 'init' && ev.session_id) sesionNueva = ev.session_id;
            emisor.emit('glosa-evento', { ref, id: g.id, ev });
            cola.registrarCuota(ev);
          },
          senal: new AbortController().signal,
        });
      };
      let r = await lanzar(sessionId);
      // Claude borra las sesiones antiguas: sin la principal, la glosa empieza una sesión nueva.
      if (sessionId && /No conversation found/i.test(r.stderr ?? '')) {
        sessionId = null;
        bifurcar = true;
        r = await lanzar(null);
      }
      const ajenos = [...cola.objetivosActivos(), ...[...activas].filter(([x]) => x !== k).flatMap(([, o]) => o.objetivos)];
      const { restaurados } = await guard.verificar({ propios: objetivos, ajenosActivos: ajenos });
      if (restaurados.length) console.warn('[guard] restaurados tras glosa', restaurados);
      final = await cerrar(ref, g, r, { antes, rutaDoc, objetivos });
    } catch (e) {
      console.error('[glosas] ejecución fallida', k, e);
      final = { estado: 'error', error: String(e.message ?? e) };
    } finally {
      activas.delete(k);
    }
    const sesion = sesionNueva ?? (bifurcar ? null : sessionId);
    const glosa = await glosas.actualizar(ref.carpetaId, ref.ideaId, g.id, (x) => ({
      ...final,
      ...(sesion ? { sessionId: sesion } : {}),
      mensajes: final.respuesta ? [...x.mensajes, { autor: 'claude', contenido: final.respuesta, fecha: new Date().toISOString() }] : x.mensajes,
      respuesta: undefined,
    }));
    emisor.emit('glosa', { ref, glosa });
  }

  async function cerrar(ref, g, r, { antes, rutaDoc, objetivos }) {
    const res = r.resultado;
    if (!res || res.is_error || !String(res.result ?? '').trim()) {
      await guard.restaurar(objetivos);
      return { estado: 'error', error: r.errorArranque ?? (res?.result || r.stderr?.trim().split('\n').at(-1) || 'La sesión no respondió') };
    }
    const { correccion, cuerpo } = parsearRespuestaGlosa(res.result);
    const final = { estado: 'lista', error: null, respuesta: cuerpo };
    if (g.tipo !== 'corregir') {
      await guard.commitear(objetivos.map(sinComodin), `glosa ${g.id}`);
      return final;
    }
    if (correccion) final.correccion = correccion;
    const despues = await fs.readFile(rutaDoc, 'utf8').catch(() => null);
    const dictamen = RE_DICTAMEN.test(g.documento);
    // Un dictamen enmendado debe seguir siendo un dictamen válido; si no, se deshace la enmienda.
    if (despues !== antes && dictamen && !parsearDictamen(despues)) {
      await guard.restaurar([sinComodin(objetivos[1])]);
      await guard.commitear(objetivos.map(sinComodin), `glosa ${g.id}`);
      return { ...final, enmendado: false, aviso: 'La enmienda rompía el formato del dictamen y se deshizo.' };
    }
    await guard.commitear(objetivos.map(sinComodin), `glosa ${g.id} (corrección)`);
    final.enmendado = Boolean(g.enmendado) || despues !== antes;
    if (despues !== antes) {
      const idea = await ideas.obtener(ref.carpetaId, ref.ideaId);
      // Toda enmienda se registra para avisar a la sesión principal en su siguiente ejecución.
      const parche = { enmendados: [...new Set([...(idea.enmendados ?? []), g.documento])] };
      // El veredicto solo cambia si ese dictamen es lo último del hilo (sin réplica pendiente), la idea está
      // en un veredicto (no en proceso, detenida, pausada…) y no germina: una idea que germina conserva su estado.
      const ultimo = idea.hilo.at(-1)?.archivo === g.documento.replace(/^hilo\//, '');
      if (dictamen && ultimo && VEREDICTOS.has(idea.estado) && idea.trabajo !== 'germinacion') {
        const { meta } = parsearDictamen(despues);
        Object.assign(parche, { estado: meta.veredicto, etapa: meta.etapa, resumen: meta.resumen });
      }
      emisor.emit('idea', { ref, idea: await ideas.actualizar(ref.carpetaId, ref.ideaId, parche) });
    }
    return final;
  }

  // Al arrancar: las glosas cortadas quedan en error y se deshace lo que dejaron a medias.
  async function recuperar() {
    for (const idea of await ideas.listar()) {
      for (const g of await glosas.listar(idea.carpetaId, idea.id)) {
        if (g.estado !== 'en-proceso') continue;
        await guard.restaurar(objetivosDe(ideas.relIdea(idea.carpetaId, idea.id), g));
        await glosas.actualizar(idea.carpetaId, idea.id, g.id, { estado: 'error', error: 'Se interrumpió al reiniciar el servidor.' });
      }
    }
  }

  return Object.assign(emisor, { pedir, seguir, objetivosActivos, recuperar });
}
