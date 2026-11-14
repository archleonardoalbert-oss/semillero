// Simulador de lectura de un CSV «a la cubana»: cada parámetro de read_csv cambia los tipos, los faltantes y,
// al final, el total por tienda. Muestra por qué un número falso no da ningún error.
import { el, mandos, selector, boton } from './motor.js';

const CRUDO = `fecha;tienda;producto;unidades;precio
03/01/2026;Centro;Arroz 1kg;12;250,00
03/01/2026;centro ;arroz 1kg;3;250,00
04/01/2026;Playa;Aceite 1L;-;890,50
04/01/2026;Playa;Aceite 1L;-;890,50
05/01/2026;Cerro;Pollo 1kg;5;9999
13/01/2026;Centro;Café 250g;2;1.200,00`;

export default function (cuerpo) {
  const e = { sep: ',', decimal: '.', miles: '', na: false, fecha: 'texto', limpiar: false, centinela: false, duplicados: false };
  const crudo = el('pre', { class: 'w-csv', texto: CRUDO });
  const codigo = el('pre', { class: 'w-csv' });
  const salida = el('div');
  cuerpo.append(el('div', { class: 'w-dos' }, el('div', {}, el('div', { class: 'w-lectura', texto: 'ventas.csv, tal como llega' }), crudo), el('div', {}, el('div', { class: 'w-lectura', texto: 'tu código' }), codigo)));
  const m1 = mandos(cuerpo);
  selector(m1, { nombre: 'sep', opciones: [[',', '","  (por defecto)'], [';', '";"']], valor: e.sep, alCambiar: (v) => { e.sep = v; act(); } });
  selector(m1, { nombre: 'decimal', opciones: [['.', '"."  (por defecto)'], [',', '","']], valor: e.decimal, alCambiar: (v) => { e.decimal = v; act(); } });
  selector(m1, { nombre: 'thousands', opciones: [['', 'None  (por defecto)'], ['.', '"."']], valor: e.miles, alCambiar: (v) => { e.miles = v; act(); } });
  const m2 = mandos(cuerpo);
  boton(m2, 'na_values=["-"]', (v) => { e.na = v; act(); }, { alternar: false });
  selector(m2, { nombre: 'fechas', opciones: [['texto', 'dejar como texto'], ['dmy', 'to_datetime(format="%d/%m/%Y")'], ['mdy', 'to_datetime(format="%m/%d/%Y")']], valor: e.fecha, alCambiar: (v) => { e.fecha = v; act(); } });
  const m3 = mandos(cuerpo);
  boton(m3, 'normalizar texto', (v) => { e.limpiar = v; act(); }, { alternar: false });
  boton(m3, '9999 → NaN', (v) => { e.centinela = v; act(); }, { alternar: false });
  boton(m3, 'drop_duplicates()', (v) => { e.duplicados = v; act(); }, { alternar: false });
  cuerpo.append(salida);

  function numero(t) {
    let s = t.trim();
    if (e.miles) s = s.split(e.miles).join('');
    if (e.decimal === ',') s = s.replace(',', '.');
    return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
  }
  function fecha(t) {
    const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    const [d, mo] = e.fecha === 'dmy' ? [+m[1], +m[2]] : [+m[2], +m[1]];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${m[3]}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function act() {
    const args = [`"ventas.csv"`];
    if (e.sep !== ',') args.push(`sep="${e.sep}"`);
    if (e.decimal !== '.') args.push(`decimal="${e.decimal}"`);
    if (e.miles) args.push(`thousands="${e.miles}"`);
    if (e.na) args.push('na_values=["-"]');
    const lineasCodigo = [`df = pd.read_csv(${args.join(', ')})`];
    if (e.fecha !== 'texto') lineasCodigo.push(`df["fecha"] = pd.to_datetime(df["fecha"], format="${e.fecha === 'dmy' ? '%d/%m/%Y' : '%m/%d/%Y'}", errors="coerce")`);
    if (e.limpiar) lineasCodigo.push('df["tienda"] = df["tienda"].str.strip().str.title()', 'df["producto"] = df["producto"].str.strip().str.lower()');
    if (e.centinela) lineasCodigo.push('df.loc[df["precio"] == 9999, "precio"] = float("nan")');
    if (e.duplicados) lineasCodigo.push('df = df.drop_duplicates()');
    lineasCodigo.push('df["importe"] = df["unidades"] * df["precio"]', 'df.groupby("tienda")["importe"].sum()');
    codigo.textContent = lineasCodigo.join('\n');

    const lineas = CRUDO.split('\n');
    const cab = lineas[0].split(e.sep);
    const filas = lineas.slice(1).map((l) => l.split(e.sep));
    const malas = filas.findIndex((f) => f.length !== cab.length);
    if (malas >= 0) {
      salida.innerHTML = `<p class="w-error">ParserError: Error tokenizing data. C error: Expected ${cab.length} fields in line ${malas + 2}, saw ${filas[malas].length}</p><p>Con <code>sep=","</code>, pandas ve la cabecera como <b>una sola columna</b> («${lineas[0]}») y luego encuentra comas decimales que parecen separadores. Un CSV exportado de un Excel en español usa casi siempre <code>;</code>, porque la coma ya es el separador decimal.</p>`;
      return;
    }
    // columnas: inferir tipo
    const cols = cab.map((nombre, k) => {
      const crudoCol = filas.map((f) => f[k]);
      const faltante = crudoCol.map((v) => v.trim() === '' || (e.na && v.trim() === '-'));
      if (nombre === 'fecha' && e.fecha !== 'texto') {
        const vals = crudoCol.map((v) => fecha(v));
        return { nombre, dtype: 'datetime64[us]', vals: vals.map((v) => v ?? 'NaT'), nan: vals.map((v) => v == null) };
      }
      const nums = crudoCol.map((v, i) => (faltante[i] ? NaN : numero(v)));
      const esNum = nums.every((v) => v !== null);
      if (esNum) {
        const hayNaN = nums.some((v) => Number.isNaN(v));
        const enteros = nums.every((v) => Number.isNaN(v) || Number.isInteger(v)) && !crudoCol.some((v) => v.includes(e.decimal === ',' ? ',' : '.'));
        return { nombre, dtype: enteros && !hayNaN ? 'int64' : 'float64', vals: nums, nan: nums.map((v) => Number.isNaN(v)) };
      }
      let vals = crudoCol.map((v, i) => (faltante[i] ? 'NaN' : v));
      if (e.limpiar && nombre === 'tienda') vals = vals.map((v) => v.trim().replace(/^./, (c) => c.toUpperCase()).replace(/(?<=.)\w+/, (w) => w.toLowerCase()));
      if (e.limpiar && nombre === 'producto') vals = vals.map((v) => v.trim().toLowerCase());
      return { nombre, dtype: 'str', vals, nan: faltante };
    });
    const col = Object.fromEntries(cols.map((c) => [c.nombre, c]));
    if (e.centinela && col.precio.dtype !== 'str') col.precio.vals = col.precio.vals.map((v) => (v === 9999 ? NaN : v));
    if (e.centinela && col.precio.dtype !== 'str') col.precio.nan = col.precio.vals.map((v) => Number.isNaN(v));
    let indices = filas.map((_, i) => i);
    if (e.duplicados) {
      const vistos = new Set();
      indices = indices.filter((i) => { const k = cols.map((c) => String(c.vals[i])).join('|'); if (vistos.has(k)) return false; vistos.add(k); return true; });
    }
    // tabla
    const fmtV = (c, i) => (c.nan[i] ? (c.dtype.startsWith('datetime') ? 'NaT' : 'NaN') : typeof c.vals[i] === 'number' ? String(c.vals[i]) : c.vals[i]);
    const tabla = `<table class="w-tabla"><tr><th></th>${cols.map((c) => `<th>${c.nombre}<br><span style="font-weight:400;color:${c.dtype === 'str' && ['unidades', 'precio'].includes(c.nombre) ? 'var(--rojo-t)' : 'var(--tenue)'}">${c.dtype}</span></th>`).join('')}</tr>${indices.map((i) => `<tr><td>${i}</td>${cols.map((c) => `<td class="${c.nan[i] ? 'nan' : ''} ${c.dtype === 'str' ? 'txt' : ''}">${fmtV(c, i)}</td>`).join('')}</tr>`).join('')}</table>`;
    // problemas y total por tienda
    const problemas = [];
    if (col.unidades.dtype === 'str' || col.precio.dtype === 'str') problemas.push(`<b>${['unidades', 'precio'].filter((n) => col[n].dtype === 'str').join(' y ')}</b> ${col.unidades.dtype === 'str' && col.precio.dtype === 'str' ? 'son' : 'es'} texto: ${col.unidades.dtype === 'str' ? 'el «-» impide convertir unidades' : ''}${col.unidades.dtype === 'str' && col.precio.dtype === 'str' ? '; ' : ''}${col.precio.dtype === 'str' ? 'la coma decimal o el punto de miles impiden convertir precio' : ''}.`);
    if (e.fecha === 'mdy') problemas.push('Con <code>%m/%d/%Y</code>, «03/01/2026» se lee como 1 de marzo y «13/01/2026» no encaja (NaT): <b>el formato es día/mes</b>.');
    if (e.fecha === 'texto') problemas.push('<b>fecha</b> sigue siendo texto: no se puede agrupar por semana ni ordenar bien.');
    const tiendas = new Set(indices.map((i) => col.tienda.vals[i]));
    if (tiendas.size > 3) problemas.push(`Hay <b>${tiendas.size} «tiendas»</b> donde hay 3: ${[...tiendas].map((t) => `«${t}»`).join(', ')}.`);
    if (!e.centinela && col.precio.dtype !== 'str') problemas.push('El <b>9999</b> del pollo es un centinela («sin precio»), no un precio.');
    if (!e.duplicados) problemas.push('Las filas 2 y 3 son <b>idénticas</b>: ¿dos ventas iguales o una exportación doble? Hay que preguntarlo.');
    let total = '';
    if (col.unidades.dtype !== 'str' && col.precio.dtype !== 'str') {
      const sumas = new Map();
      for (const i of indices) {
        const t = col.tienda.vals[i], imp = col.unidades.vals[i] * col.precio.vals[i];
        const s = sumas.get(t) ?? { suma: 0, validos: 0, filas: 0 };
        s.filas++; if (!Number.isNaN(imp)) { s.suma += imp; s.validos++; }
        sumas.set(t, s);
      }
      total = `<table class="w-tabla" style="margin-top:.6rem"><tr><th>tienda</th><th>sum</th><th>count</th><th>size</th></tr>${[...sumas].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([t, s]) => `<tr><td class="txt">«${t}»</td><td>${s.suma.toLocaleString('es', { minimumFractionDigits: 1 })}</td><td>${s.validos}</td><td>${s.filas}</td></tr>`).join('')}</table><p class="w-lectura">Ojo: <code>sum</code> de un grupo sin ningún valor válido da <b>0</b>, no «no sé». Compara <code>count</code> (valores válidos) con <code>size</code> (filas), o usa <code>sum(min_count=1)</code>.</p>`;
    } else total = '<p class="w-error">TypeError al multiplicar: no se pueden multiplicar columnas de texto. (Si una sola fuera texto, pandas también fallaría.)</p>';
    salida.innerHTML = `<div class="tabla" style="margin:.8rem 0 .4rem">${tabla}</div>${problemas.length ? `<ul class="w-lectura" style="font-family:var(--f-texto);font-size:.93rem;padding-left:1.2rem">${problemas.map((p) => `<li>${p}</li>`).join('')}</ul>` : '<p class="w-ok">Sin problemas pendientes: tipos correctos, texto normalizado, centinela y duplicado resueltos.</p>'}<div class="w-lectura"><b>df.groupby("tienda")["importe"].agg(["sum", "count", "size"])</b></div>${total}`;
  }
  act();
}
