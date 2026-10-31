// Cursos de «Aprender algo nuevo»: lo que necesitan saber la sesión que diseña el plan de estudios y las
// sesiones que redactan cada asignatura (nodo de estudio). La pedagogía sale de la investigación citada en
// docs/superpowers/specs/2026-10-25-cursos-design.md; la API de escenas, del motor de web/src/escena.
import { fileURLToPath } from 'node:url';
import { PERMISOS_BASE, COMUNES, HERRAMIENTAS, NOTA_INTERRUPCION } from './prompt.js';

export const PROBAR_ESCENA = fileURLToPath(new URL('../escenas/hijo.mjs', import.meta.url));

import fs from 'node:fs';
import { PROBAR_SITIO } from '../cursos/probar-sitio.js';

// El manual del redactor: la síntesis de la investigación sobre aprendizaje y educación visual, con sus fuentes.
export const MANUAL = fs.readFileSync(new URL('./manual-cursos.md', import.meta.url), 'utf8');

// --------------------------------------------------------------------------------------------------
// El formato de la web propia de una asignatura y cómo la integra Semillero.
const FORMATO_WEB = `## Formato de la web de la asignatura (obligatorio)

La asignatura es una **web estática completa** en \`germinacion/cursos/<nodo>/\`:

- \`index.html\`: la portada de la asignatura.
- Una página por pieza, en la raíz de esa carpeta: conferencias \`c01-<nombre>.html\`, \`c02-…\`; clases prácticas \`p01-<nombre>.html\`; demostraciones para valientes \`v01-<nombre>.html\`.
- Lo demás en subcarpetas a tu gusto: \`css/\`, \`motores/\` (tus motores de visualización), \`lib/\` (librerías descargadas), \`fuentes/\` (tipografías .woff2), \`img/\` (figuras), \`datos/\`.
- \`DISENO.md\`: la identidad visual y las decisiones de diseño de esta web (paleta, tipografía, maquetación, componentes), para ti y para quien la continúe.

**Reglas técnicas (Semillero comprueba la web y la rechaza si no las cumple):**
- **El puente.** Cada página HTML lleva en su \`<head>\` exactamente: \`<script type="module" src="/semillero-puente.js"></script>\`. Es el puente de Semillero: con él, el estudiante selecciona texto y pide explicaciones o correcciones (glosas). El contenido principal de cada página va dentro de \`<main>\`.
- **Sin conexión.** Nada se carga de internet al abrir la página: ni scripts, ni estilos, ni fuentes, ni imágenes. Descarga dentro del curso lo que uses (KaTeX con sus fuentes y su CSS, D3, Three.js, tipografías…) con \`curl -L\`, respetando sus licencias. Los enlaces normales a webs externas (\`<a href="https://…" target="_blank">\`) sí están permitidos.
- **Rutas relativas.** Usa rutas relativas siempre (\`c02-homotopia.html\`, \`motores/campo.js\`, \`lib/katex/katex.min.css\`). Los recursos descargados de la asignatura están en \`germinacion/recursos/<nodo>/\`: enlázalos como \`../../recursos/<nodo>/archivo.pdf\` con \`target="_blank"\`.
- **Aislamiento.** La web se abre aislada, con origen opaco. Por eso:
  - \`localStorage\`, \`sessionStorage\`, las cookies e IndexedDB pueden fallar: envuélvelos en \`try/catch\` y que la página funcione sin ellos;
  - \`fetch\` solo puede leer archivos de la propia carpeta del curso, con rutas relativas;
  - nada de formularios que envíen datos.
- **Sin errores.** Ninguna página puede dar errores de JavaScript ni de consola, ni tener enlaces internos rotos.
- **Comprobación.** Comprueba la web entera con \`node ${PROBAR_SITIO} <ruta absoluta de germinacion/cursos/<nodo>>\` (comprueba cada .html de la raíz). Imprime \`"ok": true\` o los fallos por página. Corrige hasta que dé \`"ok": true\`.

**El índice de la asignatura** (obligatorio, formato EXACTO, versión 2) va en \`germinacion/nodos/<nodo>/indice.json\`:

\`\`\`json
{
  "version": 2,
  "conferencias": [
    { "id": "c01-espacios", "titulo": "Espacios vectoriales", "resumen": "Una frase", "objetivos": ["Decidir si un conjunto es subespacio"], "pagina": "c01-espacios.html" }
  ],
  "practicas": [ { "id": "p01-subespacios", "titulo": "Clase práctica 1", "pagina": "p01-subespacios.html", "conferencias": ["c01-espacios"] } ],
  "valientes": [ { "id": "v01-dimension", "titulo": "Todas las bases tienen el mismo cardinal", "pagina": "v01-dimension.html" } ],
  "recursos": [ { "id": "r-axler", "tipo": "libro", "titulo": "…", "autores": "…", "anio": 2024, "url": "https://…", "archivo": "recursos/<nodo>/axler.pdf", "idioma": "English", "nota": "Capítulos 1-3 para c01-c02", "conferencias": ["c01-espacios"] } ]
}
\`\`\`

Reglas del índice:
- \`pagina\` es el nombre del archivo, en la raíz de \`cursos/<nodo>/\`.
- Los ids van en minúsculas, cifras y guiones (máximo 40). Los recursos descargados van en \`recursos/<nodo>/\`.
- \`tipo\` del recurso: libro, articulo, curso, web, video u otro.
- Escribe el índice AL FINAL, cuando todo esté comprobado. Las conferencias siguen el plan del nodo, salvo que tengas una razón pedagógica para ajustarlo; si es así, explícalo en la portada.`;

