// Retransmite a todos los navegadores conectados lo que ocurre en la cola.
export function registrarWs(app, cola, glosas, talleres, examenes, verificaciones, redaccion) {
  const clientes = new Set();
  const enviar = (msg) => {
    const texto = JSON.stringify(msg);
    for (const s of clientes) if (s.readyState === 1) s.send(texto);
  };

  cola.on('evento', ({ ref, ev }) => enviar({ tipo: 'evento', ref, ev }));
  cola.on('idea', ({ ref, idea }) => enviar({ tipo: 'idea', ref, idea }));
  cola.on('cola', (datos) => enviar({ tipo: 'cola', datos }));
  cola.on('pausa', (datos) => enviar({ tipo: 'pausa', datos }));
  if (glosas) {
    glosas.on('glosa', ({ ref, glosa }) => enviar({ tipo: 'glosa', ref, glosa }));
    glosas.on('glosa-evento', ({ ref, id, ev }) => enviar({ tipo: 'glosa-evento', ref, id, ev }));
    glosas.on('idea', ({ ref, idea }) => enviar({ tipo: 'idea', ref, idea }));
  }

  if (talleres) {
    talleres.on('taller', ({ ref, nodo, taller }) => enviar({ tipo: 'taller', ref, nodo, taller }));
    talleres.on('taller-evento', ({ ref, nodo, ev }) => enviar({ tipo: 'taller-evento', ref, nodo, ev }));
  }

  if (examenes) {
    examenes.on('examen', ({ ref, nodo, examen }) => enviar({ tipo: 'examen', ref, nodo, examen }));
    examenes.on('examen-evento', ({ ref, nodo, id, ev }) => enviar({ tipo: 'examen-evento', ref, nodo, id, ev }));
  }

  if (verificaciones) {
    verificaciones.on('verificacion', ({ ref, nodo, verificacion }) => enviar({ tipo: 'verificacion', ref, nodo, verificacion }));
    verificaciones.on('verificacion-evento', ({ ref, nodo, id, ev }) => enviar({ tipo: 'verificacion-evento', ref, nodo, id, ev }));
    verificaciones.on('idea', ({ ref, idea }) => enviar({ tipo: 'idea', ref, idea }));
  }

  // Solo el estado de cada asignatura de un curso; lo que hace la sesión por dentro no sale del servidor.
  if (redaccion) redaccion.on('redaccion', ({ ref, nodos, pausada }) => enviar({ tipo: 'redaccion', ref, nodos, pausada }));

  app.get('/ws', { websocket: true }, (socket) => {
    clientes.add(socket);
    socket.send(JSON.stringify({ tipo: 'cola', datos: cola.estado() }));
    socket.on('close', () => clientes.delete(socket));
  });
}
