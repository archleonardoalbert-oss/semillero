# Conferencia 2. NumPy I: el `ndarray`

> **Objetivos.** Al terminar esta conferencia serás capaz de:
>
> 1. **Predecir** la forma (`shape`) y el tipo (`dtype`) del resultado de una operación de NumPy antes de ejecutarla, incluidas las reglas de promoción de NumPy 2.
> 2. **Explicar** un `ndarray` como «búfer + `dtype` + forma + pasos (*strides*)» y **calcular** los pasos de un arreglo y de sus rebanadas.
> 3. **Distinguir** vistas de copias: **decidir** si una operación comparte memoria con el original y **comprobarlo** con `np.shares_memory`.
> 4. **Usar** el indexado básico, el avanzado (con enteros) y el booleano, y **predecir** la forma que devuelve cada uno.
> 5. **Reorganizar** arreglos con `reshape`, `transpose`, `stack`, `concatenate` y `None` sin perder la pista de los ejes.

> **Prerrequisitos.** Python (listas, rebanadas `lista[a:b:c]`), álgebra lineal (matrices y su producto) y el entorno de la [conferencia 1](c01-entorno.md). No hace falta haber usado NumPy, pero tú lo usaste: esta conferencia va rápido por lo básico y se detiene en lo que suele fallar.

> **Prueba de entrada.** Si resuelves sin ayuda los ejercicios 1, 3 y 4 de la [prueba de entrada de la asignatura](../python-cientifico.md), puedes saltarte esta conferencia y la siguiente e ir a la [práctica 2](p02-vectorizar.md). En el diagnóstico no los resolviste, así que la recomendación es leerla entera.

---

## 1. Motivación: por qué NumPy no es «una lista más rápida»

Empieza con un problema que puedes resolver ahora mismo.

> **Problema para pensar (5 minutos, sin ejecutar nada).**
>
> ```python
> import numpy as np
> a = np.arange(6)          # [0 1 2 3 4 5]
> b = a[::2]
> b[0] = 100
> c = a[[1, 3, 5]]
> c[0] = -1
> print(a)
> ```
>
> ¿Qué imprime? Escribe tu predicción y, sobre todo, el **porqué**. Con listas de Python, `lista[::2]` es una lista nueva, y modificarla no toca la original. ¿Ocurre lo mismo aquí?

Es el ejercicio 4 de la prueba de entrada. La respuesta, `[100 1 2 3 4 5]`, sorprende a casi todo el que viene de las listas: `b` **modificó** `a`, y `c` no. Para entender por qué hay que mirar qué es un `ndarray` por dentro. Ese modelo es también lo que explica por qué NumPy es rápido, por qué a veces gasta memoria sin que te des cuenta y cómo funcionan los tensores de PyTorch, que son la misma idea.

---

## 2. Anatomía de un `ndarray`

> **Definición 1 (arreglo de NumPy).** Un `ndarray` consta de:
> - un **búfer**: un bloque contiguo de bytes en memoria;
> - un **`dtype`**: cómo interpretar cada grupo de bytes (por ejemplo, `int64` = entero de 8 bytes con signo; `float32` = real de 4 bytes);
> - una **forma** (`shape`): una tupla con el tamaño de cada eje; `ndim = len(shape)`;
> - unos **pasos** (`strides`): una tupla con cuántos **bytes** hay que avanzar en el búfer para moverse una posición en cada eje;
> - un **desplazamiento** inicial dentro del búfer.

El elemento de índices $(i_0, i_1, \dots, i_{k-1})$ está en la dirección

$$
\text{dirección} = \text{inicio} + \sum_{r=0}^{k-1} i_r \cdot \text{stride}_r .
$$

Esa fórmula es todo el secreto. Un arreglo de NumPy no es una lista de listas: es una **forma de leer** un búfer plano.

```python
x = np.arange(12).reshape(3, 4)
x.shape, x.ndim, x.size        # (3, 4), 2, 12
x.dtype, x.itemsize, x.nbytes  # int64, 8 (bytes por elemento), 96 (bytes en total)
x.strides                      # (32, 8)
```

¿Por qué `(32, 8)`? Moverse una columna es avanzar un elemento: 8 bytes. Moverse una fila es saltar 4 elementos: $4 \times 8 = 32$ bytes. Es el **orden C** (por filas), el de NumPy por defecto. Existe también el **orden F** (por columnas, el de Fortran y de MATLAB), con pasos `(8, 24)`. La figura 1 muestra los dos.

![Figura 1. La misma matriz 3×4 en orden C y en orden F. Debajo de cada casilla del búfer, su desplazamiento en bytes.](figuras/python-cientifico/orden-memoria.png)

