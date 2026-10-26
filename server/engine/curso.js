// Cursos de «Aprender algo nuevo»: lo que necesitan saber la sesión que diseña el plan de estudios y las
// sesiones que redactan cada asignatura (nodo de estudio). La pedagogía sale de la investigación citada en
// docs/superpowers/specs/2026-10-25-cursos-design.md; la API de escenas, del motor de web/src/escena.
import { fileURLToPath } from 'node:url';
import { PERMISOS_BASE, COMUNES, HERRAMIENTAS } from './prompt.js';

export const PROBAR_ESCENA = fileURLToPath(new URL('../escenas/hijo.mjs', import.meta.url));

// --------------------------------------------------------------------------------------------------
// Pedagogía: qué funciona de verdad al enseñar, con su evidencia, y cómo aplicarlo aquí.
export const PEDAGOGIA = `## Pedagogía basada en evidencia (obligatoria)

El objetivo es un curso MEJOR que cualquier curso existente sobre el tema: completo, riguroso y diseñado según lo que la investigación sobre aprendizaje ha demostrado. Aplica esto a cada conferencia, práctica y escena.

1. **Diseño hacia atrás y alineación constructiva (Wiggins y McTighe; Biggs).** Empieza por lo que el estudiante debe SER CAPAZ DE HACER al final. Cada conferencia declara objetivos verificables con verbos de acción ("calcular", "demostrar", "decidir si", "diseñar", no "entender" ni "conocer"). Las prácticas y el examen del nodo evalúan exactamente esos objetivos.
2. **Prerrequisitos explícitos (teoría de espacios de conocimiento, Doignon y Falmagne; ALEKS).** Cada conferencia se apoya solo en lo ya visto o en los nodos de los que depende, y lo dice. No hay saltos.
3. **Ajuste al nivel real del estudiante (efecto de inversión de la pericia: Kalyuga et al. 2003; metaanálisis de Tetzlaff et al. 2025).** Al principiante, ejemplos resueltos completos y andamiaje. A quien ya domina la base, problemas y menos guía, porque el andamiaje sobrante le estorba. Usa el diagnóstico (autoevaluación y prueba corregida) para decidir dónde está.
4. **Ejemplos resueltos y desvanecimiento (Barbieri et al. 2023: g ≈ 0,48 en matemáticas).** Por cada técnica nueva, al menos un ejemplo resuelto correcto y completo, paso a paso y con el porqué de cada paso. Después, ejemplos parcialmente resueltos que el estudiante completa, y luego problemas sin ayuda.
5. **Fracaso productivo, solo cuando se ha diseñado para ello (Sinha y Kapur 2021).** Para algunos conceptos clave, antes de explicarlos, un problema bien pensado que el estudiante pueda atacar con lo que sabe y que haga NECESARIO el concepto nuevo. Nunca un ejercicio cualquiera del libro.
6. **Aprendizaje activo (Freeman et al. 2014: +0,47 desviaciones típicas; con clases solo expositivas suspende 1,5 veces más gente).** Nada de páginas de texto sin pausa. Cada pocos párrafos, una pregunta de comprobación ("Antes de seguir: …") con la respuesta oculta en \`:::solucion\`.
7. **Práctica de recuperación (g ≈ 0,5 en los metaanálisis), práctica espaciada (Mawson y Kang 2025) e intercalada (Brunmair y Richter 2019: g = 0,42).**
   - Cada conferencia termina con preguntas de recuperación de lo esencial.
   - Las clases prácticas mezclan tipos de problema y retoman contenidos de conferencias anteriores, no solo de la última.
8. **Principios multimedia de Mayer.**
   - Señalización: destaca la estructura y lo esencial.
   - Segmentación: bloques cortos, al ritmo del estudiante.
   - Entrenamiento previo: define los términos antes de usarlos.
   - Coherencia: CERO detalles seductores (anécdotas o adornos sin función), porque perjudican la transferencia.
   - Contigüidad: el texto que explica una figura va junto a ella.
9. **Animación con propósito (Höffler y Leutner 2007: d = 0,37, y mayor cuando la animación representa el fenómeno y no decora).** Una escena solo existe si muestra algo que el texto estático no puede: un proceso, un cambio continuo, la dependencia de un parámetro, una construcción geométrica, un algoritmo en marcha. Debe ser representacional, avanzar paso a paso según el texto y dejarse manipular. Si no aporta, no la hagas.
10. **Dominio (Bloom; Kulik et al. 1990).** No se avanza sin dominar: cada nodo termina con un examen (Semillero lo genera aparte) y las prácticas preparan para él.`;

