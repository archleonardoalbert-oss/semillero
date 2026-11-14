# Clase práctica 2. Pensar en vectores (NumPy y aleatoriedad)

> **Conferencias que practica:** [2. El `ndarray`](c02-ndarray.md), [3. Pensar en vectores](c03-vectores.md) y [4. Aleatoriedad reproducible](c04-aleatoriedad.md). Los ejercicios mezclan las tres a propósito: en el examen no te dirán de qué conferencia es cada problema.
>
> **Regla de la práctica.** En los ejercicios 3 a 8 y 11, escribe **primero la versión con bucles** (la más evidente, aunque sea lenta), luego la vectorizada, y comprueba que dan lo mismo con `np.allclose` (o `np.array_equal` si son enteros). Mide la diferencia de tiempo con esta función y apunta el factor:
>
> ```python
> import time
> def mejor(f, *args, rep=3):
>     t = []
>     for _ in range(rep):
>         t0 = time.perf_counter(); f(*args); t.append(time.perf_counter() - t0)
>     return min(t)
> ```
>
> Los factores que aparecen en las soluciones se midieron en un portátil corriente con NumPy 2.5; los tuyos serán otros, pero del mismo orden. Sin asistente de IA.

---

## Ejercicio 1. Predecir formas y tipos (calentamiento)

`x = np.zeros((5, 3), dtype=np.float32)`. Sin ejecutar, da la forma y el `dtype` de:

(a) `x.sum(axis=0)`; (b) `x[:, None, :] - x[None, :, :]`; (c) `x.T @ x`; (d) `x[x[:, 0] > 0]`; (e) `x * 2`; (f) `x * np.ones(3)`; (g) `(x > 0).mean(axis=1)`; (h) `x[[0, 1], [2, 0]]`.

:::pista Concepto
Formas: «el eje de `axis` desaparece», alineación por la derecha del *broadcasting*, reglas del indexado avanzado. Tipos: la regla de promoción de NumPy 2 (los números de Python se adaptan; entre arreglos, manda el mayor).
:::

:::pista Estrategia
Escribe cada forma al lado de cada operando y aplica la regla que toque. Para el `dtype`, pregúntate si el otro operando es un número de Python o un arreglo.
:::

:::pista Arranque
(a) Desaparece el eje 0: `(3,)`, `float32`. (b) `(5, 1, 3) - (1, 5, 3)` → `(5, 5, 3)`, `float32`.
:::

:::pista Desbloqueo
(d) La máscara es toda `False` (los ceros no son > 0): selecciona 0 filas. La forma es `(0, 3)`, no un error. (f) `np.ones(3)` es un **arreglo** `float64`: manda el mayor.
:::

:::solucion Solución modelo
(a) `(3,)`, `float32`. (b) `(5, 5, 3)`, `float32`. (c) `(3, 5) @ (5, 3)` → `(3, 3)`, `float32`. (d) `(0, 3)`, `float32`. (e) `(5, 3)`, `float32` (el 2 de Python se adapta). (f) `(5, 3)`, `float64` (arreglo `float64`). (g) `(5,)`, `float64` (la media de booleanos da real por defecto). (h) pares $(0,2)$ y $(1,0)$: `(2,)`, `float32`.

**Idea reutilizable:** antes de ejecutar, escribe la forma esperada; si la ejecución no coincide, el error está en tu modelo mental, y es el momento de corregirlo.
:::

---

## Ejercicio 2. Vistas y copias

Predice qué imprime cada bloque y justifica con la definición de vista.

```python
# (a)
a = np.arange(10)
b = a[2:8:2]
b *= 10
print(a)

# (b)
a = np.arange(10)
c = a[a % 2 == 0]
c[:] = -1
print(a)

# (c)
M = np.arange(12).reshape(3, 4)
fila = M[1]
M[1, 0] = 99
print(fila)

# (d)
M = np.arange(12).reshape(3, 4)
cols = M[:, [0, 2]]
M[:, 0] = 0
print(cols[:, 0])
```