**Antes de seguir:** un arreglo `float32` de forma `(10, 28, 28)` en orden C, ¿qué `strides` tiene? ¿Cuántos bytes ocupa?

:::solucion Respuesta
Cada elemento ocupa 4 bytes. El último eje avanza 4 bytes; el del medio salta 28 elementos, $28 \cdot 4 = 112$; el primero salta $28 \cdot 28 = 784$ elementos, $784 \cdot 4 = 3136$ bytes. `strides = (3136, 112, 4)`. Ocupa $10 \cdot 784 \cdot 4 = 31\,360$ bytes, unos 31 KB.
:::

### 2.1. Por qué esto hace rápido a NumPy

Una lista de Python con un millón de números es un millón de **punteros** a objetos `int` dispersos por la memoria, cada uno con su cabecera (unos 28 bytes por entero pequeño, más 8 del puntero). Sumarlos con un bucle `for` obliga al intérprete, en cada vuelta, a seguir el puntero, comprobar el tipo, pedir el método de suma y crear un objeto nuevo para el resultado.

Un `ndarray` de `int64` son 8 millones de bytes contiguos del **mismo tipo**. `x.sum()` llama a un bucle escrito en C que recorre el búfer sin comprobar tipos, y que el compilador puede vectorizar con instrucciones SIMD del procesador. Lo verás en la [conferencia 3](c03-vectores.md): la diferencia típica es de **50 a 500 veces**.

La consecuencia práctica es una regla de estilo: **en NumPy, un bucle de Python sobre los elementos es casi siempre un error**. La pregunta nunca es «¿cómo recorro el arreglo?», sino «¿qué operación sobre arreglos enteros hace esto?».

---

## 3. Crear arreglos

| Orden | Resultado | `dtype` |
|---|---|---|
| `np.array([1, 2, 3])` | desde una lista | `int64` |
| `np.array([1, 2.5])` | mezcla entero y real | `float64` |
| `np.zeros((2, 3))`, `np.ones(3)`, `np.full((2, 2), 7)` | rellenos | `float64`, `float64`, `int64` |
| `np.empty(5)` | **sin inicializar** (basura) | `float64` |
| `np.arange(0, 1, 0.25)` | `[0, 0.25, 0.5, 0.75]`: el final **no** se incluye | `float64` |
| `np.linspace(0, 1, 5)` | `[0, 0.25, 0.5, 0.75, 1]`: el final **sí** se incluye | `float64` |
| `np.eye(3)` | matriz identidad | `float64` |
| `np.zeros_like(x)` | como `x` (forma y `dtype`), con ceros | el de `x` |

> **Observación 1.** Con pasos reales usa `linspace`, no `arange`. `np.arange(0, 1, 0.1)` puede dar 10 u 11 elementos según cómo redondee el último paso; `np.linspace(0, 1, 11)` da 11 siempre.

---

## 4. El `dtype` y las reglas de promoción

### 4.1. Los tipos que usarás

- **Enteros:** `int8`, `int16`, `int32`, `int64` (con signo) y `uint8`… (sin signo). Las imágenes vienen en `uint8` (0-255).
- **Reales:** `float16`, `float32`, `float64`. NumPy usa `float64` por defecto; **PyTorch usa `float32`** por defecto, y en GPU se entrena en `float16` o `bfloat16`. Esto importará cuando pases arreglos de NumPy a PyTorch.
- **Booleanos:** `bool`. Al sumarlos, `True` cuenta como 1: `np.array([True, True, False]).sum()` es `2`.
- **Texto:** `<U21` (Unicode de hasta 21 caracteres). Para texto, usa pandas o listas de Python, no NumPy.

### 4.2. Promoción: qué `dtype` sale de una operación

Cuando operas dos arreglos de tipos distintos, NumPy elige un tipo común. Desde **NumPy 2** (2024), la regla es la de la propuesta NEP 50:

> **Regla de promoción (NumPy ≥ 2).**
> 1. **Entre arreglos (o escalares de NumPy como `np.float64(1.5)`)**, el resultado es el tipo más pequeño que representa a ambos: `int8 + int16 → int16`, `int64 + float32 → float64`, `float32 + float64 → float64`.
> 2. **Con un número de Python** (`1`, `1.5`), el número de Python es «débil»: **se adapta al tipo del arreglo** si es de la misma clase. `float32 + 1.5 → float32`; `int8 + 1 → int8`.
> 3. Si el número de Python es de una clase «superior» (real con un arreglo de enteros), sube la clase: `int64 + 0.5 → float64`.
> 4. **La división `/` siempre da real:** `np.arange(3) / 2` es `float64`. La división entera es `//`.

Ejemplos (todos comprobados con NumPy 2.5):

