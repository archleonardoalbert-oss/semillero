// Guarda el último valor tras `ms` sin cambios; `vaciar()` lo guarda ya (al salir de la página).
export function crearAutoguardado(guardar, ms) {
  let pendiente = null;
  let temporizador = null;

  async function vaciar() {
    clearTimeout(temporizador);
    if (pendiente === null) return;
    const valor = pendiente;
    pendiente = null;
    await guardar(valor);
  }

  function programar(valor) {
    pendiente = valor;
    clearTimeout(temporizador);
    temporizador = setTimeout(vaciar, ms);
  }

  return { programar, vaciar, hayPendiente: () => pendiente !== null };
}
