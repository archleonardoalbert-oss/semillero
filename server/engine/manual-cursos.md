# Manual del redactor de cursos de Semillero

Este manual es lo que necesitas saber para construir una asignatura extraordinaria. Resume, para que lo apliques directamente, lo que la investigación sobre aprendizaje y las mejores explicaciones visuales del mundo han demostrado que funciona. Al final están las fuentes, por si necesitas consultar algo concreto. Léelo como lo leería un catedrático que además es diseñador: cada principio está aquí porque cambia lo que construyes.

## 0. Qué estás construyendo

Una **web completa, única y autónoma** para UNA asignatura de un curso universitario: no un documento, no una plantilla. Debe sentirse como si un equipo de profesores del MIT y de diseñadores de primer nivel hubiera creado un sitio solo para este tema, con:

- **Calidad universitaria total.** El nivel, el rigor, la profundidad y la amplitud de un curso avanzado del MIT, Stanford o Cambridge sobre el tema, sin nada que envidiarles. Nada se simplifica hasta volverse falso; lo difícil se hace comprensible, no se esquiva.
- **Comprensión máxima.** Todo lo que haya en la página existe para que el estudiante entienda más hondo y retenga más tiempo. Un modelo mental vívido, correcto y manipulable de cada concepto es el objetivo.
- **Identidad propia.** Su estética, su tipografía, su paleta, su forma de navegar y sus visualizaciones nacen del tema. Un curso de topología no se ve como uno de redes neuronales ni como uno de estadística. Nada de plantilla genérica.
- **Visualización con propósito.** Cada figura, simulación o animación representa algo que el texto solo no puede; ninguna es adorno.

## 1. Cómo aprende la gente (aplícalo en cada página)

Estos efectos están medidos en cientos de estudios. Úsalos de forma deliberada.

1. **Aprendizaje activo, no lectura pasiva.** En ciencias, las clases solo expositivas rinden 0,47 desviaciones típicas menos y suspende 1,5 veces más gente que con aprendizaje activo (Freeman et al. 2014). Según el marco ICAP (Chi y Wylie 2014), aprender es mejor cuanto más se pasa de *pasivo* (leer) a *activo* (manipular), *constructivo* (generar algo nuevo: explicar, predecir, dibujar) e *interactivo* (dialogar sobre ello). Por eso cada sección debe pedirle al estudiante que **haga** algo: predecir antes de ver, manipular un parámetro, resolver un paso, explicar con sus palabras.
2. **Predecir antes de mostrar.** Antes de revelar un resultado o una animación, pregunta qué cree que pasará y deja que se comprometa con una respuesta. Luego muéstralo. El contraste entre lo que esperaba y lo que ve es donde se aprende.
3. **Autoexplicación (g ≈ 0,55; Bisra et al. 2018).** Pide explícitamente que el estudiante explique por qué funciona un paso o qué relación hay entre dos ideas, con una respuesta modelo desplegable para comparar.
4. **Práctica de recuperación y espaciada.** Recordar sin mirar fija lo aprendido (efecto medio g ≈ 0,5); espaciar la práctica añade alrededor de media desviación típica (Mawson y Kang 2025). Cada conferencia termina con preguntas de recuperación de lo esencial, y las clases prácticas retoman ideas de conferencias anteriores.
5. **Intercalado (g = 0,42; Brunmair y Richter 2019).** En las prácticas, mezcla tipos de problema para que el estudiante aprenda a reconocer *cuándo* aplicar cada técnica, no solo cómo.
6. **Ejemplos resueltos y su desvanecimiento (g ≈ 0,48; Barbieri et al. 2023).** Para cada técnica: un ejemplo resuelto completo con el porqué de cada paso, después ejemplos con pasos por completar y después problemas sin ayuda.
7. **Inversión de la pericia (Kalyuga et al. 2003; Tetzlaff et al. 2025).** Lo que ayuda al principiante estorba al avanzado. Ajusta el andamiaje al nivel que mostró el diagnóstico del estudiante: si ya domina la base, ve directo a lo interesante.
8. **Fracaso productivo (Sinha y Kapur 2021).** Para los conceptos clave, a veces conviene plantear primero un problema bien diseñado que el estudiante pueda atacar con lo que sabe y que haga *necesario* el concepto nuevo. Solo con problemas pensados para ello.
9. **Comparar casos (d ≈ 0,50; Alfieri et al. 2013).** Poner dos o más ejemplos lado a lado y pedir qué tienen en común hace visible la estructura profunda (Gentner). Funciona mejor si el principio se enuncia **después** de la comparación.
10. **Teoría de la variación (Marton).** Para que se vea un aspecto crítico, hay que variarlo mientras lo demás queda fijo (*separación*); mostrar lo que *no* es el concepto (*contraste*); mantener el patrón mientras varía el contexto (*generalización*); y al final variar varios aspectos a la vez (*fusión*). Diseña tus visualizaciones manipulables siguiendo este orden.
11. **Errores conceptuales.** Cuando hay un error típico, nómbralo, explica por qué es tentador, refútalo y da la explicación correcta (textos de refutación: g ≈ 0,41).
12. **Conceptos umbral (Meyer y Land).** Algunas ideas transforman la manera de ver la materia y son difíciles (contraintuitivas, ajenas, tácitas). Identifícalas y dedícales más espacio, más representaciones y más práctica.
13. **Concreto → abstracto (desvanecimiento de la concreción; Fyfe et al. 2014).** Empieza por una instancia concreta y manipulable, pasa a una representación esquemática y llega a la notación formal, enlazando explícitamente cada paso con el anterior. No te quedes en lo concreto ni empieces en lo abstracto.
14. **Dominio y alineación (Bloom; Kulik et al. 1990; Biggs).** Cada conferencia declara objetivos verificables («calcular», «demostrar», «decidir si»), y todo lo de la página sirve a esos objetivos.
15. **Mapas de conceptos (g ≈ 0,43 al estudiarlos y 0,72 al construirlos; Schroeder et al. 2018).** Un mapa visual de cómo se conectan las ideas de la asignatura ayuda a organizar el conocimiento; aún más si el estudiante completa uno.

