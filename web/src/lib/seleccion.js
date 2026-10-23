// Selección del panel de análisis: idea a idea, por carpeta o todas de golpe.
export function crearSeleccion(grupos) {
  const marcadas = new Set();
  const k = (c, i) => `${c}/${i}`;
  const ideasDe = (c) => grupos.find((g) => g.carpeta.id === c)?.ideas ?? [];
  const todas = () => grupos.flatMap((g) => g.ideas.map((i) => k(g.carpeta.id, i.id)));

  function estadoDe(claves) {
    const n = claves.filter((x) => marcadas.has(x)).length;
    return n === 0 ? 'ninguna' : n === claves.length ? 'todas' : 'parcial';
  }

  function alternarGrupo(claves) {
    const marcar = estadoDe(claves) !== 'todas';
    for (const x of claves) marcar ? marcadas.add(x) : marcadas.delete(x);
  }

  return {
    marcadas,
    marcada: (c, i) => marcadas.has(k(c, i)),
    alternarIdea(c, i) {
      const x = k(c, i);
      marcadas.has(x) ? marcadas.delete(x) : marcadas.add(x);
    },
    alternarCarpeta: (c) => alternarGrupo(ideasDe(c).map((i) => k(c, i.id))),
    alternarTodas: () => alternarGrupo(todas()),
    estadoCarpeta: (c) => estadoDe(ideasDe(c).map((i) => k(c, i.id))),
    estadoTodas: () => estadoDe(todas()),
    refs: () =>
      grupos.flatMap((g) => g.ideas.filter((i) => marcadas.has(k(g.carpeta.id, i.id))).map((i) => ({ carpetaId: g.carpeta.id, ideaId: i.id }))),
  };
}