:::pista Concepto
Indexado básico (enteros y rebanadas) → vista; indexado avanzado (listas, máscaras) → copia. Las operaciones in situ (`*=`) escriben en el búfer.
:::

:::pista Estrategia
Para cada variable, decide si es vista o copia **en el momento de crearla**. Después, sigue qué búfer modifica cada escritura.
:::

:::pista Arranque
(a) `a[2:8:2]` es una rebanada: vista de los elementos 2, 4 y 6. `b *= 10` es in situ: escribe en ese búfer.
:::

:::pista Desbloqueo
(c) y (d) son simétricos: en (c) la vista se crea antes de modificar el original y **ve** el cambio; en (d) la copia se crea antes y **no** lo ve.
:::

:::solucion Solución modelo
(a) `[ 0  1 20  3 40  5 60  7  8  9]`: la vista comparte búfer y `*=` escribe en él.
(b) `[0 1 2 3 4 5 6 7 8 9]`: la máscara crea una copia; escribir en `c` no toca `a`. (Para modificar `a`: `a[a % 2 == 0] = -1`.)
(c) `[99  5  6  7]`: `M[1]` es una vista de la fila 1; ve el cambio posterior.
(d) `[0 4 8]`: `M[:, [0, 2]]` es una copia hecha **antes** de poner la columna a 0.

**Idea reutilizable:** «¿vista o copia?» se decide en la línea donde se crea la variable, no donde se usa.
:::

---

## Ejercicio 3. Estandarización, con columnas constantes

Escribe `estandarizar(X)` vectorizada que devuelva cada columna con media 0 y desviación 1, y que deje a 0 las columnas constantes (sin `nan`). Compárala con una versión con bucles sobre una matriz `(2000, 10)` cuya columna 3 vale siempre 7.

:::pista Concepto
Reducción por eje (`axis=0`) y *broadcasting* de `(n, d)` con `(d,)`. La desviación de una columna constante es 0.
:::

:::pista Estrategia
Calcula `mu` y `s` por columnas, sustituye los ceros de `s` por 1 con `np.where` y opera. La versión con bucles recorre columnas y, dentro, filas.
:::

:::pista Arranque
```python
X = rng.normal(5, 3, (2000, 10)); X[:, 3] = 7
s = X.std(axis=0)                 # forma (10,); s[3] == 0
```
:::

:::pista Desbloqueo
Con `s` sustituido por 1 donde es 0, la columna constante queda $(7 - 7)/1 = 0$. La versión con bucles debe tratar el mismo caso (`if s > 0 else 0.0`) para que la comparación sea justa.
:::

:::solucion Solución modelo
```python
def estandarizar_bucle(X):
    n, d = X.shape
    Z = np.empty_like(X)
    for j in range(d):
        m = sum(X[i, j] for i in range(n)) / n
        s = (sum((X[i, j] - m) ** 2 for i in range(n)) / n) ** 0.5
        for i in range(n):
            Z[i, j] = (X[i, j] - m) / s if s > 0 else 0.0
    return Z

def estandarizar(X):
    s = X.std(axis=0)
    return (X - X.mean(axis=0)) / np.where(s == 0, 1, s)

rng = np.random.default_rng(0)
X = rng.normal(5, 3, (2000, 10)); X[:, 3] = 7
assert np.allclose(estandarizar_bucle(X), estandarizar(X))
```
Factor medido: **≈ 50 veces**. Una sutileza: con datos reales, una columna «casi constante» puede tener una desviación de $10^{-17}$ por redondeo en vez de 0; la comparación robusta es `s < 1e-12` en vez de `s == 0`.

**Idea reutilizable:** las reducciones se hacen sobre el eje que desaparece, y los casos degenerados (divisiones entre 0) se tratan con `np.where` sin salir del estilo vectorizado.
:::

