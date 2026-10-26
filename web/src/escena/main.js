// Reproduce UNA escena de un curso dentro de un iframe aislado (sandbox="allow-scripts", sin acceso a la API).
// La URL trae el módulo de la escena (?m=…) y su título (?t=…). La página avisa a la conferencia de su alto
// para que el iframe crezca con ella.
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource-variable/bricolage-grotesque';
import 'katex/dist/katex.min.css';
import './escena.css';
import { crearEstudio } from './motor/estudio.js';
import { instanciar } from './api.js';

const q = new URLSearchParams(location.search);
const raiz = document.getElementById('escena');
const avisarAlto = () => parent.postMessage({ tipo: 'semillero-escena-alto', id: q.get('id'), alto: document.documentElement.scrollHeight }, '*');
new ResizeObserver(avisarAlto).observe(document.body);
// Con el foco dentro de la escena, Escape debe seguir cerrando el lector que la contiene.
document.addEventListener('keydown', (e) => e.key === 'Escape' && parent.postMessage({ tipo: 'semillero-escena-tecla', tecla: 'Escape' }, '*'));

try {
  const ruta = q.get('m') ?? '';
  // Solo módulos de escenas de la idea, servidos por Semillero o por el visor exportado.
  if (!/^\/archivos\/[^?#]+\/germinacion\/escenas\/[a-z0-9-]+\/[a-z0-9-]+\.js$/.test(ruta)) throw new Error('escena no válida');
  const escena = instanciar(await import(/* @vite-ignore */ ruta));
  const estudio = crearEstudio({ pasos: [], escena, nombre: q.get('t') ?? 'escena', sinPasos: true, teclado: false });
  raiz.append(estudio.raiz);
  estudio.iniciar();
} catch (e) {
  raiz.innerHTML = '';
  const p = document.createElement('p');
  p.className = 'fallo';
  p.textContent = `No se pudo mostrar esta escena: ${e.message}`;
  raiz.append(p);
}
avisarAlto();
