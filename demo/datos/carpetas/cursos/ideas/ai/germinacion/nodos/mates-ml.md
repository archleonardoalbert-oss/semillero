# Repaso acelerado: las matemáticas del aprendizaje automático

*Cálculo matricial, optimización y álgebra lineal aplicada*

## Por qué está en el curso

Un modelo de ML se reduce a tres piezas:

- **una función con parámetros**, que es álgebra lineal: $\hat y = \sigma(Wx + b)$;
- **una pérdida** que mide el error;
- **un algoritmo que mueve los parámetros** para reducir esa pérdida, que es cálculo y optimización: $w \leftarrow w - \eta \nabla L(w)$.

Si dominas esas tres piezas, la retropropagación, la regularización, la PCA y LoRA dejan de ser magia. Para ti esto no es un curso nuevo. Aprobaste Álgebra Lineal, Álgebra Bilineal y Análisis de varias variables, y te autoevaluaste con un 2 en cálculo (regla de la cadena, jacobiano, hessiano, Taylor) y en álgebra (proyecciones, mínimos cuadrados, teorema espectral). Pero no resolviste ninguno de los 6 ejercicios del diagnóstico, y explicaste que necesitas tiempo para reacostumbrarte.

Lo que estudiaste existe, aunque está oxidado. Por eso esta asignatura es un **repaso acelerado y aplicado**. No repite tus asignaturas: las **traduce al lenguaje del ML** y añade lo que no viste (SVD y rango bajo, gradientes matriciales, descenso de gradiente estocástico, Adam, diferenciación automática).

Además, coincide con tu semestre actual: estás cursando **Matemática Numérica**, que trata mínimos cuadrados, condicionamiento y métodos iterativos. Aprovéchala. Las conferencias 2 y 8 se apoyan en ella.

## Prerrequisitos

- Álgebra Lineal y Bilineal, Análisis I y II y varias variables: aprobados.
- La asignatura de Python científico, al menos sus conferencias 1-3, porque cada conferencia tiene una comprobación numérica en NumPy.

### Prueba de entrada (45 minutos, sin IA)

Son los seis ejercicios del diagnóstico que dejaste sin hacer:

- el gradiente de $\lVert Xw-y\rVert^2$;
- $\sigma'$ y el gradiente de la pérdida logística;
- el paso del descenso de gradiente en una cuadrática;
- la retropropagación en dos capas;
- la PCA de una matriz $2\times 2$;
- Eckart–Young.

Cada uno que resuelvas bien te permite saltarte la conferencia correspondiente.

## Objetivos de la asignatura

- **Calcular** a mano gradientes de funciones de vectores y matrices, y **verificarlos** con diferencias finitas en NumPy.
- **Derivar** la retropropagación de una red de dos capas y **explicar** por qué cuesta lo mismo que una pasada hacia delante.
- **Interpretar** los mínimos cuadrados como una proyección y **diagnosticar** el mal condicionamiento.
- **Calcular** e **interpretar** la SVD, la PCA y la mejor aproximación de rango $k$.
- **Predecir** cuándo converge el descenso de gradiente en función del paso y del condicionamiento.
- **Explicar** qué hacen el momento y Adam, y qué hace `loss.backward()` en PyTorch.

## Programa por conferencias

1. **Geometría de los datos.**
   - Los vectores como ejemplos y las matrices como conjuntos de datos.
   - Normas $\ell_1$, $\ell_2$ e $\ell_\infty$, el producto escalar y la similitud del coseno.
   - Es la base de los *embeddings* y de la búsqueda semántica que usarás en RAG.
2. **Mínimos cuadrados como proyección.**
   - $\hat y = X(X^\top X)^{-1}X^\top y$ es la proyección ortogonal sobre las columnas de $X$.
   - Las ecuaciones normales.
   - Qué pasa con columnas casi colineales: el número de condición, y por qué no se invierte $X^\top X$ en la práctica (QR, `lstsq`).
3. **Teorema espectral y covarianza.**
   - Las formas cuadráticas.
   - La matriz de covarianza es simétrica y semidefinida positiva.
   - Sus autovectores son direcciones de varianza máxima.
   - El ejercicio $\Sigma = \begin{pmatrix}3&1\\1&3\end{pmatrix}$ resuelto.
4. **SVD, rango bajo y PCA.**
   - $W = U\Sigma V^\top$.
   - El teorema de Eckart–Young, $\lVert W - W_k\rVert_F = \sqrt{\sum_{i>k}\sigma_i^2}$.
   - La PCA como SVD de los datos centrados; compresión y ruido.
   - Lo que anticipa LoRA: una actualización $\Delta W = BA$ de rango $r$.
