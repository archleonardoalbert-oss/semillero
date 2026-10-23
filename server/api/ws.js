// Retransmite a todos los navegadores conectados lo que ocurre en la cola.
export function registrarWs(app, cola) {
  const clientes = new Set();
  const enviar = (msg) => {
    const texto = JSON.stringify(msg);
    for (const s of clientes) if (s.readyState === 1) s.send(texto);
  };

  cola.on('evento', ({ ref, ev }) => enviar({ tipo: 'evento', ref, ev }));
  cola.on('idea', ({ ref, idea }) => enviar({ tipo: 'idea', ref, idea }));
  cola.on('cola', (datos) => enviar({ tipo: 'cola', datos }));
  cola.on('pausa', (datos) => enviar({ tipo: 'pausa', datos }));

  app.get('/ws', { websocket: true }, (socket) => {
    clientes.add(socket);
    socket.send(JSON.stringify({ tipo: 'cola', datos: cola.estado() }));
    socket.on('close', () => clientes.delete(socket));
  });
}
