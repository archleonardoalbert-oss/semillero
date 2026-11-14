// Elegir la variante de PyTorch 2.13: dos números deciden (capacidad de cómputo de la GPU y versión de CUDA que
// admite el controlador). Las capas del entorno se colorean según encajen o no.
import { C, lienzo, mandos, selector, el } from './motor.js';

const GPUS = [
  ['gtx1050ti', 'GTX 1050 Ti (Pascal)', 6.1], ['gtx1060', 'GTX 1060 6 GB (Pascal)', 6.1], ['gtx1650', 'GTX 1650 (Turing)', 7.5],
  ['gtx1660', 'GTX 1660 Ti / Super (Turing)', 7.5], ['rtx2060', 'RTX 2060 (Turing)', 7.5], ['rtx3050', 'RTX 3050 Laptop (Ampere)', 8.6],
  ['rtx3060', 'RTX 3060 Laptop 6 GB (Ampere)', 8.6], ['rtx4050', 'RTX 4050 Laptop (Ada)', 8.9], ['rtx4060', 'RTX 4060 Laptop (Ada)', 8.9],
  ['ninguna', 'sin GPU NVIDIA', null],
];
const DRIVERS = [['nada', 'nvidia-smi: command not found'], ['11.8', 'CUDA Version: 11.8'], ['12.4', 'CUDA Version: 12.4'], ['12.8', 'CUDA Version: 12.8'], ['13.0', 'CUDA Version: 13.0'], ['13.2', 'CUDA Version: 13.2']];

export default function (cuerpo) {
  const e = { gpu: 'gtx1660', driver: '13.0' };
  const L = lienzo(cuerpo, { alto: 300, etiqueta: 'Capas del entorno de PyTorch con GPU' });
  const salida = el('div');
  const m = mandos(cuerpo);
  selector(m, { nombre: 'tu GPU', opciones: GPUS.map(([v, t]) => [v, t]), valor: e.gpu, alCambiar: (v) => { e.gpu = v; act(); } });
  selector(m, { nombre: 'nvidia-smi dice', opciones: DRIVERS, valor: e.driver, alCambiar: (v) => { e.driver = v; act(); } });
  cuerpo.append(salida);

  function decidir() {
    const [, nombre, cap] = GPUS.find(([v]) => v === e.gpu);
    const drv = e.driver === 'nada' ? null : Number(e.driver);
    if (cap == null) return { var: 'cpu', nombre, cap, drv, ok: [true, true, true, true, true], texto: 'Sin GPU NVIDIA: instala la variante de CPU. Todo el curso hasta aprendizaje profundo funciona igual; para redes grandes harás falta otra máquina.' };
    if (drv == null) return { var: null, nombre, cap, drv, ok: [true, true, true, false, true], texto: 'Primero el controlador: sin <code>nvidia-smi</code> ninguna variante verá la GPU. Instálalo desde el gestor de paquetes de tu sistema (en Linux) o desde NVIDIA (en Windows) y vuelve a comprobar.' };
    if (drv < 12) return { var: null, nombre, cap, drv, ok: [true, true, false, false, true], texto: `El controlador (CUDA ${drv}) es demasiado antiguo para cualquier variante de PyTorch 2.13: <code>cu126</code> pide un controlador de la serie 525 o posterior. Actualízalo.` };
    if (cap < 7.5) return { var: 'cu126', nombre, cap, drv, ok: [true, true, true, true, true], texto: `GPU Pascal (capacidad ${cap}): solo las variantes de CUDA 12 traen código para ella, aunque tu controlador admita CUDA ${drv}. Usa <code>cu126</code>, fija PyTorch 2.13 o 2.14 y <b>guarda las ruedas</b>: desde la 2.15 no habrá variante de CUDA 12.`, aviso: true };
    if (drv >= 13) return { var: 'cu130', nombre, cap, drv, ok: [true, true, true, true, true], texto: `Capacidad ${cap} y controlador con CUDA ${drv}: <code>cu130</code>, la variante por defecto y la que seguirá recibiendo versiones nuevas.` };
    return { var: 'cu126', nombre, cap, drv, ok: [true, true, true, true, true], texto: `Capacidad ${cap}, pero el controlador solo llega a CUDA ${drv}: <code>cu126</code> (funciona con cualquier controlador de CUDA 12). Si actualizas el controlador a la serie 580 o posterior, podrás usar <code>cu130</code>.` };
  }

  function act() {
    const D = decidir();
    const capas = [
      ['Tu código', "import torch; x.to('cuda')", 'lo escribes tú'],
      ['torch (la rueda de PyTorch)', D.var ? `torch-2.13.0+${D.var}…whl` : '¿qué variante?', 'pip, dentro del venv'],
      ['Bibliotecas CUDA en ruedas', D.var === 'cpu' ? 'no hacen falta' : D.var === 'cu130' ? 'nvidia-*-cu13 (cuBLAS, cuDNN…)' : 'nvidia-*-cu12 (cuBLAS, cuDNN…)', 'pip, dentro del venv'],
      ['Controlador NVIDIA', D.drv ? `admite hasta CUDA ${D.drv}` : D.cap == null ? 'no aplica' : 'no instalado', 'sistema operativo, una vez'],
      ['GPU', D.cap == null ? 'sin GPU NVIDIA' : `${D.nombre}, capacidad ${D.cap}`, 'hardware'],
    ];
    L.dibujar((g) => {
      capas.forEach(([t, s, q], i) => {
        const y = 12 + i * 56, ok = D.ok[i];
        const col = !ok ? C.rojo : i < 3 ? (i === 2 ? C.naranja : C.azul) : i === 3 ? C.rosa : C.tenue;
        g.rect(20, y, 480, 46, { color: col, alfa: 0.12, radio: 6 });
        g.rect(20, y, 480, 46, { color: col, relleno: false, ancho: 1.6, radio: 6 });
        g.texto(36, y + 16, t, { tam: 14, ancla: 'l', peso: 700 });
        g.texto(36, y + 34, s, { fuente: 'mono', tam: 11.5, ancla: 'l', color: C.tinta2 });
        g.texto(520, y + 23, q, { tam: 12, ancla: 'l', color: C.tinta2 });
        g.texto(690, y + 23, ok ? '✓' : '✗ revisar', { tam: 14, ancla: 'l', color: ok ? C.verdeT : C.rojoT, peso: 700 });
      });
    });
    const orden = D.var ? `pip download -d ~/ruedas/py312 \\\n    --index-url https://download.pytorch.org/whl/${D.var} \\\n    --extra-index-url https://pypi.org/simple \\\n    -r requirements.in` : '# primero arregla el controlador';
    salida.innerHTML = `<div class="w-narra">${D.texto}</div><pre class="w-csv" style="margin-top:.6rem">${orden}</pre>`;
    L.etiquetar(`GPU ${D.nombre}; ${D.var ? `variante recomendada ${D.var}` : 'hay que arreglar el controlador'}.`);
  }
  act();
}
