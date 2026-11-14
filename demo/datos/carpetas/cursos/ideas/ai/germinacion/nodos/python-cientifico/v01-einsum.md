# Demostración para valientes 1. `einsum`: qué calcula exactamente y por qué es el idioma de los transformers

> **Qué se demuestra.** Damos una definición formal de la notación de Einstein que usa `np.einsum` y demostramos que:
> 1. tres firmas concretas calculan el producto matricial, la traza y el producto exterior por lotes;
> 2. **cualquier** `einsum` sin índices repetidos dentro de un operando equivale a «alinear ejes, multiplicar con *broadcasting* y sumar los ejes que no aparecen en la salida» (el teorema que conecta `einsum` con la [conferencia 3](c03-vectores.md));
> 3. el coste en memoria de esa traducción literal es el producto de **todas** las longitudes, y por eso `np.einsum` necesita `optimize=True` para contracciones grandes.
>
> Después implementamos las dos versiones (con bucles y con *broadcasting*), las comparamos con NumPy y escribimos la atención de un transformer en dos líneas.
>
> **Prerrequisitos.** [Conferencias 2](c02-ndarray.md) y [3](c03-vectores.md): ejes, `transpose`, `reshape` con ejes de longitud 1, *broadcasting* y reducciones.

---

## 1. La definición

> **Definición 1 (firma de `einsum`).** Una *firma* es una cadena `"s_1,s_2,…,s_p->t"` donde cada $s_r$ es una palabra de letras, una por eje del operando $r$, y $t$ es una palabra de letras **distintas**, todas presentes en algún $s_r$. Sea $L$ el conjunto de todas las letras. A cada letra $\ell \in L$ se le asocia una longitud $N_\ell$, que debe coincidir en todos los ejes etiquetados con $\ell$ (si no, la firma es inválida).

> **Definición 2 (valor de `einsum`).** Para operandos $T^{(1)}, \dots, T^{(p)}$, el resultado $R$ es el arreglo con un eje por letra de $t$ (en ese orden) dado por
>
> $$R[\,v|_t\,] = \sum_{v|_{L \setminus t}} \ \prod_{r=1}^{p} T^{(r)}[\,v|_{s_r}\,],$$
>
> donde $v : L \to \mathbb N$ es una **asignación** de un índice $v(\ell) \in \{0, \dots, N_\ell - 1\}$ a cada letra, $v|_{s}$ es la tupla de índices de las letras de la palabra $s$, y la suma recorre todas las asignaciones de las letras que **no** están en la salida, con las de la salida fijas.

En palabras: **se multiplica todo con todo según las letras, y se suman las letras que no salen**. Una letra repetida entre dos operandos «empareja» sus ejes; una letra que no sale se suma.

---

## 2. Los tres casos del plan

> **Proposición 1.**
> 1. `"ij,jk->ik"` es el producto matricial: $R = AB$.
> 2. `"ii->"` es la traza: $R = \operatorname{tr} M$.
> 3. `"bi,bj->bij"` es el producto exterior por lotes: $R_b = u_b v_b^\top$ para cada $b$.

*Demostración.* Se aplica la definición 2 en cada caso.

1. $L = \{i, j, k\}$ y $t = ik$, así que se suma sobre $j$: $R_{ik} = \sum_j A_{ij} B_{jk}$, que es la definición del producto de matrices. La validez exige $N_j$ igual en el segundo eje de $A$ y el primero de $B$: la condición de que las matrices sean multiplicables.
2. $L = \{i\}$, $t$ es vacía (la salida es un escalar) y se suma sobre $i$. El operando tiene la palabra $ii$: los dos ejes reciben **el mismo** índice $v(i)$, así que solo se leen los elementos $M_{v(i), v(i)}$. Por tanto $R = \sum_i M_{ii} = \operatorname{tr} M$. (La validez exige que $M$ sea cuadrada.)
3. $L = \{b, i, j\}$ y $t = bij$: no se suma nada (la suma de la definición 2 tiene un solo término). $R_{bij} = U_{bi} V_{bj}$: para cada $b$ fijo, la matriz $(U_{bi} V_{bj})_{ij}$ es $u_b v_b^\top$. $\blacksquare$