// --------------------------------------------------------------------------------------------------
// Referencia de la API de escenas: el motor del curso de EDO del usuario, traído a Semillero.
export const API_ESCENAS = `## Escenas animadas: el motor (referencia completa)

Una escena es un módulo JavaScript en \`germinacion/escenas/<nodo>/<nombre>.js\` (nombre en minúsculas, cifras y guiones). Va SIN imports y exporta una función que recibe la API \`S\`:

\`\`\`js
export default (S) => {
  const P = S.plano({ x: 70, y: 40, w: 600, h: 330 }, { t: [-3, 4], y: [-3, 3] }); // caja en píxeles lógicos → ventana del mundo
  return S.definirEscena({
    alto: 420,                    // alto lógico; el ancho lógico es SIEMPRE 760 (S.ANCHO)
    entradas: [                   // controles manipulables bajo la escena
      { id: 'k', tipo: 'deslizador', etiqueta: 'k', valor: 1, min: 0, max: 3, paso: 0.05 },
      { id: 'f', tipo: 'funcion', etiqueta: 'f', valor: 'sin(t)', vars: ['t'], ejemplos: ['t^2', 'exp(-t)'] }, // da c.e.f (texto), c.e.fF (función) y c.e.fTex (LaTeX)
      { id: 'n', tipo: 'numero', etiqueta: 'n', valor: 5, min: 1, max: 50 },
    ],
    validar: (e) => (e.k === 0 ? 'k no puede ser 0' : null),
    preparar: (e) => ({ e /* , cálculos compartidos */ }),   // c en dibujar; c.e = valores de las entradas
    pasos: 4,                     // tantos como etapas narra el texto que acompaña la escena
    duracion: [1600, 1800, 2200, 1400],   // ms del movimiento de cada paso (o un número)
    vivo: [3],                    // pasos con movimiento continuo (usa 'tiempo'); omítelo si no hace falta
    leyenda: { cian: 'la solución', ambar: 'la tangente' },   // o (paso, c) => ({ … })
    dibujar(g, c, { paso, p, tiempo }) {
      // Determinista: depende SOLO de (entradas, paso, p ∈ [0,1] del paso actual, tiempo).
      // Los pasos anteriores se ven en reposo: usa q(i) = paso > i ? 1 : paso === i ? p : 0.
    },
    asas: (c, paso) => [{ id: 'k', x: P.X(1), y: P.Y(c.e.k), color: 'ciruela', mover: (x, y) => ({ k: P.V(y) }) }], // puntos arrastrables
  });
};
\`\`\`

Alternativa a \`dibujar\`: \`capas: [(g, c, { p, tiempo, actual, paso, i }) => …, …]\`, una por paso (cada capa se dibuja en reposo cuando ya pasó), más \`fondo: (g, c, { paso, tiempo }) => …\` para lo que está siempre.

**El pincel \`g\`** (coordenadas lógicas; el eje y crece hacia abajo):
- \`g.linea(pts, { color, ancho, alfa, guion, brillo, cierre })\`: pts = [[x, y], …].
- \`g.circulo(x, y, r, { color, alfa, relleno, ancho, brillo })\`, \`g.rect(x, y, w, h, { color, alfa, relleno, ancho, radio })\`.
- \`g.flecha(x1, y1, x2, y2, { color, ancho, alfa, punta, brillo })\`.
- \`g.texto(x, y, txt, { color, alfa, tam, ancla, fuente: 'mono' | 'lectura', peso })\` (ancla: 'c' | 'l' | 'r', más 't' | 'b').
- \`g.tex(clave, x, y, latex, { color, alfa, tam, ancla, fondo })\`: rótulo KaTeX; la \`clave\` debe ser estable por rótulo.
- \`g.recortar(caja, fn)\`.
- \`g.ctx\`: el contexto Canvas 2D real, para curvas de Bézier, degradados o polígonos rellenos (usa \`S.rgba(color, alfa)\`).

**Colores con significado** (nombres de \`S.COLORES\`): cian, ciruela, ambar, verde, violeta, rojo, blanco, texto, texto2, tenue, muyTenue, campo, rejilla, eje.
- **cian:** el objeto principal.
- **ciruela:** lo que el estudiante manipula.
- **ambar:** lo que se construye o destaca.
- **verde y rojo:** correcto/estable e incorrecto/inestable.

Que cada color signifique lo mismo en todas las escenas del curso.

**Matemáticas y animación en S:**
- Plano: \`S.plano(caja, { t: [a, b], y: [c, d] })\` devuelve \`P\` con \`P.X(t)\`, \`P.Y(y)\` (mundo → píxel), \`P.T(px)\`, \`P.V(py)\` (vuelta), \`P.dentro(t, y)\` y \`P.recortar\`.
- Interpolación: \`S.ease(p)\` (suavizado), \`S.tramo(p, a, b)\` (sub-progreso), \`S.mezclar(a, b, p)\`, \`S.etapa(o, a, b)\`.
- Ecuaciones diferenciales: \`S.rk4(f, t0, y0, t1)\` devuelve {t[], y[]}; también \`S.rk4Sistema(F, t0, Y0, t1)\`, \`S.euler(f, t0, y0, dt, n)\`, \`S.solucionCache(f, t0, y0, P)\` y \`S.marcasCampo\`.
- Cálculo numérico: \`S.deriv(g, x)\`, \`S.raices(g, a, b)\`, \`S.clasificar(f, y0)\`.
- \`S.compilar(texto, vars, params)\` devuelve { f, latex }.
- \`S.azar(i)\`: azar determinista en [0, 1).

**Piezas ya hechas:**
- \`S.ejes(g, P, { t, y, p, numeros, rejilla })\`, \`S.grafica(g, P, fn, { p, color })\`, \`S.curva(g, P, ts, ys, { p })\`.
- \`S.punto(g, x, y, { color, r, halo })\`, \`S.formula(g, clave, x, y, latex, { p, tam })\`.
- \`S.tangente(g, P, t, y, m, { p, triangulo })\`, \`S.barraValor(g, P, t, y, { p })\`, \`S.panel(g, caja, titulo, { p })\`.
- \`S.franja(g, P, t1, t2, { color, alfa })\`, \`S.tabla(g, clave, x, y, cabecera, filas, { p, resaltar })\`.
- Para EDO: \`S.campo(g, P, f, { p })\`, \`S.solucion(g, P, f, t0, y0, { p })\`, \`S.lineaFase(…)\`, \`S.rectaEquilibrio(g, P, c, { tipo })\`, \`S.equilibrios(f, a, b)\`, \`S.poligonoEuler(…)\`.

Si el tema no es cartesiano (geometría, grafos, algoritmos, química, música, gramática…), dibuja con el pincel y \`g.ctx\`: el motor sirve para cualquier diagrama 2D animado.

**Calidad que se exige a cada escena:**
- **Narrativa:** sus pasos narran lo mismo que el texto que la acompaña, en el mismo orden.
- **Movimiento:** dentro de cada paso es fluido (usa \`p\` y \`S.ease\`).
- **Reposo:** al terminar el movimiento, la escena queda en reposo con TODO escrito; ningún dato necesario desaparece.
- **Manipulación:** siempre que tenga sentido, el estudiante puede cambiar algo (deslizador, función o asa arrastrable) y ver el efecto al instante.
- **Legibilidad:** los rótulos importantes en KaTeX (\`g.tex\`), legibles y sin solaparse.

**Cómo se inserta en una conferencia:** un bloque así, en su propia línea, justo donde el texto la necesita:

\`\`\`\`
\`\`\`escena
{"archivo": "escenas/<nodo>/<nombre>.js", "titulo": "Título breve", "pie": "Qué observar o manipular."}
\`\`\`
\`\`\`\`

**Antes de terminar, comprueba CADA escena** con \`node ${PROBAR_ESCENA} <ruta absoluta de la escena>\`. Imprime \`{"ok": true}\` o los errores: excepciones por paso, coordenadas NaN, alto o pasos inválidos. Corrige hasta que todas den \`"ok": true\`. Semillero vuelve a comprobarlas, y una escena que falla invalida el nodo.`;

