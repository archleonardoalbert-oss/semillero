# Conferencia 3. NumPy II: pensar en vectores

> **Objetivos.** Al terminar esta conferencia serás capaz de:
>
> 1. **Vectorizar** reducciones por eje (`sum`, `mean`, `std`, `argmax`…) y **escribir en una línea** la estandarización por columnas de una matriz, tratando el caso de las columnas constantes.
> 2. **Aplicar** las reglas del *broadcasting* para **predecir** la forma de una operación o **decidir** que dará error.
> 3. **Calcular** la matriz de distancias al cuadrado entre las filas de dos matrices en memoria $O(nm)$ y **justificar** por qué la versión ingenua gasta $O(nmd)$.
> 4. **Estimar** en bytes la memoria de una expresión de NumPy antes de ejecutarla.
> 5. **Usar** `np.linalg` para resolver sistemas, normas y autovalores, y **decidir** por qué `solve` es mejor que `inv`.
> 6. **Escribir** sin bucles los patrones típicos del ML: *softmax* estable, vecino más cercano, similitud del coseno, *top-k* y la matriz de confusión.

> **Prerrequisitos.** La [conferencia 2](c02-ndarray.md): `dtype`, ejes, indexado y `None` para añadir ejes. Álgebra lineal: producto de matrices y producto escalar, la norma euclídea y, para la sección 7, la idea de autovalor y de mínimos cuadrados (los repasarás a fondo en la asignatura de matemáticas del ML).

---

## 1. Motivación: los tres ejercicios que no resolviste

En el diagnóstico quedaron en blanco tres ejercicios de Python numérico. Dos son de esta conferencia:

- **Estandarizar** por columnas una matriz `X` de forma `(n, d)` en una línea.
- **La matriz de distancias** $D_{ij} = \lVert a_i - b_j \rVert^2$ entre las filas de `A` `(n, d)` y de `B` `(m, d)`, sin bucles, y explicar por qué `((A[:, None, :] - B[None, :, :])**2).sum(-1)` gasta mucha más memoria.

No son ejercicios de examen: son las dos operaciones que más se repiten en el ML. La estandarización está antes de casi todo modelo lineal, red neuronal o PCA. Las distancias por pares son el núcleo de los $k$ vecinos, del *clustering*, de la búsqueda semántica de un sistema RAG y, cambiando distancia por producto escalar, de la atención de un transformer.

> **Problema para pensar (10 minutos, antes de leer la sección 4).** Con lo que sabes de la conferencia 2 (ejes de longitud 1 con `None`) y de álgebra lineal, intenta escribir la matriz de distancias sin bucles. Una pista: desarrolla $\lVert a - b\rVert^2$ como un producto escalar. No importa si no llegas: anota hasta dónde llegas y qué te bloquea. Lo retomamos en la sección 4.

---

## 2. Reducciones por eje

### 2.1. Qué significa `axis`

> **Definición 1 (reducción).** Una *reducción* combina los elementos a lo largo de uno o varios ejes en un solo valor por posición del resto: `sum`, `mean`, `std`, `var`, `min`, `max`, `argmin`, `argmax`, `any`, `all`, `prod`, `median`.
>
> **Regla:** `axis=k` significa «**el eje $k$ desaparece**». Si `X` tiene forma `(n, d)`:
> - `X.sum(axis=0)` recorre las filas y deja una suma **por columna**: forma `(d,)`;
> - `X.sum(axis=1)` recorre las columnas y deja una suma **por fila**: forma `(n,)`;
> - `X.sum()` lo reduce todo a un escalar.

La frase «`axis=0` suma por columnas» confunde a todo el mundo. Usa la otra: **`axis=0` hace desaparecer el eje 0**, el de las filas, y quedan las columnas.

```python
X = np.array([[1., 200., 3.],
              [2., 400., 3.],
              [3., 600., 3.],
              [6., 800., 3.]])          # (4, 3): 4 observaciones, 3 variables
X.mean(axis=0)     # [  3. 500.   3.]   la media de cada variable, forma (3,)
X.mean(axis=1)     # [ 68. 135. 202. 269.67]   la media de cada fila, forma (4,)
X.std(axis=0)      # [  1.87 223.61   0.  ]
```

Con varios ejes, desaparecen todos: un lote de imágenes `(N, H, W, C)` con `.mean(axis=(0, 1, 2))` da la media de cada canal, forma `(C,)`. Es lo que se calcula para normalizar imágenes antes de entrenar.