## 2. Educación visual: cómo hacer que se *vea*

### 2.1 Principios multimedia (Mayer)

- **Coherencia:** fuera todo lo que no sirve al aprendizaje. Los «detalles seductores» (anécdotas llamativas, decoración, música, imágenes bonitas sin función) perjudican el aprendizaje (g ≈ −0,33; Sundararajan y Adesope 2020), sobre todo a los principiantes. Belleza sí, adorno no: la belleza debe salir de la claridad.
- **Señalización (≈0,69):** destaca lo esencial y la estructura (resaltar, numerar, colores con significado, flechas que guían la vista).
- **Contigüidad espacial y temporal:** el texto que explica una figura va **junto** a ella, no en otra parte de la página; las etiquetas, sobre la figura misma. Evita la atención dividida.
- **Segmentación (≈0,67):** contenidos complejos en pasos cortos que el estudiante avanza a su ritmo.
- **Entrenamiento previo:** presenta los nombres y piezas clave antes de la explicación que los combina.
- **Redundancia:** no dupliques lo mismo en texto y en imagen sin motivo; cada representación aporta algo distinto.

### 2.2 Cuándo animar (y cuándo no)

- La animación ayuda de media poco (d ≈ 0,37 frente a imágenes estáticas; Höffler y Leutner 2007), pero bastante más cuando **representa** el fenómeno (d ≈ 0,40) y mucho más para procedimientos y cambios en el tiempo. Tversky, Morrison y Bétrancourt (2002) dan dos condiciones:
  - **Congruencia:** la forma de la visualización corresponde a la estructura del concepto (si el concepto es un proceso en el tiempo, la animación tiene sentido; si es una relación estática, no).
  - **Aprehensión:** debe poder percibirse y entenderse; las animaciones rápidas y continuas se pierden. Por eso: **pasos discretos, controlados por el estudiante, con la posibilidad de detener, retroceder y repetir.**
- Las animaciones controladas por el estudiante funcionan mejor que las automáticas, incluso cuando no usa los controles (citado por Amit Patel). Usa deslizadores, botones de paso y líneas de tiempo arrastrables, nunca autoplay obligatorio.
- Si quieres mostrar variación entre casos, a menudo son mejores los **múltiplos pequeños** (Tufte): la misma figura repetida con un parámetro distinto, lado a lado, que el ojo compara de un vistazo.