**La técnica:** desplegar la definición y reconocer la fórmula conocida. Toda la demostración es aritmética de índices.

---

## 3. El teorema de traducción a *broadcasting*

> **Teorema 1.** Supongamos que ninguna palabra $s_r$ repite una letra. Ordena las letras de $L$ de una forma fija, $\ell_1, \dots, \ell_q$. Para cada operando $T^{(r)}$, sea $\tilde T^{(r)}$ el arreglo de $q$ ejes obtenido así:
> 1. permuta sus ejes para que sus letras queden en el orden fijado (`transpose`);
> 2. inserta un eje de longitud 1 en la posición de cada letra de $L$ que **no** está en $s_r$ (`reshape`).
>
> Entonces
>
> $$R = \operatorname{perm}_t\Big(\, \sum_{\ell \notin t} \ \tilde T^{(1)} \odot \tilde T^{(2)} \odot \cdots \odot \tilde T^{(p)} \Big),$$
>
> donde $\odot$ es el producto elemento a elemento con *broadcasting*, la suma recorre los ejes de las letras que no salen y $\operatorname{perm}_t$ ordena los ejes restantes como en $t$.

*Demostración.* Hay que comprobar tres cosas.

*(a) El producto con broadcasting está bien definido y tiene forma $(N_{\ell_1}, \dots, N_{\ell_q})$.* Todos los $\tilde T^{(r)}$ tienen $q$ ejes. En el eje $k$, $\tilde T^{(r)}$ tiene longitud $N_{\ell_k}$ si $\ell_k \in s_r$ y 1 si no. Por la definición 1, todas las longitudes distintas de 1 en ese eje son iguales a $N_{\ell_k}$, y al menos un operando contiene $\ell_k$ (toda letra de $L$ está en alguna palabra). Por las reglas del *broadcasting* (definición 2 de la conferencia 3), cada eje es compatible y la longitud del resultado es $N_{\ell_k}$.

*(b) Cada entrada del producto es el producto de la definición 2.* Fijemos una asignación $v$, que corresponde a la posición $(v(\ell_1), \dots, v(\ell_q))$ del producto. En un eje donde $\tilde T^{(r)}$ tiene longitud 1, el *broadcasting* lee siempre el índice 0 (proposición 1 de la conferencia 3: paso 0); en un eje de longitud $N_{\ell_k}$, lee $v(\ell_k)$. Como la permutación del paso 1 solo reordena los ejes, la entrada leída de $\tilde T^{(r)}$ es exactamente $T^{(r)}[v|_{s_r}]$. Así que la entrada $v$ del producto vale $\prod_r T^{(r)}[v|_{s_r}]$.

*(c) La suma sobre los ejes de $L \setminus t$ es la suma de la definición 2.* Sumar un arreglo sobre un conjunto de ejes es, para cada posición de los ejes restantes, sumar sobre todas las combinaciones de índices de los ejes sumados. Con (b), eso es $\sum_{v|_{L\setminus t}} \prod_r T^{(r)}[v|_{s_r}]$ con $v|_t$ fijo. Los ejes que quedan son los de $t$, en el orden fijado; $\operatorname{perm}_t$ los pone en el orden de $t$. $\blacksquare$

> **Corolario 1 (letras repetidas dentro de un operando).** Si una palabra repite una letra (como `ii`), se reduce primero al caso del teorema tomando la diagonal de esos dos ejes (`np.diagonal`), que produce un solo eje con esa letra. La diagonal selecciona exactamente las entradas donde los dos índices coinciden, que son las únicas que la definición 2 lee.