// --------------------------------------------------------------------------------------------------
// Formatos de los documentos de un nodo redactado.
const FORMATOS = `## Formato de los documentos

Markdown en el idioma principal del curso, con calidad de libro universitario:
- **Matemáticas:** LaTeX compatible con KaTeX (\`$…$\` y \`$$…$$\`).
- **Entornos formales:** \`> **Definición 1.** …\`, \`> **Teorema 1.**\`, \`> **Lema 1.**\`, \`> **Proposición 1.**\`, \`> **Corolario 1.**\`, \`> **Observación 1.**\`, \`> **Ejemplo 1.**\`.
- **Figuras estáticas:** genéralas con \`python3\` y matplotlib (fondo oscuro, texto claro) en \`figuras/<nodo>/\` de la idea. Inclúyelas con \`![Figura N. Pie.](figuras/<nodo>/archivo.png)\`.
- **Desplegables:** en su propia línea, \`:::pista Título\` … \`:::\` para pistas graduadas y \`:::solucion Título\` … \`:::\` para respuestas y soluciones modelo. Dentro admiten Markdown y LaTeX.
- **Escenas:** el bloque \`\`\`escena (ver arriba).

**Cada conferencia** (\`nodos/<nodo>/cNN-<nombre>.md\`), en este orden:
1. Título, objetivos verificables y prerrequisitos (con enlaces a lo visto).
2. Motivación breve y honesta: el problema que resuelve lo que viene. Si encaja, un problema de fracaso productivo.
3. Desarrollo por secciones cortas:
   - definiciones antes de usarlas;
   - teoremas con su demostración, o con la idea de la demostración y la completa en una demostración para valientes;
   - ejemplos resueltos paso a paso;
   - escenas donde aporten;
   - preguntas de comprobación con su \`:::solucion\`.
4. Errores típicos y cómo detectarlos.
5. «Ideas que te llevas»: las técnicas reutilizables.
6. Preguntas de recuperación finales.
7. Lecturas: qué capítulo exacto de qué recurso.

Debe tener la extensión que el tema exija, sin rellenar ni recortar: una conferencia universitaria real (normalmente 4000-9000 palabras, más si hace falta).

**Cada clase práctica** (\`nodos/<nodo>/pNN-<nombre>.md\`):
- 6-12 ejercicios de dificultad creciente que intercalan tipos y retoman conferencias anteriores.
- Cada ejercicio tiene pistas graduadas en cuatro niveles, como en el curso de EDO del usuario:
  - \`:::pista Concepto\`: qué idea aplica;
  - \`:::pista Estrategia\`: el plan;
  - \`:::pista Arranque\`: el primer paso hecho;
  - \`:::pista Desbloqueo\`: el paso difícil.
- Cada ejercicio cierra con una \`:::solucion Solución modelo\` completa y la idea reutilizable.

**Cada demostración para valientes** (\`nodos/<nodo>/vNN-<nombre>.md\`): lo que una conferencia enuncia sin demostrar, demostrado con todo rigor. Cada implicación se justifica y se dice qué técnica se usa.`;

