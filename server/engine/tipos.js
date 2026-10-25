// Tipos de bancal: lista cerrada (decisión del usuario). Cada tipo define cómo se explica al usuario,
// cómo lo nombra la interfaz y, sobre todo, cómo debe trabajar cada sesión: análisis, germinación,
// dominio (examen o caso práctico) y verificación. Los criterios salen de investigación sobre cómo se
// evalúa en serio cada campo (fuentes en docs/superpowers/specs/2026-10-25-tipos-design.md).

export const TIPO_POR_DEFECTO = 'academico';

export const TIPOS = {
  academico: {
    nombre: 'Investigación académica',
    resumen: 'Preguntas de ciencia, matemáticas o ingeniería que buscan conocimiento nuevo y verificable.',
    comoJuzga: [
      'Si la pregunta es nueva frente a la literatura actual (busca artículos recientes y preprints) o ya está respondida.',
      'Si es viable con los datos, la matemática y los medios a tu alcance, y en cuánto tiempo.',
      'Si es falsable y qué resultado la confirmaría o la tumbaría.',
      'Qué impacto tendría resolverla y para quién, con honestidad sobre la probabilidad de lograrlo.',
    ],
    ejemplos: [
      'Medir cuándo falla la perturbación espectral en conectomas reales.',
      'Un método numérico nuevo para una familia de EDO rígidas.',
      'Comprobar si una arquitectura de red reproduce un fenómeno del cerebro.',
    ],
    vocab: {
      recuento: ['Problemas', 'abiertos', 'atacándolos', 'resueltos'],
      estudio: 'Lo que estudiar', hoja: 'Incógnita', fruto: 'Problema abierto',
      estadosIncognita: ['Abierta', 'Atacándola', 'Resuelta'], resuelta: 'Resuelta',
      dominio: 'examen', enviarResultado: 'la demostración, el experimento, los datos o el código',
    },
    analisis: `## Cómo juzgar una idea de investigación académica

1. **Novedad real.** Busca en arXiv, Google Scholar, Semantic Scholar, bioRxiv y los congresos del área, priorizando los últimos 2 o 3 años. Si ya está hecha, dilo y cita quién la hizo y cuándo. Si está «casi» hecha, precisa exactamente qué queda abierto y si eso es publicable o solo un ejercicio.
2. **Pregunta bien planteada.** ¿Es falsable? ¿Qué resultado concreto la confirmaría y cuál la refutaría? Una pregunta vaga («entender X») no es una idea de investigación: reformúlala o señálalo.
3. **Viabilidad.** ¿Existen los datos (públicos y accesibles)? ¿La matemática es tratable? ¿Hace falta laboratorio, cómputo o permisos? Estima el tiempo con honestidad.
4. **Metodología.** Qué método la contestaría, qué controles y nulos harían falta, y qué amenazas a la validez hay (confusores, sesgos, sobreajuste, el p-hacking del investigador novel).
5. **Impacto.** Para el campo (¿cambia algo que alguien use?) y para el usuario (aprendizaje, publicación, portafolio). Distingue el impacto ideal del probable.
6. **Riesgo de que le adelanten.** ¿Hay grupos trabajando en ello ahora? ¿Preprints recientes que lo amenazan?`,
    formato: 'Escribe con calidad de artículo científico: LaTeX para la matemática, entornos formales (Definición, Teorema…), figuras con datos reales y una sección de Referencias con todas las fuentes.',
    germinacion: 'El tronco es lo que hay que estudiar (teoría y técnicas, con capítulos concretos de libros y artículos). Las hojas son incógnitas: preguntas que hay que resolver para avanzar. Los frutos son problemas abiertos de la ciencia que la idea toca. Los recursos son libros, artículos y cursos, descargados cuando son de acceso libre.',
    dominio: 'Examen clásico: definiciones, teoremas y sus demostraciones, y ejercicios, a la altura de la dificultad elegida.',
    verificacion: 'Exige una demostración completa y rigurosa, o un experimento reproducible con controles y estadística adecuada, que cierre la pregunta tal como está enunciada. Rehaz los cálculos y busca contraejemplos.',
  },

  negocio: {
    nombre: 'Negocio o emprendimiento',
    resumen: 'Ideas para vender un producto o un servicio y que den dinero: desde un negocio local hasta una startup.',
    comoJuzga: [
      'Si hay un problema real y frecuente, y alguien que ya gasta dinero o tiempo en resolverlo. La primera causa de fracaso de las startups, según los análisis de cierres, es que nadie necesitaba lo que vendían.',
      'Mercado y competencia con datos: el tamaño calculado de abajo arriba, los competidores con sus precios, y por qué te elegirían a ti.',
      'Los números: margen por venta, coste de conseguir cada cliente frente a lo que deja, punto de equilibrio e inversión inicial.',
      'Por qué no te lo copiaría alguien con más dinero, los riesgos legales y si encaja con tu capital, tu tiempo, tu país y tus habilidades.',
    ],
    ejemplos: [
      'Una cafetería de especialidad en tu barrio.',
      'Una app de suscripción para gestionar turnos en peluquerías.',
      'Importar y revender un producto que no se encuentra en tu país.',
    ],
    vocab: {
      recuento: ['Hipótesis', 'sin validar', 'validándolas', 'validadas'],
      estudio: 'Lo que dominar', hoja: 'Hipótesis que validar', fruto: 'Riesgo crítico',
      estadosIncognita: ['Sin validar', 'Validando', 'Validada'], resuelta: 'Validada',
      dominio: 'caso', enviarResultado: 'la evidencia de mercado: ventas o reservas, cartas de intención, métricas de una prueba, datos de entrevistas',
    },
    analisis: `## Cómo juzgar una idea de negocio

La mayoría de los negocios nuevos no sobreviven: en EE. UU. solo la mitad de los establecimientos llega a 5 años y un tercio a 10 (BLS). En los análisis de cierres de startups, la causa más citada es que **no había necesidad de mercado**, por delante de quedarse sin dinero. Por eso tu trabajo es buscar con honestidad por qué fracasaría esta idea concreta.

1. **El problema y quién paga.** ¿Qué problema concreto resuelve, para quién (un perfil preciso, no «todo el mundo») y con qué frecuencia y dolor? Prueba más fuerte: esa gente ya gasta dinero o tiempo en resolverlo hoy (alternativas, apaños, hojas de cálculo). Si nadie gasta nada en el problema, sospecha.
2. **Alternativas y competencia.** Busca los competidores reales (directos, indirectos y la alternativa «hacer nada» o el apaño gratuito) con nombres, precios y cuota si se sabe. «No tiene competencia» casi siempre significa que no hay mercado o que no se ha buscado bien. Explica por qué un cliente cambiaría: la mejora tiene que compensar el coste de cambiar.
3. **Tamaño de mercado.** Calcúlalo de abajo arriba: número de clientes que encajan en el perfil del primer mercado (el «beachhead») × lo que cada uno pagaría al año. Contrástalo después con datos de informes o estadísticas oficiales. Desconfía de las cifras que suman mercados adyacentes. Para un negocio local, usa la población y la densidad de la zona.
4. **Números.**
   - Margen de contribución por venta: precio menos coste variable.
   - Costes fijos y punto de equilibrio: cuántas ventas al mes hacen falta para cubrirlos.
   - Inversión inicial y cuántos meses hay que aguantar antes de cubrir gastos.
   - Si hay captación de clientes:
     - el CAC (coste de adquirir un cliente) frente al LTV (beneficio bruto que deja ese cliente durante toda su relación);
     - una referencia sana es LTV:CAC ≥ 3;
     - el CAC debería recuperarse en menos de 12 meses en negocios pequeños, porque si no la caja se agota antes de que llegue el beneficio.

   Pon supuestos explícitos y un escenario pesimista, otro típico y otro optimista. Si con los supuestos razonables no sale, dilo.
5. **Defensa.** ¿Qué impide que un competidor con más recursos lo copie? Efectos de red, datos propios, costes de cambio, marca, licencias, ubicación, economía de escala o un acceso privilegiado a clientes. «Ser el primero» o «ejecutar mejor» no son defensas por sí solos.
6. **«¿Por qué ahora?».** Qué ha cambiado (tecnología, regulación, hábitos) para que esto funcione hoy y no hace 5 años.
7. **Riesgos legales y regulatorios.** Licencias, permisos, sanidad, protección de datos, fiscalidad e importación, según el país del usuario. Pueden matar la idea o multiplicar su coste.
8. **Encaje con el usuario.** Lee su contexto (país, capital, tiempo, habilidades, metas). Una idea buena para alguien con capital y contactos puede ser mala para él. Dilo explícitamente.
9. **El primer experimento.** Qué prueba barata y rápida separaría la idea buena de la mala antes de invertir: preventas, página de prueba con precio real, un piloto de pago… Lo que la gente **dice** es evidencia débil; lo que **hace** (paga, reserva, firma) es evidencia fuerte.`,
    formato: 'Escribe un informe de viabilidad serio: cifras con fuente y fecha, supuestos explícitos, tablas para los números y los competidores, escenarios y una sección de Referencias. Sin LaTeX salvo para fórmulas financieras sencillas.',
    germinacion: 'El tronco es lo que el usuario necesita dominar para llevarlo a cabo (finanzas del negocio, normativa del sector, captación de clientes, operaciones…). Las hojas son **hipótesis que validar**, cada una formulada de forma comprobable («al menos 30 de 100 peluquerías contactadas aceptan un piloto de pago a 15 €/mes»), con el experimento más barato que la validaría o la tumbaría. Los frutos son **riesgos críticos**: bloqueos que pueden matar el negocio (una licencia, un competidor dominante, una dependencia de un proveedor). Los recursos son guías oficiales, normativa, informes de mercado, plantillas y libros prácticos.',
    dominio: 'Por defecto, **caso práctico aplicado a la idea del usuario**: un entregable real (modelo de costes e ingresos, análisis de competencia, plan de captación, cálculo del punto de equilibrio…) que se evalúa con la exigencia de la dificultad. Solo para nodos de teoría pura (cómo funciona un impuesto, conceptos contables) usa un examen clásico.',
    verificacion: 'Una hipótesis solo queda **validada** con evidencia de lo que la gente **hace**, no de lo que dice: ventas o preventas, señales o reservas pagadas, cartas de intención firmadas, métricas de una prueba con precio real, contratos piloto. Entrevistas, encuestas, «a la gente le gustó» o «me dijeron que lo comprarían» NO validan nada. Comprueba el tamaño de la muestra, cómo se reclutó y si el criterio de éxito se fijó antes de mirar los datos. Un riesgo crítico solo queda resuelto con la licencia concedida, el acuerdo firmado o la prueba de que el bloqueo ya no aplica.',
  },

  producto: {
    nombre: 'Producto o proyecto técnico',
    resumen: 'Construir algo que funcione: una app, una herramienta, un hardware, un sistema o una librería.',
    comoJuzga: [
      'Si resuelve una necesidad real mejor que las alternativas que ya existen, incluida la alternativa «suficientemente buena» (una hoja de cálculo, un script, otra app).',
      'Los cuatro riesgos de producto: que la gente lo quiera, que sepa usarlo, que se pueda construir con tus medios y que sea viable mantenerlo.',
      'La dificultad técnica real y la madurez de la tecnología que necesita, con una estimación honesta de tiempo y coste.',
      'El coste de mantenerlo vivo y, en hardware, la fabricación y las certificaciones.',
    ],
    ejemplos: [
      'Una extensión del editor que anima la ejecución de código.',
      'Un medidor de calidad del aire con sensores baratos.',
      'Una herramienta de línea de comandos que automatiza tu flujo de trabajo.',
    ],
    vocab: {
      recuento: ['Preguntas', 'abiertas', 'atacándolas', 'resueltas'],
      estudio: 'Lo que dominar', hoja: 'Pregunta técnica', fruto: 'Reto técnico',
      estadosIncognita: ['Abierta', 'Atacándola', 'Resuelta'], resuelta: 'Resuelta',
      dominio: 'mixto', enviarResultado: 'el prototipo, el código, las mediciones o la demostración de que funciona',
    },
    analisis: `## Cómo juzgar una idea de producto o proyecto técnico

Usa los cuatro grandes riesgos de producto (Marty Cagan): **valor** (¿lo querrán usar?), **usabilidad** (¿sabrán usarlo?), **viabilidad técnica** (¿se puede construir con el tiempo, las habilidades y la tecnología disponibles?) y **viabilidad** (¿es sostenible: coste, mantenimiento, licencias, distribución?).

1. **El trabajo que resuelve** (Jobs-to-be-done): «cuando ___, quiero ___, para ___». ¿Quién lo tiene y con qué frecuencia? Si es para el propio usuario, también cuenta, pero dilo.
2. **Alternativas existentes.** Busca productos, proyectos de código abierto, librerías y apaños. El competidor real suele ser lo «suficientemente bueno» que ya se usa. ¿La mejora compensa el coste de cambiar? Si ya existe algo que hace el 90 %, dilo con nombres.
3. **Madurez de la tecnología.** Sitúa cada pieza crítica en la escala TRL (1 principio observado … 4 validado en laboratorio … 7 prototipo en entorno real … 9 en uso). Si depende de algo por debajo de TRL 4, es investigación, no producto: dilo.
4. **Dificultad y estimación.** Descompón en piezas, identifica la más incierta y estima tiempo y coste con un margen honesto. Los proyectos técnicos casi siempre tardan bastante más de lo previsto.
5. **Hardware, si aplica.** El prototipo funcional es solo una parte del camino. Añade la lista de materiales (BOM) y su disponibilidad, el diseño para fabricación, las certificaciones (CE, FCC, RoHS según el mercado; usar módulos de radio ya certificados ahorra mucho), la fabricación y el soporte.
6. **Mantenimiento.** Dependencias, actualizaciones de plataformas y API de terceros, seguridad, costes de servidor. Un proyecto que nadie puede mantener muere.
7. **Encaje con el usuario.** ¿Tiene las habilidades o puede adquirirlas en un tiempo razonable? Lee su contexto.
8. **El prototipo mínimo.** Qué es lo más pequeño que demostraría que lo más incierto funciona.`,
    formato: 'Escribe un informe técnico: arquitectura o esquema cuando ayude, tablas de alternativas, estimaciones con supuestos, figuras si aportan, y Referencias (documentación, repositorios, hojas de datos).',
    germinacion: 'El tronco es lo que hay que dominar (lenguajes, frameworks, electrónica, teoría necesaria). Las hojas son **preguntas técnicas** de diseño que hay que resolver (¿qué base de datos?, ¿cabe en el microcontrolador?, ¿qué latencia se consigue?). Los frutos son **retos técnicos** difíciles o sin solución conocida que el producto necesita superar. Los recursos son documentación oficial, repositorios de referencia, hojas de datos, libros y cursos.',
    dominio: 'Mixto: examen para la teoría (algoritmos, electrónica, protocolos) y **caso práctico** para las habilidades de construcción (implementar una pieza, diseñar un esquema, depurar un problema real), aplicado al proyecto del usuario siempre que se pueda.',
    verificacion: 'Una pregunta o un reto técnico queda resuelto con una demostración que funcione: código que se pueda ejecutar con instrucciones, mediciones reproducibles (con el método y los instrumentos), un prototipo en vídeo con datos, o un benchmark con su configuración. Las afirmaciones sin artefacto comprobable no valen. Revisa casos límite, condiciones de la medida y si el resultado responde exactamente a la pregunta.',
  },

  creativo: {
    nombre: 'Creativo',
    resumen: 'Obras: una novela, un videojuego, un cómic, música, un guion, un proyecto artístico.',
    comoJuzga: [
      'Originalidad frente a lo que ya existe: qué obras parecidas hay y qué aporta la tuya.',
      'Para quién es y por qué vía llegaría (editorial, autopublicación, Steam, plataformas), con datos reales del mercado.',
      'Si es viable terminarla con tu tiempo y habilidades: el alcance desmesurado es lo que más obras mata.',
      'Qué puedes esperar de ella con honestidad: muchas obras valen la pena aunque no den dinero, y eso también se dice.',
    ],
    ejemplos: [
      'Una novela de ciencia ficción sobre conectomas.',
      'Un videojuego de puzles basado en circuitos lógicos.',
      'Un álbum conceptual o una serie de ilustraciones.',
    ],
    vocab: {
      recuento: ['Decisiones', 'abiertas', 'trabajándolas', 'logradas'],
      estudio: 'Lo que dominar', hoja: 'Decisión creativa', fruto: 'Reto de oficio',
      estadosIncognita: ['Abierta', 'Trabajándola', 'Lograda'], resuelta: 'Lograda',
      dominio: 'caso', enviarResultado: 'la pieza o un fragmento (capítulo, nivel jugable, maqueta, bocetos)',
    },
    analisis: `## Cómo juzgar una idea creativa

Separa siempre dos preguntas: **¿vale la pena como obra?** y **¿vale la pena como proyecto con salida?** Una puede ser sí y la otra no; dilo así.

1. **Originalidad y obras comparables.** Busca las obras más parecidas (en libros, los «comp titles» recientes del mismo género; en juegos, títulos de Steam o de consola del mismo género y mecánica). ¿Qué aporta la idea que no tengan? Una premisa no es una obra: juzga también si hay un conflicto, un núcleo jugable o una voz que la sostenga.
2. **Público y vía de llegada, con datos.**
   - **Libros.** La mediana de ingresos por libros de un autor a tiempo completo en EE. UU. ronda los 10 000 $ al año (Authors Guild 2023), y la de los autopublicados a tiempo completo, los 12 800 $. Los agentes descartan rápido por género y extensión: la mayoría de la ficción adulta está entre 70 000 y 100 000 palabras.
   - **Juegos.** En 2025 salieron unos 19 000-20 000 juegos en Steam y la mediana de ingresos es de cientos de dólares. Unos 300 superan el millón. Las listas de deseados antes del lanzamiento son el mejor predictor de ventas.
   - Ajusta todo esto al país y al medio del usuario.
3. **Alcance frente a capacidad.** ¿Puede terminarla con su tiempo y habilidades? La causa más común de obras abandonadas es el alcance desmesurado. Propón la versión más pequeña que sigue siendo la obra (un relato antes que una saga; un juego con un solo bucle central pulido; un EP antes que un álbum).
4. **Oficio.** Qué habilidades exige (estructura narrativa, diseño de juego, arte, programación, producción musical) y cuáles tiene el usuario.
5. **Prueba temprana.** Para un juego, un prototipo que responda a una sola pregunta («¿es divertido el bucle central?»). Para un libro, un capítulo y una sinopsis. Para música, una maqueta.
6. **Expectativas honestas.** Si su objetivo es económico, dilo claro con los datos. Si es expresivo o de aprendizaje, juzga con eso en mente, sin complacencia sobre la calidad.`,
    formato: 'Escribe un informe editorial serio: obras comparables con datos, análisis del núcleo de la obra, alcance propuesto, vías de publicación con cifras y fuentes, y Referencias.',
    germinacion: 'El tronco es el oficio que hay que dominar (estructura, diseño de juego, técnicas artísticas, herramientas). Las hojas son **decisiones creativas** por resolver (punto de vista, mecánica central, tono, estructura). Los frutos son **retos de oficio** difíciles (sostener la tensión en el acto II, equilibrar la dificultad, encontrar la voz). Los recursos son libros de oficio, análisis de obras de referencia, cursos y herramientas.',
    dominio: 'Por defecto, **caso práctico aplicado a la obra**: un ejercicio real (reescribir una escena con una técnica, diseñar un nivel, componer una sección) evaluado con criterios de oficio y la exigencia de la dificultad. Examen solo para teoría (armonía, estructura clásica, teoría del color…).',
    verificacion: 'Una decisión o un reto queda «logrado» cuando la pieza enviada lo demuestra en la obra misma: el capítulo funciona, el nivel se juega y cumple su objetivo, la maqueta suena. Evalúa con criterios de oficio concretos y explícitos (no gustos personales) y con la exigencia de un editor o un publicador serio. Un «está bien» no basta: tiene que resolver exactamente lo planteado.',
  },

  aprendizaje: {
    nombre: 'Aprender algo nuevo',
    resumen: 'Estudiar una disciplina o adquirir una habilidad: un idioma, un instrumento, programación, una rama de las matemáticas.',
    comoJuzga: [
      'Ante todo, la demanda actual en todo el mundo: una investigación exhaustiva en portales de empleo (LinkedIn, Indeed y los principales de cada región) y en estadísticas oficiales, con un resumen de qué sectores y qué países la piden más, cómo evoluciona y cuánto se paga.',
      'Cuánto la puede sustituir o transformar la IA en los próximos años, con estudios serios y no con titulares.',
      'Cuánto tiempo y esfuerzo realista exige hasta un nivel útil, y si compensa frente a alternativas.',
      'Si encaja con lo que quieres conseguir y con lo que ya sabes.',
    ],
    ejemplos: [
      'Aprender japonés a nivel conversacional.',
      'Aprender diseño de chips con Verilog.',
      'Aprender piano para tocar jazz.',
    ],
    vocab: {
      recuento: ['Metas', 'pendientes', 'en marcha', 'conseguidas'],
      estudio: 'Lo que estudiar', hoja: 'Meta práctica', fruto: 'Reto de nivel',
      estadosIncognita: ['Pendiente', 'En marcha', 'Conseguida'], resuelta: 'Conseguida',
      dominio: 'mixto', enviarResultado: 'la prueba de que lo consigues: un proyecto, una grabación, un examen oficial, un portafolio',
    },
    analisis: `## Cómo juzgar si vale la pena aprender algo

El usuario quiere saber si esta habilidad **merece su tiempo hoy**. Sé riguroso y concreto, con datos actuales.

1. **Para qué.** Aclara su objetivo (empleo, ingresos, un proyecto propio, placer, base para otra idea). El veredicto depende de él. Si no lo dice, deduce por su contexto o pide aclaración.
2. **Demanda actual: el criterio de MÁS peso (decisión del usuario).** Haz una investigación EXHAUSTIVA y GLOBAL de cuánto se demanda hoy la habilidad, aunque el objetivo del usuario no sea solo profesional: la demanda dice si la habilidad tiene futuro y salida.
   - **Portales de empleo, con la misma búsqueda en cada uno:** usa los términos exactos de la habilidad y sus sinónimos en los idiomas de cada mercado, y apunta el número de ofertas, la fecha y la URL.
     - LinkedIn: búsqueda pública de empleos e informes del Economic Graph, como *Skills on the Rise* y *Skills Signal*.
     - Indeed en sus dominios nacionales, y los datos abiertos del Indeed Hiring Lab (data.indeed.com; repositorios de GitHub hiring-lab, licencia CC BY 4.0).
     - Glassdoor y ZipRecruiter.
     - Los portales principales de cada región:
       - Europa: EURES, StepStone (DE), Welcome to the Jungle (FR), InfoJobs (ES), Reed/Totaljobs (UK);
       - América: Computrabajo y Bumeran (Latinoamérica), Job Bank (CA);
       - Asia y Oceanía: Naukri (IN), SEEK (AU/NZ), los portales de Japón y Corea si aplican.
     - El portal principal del país del usuario, siempre.
   - **Estadísticas oficiales y estudios:**
     - EE. UU.: BLS (Occupational Outlook Handbook y proyecciones);
     - Europa: ONS (UK), Eurostat y el informe EURES de escasez de mano de obra;
     - comparativas: la base OCDE *Skills for Jobs* (escasez y excedente por país, 38 países), el *Future of Jobs* del WEF y Lightcast.
   - **Lo que debe incluir el dictamen**, con tablas:
     - **Visión global:** volumen aproximado de ofertas y tendencia (crece, estable o cae) en los últimos 1-3 años, con datos fechados.
     - **Por países:** dónde se demanda más (absoluto y, cuando se pueda, relativo al tamaño del mercado). Incluye siempre el país del usuario y si se puede ejercer en remoto desde él.
     - **Por sectores:** qué industrias y tipos de empresa la piden más, y para qué puestos.
     - **Salarios o prima salarial**, por país cuando haya datos. Por ejemplo, las ofertas que piden habilidades de IA pagaban un 28 % más según Lightcast (2025-2026).
     - **Nivel que se exige** en las ofertas (júnior frente a sénior) y con qué otras habilidades se pide.
     - **Tabla de fuentes:** portal o estudio, fecha de consulta, cifra y enlace.
   - **Rigor con los datos:** los recuentos de portales no son comparables entre sí (duplicados, métodos distintos); dalo como orden de magnitud y di de qué fecha es cada cifra. Si una fuente no es accesible (por ejemplo, porque pide iniciar sesión), dilo y usa otras. Nunca inventes cifras.
3. **Exposición a la IA.** Usa estudios serios:
   - El índice de la OIT de 2025 estima que alrededor de un 25 % de los empleos tiene alguna exposición a la IA generativa, pero solo un 3,3 % está en el grado más alto. Lo más probable es la transformación de las tareas, no la sustitución.
   - El Anthropic Economic Index muestra un uso concentrado en programación y repartido entre aumentar y automatizar tareas.
   - Distingue si la IA hará la habilidad innecesaria, la convertirá en un complemento que multiplica su valor, o la hará más valiosa por escasa (lo físico, lo relacional, el criterio experto).
4. **Coste en tiempo, realista.** Estima las horas hasta un nivel útil con fuentes. En idiomas, el FSI estima de 575-600 horas de clase (francés, español para anglohablantes) a unas 2200 (japonés, chino, árabe) para un nivel profesional, con estudiantes intensivos. Adáptalo a la lengua materna y al ritmo del usuario. La práctica deliberada ayuda mucho en dominios estructurados (ajedrez, música) y bastante menos en otros (Macnamara et al., 2014).
5. **Retorno y alternativas.** ¿Compensa frente a aprender otra cosa cercana con más retorno? ¿O frente a delegar, contratar o usar una herramienta? Propón la versión más rentable (por ejemplo, «aprende a leer documentación técnica en japonés, no conversación»).
6. **Encaje y base.** Qué sabe ya el usuario (lee su contexto y sus otras ideas) y qué le falta como base. ¿Hay prerrequisitos que cambian el coste?
7. **Plan de comprobación.** Cómo sabrá que lo domina: exámenes oficiales (JLPT, DELE…), proyectos, competiciones o métricas.`,
    formato: 'Escribe un informe claro, con datos fechados y fuentes. La sección de demanda global va primero y es la más extensa (tablas por países y sectores, salarios, tendencia y la tabla de fuentes). Después, exposición a la IA, estimación de horas, alternativas y retorno, y Referencias.',
    germinacion: 'El tronco es **la ruta de estudio** detallada, por etapas, con las mejores fuentes actuales (libros, cursos, profesores, plataformas) y horas estimadas. Las hojas son **metas prácticas** que demuestran avance real («mantener una conversación de 10 minutos», «sintetizar un procesador de 8 bits en una FPGA»). Los frutos son **retos de nivel**: hitos exigentes de alto nivel (aprobar el JLPT N2, tocar una pieza difícil en público).',
    dominio: 'Examen clásico (teoría y ejercicios) para el conocimiento; caso práctico (grabación, programa, traducción) cuando la habilidad es práctica. Siempre a la altura de la dificultad elegida.',
    verificacion: 'Una meta o un reto queda «conseguido» con una prueba objetiva: un certificado oficial, una grabación o un vídeo sin cortes, un proyecto que funcione, un resultado de competición o un examen superado. Comprueba que la prueba corresponde exactamente a la meta y que no hay atajos (por ejemplo, ayuda externa no declarada).',
  },

  otro: {
    nombre: 'Otro',
    resumen: 'Lo que no encaja en los demás tipos: proyectos sociales, decisiones vitales, organizaciones, eventos…',
    comoJuzga: [
      'Qué valor aporta, a quién y por qué ahora.',
      'Qué cuesta en tiempo, dinero y energía, y qué alternativas lo conseguirían mejor.',
      'Si es viable con tus medios y qué riesgos lo pueden tumbar.',
      'Cómo sabrías que ha funcionado.',
    ],
    ejemplos: [
      'Organizar un club de lectura científica.',
      'Mudarse a otra ciudad para trabajar.',
      'Lanzar una iniciativa de voluntariado.',
    ],
    vocab: {
      recuento: ['Objetivos', 'pendientes', 'en marcha', 'conseguidos'],
      estudio: 'Lo que dominar', hoja: 'Objetivo', fruto: 'Obstáculo',
      estadosIncognita: ['Pendiente', 'En marcha', 'Conseguido'], resuelta: 'Conseguido',
      dominio: 'caso', enviarResultado: 'la evidencia de que lo conseguiste',
    },
    analisis: `## Cómo juzgar una idea de otro tipo

1. **Valor.** Qué consigue, para quién y por qué importa ahora. Si el objetivo es vago, concrétalo.
2. **Coste.** Tiempo, dinero, energía y lo que deja de hacer (coste de oportunidad).
3. **Alternativas.** Formas más baratas o más probables de conseguir lo mismo.
4. **Viabilidad y riesgos.** Con los medios y el contexto reales del usuario.
5. **Criterio de éxito.** Cómo sabrá que ha funcionado, medible si es posible.`,
    formato: 'Escribe un informe claro y concreto, con datos y fuentes cuando existan, y Referencias.',
    germinacion: 'El tronco es lo que hay que aprender o preparar. Las hojas son objetivos intermedios. Los frutos son obstáculos importantes. Los recursos, lo que ayude de verdad.',
    dominio: 'Caso práctico aplicado a la idea, salvo que el nodo sea teoría pura.',
    verificacion: 'Exige evidencia objetiva y verificable de que el objetivo se cumplió tal como estaba definido.',
  },
};

