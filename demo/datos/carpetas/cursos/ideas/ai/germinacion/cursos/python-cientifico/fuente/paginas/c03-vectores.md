---
titulo: NumPy II: pensar en vectores
num: 03
resumen: Reducciones por eje, broadcasting y el coste en memoria de cada expresión. Con ellos, la estandarización y las distancias por pares caben en una línea, y en tu GPU.
horas: ≈ 4 h
metas: ≈ 4 h de estudio | 3 motores interactivos | un problema de fracaso productivo
objetivos: Vectorizar reducciones por eje y la estandarización | Aplicar las reglas del broadcasting | Calcular distancias por pares en memoria O(nm)
---

> **Objetivos.** Al terminar serás capaz de:
>
> 1. **Vectorizar** reducciones por eje y **escribir en una línea** la estandarización por columnas, tratando las columnas constantes.
> 2. **Aplicar** las reglas del *broadcasting* para **predecir** la forma de una operación o **decidir** que dará error.
> 3. **Calcular** la matriz de distancias al cuadrado entre las filas de dos matrices en memoria $O(nm)$ y **justificar** por qué la versión ingenua gasta $O(nmd)$.
> 4. **Estimar** en bytes la memoria de una expresión antes de ejecutarla.
> 5. **Usar** `np.linalg` (sistemas, mínimos cuadrados, autovalores) y **decidir** por qué `solve` es mejor que `inv`.
> 6. **Escribir** sin bucles los patrones del ML: *softmax* estable, vecino más cercano, coseno, *top-k* y matriz de confusión.

> **Prerrequisitos.** La [conferencia 2](c02-ndarray.md): `dtype`, ejes, indexado y `None`. Álgebra lineal: producto de matrices, producto escalar, norma euclídea y, para la sección 7, autovalores y mínimos cuadrados.

## 1. Los dos ejercicios que quedaron en blanco

En el diagnóstico quedaron sin resolver dos ejercicios que son de esta conferencia: **estandarizar** una matriz `X` de forma `(n, d)` por columnas en una línea, y la **matriz de distancias** $D_{ij} = \lVert a_i - b_j\rVert^2$ entre las filas de `A` `(n, d)` y `B` `(m, d)`, explicando por qué `((A[:, None, :] - B[None, :, :])**2).sum(-1)` gasta mucha más memoria que la solución buena.

No son ejercicios de examen: son las dos operaciones que más se repiten en el ML. La estandarización está antes de casi todo modelo lineal, red neuronal o PCA. Las distancias por pares son el núcleo de los $k$ vecinos, del *clustering*, de la búsqueda semántica de un sistema RAG y, cambiando distancia por producto escalar, de la atención de un transformer.

> **Problema para pensar (10 minutos, antes de la sección 5).** Este es un problema de **fracaso productivo**: está pensado para que lo ataques con lo que ya sabes y te atasques en un punto concreto. Escribe la matriz de distancias sin bucles. Pista: con `None` de la conferencia 2 puedes poner `A` como `(n, 1, d)` y `B` como `(1, m, d)`. Cuando lo tengas, calcula cuántos bytes ocupa el intermedio con $n = m = 5000$ y $d = 512$. Si llegas hasta ahí, ya tienes la mitad de la sección 5; la otra mitad es la que hará falta para que tu solución quepa en tu portátil.

## 2. Reducciones por eje

> **Definición 1 (reducción).** Una *reducción* combina los elementos a lo largo de uno o varios ejes: `sum`, `mean`, `std`, `var`, `min`, `max`, `argmin`, `argmax`, `any`, `all`, `median`.
>
> **Regla:** `axis=k` significa «**el eje $k$ desaparece**». Con `X` de forma `(n, d)`, `X.sum(axis=0)` tiene forma `(d,)` (una suma por columna) y `X.sum(axis=1)`, forma `(n,)` (una por fila).

La frase «`axis=0` suma por columnas» confunde a todo el mundo. Usa la otra: **`axis=0` hace desaparecer las filas**, y quedan las columnas.