### 2.2. `keepdims`: reducir sin perder el eje

`keepdims=True` deja el eje reducido con longitud 1: `X.sum(axis=0, keepdims=True)` tiene forma `(1, 3)`, no `(3,)`. Parece un detalle; en la sección 3 verás que decide si la operación siguiente funciona.

### 2.3. `argmax` y compañía

`argmax(axis=1)` da, para cada fila, el **índice** del máximo. Es la predicción de un clasificador a partir de una matriz de probabilidades `(n, k)`:

```python
P = np.array([[0.1, 0.7, 0.2],
              [0.6, 0.3, 0.1]])
P.argmax(axis=1)                 # [1 0]: la clase predicha de cada ejemplo
(P.argmax(axis=1) == y).mean()   # la exactitud, si y son las etiquetas verdaderas
```

**Antes de seguir:** `V` tiene forma `(30, 24)`: las ventas de 30 días (filas) en 24 horas (columnas). Escribe: (a) el total de cada día; (b) la hora media de más venta; (c) la hora en que más se vendió cada día; (d) cuántos días hubo alguna hora sin ventas.

:::solucion Respuesta
(a) `V.sum(axis=1)`, forma `(30,)`. (b) `V.mean(axis=0).argmax()`: primero la media por hora (desaparecen los días) y luego el índice de la máxima. (c) `V.argmax(axis=1)`, forma `(30,)`. (d) `(V == 0).any(axis=1).sum()`: por cada día, ¿alguna hora es 0? y después cuántos `True`.
:::

---

## 3. *Broadcasting*: operar arreglos de formas distintas

### 3.1. El problema

Para centrar las columnas de `X` `(4, 3)` hay que restar a cada fila el vector de medias `mu = X.mean(axis=0)`, de forma `(3,)`. Con bucles:

```python
for i in range(n):
    Xc[i] = X[i] - mu
```

En NumPy basta con `X - mu`, y funciona aunque las formas sean `(4, 3)` y `(3,)`. Esa extensión automática de un arreglo a la forma del otro se llama *broadcasting* (difusión).

### 3.2. Las reglas

> **Definición 2 (reglas del *broadcasting*).** Para operar elemento a elemento dos arreglos de formas $s$ y $t$:
> 1. **Alinea las formas por la derecha.** Si una tiene menos ejes, se le añaden ejes de longitud 1 **por la izquierda**.
> 2. **Compara eje a eje.** Dos longitudes son compatibles si son **iguales** o si **una de ellas es 1**.
> 3. Si algún eje es incompatible: `ValueError: operands could not be broadcast together`.
> 4. Si todo es compatible, la forma del resultado tiene en cada eje el **máximo** de las dos longitudes. Un eje de longitud 1 se comporta como si su único valor se repitiera a lo largo de ese eje.

> **Proposición 1 (el *broadcasting* no copia).** Repetir un eje de longitud 1 no crea memoria nueva: NumPy le pone paso (*stride*) 0, de modo que todas las posiciones de ese eje leen el mismo byte. Solo el **resultado** ocupa memoria nueva.
>
> *Demostración.* Por la fórmula de la dirección de la conferencia 2, con $\text{stride}_r = 0$ el índice $i_r$ no cambia la dirección: $\text{inicio} + i_r \cdot 0 + \dots$ Por eso `np.broadcast_to(np.arange(3), (4, 3))` tiene pasos `(0, 8)` y ocupa 24 bytes, no 96. $\blacksquare$

Ejemplos, alineando por la derecha:

| Forma 1 | Forma 2 | Alineadas | Resultado |
|---|---|---|---|
| `(4, 3)` | `(3,)` | `(4, 3)` / `(1, 3)` | `(4, 3)` |
| `(4, 1)` | `(1, 3)` | eje 0: 4 y 1; eje 1: 1 y 3 | `(4, 3)`, una «tabla de sumar» |
| `(2, 1, 5)` | `(3, 1)` | `(2, 1, 5)` / `(1, 3, 1)` | `(2, 3, 5)` |
| `(4, 3)` | `(4,)` | `(4, 3)` / `(1, 4)`: 3 frente a 4 | **error** |
| `(2, 3)` | `(3, 2)` | 2 frente a 3 | **error** |

