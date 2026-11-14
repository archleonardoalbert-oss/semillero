# Aprendizaje automático II: árboles, *boosting* y datos tabulares pequeños

## Por qué está en el curso

Aquí es donde tu intuición del primer mensaje («no sé por qué todos creen que un modelo solo sirve con miles de millones de ejemplos») se convierte en oficio. La mayoría de los problemas reales de empresa son **tablas**: ventas, clientes, inventario, créditos, sensores, historiales clínicos. Durante dos décadas, el método dominante en tablas ha sido el ***gradient boosting* con árboles** (XGBoost, LightGBM, CatBoost). Funciona con cientos o miles de filas y no necesita GPU.

Desde 2025 hay además un competidor serio: **TabPFN**.

- **Qué es:** un transformer preentrenado sobre millones de problemas sintéticos que hace inferencia bayesiana aproximada «en contexto». Según su artículo en *Nature* (Hollmann et al., 2025), supera a los árboles ajustados durante 4 horas en conjuntos de hasta 10.000 muestras, en una sola pasada.
- **TabPFN-2.5 (nov. 2025):** amplía el alcance a unas 50.000 muestras y 2.000 variables.
- **Qué te exige:** saber cuándo usarlo, cuándo no, y cómo compararlo con rigor. Por eso hay una conferencia entera dedicada a él.

Es también el bloque que sostiene tu **Proyecto 1** y, más adelante, el de demanda.

## Prerrequisitos

- Aprendizaje automático I completo (validación, métricas, fugas, `Pipeline`).
- Estadística, conferencias 1-6: harán falta para comparar modelos con intervalos.
- Probabilidad, conferencia 7 (varianza de promedios correlacionados), que explica los bosques aleatorios.

## Objetivos de la asignatura

- **Explicar** cómo se construye un árbol de decisión y **controlar** su sobreajuste.
- **Justificar** matemáticamente por qué el *bagging* y los bosques aleatorios reducen la varianza.
- **Describir** el *gradient boosting* como descenso de gradiente en el espacio de funciones.
- **Ajustar** LightGBM, XGBoost y CatBoost con parada temprana y sin fugas.
- **Aplicar** estrategias específicas para pocos datos y **decidir** cuándo usar TabPFN.
- **Interpretar** modelos con importancia por permutación y SHAP, y **reconocer** sus trampas.
- **Calibrar** probabilidades y **elegir** el umbral según el coste.
- **Predecir** cuantiles e intervalos con *boosting* probabilístico.

## Programa por conferencias

1. **Árboles de decisión.** Criterios de partición (Gini, entropía, ECM); profundidad, hojas mínimas y poda; por qué un árbol solo es inestable.
2. ***Bagging* y bosques aleatorios.**
   - La fórmula $\rho\sigma^2 + \frac{1-\rho}{n}\sigma^2$ en acción: el submuestreo de variables reduce $\rho$.
   - El error *out-of-bag*.
3. ***Gradient boosting*.**
   - Ajustar árboles a los residuos, que son el gradiente negativo de la pérdida.
   - La tasa de aprendizaje y el número de árboles.
   - La regularización en XGBoost.
4. ***Boosting* en la práctica.**
   - LightGBM, XGBoost y CatBoost: sus diferencias reales.
   - Los hiperparámetros que importan, parada temprana con un conjunto de validación, categóricas nativas y valores faltantes.
5. **Estrategias para pocos datos.**
   - Modelos simples primero, regularización fuerte y validación cruzada repetida con intervalos.
   - Variables de dominio, agrupación de categorías raras y aumento tabular (y sus peligros).
   - Cuándo **no** hay suficiente señal y hay que decirlo.
6. **Modelos fundacionales tabulares: TabPFN.**
   - **Cómo funciona:** el *prior* sintético, el aprendizaje en contexto como inferencia bayesiana aproximada y por qué no hay «entrenamiento» en tus datos.
   - **Límites:** tamaño, número de clases, coste de inferencia y memoria en una GPU de 6 GB.
   - **Licencia:** ha cambiado entre versiones y hay que revisarla antes de cualquier uso comercial.
   - **Cómo compararlo** con el *boosting* sin hacer trampas.
