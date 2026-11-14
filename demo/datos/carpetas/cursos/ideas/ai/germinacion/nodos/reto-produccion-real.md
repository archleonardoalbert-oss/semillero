# Reto de nivel: un modelo en producción con usuarios reales durante 3 meses

## Cómo se llegó a este problema

Tus tres metas confluyen aquí:

- el **empleo**: «lo he desplegado y lo usan» es la frase que más pesa en una entrevista;
- el **negocio**: un modelo que ahorra dinero a una tienda es un producto;
- la **comprensión real del ML**: casi todo lo que falla, falla en producción.

En el dictamen del ERP, la recomendación fue **validar con pagos o usos reales antes de programar más**. Este reto aplica esa lección al ML. El Proyecto 2 demuestra que el modelo de demanda funciona en un *backtesting*; este reto pregunta si **funciona y se usa en el mundo**.

Esa distancia es enorme. Los datos cambian (en Cuba, con inflación, apagones y desabastecimiento, cambian mucho). Los usuarios ignoran las recomendaciones que no entienden. Y los errores tienen consecuencias.

## El problema

La hipótesis, formulada para poder comprobarla:

> **Hipótesis.** El módulo de predicción de demanda del Proyecto 2, instalado en **al menos una mipyme real** durante **12 semanas**, mantiene una MASE < 1 frente a la estacional ingenua en las semanas reales (no en el *backtesting*). Además, el dueño sigue al menos el 50 % de las recomendaciones de pedido y declara, o se mide, una reducción de las rupturas o del inventario parado.

**El experimento más barato:**

1. Antes de programar más, ofrece a 3-5 dueños de tiendas (de tu entorno o usuarios de Economy) un informe semanal **hecho a mano** con tus predicciones, en papel o por WhatsApp, durante 4 semanas.
2. Si nadie lo lee ni lo usa, el problema no es el modelo.
3. Si alguien lo usa y pide más, instala el módulo.

**Métricas del reto:**

- el error real semana a semana frente al del *backtesting*;
- la deriva detectada y las acciones tomadas;
- la tasa de adopción de las recomendaciones;
- el efecto sobre las rupturas: sin grupo de control será una evidencia débil, y hay que decirlo.

**Criterio de éxito:** 12 semanas de funcionamiento, con un informe honesto, aunque el resultado sea negativo. Si alguien paga por él, es un éxito doble.

## Qué representaría resolverlo

- **Para tu empleo:** la evidencia más valiosa de tu portafolio.
- **Para tu negocio:** la primera validación con usuarios reales, y posiblemente con pagos, de un producto de IA propio.
- **Para el aprendizaje:** te enseñará cosas que ningún curso cubre, como la deriva real, la confianza del usuario, el mantenimiento y los fallos de datos.

Lo que **no** se puede anticipar es si los dueños de tiendas adoptarán las recomendaciones. En la literatura sobre el uso de pronósticos en empresas, los gestores ajustan o ignoran con frecuencia los pronósticos estadísticos (Fildes et al., 2009).

## Lo que se sabe

- **En empresas reales**, los ajustes humanos a los pronósticos a veces mejoran y a menudo empeoran la precisión, sobre todo cuando son al alza (Fildes et al., 2009).
- **La deuda técnica** de los sistemas de ML en producción está bien documentada (Sculley et al., 2015).
- **Lo que no sé:** no he encontrado estudios sobre el uso de pronósticos de demanda en el sector privado cubano, y es probable que no existan. Eso hace que tu informe, aunque sea pequeño, sea información nueva.

## Recursos

- El Proyecto 2 y MLOps ligero (conferencias 6 y 8).
- Estadística, conferencia 10 (experimentos con usuarios reales).
- El dictamen del ERP (carpeta Negocios), para el contexto del mercado de mipymes y sus competidores.

## Referencias

- Fildes, R., Goodwin, P., Lawrence, M. y Nikolopoulos, K. (2009). Effective forecasting and judgmental adjustments: an empirical evaluation and strategies for improvement in supply-chain planning. *International Journal of Forecasting* 25(1), 3-23.
- Sculley, D. et al. (2015). Hidden technical debt in machine learning systems. *NeurIPS*.
