# Meta práctica: clasificar textos en español con menos de 500 ejemplos

## Cómo se llegó a este problema

Es la versión en texto de la pregunta central del curso: ¿cuántos datos hacen falta de verdad? Hoy hay al menos cinco formas de clasificar textos con pocos ejemplos:

1. el clásico TF-IDF con una regresión logística;
2. *embeddings* de oraciones con una regresión logística;
3. SetFit, que con 8 ejemplos por clase puede competir con el ajuste fino completo en algunos conjuntos (Tunstall et al., 2022);
4. el ajuste fino de un codificador en español (BETO o RoBERTa-BNE);
5. un LLM local sin entrenamiento, con instrucciones y algunos ejemplos.

Cada una tiene defensores. Lo que casi nunca se hace es **medir para un problema concreto en español a partir de cuántos ejemplos conviene cada una**, con intervalos. Esa curva es justo lo que un cliente necesita para decidir cuánto pagar por etiquetar datos.

## El problema

> **Meta.** Elige una tarea de clasificación de textos en español con datos públicos. Pueden ser las reseñas, el sentimiento o los temas de una tarea pasada de IberLEF o de la SEPLN; comprueba su licencia. Para tamaños de entrenamiento de 16, 32, 64, 128, 256 y 500 ejemplos, con 5 muestras aleatorias por tamaño:
> 1. **Entrena y evalúa** los cinco métodos anteriores sobre el **mismo** conjunto de prueba fijo, de al menos 1.000 ejemplos.
> 2. **Dibuja** la curva de F1 macro frente al tamaño, con bandas de confianza.
> 3. **Mide** el coste de cada método: tiempo de entrenamiento e inferencia en tu GPU, memoria y descargas.
> 4. **Concluye:** ¿a partir de cuántos ejemplos el ajuste fino supera a SetFit? ¿El LLM sin entrenamiento gana con 16 ejemplos? ¿Cambia algo con textos en variante cubana? Para lo último, añade 50 textos tuyos como prueba extra.

**Criterio de éxito:**

- la curva completa con intervalos;
- una tabla de costes;
- conclusiones que respeten los intervalos;
- un repositorio reproducible.

## Qué representaría resolverlo

- **El resultado** es una guía práctica de cuántos datos etiquetar, útil para cualquier empresa hispanohablante.
- **Si la tarea es de IberLEF**, el trabajo es casi la mitad del reto «Tarea compartida de IberLEF».
- **Lo que no se puede anticipar:** si tus resultados coincidirán con los publicados en inglés. Esa es la gracia del experimento.

## Lo que se sabe

- **SetFit** (Tunstall et al., 2022) compite con el ajuste fino completo en algunos conjuntos en inglés con muy pocos ejemplos.
- **Los codificadores monolingües en español** (BETO, de Cañete et al., 2020; MarIA y RoBERTa-BNE, de Gutiérrez-Fandiño et al., 2022) superan a los multilingües en varias tareas en español cuando hay suficientes datos.
- **Hay pocas comparaciones sistemáticas** de curvas de aprendizaje con muy pocos ejemplos en español que incluyan LLM locales recientes. No he encontrado una que cubra las cinco familias a la vez, aunque no puedo afirmar que no exista.

## Recursos

- Transformers y PLN, conferencias 2 y 4-6.
- Hugging Face, *Curso de LLM* en español, cap. 3 (ajuste fino de un modelo preentrenado).
- Revista *Procesamiento del Lenguaje Natural* (SEPLN): los artículos de resumen de las tareas de IberLEF describen los conjuntos disponibles.

## Referencias

- Tunstall, L. et al. (2022). Efficient few-shot learning without prompts. arXiv:2209.11055.
- Cañete, J. et al. (2020). Spanish pre-trained BERT model and evaluation data. *PML4DC, ICLR*.
- Gutiérrez-Fandiño, A. et al. (2022). MarIA: Spanish language models. *Procesamiento del Lenguaje Natural* 68, 39-60.
- Hugging Face. *Curso de LLM* (en español). https://huggingface.co/learn/llm-course/es/chapter1/1