---

## Ejercicio 4. *One-hot* y entropía cruzada

Tienes probabilidades `P` de forma `(n, k)` (cada fila suma 1) y etiquetas `y` de forma `(n,)` con valores en $\{0, \dots, k-1\}$. La entropía cruzada media es $-\frac1n\sum_i \log P_{i, y_i}$.

(a) Calcúlala con un bucle y vectorizada con indexado avanzado. (b) Calcúlala también con la matriz *one-hot* $Y$ como $-\frac1n\sum_{i,c} Y_{ic}\log P_{ic}$. (c) ¿Cuál de las dos vectorizadas gasta menos memoria y por qué?

:::pista Concepto
`P[np.arange(n), y]` empareja la fila $i$ con la columna $y_i$ (indexado avanzado por pares). `np.eye(k)[y]` es la matriz *one-hot*.
:::

:::pista Estrategia
Genera `P` con un *softmax* de números aleatorios y `y` con `rng.integers`. Escribe las tres versiones y compara con `np.isclose`.
:::

:::pista Arranque
```python
rng = np.random.default_rng(0)
n, k = 10_000, 5
L = rng.normal(size=(n, k))
P = np.exp(L) / np.exp(L).sum(axis=1, keepdims=True)
y = rng.integers(0, k, n)
```
:::

:::pista Desbloqueo
(c) La versión *one-hot* construye dos matrices `(n, k)` (la propia $Y$ y el producto $Y \odot \log P$) para usar solo una entrada de cada fila.
:::

:::solucion Solución modelo
```python
def ce_bucle(P, y):
    s = 0.0
    for i in range(len(y)):
        s -= np.log(P[i, y[i]])
    return s / len(y)

ce_indice = -np.log(P[np.arange(n), y]).mean()
Y = np.eye(k)[y]
ce_onehot = -(Y * np.log(P)).sum(axis=1).mean()
assert np.isclose(ce_bucle(P, y), ce_indice) and np.isclose(ce_indice, ce_onehot)
```
Factor del índice frente al bucle: **≈ 50 veces**. (c) La versión con índice gasta $O(n)$ (un vector de $n$ probabilidades); la *one-hot*, $O(nk)$. Con $k = 50\,000$ (el vocabulario de un modelo de lenguaje) la diferencia decide si cabe en memoria. Por eso las bibliotecas de aprendizaje profundo reciben las etiquetas como enteros, no como *one-hot*.

**Idea reutilizable:** `P[np.arange(n), y]` es «la entrada de la columna $y_i$ en cada fila»; aparece en todas las pérdidas de clasificación.
:::

---

## Ejercicio 5. Un clasificador de vecino más cercano

Genera 600 puntos de entrenamiento `B` en el plano alrededor de tres centros, $(0,0)$, $(3,3)$ y $(0,4)$, con su etiqueta `yB` (el índice del centro) y ruido normal estándar; y 200 puntos de prueba `A`, con sus etiquetas `yA`, de la misma forma. Clasifica cada punto de `A` con la etiqueta de su vecino más cercano en `B`: con dos bucles y vectorizado con el desarrollo del cuadrado. Da la exactitud en la prueba.

:::pista Concepto
La matriz de distancias de la conferencia 3, sección 5, seguida de `argmin(axis=1)` y de indexado avanzado en `yB`.
:::

:::pista Estrategia
Para generar los datos: `yB = rng.integers(0, 3, 600)` y `B = centros[yB] + rng.normal(size=(600, 2))` (indexado avanzado: la fila del centro de cada punto). Igual para `A`.
:::

:::pista Arranque
```python
D = (A**2).sum(1)[:, None] + (B**2).sum(1)[None, :] - 2 * A @ B.T   # (200, 600)
```
:::

