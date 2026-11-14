// Un repositorio reproducible, explorable: cada carpeta o archivo dice qué contiene, si va a Git y por qué.
import { el } from './motor.js';

const ARBOL = [
  ['ventas-mipyme/', 0, 'La raíz del proyecto. Quien clone el repositorio debe poder reproducir todo desde aquí con los comandos del README.', 'sí'],
  ['README.md', 1, 'Qué hace el proyecto, cómo instalarlo (con y sin conexión), de dónde salen los datos y con qué licencia, cómo ejecutarlo y qué resultados esperar. Es la primera (a veces la única) página que lee un reclutador.', 'sí'],
  ['pyproject.toml', 1, 'Define el paquete (nombre, versión) y sus dependencias de alto nivel. Permite pip install -e . para importar el código desde cualquier sitio.', 'sí'],
  ['requirements.txt', 1, 'Versiones exactas (==) de todo, también de las dependencias indirectas: el resultado de pip freeze. Es lo que hace reproducible el entorno.', 'sí'],
  ['.gitignore', 1, 'Lo que Git debe ignorar: .venv/, data/raw/, __pycache__/, salidas, ruedas, claves.', 'sí'],
  ['data/raw/', 1, 'Los datos originales, tal como llegaron. Son de SOLO LECTURA: el código nunca los modifica. Si son grandes o privados, no van a Git: el README dice cómo obtenerlos.', 'no (si son grandes o privados)'],
  ['data/processed/', 1, 'Lo que genera el código a partir de data/raw (por ejemplo, Parquet limpio). Se puede borrar y regenerar con un comando.', 'no: se regenera'],
  ['notebooks/01-exploracion.ipynb', 1, 'Exploración y figuras. Importa funciones del paquete; no contiene lógica que haya que reutilizar o probar.', 'sí (con las salidas limpias)'],
  ['src/ventas/', 1, 'El paquete importable (diseño src/): obliga a instalarlo, de modo que las pruebas comprueban lo mismo que usaría otra persona.', 'sí'],
  ['src/ventas/config.py', 2, 'Rutas relativas a la raíz (con pathlib) y constantes como la semilla. Ninguna ruta absoluta en el resto del código.', 'sí'],
  ['src/ventas/limpieza.py', 2, 'Funciones puras: DataFrame → DataFrame. La lectura de archivos va en una función aparte.', 'sí'],
  ['src/ventas/pipeline.py', 2, 'El punto de entrada: python -m ventas.pipeline lleva de los datos crudos a los resultados.', 'sí'],
  ['tests/test_limpieza.py', 1, 'Pruebas de pytest: casos límite, decisiones de limpieza, propiedades con semilla fija, «la versión rápida da lo mismo que la lenta».', 'sí'],
  ['figuras/', 1, 'Figuras generadas por el código. Pueden ir a Git si el README las muestra.', 'según el caso'],
  ['.venv/', 1, 'El entorno virtual. Depende de tu máquina y de rutas absolutas: nunca a Git. Se reconstruye con requirements.txt (y tu carpeta de ruedas, sin conexión).', 'NUNCA'],
];

export default function (cuerpo) {
  const lista = el('div', { role: 'list', style: 'font: 400 .9rem/1.2 var(--f-mono); display:grid; gap:2px' });
  const panel = el('div', { class: 'w-narra', 'aria-live': 'polite' });
  const botones = ARBOL.map(([nombre, nivel, texto, git], i) => {
    const b = el('button', { type: 'button', role: 'listitem', class: 'w-boton', style: `text-align:left; margin-left:${nivel * 1.6}rem; font-family: var(--f-mono); font-weight:400; padding:.38rem .6rem; justify-self:start`, html: `${nivel ? '└ ' : ''}${nombre}` });
    b.addEventListener('click', () => elegir(i));
    lista.append(b);
    return b;
  });
  function elegir(i) {
    const [nombre, , texto, git] = ARBOL[i];
    botones.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    const color = git.startsWith('NUNCA') || git.startsWith('no') ? 'var(--rojo-t)' : git === 'sí' ? 'var(--verde-t)' : 'var(--naranja-t)';
    panel.innerHTML = `<b><code>${nombre}</code></b> — ${texto}<br><span style="font: 600 .85rem/1.6 var(--f-titulo); color:${color}">¿A Git? ${git}</span>`;
  }
  cuerpo.append(el('div', { class: 'w-dos' }, lista, panel));
  elegir(0);
}