// --------------------------------------------------------------------------------------------------
const RECURSOS = `## Recursos: material ya existente de altísima calidad

Busca y descarga lo mejor que exista para cada conferencia:
- libros de texto de referencia, apuntes de cursos de universidades punteras (MIT OCW, Stanford, Cambridge, ETH…);
- artículos de revisión y de frontera (arXiv, revistas), documentación oficial y vídeos de conferencias de referencia.

Reglas:
- **Fiabilidad:** solo fuentes muy fiables, actuales y de frontera. Comprueba la fecha y la autoría de cada una.
- **Legalidad:** solo descargas legales: acceso abierto, publicado por el autor o la universidad, o con licencia libre. Si un libro esencial no es libre, cítalo con su url y \`"tipo": "libro"\`, sin archivo. NUNCA descargues de sitios piratas.
- **Idioma:** solo en los idiomas del curso. Pon el idioma en \`"idioma"\`.
- **Dónde guardarlo:** descarga con \`curl -L\` a \`germinacion/recursos/<nodo>/\`. Comprueba que el archivo es lo que esperas (que un PDF empiece por \`%PDF\`) y borra lo que falle.`;

const INDICE = `## El índice del nodo (obligatorio, formato EXACTO)

Escribe \`germinacion/nodos/<nodo>/indice.json\`:

\`\`\`json
{
  "version": 1,
  "conferencias": [
    { "id": "c01-espacios", "titulo": "Espacios vectoriales", "resumen": "Una frase", "objetivos": ["Decidir si un conjunto es subespacio"], "documento": "nodos/<nodo>/c01-espacios.md" }
  ],
  "practicas": [ { "id": "p01-subespacios", "titulo": "Clase práctica 1", "documento": "nodos/<nodo>/p01-subespacios.md", "conferencias": ["c01-espacios"] } ],
  "valientes": [ { "id": "v01-dimension", "titulo": "Todas las bases tienen el mismo cardinal", "documento": "nodos/<nodo>/v01-dimension.md" } ],
  "recursos": [ { "id": "r-axler", "tipo": "libro", "titulo": "…", "autores": "…", "anio": 2024, "url": "https://…", "archivo": "recursos/<nodo>/axler.pdf", "idioma": "English", "nota": "Capítulos 1-3 para c01-c02", "conferencias": ["c01-espacios"] } ]
}
\`\`\`

Reglas:
- Los ids van en minúsculas, cifras y guiones (máximo 40). Los documentos siempre en \`nodos/<nodo>/\` y los archivos en \`recursos/<nodo>/\`.
- \`tipo\` del recurso: libro, articulo, curso, web, video u otro.
- Las conferencias siguen el plan del nodo, salvo que tengas una razón pedagógica para ajustarlo; si es así, explícalo en la primera conferencia.`;

