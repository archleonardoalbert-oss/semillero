# Transformers y procesamiento del lenguaje en español

## Por qué está en el curso

Los transformers son la arquitectura de todos los LLM, y entender cómo funcionan por dentro es lo que distingue a un ingeniero de IA de alguien que solo llama a una API. En el diagnóstico te pusiste un 1 («he llamado a la API de un LLM») y no resolviste los ejercicios de atención ni de LoRA, así que la asignatura es completa.

Tiene una orientación deliberada: **el español con pocos ejemplos**. Hay dos razones:

1. **Es tu ventaja comparativa.** El mercado hispanohablante (España, Latinoamérica y empresas que atienden a clientes hispanos) necesita sistemas que funcionen bien en español, y hay mucho menos talento que en inglés.
2. **Es una vía académica real.** Existe una comunidad investigadora activa en PLN en español con foros de evaluación abiertos (IberLEF, de la SEPLN). Es el terreno del reto de nivel «Tarea compartida de IberLEF».

## Prerrequisitos

- Aprendizaje profundo, conferencias 1-7 y 10-11 (bucle de entrenamiento, transferencia, *embeddings*, atención).
- El repaso de matemáticas, conferencias 1 y 4 (coseno, SVD).
- Probabilidad, conferencia 11 (entropía cruzada).

## Objetivos de la asignatura

- **Explicar** la tokenización por subpalabras y sus efectos en español (acentos, morfología).
- **Escribir** y **justificar** la atención de producto escalar escalada, $\mathrm{softmax}(QK^\top/\sqrt{d_k})\,V$, y la arquitectura transformer completa.
- **Ajustar** un codificador preentrenado en español para clasificación con la biblioteca `transformers`.
- **Comparar** estrategias con pocos ejemplos: TF-IDF + regresión logística, *embeddings* + regresión logística, SetFit, ajuste fino y clasificación sin ejemplos (*zero-shot*).
- **Describir** cómo genera texto un decodificador y **controlar** la decodificación (temperatura, *top-p*).
- **Ejecutar** en local un LLM abierto pequeño y **elegirlo** según su tamaño, su licencia y su calidad en español.
- **Evaluar** un modelo de lenguaje sin caer en la contaminación de datos.

## Programa por conferencias

1. **El texto como datos.** Normalización, tokenización (BPE, WordPiece, SentencePiece), vocabulario y longitud. Por qué el español gasta más *tokens* por palabra que el inglés en muchos modelos.
2. ***Embeddings*.** De *one-hot* a word2vec; *embeddings* de oraciones (Sentence Transformers); similitud del coseno y búsqueda semántica; modelos multilingües.
3. **Atención y transformer.**
   - Consultas, claves y valores.
   - Por qué se divide entre $\sqrt{d_k}$: si $q$ y $k$ tienen componentes de varianza 1, $q^\top k$ tiene varianza $d_k$ y el *softmax* se satura.
   - Atención multicabeza, codificación posicional, conexiones residuales y normalización.
   - **Implementación** de un transformer pequeño desde cero en PyTorch.
4. **Codificadores preentrenados.**
   - BERT y el modelado de lenguaje enmascarado.
   - Modelos en español: BETO (Universidad de Chile) y RoBERTa-BNE (MarIA, Plan TL del Gobierno de España).
   - Modelos multilingües y cuándo conviene cada uno.
5. **Ajuste fino para clasificación.** `AutoTokenizer`, `AutoModelForSequenceClassification` y `Trainer`; tamaños de lote en 6 GB; evaluación con intervalos.
6. **Pocos ejemplos.**
   - SetFit (aprendizaje contrastivo con Sentence Transformers: con 8 ejemplos por clase puede competir con el ajuste fino completo en algunos conjuntos).
   - Clasificación sin ejemplos por inferencia en lenguaje natural.
   - *Embeddings* + regresión logística como línea base fuerte.