:::pista Desbloqueo
`D.argmin(axis=1)` da, para cada punto de `A`, el **índice** de su vecino en `B`; la predicción es `yB[ese índice]`. No hace falta `np.maximum(D, 0)` porque `argmin` no toma raíces, y el redondeo no cambia el orden salvo en empates casi exactos.
:::

:::solucion Solución modelo
```python
rng = np.random.default_rng(0)
centros = np.array([[0, 0], [3, 3], [0, 4]])
yB = rng.integers(0, 3, 600); B = centros[yB] + rng.normal(size=(600, 2))
yA = rng.integers(0, 3, 200); A = centros[yA] + rng.normal(size=(200, 2))

def nn_bucle(A, B, yB):
    pred = np.empty(len(A), dtype=yB.dtype)
    for i in range(len(A)):
        mejor_j, mejor_d = -1, np.inf
        for j in range(len(B)):
            d = ((A[i] - B[j]) ** 2).sum()
            if d < mejor_d:
                mejor_d, mejor_j = d, j
        pred[i] = yB[mejor_j]
    return pred

def nn(A, B, yB):
    D = (A**2).sum(1)[:, None] + (B**2).sum(1)[None, :] - 2 * A @ B.T
    return yB[D.argmin(axis=1)]

assert np.array_equal(nn_bucle(A, B, yB), nn(A, B, yB))
(nn(A, B, yB) == yA).mean()     # 0.90
```
Factor: **≈ 170 veces**. Exactitud: 0,90 con esta semilla. Los errores están en la zona donde se solapan las nubes de $(3,3)$ y $(0,4)$, cuya distancia es $\sqrt{10} \approx 3{,}2$ desviaciones.

**Idea reutilizable:** «el más cercano de cada uno» = matriz de distancias + `argmin` por eje + indexado avanzado. Es el $k$-NN que usarás como línea base en ML I.
:::

---

## Ejercicio 6. *Softmax* estable por filas

Escribe `softmax(Z)` para `Z` de forma `(n, k)` que no desborde aunque las entradas sean del orden de $\pm 1000$. Compárala con un bucle sobre filas y comprueba que cada fila suma 1. Usa `Z = rng.normal(size=(2000, 10)) * 50`.

:::pista Concepto
Restar una constante a todas las entradas de una fila no cambia su *softmax*; con el máximo de la fila, todos los exponentes son $\le 0$.
:::

:::pista Estrategia
Máximo por fila con `keepdims=True`, exponencial, suma por fila con `keepdims=True`, división.
:::

:::pista Arranque
`E = np.exp(Z - Z.max(axis=1, keepdims=True))`, forma `(n, k)`.
:::

:::pista Desbloqueo
Sin `keepdims`, `Z.max(axis=1)` tiene forma `(n,)`, que se alinea con las **columnas** (`k`): error si $n \ne k$, y resultado incorrecto y silencioso si $n = k$.
:::

:::solucion Solución modelo
```python
def softmax(Z):
    E = np.exp(Z - Z.max(axis=1, keepdims=True))
    return E / E.sum(axis=1, keepdims=True)

def softmax_bucle(Z):
    R = np.empty_like(Z)
    for i in range(Z.shape[0]):
        m = max(Z[i])
        e = [np.exp(z - m) for z in Z[i]]
        s = sum(e)
        R[i] = [v / s for v in e]
    return R

Z = np.random.default_rng(0).normal(size=(2000, 10)) * 50
assert np.allclose(softmax(Z), softmax_bucle(Z))
assert np.allclose(softmax(Z).sum(axis=1), 1)
```
Factor: **≈ 60 veces**. Prueba también la versión ingenua `np.exp(Z) / np.exp(Z).sum(1, keepdims=True)` con estos datos: aparecen `inf` y `nan` en cuanto alguna entrada supera ~709 (el máximo exponente de `float64`).

**Idea reutilizable:** `keepdims=True` siempre que vayas a operar con una reducción por filas.
:::

---

