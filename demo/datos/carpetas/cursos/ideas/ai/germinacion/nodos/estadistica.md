# Estadística e inferencia para evaluar modelos

## Por qué está en el curso

En el dictamen lo dije así: el mercado paga por **saber si un modelo funciona de verdad**. Eso es estadística. Con pocos datos, que es tu especialidad elegida, importa el doble:

- con 300 ejemplos de prueba, una diferencia de 2 puntos entre dos modelos suele ser ruido;
- con validación cruzada repetida y 50 configuraciones probadas, es fácil «descubrir» una mejora que no existe;
- un cliente de una mipyme no quiere un número, sino saber **cuánto puede fiarse** de él.

Te autoevaluaste con un 1 (solo descriptiva) y no resolviste ningún ejercicio de esta área, así que es una **asignatura completa**. Está orientada sin rodeos a evaluar modelos: no es la estadística de recetas de la prueba t, sino la que necesita alguien que entrena y compara modelos.

## Prerrequisitos

- Probabilidad, conferencias 1-10 (sobre todo esperanza, varianza, TCL y Hoeffding).
- Python científico.

## Objetivos de la asignatura

- **Explicar** qué es un estimador, su sesgo, su varianza y su error cuadrático medio.
- **Derivar** estimadores de máxima verosimilitud y **relacionar** la MV con la entropía cruzada y con el error cuadrático.
- **Construir** intervalos de confianza asintóticos y por *bootstrap* para cualquier métrica (exactitud, F1, MAE, AUC).
- **Interpretar** correctamente un $p$-valor y **enumerar** sus malas lecturas habituales.
- **Comparar** dos modelos sobre el mismo conjunto con pruebas pareadas (McNemar, *bootstrap* pareado) y **justificar** por qué no sirve una prueba t ingenua sobre la validación cruzada.
- **Detectar** el sobreajuste a la validación por comparaciones múltiples y **corregirlo**.
- **Diseñar** una validación con usuarios reales (prueba A/B) con el tamaño de muestra adecuado.

## Programa por conferencias

1. **De la población a la muestra.**
   - Estadístico, estimador y estimación; sesgo, varianza y error cuadrático medio, con su descomposición $\mathrm{ECM} = \mathrm{sesgo}^2 + \mathrm{varianza}$.
   - La analogía (y la diferencia) con el «sesgo-varianza» de los modelos de ML.
2. **Máxima verosimilitud.**
   - Bernoulli, Poisson, exponencial y normal. El ejercicio del diagnóstico: $\hat\lambda = 1/\bar x$.
   - Minimizar el ECM equivale a la MV gaussiana, y minimizar la entropía cruzada, a la MV categórica.
   - Las propiedades asintóticas, sin demostración.
3. **Intervalos de confianza.**
   - El método del pivote y los intervalos asintóticos por el TCL.
   - El intervalo de una proporción: con $n=200$ y $p\approx 0{,}86$, el error típico es de unos 2,5 puntos.
   - Qué significa y qué no significa «95 % de confianza».
4. ***Bootstrap*.**
   - Remuestreo con reemplazo; intervalos percentil y BCa (intuición).
   - Intervalos para F1, para la mediana del error y para el AUC.
   - El *bootstrap* pareado para la diferencia entre dos modelos.
   - Cuándo falla: datos dependientes, como las series temporales (bloques).
5. **Contrastes de hipótesis.**
   - Hipótesis nula, errores de tipo I y II, potencia.
   - El $p$-valor es la probabilidad de observar algo tan extremo **si la nula fuera cierta**, no la probabilidad de que la nula sea cierta: el ejercicio del diagnóstico, resuelto.
   - Significación estadística frente a relevancia práctica.
6. **Comparar dos modelos sobre los mismos datos.**
   - La prueba de McNemar con la tabla de desacuerdos.
   - Por qué importa que el conjunto sea el mismo: los errores están correlacionados y la comparación pareada tiene mucha más potencia.
   - El problema de la validación cruzada: las particiones se solapan, así que las estimaciones no son independientes. La prueba t corregida de Nadeau y Bengio.
7. **Comparaciones múltiples y sobreajuste al conjunto de validación.**
   - Si pruebas 50 configuraciones, la mejor está sesgada hacia arriba.
   - Bonferroni y Holm, y el conjunto de prueba «sellado».
   - El caso de las competiciones: la tabla pública frente a la privada.
