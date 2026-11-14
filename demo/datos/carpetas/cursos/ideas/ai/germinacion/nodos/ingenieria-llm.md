# Ingeniería de LLM: RAG, ajuste fino y evaluación

## Por qué está en el curso

Es **lo más demandado del mercado en 2026**:

- *AI engineer* es el puesto n.º 1 de *Jobs on the Rise* de LinkedIn;
- las habilidades de IA agéntica pasaron del 0,06 % al 0,23 % de las ofertas de EE. UU. en un año, según el Stanford AI Index 2026.

También es la capa que **más deprisa se abarata**: conectar una API y escribir un *prompt* ya no lo paga nadie. Lo que sí se paga, y lo que esta asignatura enseña, es lo difícil:

- **recuperar** bien la información;
- **medir** si las respuestas son correctas y fieles a las fuentes;
- **decidir** con criterio entre *prompt*, RAG y ajuste fino;
- **hacerlo funcionar** con recursos limitados.

En tu caso, la limitación es también una oportunidad. No tienes acceso a APIs de pago (no lo marcaste en el diagnóstico), pero sí a Hugging Face y a una GPU de 6 GB. Por eso todo el bloque está diseñado con **modelos abiertos en local**. Es más difícil que llamar a una API, enseña más y produce sistemas que pueden funcionar **sin conexión**, algo valioso en Cuba y en cualquier empresa con datos sensibles.

En el diagnóstico no respondiste el ejercicio del asistente sobre 2.000 PDF de normativa. Al terminar esta asignatura tendrás que poder resolverlo en 10 líneas, y será tu Proyecto 3.

## Prerrequisitos

- Transformers y PLN completo.
- Estadística, conferencias 3-7, para evaluar con intervalos y comparar sistemas.
- El repaso de matemáticas, conferencia 4 (rango bajo, para LoRA).

## Objetivos de la asignatura

- **Integrar** un LLM local como componente de software: plantillas de chat, salida estructurada y control de costes y latencia.
- **Construir** un sistema RAG completo: ingesta, fragmentación, *embeddings*, índice, búsqueda híbrida, reordenación y citas.
- **Evaluar** por separado la recuperación (recall@k, MRR) y la generación (corrección y fidelidad), con conjuntos de prueba propios e intervalos.
- **Explicar** LoRA y QLoRA y **calcular** cuántos parámetros entrenan.
- **Ajustar** con QLoRA un LLM pequeño dentro de 6 GB y **medir** si mejoró sin degradar otras capacidades.
- **Diseñar** un agente con herramientas e **identificar** sus modos de fallo.
- **Defender** un sistema frente a la inyección de *prompts* y la fuga de datos.

## Programa por conferencias

1. **El LLM como componente.**
   - Plantillas de chat, *prompts* de sistema, pocos ejemplos en el *prompt*, salida JSON validada con esquemas y reintentos.
   - **Qué no hace bien un LLM:** contar, citar de memoria, aritmética.
2. **Servir un LLM en tu máquina.** `transformers`, `llama.cpp` / `llama-cpp-python`; cuantización GGUF (Q4, Q5, Q8); memoria de los pesos más la caché KV; *tokens* por segundo. Qué modelos caben en 6 GB y con qué contexto.
3. **RAG I: ingesta.** Extraer texto de PDF (y sus problemas: columnas, tablas, escaneos), limpiar, fragmentar por estructura frente a por longitud, solapamiento y metadatos.
4. **RAG II: recuperación.** *Embeddings* multilingües, índices vectoriales con FAISS, BM25 y búsqueda híbrida. Por qué la búsqueda léxica sigue ganando en textos legales llenos de números de artículo.
5. **RAG III: reordenación y generación.** Reordenadores con codificadores cruzados (*cross-encoders*), construcción del contexto, citas verificables y la respuesta «no lo sé» cuando no hay evidencia.
6. **Evaluación I: recuperación.** Construir un conjunto de preguntas con su fragmento de referencia; recall@k, MRR y nDCG; el análisis de errores por tipo de pregunta.
7. **Evaluación II: respuestas.**
   - Corrección frente a fidelidad (que lo dicho esté en las fuentes).
   - El LLM como juez: sus sesgos (posición, longitud, autopreferencia) y cómo validarlo contra anotación humana.
   - Intervalos *bootstrap* y comparación pareada de dos versiones del sistema (enlace con Estadística, conf. 6).
