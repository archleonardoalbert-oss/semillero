---
veredicto: cambios
etapa: 2
resumen: Aprender IA merece tu tiempo: la demanda es la más fuerte del mercado tecnológico y sigue creciendo, pero «todo el mundo de la IA» no es un plan; acótalo a ML aplicado con pocos datos y a la ingeniería de LLM, con probabilidad como base y proyectos como prueba.
etiqueta: Sí, pero acotado y con proyectos
---

## Veredicto en una línea

Aprender IA, sí. Hoy es la habilidad técnica con más demanda y con la tendencia más clara al alza de todo el mercado. Además, encaja con tus tres metas y con tu formación matemática. Pero el objetivo «un nivel más que decente en todo este mundo» no se puede cumplir con tu tiempo y no te sirve para contratarte. Necesita **cuatro cambios concretos** (abajo). Con ellos, la idea es buena tal cual.

Primero, una corrección que juega a tu favor.

## Tu intuición sobre los datos es correcta, pero incompleta

Dices que todo el mundo cree que un modelo solo sirve si se entrena con miles de millones de ejemplos durante meses. Tienes razón en que es un mito, aunque conviene saber de dónde sale. Los miles de millones de ejemplos y los meses de cómputo son del **preentrenamiento de modelos fundacionales** (GPT, Claude, Llama). Casi nadie que trabaja en IA hace eso: lo hacen una docena de laboratorios. Casi todo el trabajo real va por otro lado:

1. **Datos tabulares pequeños** (ventas, inventario, clínica, sensores). Allí mandan los árboles con *gradient boosting* (XGBoost, LightGBM) con cientos o miles de filas, y desde 2025 también TabPFN. TabPFN es un modelo fundacional tabular publicado en *Nature* que supera a los árboles ajustados durante 4 h en conjuntos de hasta **10.000 muestras y 500 variables**, en una sola pasada (Hollmann et al., 2025). Corre en CPU para conjuntos pequeños.
2. **Aprendizaje por transferencia y ajuste fino.** Partes de un modelo preentrenado y lo adaptas con decenas o cientos de ejemplos. fast.ai lo enseña desde la primera lección y afirma haber visto resultados de récord con menos de 50 ejemplos.
3. **No entrenar nada.** Un LLM con buenas instrucciones, recuperación de documentos (RAG) y una evaluación seria resuelve hoy muchos problemas que hace tres años pedían un modelo propio.

Lo que te falta en esa intuición: **en el mundo real el problema casi nunca es el volumen de datos, sino su calidad, el planteamiento y la evaluación.** Hay que saber si el modelo de verdad generaliza, si hay fuga de datos, si la métrica es la que le importa al negocio y si un modelo sencillo bastaba. Eso es estadística y criterio, y es justo lo que hoy se paga. Por eso el cambio 2 va de probabilidad y estadística.

## 1. Demanda global (el criterio de más peso)

### 1.1 Visión global y tendencia

Hay que distinguir dos demandas. Una son las ofertas para **construir** IA (ML engineer, AI engineer, data scientist). La otra, mucho más grande, son las ofertas que piden **saber usar** IA en cualquier puesto. Las dos crecen, pero tu objetivo es la primera.

| Indicador | Dato | Fecha | Tendencia |
|---|---|---|---|
| LinkedIn, *Jobs on the Rise* (EE. UU.) | «AI engineer», n.º 1 de los 25 puestos que más crecen; «AI/ML researcher», también en el top 10 | ene. 2026 (datos de ene. 2023 a jul. 2025) | ↑ |
| Stanford AI Index 2026 (datos de Lightcast) | El 2,5 % de las ofertas de EE. UU. pide alguna habilidad de IA: +55 % interanual y +297 % en 10 años. Las habilidades de IA agéntica pasaron del 0,06 % al 0,23 % (unas 90.000 ofertas) | datos de 2025 | ↑ fuerte |
| Stanford AI Index 2026 | Python es la habilidad especializada más pedida en EE. UU. (258.674 ofertas, +30 % frente a 2024) | 2025 | ↑ |
| Indeed Hiring Lab, AI Tracker (EE. UU.) | Ofertas que mencionan IA: 2,4 % → 3,7 % → **7,3 %** | 30-9-2024 → 30-9-2025 → 30-9-2026 | ↑ (se ha triplicado en 2 años) |
| Indeed Hiring Lab (EE. UU.) | El ~45 % de las ofertas de datos y analítica menciona IA; más del 20 % en software, sistemas de TI e I+D | dic. 2025 | ↑ |
| Indeed Hiring Lab (EE. UU.) | El total de ofertas tecnológicas está un **34 % por debajo** del nivel prepandemia; las que mencionan IA, un 45 % por encima | dic. 2025 | el sector tecnológico cae; la IA sube dentro de él |
| WEF, *Future of Jobs 2025* | «AI and machine learning specialists» está entre los 3 puestos que más crecen en porcentaje hasta 2030 (encuesta a más de 1.000 empresas) | ene. 2025 | ↑ |
| BLS (EE. UU.) | Científicos de datos: **+34 %** de empleo en 2024-2034 (frente al 3 % del conjunto), ~23.400 vacantes al año | proyección de 2025 | ↑ |
| Revelio Labs (EE. UU.) | El empleo en puestos de IA ha subido un **19 %** desde nov. 2022, frente al 3 % del resto | sep. 2026 | ↑ |