## Ejercicio 7. Matriz de confusión, precisión y exhaustividad

Con `y` y `p` (etiquetas y predicciones en $\{0,1,2,3\}$, $n = 100\,000$), calcula la matriz de confusión $M_{ij}$ = número de ejemplos de clase $i$ predichos como $j$: con un bucle y con `np.bincount`. Después, sin bucles, la exactitud, la **precisión** de cada clase ($M_{jj}/\sum_i M_{ij}$: de los predichos como $j$, qué fracción lo era) y la **exhaustividad** ($M_{ii}/\sum_j M_{ij}$: de los que eran $i$, qué fracción se detectó).

Datos: `y = rng.integers(0, 4, n)` y `p = np.where(rng.random(n) < 0.7, y, rng.integers(0, 4, n))` (aciertos el 70 % de las veces más los aciertos por azar).

:::pista Concepto
Cada par $(i, j)$ se codifica como el entero $4i + j \in \{0, \dots, 15\}$; contar enteros es `np.bincount`.
:::

:::pista Estrategia
`np.bincount(4 * y + p, minlength=16).reshape(4, 4)`. Después: la diagonal (`np.diag`), sumas por columna (`axis=0`) y por fila (`axis=1`).
:::

:::pista Arranque
El bucle: `M = np.zeros((4, 4), int)` y `for a, b in zip(y, p): M[a, b] += 1`.
:::

:::pista Desbloqueo
`minlength=16` es necesario: si una combinación no aparece nunca (por ejemplo, ninguna clase 3 predicha como 0), `bincount` devolvería menos de 16 cuentas y el `reshape` fallaría.
:::

:::solucion Solución modelo
```python
rng = np.random.default_rng(0)
n, k = 100_000, 4
y = rng.integers(0, k, n)
p = np.where(rng.random(n) < 0.7, y, rng.integers(0, k, n))

M = np.bincount(k * y + p, minlength=k * k).reshape(k, k)
exactitud = np.trace(M) / M.sum()            # ≈ 0.775
precision = np.diag(M) / M.sum(axis=0)       # ≈ [0.772 0.776 0.776 0.774]
exhaustividad = np.diag(M) / M.sum(axis=1)   # ≈ [0.782 0.772 0.773 0.772]
```
Factor frente al bucle: **≈ 200 veces**. La exactitud esperada es $0{,}7 + 0{,}3 \cdot \tfrac14 = 0{,}775$: el 70 % de aciertos «de verdad» más la cuarta parte del 30 % restante, que acierta por azar. Es un pequeño cálculo de probabilidad total, que la simulación confirma.

**Idea reutilizable:** para contar pares (o tríos) de categorías, codifícalos como un único entero y usa `bincount`. Es el `groupby(...).size()` de NumPy.
:::

---

## Ejercicio 8. Media móvil sin bucles

Escribe `media_movil(x, k)` que devuelva las medias de cada ventana de $k$ valores consecutivos de `x` (longitud $n - k + 1$), sin bucles, usando `np.cumsum`. Compárala con un bucle y con `np.lib.stride_tricks.sliding_window_view`. Explica qué problema numérico tiene la versión con `cumsum` cuando los valores son grandes.

:::pista Concepto
Con las sumas acumuladas $C_j = \sum_{i < j} x_i$ (con $C_0 = 0$), la suma de la ventana que empieza en $i$ es $C_{i+k} - C_i$.
:::

:::pista Estrategia
Antepón un 0 a `np.cumsum(x)` para que $C_0 = 0$ y resta dos rebanadas desplazadas $k$ posiciones.
:::

:::pista Arranque
```python
c = np.cumsum(np.concatenate([[0.0], x]))     # longitud n + 1
```
:::

:::pista Desbloqueo
`c[k:] - c[:-k]` tiene longitud $n + 1 - k$: exactamente una suma por ventana. Para el problema numérico, piensa en la cancelación de la conferencia 3: $C_{i+k}$ y $C_i$ son enormes y casi iguales.
:::

