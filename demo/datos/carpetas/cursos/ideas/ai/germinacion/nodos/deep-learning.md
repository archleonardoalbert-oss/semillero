# Aprendizaje profundo práctico con PyTorch

## Por qué está en el curso

Las redes neuronales son la herramienta para imágenes, texto y audio, y el camino obligatorio hacia los transformers y los LLM. En el diagnóstico dejaste ver tres cosas:

- **Teoría, bien.** Tu respuesta sobre las activaciones no lineales fue la mejor del diagnóstico. Lo formal: sin activaciones, $W_2(W_1x+b_1)+b_2 = (W_2W_1)x + (W_2b_1+b_2)$; la composición de afines es afín, y la profundidad no sirve de nada.
- **Herramienta, cambio necesario.** Has usado Keras y no conoces PyTorch.
- **Estrategia con pocos datos, equivocada.** En el problema de las 300 fotos de hojas propusiste entrenar tu propia red y conseguir el aumento de datos «con un *fine-tuning*». Son dos ideas distintas:
  - el **aumento de datos** genera variaciones de tus imágenes (giros, recortes, cambios de color);
  - el **ajuste fino** (*fine-tuning*) parte de una red ya entrenada con millones de imágenes y la adapta.

  Tu sospecha de que entrenar desde cero saldría mal es correcta, pero no por la falta de GPU. Es porque 300 imágenes no bastan para aprender desde cero qué es un borde o una textura. La respuesta es el **aprendizaje por transferencia**. Con tu GPU de 6 GB, ajustar una ResNet-18 a 300 imágenes lleva minutos.

**Por qué PyTorch y no Keras.**

- Es el estándar de la investigación (tu meta 3).
- Es el estándar del ecosistema de Hugging Face, que usarás para todos los LLM.
- Lo usa el curso de aprendizaje profundo de la UNAM que tomamos como apoyo.
- Escribir el bucle de entrenamiento a mano te obliga a entender lo que Keras esconde.

## Prerrequisitos

- ML I completo.
- La meta práctica «Gradientes desde cero» (retropropagación a mano).
- El repaso de matemáticas, conferencia 9 (SGD, Adam y diferenciación automática).

## Objetivos de la asignatura

- **Escribir** de memoria un bucle de entrenamiento y validación en PyTorch, y **explicar** cada línea (`zero_grad`, `backward`, `step`, `eval`, `no_grad`).
- **Diagnosticar** un entrenamiento que no aprende o que sobreajusta, a partir de sus curvas.
- **Aplicar** regularización: *dropout*, *weight decay*, parada temprana y aumento de datos.
- **Explicar** la convolución y **usar** arquitecturas preentrenadas (ResNet, EfficientNet) con `torchvision` o `timm`.
- **Ajustar** un modelo preentrenado con pocos datos: congelar, entrenar la cabeza y descongelar con tasas diferenciadas.
- **Entrenar** dentro de 6 GB de VRAM con precisión mixta, acumulación de gradientes y lotes adecuados.
- **Extraer** *embeddings* y **combinarlos** con modelos clásicos.

## Programa por conferencias

1. **De Keras a PyTorch.** Tensores, dispositivos (CPU y CUDA), `autograd`, el grafo dinámico y `requires_grad`. Tu regresión logística del repaso de matemáticas, reescrita en PyTorch.
2. **El bucle de entrenamiento.**
   - El modelo, la pérdida, el optimizador, y el orden `zero_grad()` → `backward()` → `step()`.
   - Qué pasa si olvidas `zero_grad()`: los gradientes se **acumulan**.
   - `model.eval()` cambia el comportamiento de *dropout* y *batch norm*; `torch.no_grad()` deja de guardar el grafo para ahorrar memoria. Son cosas distintas y se usan juntas al validar.