> **Corolario 2 (coste en memoria de la traducción literal).** El producto intermedio del teorema tiene $\prod_{\ell \in L} N_\ell$ elementos. Para `"ij,jk->ik"` con $A \in \mathbb R^{n\times d}$ y $B \in \mathbb R^{d\times m}$, son $n\,d\,m$ elementos: **exactamente el intermedio $O(nmd)$ de las distancias ingenuas** de la conferencia 3.

El corolario 2 explica por qué `np.einsum` tiene el parámetro `optimize`. Con `optimize=True`, NumPy no materializa el producto completo: busca un orden de contracción por pares y, cuando una contracción es un producto de matrices, la delega en BLAS (`tensordot`), con memoria $O(\text{entradas} + \text{salida})$. `np.einsum_path(firma, *ops, optimize="optimal")` imprime el plan y su coste.

---

## 4. Implementación y verificación

Dos implementaciones de referencia: la definición 2 al pie de la letra (con bucles, para probar) y el teorema 1 (con *broadcasting*).

```python
import itertools
import numpy as np

def mini_einsum(firma, *operandos):
    """Definición 2: suma de productos sobre todas las asignaciones de índices (lento, de referencia)."""
    entradas, salida = firma.replace(" ", "").split("->")
    entradas = entradas.split(",")
    tam = {}
    for sub, op in zip(entradas, operandos):
        assert len(sub) == op.ndim, f"{sub} no casa con la forma {op.shape}"
        for letra, n in zip(sub, op.shape):
            assert tam.setdefault(letra, n) == n, f"el índice {letra} tiene longitudes distintas"
    letras = sorted(tam)
    R = np.zeros(tuple(tam[l] for l in salida))
    for valores in itertools.product(*(range(tam[l]) for l in letras)):   # todas las asignaciones v
        v = dict(zip(letras, valores))
        prod = 1.0
        for sub, op in zip(entradas, operandos):
            prod *= op[tuple(v[l] for l in sub)]                         # T^(r)[v|s_r]
        R[tuple(v[l] for l in salida)] += prod                           # suma sobre L \ t
    return R

def einsum_broadcast(firma, *operandos):
    """Teorema 1 (con el corolario 1 para letras repetidas)."""
    entradas, salida = firma.replace(" ", "").split("->")
    entradas = entradas.split(",")
    letras = sorted(set("".join(entradas)))
    prod = 1.0
    for sub, op in zip(entradas, operandos):
        while len(set(sub)) < len(sub):                       # corolario 1: diagonales
            l = next(c for c in sub if sub.count(c) > 1)
            i, j = [k for k, c in enumerate(sub) if c == l][:2]
            op = np.diagonal(op, axis1=i, axis2=j)            # el eje de la diagonal va al final
            sub = sub[:i] + sub[i + 1:j] + sub[j + 1:] + l
        orden = sorted(sub)
        op = np.transpose(op, [sub.index(l) for l in orden])                 # paso 1
        forma = [op.shape[orden.index(l)] if l in orden else 1 for l in letras]
        prod = prod * op.reshape(forma)                                       # paso 2 y producto
    ejes = tuple(k for k, l in enumerate(letras) if l not in salida)
    R = prod.sum(axis=ejes)                                                   # suma de L \ t
    restantes = [l for l in letras if l in salida]
    return np.transpose(R, [restantes.index(l) for l in salida])             # perm_t
```

Verificación de los tres casos contra la fórmula conocida y contra `np.einsum` (todas dan `True`, comprobado con NumPy 2.5):

```python
rng = np.random.default_rng(0)
A, B, M = rng.normal(size=(3, 4)), rng.normal(size=(4, 5)), rng.normal(size=(4, 4))
U, V = rng.normal(size=(2, 3)), rng.normal(size=(2, 4))
casos = [("ij,jk->ik", (A, B), A @ B),
         ("ii->", (M,), np.trace(M)),
         ("bi,bj->bij", (U, V), U[:, :, None] * V[:, None, :])]
for firma, ops, ref in casos:
    for f in (mini_einsum, einsum_broadcast, np.einsum):
        assert np.allclose(f(firma, *ops), ref)
```