**Conclusión:** la demanda crece de forma sostenida en todas las fuentes, incluso con el mercado tecnológico general a la baja. Es la tendencia más robusta que puedes encontrar hoy en el mundo técnico.

### 1.2 Por países

**Recuento de LinkedIn** (búsqueda pública exacta «Machine Learning Engineer», consultada el 25-10-2026). Son órdenes de magnitud: LinkedIn redondea, incluye duplicados y suma títulos afines.

| Región | Ofertas «Machine Learning Engineer» | Nota |
|---|---|---|
| Mundo | 34.000+ | «AI Engineer»: 35.000+ |
| EE. UU. | 11.000+ | Stripe, Capital One, Airbnb, Spotify… Hay de júnior a *staff* |
| India | 11.000+ | Infosys, Optum; Bengaluru, Hyderabad, Pune |
| Alemania | 6.000+ | Berlín y Múnich, sobre todo sénior |
| Reino Unido | 6.000+ | Londres; hasta 180.000 £ + acciones en una oferta |
| Canadá | 4.000+ | |
| Brasil | 3.000+ | Muchas remotas para «Latin America» (BairesDev, FullStack) |
| España | 2.000+ | Barcelona y Madrid |
| México | 1.000+ | CDMX, Monterrey, Guadalajara; BairesDev, remotas |
| Latinoamérica | 8.000+ | Región completa |
| **Cuba** | sin mercado medible | Ni LinkedIn ni Indeed operan como portal en Cuba; no hay un portal nacional de ofertas de IA |

**Proporción de ofertas que mencionan IA** (Indeed AI Tracker, media móvil de 7 días, datos abiertos CC BY 4.0):

| País | 30-9-2024 | 30-9-2025 | 30-9-2026 |
|---|---|---|---|
| Canadá | 3,3 % | 5,7 % | **19,0 %** |
| Irlanda | 5,5 % | 9,9 % | 15,0 % |
| Reino Unido | 2,7 % | 5,1 % | 9,9 % |
| EE. UU. | 2,4 % | 3,7 % | 7,3 % |
| Australia | 2,6 % | 4,9 % | 7,1 % |
| Alemania | 2,3 % | 3,6 % | 5,7 % |
| Italia | 2,8 % | 3,3 % | 4,8 % |
| Francia | 2,1 % | 2,8 % | 4,5 % |
| Países Bajos | 2,0 % | 2,3 % | 3,6 % |

**Relativo al tamaño del mercado** (Stanford AI Index 2026, Lightcast, 2025): Singapur 4,8 %, Hong Kong 3,5 %, Luxemburgo 3,4 %, **España 3,3 %** y EE. UU. 2,6 %. En la UE, Alemania lidera en número absoluto, seguida de Francia y Polonia.

**India** (Naukri JobSpeak): la contratación en IA/ML subió un **+45 %** en el año fiscal 2026 (hasta marzo de 2026) y un **+31 %** interanual en agosto de 2026, mientras el resto de la TI caía o se estancaba. El mayor crecimiento estuvo en los salarios altos.

**Latinoamérica:**
- El BID (Informe Macroeconómico 2026, 6,2 millones de ofertas en 15 países) halló que el 7 % de las vacantes mencionaba IA en junio de 2025, el máximo de su serie.
- El estudio de CAF y la UBA, que mide solo portales tradicionales, da cifras más bajas: Argentina, del 0,6 % al 2,6 % (2026); México, del 0,3 % al 0,5 %; Colombia, del 0,9 % al 0,5 %.
- La región **demanda poco localmente**. Su valor real para ti es como **zona horaria compatible** de empresas que contratan en remoto.