7. **Interpretabilidad.** Importancia por permutación (y por qué la importancia por impureza engaña), SHAP, dependencia parcial y efectos individuales. Correlación frente a causalidad, otra vez.
8. **Calibración y decisiones.** Diagramas de fiabilidad, el *Brier score*, Platt e isotónica, y el umbral óptimo según la matriz de costes.
9. **Desbalance y anomalías.** Ponderación de clases, submuestreo (y por qué SMOTE se usa mal), métricas adecuadas, Isolation Forest y la detección de transacciones raras.
10. ***Boosting* probabilístico.** La pérdida *pinball* y la regresión por cuantiles, intervalos de predicción y su cobertura real. Es la base del pronóstico de demanda con incertidumbre.

## Clases prácticas

- **P1 (conf. 1-4):** en un conjunto de menos de 2.000 filas, compara un árbol, un bosque aleatorio y LightGBM con validación cruzada repetida e intervalos *bootstrap*.
- **P2 (conf. 5-6): curva de aprendizaje comparada.** Toma submuestras de 50, 100, 200, 500 y 1.000 filas y compara la regresión logística, LightGBM y TabPFN. ¿Dónde se cruzan? Es la antesala del Proyecto 1.
- **P3 (conf. 7-10):** sobre el modelo ganador, análisis SHAP, calibración, umbral por coste e intervalos por cuantiles.

## Demostraciones para valientes

- Deduce el paso de Newton que usa XGBoost: la ganancia de una partición con gradiente $g$ y hessiano $h$, $\frac12\big[\frac{G_L^2}{H_L+\lambda} + \frac{G_R^2}{H_R+\lambda} - \frac{(G_L+G_R)^2}{H_L+H_R+\lambda}\big] - \gamma$.
- Demuestra que la regresión isotónica calibrada minimiza el *Brier score* entre las funciones monótonas.

## Evaluación

- **Examen conceptual sin asistente (30 %).**
- **Prácticas P1-P3 (70 %).**
- **Criterio de paso:** en P2, una conclusión del tipo «con menos de $N$ filas gana X, con intervalos que no se solapan» o «no hay diferencia detectable», y una justificación estadística correcta.

## Bibliografía principal

- **Amat Rodrigo, J.:**
  - «Gradient Boosting con Python y Scikit-learn»;
  - «Gradient Boosting probabilístico con Python»;
  - «Grid search de modelos Random Forest con out-of-bag error y early stopping».

  Están en cienciadedatos.net y son los tres troncales en español.
- **Fuentes Pineda, G.** *Curso de aprendizaje automatizado*, PCIC-UNAM, tema 7 (ensambles).
- **De pago:**
  - Raschka et al. (Marcombo), cap. 7 (ensambles);
  - Géron (Anaya), caps. 6-7 (árboles, ensambles y bosques aleatorios).
- **Fuente primaria de TabPFN:** Hollmann et al., *Nature* (2025). El artículo está en inglés; el material de la conferencia 6 lo explicará en español.

## Referencias

- Amat Rodrigo, J. «Gradient Boosting con Python y Scikit-learn». https://www.cienciadedatos.net/documentos/py09_gradient_boosting_python
- Amat Rodrigo, J. «Gradient Boosting probabilístico con Python». https://www.cienciadedatos.net/documentos/py26-gradient-boosting-probabilistico-python
- Hollmann, N., Müller, S., Purucker, L. et al. (2025). Accurate predictions on small data with a tabular foundation model. *Nature* 637, 319-326. doi:10.1038/s41586-024-08328-6
- Grinsztajn, L., Oyallon, E. y Varoquaux, G. (2022). Why do tree-based models still outperform deep learning on typical tabular data? *NeurIPS Datasets and Benchmarks*.
- Prior Labs (2025). *TabPFN-2.5: Advancing the State of the Art in Tabular Foundation Models*. arXiv:2511.08667.