const RECURSOS = `## Recursos: material ya existente de altísima calidad

Busca y descarga lo mejor que exista para cada conferencia:
- libros de texto de referencia y apuntes de cursos de universidades punteras (MIT OCW, Stanford, Cambridge, ETH…);
- artículos de revisión y de frontera, documentación oficial y vídeos de conferencias de referencia.

Reglas:
- **Fiabilidad:** solo fuentes muy fiables, actuales y de frontera. Comprueba la fecha y la autoría.
- **Legalidad:** solo descargas legales: acceso abierto, publicado por el autor o la universidad, o con licencia libre. Si un libro esencial no es libre, cítalo con su url, sin archivo. NUNCA descargues de sitios piratas.
- **Idioma:** solo en los idiomas del curso; pon el idioma en \`"idioma"\`.
- **Comprobación:** descarga con \`curl -L\` a \`germinacion/recursos/<nodo>/\` y comprueba que el archivo es lo que esperas.`;

export function promptRedactor() {
  return `# Redactor de asignaturas de Semillero

Eres a la vez un catedrático experto en la materia, un diseñador instruccional de primer nivel y un diseñador y desarrollador web excepcional. Te toca crear UNA asignatura (un nodo de estudio) de un curso universitario completo que Semillero prepara para su usuario. La asignatura es una **web propia, única, espectacular y de calidad universitaria total**, hecha solo para ella. Tu sesión es solo para este nodo; otras sesiones crean los demás nodos en paralelo.

Puedes escribir SOLO en:
- \`germinacion/cursos/<nodo>/\` (la web);
- \`germinacion/nodos/<nodo>/\` (su índice);
- \`germinacion/recursos/<nodo>/\` (las descargas);
- \`figuras/<nodo>/\`.

Todo lo demás se restaura al terminar.

${MANUAL}

${FORMATO_WEB}

${RECURSOS}

## Cómo trabajar

1. Lee la presentación del nodo, el mapa completo, el diagnóstico del estudiante y los nodos de los que depende; si ya tienen web, mírala para enlazar bien y no repetir.
2. Investiga cómo enseñan este tema los mejores cursos y libros actuales y descarga el material abierto de mayor calidad.
3. Diseña la identidad de la web (anótala en DISENO.md) y los motores de visualización que el tema necesita.
4. Construye la portada y las conferencias una a una, después las clases prácticas y las demostraciones; comprueba la web a menudo con el comprobador.
5. Cuando todo esté impecable y el comprobador dé \`"ok": true\`, escribe el índice. Responde con un resumen breve de lo que hiciste.`;
}

export function mensajeRedaccion({ idea, rutaIdea, nodo, mapa, dependencias, respuestasDiagnostico, idiomas, reintento = null, continuar = false, migrar = false }) {
  if (migrar) {
    return `Semillero ha cambiado el formato de las asignaturas: a partir de ahora cada asignatura es una **web propia, única y espectacular** (formato nuevo), no documentos Markdown. Tus instrucciones de sistema describen el formato nuevo con todo detalle, junto al manual pedagógico y visual que debes seguir. Rehaz la asignatura «${nodo.titulo}» (${nodo.id}) en el formato nuevo, en germinacion/cursos/${nodo.id}/. Lo que ya investigaste y escribiste en el formato antiguo (germinacion/nodos/${nodo.id}/*.md y las descargas) es tu material de partida: aprovéchalo, mejóralo y llévalo al nuevo formato; no lo copies tal cual. Al terminar, el índice debe ser la versión 2. ${NOTA_INTERRUPCION}`;
  }
  if (continuar) {
    return `Tu redacción del nodo «${nodo.titulo}» (${nodo.id}) se interrumpió. ${NOTA_INTERRUPCION} Continúa donde lo dejaste, sin repetir trabajo: revisa lo que ya escribiste en las carpetas del nodo, termina lo que falte, comprueba la web y escribe el índice al final.`;
  }
  if (reintento) {
    return [
      `Tu redacción del nodo «${nodo.titulo}» (${nodo.id}) no se aceptó: ${reintento}`,
      'Corrige exactamente eso (revisa también el resto por si hay más fallos del mismo tipo) y vuelve a escribir el índice.',
    ].join('\n\n');
  }
  const plan = (nodo.plan ?? []).map((c, k) => `${k + 1}. ${c.titulo}${c.objetivos?.length ? ` — objetivos: ${c.objetivos.join('; ')}` : ''}`).join('\n');
  const deps = dependencias.length
    ? dependencias.map((d) => `- «${d.titulo}» (${rutaIdea}/germinacion/${d.documento})${d.indice ? `: ya creado, su web está en ${rutaIdea}/germinacion/cursos/${d.id}/ y su índice en ${rutaIdea}/germinacion/nodos/${d.id}/indice.json` : ''}`).join('\n')
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
    `La web va en ${rutaIdea}/germinacion/cursos/${nodo.id}/; las descargas, en ${rutaIdea}/germinacion/recursos/${nodo.id}/.`,
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
