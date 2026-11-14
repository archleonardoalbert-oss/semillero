// El presupuesto de datos del mes: lo que cuesta montar el entorno (una vez) frente a lo que cuesta equivocarse.
import { C, lienzo, mandos, deslizador, boton, el, fmt, oscuro, alCambiarTema } from './motor.js';

export default function (cuerpo) {
  const e = { mes: 20, modelo: 1.2, otraPython: false, error: false, repetir: false };
  const L = lienzo(cuerpo, { alto: 170, etiqueta: 'Barra del consumo de datos del mes frente al presupuesto' });
  const lect = el('div', { class: 'w-lectura' });
  function dibujar() {
    const partes = [
      ['entorno del curso (peor caso)', 4, C.azul],
      ['margen del 25 % por cortes', 1, C.celeste],
      ...(e.otraPython ? [['ruedas para otro Python', 1.3, C.rosa]] : []),
      ...(e.error ? [['equivocarse de variante', 3, C.rojo]] : []),
      ...(e.repetir ? [['reinstalar sin carpeta de ruedas', 4, C.rojo]] : []),
      ['datos de las prácticas', 0.1, C.verde],
      ['modelo de Hugging Face', e.modelo, C.naranja],
      ['uso normal del mes', 3, C.tenue],
    ];
    const total = partes.reduce((a, p) => a + p[1], 0);
    const escala = 700 / Math.max(50, total);
    L.dibujar((g) => {
      let x = 30;
      partes.forEach(([n, gb, col]) => { const w = gb * escala; g.rect(x, 50, Math.max(1, w - 2), 44, { color: col, alfa: 0.85, radio: 3 }); if (w > 34) g.texto(x + w / 2, 72, fmt(gb, 1), { fuente: 'mono', tam: 11, color: oscuro() ? '#10141b' : '#fff', peso: 600 }); x += w; });
      const xp = 30 + e.mes * escala;
      g.linea([[xp, 30], [xp, 110]], { color: C.tinta, ancho: 2, guion: [5, 3] });
      g.texto(xp, 22, `tu presupuesto: ${e.mes} GB`, { tam: 12, color: C.tinta, peso: 600 });
      g.texto(30, 126, `total: ${fmt(total, 1)} GB`, { fuente: 'mono', tam: 13, ancla: 'l', color: total > e.mes ? C.rojoT : C.verdeT, peso: 600 });
      g.texto(30, 148, total > e.mes ? `te pasas en ${fmt(total - e.mes, 1)} GB` : `te quedan ${fmt(e.mes - total, 1)} GB para el resto del mes`, { tam: 12, ancla: 'l', color: C.tinta2 });
    });
    lect.innerHTML = partes.map(([n, gb, col]) => `<span><i style="display:inline-block;width:.7rem;height:.7rem;background:${col};border-radius:2px"></i> ${n}: ${fmt(gb, 1)} GB</span>`).join('');
  }
  const m = mandos(cuerpo);
  deslizador(m, { nombre: 'GB este mes', min: 10, max: 50, valor: e.mes, formato: (v) => `${v} GB`, alCambiar: (v) => { e.mes = v; dibujar(); } });
  deslizador(m, { nombre: 'modelo', min: 0, max: 5, paso: 0.1, valor: e.modelo, formato: (v) => `${fmt(v, 1)} GB`, alCambiar: (v) => { e.modelo = v; dibujar(); } });
  const m2 = mandos(cuerpo);
  boton(m2, 'un compañero con otro Python', (v) => { e.otraPython = v; dibujar(); }, { alternar: false });
  boton(m2, 'me equivoqué de variante', (v) => { e.error = v; dibujar(); }, { alternar: false });
  boton(m2, 'rompí el entorno y no guardé las ruedas', (v) => { e.repetir = v; dibujar(); }, { alternar: false });
  cuerpo.append(lect);
  alCambiarTema(dibujar);
  dibujar();
}