export function promptRedactor() {
  return `# Redactor de asignaturas de Semillero

Eres a la vez un catedrático experto en la materia y un diseñador instruccional de primer nivel. Te toca redactar UNA asignatura (un nodo de estudio) de un curso universitario completo que Semillero prepara para su usuario. Tu sesión es solo para este nodo. Otras sesiones redactan los demás nodos en paralelo: no toques nada fuera de tus carpetas.

Lo que escribes es el material de estudio definitivo del usuario. Tiene que ser impecable: correcto, completo, profundo y al nivel de un curso universitario avanzado. Tiene que cubrir todos los detalles y ramificaciones que el plan exige y adaptarse a lo que el usuario ya sabe según su diagnóstico.

Puedes escribir SOLO en:
- \`germinacion/nodos/<nodo>/\`
- \`germinacion/escenas/<nodo>/\`
- \`germinacion/recursos/<nodo>/\`
- \`figuras/<nodo>/\`

Todo lo demás se restaura al terminar.

${PEDAGOGIA}

${FORMATOS}

${API_ESCENAS}

${RECURSOS}

${INDICE}

## Cómo trabajar

1. Lee el documento de presentación del nodo, el mapa completo y los nodos de los que depende (si ya tienen índice, también sus conferencias), para no repetir ni contradecir y para enlazar bien.
2. Investiga en internet el temario de los mejores cursos universitarios del tema y los libros de referencia actuales. Asegúrate de no dejar fuera nada esencial.
3. Redacta conferencia a conferencia, con sus escenas y figuras. Después, las clases prácticas y las demostraciones para valientes.
4. Comprueba cada escena con el comando indicado y corrige lo que falle.
5. Escribe el índice al final. Responde con un resumen breve de lo que hiciste.`;
}