8. **La regresión lineal como modelo estadístico.**
   - Supuestos, residuos, interpretación de coeficientes, multicolinealidad y errores típicos de los coeficientes.
   - Cuándo un coeficiente «significativo» no quiere decir nada.
9. **Inferencia bayesiana para pocos datos.**
   - El modelo beta-binomial: el *prior*, la posterior y el intervalo creíble.
   - Suavizar tasas con pocos datos. Ejemplo: la tasa de devolución de un producto con 3 ventas.
   - Por qué esto es la intuición de TabPFN.
10. **Experimentos con usuarios reales.**
    - Pruebas A/B, tamaño de muestra y potencia.
    - Validar un modelo de demanda en una tienda: diseño, duración y métrica.
    - Lo que no se puede concluir de un piloto de 4 semanas.

## Clases prácticas

- **P1 (conf. 2-3):** simula 10.000 muestras exponenciales de tamaño $n = 10, 50, 500$. Estima $\lambda$ por MV, mide su sesgo y comprueba la cobertura real de tus intervalos al 95 %.
- **P2 (conf. 4-6):** es la meta práctica «Comparar dos modelos con rigor».
- **P3 (conf. 7):** genera datos **sin ninguna señal** y entrena 50 modelos con distinta configuración. Elige el mejor por validación cruzada y mira su «exactitud»: es un fracaso productivo que no olvidarás.

## Demostraciones para valientes

- Demuestra la descomposición ECM = sesgo² + varianza.
- Demuestra que, para una Bernoulli, el estimador de MV alcanza la cota de Cramér–Rao.
- Deduce la estadística de McNemar a partir de la binomial de los desacuerdos.

## Evaluación

- **Examen sin asistente (60 %):** 7 problemas (MV, intervalo, $p$-valor, McNemar, *bootstrap*, comparaciones múltiples y tamaño de muestra).
- **Informe de P2 y P3 (40 %),** escrito como sección de «Evaluación» de un proyecto real.
- **Criterio de paso:** 5 de 7, con el problema del $p$-valor bien explicado.

## Bibliografía principal

- **Espejo Miranda, I. et al.** *Inferencia estadística (Teoría y problemas)* (Univ. de Cádiz, 2007, licencia GFDL), [PDF](germinacion/recursos/uca-inferencia-estadistica.pdf):
  - cap. 2 (estimación puntual; § 3 verosimilitud, § 5 propiedades, § 6 métodos, p. 11-30);
  - cap. 3 (intervalos; § 3 pivote, § 6 asintótico por el TCL, § 8 tamaño muestral, p. 41-75);
  - cap. 4 (contrastes; § 2 errores, § 5 razón de verosimilitudes, § 7 proporciones, p. 81-102);
  - cap. 6, § 3 (contrastes múltiples, p. 166).
- **Yohai, V. J.** *Notas de Probabilidades y Estadística*, [PDF](germinacion/recursos/yohai-notas-probabilidades.pdf): § 11.6-11.7 (Slutsky e intervalos de confianza asintóticos).
- **Irizarry, R. A.** *Introducción a la ciencia de datos* (en español, CC BY-NC-SA). Los capítulos de inferencia estadística y de *bootstrap* tienen ejemplos con datos reales. Usa R, pero los conceptos son independientes del lenguaje.

> **Nota sobre el *bootstrap*:** ninguno de los textos troncales de Cádiz lo trata. Lo cubrirán el material de la conferencia 4 y el capítulo correspondiente de Irizarry.

## Referencias

- Espejo Miranda, I. et al. (2007). *Inferencia estadística (Teoría y problemas)*. Servicio de Publicaciones de la Universidad de Cádiz. GNU FDL 1.2. https://knuth.uca.es/repos/l_inf_est/pdf/actual/lib_inf.pdf
- Irizarry, R. A. *Introducción a la ciencia de datos: análisis de datos y algoritmos de predicción con R*. https://rafalab.dfci.harvard.edu/dslibro
- Yohai, V. J. (2006). *Notas de Probabilidades y Estadística*. FCEN-UBA.
- Dietterich, T. G. (1998). Approximate statistical tests for comparing supervised classification learning algorithms. *Neural Computation* 10(7), 1895-1923.
- Nadeau, C. y Bengio, Y. (2003). Inference for the generalization error. *Machine Learning* 52, 239-281.