La cuarta fila es la trampa más frecuente. Si quieres restar a cada **fila** su media (`X.mean(axis=1)`, forma `(4,)`), `X - X.mean(axis=1)` falla, porque `(4,)` se alinea con las **columnas**. Hay dos arreglos equivalentes:

```python
X - X.mean(axis=1, keepdims=True)   # (4, 3) - (4, 1): funciona
X - X.mean(axis=1)[:, None]         # lo mismo, añadiendo el eje a mano
```

Y aquí está el peligro de verdad: si la matriz fuera **cuadrada**, `(4, 4) - (4,)` **no da error**, pero resta la media de cada fila a cada **columna**. Un resultado equivocado y silencioso. Por eso `keepdims=True` es un buen hábito siempre que vayas a operar con lo reducido.

La escena siguiente aplica las cuatro reglas paso a paso. Cambia las formas de `A` y `B` y mira qué ejes se estiran y cuándo la operación falla.

```escena
{"archivo": "escenas/python-cientifico/broadcasting.js", "titulo": "Las reglas del broadcasting, paso a paso", "pie": "Elige las formas de A y B (1 a 4 por eje). Paso 1: las formas; paso 2: se alinean por la derecha y se compara cada eje; paso 3: los ejes de longitud 1 se estiran (sin copiar: paso 0); paso 4: el resultado o el error."}
```

### 3.3. El producto exterior: el patrón `[:, None]` y `[None, :]`

Combinar **cada** elemento de un vector con **cada** elemento de otro es el patrón más útil del *broadcasting*:

```python
u = np.array([1, 2, 3])            # (3,)
v = np.array([10, 20])             # (2,)
u[:, None] + v[None, :]            # (3, 1) + (1, 2) → (3, 2): [[11 21] [12 22] [13 23]]
u[:, None] * v[None, :]            # el producto exterior u vᵀ, como np.outer(u, v)
u[:, None] == np.arange(4)         # (3, 4): la codificación one-hot de u (valores < 4)
```

**Regla mnemotécnica:** el arreglo que pone `None` en el **segundo** eje recorre las filas del resultado, y el que lo pone en el **primero**, las columnas.

**Antes de seguir:** predice la forma de cada operación o di que falla: `(5, 1, 3) + (4, 1)`, `(5, 3) * (5,)`, `(8, 1, 6, 1) * (7, 1, 5)`, `(3,) + (3, 1)`.

:::solucion Respuesta
- `(5, 1, 3) + (4, 1)`: alineadas `(5, 1, 3)` y `(1, 4, 1)` → `(5, 4, 3)`.
- `(5, 3) * (5,)`: `(5, 3)` frente a `(1, 5)`, 3 contra 5 → **error**.
- `(8, 1, 6, 1) * (7, 1, 5)`: `(8, 1, 6, 1)` frente a `(1, 7, 1, 5)` → `(8, 7, 6, 5)`.
- `(3,) + (3, 1)`: `(1, 3)` y `(3, 1)` → `(3, 3)`. Ojo: no es la suma de dos vectores; es una tabla $3 \times 3$. Otra trampa clásica cuando un vector tiene forma `(n,)` y otro `(n, 1)`.
:::

---

## 4. Ejemplo resuelto 1: estandarizar en una línea

> **Ejemplo 1.** Dada `X` de forma `(n, d)`, obtener `Z` con media 0 y desviación típica 1 en cada columna.
>
> **Paso 1 (qué se pide, en fórmulas).** Para cada columna $j$, $\mu_j = \frac{1}{n}\sum_i X_{ij}$ y $\sigma_j = \sqrt{\frac{1}{n}\sum_i (X_{ij} - \mu_j)^2}$. Después, $Z_{ij} = (X_{ij} - \mu_j)/\sigma_j$.
>
> **Paso 2 (qué ejes desaparecen).** $\mu$ y $\sigma$ son «una por columna»: se reduce sobre las filas, `axis=0`. Forma `(d,)`.
>
> **Paso 3 (*broadcasting*).** `X` es `(n, d)` y `mu` es `(d,)`, que se alinea con las columnas: `(n, d) - (1, d)` → `(n, d)`. Es justo lo que queremos, sin `keepdims`.
>
> **Paso 4 (la línea).**
> ```python
> Z = (X - X.mean(axis=0)) / X.std(axis=0)
> ```
>
> **Paso 5 (comprobación).** `np.allclose(Z.mean(axis=0), 0)` y `np.allclose(Z.std(axis=0), 1)`. Comprobar es parte de la solución.