```python
a8 = np.array([100, 120], dtype=np.int8)
(a8 + 1).dtype                         # int8   (regla 2)
a8 + a8                                # array([-56, -16], dtype=int8)  ¡desbordamiento silencioso!
(np.ones(2, np.float32) + 1.5).dtype   # float32 (regla 2)
(np.ones(2, np.float32) + np.ones(2)).dtype   # float64 (regla 1)
(np.arange(3) + 0.5).dtype             # float64 (regla 3)
np.array([255], np.uint8) + 1          # array([0], dtype=uint8)   ¡da la vuelta!
```

Dos lecciones duras:

- **Los enteros de NumPy desbordan en silencio** (aritmética modular): $100 + 100$ en `int8` da $200 - 256 = -56$. No hay error, solo un aviso en algunos casos con escalares. Las imágenes `uint8` son la trampa típica: `img * 2` satura mal. **Convierte primero:** `img.astype(np.float32) * 2`.
- **`astype` a entero trunca hacia cero, no redondea:** `np.array([1.7, -1.7]).astype(int)` da `[1, -1]`. Y `np.round` redondea los empates al par más cercano: `np.round([1.5, 2.5, 3.5])` da `[2., 2., 4.]`.

> **Ejemplo 1 (predecir el `dtype`, resuelto).** `x = np.arange(5, dtype=np.int32)`. ¿Qué tipo tiene cada resultado?
>
> 1. `x * 2` → `int32`: el 2 es de Python y es entero, así que se adapta (regla 2).
> 2. `x * np.int64(2)` → `int64`: ahora es un escalar de NumPy con tipo propio (regla 1).
> 3. `x / 2` → `float64`: `/` siempre da real (regla 4).
> 4. `x.mean()` → `float64`: las reducciones que promedian dan real.
> 5. `x > 2` → `bool`: las comparaciones dan booleanos.

### 4.3. Coma flotante: lo mínimo

- `0.1 + 0.2 == 0.3` es `False`: 0,1 no tiene representación binaria exacta. **Compara reales con tolerancia:** `np.isclose(a, b)` elemento a elemento y `np.allclose(a, b)` para todo el arreglo.
- `float32` tiene unos 7 dígitos decimales significativos ($\varepsilon \approx 1{,}2 \cdot 10^{-7}$) y `float64`, unos 16 ($\varepsilon \approx 2{,}2 \cdot 10^{-16}$). En `float32`, $16\,777\,216 + 1 = 16\,777\,216$.
- `NaN` (*not a number*) no es igual a nada, ni a sí mismo: `np.nan == np.nan` es `False`. Usa `np.isnan`. Además se propaga: `np.array([1, np.nan, 3]).mean()` es `nan`; `np.nanmean` lo ignora.

**Antes de seguir:** `img` es una imagen `uint8` de forma `(480, 640, 3)`. Quieres normalizarla a $[0, 1]$. ¿Qué tipo da `img / 255`? ¿Y `img // 255`? ¿Cuál quieres?

:::solucion Respuesta
`img / 255` da `float64` con valores en $[0, 1]$: es lo que quieres (aunque, para PyTorch, mejor `img.astype(np.float32) / 255`, que gasta la mitad de memoria). `img // 255` es división entera en `uint8`: da 0 salvo donde el valor era 255, que da 1. Es una imagen casi negra.
:::

---

## 5. Indexado básico: rebanadas que son vistas

### 5.1. Enteros y rebanadas

Con un entero por eje se selecciona un elemento, y con rebanadas `inicio:fin:paso`, un rango (como en las listas, el `fin` no se incluye y los índices negativos cuentan desde el final):

```python
x = np.arange(12).reshape(3, 4)
# [[ 0  1  2  3]
#  [ 4  5  6  7]
#  [ 8  9 10 11]]
x[1, 2]        # 6
x[1]           # [4 5 6 7]          forma (4,)   — un entero «se come» su eje
x[:, 2]        # [ 2  6 10]         forma (3,)
x[:, 2:3]      # [[2] [6] [10]]     forma (3, 1) — una rebanada conserva el eje
x[0:2, 1:3]    # [[1 2] [5 6]]      forma (2, 2)
x[::2, ::-1]   # filas 0 y 2, columnas al revés: [[3 2 1 0] [11 10 9 8]]
x[-1, -1]      # 11
```

> **Regla de las formas (indexado básico).** Cada **entero** elimina su eje; cada **rebanada** lo conserva con la longitud del rango. `x[:, 2]` tiene forma `(3,)` y `x[:, 2:3]`, forma `(3, 1)`. Es la fuente número uno de errores de forma: elige a propósito.

### 5.2. Las rebanadas son vistas

