# Semillero VIII: los bancales «Aprender algo nuevo» generan cursos universitarios

## Intención

Cuando el usuario quiere aprender algo, la germinación tiene que ser un curso completo de nivel universitario avanzado, personalizado a su nivel real. Su calidad educativa tiene que ser mejor que la de cualquier curso existente:
- conferencias, clases prácticas y demostraciones;
- escenas animadas y manipulables como las de su curso de EDO (`~/Leo/Tutoriales/EDO`);
- material externo de altísima calidad descargado, solo en los idiomas que elija.

## Decisiones del usuario

1. **Una idea de aprender nunca se rechaza rotundamente.** Se pueden sugerir cambios, desaconsejarla o pedir aclaración, pero siempre se puede germinar.
2. **Estas ideas suelen ser cortas y directas,** a veces con un porqué. La sesión no las penaliza por breves.
3. **El curso tiene nivel universitario avanzado y es completo.**
   - Cada nodo de estudio es una asignatura o un bloque, dividido en **conferencias numeradas** como en la universidad. Cuando lo amerita, añade **clases prácticas** (ejercicios con pistas graduadas y solución modelo) y **demostraciones para valientes**.
   - Las conferencias se leen como **documento con escenas intercaladas**. Cada escena tiene sus controles ◀ ▶ ↻, deslizadores y puntos arrastrables.
   - Las escenas usan un **motor como el de EDO**, traído a Semillero, para que todas tengan la misma calidad y el mismo lenguaje visual.
   - Se descargan PDF, libros y páginas de fuentes muy fiables, actuales y de frontera.
4. **El diagnóstico no supone nada.** Combina **autoevaluación** con una **prueba real**: ejercicios cortos en cada área previa, que la sesión corrige para ubicar al usuario por lo que demuestra.
5. **La última pregunta del diagnóstico es en qué idiomas quiere los documentos** (puede marcar varios). Se aplica **a todo**:
   - el material descargado, solo en esos idiomas;
   - las conferencias, en el primero que marque.
6. **La generación es automática por nodos.**
   - La sesión de la idea diseña el plan de estudios completo (el árbol, con las conferencias previstas en cada nodo).
   - Después, cada nodo de estudio lo redacta una **sesión dedicada** con contexto limpio, hasta 5 en paralelo y respetando la pausa por cuota, hasta terminar el curso sin intervención del usuario.

## Evidencia pedagógica que guía las sesiones

Las sesiones del tipo «Aprender algo nuevo» siguen estos principios. Cada uno lleva su fuente.

- **Práctica de recuperación.** Preguntas y ejercicios de recuperación dentro de cada conferencia y entre conferencias (efecto medio g ≈ 0,50 en los metaanálisis de *quizzing*, con mucha variabilidad; en matemáticas no basta sola).
- **Práctica espaciada.** Las prácticas retoman contenidos de conferencias anteriores (Mawson y Kang 2025: alrededor de media desviación típica en el aula; Bego et al. 2024: efecto pequeño y variable en cursos STEM reales).
- **Práctica intercalada** de tipos de problema en las clases prácticas (Brunmair y Richter 2019: g = 0,42).
- **Ejemplos resueltos** para el principiante, retirados después de forma progresiva (Barbieri et al. 2023, *Educ. Psych. Review*: g = 0,48 en matemáticas, mejor con ejemplos correctos). Los ejemplos resueltos dejan de ayudar al experto: **efecto de inversión de la pericia** (Kalyuga et al. 2003; metaanálisis de Tetzlaff et al. 2025, *Learning and Instruction*). Por eso el andamiaje se ajusta al nivel que dio el diagnóstico.
- **Fracaso productivo.** En algunos conceptos, primero un problema bien diseñado y después la enseñanza (Sinha y Kapur 2021, *Review of Educational Research*: 53 estudios). Solo con problemas pensados para ello, no con un ejercicio cualquiera del libro.
- **Aprendizaje activo.** Nada de lecciones solo expositivas (Freeman et al. 2014, *PNAS*: +0,47 DT; en las clases expositivas suspende 1,5 veces más gente).
- **Principios multimedia de Mayer.** Señalización (≈0,69) y segmentación (≈0,67). Fuera los detalles seductores, que perjudican la transferencia (d ≈ −0,48). Entrenamiento previo en los términos.
- **Animación con propósito.** Ayuda poco de media (Höffler y Leutner 2007: d = 0,37; Berney y Bétrancourt 2016: g ≈ 0,23), pero ayuda más cuando representa el fenómeno y no decora (d = 0,40), y en conocimiento procedimental. Las escenas deben ser **representacionales, segmentadas por pasos y controladas por el estudiante**, nunca decorativas. Si una escena no aporta, no se hace.
- **Aprendizaje por dominio y alineación constructiva** (Bloom; Kulik et al. 1990: ≈0,5 DT, con más efecto en los estudiantes más flojos; Biggs). Cada conferencia declara sus objetivos verificables y las prácticas y el examen del nodo los evalúan.
- **Diagnóstico.** Los principiantes sobrestiman lo que saben (efecto Dunning-Kruger, matizado por estudios posteriores). Por eso la autoevaluación sola no basta y se añade una prueba real. El plan de estudios es un grafo de prerrequisitos como en la teoría de espacios de conocimiento (Doignon y Falmagne; ALEKS), y la prueba sondea las fronteras de ese grafo.

## Cómo queda

- **Veredicto.** En un bancal de aprendizaje nunca hay `rechazada`. Si la sesión lo escribe, Semillero lo convierte en `no-recomendada`.
- **Diagnóstico.**
  - Hay dos tipos de pregunta nuevos: `prueba` (un ejercicio corto con su respuesta, que corrige la sesión) y `multiple` (varias opciones marcables).
  - Al aceptar el diagnóstico de un bancal de aprendizaje, Semillero añade al final una pregunta fija, `idiomas`, de tipo `multiple`.
- **Plan.** Cada nodo de estudio puede llevar un `plan` con las conferencias previstas (título y objetivos).
- **Redacción.** Un motor nuevo redacta cada nodo de estudio en una sesión dedicada:
  - escribe `germinacion/nodos/<nodo>/indice.json` (conferencias, prácticas, valientes y recursos) y sus documentos;
  - escribe las escenas en `germinacion/escenas/<nodo>/*.js`;
  - guarda las descargas en `germinacion/recursos/<nodo>/`.

  El estado de cada nodo vive en `germinacion/redaccion.json`. Mientras se redacta no se puede comunicar avances.
- **Escenas.** Un módulo `export default (S) => S.definirEscena({...})`. `S` es la API del motor (plano, primitivas, piezas, numérico). Se ejecutan en un iframe con `sandbox="allow-scripts"` y una CSP sin `connect-src`. Semillero las comprueba en Node antes de aceptarlas.
- **Lectura.** En la lámina de un nodo de estudio se listan sus conferencias, prácticas y demostraciones. Cada una se abre en un lector con escenas intercaladas, desplegables `:::pista` y `:::solucion`, y glosas.
- **Exportar.** La germinación exportada incluye todo esto: las conferencias, las escenas que funcionan y los recursos de cada nodo.
