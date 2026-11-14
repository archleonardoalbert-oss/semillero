# Reto de nivel: reproducir y poner a prueba un resultado publicado sobre pocos datos

## Cómo se llegó a este problema

En el dictamen propuse reproducir el experimento de TabPFN frente al *boosting* en conjuntos pequeños como prueba de que «sabes leer investigación», que es la base de tu meta 3.

Reproducir un resultado parece fácil y no lo es. Los artículos omiten detalles, los *benchmarks* tienen sesgos de selección y las comparaciones a veces dan a un método más presupuesto de ajuste que a otro. Desde hace años, la comunidad de ML discute una «crisis de reproducibilidad» (Pineau et al., 2021), y hay estudios que muestran que muchas mejoras publicadas desaparecen con líneas base bien ajustadas.

El resultado elegido es central en tu especialidad. *Nature* (Hollmann et al., 2025) afirma que TabPFN supera a los árboles ajustados durante 4 horas en conjuntos de hasta 10.000 muestras. TabPFN-2.5 (nov. 2025) dice tener una tasa de victoria del 100 % frente a XGBoost por defecto en clasificación pequeña y mediana. Son afirmaciones fuertes y comprobables con tu equipo.

> **Excepción de idioma:** estos artículos solo existen en inglés. El curso te explicará en español todo lo necesario para entenderlos; el reto incluye leer el original, apoyándote en esa explicación.

## El problema

> **Reto.** Sobre **20 conjuntos tabulares pequeños** (de 100 a 5.000 filas) de un *benchmark* público, como OpenML-CC18 o un subconjunto de TabArena, más **3 conjuntos de tu elección del mundo real**:
> 1. **Compara:**
>    - TabPFN (la versión cuya licencia te permita el uso);
>    - LightGBM y CatBoost con dos presupuestos de ajuste (por defecto y 1 hora con Optuna);
>    - la regresión logística.
> 2. **Usa** el **mismo protocolo** para todos: validación cruzada repetida idéntica, mismas particiones y misma métrica.
> 3. **Analiza:**
>    - la diferencia por conjunto con intervalos;
>    - los rangos medios con la prueba de Friedman y el análisis *post hoc* de Nemenyi, o comparaciones bayesianas;
>    - en qué tipos de conjunto **no** gana TabPFN (muchas categóricas, mucho ruido, desbalance extremo).
> 4. **Escribe** un informe de 6-8 páginas en formato de artículo. ¿Se reproduce la afirmación? ¿En qué condiciones falla?

**Criterio de éxito:**

- el protocolo es reproducible con un solo comando;
- las conclusiones se apoyan en las pruebas estadísticas;
- el informe identifica al menos una condición en la que la afirmación no se cumple, o argumenta con datos que no la encontraste.

## Qué representaría resolverlo

- **Si se reproduce:** tendrás evidencia propia para usar TabPFN con confianza en proyectos reales.
- **Si encuentras condiciones en las que falla** (por ejemplo, en datos de comercio con muchas categóricas o con ruido de etiquetado), ese hallazgo podría ser publicable como nota corta o como artículo en un taller de reproducibilidad.
- **Lo que no se puede anticipar:** qué encontrarás.

## Lo que se sabe

- **Hollmann et al. (2023, ICLR):** presentaron el primer TabPFN, limitado a 1.000 muestras.
- **Hollmann et al. (2025, *Nature*):** TabPFN v2, hasta 10.000 muestras y 500 variables.
- **Prior Labs (2025):** TabPFN-2.5, hasta unas 50.000 muestras y 2.000 variables, líder de TabArena según sus autores, con una herramienta de destilación a MLP o árboles.
- **Las comparaciones independientes** de modelos fundacionales tabulares están aún en curso.
- **La metodología** para comparar algoritmos en muchos conjuntos está bien establecida (Demšar, 2006, con Friedman y Nemenyi; Benavoli et al., 2017, con alternativas bayesianas).

## Recursos

- ML II, conferencia 6 (TabPFN), y el Proyecto 1.
- La meta «Comparar dos modelos con rigor».
- Espejo Miranda et al., *Inferencia estadística*, cap. 5 (contrastes no paramétricos, p. 107 y siguientes), [PDF](germinacion/recursos/uca-inferencia-estadistica.pdf).

## Referencias

- Hollmann, N., Müller, S., Eggensperger, K. y Hutter, F. (2023). TabPFN: a transformer that solves small tabular classification problems in a second. *ICLR*.
- Hollmann, N. et al. (2025). Accurate predictions on small data with a tabular foundation model. *Nature* 637, 319-326.
- Prior Labs (2025). *TabPFN-2.5: Advancing the State of the Art in Tabular Foundation Models*. arXiv:2511.08667.
- Demšar, J. (2006). Statistical comparisons of classifiers over multiple data sets. *JMLR* 7, 1-30.
- Benavoli, A., Corani, G., Demšar, J. y Zaffalon, M. (2017). Time for a change: a tutorial for comparing multiple classifiers through Bayesian analysis. *JMLR* 18(77).
- Pineau, J. et al. (2021). Improving reproducibility in machine learning research. *JMLR* 22(164).
