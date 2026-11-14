# Meta práctica: ajustar con QLoRA un LLM pequeño en 6 GB

## Cómo se llegó a este problema

En el diagnóstico no respondiste la pregunta de LoRA: una matriz de $4096\times4096$ con rango 8 entrena $2\cdot 4096\cdot 8 = 65.536$ parámetros en vez de 16.777.216, es decir, el 0,39 %. Esa reducción es lo que hace posible ajustar un LLM en un ordenador como el tuyo.

QLoRA (Dettmers et al., 2023) fue más lejos: guarda los pesos del modelo base en 4 bits y entrena solo los adaptadores LoRA. Así se ajustan modelos que de otro modo no cabrían en la GPU.

Para ti hay una razón práctica: no tienes acceso a APIs de pago y sí a Hugging Face. Un modelo pequeño ajustado para una tarea concreta, que corre en local y sin conexión, es justo el tipo de sistema que puedes ofrecer a una mipyme cubana o mostrar en una entrevista.

La pregunta difícil no es técnica («¿cabe?»), sino de criterio: **¿mejora de verdad respecto a darle buenas instrucciones al modelo base, y a qué coste?**

## El problema

> **Meta.** Tarea: **extraer campos estructurados en JSON** de textos en español (por ejemplo, de resoluciones o decretos: número, fecha, organismo, materia y obligaciones). Con un modelo abierto de 0,5 a 2 B parámetros y licencia permisiva (p. ej., Qwen3-1.7B o Salamandra-2B, ambos Apache 2.0):
> 1. **Anota** de 200 a 300 ejemplos: 150-200 de entrenamiento y 100 de prueba **separados por documento**.
> 2. **Compara:**
>    - **(a)** el modelo base con instrucciones;
>    - **(b)** el base con 3 ejemplos en el *prompt*;
>    - **(c)** QLoRA con rango 8 y 16;
>    - **(d)** opcional: un modelo mayor cuantizado sin ajustar.
> 3. **Mide:**
>    - la exactitud por campo y la exactitud del documento completo, con intervalos *bootstrap*;
>    - el porcentaje de JSON válido;
>    - la memoria máxima de la GPU y el tiempo por documento.
> 4. **Comprueba el olvido:** 30 preguntas generales en español antes y después del ajuste. ¿Se degrada el modelo fuera de la tarea?

**Criterio de éxito:**

- entrenamiento completo dentro de 6 GB, con la memoria registrada;
- una diferencia entre (b) y (c) estimada con intervalo pareado;
- una recomendación justificada: ajustar o no, y con qué rango.

## Qué representaría resolverlo

- **Para tu currículum:** es la competencia «ajuste fino de LLM» que piden muchas ofertas de *AI engineer*, demostrada con evidencia y no solo mencionada.
- **Para el negocio:** la tarea elegida conecta directamente con el Proyecto 3 y con un posible producto para mipymes.

## Lo que se sabe

- **LoRA** (Hu et al., 2021) se apoya en la hipótesis de que la actualización necesaria tiene **rango intrínseco bajo**. Iguala o se acerca al ajuste completo en muchas tareas.
- **QLoRA** (Dettmers et al., 2023) introdujo la cuantización NF4 y los optimizadores paginados.
- **Biderman et al. (2024)**, «LoRA learns less and forgets less», encontraron que LoRA rinde menos que el ajuste completo en dominios difíciles (código, matemáticas), pero conserva mejor las capacidades generales. Por eso la meta mide el olvido.

Lo que no se puede anticipar es si, en tu tarea y con 200 ejemplos, el ajuste supera a unas buenas instrucciones. En extracción estructurada suele ayudar con el formato, pero no hay garantía.

## Recursos

- Ingeniería de LLM, conferencias 2, 8 y 9.
- Hugging Face, *Curso de LLM* en español, caps. 1-3. Los capítulos de ajuste fino de LLM solo están en inglés; el material de la asignatura los sustituye.

## Referencias

- Hu, E. J. et al. (2021). LoRA: Low-rank adaptation of large language models. arXiv:2106.09685.
- Dettmers, T. et al. (2023). QLoRA: Efficient finetuning of quantized LLMs. *NeurIPS*.
- Biderman, D. et al. (2024). LoRA learns less and forgets less. *TMLR*.
- Barcelona Supercomputing Center (2025). Salamandra Technical Report. arXiv:2502.08489.