```python
X = np.array([[1., 200., 3.],
              [2., 400., 3.],
              [3., 600., 3.],
              [6., 800., 3.]])          # 4 observaciones, 3 variables
X.mean(axis=0)     # [  3. 500.   3.]          la media de cada variable, (3,)
X.mean(axis=1)     # [ 68. 135. 202. 269.67]   la media de cada fila, (4,)
X.std(axis=0)      # [  1.87 223.61   0.  ]
```

Con varios ejes desaparecen todos: un lote de imágenes `(N, H, W, C)` con `.mean(axis=(0, 1, 2))` da la media de cada canal. `keepdims=True` deja el eje reducido con longitud 1 (`(1, 3)` en vez de `(3,)`): en la sección 3 verás que eso decide si la operación siguiente funciona.

`argmax(axis=1)` da, para cada fila, el **índice** del máximo: la clase predicha a partir de una matriz de probabilidades `(n, k)`. Y `(P.argmax(axis=1) == y).mean()` es la exactitud.

:::solucion Antes de seguir: `V` es `(30, 24)`, las ventas de 30 días en 24 horas. Escribe el total de cada día, la hora media de más venta, la hora de más venta de cada día y cuántos días hubo alguna hora sin ventas.
`V.sum(axis=1)`; `V.mean(axis=0).argmax()`; `V.argmax(axis=1)`; `(V == 0).any(axis=1).sum()`.
:::

## 3. *Broadcasting*: operar arreglos de formas distintas

Para centrar las columnas de `X` `(4, 3)` hay que restar a cada fila el vector de medias `mu`, de forma `(3,)`. Con bucles sería `for i in range(n): Xc[i] = X[i] - mu`. En NumPy basta `X - mu`, aunque las formas sean distintas. Esa extensión automática se llama *broadcasting*.

> **Definición 2 (reglas del *broadcasting*).** Para operar elemento a elemento dos arreglos de formas $s$ y $t$:
> 1. **Alinea las formas por la derecha.** Al que tenga menos ejes se le añaden ejes de longitud 1 **por la izquierda**.
> 2. **Compara eje a eje.** Dos longitudes son compatibles si son **iguales** o si **una de ellas es 1**.
> 3. Si algún eje es incompatible: `ValueError: operands could not be broadcast together`.
> 4. Si no, el resultado tiene en cada eje el **máximo** de las dos longitudes; un eje de longitud 1 se comporta como si su valor se repitiera.

> **Proposición 1 (el *broadcasting* no copia).** Estirar un eje de longitud 1 no crea memoria: NumPy le pone paso 0, de modo que todas las posiciones de ese eje leen el mismo byte. Solo el **resultado** ocupa memoria nueva.
>
> *Demostración.* Por la fórmula de la dirección de la conferencia 2, con $\text{stride}_r = 0$ el índice $i_r$ no cambia la dirección. Por eso `np.broadcast_to(np.arange(3), (4, 3))` tiene pasos `(0, 8)` y ocupa 24 bytes, no 96. $\blacksquare$

El motor aplica las cuatro reglas paso a paso. Antes de avanzar en cada caso, **predice** el resultado; después cambia las formas. Prueba sobre todo `(4, 3)` con `(4,)`, el caso que más falla en la práctica.

:::widget broadcast Las reglas del broadcasting, paso a paso
{"A": "(3, 1)", "B": "(4,)"}
Orden sugerido: `(3, 1)` con `(4,)` (la «tabla de sumar»); `(4, 3)` con `(3,)` (centrar columnas); `(4, 3)` con `(4,)` (falla); `(4, 4)` con `(4,)` (no falla… y ahí está el peligro).
:::

:::error «Para restar a cada fila su media basta `X - X.mean(axis=1)`»
**Por qué es tentador:** funcionó con las columnas (`X - X.mean(axis=0)`), y parece simétrico. **Por qué falla:** `X.mean(axis=1)` tiene forma `(n,)`, que se alinea por la derecha con las **columnas**. Con `X` `(4, 3)` da `ValueError`. Y con una matriz **cuadrada** `(4, 4)` no da error: resta la media de la fila $j$ a la **columna** $j$, un resultado falso y silencioso. **Lo correcto:** `X - X.mean(axis=1, keepdims=True)` o `X - X.mean(axis=1)[:, None]`. Haz de `keepdims=True` un hábito siempre que vayas a operar con lo reducido.
:::