### 2.3 Representaciones múltiples (Ainsworth, DeFT)

Combinar representaciones (gráfica, ecuación, tabla, diagrama, simulación) sirve para **complementar** (cada una muestra algo distinto), **restringir** (una conocida evita malinterpretar otra) y **construir** comprensión profunda al traducir entre ellas. Pero la traducción no es automática: **enlázalas visualmente** (mismos colores, resaltado coordinado: al pasar el ratón por un término de la ecuación se ilumina su parte en la gráfica; al mover un punto cambia la tabla).

### 2.4 Explicaciones explorables (Bret Victor y sucesores)

- **Documentos reactivos:** el lector cambia un supuesto y ve las consecuencias propagarse por el texto y las figuras. Los números del texto pueden ser manipulables.
- **Subir y bajar por la escalera de abstracción:** muestra un caso concreto, luego todos los casos a la vez (una familia de curvas, un mapa de calor sobre un parámetro), luego la propiedad abstracta que los resume. El entendimiento nace de moverse entre niveles.
- **Lecciones de Amit Patel (Red Blob Games):** la interactividad apoya al texto, no lo sustituye; guía al estudiante por los conceptos en vez de lanzarlo a un simulador abierto; empieza por un caso simplificado y construye paso a paso; que lo primero de la página ya sea útil; usa el color para conectar conceptos entre diagramas; parte de una figura estática y añade solo la interactividad que aporte.
- **Andamiaje implícito (PhET):** una simulación bien diseñada guía sin que el estudiante sienta que lo guían, mediante qué controles ofrece, qué restringe y qué realimentación da. Pero un simulador abierto sin narración necesita a alguien que explique: en tu web, la narración va siempre al lado. Las simulaciones mejoradas con este tipo de diseño superan a las simulaciones básicas (g ≈ 0,41; D'Angelo et al. 2014).
- **Distill: «Research Debt».** Una buena explicación, una buena notación o una buena visualización son la interfaz de usuario de una idea; crearlas exige tanta creatividad y comprensión como investigar. Tu trabajo es destilar.
- **Referentes de nivel que debes igualar o superar:** las explicaciones interactivas de Bartosz Ciechanowski (mecánica, física, ingeniería con modelos 3D manipulables), Red Blob Games (algoritmos), Seeing Theory (probabilidad), Immersive Math (álgebra lineal), las piezas de Distill (aprendizaje automático), los vídeos de 3Blue1Brown (matemáticas con motivación, intuición geométrica y la sensación de que podrías haberlo descubierto tú).

### 2.5 Diseño visual de datos y de la página

- **Muestra los datos y la idea por encima de todo (Tufte):** elimina tinta que no informa; gris para el contexto y color solo para lo que importa.
- **Color con significado y accesible:** cada color significa lo mismo en toda la asignatura. Paletas perceptualmente uniformes (viridis, cividis) para escalas; paletas seguras para daltónicos (Okabe-Ito) para categorías. El color nunca es el único canal de información: añade forma, etiqueta o patrón.
- **Tipografía para leer:** líneas de 60-80 caracteres, buen interlineado, jerarquía clara. Las fórmulas con KaTeX, del mismo tamaño visual que el texto.
- **Navegación clara:** el estudiante sabe siempre dónde está, qué viene después y cómo volver. Índice de la asignatura siempre accesible.
- **Responsive y accesible:** que funcione en pantallas grandes y pequeñas, con teclado, con buen contraste, y respetando `prefers-reduced-motion`.

## 3. Estructura de una asignatura de calidad universitaria

Como un curso real del MIT, pero mejor aprovechado por el medio:

- **Portada de la asignatura** (`index.html`): qué se aprenderá y por qué importa (con un gancho visual que plantee una pregunta fascinante del tema), prerrequisitos, objetivos, programa navegable, mapa conceptual de la asignatura, cómo estudiarla.
- **Conferencias** (`c01-….html`, `c02-…`): una por página. Cada una, en este orden: objetivos verificables y prerrequisitos; motivación honesta (el problema que resuelve; si encaja, un problema de fracaso productivo); desarrollo en secciones cortas con definiciones antes de usarlas, teoremas con demostración (o la idea y la demostración completa en «para valientes»), ejemplos resueltos, visualizaciones donde aporten y preguntas de comprobación con respuesta desplegable; errores típicos refutados; «ideas que te llevas»; preguntas de recuperación; lecturas exactas (capítulo y sección) de los recursos.
- **Clases prácticas** (`p01-…`): 6-12 ejercicios de dificultad creciente, intercalados y que retoman conferencias anteriores, cada uno con pistas graduadas en cuatro niveles (concepto, estrategia, arranque, desbloqueo) y solución modelo con la idea reutilizable.
- **Demostraciones para valientes** (`v01-…`): las demostraciones completas y rigurosas que las conferencias enuncian sin demostrar; cada implicación justificada y la técnica nombrada.
- **Extensión:** la que el tema exija. Una conferencia universitaria real tiene típicamente entre 4000 y 9000 palabras de contenido sustantivo, más sus visualizaciones. No rellenes ni recortes.

## 4. Tus motores de visualización

- **Hechos a medida para esta asignatura.** No uses un motor genérico: diseña el que el tema necesita (un trazador de campos, un simulador de un sistema concreto, un visor 3D de superficies, un animador de un algoritmo paso a paso, un laboratorio de distribuciones…).
- **Puedes apoyarte en librerías serias** (KaTeX para fórmulas; D3, Three.js, regl, etc.), **descargadas dentro del curso** (`lib/`), con su licencia. Nunca cargues nada de internet al abrir la página: el curso debe funcionar sin conexión.
- **Arquitectura recomendada:** estado explícito → función de dibujo determinista (lo que se ve depende solo del estado y del progreso de la animación) → controles que cambian el estado. Así el estudiante puede detener, retroceder, repetir y arrastrar sin que nada se rompa.
- **Movimiento:** suave dentro de cada paso, en reposo con todo escrito al terminar; nada desaparece si hace falta para entender. 60 fotogramas por segundo en un portátil normal; nada de bucles costosos sin necesidad.
- **Prueba cada pieza** con el comprobador de Semillero (ver las instrucciones de formato): ninguna página puede tener errores de JavaScript.

## 5. Proceso de trabajo

1. Estudia el plan de la asignatura, su presentación, el diagnóstico del estudiante y los nodos de los que depende.
2. Investiga cómo enseñan este tema los mejores cursos y libros actuales (temarios, ejercicios, demostraciones clásicas, malentendidos frecuentes) y descarga el material abierto de mayor calidad en los idiomas del curso.
3. **Diseña la identidad** de la web antes de escribir: concepto visual derivado del tema, paleta, tipografía, maquetación, componentes recurrentes. Anótalo en `cursos/<nodo>/DISENO.md` (para ti y para quien la continúe).
4. Diseña cada conferencia: objetivos, la idea central que el estudiante debe *ver*, la visualización que la hará visible, la secuencia concreta → abstracta, las preguntas activas.
5. Construye, conferencia a conferencia, comprobando cada página con el comprobador.
6. Revisa como lo haría un catedrático exigente: corrección matemática y científica, completitud del temario, claridad, ausencia de adornos, accesibilidad.

## Fuentes

**Aprendizaje**
- Freeman et al. (2014). Active learning increases student performance in science, engineering, and mathematics. *PNAS* 111(23). https://www.pnas.org/doi/10.1073/pnas.1319030111
- Chi y Wylie (2014). The ICAP Framework. *Educational Psychologist* 49(4), 219-243.
- Bisra, Liu, Nesbit, Salimi y Winne (2018). Inducing Self-Explanation: A Meta-Analysis. *Educational Psychology Review* 30, 703-725.
- Mawson y Kang (2025), metaanálisis de práctica espaciada en el aula; Murray et al. (2025), práctica espaciada y de recuperación en matemáticas.
- Brunmair y Richter (2019). Similarity matters: A meta-analysis of interleaved learning. *Psychological Bulletin* 145(11).
- Barbieri et al. (2023). A Meta-analysis of the Worked Examples Effect on Mathematics Performance. *Educational Psychology Review* 35, 11. https://doi.org/10.1007/s10648-023-09745-1
- Kalyuga, Ayres, Chandler y Sweller (2003). The expertise reversal effect. *Educational Psychologist* 38(1). Tetzlaff, Simonsmeier, Peters y Brod (2025), metaanálisis, *Learning and Instruction* 98, 102142.
- Sinha y Kapur (2021). When Problem Solving Followed by Instruction Works: Evidence for Productive Failure. *Review of Educational Research*. https://doi.org/10.3102/00346543211019105
- Alfieri, Nokes-Malach y Schunn (2013). Learning Through Case Comparisons: A Meta-Analytic Review. *Educational Psychologist* 48(2), 87-113. https://www.lrdc.pitt.edu/Schunn/papers/ContrastingCasesMeta-AlfieriEtAl2013.pdf
- Marton (2015). *Necessary Conditions of Learning*. Routledge.
- Meyer y Land (2003/2006). Threshold Concepts and Troublesome Knowledge.
- Refutación de errores conceptuales: metaanálisis en *Educational Psychology Review* (g = 0,41). https://link.springer.com/article/10.1007/s10648-021-09656-z
- Fyfe, McNeil, Son y Goldstone (2014). Concreteness fading in mathematics and science instruction: a systematic review. *Educational Psychology Review* 26. https://doi.org/10.1007/s10648-014-9249-3
- Kulik, Kulik y Bangert-Drowns (1990), aprendizaje por dominio; Biggs, alineación constructiva; Wiggins y McTighe, diseño hacia atrás.
- Nesbit y Adesope (2006). Learning with concept and knowledge maps. *Review of Educational Research* 76. Schroeder, Nesbit, Anguiano y Adesope (2018), actualización. https://summit.sfu.ca/item/17789

**Educación visual**
- Mayer, *Multimedia Learning* (3.ª ed., 2021) y *The Cambridge Handbook of Multimedia Learning*.
- Sundararajan y Adesope (2020), detalles seductores. *Educational Psychology Review* 32(4), 707-734.
- Höffler y Leutner (2007). Instructional animation versus static pictures: A meta-analysis. *Learning and Instruction* 17(6). Berney y Bétrancourt (2016); Castro-Alonso et al. (2019).
- Tversky, Morrison y Bétrancourt (2002). Animation: can it facilitate? *Int. J. Human-Computer Studies* 57, 247-262. https://hci.stanford.edu/courses/cs448b/papers/Tversky_AnimationFacilitate_IJHCS02.pdf
- Ainsworth (2006). DeFT: A conceptual framework for considering learning with multiple representations. *Learning and Instruction* 16(3), 183-198.
- Victor, B. (2011). Explorable Explanations. https://worrydream.com/ExplorableExplanations/ — y «Up and Down the Ladder of Abstraction», https://worrydream.com/LadderOfAbstraction/
- Patel, A. Notas sobre explicaciones interactivas (Red Blob Games). https://www.redblobgames.com/x/2306-educ432/
- Podolefsky, Moore y Perkins (2013). Implicit scaffolding in interactive simulations. https://arxiv.org/abs/1306.6544
- D'Angelo et al. (2014). Simulations for STEM Learning: Systematic Review and Meta-Analysis. SRI International. https://www.sri.com/wp-content/uploads/2021/12/simulations-for-stem-learning-full-report.pdf
- Hohman, Conlen, Heer y Chau (2020). Communicating with Interactive Articles. *Distill*. https://distill.pub/2020/communicating-with-interactive-articles/
- Olah y Carter (2017). Research Debt. *Distill*. https://distill.pub/2017/research-debt/
- Dori y Belcher (2005). How Does Technology-Enabled Active Learning Affect Undergraduate Students' Understanding of Electromagnetism Concepts? *Journal of the Learning Sciences* 14(2) (proyecto TEAL del MIT).
- Tufte, *The Visual Display of Quantitative Information* y *Envisioning Information* (múltiplos pequeños, tinta de datos, capas).
- Colormaps perceptualmente uniformes (viridis, van der Walt y Smith) y paleta Okabe-Ito para daltonismo.

**Referentes de explicación visual**
- Bartosz Ciechanowski, https://ciechanow.ski — Red Blob Games, https://www.redblobgames.com — Seeing Theory, https://seeing-theory.brown.edu — Immersive Math, https://immersivemath.com — Distill, https://distill.pub — 3Blue1Brown, https://www.3blue1brown.com — Explorable Explanations, https://explorabl.es
