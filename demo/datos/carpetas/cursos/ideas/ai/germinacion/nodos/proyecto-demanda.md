# Proyecto 2: predicción de demanda para un pequeño comercio, desplegada

## Cómo se llegó a este problema

En el dictamen del ERP (Economy) concluimos que el negocio de suscripción no era viable tal como estaba, pero que el proyecto valía mucho **como portafolio**. En el dictamen de este curso propuse una idea nueva: un módulo de predicción de demanda con pocos datos que convierta ese portafolio de «sé hacer un CRUD» en «sé hacer ML aplicado».

El comercio minorista cubano tiene justo los rasgos que hacen el problema interesante:

- **pocos datos por producto y demanda intermitente:** muchos días sin ventas;
- **rupturas de inventario:** vender 0 no significa que nadie lo quisiera;
- **choques externos:** apagones, saltos del tipo de cambio informal (de 440 a 560 CUP/USD en cinco meses de 2026) y desabastecimiento;
- **conexión poco fiable:** el sistema debe funcionar sin red, como sus competidores locales.

Además, en el diagnóstico no supiste cómo validar el pronóstico de una tienda, así que este proyecto es también tu examen práctico de series temporales.

## El problema

La hipótesis, formulada para poder comprobarla:

> **Hipótesis.** Con 1-2 años de ventas diarias de 30 a 100 productos, un modelo global (LightGBM con rezagos, vía skforecast) supera a la estacional ingenua en MASE en un *backtesting* de al menos 8 semanas, y sus intervalos al 80 % tienen una cobertura empírica entre el 72 % y el 88 %.

**Entregables:**

1. **Datos:**
   - lo ideal son ventas reales de una mipyme (anonimizadas y con permiso), por ejemplo de un usuario de Economy;
   - si no las consigues, usa datos públicos de ventas minoristas y simula rupturas de inventario.
2. **Análisis exploratorio:** estacionalidad, intermitencia y efectos calendario.
3. ***Backtesting* de origen móvil:**
   - comparar estacional ingenua, ETS, Croston (en los productos intermitentes) y el modelo global;
   - MASE y WAPE con intervalo por *bootstrap* de bloques.
4. **Pronóstico por cuantiles** y un **punto de pedido** para un nivel de servicio elegido.
5. **Despliegue:**
   - módulo Django (en Economy o independiente) que reentrene cada semana y funcione **sin conexión**, en CPU;
   - panel con la predicción, el intervalo y la recomendación de pedido;
   - monitorización de la deriva.
6. **Informe:** qué ganaría la tienda (menos rupturas, menos inventario parado) y con qué incertidumbre.

**Criterio de éxito:** se cumple la hipótesis, o se documenta por qué no se cumple. Además, el sistema se instala y funciona en un ordenador sin conexión siguiendo el README.

**El experimento más barato que la refuta:** el *backtesting* del punto 3 con datos públicos, sin desplegar nada (unas 10 horas). Si el modelo no bate a la estacional ingenua, no tiene sentido desplegarlo.

## Qué representaría resolverlo

- **Para tu empleo:** la pieza central del portafolio, que es ML de extremo a extremo, desplegado, con incertidumbre y con un caso de negocio.
- **Para tu negocio:** un diferenciador frente a los competidores locales (Cuadre, TuMerkadito, BStock), que no ofrecen predicción.

Lo que **no** se puede anticipar es si los dueños de tiendas confiarán en las recomendaciones o las usarán. Eso solo lo dice el reto «Un modelo en producción con usuarios reales».

## Lo que se sabe

- **Las competiciones M** (Makridakis et al.) mostraron:
  - **M4 (2018):** los métodos combinados y los híbridos estadísticos con ML ganan a los puramente de ML.
  - **M5 (2020-2022), sobre ventas de Walmart:** modelos globales de LightGBM dominaron los primeros puestos, tanto en precisión como en incertidumbre.
- **La demanda intermitente** sigue siendo difícil. Croston (1972) y sus correcciones (Syntetos y Boylan, 2005) son la línea base estándar.
- **La cuestión abierta en la práctica** es cómo tratar las rupturas de inventario (demanda censurada) cuando no se registran. Es probable que tus datos no las registren.

## Recursos

- Series temporales y predicción de demanda, completa.
- MLOps ligero, conferencias 3, 6 y 8.
- Amat Rodrigo y Escobar Ortiz, tutoriales de skforecast y de demanda intermitente, en cienciadedatos.net.

## Referencias

- Makridakis, S., Spiliotis, E. y Assimakopoulos, V. (2022). M5 accuracy competition: results, findings, and conclusions. *International Journal of Forecasting* 38(4), 1346-1364.
- Makridakis, S., Spiliotis, E. y Assimakopoulos, V. (2018). The M4 competition: results, findings, conclusion and way forward. *International Journal of Forecasting* 34(4), 802-808.
- Croston, J. D. (1972). Forecasting and stock control for intermittent demands. *Operational Research Quarterly* 23(3), 289-303.
- Syntetos, A. A. y Boylan, J. E. (2005). The accuracy of intermittent demand estimates. *International Journal of Forecasting* 21(2), 303-314.
- Amat Rodrigo, J. y Escobar Ortiz, J. «Forecasting de demanda intermitente con Python y Skforecast». https://www.cienciadedatos.net/documentos/py48-forecasting-demanda-intermitente