Fíjate en la lógica de la verificación: `mini_einsum` es la **definición** (lenta pero evidente), y las demás implementaciones se comparan con ella. Es el patrón «la versión rápida da lo mismo que la lenta» de la [conferencia 8](c08-proyecto.md).

---

## 5. Por qué `einsum` es el idioma de los transformers

La atención con varias cabezas trabaja con tensores de cuatro ejes: lote $b$, cabeza $h$, posición $q$ (o $k$) y dimensión $d$. Con $Q \in \mathbb R^{B\times H\times T_q\times d}$ y $K, V \in \mathbb R^{B\times H\times T_k\times d}$:

$$\mathrm{Atención}(Q, K, V) = \mathrm{softmax}\!\Big(\frac{QK^\top}{\sqrt d}\Big)V,$$

donde el producto y la traspuesta actúan sobre los dos últimos ejes, para cada lote y cada cabeza. En `einsum` es literal:

```python
S = np.einsum("bhqd,bhkd->bhqk", Q, K) / np.sqrt(d)    # puntuaciones: se suma d; b y h son lotes
P = np.exp(S - S.max(-1, keepdims=True)); P /= P.sum(-1, keepdims=True)   # softmax estable por fila
O = np.einsum("bhqk,bhkd->bhqd", P, V)                 # salida: se suma k
```

Por la definición 2, la primera línea es $S_{bhqk} = \sum_d Q_{bhqd} K_{bhkd}$: el producto escalar de cada consulta con cada clave, para cada lote y cabeza. Sin `einsum` habría que escribir `Q @ K.swapaxes(-1, -2)` y razonar sobre qué ejes se intercambian; con `einsum`, **las letras documentan el significado de cada eje** y cualquier error de ejes falla de forma ruidosa (longitudes que no casan) en lugar de dar un resultado equivocado. Por eso aparece por todas partes en el código de investigación (PyTorch tiene `torch.einsum` con la misma sintaxis). Lo usarás en la asignatura de Transformers.

---

## 6. Ejercicios

1. Escribe con `einsum`: el producto escalar de dos vectores; la suma de cada fila de una matriz; $\mathrm{diag}(AB)$ sin calcular $AB$ entera; la forma cuadrática $x^\top A x$; el producto de lotes de matrices `(b, n, k) @ (b, k, m)`.
2. Demuestra con la definición 2 que `"ij->ji"` es la traspuesta y que `"ij,ij->"` es $\operatorname{tr}(A^\top B) = \langle A, B\rangle_F$.
3. ¿Cuántos elementos tiene el intermedio del teorema 1 para `"bhqd,bhkd->bhqk"` con $B = 8$, $H = 12$, $T_q = T_k = 512$, $d = 64$? ¿Cuántos tiene la salida? Explica con el corolario 2 por qué `optimize` importa.

:::solucion Soluciones
1. `"i,i->"`; `"ij->i"`; `"ij,ji->i"` (porque $(AB)_{ii} = \sum_j A_{ij}B_{ji}$; coste $O(n^2)$ en vez de $O(n^3)$); `"i,ij,j->"`; `"bnk,bkm->bnm"`.
2. `"ij->ji"`: no hay letras sumadas, así que $R_{ji} = A_{ij}$: la traspuesta. `"ij,ij->"`: se suman $i$ y $j$, $R = \sum_{ij} A_{ij}B_{ij} = \sum_j (A^\top B)_{jj} = \operatorname{tr}(A^\top B)$.
3. El intermedio tiene $8 \cdot 12 \cdot 512 \cdot 512 \cdot 64 \approx 1{,}6 \cdot 10^{9}$ elementos (12,9 GB en `float64`); la salida, $8 \cdot 12 \cdot 512 \cdot 512 \approx 2{,}5 \cdot 10^{7}$ (201 MB). La traducción literal gasta 64 veces más memoria que la salida; con `optimize=True` (o con `@`), la contracción sobre $d$ se hace dentro de BLAS sin materializar el intermedio.
:::