> **Definición 2 (vista y copia).** Una **vista** es un `ndarray` nuevo (otra forma, otros pasos, otro desplazamiento) que **apunta al mismo búfer** que el original. Una **copia** tiene su propio búfer.

> **Proposición 1.** El indexado básico (enteros y rebanadas) siempre devuelve una vista.
>
> *Demostración.* Una rebanada `inicio:fin:paso` sobre un eje con paso `s` se describe con el mismo búfer: desplazamiento nuevo $= \text{desplazamiento} + \text{inicio} \cdot s$ y paso nuevo $= \text{paso} \cdot s$. Un índice entero $i$ fija el desplazamiento en $i \cdot s$ y elimina el eje. Como el resultado se puede escribir con la fórmula de la dirección sobre el mismo búfer, no hace falta copiar nada. $\blacksquare$

De ahí la respuesta al problema inicial. `b = a[::2]` es una vista con paso $2 \cdot 8 = 16$ bytes sobre el búfer de `a`. Escribir `b[0] = 100` escribe en el byte 0 de ese búfer, que es `a[0]`.

```python
a = np.arange(6)
b = a[::2]
b.strides               # (16,)
np.shares_memory(a, b)  # True
b[0] = 100
a                       # array([100,   1,   2,   3,   4,   5])
```

La escena siguiente lo hace visible. Cambia el `inicio` y el `paso` de la rebanada y mira qué celdas del búfer lee la vista; luego compara con el indexado avanzado.

```escena
{"archivo": "escenas/python-cientifico/vistas-copias.js", "titulo": "Rebanada (vista) frente a indexado avanzado (copia)", "pie": "Mueve inicio y paso: la vista no copia nada, solo cambia el desplazamiento y el paso. Al escribir en ella cambia el búfer original. El indexado con una lista crea un búfer nuevo."}
```

**¿Por qué NumPy elige esto?** Por eficiencia. Con una imagen de 4000 × 3000 píxeles, recortar `img[100:500, 200:800]` es instantáneo y no gasta memoria. Pero tiene un precio: si quieres conservar el original, **copia explícitamente**: `recorte = img[100:500, 200:800].copy()`.

> **Observación 2 (una trampa de memoria).** Una vista mantiene vivo **todo** el búfer original. Si cargas un arreglo de 2 GB, te quedas con `pequeño = grande[:10]` y borras `grande`, los 2 GB siguen en memoria porque `pequeño` los referencia. Con `pequeño = grande[:10].copy()` se liberan.

**Antes de seguir:** `x = np.arange(12).reshape(3, 4)`. ¿Cuáles de estas expresiones comparten memoria con `x`? `x[1]`, `x[:, ::2]`, `x[1:2, :]`, `x + 0`.

:::solucion Respuesta
Las tres primeras son indexado básico: vistas, comparten memoria. `x + 0` es una operación aritmética: crea un arreglo nuevo con su propio búfer, así que no comparte. Compruébalo con `np.shares_memory(x, …)`.
:::

---

## 6. Indexado avanzado: listas y arreglos de enteros

Cuando el índice es una **lista o un arreglo de enteros**, NumPy no puede describir el resultado con un desplazamiento y un paso (los índices pueden repetirse o ir en cualquier orden), así que **copia**.

```python
x[[0, 2]]          # filas 0 y 2: [[0 1 2 3] [8 9 10 11]]       forma (2, 4)
x[:, [3, 0]]       # columnas 3 y 0, en ese orden                 forma (3, 2)
x[[0, 2], [1, 3]]  # ¡pares! (0,1) y (2,3): [1 11]                forma (2,)
x[np.ix_([0, 2], [1, 3])]   # la submatriz filas {0,2} × columnas {1,3}: [[1 3] [9 11]]
```

> **Regla de las formas (indexado avanzado).** Si indexas con arreglos de enteros en varios ejes a la vez, los arreglos se **emparejan** elemento a elemento (con *broadcasting*, que verás en la conferencia 3) y la forma del resultado es la forma común de los índices. `x[[0, 2], [1, 3]]` toma los elementos $(0,1)$ y $(2,3)$, no una submatriz. Para la submatriz usa `np.ix_` o dos pasos: `x[[0, 2]][:, [1, 3]]`.

Tres usos del indexado avanzado que aparecen en todo el curso:

```python
# 1. Una tabla de búsqueda (embeddings): fila i de la tabla para cada token
emb = np.random.default_rng(0).normal(size=(1000, 64))   # 1000 palabras, vectores de 64
tokens = np.array([[3, 17, 5], [8, 8, 2]])               # 2 frases de 3 tokens
emb[tokens].shape                                        # (2, 3, 64)

# 2. Codificación one-hot: fila y_i de la identidad
y = np.array([2, 0, 1, 2])
np.eye(3)[y]          # [[0 0 1] [1 0 0] [0 1 0] [0 0 1]]

# 3. Elegir por fila la probabilidad de la clase correcta (entropía cruzada)
P = np.array([[0.1, 0.7, 0.2],
              [0.5, 0.3, 0.2]])
y = np.array([1, 0])
P[np.arange(2), y]    # [0.7 0.5]  — pares (0, 1) y (1, 0)
```