Tres matices que separan una solución de examen de una de producción:

1. **Columnas constantes.** En la `X` de la sección 2, la tercera columna vale siempre 3: $\sigma_3 = 0$ y `Z` sale con `nan` (0/0) y un aviso `RuntimeWarning: invalid value encountered in divide`. Lo habitual (es lo que hace `StandardScaler` de scikit-learn) es dividir entre 1 en esas columnas:

   ```python
   s = X.std(axis=0)
   Z = (X - X.mean(axis=0)) / np.where(s == 0, 1, s)
   ```
2. **`ddof`.** `X.std()` divide entre $n$ (la desviación de la población); `X.std(ddof=1)` divide entre $n-1$ (la cuasidesviación, que verás en Estadística). Para estandarizar da igual mientras seas consistente; con $n$ grande la diferencia es insignificante. Ojo: pandas usa `ddof=1` por defecto y NumPy, `ddof=0`. Por eso `df.std()` y `np.std(df.values)` no coinciden.
3. **Las medias se calculan con los datos de entrenamiento** y se reutilizan para validación y prueba. Si estandarizas todo junto, tu evaluación «ve» la prueba: es una **fuga de datos**, el error del ejercicio de ML del diagnóstico. Lo verás a fondo en ML I. Por eso, en un proyecto real, la estandarización son **dos** funciones: una que *ajusta* (`mu`, `s`) y otra que *aplica*.

> **Ejemplo 1b (parcialmente resuelto; complétalo).** Escalar cada columna al intervalo $[0, 1]$ (*min-max*): $Z_{ij} = (X_{ij} - \min_i X_{ij}) / (\max_i X_{ij} - \min_i X_{ij})$.
> ```python
> mn = X.min(axis=0)          # forma (d,)
> rango = ...                  # completa: forma (d,), sin ceros
> Z = ...
> ```

:::solucion Solución
`rango = X.max(axis=0) - mn`, protegido con `rango = np.where(rango == 0, 1, rango)`, y `Z = (X - mn) / rango`. Las columnas constantes quedan a 0.
:::

---

## 5. Ejemplo resuelto 2: distancias por pares en memoria $O(nm)$

### 5.1. La versión con *broadcasting* y su coste

La traducción directa de $D_{ij} = \sum_k (A_{ik} - B_{jk})^2$ es:

```python
dif = A[:, None, :] - B[None, :, :]      # (n, 1, d) - (1, m, d) → (n, m, d)
D = (dif ** 2).sum(axis=-1)              # (n, m)
```

Es correcta y no tiene bucles, pero **crea un arreglo intermedio de forma `(n, m, d)`**. Y `dif ** 2` crea otro igual. Hagamos las cuentas para un caso realista, la búsqueda de vecinos entre 5000 consultas y 5000 documentos con *embeddings* de dimensión 512, en `float64`:

$$
n\, m\, d \cdot 8 \text{ bytes} = 5000 \cdot 5000 \cdot 512 \cdot 8 = 1{,}024 \cdot 10^{11} \text{ bytes} \approx 102 \text{ GB } (95{,}4 \text{ GiB}).
$$

Ningún portátil lo tiene. El resultado `D`, en cambio, ocupa $5000 \cdot 5000 \cdot 8 = 200$ MB. El desperdicio está en el factor $d = 512$ del intermedio.

### 5.2. El truco: desarrollar el cuadrado

$$
\lVert a_i - b_j \rVert^2 = (a_i - b_j)^\top (a_i - b_j) = \lVert a_i\rVert^2 + \lVert b_j\rVert^2 - 2\, a_i^\top b_j .
$$

Los tres términos se calculan sin el intermedio `(n, m, d)`:

- $\lVert a_i\rVert^2$ para todo $i$: `(A**2).sum(axis=1)`, forma `(n,)`;
- $\lVert b_j\rVert^2$ para todo $j$: `(B**2).sum(axis=1)`, forma `(m,)`;
- $a_i^\top b_j$ para todo par: la matriz $A B^\top$, forma `(n, m)`. ¡Es un producto de matrices!

Y el *broadcasting* los combina:

```python
aa = (A ** 2).sum(axis=1)                     # (n,)
bb = (B ** 2).sum(axis=1)                     # (m,)
D = aa[:, None] + bb[None, :] - 2 * A @ B.T   # (n, 1) + (1, m) - (n, m) → (n, m)
D = np.maximum(D, 0)                          # ver 5.3
```

