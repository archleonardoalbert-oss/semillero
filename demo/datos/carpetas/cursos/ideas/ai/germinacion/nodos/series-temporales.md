# Series temporales y predicción de demanda

## Por qué está en el curso

Predecir cuánto se va a vender es **el problema de ML más útil para una mipyme** y el que conecta este curso con tu meta 2 (negocio) y con tu proyecto Economy. Su núcleo es comercio taller → almacén → local, y su mejor uso, según el dictamen del ERP, era como portafolio.

Además, tu respuesta al ejercicio de la tienda del diagnóstico fue «no sé qué es validación cruzada». En series temporales ese error es especialmente traicionero. Si validas con particiones aleatorias, el modelo «ve el futuro»: aprende del martes para predecir el lunes anterior, y el error medido sale mucho mejor que el real.

En el comercio pequeño, la demanda tiene rasgos propios:

- muchos productos se venden poco y de forma **intermitente**, con muchos días a cero;
- hay rupturas de inventario: una venta cero no siempre significa demanda cero;
- en Cuba, además, hay choques externos (apagones, cambio de divisa, desabastecimiento) que ningún modelo anticipa.

Esta asignatura enseña a predecir con honestidad en ese entorno, y a convertir la predicción en una **decisión de inventario**.

## Prerrequisitos

- ML II (árboles y *boosting*, sobre todo la conferencia 10: cuantiles).
- Estadística, conferencias 3-4 (intervalos y *bootstrap* por bloques).
- pandas II (`resample`, `rolling`).

## Objetivos de la asignatura

- **Describir** una serie: tendencia, estacionalidad, autocorrelación y ruido.
- **Construir** y **batir** las líneas base (ingenua y estacional ingenua).
- **Validar** con *backtesting* de origen móvil y **explicar** por qué la validación cruzada aleatoria es una fuga.
- **Usar** ETS y ARIMA a nivel práctico, y **saber** cuándo bastan.
- **Construir** pronosticadores con ML (variables de rezago, recursivo frente a directo) con skforecast y LightGBM.
- **Modelar** muchas series a la vez y la demanda intermitente.
- **Producir** pronósticos por cuantiles y **traducirlos** a un punto de pedido con un nivel de servicio.

## Programa por conferencias

1. **Anatomía de una serie.** Tendencia, estacionalidad semanal y anual, autocorrelación (ACF y PACF) y descomposición STL. Efectos calendario: festivos, días de cobro, inicio de mes.
2. **Líneas base y métricas.**
   - Las líneas base: ingenua, estacional ingenua y media móvil.
   - Las métricas: MAE, RMSE, MAPE y sus trampas con ceros, WAPE, MASE (escala respecto a la estacional ingenua) y la pérdida *pinball* para cuantiles.
   - **Regla del curso:** un modelo que no bate a la estacional ingenua en MASE no se despliega.
3. **Validar en el tiempo.**
   - El *backtesting* con origen móvil (expansivo o de ventana fija) y el horizonte de predicción.
   - **Variables prohibidas:** cualquier dato que no esté disponible en el momento de predecir, como las ventas del mismo día, precios futuros o el inventario posterior.
   - El ejercicio del diagnóstico, resuelto.
4. **Modelos estadísticos clásicos.** Suavizado exponencial (Holt-Winters o ETS) y ARIMA y SARIMA, a nivel de uso: cuándo un modelo clásico gana a uno de ML (series cortas, una sola serie).
5. **Pronóstico con ML.**
   - Convertir una serie en una tabla: rezagos, ventanas y variables exógenas.
   - Estrategias recursiva y directa.
   - skforecast con LightGBM.
   - Las transformaciones (logaritmo, diferenciación) y cómo deshacerlas.
6. **Muchas series a la vez.** Los modelos globales (un modelo para 50 productos), las variables de identificación, las jerarquías tienda/categoría/producto y la coherencia entre niveles.
7. **Demanda intermitente.** El método de Croston y sus variantes, los modelos de dos partes (probabilidad de venta × cantidad) y la censura por ruptura de inventario.
8. **De la predicción a la decisión.**
   - Pronósticos por cuantiles y la cobertura de los intervalos.
   - Stock de seguridad, punto de pedido y nivel de servicio.
   - Cómo comunicar la incertidumbre a un dueño de tienda.
   - El modelo frente a los choques: cuándo hay que avisar de que el pasado ya no sirve.

## Clases prácticas

- **P1 (conf. 1-3):** con un conjunto público de ventas minoristas, haz el análisis exploratorio, las líneas base y el *backtesting* de 8 semanas.
- **P2 (conf. 5-6):** un modelo global con skforecast y LightGBM para 50 productos. Compáralo con la estacional ingenua y con ETS en MASE, con intervalo *bootstrap* por bloques.
- **P3 (conf. 7-8):** subconjunto de productos intermitentes con Croston frente al modelo de dos partes, cuantiles al 80 % y 95 % y punto de pedido.

## Demostraciones para valientes

- Demuestra que el pronóstico óptimo bajo la pérdida *pinball* $\tau$ es el cuantil $\tau$ de la distribución predictiva.
- Deduce el pronóstico de Croston como estimador de la tasa de demanda por periodo.

## Evaluación

- **Examen conceptual sin asistente (30 %).**
- **Prácticas P1-P3 (70 %).**
- **Criterio de paso:** un *backtesting* sin fugas, la MASE frente a la estacional ingenua con intervalo, y una cobertura empírica del intervalo al 80 % entre el 72 % y el 88 %.

## Bibliografía principal

- **Amat Rodrigo, J. y Escobar Ortiz, J.**, tutoriales en cienciadedatos.net, en español y con código. Son el recurso troncal:
  - «Skforecast: forecasting de series temporales con machine learning»;
  - «Forecasting series temporales con gradient boosting: XGBoost, LightGBM y CatBoost»;
  - «Forecasting de demanda intermitente con Python y Skforecast»;
  - «Forecasting con modelos de deep learning» (opcional).
- **Fuera de tus idiomas:** Hyndman y Athanasopoulos, *Forecasting: Principles and Practice* (3.ª ed., gratuito en línea, con edición en Python de 2025) es la referencia del campo. No tiene traducción al español que haya podido verificar, así que solo se cita.

## Referencias

- Amat Rodrigo, J. y Escobar Ortiz, J. «Skforecast: forecasting de series temporales con machine learning». https://www.cienciadedatos.net/documentos/py27-forecasting-series-temporales-python-scikitlearn
- Amat Rodrigo, J. y Escobar Ortiz, J. «Forecasting series temporales con gradient boosting». https://www.cienciadedatos.net/documentos/py39-forecasting-series-temporales-con-skforecast-xgboost-lightgbm-catboost
- Amat Rodrigo, J. y Escobar Ortiz, J. «Forecasting de demanda intermitente con Python y Skforecast». https://www.cienciadedatos.net/documentos/py48-forecasting-demanda-intermitente
- Hyndman, R. J. y Koehler, A. B. (2006). Another look at measures of forecast accuracy. *International Journal of Forecasting* 22(4), 679-688.
- Croston, J. D. (1972). Forecasting and stock control for intermittent demands. *Operational Research Quarterly* 23(3), 289-303.
- Hyndman, R. J. y Athanasopoulos, G. *Forecasting: Principles and Practice*, 3.ª ed. OTexts. https://otexts.com/fpp3/