El tercero es la línea que calcula la pérdida de un clasificador: $-\frac{1}{n}\sum_i \log P_{i, y_i}$ es `-np.log(P[np.arange(n), y]).mean()`.

### 6.1. Asignar con índices avanzados

Asignar **sí** escribe en el original (no hay copia intermedia que se pierda):

```python
a = np.arange(6)
a[[0, 2]] = -1        # a = [-1  1 -1  3  4  5]
```

Pero cuidado con los índices repetidos en operaciones acumulativas:

```python
a = np.arange(6)
a[[0, 0, 0]] += 1     # a[0] vale 1, no 3: se lee una vez, se suma 1 y se escribe tres veces lo mismo
np.add.at(a, [0, 0, 0], 1)   # aquí sí acumula: a[0] pasa de 1 a 4
```

`np.add.at` (y su pariente `np.bincount`) es la forma correcta de acumular en un histograma o de sumar gradientes de tokens repetidos.

**Antes de seguir:** `x` tiene forma `(5, 4)`. ¿Qué forma tienen `x[[1, 3]]`, `x[[1, 3], :2]`, `x[[1, 3], [0, 2]]` y `x[[[1], [3]], [0, 2]]`?

:::solucion Respuesta
- `x[[1, 3]]`: filas 1 y 3 → `(2, 4)`.
- `x[[1, 3], :2]`: filas 1 y 3, columnas 0-1 → `(2, 2)`.
- `x[[1, 3], [0, 2]]`: pares $(1,0)$ y $(3,2)$ → `(2,)`.
- `x[[[1], [3]], [0, 2]]`: el primer índice tiene forma `(2, 1)` y el segundo `(2,)`; se combinan en `(2, 2)` y salen los elementos $(1,0), (1,2), (3,0), (3,2)$. Es lo mismo que `np.ix_([1, 3], [0, 2])`.
:::

---

## 7. Indexado booleano: máscaras

Una **máscara** es un arreglo booleano de la misma forma que el dato (o que uno de sus ejes). Indexar con ella selecciona los elementos donde vale `True`, y el resultado es **siempre una copia 1D** (o con los ejes que no se enmascaran).

```python
x = np.arange(12).reshape(3, 4)
x > 6                    # arreglo bool de forma (3, 4)
x[x > 6]                 # [ 7  8  9 10 11]   forma (5,): se aplana
(x > 6).sum()            # 5: cuántos cumplen
(x > 6).mean()           # 0.4166…: qué fracción cumple
x[(x > 2) & (x < 6)]     # [3 4 5]  — paréntesis obligatorios: & tiene más prioridad que >
```

Tres reglas:

1. **Combina con `&`, `|` y `~`**, nunca con `and`, `or` y `not`. `x > 2 and x < 6` da `ValueError: The truth value of an array with more than one element is ambiguous`, porque `and` pide un único `True` o `False`.
2. **Pon paréntesis** a cada comparación: `(x > 2) & (x < 6)`.
3. **Una máscara sobre un eje** selecciona filas (o columnas) enteras:

```python
filtro = x[:, 0] > 3      # [False  True  True]: filas cuya primera columna supera 3
x[filtro]                 # filas 1 y 2, forma (2, 4)
x[filtro, 1:]             # las mismas filas sin la primera columna, forma (2, 3)
```

### 7.1. Modificar con máscaras y `np.where`

```python
a = np.arange(6)
a[a > 2] = 0                       # asigna en el original: [0 1 2 0 0 0]
m = a[a > 2]; m[:] = 0             # NO toca a: m es una copia
np.where(x > 6, x, -1)             # elige elemento a elemento: x donde True, -1 donde False
np.where(x > 6)                    # con un solo argumento: los índices (filas, columnas) donde es True
np.clip(z, 0, 1)                   # recortar a un rango, sin máscaras
```

La diferencia entre la primera y la segunda línea es sutil y causa errores: `a[mascara] = valor` es una **asignación con índice** (Python llama a `a.__setitem__`, que escribe en `a`); en cambio, `m = a[mascara]` crea una copia, y lo que hagas después con `m` no vuelve a `a`.