### El producto exterior: `[:, None]` con `[None, :]`

Combinar **cada** elemento de un vector con **cada** elemento de otro es el patrón más útil del *broadcasting*:

```python
u = np.array([1, 2, 3])            # (3,)
v = np.array([10, 20])             # (2,)
u[:, None] + v[None, :]            # (3, 1) + (1, 2) → (3, 2): [[11 21] [12 22] [13 23]]
u[:, None] * v[None, :]            # el producto exterior u vᵀ
u[:, None] == np.arange(4)         # (3, 4): one-hot de u
```

El arreglo que pone `None` en el **segundo** eje recorre las filas del resultado; el que lo pone en el **primero**, las columnas.

:::widget formas Practica: ¿qué forma tiene a + b?
{"nivel": "broadcast"}
Responde con una tupla, o con «error» si no se puede. Busca diez aciertos seguidos.
:::

## 4. Ejemplo resuelto: estandarizar en una línea

> **Ejemplo 1.** Dada `X` de forma `(n, d)`, obtener `Z` con media 0 y desviación 1 en cada columna.
>
> **Paso 1 (fórmulas).** Para cada columna $j$: $\mu_j = \frac1n\sum_i X_{ij}$, $\sigma_j = \sqrt{\frac1n\sum_i (X_{ij} - \mu_j)^2}$ y $Z_{ij} = (X_{ij} - \mu_j)/\sigma_j$.
>
> **Paso 2 (qué eje desaparece).** $\mu$ y $\sigma$ son «una por columna»: se reduce sobre las filas, `axis=0`. Forma `(d,)`.
>
> **Paso 3 (*broadcasting*).** `(n, d) - (d,)` se alinea como `(n, d) - (1, d)` → `(n, d)`: lo que queremos.
>
> **Paso 4 (la línea).** `Z = (X - X.mean(axis=0)) / X.std(axis=0)`
>
> **Paso 5 (comprobar).** `np.allclose(Z.mean(axis=0), 0)` y `np.allclose(Z.std(axis=0), 1)`. Comprobar es parte de la solución.

Tres matices separan una solución de examen de una de producción:

1. **Columnas constantes.** La tercera columna de la `X` de la sección 2 vale siempre 3: $\sigma_3 = 0$ y `Z` sale con `nan` y un `RuntimeWarning`. Lo habitual (es lo que hace `StandardScaler` de scikit-learn) es dividir entre 1 en esas columnas: `s = X.std(axis=0); Z = (X - X.mean(axis=0)) / np.where(s == 0, 1, s)`.
2. **`ddof`.** NumPy divide entre $n$ por defecto (`ddof=0`); pandas, entre $n - 1$ (`ddof=1`). Por eso `df.std()` y `np.std(df.values)` no coinciden.
3. **Las medias se calculan con los datos de entrenamiento** y se reutilizan para validación y prueba. Si estandarizas todo junto, la evaluación «ve» la prueba: es la **fuga de datos** del ejercicio de ML del diagnóstico. En un proyecto, la estandarización son dos funciones: una que *ajusta* (`mu`, `s`) y otra que *aplica*.

> **Ejemplo 1b (complétalo).** Escalar cada columna a $[0, 1]$: $Z_{ij} = (X_{ij} - \min_i X_{ij}) / (\max_i X_{ij} - \min_i X_{ij})$.
> ```python
> mn = X.min(axis=0)            # (d,)
> rango = ...                    # (d,), sin ceros
> Z = ...
> ```

:::solucion Solución
`rango = X.max(axis=0) - mn`, protegido con `rango = np.where(rango == 0, 1, rango)`, y `Z = (X - mn) / rango`. Las columnas constantes quedan a 0.
:::