:::solucion Solución modelo
```python
def media_movil(x, k):
    c = np.cumsum(np.concatenate([[0.0], x]))
    return (c[k:] - c[:-k]) / k

def media_movil_bucle(x, k):
    return np.array([x[i - k + 1:i + 1].mean() for i in range(k - 1, len(x))])

s = np.random.default_rng(0).poisson(30, 100_000).astype(float)
assert np.allclose(media_movil(s, 7), media_movil_bucle(s, 7))
ventanas = np.lib.stride_tricks.sliding_window_view(s, 7)    # vista (n-6, 7), sin copiar
assert np.allclose(ventanas.mean(axis=1), media_movil(s, 7))
```
Factor frente al bucle: **≈ 600 veces** (el bucle crea 100 000 rebanadas y llama a `mean` en cada una). `sliding_window_view` crea una **vista** con pasos `(8, 8)`: la fila $i$ empieza 8 bytes después de la $i-1$ (es la fórmula de la dirección de la conferencia 2 llevada al límite).

**Problema numérico:** con valores del orden de $10^8$ y un millón de elementos, las sumas acumuladas llegan a $10^{14}$, y restar dos números de ese tamaño pierde unos 2-3 decimales: el error medido fue $\approx 7 \cdot 10^{-3}$, frente a $10^{-9}$ de `sliding_window_view`. Remedio: restar antes la media de `x` (las medias móviles se desplazan en la misma cantidad) o usar `sliding_window_view`. `pandas.Series.rolling` usa un algoritmo que corrige este problema.

**Idea reutilizable:** «suma de una ventana = diferencia de sumas acumuladas» convierte $O(nk)$ en $O(n)$, a cambio de vigilar la cancelación.
:::

---

## Ejercicio 9. Monte Carlo: el problema del cumpleaños

En un grupo de $n$ personas con cumpleaños independientes y uniformes entre 365 días, ¿qué probabilidad hay de que al menos dos compartan cumpleaños? (a) Estímala por simulación para $n = 10, 23, 40$ con 200 000 simulaciones, sin bucles sobre las simulaciones, y da el error típico. (b) Compárala con el valor exacto $1 - \prod_{i=0}^{n-1}\frac{365 - i}{365}$. (c) ¿Cuál es el menor $n$ con probabilidad $\ge 0{,}5$?

:::pista Concepto
Una probabilidad es la media de una indicadora. Hay «coincidencia» si, al ordenar los cumpleaños de un grupo, dos consecutivos son iguales.
:::

:::pista Estrategia
Genera una matriz `(simulaciones, n)` con `rng.integers(0, 365, ...)`, ordena cada fila, mira si alguna diferencia consecutiva es 0, y promedia.
:::

:::pista Arranque
```python
c = rng.integers(0, 365, size=(200_000, n))
c.sort(axis=1)                                # ordena cada fila, in situ
```
:::

:::pista Desbloqueo
`(np.diff(c, axis=1) == 0).any(axis=1)` da un booleano por simulación; su media es la estimación. El error típico es $\sqrt{\hat p(1-\hat p)/N}$, con $N = 200\,000$: unos 0,001.
:::

:::solucion Solución modelo
```python
def p_cumple(n, sims, rng):
    c = rng.integers(0, 365, size=(sims, n))
    c.sort(axis=1)
    return (np.diff(c, axis=1) == 0).any(axis=1).mean()

def p_exacta(n):
    return 1 - np.prod((365 - np.arange(n)) / 365)

rng = np.random.default_rng(1)
for n in (10, 23, 40):
    p = p_cumple(n, 200_000, rng)
    print(n, p, np.sqrt(p * (1 - p) / 200_000), p_exacta(n))
# 10  0.1167  ±0.0007   exacta 0.1169
# 23  0.5084  ±0.0011   exacta 0.5073
# 40  0.8913  ±0.0007   exacta 0.8912
next(n for n in range(1, 100) if p_exacta(n) >= 0.5)     # 23
```
Todas las estimaciones caen a menos de dos errores típicos del valor exacto. Con 23 personas, la probabilidad ya supera el 50 %: la intuición falla porque no cuenta los $\binom{23}{2} = 253$ **pares** posibles.