> **Ejemplo 2 (limpieza con máscaras, resuelto).** Tienes las temperaturas de un sensor en un arreglo `t` de forma `(n,)`, y el sensor escribe `-999` cuando falla. Quieres: (a) cuántas lecturas fallaron; (b) la media de las válidas; (c) sustituir los fallos por `NaN`.
>
> ```python
> t = np.array([21.5, -999, 23.0, 22.4, -999, 24.1])
> fallo = t == -999                 # máscara: [F T F F T F]
> fallo.sum()                       # (a) 2
> t[~fallo].mean()                  # (b) 22.75: la media solo de las válidas
> t = t.astype(float)               # NaN exige un dtype real (aquí ya lo era)
> t[fallo] = np.nan                 # (c) asignación con máscara: escribe en t
> np.nanmean(t)                     # 22.75 de nuevo, ahora ignorando NaN
> ```
>
> **Por qué cada paso.** Calculamos la máscara **una vez** y la reutilizamos (claridad y eficiencia). En (b), `~fallo` invierte la máscara. En (c), `NaN` es un valor de coma flotante: en un arreglo de enteros, `t[fallo] = np.nan` daría `ValueError`. Por eso conviene comprobar el `dtype` antes.

**Antes de seguir:** `notas` es un arreglo `(n, 3)` con las notas de $n$ alumnos en 3 exámenes. Escribe una expresión para las filas de los alumnos que aprobaron **los tres** (nota ≥ 5) y otra para los que suspendieron **alguno**.

:::solucion Respuesta
`notas[(notas >= 5).all(axis=1)]` y `notas[(notas < 5).any(axis=1)]`. `all(axis=1)` reduce cada fila a un booleano: `True` si todas sus columnas lo son. Las reducciones por eje son el tema de la conferencia 3.
:::

---

## 8. Cambiar la forma: `reshape`, `transpose` y compañía

### 8.1. `reshape`

`reshape` reinterpreta el mismo número de elementos con otra forma, recorriendo los elementos en orden C (el último índice es el que corre más rápido). Un `-1` significa «lo que haga falta».

```python
x = np.arange(12).reshape(3, 4)
x.reshape(4, 3)        # vista
x.reshape(2, -1)       # forma (2, 6)
x.reshape(-1)          # forma (12,): aplanar
x.reshape(5, -1)       # ValueError: 12 no es divisible entre 5
```

> **Proposición 2 (cuándo `reshape` es una vista).** `reshape` devuelve una vista si la forma nueva puede describirse con pasos sobre el mismo búfer; si no, copia. En particular, **reorganizar un arreglo contiguo en orden C siempre da una vista**, y **aplanar uno que no es contiguo (como una traspuesta) obliga a copiar**.
>
> *Idea de la demostración.* Si el arreglo es contiguo en orden C, los elementos están en el búfer en el mismo orden en que `reshape` los recorre; basta con calcular los pasos nuevos de derecha a izquierda (el último eje, `itemsize`; cada eje anterior, el paso siguiente multiplicado por su longitud). Si el arreglo es, por ejemplo, `x.T` (pasos `(8, 32)`), recorrerlo en orden C salta por el búfer de forma irregular: $0, 4, 8, 1, 5, 9, \dots$. Esa secuencia no es una progresión aritmética, así que ningún paso único la describe: hay que copiar. $\blacksquare$

```python
np.shares_memory(x, x.reshape(4, 3))     # True
np.shares_memory(x, x.T.reshape(-1))     # False: copió
x.ravel()        # aplana: vista si puede, copia si no
x.flatten()      # aplana: SIEMPRE copia
```

### 8.2. Traspuestas y permutaciones de ejes

- `x.T` invierte el orden de los ejes. Es una **vista**: solo intercambia los pasos (`(32, 8)` → `(8, 32)`). Por eso cuesta $O(1)$.
- `T.transpose(2, 0, 1)` permuta los ejes en el orden que digas; `np.moveaxis(T, -1, 0)` mueve un eje; `T.swapaxes(0, 2)` intercambia dos.

Caso típico: las imágenes se leen como `(alto, ancho, canales)` y PyTorch las quiere como `(canales, alto, ancho)`:

```python
img = np.zeros((32, 32, 3))
img.transpose(2, 0, 1).shape     # (3, 32, 32)
```

### 8.3. Añadir y quitar ejes de longitud 1

```python
v = np.arange(3)          # (3,)
v[:, None].shape          # (3, 1)  columna — None es lo mismo que np.newaxis
v[None, :].shape          # (1, 3)  fila
np.expand_dims(v, 0)      # (1, 3)
np.squeeze(np.zeros((1, 3, 1))).shape   # (3,): quita todos los ejes de longitud 1
```

Estos ejes de longitud 1 son la herramienta clave del *broadcasting* de la conferencia 3.

### 8.4. Unir arreglos

