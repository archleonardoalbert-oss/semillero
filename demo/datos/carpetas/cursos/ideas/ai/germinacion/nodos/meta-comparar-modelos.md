# Meta práctica: ¿la diferencia es real? Comparar dos modelos con rigor

## Cómo se llegó a este problema

El diagnóstico tenía un ejercicio que no respondiste: dos modelos, con un 85 % y un 87 % de aciertos sobre los **mismos** 200 ejemplos de prueba, ¿es mejor B? La respuesta es que, con esos datos, no se puede saber. El error típico de cada exactitud ronda $\sqrt{0{,}86\cdot0{,}14/200} \approx 2{,}5$ puntos, así que una diferencia de 2 puntos está dentro del ruido.

Pero hay más. Como los dos modelos se evalúan sobre los mismos ejemplos, sus errores están **correlacionados**, y una prueba pareada puede detectar diferencias que dos intervalos separados no ven.

En la práctica real esto pasa a todas horas:

- un artículo dice que su método «supera» al anterior por 0,5 puntos;
- un equipo despliega un modelo nuevo porque ganó en validación cruzada;
- un participante sube en la tabla pública de una competición y se hunde en la privada.

Con pocos datos (tu especialidad) el problema es aún más grave, porque el ruido es mayor. Saber responder a «¿la diferencia es real?» es la habilidad que más te distinguirá en una entrevista.

## El problema

> **Meta.** Construye una pequeña biblioteca y un estudio de simulación:
> 1. **Implementa:**
>    - el intervalo de confianza asintótico y por *bootstrap* de la exactitud y del F1;
>    - el *bootstrap* pareado de la diferencia entre dos modelos;
>    - la prueba de McNemar;
>    - la prueba t corregida de Nadeau y Bengio para la validación cruzada repetida.
> 2. **Aplícala** a dos clasificadores reales (por ejemplo, regresión logística frente a LightGBM) en un conjunto público de 300 a 1.000 filas.
> 3. **Estudio de simulación:** genera datos donde los dos modelos son **igual de buenos por construcción**. Repite el experimento 1.000 veces y mide con qué frecuencia cada método declara una diferencia «significativa» al 5 %:
>    - la prueba t ingenua sobre las particiones de la validación cruzada;
>    - la prueba t corregida;
>    - McNemar;
>    - el *bootstrap* pareado.
>
>    El método correcto debería acertar cerca del 5 % de las veces.
> 4. **Repite** el estudio con una diferencia real pequeña (1, 2 y 5 puntos) y mide la **potencia** de cada método.

**Criterio de éxito:**

- la tabla de tasas de falsos positivos y potencias, con su interpretación;
- la prueba t ingenua debe salir claramente por encima del 5 %; si no sale, hay un error en tu simulación;
- un informe de 2 páginas que podrías mandar a un compañero que se ha emocionado con un «+2 %».

## Qué representaría resolverlo

- **Proyecto 1:** sin esto, no se puede presentar.
- **Proyecto 3 (RAG):** la comparación de versiones del sistema usa las mismas herramientas.
- **Retos:** «Reproducir un resultado publicado» y la competición también las necesitan.
- **Para tu carrera:** es la habilidad que te protege de autoengañarte, que es el fallo más común en ML aplicado.

## Lo que se sabe

- **Dietterich (1998):** mostró que la prueba t pareada sobre las particiones de la validación cruzada tiene una tasa de error de tipo I elevada, porque los conjuntos de entrenamiento se solapan. Propuso el procedimiento 5×2cv.
- **Nadeau y Bengio (2003):** propusieron una corrección de la varianza para la validación cruzada repetida.
- **Bouckaert y Frank (2004):** estudiaron la replicabilidad de estas pruebas.
- **Bouthillier et al. (2021):** cuantificaron cuánto varía el rendimiento de los modelos por la semilla, la partición de datos y la inicialización, y propusieron recomendaciones para comparar algoritmos.

Lo que **no** está resuelto del todo: cómo comparar bien con muy pocos datos (menos de 100 ejemplos), donde todas las pruebas tienen poca potencia. Para ese caso la recomendación honesta es reportar intervalos y no declarar ganadores.

## Recursos

- Espejo Miranda et al., *Inferencia estadística*, cap. 3 (intervalos) y cap. 4 (contrastes), [PDF](germinacion/recursos/uca-inferencia-estadistica.pdf).
- Irizarry, *Introducción a la ciencia de datos*: los capítulos de inferencia y el de *bootstrap*.
- Estadística, conferencias 3-7.

## Referencias

- Dietterich, T. G. (1998). Approximate statistical tests for comparing supervised classification learning algorithms. *Neural Computation* 10(7), 1895-1923.
- Nadeau, C. y Bengio, Y. (2003). Inference for the generalization error. *Machine Learning* 52, 239-281.
- Bouckaert, R. R. y Frank, E. (2004). Evaluating the replicability of significance tests for comparing learning algorithms. *PAKDD*.
- Bouthillier, X. et al. (2021). Accounting for variance in machine learning benchmarks. *MLSys*.
- McNemar, Q. (1947). Note on the sampling error of the difference between correlated proportions or percentages. *Psychometrika* 12, 153-157.