## 5. Ejemplo resuelto: distancias por pares en memoria $O(nm)$

### La versión con *broadcasting* y su coste

La traducción directa de $D_{ij} = \sum_k (A_{ik} - B_{jk})^2$ es la que probablemente escribiste en el problema de la sección 1:

```python
dif = A[:, None, :] - B[None, :, :]      # (n, 1, d) - (1, m, d) → (n, m, d)
D = (dif ** 2).sum(axis=-1)              # (n, m)
```

Es correcta y no tiene bucles, pero **crea un intermedio de forma `(n, m, d)`**, y `dif ** 2` crea otro igual mientras el primero sigue vivo. Para 5000 consultas, 5000 documentos y *embeddings* de dimensión 512 en `float64`, un solo intermedio son $5000 \cdot 5000 \cdot 512 \cdot 8 \approx 102$ GB. El resultado `D` ocupa 200 MB: el desperdicio es el factor $d$.

### El truco: desarrollar el cuadrado

$$\lVert a_i - b_j\rVert^2 = (a_i - b_j)^\top(a_i - b_j) = \lVert a_i\rVert^2 + \lVert b_j\rVert^2 - 2\,a_i^\top b_j .$$

Los tres términos se calculan sin el intermedio: $\lVert a_i\rVert^2$ para todo $i$ es `(A**2).sum(axis=1)`, de forma `(n,)`; $\lVert b_j\rVert^2$, `(B**2).sum(axis=1)`, de forma `(m,)`; y todos los $a_i^\top b_j$ a la vez son **un producto de matrices**, $AB^\top$, de forma `(n, m)`.

```python
aa = (A ** 2).sum(axis=1)                     # (n,)
bb = (B ** 2).sum(axis=1)                     # (m,)
D = aa[:, None] + bb[None, :] - 2 * A @ B.T   # (n, 1) + (1, m) - (n, m) → (n, m)
D = np.maximum(D, 0)                          # ver «El precio numérico»
```

El motor compara la memoria máxima de las dos versiones (y de una tercera, por bloques, que demuestras en la [demostración para valientes 2](v02-memoria-distancias.md)) frente a tu GPU y a un portátil corriente. Mueve $d$: la versión del cuadrado ni se inmuta.

:::widget memdist ¿Cabe? Memoria de tres formas de calcular las distancias
Los picos de memoria son los demostrados y medidos con `tracemalloc` en la demostración para valientes 2: $2nmd$ números para la versión con broadcasting, $3nm$ para el desarrollo del cuadrado.
:::

El producto `A @ B.T` lo hace BLAS, la biblioteca optimizada de álgebra lineal a la que llama NumPy, que usa la caché, instrucciones SIMD y varios núcleos. Por eso el truco, además de gastar menos memoria, es más rápido:

![Tiempos medidos con NumPy 2.5 en un portátil. Izquierda: estandarizar con bucles de Python frente a vectorizado, más de 100 veces. Derecha: tres versiones de las distancias por pares; el desarrollo del cuadrado gana también en tiempo porque es un producto de matrices.](img/tiempos-vectorizar.png)

> **Ejercicio del diagnóstico, resuelto.** «¿Por qué tu solución gasta mucha menos memoria?» Porque la versión con *broadcasting* materializa el arreglo de diferencias $(n, m, d)$, es decir, $O(nmd)$ memoria, mientras que el desarrollo $\lVert a\rVert^2 + \lVert b\rVert^2 - 2a^\top b$ solo crea arreglos $O(n + m)$ y $O(nm)$: la suma sobre $d$ ocurre **dentro** del producto de matrices, que acumula cada $a_i^\top b_j$ sin guardar los productos parciales.

### El precio numérico: la cancelación

El truco resta números grandes casi iguales, y en coma flotante eso pierde precisión (**cancelación catastrófica**). Con 200 puntos en dimensión 10 alrededor de $(1000, \dots, 1000)$:

```python
Y = rng.normal(size=(200, 10)) + 1000
nn = (Y ** 2).sum(axis=1)
D = nn[:, None] + nn[None, :] - 2 * Y @ Y.T
np.diag(D).min()        # ≈ -3.7e-09: ¡distancia negativa de un punto a sí mismo!
(D < 0).sum()           # 13 entradas negativas
```

Dos remedios: **`np.maximum(D, 0)`** antes de tomar raíces (si no, `np.sqrt` da `nan`), y **centrar los datos antes**, porque las distancias no cambian al trasladar los puntos y las normas se hacen pequeñas: con `Y - Y.mean(axis=0)`, la diagonal queda en $\sim 10^{-14}$. Para buscar vecinos (`D.argmin(axis=1)`) estos errores no importan; para un algoritmo que necesite distancias pequeñas exactas, sí.

:::autoexplica Si los *embeddings* están normalizados ($\lVert a_i\rVert = \lVert b_j\rVert = 1$), ¿a qué se reduce $D_{ij}$, y qué relación hay entre el vecino más cercano y la mayor similitud del coseno?
---
$D_{ij} = 1 + 1 - 2a_i^\top b_j = 2 - 2\cos\theta_{ij}$. Minimizar la distancia es lo mismo que maximizar el producto escalar, que con vectores unitarios es el coseno. Por eso los buscadores semánticos normalizan una vez y calculan solo `A @ B.T`: es una búsqueda de vecinos sin las normas.
:::

## 6. Estimar la memoria antes de ejecutar

> **Regla de la memoria.** Un arreglo ocupa `size × itemsize` bytes: `float64` 8, `float32` 4, `float16` y `bfloat16` 2, `int8`/`uint8` 1. Para estimar una expresión, escribe la forma de cada intermedio (cada operación crea uno, salvo vistas y operaciones in situ) y suma los que conviven a la vez.

> **Ejemplo 2.** `X` es `float32` de forma `(100 000, 784)`. ¿Cuánto pico gasta `Z = (X - X.mean(0)) / X.std(0)`?
>
> 1. `X`: $10^5 \cdot 784 \cdot 4 = 313{,}6$ MB.
> 2. `X.mean(0)`, `X.std(0)`: 784 valores; despreciables (por dentro, `std` crea un temporal del tamaño de `X`).
> 3. `X - mu`: 313,6 MB. `/ s`: otros 313,6 MB para `Z`.
> 4. **Pico:** unos $3 \times 313{,}6 \approx 940$ MB. Con operaciones in situ (`X -= mu; X /= s`) no hay memoria extra.

Para comprobar: `x.nbytes`, `np.shares_memory` y, en la GPU, `torch.cuda.max_memory_allocated()`, que usarás en aprendizaje profundo. Con 6 GB de VRAM, esta cuenta la harás a diario.

## 7. Álgebra lineal con `np.linalg`

| Tarea | Función | Comentario |
|---|---|---|
| Resolver $Ax = b$ | `np.linalg.solve(A, b)` | **no** uses `inv(A) @ b` |
| Mínimos cuadrados | `np.linalg.lstsq(X, y, rcond=None)[0]` | estable aunque $X^\top X$ esté mal condicionada |
| Normas | `np.linalg.norm(v)`, `norm(X, axis=1)` | euclídea (Frobenius en matrices) |
| Autovalores de una simétrica | `np.linalg.eigh(S)` | de **menor a mayor**; vectores en las **columnas** |
| SVD | `np.linalg.svd(X, full_matrices=False)` | la verás en matemáticas del ML |

### `solve` y no `inv`

Invertir y multiplicar hace más operaciones y acumula más redondeo que resolver. Con la matriz de Hilbert $12\times12$ ($H_{ij} = 1/(i + j + 1)$, número de condición $\approx 1{,}8\cdot10^{16}$), resolviendo $Hx = H\mathbf 1$ cuya solución exacta es $\mathbf 1$:

```python
np.abs(np.linalg.solve(H, b) - 1).max()      # ≈ 0.39
np.abs(np.linalg.inv(H) @ b - 1).max()       # ≈ 20.7
```