| Orden | Qué hace | `v` de forma `(3,)` |
|---|---|---|
| `np.concatenate([a, b], axis=k)` | pega a lo largo de un eje **existente** | `np.concatenate([v, v])` → `(6,)` |
| `np.stack([a, b], axis=k)` | crea un eje **nuevo** y apila | `np.stack([v, v])` → `(2, 3)`; con `axis=1` → `(3, 2)` |
| `np.vstack`, `np.hstack`, `np.column_stack` | atajos | `np.column_stack([v, v])` → `(3, 2)` |

> **Ejemplo 3 (lote de imágenes, resuelto).** Tienes una lista de 10 imágenes en color, cada una `(32, 32, 3)`, y quieres: (a) un único arreglo para el modelo, en formato `(lote, canales, alto, ancho)`; (b) cada imagen como un vector para un modelo lineal; (c) el color medio de cada imagen.
>
> 1. `L = np.stack(imagenes)` → `(10, 32, 32, 3)`. Es `stack` y no `concatenate` porque queremos un eje **nuevo**, el del lote.
> 2. (a) `L.transpose(0, 3, 1, 2)` → `(10, 3, 32, 32)`. El lote se queda en su sitio y los canales pasan al segundo puesto.
> 3. (b) `L.reshape(10, -1)` → `(10, 3072)`, porque $32 \cdot 32 \cdot 3 = 3072$. Como `L` es contiguo, es una vista.
> 4. (c) `L.mean(axis=(1, 2))` → `(10, 3)`: se promedia sobre alto y ancho y quedan lote y canal.
>
> En los tres casos **la forma del resultado se puede predecir antes de ejecutar**, y es lo que hay que hacer: escribe la forma esperada en un comentario y compruébala con un `assert`.

**Antes de seguir:** `T` tiene forma `(2, 3, 4)`. Predice las formas de `T.T`, `T.reshape(6, -1)`, `T[..., 0]`, `T[:, None].shape` y `np.stack([T, T], axis=-1)`. (Los puntos suspensivos `...` significan «todos los ejes que falten».)

:::solucion Respuesta
`T.T` → `(4, 3, 2)`. `T.reshape(6, -1)` → `(6, 4)`. `T[..., 0]` → `(2, 3)`. `T[:, None]` → `(2, 1, 3, 4)`. `np.stack([T, T], axis=-1)` → `(2, 3, 4, 2)`.
:::

---

## 9. Operaciones elemento a elemento y producto matricial

- `+ - * / ** // %`, las comparaciones y las funciones universales (`np.exp`, `np.log`, `np.sqrt`, `np.abs`, `np.maximum`…) actúan **elemento a elemento** y crean un arreglo nuevo.
- `*` **no** es el producto matricial. El producto matricial es `@` (o `np.matmul`):

```python
A = np.array([[1, 2], [3, 4]])
A * A      # [[ 1  4] [ 9 16]]    elemento a elemento
A @ A      # [[ 7 10] [15 22]]    producto matricial
```

Las reglas de forma de `@`:

- `(n, k) @ (k, m) → (n, m)`;
- vector por vector, `(k,) @ (k,)`, da un escalar (el producto escalar);
- con más de dos ejes, `@` trata los primeros como **lote**: `(5, 2, 3) @ (3, 4) → (5, 2, 4)`. Así se multiplican lotes de matrices en una línea, y así funciona la atención de los transformers.

Las operaciones **in situ** (`x += 1`, `x *= 2`) escriben en el búfer existente, sin crear un arreglo. Ahorran memoria, pero respetan el `dtype` de `x`: `x = np.arange(3); x += 0.5` da error de conversión (`UFuncTypeError`), porque no puede guardar reales en un búfer de enteros.

---

## 10. Errores típicos y cómo detectarlos

| Error | Síntoma | Detección y arreglo |
|---|---|---|
| Modificar una vista creyendo que es una copia | cambia el original «sin motivo» | `np.shares_memory(a, b)`; usa `.copy()` |
| Modificar una copia creyendo que es una vista | `m = a[mascara]; m[:] = 0` no tiene efecto | asigna directamente: `a[mascara] = 0` |
| `x[:, 2]` cuando querías `x[:, 2:3]` | `(n,)` en vez de `(n, 1)`; luego el *broadcasting* da formas raras | `assert col.shape == (n, 1)` |
| Desbordamiento de enteros | valores negativos o pequeños sin sentido | convierte a `float32`/`int64` antes de operar |
| `and` / `or` con arreglos | `ValueError: truth value… ambiguous` | `&`, `|`, `~` y paréntesis |
| `x[[0, 2], [1, 3]]` creyendo que es una submatriz | forma `(2,)` en vez de `(2, 2)` | `np.ix_` o dos pasos |
| `a[[i, i]] += 1` para acumular | cuenta una sola vez | `np.add.at` o `np.bincount` |
| Comparar reales con `==` | `False` inesperados | `np.isclose`, `np.allclose` |
| `*` en vez de `@` | forma correcta pero resultado erróneo (o error de forma) | piensa en la forma esperada antes de operar |

