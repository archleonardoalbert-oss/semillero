// Diferencias por párrafos entre dos versiones de un enunciado (para «Ver cambios» del taller).
// Un bloque $$…$$ o ``` … ``` cuenta como un solo párrafo aunque tenga líneas en blanco dentro.
function parrafos(md) {
  const lineas = String(md ?? '').replace(/\r\n/g, '\n').split('\n');
  const salida = [];
  let actual = [];
  let dentro = null;
  const cerrar = () => {
    if (actual.length && actual.join('\n').trim()) salida.push(actual.join('\n').trim());
    actual = [];
  };
  for (const l of lineas) {
    const valla = l.trim().startsWith('```') ? '```' : l.trim() === '$$' ? '$$' : null;
    if (dentro) {
      actual.push(l);
      if (valla === dentro) dentro = null;
      continue;
    }
    if (valla) {
      actual.push(l);
      dentro = valla;
      continue;
    }
    if (!l.trim()) cerrar();
    else actual.push(l);
  }
  cerrar();
  return salida;
}

export function diferencias(antes, despues) {
  const a = parrafos(antes);
  const b = parrafos(despues);
  // LCS clásica sobre párrafos.
  const m = a.length;
  const n = b.length;
  const t = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) t[i][j] = a[i] === b[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  const r = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      r.push({ tipo: 'igual', texto: a[i] });
      i++;
      j++;
    } else if (t[i + 1][j] >= t[i][j + 1]) r.push({ tipo: 'quitado', texto: a[i++] });
    else r.push({ tipo: 'nuevo', texto: b[j++] });
  }
  while (i < m) r.push({ tipo: 'quitado', texto: a[i++] });
  while (j < n) r.push({ tipo: 'nuevo', texto: b[j++] });
  return r;
}