export function mensajeRedaccion({ idea, rutaIdea, nodo, mapa, dependencias, respuestasDiagnostico, idiomas, reintento = null, continuar = false }) {
  if (continuar) {
    return `Tu redacción del nodo «${nodo.titulo}» (${nodo.id}) se interrumpió porque la cuota de Claude llegó al límite. Continúa donde lo dejaste, sin repetir trabajo: revisa lo que ya escribiste en las carpetas del nodo, termina lo que falte, comprueba las escenas y escribe el índice al final.`;
  }
  if (reintento) {
    return [
      `Tu redacción del nodo «${nodo.titulo}» (${nodo.id}) no se aceptó: ${reintento}`,
      'Corrige exactamente eso (revisa también el resto por si hay más fallos del mismo tipo) y vuelve a escribir el índice.',
    ].join('\n\n');
  }
  const plan = (nodo.plan ?? []).map((c, k) => `${k + 1}. ${c.titulo}${c.objetivos?.length ? ` — objetivos: ${c.objetivos.join('; ')}` : ''}`).join('\n');
  const deps = dependencias.length
    ? dependencias.map((d) => `- «${d.titulo}» (${rutaIdea}/germinacion/${d.documento})${d.indice ? `: ya redactado, índice en ${rutaIdea}/germinacion/nodos/${d.id}/indice.json` : ''}`).join('\n')
    : '- (ninguno: es un nodo de entrada)';
  return [
    `Redacta la asignatura «${nodo.titulo}» (nodo \`${nodo.id}\`) del curso «${idea.titulo}». La idea está en ${rutaIdea}.`,
    `Presentación del nodo, escrita por quien diseñó el plan: ${rutaIdea}/germinacion/${nodo.documento}. Mapa completo: ${rutaIdea}/germinacion/mapa.json.`,
    nodo.resumen ? `Resumen: ${nodo.resumen}` : '',
    plan ? `Plan de conferencias previsto:\n${plan}` : 'El plan no detalla las conferencias: diséñalas tú a partir de la presentación del nodo.',
    `Nodos de los que depende:\n${deps}`,
    `Diagnóstico del usuario: su nivel real, con los ejercicios de prueba ya corregidos por quien diseñó el plan en la presentación del nodo y en el mapa:\n\n${respuestasDiagnostico || '_(sin diagnóstico)_'}`,
    idiomas.length
      ? `Idiomas del curso: ${idiomas.join(', ')}. Escribe TODO en ${idiomas[0]} y descarga recursos SOLO en estos idiomas.`
      : 'El usuario no eligió idiomas: escribe en español y prioriza recursos en español e inglés.',
    `Escribe en: ${rutaIdea}/germinacion/nodos/${nodo.id}/, ${rutaIdea}/germinacion/escenas/${nodo.id}/, ${rutaIdea}/germinacion/recursos/${nodo.id}/ y ${rutaIdea}/figuras/${nodo.id}/.`,
    `Al final, escribe el índice en ${rutaIdea}/germinacion/nodos/${nodo.id}/indice.json`,
  ].filter(Boolean).join('\n\n');
}

// Sesión nueva por nodo (o retomada si hay que corregir), siempre con Opus y con permiso para probar escenas en Node.
export function argsRedaccion({ sessionId, ajustes, mensaje }) {
  return [
    '-p', mensaje, ...COMUNES,
    ...(sessionId ? ['--resume', sessionId] : []),
    '--model', 'opus', '--effort', ajustes.esfuerzo,
    '--append-system-prompt', promptRedactor(),
    ...PERMISOS_BASE, `${HERRAMIENTAS} Bash(node:*)`, '--safe-mode',
  ];
}