**Memoria:** `aa` y `bb` son $O(n + m)$; `A @ B.T` y `D`, $O(nm)$. Para el ejemplo, unos 400-600 MB en el pico (dos o tres arreglos de 200 MB), frente a ~200 GB. **Tiempo:** el producto `A @ B.T` lo hace BLAS (la biblioteca optimizada de álgebra lineal a la que llama NumPy), que usa caché, SIMD y varios núcleos. Por eso, además de gastar menos memoria, es varias veces más rápido (figura 1).

![Figura 1. Tiempos medidos. A la izquierda, estandarizar con bucles de Python frente a vectorizado: más de 100 veces. A la derecha, tres versiones de las distancias por pares; el truco del desarrollo del cuadrado gana también en tiempo porque usa el producto de matrices.](figuras/python-cientifico/tiempos-vectorizar.png)

> **Ejercicio de la prueba de entrada, resuelto.** «¿Por qué tu solución gasta mucha menos memoria que `((A[:, None, :] - B[None, :, :])**2).sum(-1)`?» Porque la versión con *broadcasting* materializa el arreglo de diferencias de forma $(n, m, d)$, es decir, $O(nmd)$ memoria, mientras que el desarrollo $\lVert a\rVert^2 + \lVert b\rVert^2 - 2a^\top b$ solo crea arreglos de tamaño $O(n + m)$ y $O(nm)$: la suma sobre $d$ la hace el producto de matrices **sin guardar** los productos parciales.

### 5.3. El precio numérico: la cancelación

El truco resta números grandes casi iguales, y en coma flotante eso pierde precisión (**cancelación catastrófica**). Si los puntos están lejos del origen y cerca entre sí, $\lVert a\rVert^2$ y $2a^\top b$ son enormes y su diferencia es pequeña. Prueba con 200 puntos en dimensión 10 alrededor de $(1000, \dots, 1000)$:

```python
Y = rng.normal(size=(200, 10)) + 1000
nn = (Y ** 2).sum(axis=1)
D = nn[:, None] + nn[None, :] - 2 * Y @ Y.T
np.diag(D).min()        # ≈ -3.7e-09: ¡distancia negativa de un punto a sí mismo!
(D < 0).sum()           # 13 entradas negativas
```

Dos remedios, que conviene aplicar siempre:

1. **`np.maximum(D, 0)`** antes de tomar raíces (si no, `np.sqrt` da `nan`).
2. **Centrar los datos antes** (restar la media de todos los puntos), porque las distancias no cambian al trasladar los puntos y las normas se hacen pequeñas. Con `Y - Y.mean(axis=0)`, la diagonal queda en $\sim 10^{-14}$.

Para la búsqueda de vecinos (`D.argmin(axis=1)`) estos errores no importan; para un algoritmo que necesite distancias exactas pequeñas, sí. `scipy.spatial.distance.cdist` usa la versión exacta, con un bucle en C.

**Antes de seguir:** si los *embeddings* están normalizados ($\lVert a_i\rVert = \lVert b_j\rVert = 1$), ¿a qué se reduce $D$? ¿Qué relación hay entonces entre el vecino más cercano y la máxima similitud del coseno?

:::solucion Respuesta
$D_{ij} = 1 + 1 - 2a_i^\top b_j = 2 - 2\cos\theta_{ij}$. Minimizar la distancia equivale a maximizar el producto escalar, que es la similitud del coseno. Por eso los buscadores semánticos normalizan los vectores y calculan solo `A @ B.T`.
:::

---

## 6. Estimar la memoria antes de ejecutar

La sección anterior deja una técnica general, útil a diario con 6 GB de VRAM:

> **Regla de la memoria.** Un arreglo ocupa `size × itemsize` bytes: `float64` = 8, `float32` = 4, `float16`/`bfloat16` = 2, `int8`/`uint8` = 1. Para estimar una expresión, **escribe la forma de cada intermedio** (cada operación crea uno, salvo las vistas y las operaciones in situ) y suma los que conviven a la vez.