Ninguna es buena (la matriz es casi singular), pero `inv` es 50 veces peor. En ML casi nunca hace falta una inversa: donde la fórmula dice $(X^\top X)^{-1}X^\top y$, el código dice `lstsq(X, y)`.

### La covarianza del diagnóstico

Para $\Sigma = \begin{pmatrix} 3 & 1 \\ 1 & 3\end{pmatrix}$:

```python
vals, vecs = np.linalg.eigh(np.array([[3., 1.], [1., 3.]]))
vals                   # [2. 4.]         de menor a mayor
vecs[:, -1]            # [0.707 0.707]   primera componente principal
vals[-1] / vals.sum()  # 0.667           fracción de varianza explicada
```

La primera componente principal va en la dirección $(1, 1)/\sqrt2$ y explica $4/6 = 2/3$ de la varianza. Lo demostrarás en matemáticas del ML; aquí importa leer bien `eigh`: **columnas**, de **menor a mayor**.

## 8. Patrones vectorizados del ML

Cada uno reaparecerá tal cual en asignaturas posteriores.

**1. *Softmax* estable.** Con $z = (1000, 1001, 1002)$, `np.exp(z)` desborda y el resultado es `nan`. Restar una constante a una fila no cambia su *softmax*, así que restamos el máximo:

```python
def softmax(Z):                                 # (n, k)
    E = np.exp(Z - Z.max(axis=1, keepdims=True))
    return E / E.sum(axis=1, keepdims=True)
softmax(np.array([[1000., 1001., 1002.]]))      # [[0.090 0.245 0.665]]
```

**2. Vecino más cercano:** `D.argmin(axis=1)` con la `D` de la sección 5.

**3. Coseno por pares:** normaliza filas (`A / np.linalg.norm(A, axis=1, keepdims=True)`) y multiplica: `An @ Bn.T`.

**4. *Top-k* sin ordenar todo:** `np.argpartition(v, -k)[-k:]`, en $O(n)$; ordena después solo esos $k$.

**5. Sumas por grupo:** si `g` asigna un grupo entero a cada elemento, `np.bincount(g, weights=val)` suma por grupo y dividiendo entre `np.bincount(g)` se obtiene la media. Es el `groupby` de NumPy.

**6. Matriz de confusión:** `np.bincount(k * y + p, minlength=k * k).reshape(k, k)`. El truco: codificar cada par $(i, j)$ como el entero $ki + j$.

:::solucion Antes de seguir: ¿por qué restar el máximo no cambia el *softmax*?
Para cualquier constante $c$: $\dfrac{e^{z_k - c}}{\sum_j e^{z_j - c}} = \dfrac{e^{-c}e^{z_k}}{e^{-c}\sum_j e^{z_j}} = \dfrac{e^{z_k}}{\sum_j e^{z_j}}$. Con $c = \max_j z_j$, todos los exponentes son $\le 0$ (sin desbordamiento) y uno vale exactamente 1 (el denominador no es 0).
:::

## 9. La suma en coma flotante no es asociativa

En la [conferencia 1](c01-entorno.md) comparamos GPU y CPU con tolerancia porque «suman en otro orden». Diez millones de veces 0,1 en `float32`:

```python
x = np.full(10_000_000, 0.1, dtype=np.float32)
x.sum()                  # 1000000.1     — NumPy suma por pares (en árbol)
np.cumsum(x)[-1]         # 1087937.0     — suma secuencial: ¡un 9 % de error!
x.sum(dtype=np.float64)  # 1000000.0149  — acumular en float64
```

La suma secuencial añade números pequeños a un total grande y se pierden por redondeo; la suma por pares suma números de tamaño parecido. Para estadísticas sobre muchos datos en `float32`, acumula en `float64`.

## 10. Errores típicos

