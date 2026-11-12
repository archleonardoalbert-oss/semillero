// Demo publicada (solo lectura): las respuestas de la API se grabaron de un servidor real con dos ideas
// y viven en demo/paquete.json. Lo que escribiría o llamaría a Claude se rechaza con un aviso claro.
export const AVISO_DEMO = 'Esto es una demo de solo lectura: aquí Claude trabajaría sobre tu idea. Instala el Semillero para usarlo de verdad.';

let paquete = null;
const cargar = () => (paquete ??= fetch('demo/paquete.json').then((r) => r.json()));

export async function pedirDemo(metodo, url) {
  if (metodo !== 'GET') throw Object.assign(new Error(AVISO_DEMO), { codigo: 403, demo: true });
  if (url.startsWith('demo/archivos/')) {
    const r = await fetch(url);
    if (!r.ok) throw Object.assign(new Error('Este archivo no está incluido en la demo.'), { codigo: r.status });
    return r.headers.get('content-type')?.startsWith('application/json') ? r.json() : r.text();
  }
  const grabada = (await cargar())[url];
  if (!grabada) throw Object.assign(new Error('Esta parte no está incluida en la demo.'), { codigo: 404 });
  if (grabada.estado >= 400) throw Object.assign(new Error(grabada.cuerpo?.error ?? `HTTP ${grabada.estado}`), { codigo: grabada.estado });
  return structuredClone(grabada.cuerpo);
}