export const esTipo = (t) => typeof t === 'string' && Object.hasOwn(TIPOS, t);
export const tipoDe = (carpeta) => (esTipo(carpeta?.tipo) ? carpeta.tipo : TIPO_POR_DEFECTO);
// Solo la investigación académica se examina siempre con examen clásico (y su límite en Suficiente).
export const admiteCaso = (tipo) => TIPOS[esTipo(tipo) ? tipo : TIPO_POR_DEFECTO].vocab.dominio !== 'examen';
export const datosTipo = (carpeta) => TIPOS[tipoDe(carpeta)];

// Lo que necesita la interfaz (sin las instrucciones internas de las sesiones).
export function tiposParaInterfaz() {
  return Object.entries(TIPOS).map(([id, t]) => ({ id, nombre: t.nombre, resumen: t.resumen, comoJuzga: t.comoJuzga, ejemplos: t.ejemplos, vocab: t.vocab }));
}

// La ficha «Tu contexto» del usuario, en Markdown para los mensajes de las sesiones.
const CAMPOS_CONTEXTO = { pais: 'País o región', capital: 'Capital disponible', tiempo: 'Tiempo disponible', habilidades: 'Habilidades y formación', metas: 'Metas' };
export function contextoMarkdown(contexto) {
  const lineas = Object.entries(CAMPOS_CONTEXTO)
    .filter(([k]) => String(contexto?.[k] ?? '').trim())
    .map(([k, nombre]) => `- **${nombre}:** ${String(contexto[k]).trim()}`);
  return lineas.length ? lineas.join('\n') : '';
}
export const CLAVES_CONTEXTO = Object.keys(CAMPOS_CONTEXTO);

// Bloque común para los mensajes de cualquier sesión: tipo del bancal, su descripción y el contexto.
export function bloqueBancal(carpeta, contexto) {
  const t = datosTipo(carpeta);
  const ctx = contextoMarkdown(contexto);
  return [
    `## Bancal «${carpeta?.nombre ?? ''}»: ${t.nombre}`,
    ...(String(carpeta?.descripcion ?? '').trim() ? ['', `Descripción del usuario: ${carpeta.descripcion.trim()}`] : []),
    '',
    ctx ? `## Contexto del usuario\n\n${ctx}` : '## Contexto del usuario\n\n_(no lo ha rellenado: si el veredicto depende de él, dilo y pregúntalo)_',
  ].join('\n');
}