| Error | Síntoma | Arreglo |
|---|---|---|
| Confundir `axis=0` y `axis=1` | `(n,)` donde esperabas `(d,)` | «el eje que pongo desaparece»; `assert` |
| Restar una reducción por filas sin `keepdims` | error, o resultado falso si es cuadrada | `keepdims=True` o `[:, None]` |
| Sumar `(n,)` con `(n, 1)` | aparece una matriz `(n, n)` | revisa las formas antes |
| Intermedio `(n, m, d)` | `MemoryError` o el sistema se congela | estima los bytes; desarrolla el cuadrado |
| Dividir entre una desviación nula | `nan` y `RuntimeWarning` | `np.where(s == 0, 1, s)` |
| Distancias negativas con el truco | `nan` al tomar la raíz | `np.maximum(D, 0)`; centra |
| `inv(A) @ b` | imprecisión con matrices mal condicionadas | `solve`, `lstsq` |
| Leer mal `eigh` | autovector equivocado | columnas, de menor a mayor |

:::llevas Ideas que te llevas
- **`axis=k`: el eje $k$ desaparece.** `keepdims=True` lo deja con longitud 1, listo para el *broadcasting*.
- **Broadcasting:** alinea por la derecha; cada eje igual o 1; el 1 se estira sin copiar (paso 0).
- **`u[:, None] op v[None, :]`** es «todos con todos».
- **Estandarizar:** `(X - X.mean(0)) / X.std(0)`, protegiendo las columnas constantes y con medias **de entrenamiento**.
- **Distancias:** $\lVert a\rVert^2 + \lVert b\rVert^2 - 2AB^\top$ en $O(nm)$, y `np.maximum(D, 0)`.
- **Antes de ejecutar algo grande, cuenta bytes.** `solve` y `lstsq`, nunca `inv`.
:::

## 11. Preguntas de recuperación

1. Escribe la estandarización por columnas en una línea y la versión que protege las columnas constantes.
2. Enuncia las reglas del *broadcasting* y aplícalas a `(6, 1, 4)` con `(5, 1)`.
3. ¿Por qué `X - X.mean(axis=1)` falla con `X` `(4, 3)`, y qué pasa si `X` es `(4, 4)`?
4. Escribe la matriz de distancias en $O(nm)$ y calcula los GB del intermedio ingenuo con $n = m = 2000$, $d = 768$, `float32`.
5. ¿Qué devuelve `np.linalg.eigh` y en qué orden?
6. Escribe el *softmax* estable por filas.

:::solucion Respuestas
1. `(X - X.mean(axis=0)) / X.std(axis=0)`; protegida: `s = X.std(0); (X - X.mean(0)) / np.where(s == 0, 1, s)`.
2. Alinear por la derecha añadiendo unos a la izquierda, cada eje igual o 1, resultado con el máximo: `(6, 1, 4)` y `(1, 5, 1)` → `(6, 5, 4)`.
3. `(4,)` se alinea con las 3 columnas: incompatible. Con `(4, 4)` no falla, pero resta la media de la fila $j$ a la columna $j$.
4. `aa[:, None] + bb[None, :] - 2 * A @ B.T`. Intermedio: $2000^2 \cdot 768 \cdot 4 \approx 12{,}3$ GB (y el pico es el doble).
5. Autovalores en orden creciente y autovectores en las **columnas**.
6. `E = np.exp(Z - Z.max(axis=1, keepdims=True)); E / E.sum(axis=1, keepdims=True)`.
:::

## 12. Lecturas

- **NumPy, «Broadcasting»** (`https://numpy.org/doc/stable/user/basics.broadcasting.html`), en inglés: las reglas con figuras.
- **Documentación de `numpy.linalg`** (`https://numpy.org/doc/stable/reference/routines.linalg.html`), en inglés.
- **Fuentes Pineda, *Curso de aprendizaje automatizado* (PCIC-UNAM, 2026-2)**, en español (`https://github.com/gibranfp/CursoAprendizajeAutomatizado`): clónalo (GitHub te funciona sin VPN); los cuadernos de $k$ vecinos y de regresión lineal usan estos patrones.
- **[Demostración para valientes 2](v02-memoria-distancias.md):** la memoria de las distancias, demostrada y medida en bytes.