3. **Perceptrón multicapa.** `nn.Module`, inicialización (Xavier, He), funciones de activación, *softmax* y entropía cruzada (enlace con Probabilidad, conf. 11).
4. **Datos.** `Dataset` y `DataLoader`, normalización, lotes y barajado, semillas y reproducibilidad.
5. **Diagnosticar y regularizar.** Curvas de pérdida, el buscador de tasa de aprendizaje, sobreajuste y subajuste; *dropout*, *weight decay*, parada temprana y *batch norm*.
6. **Redes convolucionales.** Convolución, *pooling* y campos receptivos; LeNet → VGG → ResNet (conexiones residuales); por qué funcionan con imágenes.
7. **Aprendizaje por transferencia.**
   - Modelos preentrenados en ImageNet y extracción de características.
   - Congelar el cuerpo, entrenar la cabeza y descongelar las últimas capas con una tasa menor.
   - `timm` y `torchvision`, y el tamaño de las descargas (la mayoría pesa menos de 100 MB).
8. **Pocos ejemplos en imagen.**
   - Aumento de datos (recortes, giros, color, *mixup*) y validación por grupos (la misma hoja o el mismo paciente).
   - Sesgos del conjunto: el clásico de PlantVillage, donde el modelo aprende el **fondo** de laboratorio y falla en fotos de campo.
9. **Entrenar en 6 GB.** Precisión mixta (`torch.autocast`), acumulación de gradientes, *gradient checkpointing*, tamaño de lote frente a tasa de aprendizaje, y medir la memoria con `torch.cuda.max_memory_allocated`.
10. ***Embeddings*.** Una red como extractor de representaciones; *embeddings* + regresión logística; búsqueda por similitud; visualización con PCA.
11. **Secuencias y atención.** Las RNN y sus límites, la atención como búsqueda ponderada: el puente a los transformers.
12. **Del modelo al artefacto.** Guardar y cargar (`state_dict`), exportar para inferencia (TorchScript, ONNX), cuantización simple e inferencia en CPU. Es el puente a MLOps.

## Clases prácticas

- **P1 (conf. 1-5):** un MLP en PyTorch para un problema tabular del bloque anterior. ¿Bate a LightGBM? Casi nunca lo hace, y entender por qué es parte de la lección.
- **P2 (conf. 6-9):** la meta práctica «Clasificador de imágenes con 300 ejemplos».
- **P3 (conf. 10):** *embeddings* de imágenes + regresión logística frente al ajuste fino completo: ¿cuánto se pierde?

## Demostraciones para valientes

- Demuestra que una red con una capa oculta de anchura suficiente y activación ReLU puede aproximar cualquier función continua en un compacto (aproximación universal, versión constructiva en 1D).
- Deduce por qué la inicialización de He escala la varianza como $2/n_{\text{entrada}}$.

## Evaluación

- **Prueba práctica sin asistente (40 %):** escribir en 45 minutos un bucle completo de entrenamiento y validación para un problema dado, con parada temprana.
- **Prácticas P1-P3 (60 %).**
- **Criterio de paso:** el bucle funcionando sin ayuda y, en P2, una validación por grupos con intervalos.

## Bibliografía principal

- **Fuentes Pineda, G.** *Curso de aprendizaje profundo* (PCIC-UNAM, 2027-1), en español y con PyTorch 2.4, `timm` y `torchvision`. Es el troncal: unidades de redes densas, convolucionales, recurrentes y de atención, con cuadernos.
- **Colmenarejo Allavena, I. y López Herraiz, J.** *Las matemáticas de la inteligencia artificial* (UCM, LibreTexts), caps. 7-10 (redes neuronales, retropropagación, entrenamiento).
- **Amat Rodrigo, J.** «Redes neuronales con Python», cienciadedatos.net.
- **De pago:** Raschka et al., *Machine Learning con PyTorch y Scikit-Learn* (Marcombo, 2023), caps. 12-15 (PyTorch, CNN, RNN). Es el más alineado con esta asignatura.

## Referencias

- Fuentes Pineda, G. *Curso de aprendizaje profundo*, PCIC-UNAM, 2027-1. https://github.com/gibranfp/CursoAprendizajeProfundo
- Colmenarejo Allavena, I. y López Herraiz, J. *Las matemáticas de la inteligencia artificial*. UCM, LibreTexts.
- He, K., Zhang, X., Ren, S. y Sun, J. (2016). Deep residual learning for image recognition. *CVPR*.
- Yosinski, J., Clune, J., Bengio, Y. y Lipson, H. (2014). How transferable are features in deep neural networks? *NeurIPS*.
- Raschka, S., Liu, Y. y Mirjalili, V. (2023). *Machine Learning con PyTorch y Scikit-Learn*. Marcombo.