8. **Ajuste fino eficiente.**
   - LoRA: $W' = W + BA$ con rango $r \ll d$; en una matriz de $4096\times4096$ con $r=8$ se entrenan $2\cdot4096\cdot8 = 65.536$ parámetros frente a 16.777.216, un 0,39 %.
   - La hipótesis de que la actualización tiene rango intrínseco bajo.
   - QLoRA: pesos base en 4 bits.
   - **Cuándo ajustar:** para formato y estilo sí; para conocimiento nuevo es mejor RAG.
9. **Práctica de QLoRA en 6 GB.** Datos de instrucciones, PEFT y TRL, hiperparámetros, evaluación antes y después y una tarea de control para detectar el olvido. Es la meta práctica «QLoRA en 6 GB».
10. **Agentes y herramientas.** Llamadas a funciones, el bucle razonar-actuar y sus fallos típicos (herramientas inventadas, bucles infinitos, acciones irreversibles); límites y supervisión humana.
11. **Seguridad y robustez.** Inyección de *prompts* directa e indirecta (a través de los documentos), exfiltración de datos, alucinaciones y datos personales.
12. **Del cuaderno al producto.** Caché de respuestas y de *embeddings*, registro de interacciones, monitorización de la calidad con un conjunto vivo de pruebas y reindexado incremental.

## Clases prácticas

- **P1 (conf. 1-2):** un extractor de campos (fecha, número de decreto, organismo) de 50 textos legales con un LLM local y salida JSON validada. Exactitud por campo.
- **P2 (conf. 3-7):** el Proyecto 3 (RAG sobre normativa cubana para mipymes), en su versión mínima con evaluación.
- **P3 (conf. 8-9):** la meta práctica «QLoRA en 6 GB».

## Demostraciones para valientes

- Demuestra que, con la inicialización estándar de LoRA ($B = 0$), el modelo ajustado empieza siendo exactamente el original, y analiza la dinámica del primer paso del gradiente.
- Estima el número de operaciones y la memoria de un paso de QLoRA para un modelo de 1,7B de parámetros con contexto de 1.024 *tokens*.

## Evaluación

- **Examen de diseño sin asistente (30 %):** el ejercicio del asistente de 2.000 PDF del diagnóstico, uno de LoRA y uno de evaluación.
- **Prácticas P1-P3 (70 %).**
- **Criterio de paso:** en P2, recall@5 y exactitud de respuestas reportados con intervalo sobre un conjunto de al menos 100 preguntas que no se usó para ajustar el sistema.

## Bibliografía principal

- **Hugging Face, *Curso de LLM*** en español, caps. 1-8, como base. Los capítulos de ajuste fino de LLM solo están en inglés; el material de las conferencias 8-9 los sustituye.
- **Amat Rodrigo, J.** «Sistema de recomendación de vinos con transfer learning y búsqueda semántica», cienciadedatos.net (búsqueda semántica con *embeddings*).
- **Revista *Procesamiento del Lenguaje Natural*** (SEPLN): artículos sobre recuperación de información y sistemas de pregunta-respuesta en español.
- **Fuentes primarias (en inglés, solo citadas):** LoRA (Hu et al., 2021), QLoRA (Dettmers et al., 2023) y RAG (Lewis et al., 2020).

## Referencias

- Hugging Face. *Curso de LLM* (en español). https://huggingface.co/learn/llm-course/es/chapter1/1
- Lewis, P. et al. (2020). Retrieval-augmented generation for knowledge-intensive NLP tasks. *NeurIPS*.
- Hu, E. J. et al. (2021). LoRA: Low-rank adaptation of large language models. arXiv:2106.09685.
- Dettmers, T., Pagnoni, A., Holtzman, A. y Zettlemoyer, L. (2023). QLoRA: Efficient finetuning of quantized LLMs. *NeurIPS*.
- Zheng, L. et al. (2023). Judging LLM-as-a-judge with MT-Bench and Chatbot Arena. *NeurIPS Datasets and Benchmarks*.
- Lightcast (2026). *Four Takeaways from the 2026 Stanford AI Index*. https://lightcast.io/resources/blog/stanford-ai-2026