**Tu país.** En Cuba no hay demanda privada medible de ML: las mipymes son unas 9.967 (ONEI, jun. 2026) y casi todas son comercio. Para ti, la vía es **remota**, y aquí está el mayor riesgo de toda la idea:
- La Orden Ejecutiva 14404 (1-5-2026) permite sancionar a personas e instituciones financieras **no estadounidenses** por ciertas operaciones relacionadas con Cuba. Eso empuja a las empresas extranjeras a no contratar ni pagar a Cuba.
- Según prensa especializada (no he podido leer la nota original del bufete), desde el 30-9-2026 los bancos bajo jurisdicción de EE. UU. ya no pueden mantener cuentas de emprendedores privados cubanos. El 13-7-2026, la OFAC sancionó 13 billeteras de criptomonedas ligadas al Estado cubano.
- No he podido confirmar si Upwork admite hoy a usuarios en Cuba. Su página de elegibilidad remite a las restricciones de EE. UU.

En la práctica, el mercado remoto alcanzable son empresas **europeas, canadienses y latinoamericanas sin exposición a EE. UU.**, o un empleo tras emigrar. Esto no cambia que debas aprender IA, pero sí **qué tipo de prueba de nivel necesitas**: con tantas barreras para contratarte, tu currículum tiene que ser un portafolio público irrefutable, no un título.

### 1.3 Por sectores y puestos

| Sector o empresa | Qué piden | Fuente |
|---|---|---|
| Servicios profesionales, científicos y técnicos (consultoras, I+D) | Es el sector con más ofertas de IA: 20.500 en EE. UU. (ago. 2026), seguido de manufactura e información | Lightcast (en CFO.com) |
| Fuera de TI | El 51 % de las ofertas con habilidades de IA está fuera de TI e informática (2024) | Lightcast, jul. 2025 |
| Fintech y banca | Fraude, riesgo, crédito (Barclays, Wise, Capital One, Nubank, Konfío) | Ofertas visibles en LinkedIn |
| Comercio electrónico y plataformas | Recomendación y personalización (ASOS, Deliveroo, Airbnb, Spotify) | LinkedIn |
| Salud y farmacia | Teva, Optum, athenahealth | LinkedIn |
| Startups de LLM y agentes | Agentes, RAG, evaluación, IA de voz | LinkedIn (voize, HappyRobot, EvenUp) |
| *Nearshore* latinoamericano | BairesDev, FullStack, EPAM: remoto para clientes de EE. UU. (choca con las sanciones a Cuba) | LinkedIn |

Por tipo de puesto: ML engineer, AI engineer (LLM, RAG, agentes), data scientist, MLOps e investigador de IA. Este último es el que conecta con tu meta 3 y exige posgrado o publicaciones.

### 1.4 Salarios y prima salarial

| Dato | Cifra | Fecha | Fuente |
|---|---|---|---|
| Prima de las ofertas que piden habilidades de IA | **+28 %** (~18.000 USD/año); +43 % con dos o más habilidades (este último dato no lo he verificado en la fuente primaria) | jul. 2025 | Lightcast, *Beyond the Buzz* |
| Científico de datos, EE. UU., mediana | 112.590 USD (p10: 63.650; p90: 194.410) | may. 2024 | BLS |
| ML engineer, EE. UU., salario base medio | ~160.000 USD (p25-p75: 129.000-202.000) | 2026 | Glassdoor (vía fuentes secundarias) |
| ML engineer, EE. UU., compensación total | Mediana de 145.000-264.000 USD según el nivel | ago. 2026 | Levels.fyi (las cifras varían por página) |
| India | El tramo salarial que más crece es el de más de 50 lakh/año (+55 % en mar. 2026) | 2026 | Naukri |
| Contrapunto | La prima salarial de los puestos **expuestos** a la IA (no de los que construyen IA) ha caído a ~0 | sep. 2026 | Revelio Labs |

Lectura honesta: la prima la cobra quien **construye y evalúa** sistemas de IA. Quien solo «usa IA» no la cobra, porque usarla se ha vuelto lo normal.

### 1.5 Nivel que exigen las ofertas

Es el dato más incómodo:
- En las empresas que adoptan IA, la plantilla sénior ha crecido un **32 %** desde nov. 2022 y la júnior, solo un **6 %**. La caída de ofertas se concentra en los niveles júnior (Revelio Labs, sep. 2026).
- Los trabajadores de 22 a 25 años en las ocupaciones más expuestas están un **20 % por debajo** frente a las menos expuestas. A los mayores les pasa un 6 % (Revelio Labs). La actualización de ago. 2026 del estudio de Stanford (Brynjolfsson et al.) da un 19 %, frente al 13 % de un año antes, aunque solo la recoge una fuente.
- En las ofertas visibles de LinkedIn domina lo sénior. Las ofertas júnior existen, pero son pocas.