> **Ejemplo 2 (resuelto).** `X` es `float32`, de forma `(100 000, 784)` (MNIST ampliado). ¿Cuánto pico de memoria gasta `Z = (X - X.mean(0)) / X.std(0)`?
>
> 1. `X`: $10^5 \cdot 784 \cdot 4 = 313{,}6$ MB.
> 2. `X.mean(0)` y `X.std(0)`: 784 valores cada uno, despreciables. (Por dentro, `std` crea un temporal del tamaño de `X` mientras calcula: +313,6 MB.)
> 3. `X - mu`: un temporal de 313,6 MB.
> 4. `/ s`: otros 313,6 MB para `Z`; el temporal anterior se libera después.
> 5. **Pico:** unos $3 \times 313{,}6 \approx 940$ MB. Con operaciones in situ (`Z = X - mu; Z /= s`) se ahorra un temporal. Si `X` no se vuelve a usar, `X -= mu; X /= s` no gasta memoria extra.

Herramientas para comprobar: `x.nbytes` (bytes de un arreglo) y `np.shares_memory`. Para las expresiones de PyTorch en la GPU, `torch.cuda.max_memory_allocated()`, que usarás en aprendizaje profundo.

---

## 7. Álgebra lineal con `np.linalg`

| Tarea | Función | Comentario |
|---|---|---|
| Resolver $Ax = b$ | `np.linalg.solve(A, b)` | factorización LU; **no** uses `inv(A) @ b` |
| Mínimos cuadrados $\min_w \lVert Xw - y\rVert$ | `np.linalg.lstsq(X, y, rcond=None)[0]` | por SVD, estable aunque $X^\top X$ esté mal condicionada |
| Normas | `np.linalg.norm(v)`, `norm(X, axis=1)` | por defecto, la euclídea (o la de Frobenius en matrices) |
| Autovalores de una simétrica | `np.linalg.eigh(S)` | ordenados de **menor a mayor**; vectores en las **columnas** |
| SVD | `np.linalg.svd(X, full_matrices=False)` | la verás en matemáticas del ML |
| Determinante, traza, número de condición | `det`, `np.trace`, `cond` | `det` casi nunca hace falta en la práctica |

### 7.1. ¿Por qué `solve` y no `inv`?

Invertir una matriz y multiplicar hace más operaciones y acumula más error de redondeo que resolver directamente. Con matrices bien condicionadas no se nota; con matrices mal condicionadas sí. La matriz de Hilbert $12 \times 12$ ($H_{ij} = 1/(i+j+1)$) tiene número de condición $\approx 1{,}8 \cdot 10^{16}$. Si resolvemos $Hx = H\mathbf{1}$, cuya solución exacta es $x = \mathbf{1}$:

```python
np.abs(np.linalg.solve(H, b) - 1).max()      # ≈ 0.39
np.abs(np.linalg.inv(H) @ b - 1).max()       # ≈ 20.7
```

Ninguna es buena (la matriz es casi singular), pero `inv` es 50 veces peor. La lección práctica: **en ML casi nunca hace falta una inversa**. Donde una fórmula dice $(X^\top X)^{-1} X^\top y$, el código dice `lstsq(X, y)`.

### 7.2. Autovalores de una matriz de covarianza

Es el ejercicio de álgebra lineal del diagnóstico. Para $\Sigma = \begin{pmatrix} 3 & 1 \\ 1 & 3\end{pmatrix}$:

```python
vals, vecs = np.linalg.eigh(np.array([[3., 1.], [1., 3.]]))
vals                 # [2. 4.]   de menor a mayor
vecs[:, -1]          # [0.707 0.707]: dirección de la primera componente principal
vals[-1] / vals.sum()   # 0.667: fracción de varianza que explica
```

La primera componente principal va en la dirección $(1, 1)/\sqrt 2$ y explica $4/(4+2) = 2/3$ de la varianza total. Lo demostrarás en la asignatura de matemáticas del ML; aquí importa leer bien la salida de `eigh`: **columnas**, de **menor a mayor**.

---

## 8. Patrones vectorizados del ML

Cada uno es una línea o dos que aparecerán, tal cual, en asignaturas posteriores.

**1. *Softmax* estable.** $\mathrm{softmax}(z)_k = e^{z_k} / \sum_j e^{z_j}$. Con $z = (1000, 1001, 1002)$, `np.exp(z)` desborda a `inf` y el resultado es `nan`. Como restar una constante no cambia el *softmax* (se cancela arriba y abajo), restamos el máximo de cada fila:

