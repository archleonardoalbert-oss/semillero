# Probabilidad para aprendizaje automático

## Por qué está en el curso

Es **tu hueco principal** y el que más limita todo lo demás. En el diagnóstico te pusiste un 1 en probabilidad, pero el ejercicio del detector de fraude mostró algo más básico: **no reconocías la notación $P(A \mid B)$**, que es el idioma de todo el ML. No es una crítica. Probabilidades y Estadística te toca en un curso posterior de la carrera, así que es normal no saberlo hoy. Pero tu prioridad es el empleo «lo antes posible», y no se puede esperar a esa asignatura.

Casi todo lo importante del curso es probabilidad disfrazada:

| En ML se llama… | En probabilidad es… |
|---|---|
| precisión de un clasificador | $P(\text{positivo real} \mid \text{predicho positivo})$ |
| *recall* o sensibilidad | $P(\text{predicho positivo} \mid \text{positivo real})$ |
| regresión por mínimo error cuadrático | estimar $\mathbb{E}[Y \mid X]$ |
| pérdida de entropía cruzada | $-\log$ de la verosimilitud |
| *random forest* | varianza de un promedio de variables correlacionadas |
| un LLM | una distribución $P(\text{siguiente token} \mid \text{contexto})$ |
| error de un conjunto de prueba | una proporción con error típico $\sqrt{p(1-p)/n}$ |

Cuando llegue la asignatura de la carrera, esta te servirá de repaso con ventaja.

## Prerrequisitos

- Análisis I y II (integrales, series): aprobados.
- Las conferencias 1-4 de Python científico, porque cada tema se comprueba simulando.

## Objetivos de la asignatura

- **Leer** y **escribir** con soltura la notación probabilística: $P(A\mid B)$, $\mathbb{E}$, $\operatorname{Var}$, $\operatorname{Cov}$ y $X \sim \mathcal{N}(\mu,\sigma^2)$.
- **Aplicar** el teorema de Bayes y la probabilidad total a problemas de tasa base, y **explicar** por qué una prueba «muy precisa» puede dar mayoría de falsos positivos.
- **Calcular** esperanzas, varianzas y covarianzas de variables discretas, continuas y de sumas de variables correlacionadas.
- **Usar** las distribuciones habituales (Bernoulli, binomial, Poisson, uniforme, exponencial, normal y normal multivariante) para modelar datos.
- **Demostrar** que el mejor predictor en error cuadrático es $\mathbb{E}[Y\mid X]$.
- **Simular** cualquier resultado de la asignatura por Monte Carlo y **comparar** la simulación con la teoría.
- **Interpretar** la entropía cruzada y la divergencia KL como pérdidas.

## Programa por conferencias

1. **El lenguaje.** Experimentos, sucesos, axiomas. La probabilidad condicional $P(A\mid B) = P(A\cap B)/P(B)$ y la regla del producto. Cómo se lee en voz alta: «probabilidad de A sabiendo que ocurrió B».
2. **Probabilidad total y Bayes: la paradoja de la tasa base.**
   - Sensibilidad, especificidad, falsos positivos.
   - **Problema de fracaso productivo:** el detector de fraude, que tendrás que intentar antes de ver la solución.
   - La tabla de frecuencias naturales (10.000 casos) como herramienta mental.
3. **Independencia e independencia condicional.** Por qué *naive Bayes* «funciona aunque sea falso». Correlación frente a causalidad.
4. **Variables aleatorias discretas.** La función de masa. Bernoulli, binomial, geométrica y Poisson (la demanda de un producto poco vendido es casi Poisson). Simulación.
5. **Variables continuas.** Densidad y función de distribución; uniforme, exponencial y normal; cuantiles. Generar cualquier distribución a partir de la uniforme (transformada inversa).
6. **Esperanza y varianza.**
   - La linealidad de la esperanza y la ley del estadístico inconsciente.
   - El ejercicio del diagnóstico: $\mathbb{E}[X]=1/2$ y $\operatorname{Var}(X)=1/12$ para la uniforme, y $\mathbb{E}[\max(X_1,X_2)] = 2/3$ por la distribución del máximo.
7. **Vectores aleatorios.**
   - Distribución conjunta, marginal y condicional; covarianza y correlación.
   - **Varianza de una suma:** $\operatorname{Var}\big(\tfrac1n\sum X_i\big) = \rho\sigma^2 + \tfrac{1-\rho}{n}\sigma^2$, que tiende a $\rho\sigma^2$ cuando $n\to\infty$. Es la razón matemática de que los conjuntos de modelos (*ensembles*) quieran modelos poco correlacionados.