**Una costumbre que evita la mitad de estos errores:** escribe la forma esperada de cada arreglo en un comentario (`# (n, d)`) y comprueba las importantes con `assert x.shape == (n, d)`.

---

## 11. Ideas que te llevas

- **Un `ndarray` es búfer + `dtype` + forma + pasos.** Casi todo lo raro de NumPy se explica con la fórmula de la dirección.
- **Indexado básico (enteros y rebanadas) → vista. Indexado avanzado (listas o máscaras) → copia.** Asignar con cualquiera de ellos escribe en el original.
- **Un entero elimina su eje; una rebanada lo conserva.**
- **Promoción en NumPy 2:** entre arreglos manda el tipo mayor; los números de Python se adaptan al arreglo. Los enteros desbordan en silencio.
- **`reshape` es una vista si el arreglo es contiguo; `.T` siempre lo es.**
- **Tres patrones del ML con indexado avanzado:** búsqueda de *embeddings* `E[tokens]`, *one-hot* `np.eye(k)[y]` y la probabilidad de la clase correcta `P[np.arange(n), y]`.

---

## 12. Preguntas de recuperación

1. Define `strides` y calcula los de un arreglo `float64` de forma `(4, 5)` en orden C y en orden F.
2. Resuelve el problema inicial sin mirar: `a = np.arange(6); b = a[::2]; b[0] = 100`. ¿Cuánto vale `a`? ¿Y si fuera `a[[0, 2, 4]]`? Justifica con la definición de vista.
3. ¿Qué `dtype` tienen `np.ones(3, np.float32) * 2.0`, `np.ones(3, np.float32) * np.ones(3)` y `np.arange(3) // 2`?
4. ¿Qué forma tiene `x[:, 0]` y qué forma tiene `x[:, :1]` si `x` es `(n, d)`?
5. Escribe en una línea la codificación *one-hot* de un vector de etiquetas `y` con valores en $\{0, \dots, k-1\}$.
6. ¿Por qué `x.T.reshape(-1)` copia y `x.reshape(-1)` no?
7. ¿Qué diferencia hay entre `a[a > 0] = 0` y `m = a[a > 0]; m[:] = 0`?

:::solucion Respuestas
1. El paso de un eje son los bytes que se avanzan en el búfer al moverse una posición en ese eje. En orden C: `(40, 8)` (5 elementos de 8 bytes por fila). En orden F: `(8, 32)` (4 elementos de 8 bytes por columna).
2. `a = [100, 1, 2, 3, 4, 5]`: `a[::2]` es una vista (desplazamiento 0, paso 16 bytes) sobre el búfer de `a`. Con `a[[0, 2, 4]]` es una copia y `a` no cambia: `[0, 1, 2, 3, 4, 5]`.
3. `float32` (el 2.0 de Python se adapta), `float64` (entre arreglos manda el mayor) e `int64` (división entera).
4. `(n,)` y `(n, 1)`.
5. `np.eye(k)[y]` (o `(y[:, None] == np.arange(k)).astype(float)`).
6. `x` es contiguo en orden C, así que recorrerlo en ese orden es avanzar 8 bytes cada vez: una vista con un único paso. `x.T` recorrido en orden C salta por el búfer de forma irregular; ningún paso único lo describe y hay que copiar.
7. La primera asigna en `a` mediante el índice. La segunda crea una copia `m` (indexado booleano) y pone a cero la copia: `a` no cambia.
:::

---

## 13. Lecturas

- **Guía de usuario de NumPy** (`https://numpy.org/doc/stable/user/`), en inglés: las secciones «The N-dimensional array», «Indexing on ndarrays» y «Copies and views». Es la referencia oficial, y en la prueba de dominio podrás consultarla descargada.
- **Data Carpentry, «Análisis y visualización de datos usando Python»** (`https://datacarpentry.github.io/python-ecology-lesson-es/`), en español y con licencia CC BY 4.0: episodio 2, para repasar los tipos y estructuras de Python.
- **NEP 50, «Promotion rules for Python scalars»** (`https://numpy.org/neps/nep-0050-scalar-promotion.html`), en inglés: la regla de promoción de NumPy 2, con todos sus casos.
- **Raschka et al. (2023)**, cap. 2 (opcional, de pago): el perceptrón implementado con NumPy, un buen ejemplo de código vectorizado orientado al ML.
