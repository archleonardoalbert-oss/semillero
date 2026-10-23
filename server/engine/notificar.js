import { execFile } from 'node:child_process';

// Notificación de escritorio; si falla (sin sesión gráfica), se ignora.
export function notificar(titulo, cuerpo) {
  return new Promise((resolve) => {
    execFile('notify-send', ['-a', 'Semillero', titulo, cuerpo], () => resolve());
  });
}