5. **Gradientes de funciones matriciales.**
   - Reglas prácticas: $\nabla_w (a^\top w) = a$, $\nabla_w (w^\top A w) = (A + A^\top)w$ y $\nabla_w \lVert Xw-y\rVert^2 = 2X^\top(Xw-y)$.
   - Las dimensiones como control de errores.
   - Comprobación con diferencias centradas: el error relativo debe quedar por debajo de $10^{-6}$.
6. **La regla de la cadena como grafo computacional.**
   - El modo hacia atrás (*reverse mode*).
   - La retropropagación en $h = \mathrm{ReLU}(W_1x)$, $\hat y = w_2^\top h$: se llega a $\partial L/\partial W_1 = (\hat y - y)\,(w_2 \odot \mathbb{1}[W_1x>0])\,x^\top$.
   - La sigmoide y la pérdida logística: $\nabla_w L = (\sigma(w^\top x) - y)\,x$.
7. **Convexidad y regularización.**
   - Conjuntos y funciones convexas, el hessiano semidefinido y las condiciones de primer y segundo orden.
   - La regularización L2 (Ridge) como mejora del condicionamiento: $X^\top X + \lambda I$.
   - Los multiplicadores de Lagrange, solo para interpretar L1 y L2 como restricciones.
8. **Descenso de gradiente.**
   - Sobre $f(x)=\tfrac a2 x^2$: $x_{k+1} = (1-\eta a)\,x_k$ converge si $0<\eta<2/a$, y en $\eta = 2/a$ oscila sin converger.
   - En varias dimensiones, el paso lo limita el autovalor mayor del hessiano y la velocidad, el menor: el condicionamiento manda.
   - Por qué se estandarizan las variables.
9. **Optimización estocástica y diferenciación automática.**
   - El descenso por mini-lotes como gradiente ruidoso pero insesgado.
   - El momento y Adam (intuición y fórmulas).
   - Calendarios de la tasa de aprendizaje.
   - Qué guarda `autograd` en memoria y por qué eso limita el tamaño del modelo en tu GPU de 6 GB.

## Clases prácticas

- **P1 (conf. 2-4):** con NumPy, ajusta una regresión polinómica por mínimos cuadrados. Muestra cómo explota el número de condición al subir el grado y arréglalo con QR y con Ridge. Después, PCA de un conjunto de imágenes pequeñas (dígitos de 8×8): reconstrucción con $k = 2, 5, 10, 20$ componentes y su error.
- **P2 (conf. 5-6):** un comprobador de gradientes genérico que usarás en la meta práctica «Gradientes desde cero».
- **P3 (conf. 8-9):** visualiza en 2D el descenso de gradiente con distintos pasos sobre una cuadrática mal condicionada, y compáralo con el momento y Adam.

## Demostraciones para valientes

- Demuestra el teorema de Eckart–Young en norma espectral.
- Demuestra que, para una cuadrática con hessiano $H$ y paso $\eta = 1/\lambda_{\max}$, el error decrece como $(1 - 1/\kappa)^k$, con $\kappa = \lambda_{\max}/\lambda_{\min}$.

## Evaluación

- **Examen sin asistente (60 %):** 6 problemas como los del diagnóstico, más uno nuevo de retropropagación con *softmax* y entropía cruzada.
- **Prácticas P1-P3 (40 %).**
- **Criterio de paso:** 5 de 7 problemas correctos y el comprobador de gradientes funcionando.

## Bibliografía principal

- **Universidad Complutense de Madrid (LibreTexts):**
  - Colmenarejo Allavena, I. y López Herraiz, J., *Las matemáticas de la inteligencia artificial*.
  - Capítulos 3-6 (cálculo multivariante, regla de la cadena, aproximación lineal, gradiente descendiente) y 9-10 (retropropagación y entrenamiento).
  - Es el texto troncal, en español y de acceso abierto.
- **Amat Rodrigo, J.** «Análisis de componentes principales (PCA) con Python», cienciadedatos.net: para la conferencia 4.
- **Jacar.es**, ruta «Entrenamiento y retropropagación»: es una derivación paso a paso en notación matricial, útil como segunda explicación para la conferencia 6.
- **Tus apuntes de Matemática Numérica** (este semestre) para mínimos cuadrados y condicionamiento.

## Referencias

- Colmenarejo Allavena, I. y López Herraiz, J. *Las matemáticas de la inteligencia artificial*. Universidad Complutense de Madrid, LibreTexts. https://math.libretexts.org/Courses/Universidad_Complutense_de_Madrid/Las_matematicas_de_la_inteligencia_artificial
- Amat Rodrigo, J. «Análisis de componentes principales (PCA) con Python». https://www.cienciadedatos.net/documentos/py19-pca-python
- Jacar.es. «Retropropagación, la derivación matemática paso a paso». https://jacar.es/retropropagacion-derivacion-matematica-paso-a-paso/
- Eckart, C. y Young, G. (1936). The approximation of one matrix by another of lower rank. *Psychometrika* 1, 211-218.
