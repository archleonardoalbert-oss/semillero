# Aprendizaje automático I: fundamentos, validación y modelos lineales

## Por qué está en el curso

Es el centro de gravedad de todo el plan. En el diagnóstico escribiste: «No sé qué es validación cruzada ni validar un modelo». Esa frase es honesta y muy útil, porque señala lo que separa a quien «entrena modelos» de quien puede cobrar por ello. Has entrenado una red que reconoce dígitos, pero no sabes todavía **si funcionaría con dígitos de otra persona**. Eso es justo lo que enseña esta asignatura.

Las dos respuestas que diste en esta área muestran **intuición correcta con razonamiento incompleto**:

- **El detector con un 99 % de exactitud.** Dijiste que no es bueno, y aciertas, pero por una razón equivocada. La razón real es que el modelo trivial que **siempre** responde «no es fraude» también tiene un 99 % de exactitud.
- **Los modelos A y B.** Diagnosticaste bien que A memoriza. En B intuiste que falta capacidad, pero lo ataste a «faltan capas» (solo vale para redes) y no consideraste que el 24 % podría ser el límite del problema.

Por eso esta asignatura empieza por lo conceptual: plantear el problema, validar y medir. La técnica viene después.

## Prerrequisitos

- Python científico completo.
- Repaso de matemáticas, conferencias 2, 5 y 8: mínimos cuadrados, gradientes y descenso de gradiente.
- Probabilidad, conferencias 1-6, **en paralelo**:
  - para la conferencia 5 de ML necesitas Bayes (conf. 2 de Probabilidad);
  - para la conferencia 6, la esperanza y la varianza (conf. 6).

## Objetivos de la asignatura

- **Plantear** un problema de ML: tarea, unidad de predicción, métrica de negocio, línea base y riesgo de fuga.
- **Separar** los datos en entrenamiento, validación y prueba, y **elegir** el esquema de validación cruzada adecuado (estratificada, por grupos o temporal).
- **Entrenar** e **interpretar** regresiones lineal y logística con scikit-learn.
- **Elegir** la métrica según el problema y los costes, sobre todo con clases desbalanceadas.
- **Detectar** y **evitar** las fugas de datos con `Pipeline` y `ColumnTransformer`.
- **Diagnosticar** sesgo y varianza con curvas de aprendizaje, y **decidir** la acción correcta.
- **Ajustar** hiperparámetros sin contaminar el conjunto de prueba.

## Programa por conferencias

1. **Qué es aprender de datos.**
   - Aprendizaje supervisado y no supervisado; regresión y clasificación.
   - La plantilla de **planteamiento** que usarás en todos tus proyectos: qué se predice, para quién, con qué datos disponibles en el momento de predecir, qué error cuesta más y cuál es la línea base.
2. **Generalización.**
   - Por qué el error de entrenamiento engaña.
   - Los conjuntos de entrenamiento, validación y prueba, y la regla de oro: el conjunto de prueba se mira **una vez**.
   - El riesgo empírico frente al real (enlace con la ley de los grandes números).
3. **Regresión lineal en la práctica.**
   - De las ecuaciones normales a `LinearRegression` y `SGDRegressor`.
   - Métricas: MAE, RMSE, $R^2$, y cuándo usar cada una.
   - Residuos.
4. **Regresión logística y clasificación.**
   - El modelo probabilístico, la pérdida logística y su gradiente (del repaso de matemáticas).
   - Probabilidad frente a decisión: el umbral.
5. **Métricas de clasificación.**
   - La matriz de confusión; precisión, exhaustividad (*recall*) y F1.
   - Las curvas ROC y PR y sus áreas.
   - Por qué con clases raras la precisión depende de la prevalencia: es la paradoja de la tasa base otra vez.
   - Métricas de coste.
6. **Validación cruzada.**
   - $k$-fold y estratificada.
   - **Por grupos:** varias fotos del mismo paciente, o ventas de la misma tienda.
   - Repetida.
   - La varianza de la estimación y cómo reportarla.
7. **Fugas de datos.**
   - Las formas más comunes:
     - preprocesar antes de dividir;
     - seleccionar variables con todos los datos;
     - duplicados entre particiones;
     - variables del futuro;
     - identificadores con información;
     - ajustar en la prueba.
   - El ejercicio del diagnóstico (estandarizar todo y seleccionar variables con todos los datos), resuelto. La selección de variables es la fuga más grave: con datos aleatorios puede producir exactitudes altísimas.
   - `Pipeline` y `ColumnTransformer`.
8. **Sesgo, varianza y curvas.**
   - Curvas de aprendizaje y de validación.
   - El ejercicio A/B del diagnóstico, resuelto:
     - **A** tiene alta varianza: regularizar, más datos o aumento de datos, un modelo más simple, parada temprana;
     - **B** tiene alto sesgo: mejores variables, más capacidad, menos regularización;
     - pero antes de nada hay que preguntarse **cuál es el error alcanzable** (el de un experto humano o el ruido de las etiquetas).
