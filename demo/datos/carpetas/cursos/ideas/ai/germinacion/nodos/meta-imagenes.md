# Meta práctica: un clasificador de imágenes con 300 ejemplos

## Cómo se llegó a este problema

Es el ejercicio del diagnóstico que más claramente mostró el hueco. Ante 300 fotos de hojas con 3 enfermedades, propusiste:

- **entrenar una red propia:** con 300 imágenes, una red desde cero sobreajusta casi seguro;
- **conseguir el aumento de datos «con un *fine-tuning*»:** son dos técnicas distintas.

Intuiste que algo fallaba, y es así, aunque el problema principal no es la GPU sino los datos.

Hay además una trampa famosa justo en este dominio. El conjunto más usado de enfermedades de plantas, **PlantVillage**, está hecho con fotos de laboratorio: hojas sueltas sobre fondo uniforme. Los modelos llegan a exactitudes cercanas al 99 %, pero varios estudios han mostrado que caen mucho con fotos tomadas en el campo. Incluso se ha visto que una parte de la señal puede venir del **fondo** y no de la hoja. Es el ejemplo perfecto de que una exactitud alta no significa que el modelo funcione.

## El problema

> **Meta.** Construye un clasificador de 3 clases con **100 imágenes por clase** de entrenamiento (un subconjunto de PlantVillage u otro conjunto público de hojas) y compara:
> 1. **Una CNN pequeña desde cero.**
> 2. **Extracción de características:** una ResNet-18 o una EfficientNet-B0 preentrenada y congelada, más una regresión logística sobre los *embeddings*.
> 3. **Ajuste fino:**
>    - primero solo la cabeza;
>    - después las últimas capas, con una tasa de aprendizaje menor;
>    - con aumento de datos (recortes, giros, color).
>
> Evalúa:
> - en un conjunto de prueba del **mismo dominio**, con intervalo *bootstrap*;
> - en un conjunto de **otro dominio** (fotos de campo, como PlantDoc, o 30 fotos tuyas de hojas reales) para medir la caída por cambio de dominio;
> - con una prueba de control que **recorte la hoja y sustituya el fondo**: ¿cuánto depende el modelo del fondo?

**Criterio de éxito:**

- la tabla de los 3 métodos × 2 dominios con intervalos;
- la medida de la caída por cambio de dominio;
- una explicación de por qué el ajuste fino gana en el mismo dominio y qué pasa fuera de él;
- todo entrenado en tu GPU de 6 GB, anotando el tiempo y la memoria usados.

## Qué representaría resolverlo

- **Lo que demuestra:** que dominas el aprendizaje por transferencia, que es la técnica que hace útil el aprendizaje profundo con pocos datos.
- **El experimento de cambio de dominio** te da algo que casi ningún portafolio júnior tiene: una prueba de que sabes que la exactitud en el conjunto de prueba no es la exactitud en el mundo.

## Lo que se sabe

- **Mohanty, Hughes y Salathé (2016)** obtuvieron un 99,35 % en PlantVillage, pero solo un 31 % en imágenes de condiciones distintas.
- **Singh et al. (2020)** publicaron PlantDoc, con fotos de campo, precisamente para medir esa brecha.
- **Noyan (2022)** mostró que un modelo entrenado **solo con píxeles del fondo** de PlantVillage obtiene una exactitud muy por encima del azar.
- **El aprendizaje por transferencia desde ImageNet** es la práctica estándar (Yosinski et al., 2014).

Lo que no está resuelto en general es cómo **garantizar** la robustez ante el cambio de dominio. Esta meta no te pide resolverlo, sino **medirlo**.

## Recursos

- Aprendizaje profundo, conferencias 6-9.
- Fuentes Pineda, *Curso de aprendizaje profundo* (UNAM, 2027-1), unidad de redes convolucionales.

## Referencias

- Mohanty, S. P., Hughes, D. P. y Salathé, M. (2016). Using deep learning for image-based plant disease detection. *Frontiers in Plant Science* 7, 1419.
- Singh, D. et al. (2020). PlantDoc: a dataset for visual plant disease detection. *CoDS-COMAD*.
- Noyan, M. A. (2022). Uncovering bias in the PlantVillage dataset. Preprint en arXiv (2022).
- Yosinski, J. et al. (2014). How transferable are features in deep neural networks? *NeurIPS*.
