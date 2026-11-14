# Proyecto 1: un modelo tabular con pocos datos, evaluado con honestidad

## Cómo se llegó a este problema

En tu primer mensaje dijiste que no entiendes por qué todos creen que un modelo solo sirve con miles de millones de ejemplos. Este proyecto es tu respuesta pública a esa pregunta: un repositorio que demuestre que, con cientos o pocos miles de filas, se puede construir un modelo útil, **y que se sabe medir cuánto lo es**.

Es el primer proyecto de tu portafolio, y llega cuando tu prioridad es el empleo. Por eso tiene que cumplir dos condiciones:

- **resolver un problema que a alguien le importe**, no el Titanic ni Iris;
- **mostrar las competencias que más se piden y menos se ven:** validación sin fugas, comparación estadística, calibración y análisis de errores.

## El problema

> **Meta.** Elige un problema tabular real con **entre 200 y 5.000 filas**. Pueden ser datos públicos de salud, crédito, agricultura, educación o mantenimiento, o mejor aún, datos de un negocio cubano que te los preste. Entrega:
> 1. **Planteamiento** (1 página): qué se predice, para quién, qué decisión cambia y qué error cuesta más.
> 2. **Líneas base:** la trivial (clase mayoritaria o media) y una regla sencilla de dominio.
> 3. **Comparación:** regresión logística o Ridge, LightGBM y TabPFN.
>    - Validación cruzada repetida y anidada **sin fugas**, todo dentro de `Pipeline`.
>    - Intervalos *bootstrap* y prueba pareada (de la meta anterior).
> 4. **Curva de aprendizaje** con submuestras de 50, 100, 200, 500… filas: ¿en qué tamaño cambia el ganador?
> 5. **Calibración y umbral** según el coste del problema.
> 6. **Análisis de errores:** en qué casos falla y por qué. Interpretación con SHAP o importancia por permutación, con sus advertencias.
> 7. **Conclusión honesta**, aunque sea «no hay señal suficiente».
> 8. **Repositorio reproducible** con un solo comando y una demo mínima en Hugging Face Spaces o en tu Django.

**Criterio de éxito** (revisable por un tercero):

- cero fugas, comprobado con un *checklist* explícito;
- todas las métricas con intervalo;
- conclusiones que se sigan de los intervalos;
- otra persona puede clonarlo y reproducir la tabla principal.

Batir a la línea base **no** es obligatorio. Reportar mal sí descalifica.

## Qué representaría resolverlo

- **Portafolio:** es tu primera pieza con la que postular (ver la meta «Empleo remoto») y la base del reto «Reproducir un resultado publicado».
- **Lo que demuestra:** que sabes las tres cosas que suelen fallar en las entrevistas de ML júnior: validación, métricas y fugas.
- **Si los datos son de un negocio cubano:** puede convertirse en un primer cliente.

## Estado del arte y enfoques

- **Árboles frente a redes:** en datos tabulares de tamaño medio, los árboles con *boosting* siguen superando a las redes profundas típicas (Grinsztajn et al., 2022).
- **TabPFN** (Hollmann et al., 2025, *Nature*) cambió el panorama en conjuntos pequeños. Lo supera en conjuntos de hasta 10.000 muestras y 500 variables con una sola pasada.
- **TabPFN-2.5** (Prior Labs, nov. 2025) dice liderar el *benchmark* TabArena y amplía el alcance a unas 50.000 filas.

Comprueba dos cosas antes de usarlo:

- **la licencia**, que ha cambiado entre versiones y condiciona el uso comercial;
- **la memoria** que necesita en tu GPU de 6 GB con tu número de filas.

Lo que **no** se sabe de antemano es si esas ventajas se mantienen en *tu* problema concreto. Por eso el proyecto exige la curva de aprendizaje y la comparación pareada, en vez de dar por hecho lo que dicen los *benchmarks*.

## Recursos

- ML I y ML II completos, y la meta «Comparar dos modelos con rigor».
- Amat Rodrigo, «Machine learning con Python y Scikit-learn» y «Gradient Boosting con Python», cienciadedatos.net.
- Espejo Miranda et al., *Inferencia estadística*, [PDF](germinacion/recursos/uca-inferencia-estadistica.pdf), caps. 3-4.

## Referencias

- Hollmann, N. et al. (2025). Accurate predictions on small data with a tabular foundation model. *Nature* 637, 319-326.
- Prior Labs (2025). *TabPFN-2.5: Advancing the State of the Art in Tabular Foundation Models*. arXiv:2511.08667.
- Grinsztajn, L., Oyallon, E. y Varoquaux, G. (2022). Why do tree-based models still outperform deep learning on typical tabular data? *NeurIPS Datasets and Benchmarks*.
- Kaufman, S. et al. (2012). Leakage in data mining: formulation, detection, and avoidance. *ACM TKDD* 6(4).