```python
def softmax(Z):                           # Z: (n, k), una fila por ejemplo
    E = np.exp(Z - Z.max(axis=1, keepdims=True))
    return E / E.sum(axis=1, keepdims=True)
softmax(np.array([[1000., 1001., 1002.]]))   # [[0.090 0.245 0.665]]
```

Fíjate en los dos `keepdims=True`: sin ellos, `(n, k) - (n,)` falla, o, peor, funciona mal si $n = k$.

**2. Vecino más cercano.** Con `D` de la sección 5: `D.argmin(axis=1)` da, para cada fila de `A`, el índice de la fila de `B` más cercana.

**3. Similitud del coseno por pares.**

```python
An = A / np.linalg.norm(A, axis=1, keepdims=True)
Bn = B / np.linalg.norm(B, axis=1, keepdims=True)
C = An @ Bn.T                    # (n, m), valores en [-1, 1]
```

**4. *Top-k* sin ordenar todo.** `np.argpartition(v, -k)[-k:]` da los índices de los $k$ mayores en tiempo $O(n)$, sin un orden garantizado; si los quieres ordenados, ordena solo esos $k$: `idx[np.argsort(v[idx])[::-1]]`.

**5. Sumas por grupo con `bincount`.** Si `g` asigna un grupo entero a cada elemento:

```python
g = np.array([0, 2, 1, 0, 2]); val = np.array([1., 2., 3., 4., 5.])
np.bincount(g, weights=val)                  # [5. 3. 7.]   suma por grupo
np.bincount(g, weights=val) / np.bincount(g) # [2.5 3. 3.5] media por grupo
```

Es el `groupby` de NumPy. Para tablas reales usarás pandas ([conferencia 6](c06-agregar.md)).

**6. Matriz de confusión.** Con etiquetas `y` y predicciones `p` en $\{0, \dots, k-1\}$:

```python
M = np.bincount(k * y + p, minlength=k * k).reshape(k, k)   # M[i, j] = cuántos de clase i se predijeron j
```

El truco es codificar cada par $(i, j)$ como un único entero $ki + j$.

**Antes de seguir:** ¿por qué, en el *softmax*, restar el máximo no cambia el resultado? Escribe la igualdad.

:::solucion Respuesta
Para cualquier constante $c$: $\dfrac{e^{z_k - c}}{\sum_j e^{z_j - c}} = \dfrac{e^{-c} e^{z_k}}{e^{-c}\sum_j e^{z_j}} = \dfrac{e^{z_k}}{\sum_j e^{z_j}}$. Con $c = \max_j z_j$, todos los exponentes son $\le 0$, así que $e^{z_k - c} \le 1$ y no hay desbordamiento; al menos un término vale 1, así que el denominador no es 0.
:::

---

## 9. Un apunte sobre la precisión de las sumas

En la conferencia 1 comparamos la GPU con la CPU con tolerancia porque «suman en otro orden». Aquí tienes el porqué. Diez millones de veces 0,1 en `float32`:

```python
x = np.full(10_000_000, 0.1, dtype=np.float32)
x.sum()                  # 1000000.1     — NumPy suma por pares (en árbol): error pequeño
np.cumsum(x)[-1]         # 1087937.0     — suma secuencial: ¡un 9 % de error!
x.sum(dtype=np.float64)  # 1000000.0149  — acumular en float64
```

La suma en coma flotante **no es asociativa**: el orden importa. La suma secuencial acumula un total grande al que se le añaden números pequeños que se pierden por redondeo; la suma por pares suma números de tamaño parecido. Lección: para estadísticas sobre muchos datos en `float32`, acumula en `float64` (`dtype=np.float64`).

---

## 10. Errores típicos y cómo detectarlos

| Error | Síntoma | Detección y arreglo |
|---|---|---|
| Confundir `axis=0` y `axis=1` | forma `(n,)` cuando esperabas `(d,)` | «el eje que pongo desaparece»; `assert` de formas |
| Restar una reducción por filas sin `keepdims` | error, o resultado erróneo si la matriz es cuadrada | `keepdims=True` o `[:, None]` |
| Sumar `(n,)` con `(n, 1)` | aparece una matriz `(n, n)` | revisa las formas; `.ravel()` o `[:, None]` a propósito |
| Intermedio `(n, m, d)` | `MemoryError` o el sistema se congela | estima la memoria (sección 6); desarrolla el cuadrado |
| Dividir entre una desviación nula | `nan` y `RuntimeWarning` | `np.where(s == 0, 1, s)` |
| Distancias negativas con el truco | `nan` al tomar la raíz | `np.maximum(D, 0)`; centra los datos |
| `inv(A) @ b` | resultados imprecisos con matrices mal condicionadas | `solve` o `lstsq` |
| Leer mal `eigh` | usar una fila como autovector o el primero como el mayor | columnas, de menor a mayor |
| *Softmax* con `exp` directo | `inf`, `nan` | restar el máximo por fila |