9. **Regularización.**
   - Ridge, Lasso y Elastic Net; trayectorias de coeficientes.
   - La selección de variables **dentro** de la validación.
10. **Preprocesamiento e ingeniería de variables.**
    - Escalado, codificación de categóricas (*one-hot*, ordinal, *target encoding* sin fugas), imputación y variables de fecha.
    - Cuándo el conocimiento del dominio vale más que el modelo.
11. **Búsqueda de hiperparámetros.**
    - Rejilla frente a búsqueda aleatoria; validación anidada.
    - Optuna (intuición bayesiana).
    - El presupuesto de búsqueda como fuente de sobreajuste (enlace con Estadística, conf. 7).
12. **Otros modelos base y cierre.**
    - $k$ vecinos, *naive Bayes* y SVM con núcleos (intuición).
    - **Plantilla de proyecto:** repositorio, informe, línea base, validación, análisis de errores y conclusión honesta.

## Clases prácticas

- **P1 (conf. 1-5):** un clasificador de un problema desbalanceado público (por ejemplo, fraude con tarjetas o riesgo de crédito):
  - línea base trivial, regresión logística y elección de umbral por coste;
  - informe de una página.
- **P2 (conf. 6-7): el laboratorio de fugas.** Con datos **aleatorios** (sin señal):
  - reproduce las exactitudes falsas del ejercicio del diagnóstico;
  - arréglalas con `Pipeline`;
  - mide cuánto infla cada fuga.
- **P3 (conf. 8-11):** curvas de aprendizaje y búsqueda de hiperparámetros con validación anidada en un conjunto de menos de 1.000 filas. Reporta la media y el intervalo.

## Demostraciones para valientes

- Demuestra que la validación cruzada *leave-one-out* para la regresión de Ridge tiene una fórmula cerrada (no hace falta reentrenar $n$ veces).
- Demuestra que el riesgo esperado de un predictor se descompone en sesgo², varianza y ruido irreducible.

## Evaluación

- **Examen conceptual sin asistente (40 %):** 10 preguntas como las del diagnóstico (métricas, fugas, sesgo y varianza, validación temporal, elección de métrica).
- **Prácticas P1-P3 (60 %),** valoradas sobre todo por la **calidad de la validación**, no por la métrica obtenida.
- **Criterio de paso:** cero fugas en P3 y 8 de 10 en el examen.

## Bibliografía principal

- **Google, *Curso intensivo de aprendizaje automático*** (en español, versión actualizada), módulos «Modelos de AA» (regresión lineal y logística, clasificación) y «Datos» (datos numéricos y categóricos, generalización, sobreajuste). Es interactivo y gratuito. Al ser un servicio de Google, puede requerir VPN desde Cuba.
- **Amat Rodrigo, J.** «Machine learning con Python y Scikit-learn», cienciadedatos.net: es el tutorial más completo en español sobre `Pipeline`, validación e hiperparámetros.
- **Fuentes Pineda, G.** *Curso de aprendizaje automatizado* (PCIC-UNAM, 2026-2), temas 1-3 (*naive Bayes*, métodos lineales, selección de modelos): diapositivas y cuadernos en español.
- **De pago:**
  - Raschka et al., *Machine Learning con PyTorch y Scikit-Learn* (Marcombo, 2023), caps. 2-6: es el libro troncal recomendado si puedes conseguirlo.
  - Géron, *Aprende Machine Learning con Scikit-Learn, Keras y TensorFlow*, 3.ª ed. (Anaya), caps. 1-4: es una alternativa con muy buen proyecto de extremo a extremo en el cap. 2.

## Referencias

- Google. *Curso intensivo de aprendizaje automático*. https://developers.google.com/machine-learning/crash-course?hl=es-419
- Amat Rodrigo, J. «Machine learning con Python y Scikit-learn». https://www.cienciadedatos.net/documentos/py06_machine_learning_python_scikitlearn
- Fuentes Pineda, G. *Curso de aprendizaje automatizado*, PCIC-UNAM. https://github.com/gibranfp/CursoAprendizajeAutomatizado
- Raschka, S., Liu, Y. y Mirjalili, V. (2023). *Machine Learning con PyTorch y Scikit-Learn*. Marcombo.
- Géron, A. (2023). *Aprende Machine Learning con Scikit-Learn, Keras y TensorFlow*, 3.ª ed. Anaya Multimedia. ISBN 978-84-415-4804-6.
- Kaufman, S., Rosset, S., Perlich, C. y Stitelman, O. (2012). Leakage in data mining: formulation, detection, and avoidance. *ACM TKDD* 6(4).