**Idea reutilizable:** para simular $N$ experimentos, pon las simulaciones en el eje 0 y las repeticiones del experimento en el eje 1; después, una reducción por `axis=1` da un resultado por simulación.
:::

---

## Ejercicio 10. Validación cruzada estratificada y reproducible

Escribe `pliegues_estratificados(y, k, semilla)` que devuelva un arreglo `pliegue` de la longitud de `y` con el número de pliegue ($0, \dots, k-1$) de cada ejemplo, de modo que **cada clase se reparta por igual** entre los pliegues y la misma semilla dé siempre el mismo reparto. Pruébala con `y = [0]*95 + [1]*5 + [2]*20` y $k = 5$: muestra cuántos ejemplos de cada clase caen en cada pliegue.

:::pista Concepto
Estratificar = repartir **cada clase** por separado. Dentro de una clase, barajar y asignar pliegues de forma cíclica (0, 1, …, k−1, 0, 1, …) los reparte de forma equilibrada.
:::

:::pista Estrategia
Un bucle sobre las **clases** (pocas): para cada una, sus índices barajados con el `rng`, y `np.arange(len(idx)) % k` como pliegues. Escribe en `pliegue[idx]`.
:::

:::pista Arranque
```python
rng = np.random.default_rng(semilla)
pliegue = np.empty(len(y), dtype=int)
for c in np.unique(y):
    idx = rng.permutation(np.flatnonzero(y == c))
```
:::

:::pista Desbloqueo
`pliegue[idx] = np.arange(len(idx)) % k` asigna con indexado avanzado: el primer índice barajado va al pliegue 0, el segundo al 1… Para comprobar el reparto: `np.bincount(y[pliegue == i], minlength=3)` para cada $i$.
:::

:::solucion Solución modelo
```python
def pliegues_estratificados(y, k, semilla):
    rng = np.random.default_rng(semilla)
    pliegue = np.empty(len(y), dtype=int)
    for c in np.unique(y):                          # bucle sobre clases, no sobre ejemplos
        idx = rng.permutation(np.flatnonzero(y == c))
        pliegue[idx] = np.arange(len(idx)) % k
    return pliegue

y = np.array([0] * 95 + [1] * 5 + [2] * 20)
f = pliegues_estratificados(y, 5, semilla=0)
[np.bincount(y[f == i], minlength=3).tolist() for i in range(5)]
# [[19, 1, 4], [19, 1, 4], [19, 1, 4], [19, 1, 4], [19, 1, 4]]
assert np.array_equal(f, pliegues_estratificados(y, 5, semilla=0))     # reproducible
```
Con una partición aleatoria sin estratificar, los 5 ejemplos de la clase 1 caerían con frecuencia de forma desigual, y algún pliegue de prueba no tendría **ninguno**: no se podría medir la exhaustividad de esa clase en él. Para usar los pliegues: en la iteración $i$, la prueba es `pliegue == i` y el entrenamiento, `pliegue != i`.

**Idea reutilizable:** «estratificar» es hacer la operación aleatoria dentro de cada clase; el azar se controla con **un** generador creado a partir de la semilla.
:::

---

## Ejercicio 11. Reto: búsqueda semántica *top-k* por bloques