---

## 11. Ideas que te llevas

- **`axis=k`: el eje $k$ desaparece.** `keepdims=True` lo deja con longitud 1, listo para el *broadcasting*.
- **Broadcasting:** alinea por la derecha; cada eje debe ser igual o 1; el 1 se estira sin copiar.
- **`u[:, None] op v[None, :]`** es el patrón «todos con todos».
- **Estandarizar:** `(X - X.mean(0)) / X.std(0)`, protegiendo las columnas constantes y calculando las medias **solo con el entrenamiento**.
- **Distancias:** $\lVert a\rVert^2 + \lVert b\rVert^2 - 2AB^\top$, en $O(nm)$; después `np.maximum(D, 0)`.
- **Antes de ejecutar algo grande, estima los bytes**: forma × `itemsize`, intermedio por intermedio.
- **`solve`/`lstsq`, nunca `inv`.**

---

## 12. Preguntas de recuperación

1. Escribe de memoria la estandarización por columnas en una línea y la versión que protege las columnas constantes.
2. Enuncia las reglas del *broadcasting* y aplícalas a `(6, 1, 4)` con `(5, 1)`.
3. ¿Por qué `X - X.mean(axis=1)` falla con `X` `(4, 3)` y qué pasa si `X` es `(4, 4)`?
4. Escribe la matriz de distancias al cuadrado en $O(nm)$ y calcula cuántos GB ocupa el intermedio de la versión ingenua con $n = m = 2000$, $d = 768$ en `float32`.
5. ¿Qué devuelve `np.linalg.eigh` y en qué orden?
6. Escribe el *softmax* estable por filas.
7. ¿Por qué `x.sum()` y `np.cumsum(x)[-1]` pueden diferir en `float32`?

:::solucion Respuestas
1. `Z = (X - X.mean(axis=0)) / X.std(axis=0)`; protegida: `s = X.std(0); Z = (X - X.mean(0)) / np.where(s == 0, 1, s)`.
2. Alinear por la derecha (añadiendo unos por la izquierda), cada eje igual o 1, resultado con el máximo. `(6, 1, 4)` y `(1, 5, 1)` → `(6, 5, 4)`.
3. `X.mean(axis=1)` tiene forma `(4,)`, que se alinea con las columnas (3): incompatible. Si `X` es `(4, 4)`, no falla, pero resta la media de la fila $j$ a la columna $j$: un resultado incorrecto y silencioso.
4. `aa[:, None] + bb[None, :] - 2 * A @ B.T`. El intermedio: $2000 \cdot 2000 \cdot 768 \cdot 4 \approx 1{,}23 \cdot 10^{10}$ bytes $\approx 12{,}3$ GB.
5. Los autovalores en orden creciente y una matriz con los autovectores **en las columnas**.
6. `E = np.exp(Z - Z.max(axis=1, keepdims=True)); E / E.sum(axis=1, keepdims=True)`.
7. Porque la suma en coma flotante no es asociativa: `sum` suma por pares y `cumsum`, en secuencia, que acumula más error de redondeo.
:::

---

## 13. Lecturas

- **Guía de usuario de NumPy, «Broadcasting»** (`https://numpy.org/doc/stable/user/basics.broadcasting.html`), en inglés: las reglas con figuras.
- **Documentación de `numpy.linalg`** (`https://numpy.org/doc/stable/reference/routines.linalg.html`), en inglés: qué hace cada función y su orden de salida.
- **Fuentes Pineda, *Curso de aprendizaje automatizado* (PCIC-UNAM, 2026-2)**, en español (`https://github.com/gibranfp/CursoAprendizajeAutomatizado`): clónalo (GitHub te funciona sin VPN) y busca los cuadernos de $k$ vecinos y de regresión lineal: verás estos patrones aplicados.
- **Demostración para valientes 2** de esta asignatura: [la memoria de las distancias, medida en bytes](v02-memoria-distancias.md).