**Con qué otras habilidades se pide:** Python (casi siempre), SQL, nube (AWS), Docker, PyTorch, despliegue de modelos (MLOps), estadística y, en AI engineer, RAG, agentes y evaluación (*evals*).

Consecuencia: el mercado no paga por «saber IA». Paga por **haber entregado sistemas que funcionan**. Para un júnior sin acceso fácil al mercado, la única forma de saltarse el filtro es un portafolio con proyectos reales y medidos.

### 1.6 Tabla de fuentes de demanda

| Portal o estudio | Fecha de consulta o de los datos | Cifra clave | Enlace |
|---|---|---|---|
| LinkedIn Jobs (búsqueda pública) | 25-10-2026 | 34.000+ ML engineer en el mundo; 11.000+ en EE. UU. y en India | [linkedin.com/jobs](https://www.linkedin.com/jobs/search?keywords=Machine%20Learning%20Engineer&location=Worldwide) |
| LinkedIn, *Jobs on the Rise* 2026 | ene. 2026 | AI engineer, n.º 1 en EE. UU. y Australia | [HR Leader](https://www.hrleader.com.au/business/27698-ai-engineer-tops-linkedin-s-2026-jobs-on-the-rise-list) |
| Indeed Hiring Lab, AI Tracker | datos al 30-9-2026 | EE. UU. 7,3 %; Canadá 19,0 % | [GitHub hiring-lab/ai-tracker](https://github.com/hiring-lab/ai-tracker) |
| Indeed Hiring Lab, actualización de enero | 22-1-2026 | 45 % en datos y analítica; sector tecnológico −34 % frente a la prepandemia | [hiringlab.indeed.com](https://hiringlab.indeed.com/2026/01/22/january-labor-market-update-jobs-mentioning-ai-are-growing-amid-broader-hiring-weakness/) |
| Stanford AI Index 2026 / Lightcast | datos de 2025 | 2,5 % en EE. UU. (+55 %); Singapur 4,8 %, España 3,3 % | [Lightcast](https://lightcast.io/resources/blog/stanford-ai-2026) |
| Lightcast, *Beyond the Buzz* | jul. 2025 | Prima del +28 % | [Lightcast](https://lightcast.io/resources/blog/beyond-the-buzz-press-release-2025-07-23) |
| BLS, OOH Data Scientists | datos de 2024 | +34 % en 2024-2034; 112.590 USD | [bls.gov](https://www.bls.gov/ooh/math/data-scientists.htm) |
| Revelio Labs, AI Labor Market Tracker | sep. 2026 | Sénior +32 % frente a júnior +6 % | [reveliolabs.com](https://www.reveliolabs.com/ai-labor-market-tracker/us/september-2026/) |
| Naukri JobSpeak | ago. 2026 | IA/ML +31 % interanual | [naukri.com/blog](https://www.naukri.com/blog/naukri-jobspeak-white-collar-hiring-grows-6-in-june-2026-ai-ml-and-fresher-hiring-lead-the-charge/) |
| BID y CAF (Latinoamérica) | 2025-2026 | 7 % de las vacantes (BID); Argentina 2,6 % (CAF) | [BID](https://publications.iadb.org/es/que-trabajos-se-estan-creando-en-america-latina-analisis-de-las-vacantes-laborales-electronicas) |
| EURES/ELA, escasez laboral | 2024 (publicado en 2026) | Desarrolladores de software entre las escaseces graves (p. ej., Chipre); sin desglose de IA en la UE | [ELA](https://www.ela.europa.eu/sites/default/files/2026-06/labour-shortages-report-ela-2025.pdf) |
| WEF, *Future of Jobs* 2025 | ene. 2025 | Especialistas en IA/ML, en el top 3 de crecimiento | [WEF](https://www.weforum.org/publications/the-future-of-jobs-report-2025/) |

**Fuentes que no pude consultar:**
- **Bloqueadas:** InfoJobs (error 456), SEEK (403), Computrabajo (página vacía) y la nota del bufete HSF Kramer sobre la OFAC (403).
- **No consultadas:** Indeed nacional, Glassdoor, ZipRecruiter, StepStone, Welcome to the Jungle y la base OCDE *Skills for Jobs*.

No he usado cifras de ninguna de ellas. No pude generar figuras en esta sesión (sin permiso de ejecución), así que los datos van en tablas.

## 2. Exposición a la IA

- **OIT (mayo de 2025):** ~25 % del empleo mundial tiene alguna exposición a la IA generativa, pero solo el 3,3 % está en el grado más alto. Lo más probable es que se transformen tareas, no que desaparezcan empleos. La exposición es del ~11 % en países de renta baja y del 34 % en los de renta alta.
- **Anthropic Economic Index (ene. 2026, datos de nov. 2025):**
  - la programación es el uso dominante;
  - en Claude.ai, el 52 % del uso aumenta tareas y el 45 % las automatiza;
  - en la API empresarial, ~75-77 % es automatización.

Lo he verificado solo en fuentes secundarias.

**Para esta habilidad, el efecto se reparte en dos capas:**
- **La capa de «conectar una API y escribir un *prompt»* se está abaratando muy deprisa.** La IA automatiza buena parte de la programación júnior, y eso explica la caída de la contratación júnior de arriba.
- **La capa de criterio vale cada vez más:** plantear el problema, preparar los datos, elegir entre un modelo sencillo, ajuste fino o RAG, evaluar con rigor y llevarlo a producción. Las herramientas de IA **multiplican** a quien sabe hacer eso, porque un ingeniero de ML con agentes de código rinde como tres.

En tu caso concreto, programar con Claude Code es una ventaja **si entiendes lo que el código hace**. Si no, es una trampa: el mercado ya no paga a quien solo sabe pedirle código a una IA.

## 3. Coste en tiempo, realista

Tu base cubre de sobra el álgebra lineal y el cálculo que hacen falta. **Te falta probabilidad y estadística** (no aparece en tu formación, y en tu proyecto de conectomas te declaraste en nivel 0-1). También te faltan optimización básica y práctica con datos sucios.

Estimación hasta un nivel **útil y contratable como ML/AI engineer júnior** (no investigador):

| Bloque | Horas | Referencia |
|---|---|---|
| Probabilidad y estadística aplicadas (inferencia, validación, sesgo y varianza) | 60-80 | Estimación propia (curso universitario de un semestre) |
| ML clásico (scikit-learn, *boosting*, validación) | 100-120 | La *Machine Learning Specialization* de Andrew Ng tiene ~95 h y se estima en ~10 semanas a 5-10 h/semana |
| Aprendizaje profundo práctico (PyTorch, transferencia) | 90-110 | fast.ai: 9 lecciones de ~90 min, más práctica |
| LLM: RAG, ajuste fino con LoRA, evaluación, agentes | 60-80 | Estimación propia |
| Despliegue (API, Docker, monitorización); ya sabes Django | 30-40 | Estimación propia |
| 3 proyectos de portafolio medidos | 150-200 | Estimación propia |
| **Total** | **~500-630 h** | |

Tu ritmo cambia el plazo radicalmente. Indicas «3» como tiempo disponible:
- **Si son 3 h/semana:** ~3,5 años. Así, «todo el mundo de la IA» no se puede, y ni siquiera la ruta reducida si no la integras con la carrera (asignaturas, tesis, el proyecto de conectomas).
- **Si son 3 h/día (~20 h/semana):** 6-8 meses. Es razonable.

La práctica deliberada ayuda aquí, pero menos que en el ajedrez o la música (Macnamara et al., 2014): en ML, lo que más enseña son proyectos con datos reales y retroalimentación externa (competiciones, usuarios).

**Restricciones físicas en Cuba:**
- Apagones y conexión cara.
- Plataformas con GPU gratis (Kaggle, Colab) que pueden no estar accesibles o ser inestables desde Cuba. Compruébalo antes de planificar.

Esto **refuerza el enfoque de pocos datos**: scikit-learn, *boosting*, TabPFN y modelos pequeños preentrenados corren en un portátil sin GPU. El preentrenamiento a gran escala, además de inalcanzable, no te hace falta.

## 4. Retorno y alternativas

- **Frente a quedarte en el desarrollo web (Django):** el sector tecnológico general está un 34 % por debajo de la prepandemia en EE. UU., mientras la IA crece. Además, tu Django ya sirve para desplegar modelos, así que no compiten: se suman.
- **Frente a «solo ingeniería de LLM» (la vía rápida):** cuesta un 60 % menos de horas y es lo más pedido en 2026, pero es la capa que más se abarata. Sin ML clásico ni estadística serás intercambiable.
- **Frente a la vía de investigación (tu meta 3):** el impacto académico notable en IA pide un posgrado y publicaciones, y compite con laboratorios con miles de GPU. Tu ventaja realista no está en escalar modelos, sino en **lo matemático y en los datos pequeños**: el análisis espectral, la dinámica y la neurociencia computacional, que es justo lo que ya haces con el conectoma. Esa vía merece su propio análisis (camino abajo).

## 5. Los cambios necesarios

**Cambio 1. Sustituir «todo el mundo de la IA» por un perfil concreto: ML aplicado con pocos datos + ingeniería de LLM.**
- **Por qué:** «Todo» no tiene fin ni criterio de éxito, y ninguna oferta lo pide.
- **Cómo:** el perfil acotado coincide con tu intuición (pocos datos), con lo que más se demanda (ML engineer y AI engineer) y con lo que puedes ejecutar sin GPU.
- **Impacto:** pasa de un objetivo imposible a un nivel contratable en ~500-600 h.

**Cambio 2. Empezar por probabilidad y estadística, en paralelo con ML clásico, no después.**
- **Por qué:** es tu único hueco de base y es la diferencia entre quien entrena modelos y quien sabe si funcionan.
- **Impacto:** sin ella, tus proyectos tendrán fugas de datos y métricas engañosas, y una entrevista técnica lo detecta en cinco minutos.

**Cambio 3. Que cada bloque termine en un proyecto público y medido, no en un certificado.**
- **Por qué:** con las barreras de contratación desde Cuba, nadie te va a contratar por un certificado de Coursera. Te contratarán por un repositorio con un problema real, una línea base, una evaluación honesta y una demo desplegada.
- **Proyectos con sentido:**
  - **(a)** Predicción de demanda e inventario con pocos datos sobre datos reales de comercio. Tu proyecto Economy te da el contexto (comercio taller → almacén → local).
  - **(b)** Un clasificador o extractor de documentos en español con un modelo preentrenado y menos de 500 ejemplos etiquetados.
  - **(c)** Un sistema RAG con evaluación cuantitativa.

**Cambio 4. Decidir la vía de empleo antes de empezar y aprender en esa dirección.**
- **Por qué:** el mercado accesible desde Cuba son empresas no estadounidenses y en remoto. Eso implica inglés técnico fluido (entrevistas), perfil público en GitHub y Kaggle, y evitar especializarte en herramientas de proveedores que bloquean Cuba.
- **Impacto:** reduce el riesgo de aprender durante un año y no poder cobrar.

## 6. Próximos pasos (asumiendo los cambios)

1. **Esta semana:** comprueba desde Cuba el acceso a Kaggle, Colab, Hugging Face y PyPI, y monta un entorno local con Python, scikit-learn y PyTorch para CPU. Confirma también cuántas horas reales tienes por semana.
2. **Semanas 1-6:** probabilidad y estadística aplicadas en paralelo con la *Machine Learning Specialization* (o el libro *Hands-On ML*, de Géron).
   - **Hito:** un proyecto tabular con validación cruzada bien hecha, comparando una regresión logística, LightGBM y TabPFN.
3. **Semanas 7-12:** fast.ai (aprendizaje profundo práctico, transferencia).
   - **Hito:** el proyecto (b), con menos de 500 ejemplos y una métrica frente a una línea base.
4. **Semanas 13-16:** LLM: RAG, LoRA y evaluación.
   - **Hito:** el proyecto (c).
5. **Semanas 17-24:** el proyecto (a), desplegado con Django, y una competición de Kaggle con el objetivo de quedar en el 10 % superior.
6. **Después:** con portafolio, empieza a postular a empresas europeas o latinoamericanas que contraten en remoto. Para la meta 3, valora la vía de investigación (camino abajo).

(Las semanas suponen ~20 h/semana; a 3 h/semana, multiplícalas por 6-7.)

## 7. Plan de comprobación

- **Kaggle:** una medalla de bronce (10 % superior) en una competición tabular y otra en una de visión o texto. Es la prueba de nivel más objetiva y gratuita.
- **Proyectos:** cada uno tiene que superar una línea base razonable con una métrica de negocio. Tiene que llevar un informe de errores y una demo desplegada.
- **Reproducir un artículo:** por ejemplo, el experimento de TabPFN frente a *boosting* en 5 conjuntos pequeños. Así demuestras que sabes leer investigación, que es la base de la meta 3.
- **Entrevista simulada:** resolver sin IA un ejercicio típico de entrevista de ML (validación, fuga de datos, elegir una métrica).

## 8. Relación con tus otras ideas

- **Ablación espectral del conectoma de *C. elegans*** (en germinación, veredicto «cambios»): el bloque de estadística te sirve directamente allí, porque la estadística seria era el punto débil del proyecto. Y la combinación «álgebra espectral + ML + neurociencia» es tu nicho natural para la meta 3.
- **ERP/Economy** (no recomendado como negocio): su mejor uso era como portafolio. Un módulo de predicción de demanda con pocos datos convierte ese portafolio de «sé hacer un CRUD» en «sé hacer ML aplicado».
- **Memoria neuronal** (rechazada): su lección era «hipótesis concretas y acotadas». Esta idea tiene el mismo defecto, el alcance infinito, y se corrige igual.

```semillero-caminos
[
  { "id": "ml-aplicado-pocos-datos", "tipo": "variacion", "titulo": "ML aplicado con pocos datos + LLM", "descripcion": "La versión acotada de esta idea: **estadística → ML clásico → aprendizaje profundo con transferencia → RAG y LoRA**, con 3 proyectos medidos y Kaggle. ~500-600 h hasta un nivel contratable como ML/AI engineer júnior, sin GPU propia." },
  { "id": "solo-ingenieria-llm", "tipo": "variacion", "titulo": "Vía rápida: solo ingeniería de LLM", "descripcion": "RAG, agentes, evaluación y ajuste fino sobre modelos existentes. Cuesta **~40 % de las horas** y es lo más pedido en 2026, pero es la capa que más se abarata. Tiene sentido si tu prioridad es un empleo pronto." },
  { "id": "ia-investigacion-neuro", "tipo": "variacion", "titulo": "IA para investigación (meta 3)", "descripcion": "Reorientar el aprendizaje hacia **teoría del aprendizaje, dinámica de redes y neurociencia computacional**, aprovechando tu álgebra y el proyecto del conectoma. Más horas, sin salida laboral inmediata, pero es la vía hacia el impacto académico." },
  { "id": "probabilidad-estadistica-ml", "tipo": "idea-nueva", "titulo": "Aprender probabilidad y estadística para ML", "descripcion": "Tu único hueco de base, y el que separa a quien entrena modelos de quien sabe si funcionan. También es el punto débil de tu proyecto de conectomas. Merece su propio plan." },
  { "id": "prediccion-demanda-mipymes", "tipo": "idea-nueva", "titulo": "Predicción de demanda con pocos datos para Economy", "descripcion": "Un módulo de previsión de inventario con *boosting* y TabPFN sobre datos de comercio pequeños, desplegado con Django. Es un proyecto de portafolio de ML aplicado y quizá un diferenciador frente a los competidores locales sin conexión." }
]
```

## Referencias

- Hollmann, N. et al. (2025). *Accurate predictions on small data with a tabular foundation model*. Nature 637, 319-326. [doi:10.1038/s41586-024-08328-6](https://pubmed.ncbi.nlm.nih.gov/39780007/)
- fast.ai, *Practical Deep Learning for Coders*. [course.fast.ai](https://course.fast.ai/)
- DeepLearning.AI, *Machine Learning Specialization*. [deeplearning.ai](https://www.deeplearning.ai/specializations/machine-learning)
- Indeed Hiring Lab, AI Tracker (datos abiertos, CC BY 4.0). [github.com/hiring-lab/ai-tracker](https://github.com/hiring-lab/ai-tracker) · [CSV](https://raw.githubusercontent.com/hiring-lab/ai-tracker/master/AI_posting.csv)
- Indeed Hiring Lab (22-1-2026). *January labor market update: jobs mentioning AI are growing amid broader hiring weakness*. [hiringlab.indeed.com](https://hiringlab.indeed.com/2026/01/22/january-labor-market-update-jobs-mentioning-ai-are-growing-amid-broader-hiring-weakness/)
- Lightcast (2026). *Four Takeaways from the 2026 Stanford AI Index*. [lightcast.io](https://lightcast.io/resources/blog/stanford-ai-2026)
- Lightcast (jul. 2025). *Beyond the Buzz: AI skills command 28 % salary premium*. [lightcast.io](https://lightcast.io/resources/blog/beyond-the-buzz-press-release-2025-07-23)
- CFO.com. *Demand for AI expertise far outpaces wage growth* (dato de Lightcast de ago. 2026). [cfo.com](https://www.cfo.com/news/demand-for-ai-expertise-far-outpaces-wage-growth/831171/)
- HR Leader (ene. 2026). *AI engineer tops LinkedIn's 2026 Jobs on the Rise list*. [hrleader.com.au](https://www.hrleader.com.au/business/27698-ai-engineer-tops-linkedin-s-2026-jobs-on-the-rise-list) · [Social Media Today](https://www.socialmediatoday.com/news/linkedin-shares-data-on-rising-job-roles/809069/)
- LinkedIn Jobs, búsquedas públicas (25-10-2026): [mundo](https://www.linkedin.com/jobs/search?keywords=Machine%20Learning%20Engineer&location=Worldwide), [EE. UU.](https://www.linkedin.com/jobs/search?keywords=Machine%20Learning%20Engineer&location=United%20States), [India](https://www.linkedin.com/jobs/search?keywords=Machine%20Learning%20Engineer&location=India), [Alemania](https://www.linkedin.com/jobs/search?keywords=Machine%20Learning%20Engineer&location=Germany), [Reino Unido](https://www.linkedin.com/jobs/search?keywords=Machine%20Learning%20Engineer&location=United%20Kingdom), [España](https://www.linkedin.com/jobs/search?keywords=Machine%20Learning%20Engineer&location=Spain), [Brasil](https://www.linkedin.com/jobs/search?keywords=Machine%20Learning%20Engineer&location=Brazil), [México](https://www.linkedin.com/jobs/search?keywords=Machine%20Learning%20Engineer&location=Mexico), [Canadá](https://www.linkedin.com/jobs/search?keywords=Machine%20Learning%20Engineer&location=Canada), [Latinoamérica](https://www.linkedin.com/jobs/search?keywords=Machine%20Learning%20Engineer&location=Latin%20America), [AI Engineer, mundo](https://www.linkedin.com/jobs/search?keywords=AI%20Engineer&location=Worldwide)
- U.S. Bureau of Labor Statistics, *Occupational Outlook Handbook: Data Scientists*. [bls.gov](https://www.bls.gov/ooh/math/data-scientists.htm)
- Revelio Labs (1-10-2026). *AI Labor Market Tracker, US, September 2026*. [reveliolabs.com](https://www.reveliolabs.com/ai-labor-market-tracker/us/september-2026/)
- Computing (2026). *AI is closing the door on entry-level jobs, study finds* (actualización del estudio de Brynjolfsson, Chandar y Chen). [computing.co.uk](https://www.computing.co.uk/news/2026/ai/ai-is-closing-the-door-on-entry-level-jobs-study-finds)
- Naukri JobSpeak (2026). [naukri.com/blog](https://www.naukri.com/blog/naukri-jobspeak-white-collar-hiring-grows-6-in-june-2026-ai-ml-and-fresher-hiring-lead-the-charge/) · [StaffingIndustry, ago. 2026](https://www.staffingindustry.com/news/global-daily-news/indias-ai-hiring-surge-fuels-14-jump-in-white-collar-recruitment)
- BID. *¿Qué trabajos se están creando en América Latina?* [publications.iadb.org](https://publications.iadb.org/es/que-trabajos-se-estan-creando-en-america-latina-analisis-de-las-vacantes-laborales-electronicas) · CAF/IIEP en [El Economista](https://eleconomista.com.ar/economia/mercado-laboral-2026-cuales-son-perfiles-inteligencia-artificial-mas-buscados-argentina-n98048/amp)
- European Labour Authority / EURES (2026). *Labour shortages report 2025*. [ela.europa.eu](https://www.ela.europa.eu/sites/default/files/2026-06/labour-shortages-report-ela-2025.pdf)
- World Economic Forum (2025). *Future of Jobs Report 2025*. [weforum.org](https://www.weforum.org/publications/the-future-of-jobs-report-2025/) · resumen en [etradeforall.org](https://etradeforall.org/node/12999)
- OIT (2025). *Generative AI and Jobs: A Refined Global Index of Occupational Exposure*, Working Paper 140. [ilo.org](https://www.ilo.org/node/706766)
- Anthropic Economic Index (ene. 2026), resumen secundario. [anthropic.com](https://www.anthropic.com/news/the-anthropic-economic-index) · [zenvanriel.com](https://zenvanriel.com/ai-engineer-blog/anthropic-economic-index-ai-workforce-impact-data/)
- Sanciones a Cuba en 2026: [Sidley, OE 14404](https://whitecollarwatch.sidley.com/category/ofac/) · [HSF Kramer](https://www.hsfkramer.com/notes/sanctions/2026-posts/ofac-expands-cuba-sanctions-and-tightens-financial-and-travel-restrictions) (no accesible, citado en búsqueda) · [Directorio Cubano](https://www.directoriocubano.info/?p=153184) · [KuCoin News, billeteras sancionadas](https://www.kucoin.com/news/flash/u-s-treasury-sanctions-13-crypto-wallets-linked-to-cuban-regime) · [Upwork, elegibilidad](https://support.upwork.com/hc/en-us/articles/211067778)
- Macnamara, B. N., Hambrick, D. Z. y Oswald, F. L. (2014). *Deliberate practice and performance in music, games, sports, education, and professions: a meta-analysis*. Psychological Science 25(8). [doi:10.1177/0956797614535810](https://doi.org/10.1177/0956797614535810)