7. **Extracción de información.** Reconocimiento de entidades (NER) como clasificación de *tokens*; extraer campos de documentos.
8. **Decodificadores.**
   - El modelado de lenguaje autorregresivo; la generación y las estrategias de decodificación (voraz, por haz, muestreo con temperatura, *top-k* y *top-p*).
   - Por qué un LLM «alucina»: maximiza la verosimilitud, no la verdad.
9. **Modelos abiertos pequeños en local.**
   - Familias con licencias permisivas: Qwen3 (Apache 2.0) y Salamandra (BSC, Apache 2.0, entrenado con mucho texto en lenguas de España).
   - Qué tamaños caben en 6 GB y la cuantización (8 bits, 4 bits, GGUF).
   - `llama.cpp` y `transformers`.
   - Los presupuestos de descarga: unos 0,5-5 GB por modelo.
10. **Evaluar modelos de lenguaje.** Métricas por tarea, contaminación de los conjuntos de prueba, sesgos y variedades del español (el cubano incluido), y la evaluación humana.

## Clases prácticas

- **P1 (conf. 3):** un transformer pequeño desde cero que aprenda a invertir secuencias, con los mapas de atención visualizados.
- **P2 (conf. 4-6):** la meta práctica «Clasificación de textos en español con menos de 500 ejemplos».
- **P3 (conf. 9):** ejecuta en local dos LLM pequeños y compara su calidad en 30 preguntas en español escritas por ti, con una rúbrica.

## Demostraciones para valientes

- Demuestra que la atención sin codificación posicional es equivariante por permutaciones.
- Calcula el coste en memoria y en operaciones de la atención en función de la longitud $n$ y de $d$, y explica qué guarda la caché KV durante la generación.

## Evaluación

- **Examen sin asistente (40 %):** atención y $\sqrt{d_k}$, conteo de parámetros, tokenización y estrategias con pocos datos.
- **Prácticas P1-P3 (60 %).**
- **Criterio de paso:** el transformer de P1 funcionando y la curva de aprendizaje de P2 con intervalos.

## Bibliografía principal

- **Hugging Face, *Curso de LLM*** (antes «Curso de NLP»), versión en español: caps. 1-4 (Transformers, uso, ajuste fino, compartir modelos) y 5-8 (Datasets, Tokenizers, tareas clásicas de PLN).

  > **Aviso:** los capítulos posteriores (11 en adelante, ajuste fino de LLM) **no están en español**; la página redirige a la versión inglesa. El material de las conferencias lo cubrirá.
- **Fuentes Pineda, G.** *Curso de aprendizaje profundo* (PCIC-UNAM, 2027-1), unidad «Redes basadas en atención».
- **Revista *Procesamiento del Lenguaje Natural*** (SEPLN), de acceso abierto y con muchos artículos en español. Úsala para ver cómo se evalúan sistemas para el español (conferencias 4, 6 y 10).
- **Amat Rodrigo, J.** «Sistema de recomendación de vinos con transfer learning y búsqueda semántica», cienciadedatos.net: para la conferencia 2.

## Referencias

- Hugging Face. *Curso de LLM / NLP* (en español). https://huggingface.co/learn/llm-course/es/chapter1/1
- Vaswani, A. et al. (2017). Attention is all you need. *NeurIPS*.
- Cañete, J. et al. (2020). Spanish pre-trained BERT model and evaluation data. *PML4DC, ICLR*.
- Gutiérrez-Fandiño, A. et al. (2022). MarIA: Spanish language models. *Procesamiento del Lenguaje Natural* 68, 39-60.
- Tunstall, L. et al. (2022). Efficient few-shot learning without prompts. arXiv:2209.11055.
- Barcelona Supercomputing Center, Language Technologies Unit (2025). Salamandra Technical Report. arXiv:2502.08489.
- Revista *Procesamiento del Lenguaje Natural*, SEPLN. http://journal.sepln.org/sepln/ojs/ojs/index.php/pln