8. **La normal multivariante.**
   - La matriz de covarianza y las transformaciones lineales: $AX+b \sim \mathcal{N}(A\mu+b, A\Sigma A^\top)$.
   - La geometría de las elipses de nivel, conectada con la PCA (repaso de matemáticas, conferencia 4).
9. **Esperanza condicional y predicción.**
   - $\mathbb{E}[Y\mid X]$ como variable aleatoria, la varianza condicional y la ley de la varianza total.
   - El mejor predictor en ECM y el mejor predictor lineal.
   - Es el fundamento teórico de la regresión.
10. **Leyes de los grandes números y teorema central del límite.**
    - Desigualdades de Chebyshev y de Hoeffding.
    - Por qué la exactitud medida en 200 ejemplos tiene un error típico de unos 2,5 puntos.
    - Monte Carlo como método de cálculo.
11. **Información: entropía, entropía cruzada y KL.**
    - Por qué la pérdida de un clasificador y la de un LLM es la entropía cruzada.
    - La relación entre minimizar la entropía cruzada y maximizar la verosimilitud (enlace con Estadística).

## Clases prácticas

- **P1 (conf. 2):** la meta práctica «Paradoja de la tasa base»: fórmula, simulación de $10^6$ transacciones y gráfica de $P(F\mid +)$ frente a la prevalencia.
- **P2 (conf. 6-7):** simula $\mathbb{E}[\max(X_1,X_2)]$ y la varianza del promedio de $n$ predictores correlacionados (genera normales correlacionadas con Cholesky) y compara con la fórmula.
- **P3 (conf. 10):** simula 10.000 conjuntos de prueba de tamaño 200 para un clasificador con un 86 % de exactitud real. ¿Cuántas veces mide menos del 84 % o más del 88 %?

## Demostraciones para valientes

- Demuestra la ley de la varianza total.
- Demuestra que $\mathbb{E}[Y\mid X]$ minimiza $\mathbb{E}[(Y-g(X))^2]$ entre todas las funciones $g$.
- Demuestra la desigualdad de Hoeffding para variables acotadas, a partir del lema de Hoeffding.

## Evaluación

- **Examen sin asistente (70 %):** 8 problemas, que incluyen dos de Bayes con tasa base, uno de varianza de sumas correlacionadas y uno de esperanza condicional.
- **Prácticas P1-P3 (30 %).**
- **Criterio de paso:** 6 de 8, con los dos de Bayes bien resueltos. Sin Bayes no se avanza a ML.

**Práctica espaciada:** en cada asignatura posterior habrá dos problemas de esta.

## Bibliografía principal

- **Yohai, V. J.** *Notas de Probabilidades y Estadística* (UBA, 2006), [PDF](germinacion/recursos/yohai-notas-probabilidades.pdf). Es el texto troncal, riguroso y en español:
  - cap. 1 (§ 1.5-1.6: condicional e independencia);
  - caps. 2-3 (variables aleatorias y distribuciones);
  - caps. 4-5 (vectores aleatorios);
  - cap. 7 (esperanza, varianza, covarianza, normal bivariada);
  - cap. 8 (teoría de la predicción);
  - cap. 9 (esperanza condicional);
  - cap. 10 (leyes de los grandes números);
  - cap. 11 (§ 11.5: teorema central del límite).
- **Espejo Miranda, I. et al.** *Estadística descriptiva y probabilidad* (Univ. de Cádiz, 3.ª ed., 2006, licencia GFDL), [PDF](germinacion/recursos/uca-estadistica-descriptiva-probabilidad.pdf). Es más elemental y tiene muchos problemas resueltos:
  - cap. 4 (§ 6-8: condicionada, probabilidad total y Bayes, p. 131-136);
  - cap. 5 (variable aleatoria);
  - cap. 6 (modelos probabilísticos y TCL, p. 185-206).
- **Rincón, L.** *Introducción a la probabilidad* (UNAM, 2014). Es gratuito en la página del autor; úsalo como alternativa con muchos ejercicios.

## Referencias

- Yohai, V. J. (2006). *Notas de Probabilidades y Estadística, capítulos 1 al 12*. Departamento de Matemática, FCEN-UBA. https://mate.dm.uba.ar/~vyohai/Notas%20de%20Probabilidades.pdf
- Espejo Miranda, I., Fernández Palacín, F., López Sánchez, M. A., Muñoz Márquez, M., Rodríguez Chía, A. M., Sánchez Navas, A. y Valero Franco, C. (2006). *Estadística descriptiva y probabilidad (Teoría y problemas)*, 3.ª ed. Servicio de Publicaciones de la Universidad de Cádiz. GNU FDL 1.2.
- Rincón, L. (2014). *Introducción a la probabilidad*. Las Prensas de Ciencias, UNAM. http://lya.fciencias.unam.mx/lars/indexL.html