Tienes $n_q$ consultas `Q` y $n_d$ documentos `D` representados como vectores (*embeddings*) de dimensión 32. Escribe `topk_coseno(Q, D, k, bloque)` que devuelva, para cada consulta, los índices y las similitudes del coseno de sus $k$ documentos más parecidos, **ordenados de mayor a menor**, procesando las consultas por bloques para que la memoria sea $O(\text{bloque} \cdot n_d)$. Compárala con una versión con bucles en Python con $n_q = 50$, $n_d = 500$, $k = 5$.

Es el núcleo de la recuperación de un sistema RAG (Proyecto 3), escrito por ti.

:::pista Concepto
Coseno = producto escalar de vectores normalizados (conferencia 3, patrón 3). *Top-k* sin ordenar todo = `np.argpartition` (patrón 4). Bloques: la proposición 3 de la [demostración para valientes 2](v02-memoria-distancias.md).
:::

:::pista Estrategia
Normaliza `D` una vez. Para cada bloque de consultas: normalízalo, calcula `C = q @ Dn.T` (forma `(bloque, n_d)`), toma los $k$ mayores de cada fila con `argpartition` y ordénalos solo a ellos.
:::

:::pista Arranque
```python
idx = np.argpartition(C, -k, axis=1)[:, -k:]       # (bloque, k): los k mayores, sin orden
val = np.take_along_axis(C, idx, axis=1)           # sus similitudes
```
:::

:::pista Desbloqueo
Para ordenar dentro de cada fila: `orden = np.argsort(-val, axis=1)` y aplica la misma permutación a `idx` y a `val` con `np.take_along_axis(…, orden, axis=1)`. `take_along_axis` es el indexado avanzado «por filas» que, en la conferencia 2, escribimos como `P[np.arange(n), y]`, generalizado a varias columnas.
:::

:::solucion Solución modelo
```python
def topk_coseno(Q, D, k, bloque=256):
    Dn = D / np.linalg.norm(D, axis=1, keepdims=True)
    I = np.empty((len(Q), k), dtype=np.int64)
    S = np.empty((len(Q), k))
    for i in range(0, len(Q), bloque):                    # bucle sobre BLOQUES, no sobre consultas
        q = Q[i:i + bloque]
        q = q / np.linalg.norm(q, axis=1, keepdims=True)
        C = q @ Dn.T                                      # (b, n_d): la única matriz grande
        idx = np.argpartition(C, -k, axis=1)[:, -k:]
        val = np.take_along_axis(C, idx, axis=1)
        orden = np.argsort(-val, axis=1)
        I[i:i + bloque] = np.take_along_axis(idx, orden, axis=1)
        S[i:i + bloque] = np.take_along_axis(val, orden, axis=1)
    return I, S

def topk_bucle(Q, D, k):
    res = []
    for q in Q:
        sims = [(q @ d) / (np.linalg.norm(q) * np.linalg.norm(d)) for d in D]
        res.append(sorted(range(len(D)), key=lambda j: -sims[j])[:k])
    return np.array(res)

rng = np.random.default_rng(0)
Q, D = rng.normal(size=(50, 32)), rng.normal(size=(500, 32))
I, S = topk_coseno(Q, D, 5, bloque=16)
assert np.array_equal(I, topk_bucle(Q, D, 5))
assert (np.diff(S, axis=1) <= 0).all()                   # cada fila, de mayor a menor
```
**Coste.** Tiempo: $O(n_q n_d d)$ para los productos (en BLAS) más $O(n_q n_d)$ para `argpartition`, frente a $O(n_q n_d \log n_d)$ si se ordenara todo. Memoria: $O(\text{bloque}\cdot n_d)$ para `C`, en lugar de $O(n_q n_d)$. Con un millón de documentos y 10 000 consultas, la matriz completa ocuparía 80 GB; con bloques de 256, 2 GB. Las bibliotecas de búsqueda vectorial (FAISS) hacen esto mismo, con trucos adicionales.

**Idea reutilizable:** cuando el resultado completo no cabe, **trocea el eje grande** y procesa por bloques; cada bloque es código vectorizado.
:::
