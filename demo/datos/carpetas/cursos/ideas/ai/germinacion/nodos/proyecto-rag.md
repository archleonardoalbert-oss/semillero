# Proyecto 3: un asistente RAG sobre la normativa cubana para mipymes, evaluado

## Cómo se llegó a este problema

El diagnóstico tenía un ejercicio que no respondiste: montar un asistente sobre 2.000 PDF de normativa interna y, **sobre todo, medir si responde bien**. Este proyecto es ese ejercicio con un corpus que conoces y que le importa a gente real.

En 2026 la normativa para el sector privado cubano cambió varias veces:

- el Decreto 160, que reduce las actividades prohibidas desde el 4-8-2026;
- el Decreto-Ley 133, que elimina el tope de 100 trabajadores;
- las normas sobre socios en el exterior;
- la obligación de canales de pago electrónico.

Los dueños de mipymes necesitan entender qué pueden hacer y qué no, y los textos están en la Gaceta Oficial, que es pública pero de lectura difícil. Un asistente que **cite el artículo exacto** y diga «no lo sé» cuando no haya respuesta sería útil. También es el tipo de sistema (RAG con evaluación) que más se pide en las ofertas de *AI engineer* de 2026.

## El problema

> **Meta.** Sobre un corpus de normas cubanas vigentes para el sector privado (decretos, resoluciones y sus modificaciones; de 50 a 300 documentos de la Gaceta Oficial), con un LLM **local** y *embeddings* abiertos:
> 1. **Construye el conjunto de evaluación antes que el sistema:** al menos 150 preguntas con su respuesta de referencia y el artículo que la sustenta, de cuatro tipos:
>    - factuales;
>    - de varias normas;
>    - con números (plazos, montos);
>    - **sin respuesta en el corpus.**
>
>    Reserva 100 como prueba ciega.
> 2. **Sistema:** ingesta de los PDF, fragmentación por artículo, búsqueda híbrida (BM25 + *embeddings*), reordenación, generación con citas obligatorias y respuesta «no consta en las normas consultadas».
> 3. **Mide sobre la prueba ciega**, con intervalos:
>    - recall@5 de la recuperación;
>    - corrección de las respuestas (anotación propia y, si usas un LLM como juez, su acuerdo con tu anotación);
>    - fidelidad (que lo dicho esté en las citas);
>    - tasa de abstención correcta en las preguntas sin respuesta.
> 4. **Compara** al menos dos versiones (por ejemplo, solo vectorial frente a híbrida) con prueba pareada.
> 5. **Despliégalo** como demo (Django o Gradio), con el aviso legal de que no es asesoría jurídica.

**Criterio de éxito orientativo:**

- recall@5 ≥ 0,8;
- ≥ 80 % de respuestas correctas con cita válida;
- ≥ 70 % de abstenciones correctas;
- todo con intervalos al 95 %.

Si no llegas, el proyecto vale igual si el análisis de errores explica por qué.

## Qué representaría resolverlo

- **Para tu empleo:** la tercera pieza del portafolio, en lo más demandado del mercado y demostrada con una evaluación seria, que es justo lo que suele faltar en los portafolios de RAG.
- **Para tu negocio:** un posible producto (información normativa para mipymes) o un módulo de Economy.
- **Para la academia:** con un conjunto de evaluación de calidad, el propio conjunto de preguntas podría publicarse. Hay pocos recursos de pregunta-respuesta sobre derecho cubano; no he encontrado ninguno público, aunque no puedo asegurar que no exista.

## Lo que se sabe

- **RAG** (Lewis et al., 2020) es la arquitectura estándar para respuestas con fuentes.
- **En textos legales,** la búsqueda léxica (BM25) sigue siendo una línea base difícil de batir, porque las consultas contienen números de artículo y términos exactos. La búsqueda híbrida suele ganar.
- **La evaluación con LLM como juez** tiene sesgos conocidos (Zheng et al., 2023), así que hay que validarla con anotación humana.
- **Para el español jurídico** hay trabajos en la revista *Procesamiento del Lenguaje Natural* y en IberLEF. Los sistemas legales en español de España no se transfieren directamente al derecho cubano, cuya terminología y estructura son propias.
- **Los datos:** la Gaceta Oficial de la República de Cuba es una publicación oficial y pública. Comprueba cómo acceder hoy a sus ediciones digitales: su dominio y su archivo han cambiado con los años.

## Recursos

- Ingeniería de LLM, conferencias 3-7 y 11-12, y MLOps ligero.
- Estadística, conferencias 4 y 6 (*bootstrap* pareado).
- Revista *Procesamiento del Lenguaje Natural* (SEPLN).

## Referencias

- Lewis, P. et al. (2020). Retrieval-augmented generation for knowledge-intensive NLP tasks. *NeurIPS*.
- Robertson, S. y Zaragoza, H. (2009). The probabilistic relevance framework: BM25 and beyond. *Foundations and Trends in IR* 3(4).
- Zheng, L. et al. (2023). Judging LLM-as-a-judge with MT-Bench and Chatbot Arena. *NeurIPS Datasets and Benchmarks*.
- Gaceta Oficial de la República de Cuba (ISSN 0864-0793), Ministerio de Justicia.
