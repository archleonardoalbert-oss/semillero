---
titulo: La memoria de las distancias por pares, en bytes
num: V2
resumen: Picos de memoria demostrados y medidos con tracemalloc para tres formas de calcular distancias, y la extrapolación a n = m = 5000, d = 512.
horas: ≈ 1 h
---

> **Qué se demuestra.** Para $A \in \mathbb R^{n\times d}$ y $B \in \mathbb R^{m\times d}$ en `float64`:
> 1. el pico de memoria de `((A[:, None, :] - B[None, :, :])**2).sum(-1)` es $2\,nmd \cdot 8$ bytes (más la salida), no $nmd \cdot 8$;
> 2. el del desarrollo $\lVert a\rVert^2 + \lVert b\rVert^2 - 2AB^\top$ es $3\,nm \cdot 8$ bytes más términos $O(n+m)$;
> 3. procesar $A$ por bloques de $b$ filas reduce el pico de la versión exacta a $2\,bmd \cdot 8 + nm\cdot 8$, con el mismo resultado.
>
> Lo **medimos** con `tracemalloc` y extrapolamos al caso del plan, $n = m = 5000$, $d = 512$.
>
> **Prerrequisitos.** [Conferencia 3](c03-vectores.md), secciones 5 y 6.

---

## 1. El modelo de memoria

> **Hipótesis (cómo reserva NumPy).** Cada operación aritmética o de reducción que no es in situ reserva un arreglo nuevo para su resultado. Un temporal se libera cuando ya nadie lo referencia; dentro de una expresión, Python lo libera en cuanto la operación siguiente lo ha consumido. Las vistas (`A[:, None, :]`) no reservan datos. Un arreglo de $N$ elementos `float64` ocupa $8N$ bytes.

Con esta hipótesis, el pico de una expresión es el **máximo**, a lo largo de su evaluación, de la suma de los arreglos vivos a la vez. Es un cálculo que se hace leyendo la expresión de dentro afuera.

---

## 2. Versión ingenua

> **Proposición 1.** El pico de `((A[:, None, :] - B[None, :, :])**2).sum(-1)`, sin contar $A$ y $B$, es $2\,nmd\cdot 8$ bytes.

*Demostración.* Se evalúa en tres operaciones:

1. `A[:, None, :]` y `B[None, :, :]` son vistas (indexado básico con `None`): 0 bytes.
2. La resta produce `dif` de forma $(n, m, d)$: $nmd \cdot 8$ bytes vivos.
3. `dif ** 2` produce un arreglo nuevo de la misma forma **mientras `dif` sigue vivo** (es su argumento): en ese momento conviven $2\,nmd\cdot 8$ bytes. Al terminar, `dif` ya no tiene referencias y se libera.
4. `.sum(-1)` reserva la salida $(n, m)$, $nm\cdot 8$ bytes, mientras el cuadrado sigue vivo: $nmd\cdot 8 + nm\cdot 8 < 2\,nmd\cdot 8$ en cuanto $d \ge 2$.

El máximo es el del paso 3. $\blacksquare$

Es el doble de la estimación de la conferencia 3, que contaba un solo intermedio. Con la operación in situ `np.square(dif, out=dif)` se baja a $nmd\cdot 8$.

## 3. Versión con el desarrollo del cuadrado

```python
aa = (A ** 2).sum(1)                     # (n,)
bb = (B ** 2).sum(1)                     # (m,)
D = aa[:, None] + bb[None, :] - 2 * A @ B.T
np.maximum(D, 0, out=D)
```

> **Proposición 2.** El pico, sin contar $A$ y $B$, es $3\,nm\cdot 8$ bytes más $O\big((n+m)d\big)$ bytes de temporales del cálculo de `aa` y `bb`.

*Demostración.* `A ** 2` reserva $nd\cdot 8$ bytes y se libera tras sumarse en `aa` ($n\cdot 8$); igual con $B$. Después, Python evalúa la expresión de izquierda a derecha respetando la precedencia (`*` y `@` tienen la misma y se agrupan por la izquierda, así que `2 * A @ B.T` es `(2 * A) @ B.T`):

1. `aa[:, None] + bb[None, :]`: un temporal $T_1$ de $nm\cdot 8$ bytes;
2. `2 * A`: un temporal de $nd\cdot 8$;
3. `(2 * A) @ B.T` (`B.T` es una vista): $T_2$, de $nm\cdot 8$; el temporal del paso 2 se libera;
4. `T_1 - T_2`: la salida $D$, otros $nm\cdot 8$, con $T_1$ y $T_2$ vivos mientras se calcula.

El máximo se alcanza en el paso 4: $T_1$, $T_2$ y $D$ conviven, $3\,nm\cdot 8$ bytes. El `maximum` con `out=D` es in situ y no reserva nada. $\blacksquare$

El orden de las operaciones importa. Si se escriben in situ (`D = A @ B.T; D *= -2; D += aa[:, None]; D += bb[None, :]`), el pico baja a $nm\cdot 8$, porque las sumas con *broadcasting* sobre `D` no crean temporales de tamaño $nm$. Es un buen ejercicio comprobarlo con `tracemalloc`.

## 4. Por bloques

```python
def por_bloques(A, B, b=128):
    D = np.empty((len(A), len(B)))
    for i in range(0, len(A), b):
        a = A[i:i + b]                                     # vista
        D[i:i + b] = ((a[:, None, :] - B[None, :, :]) ** 2).sum(-1)
    return D
```

> **Proposición 3.** `por_bloques` devuelve lo mismo que la versión ingenua y su pico es $2\,bmd\cdot 8 + nm\cdot 8$ bytes.

*Demostración.* *Igualdad:* la fila $i$ de la salida, $D_{i\cdot} = (\lVert a_i - b_j\rVert^2)_j$, solo depende de $a_i$ y de $B$. Los bloques $A[i:i+b]$ forman una partición de las filas de $A$, y cada iteración escribe exactamente las filas de $D$ de su bloque con la fórmula ingenua. *Memoria:* $D$ se reserva una vez ($nm\cdot 8$) y vive todo el tiempo. Dentro de cada iteración, la proposición 1 con $n \to b' \le b$ da un pico de $2\,b'md\cdot 8 \le 2\,bmd\cdot 8$, y esos temporales se liberan antes de la siguiente iteración. $\blacksquare$

Es la técnica general cuando el truco algebraico no existe o no es estable: **trocear el eje grande** para que el intermedio quepa. Los buscadores de vecinos y la atención eficiente (*FlashAttention*) se basan en ella.

---

## 5. Medición

`tracemalloc` (biblioteca estándar) registra las reservas de memoria de NumPy, así que mide justo lo que predicen las proposiciones:

```python
import tracemalloc

def pico(f, *args):
    tracemalloc.start(); tracemalloc.reset_peak()
    f(*args)
    _, maximo = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return maximo
```

Resultados medidos (NumPy 2.5, `float64`, $n = m$; la columna «bloques» usa $b = 50$):

| $n = m$ | $d$ | ingenua, medida | $2nmd\cdot 8$ | desarrollo, medido | $3nm\cdot 8$ | bloques, medida | $2bmd\cdot 8 + nm\cdot 8$ |
|---|---|---|---|---|---|---|---|
| 250 | 128 | 128,0 MB | 128,0 MB | 1,50 MB | 1,50 MB | 26,1 MB | 26,1 MB |
| 500 | 128 | 512,0 MB | 512,0 MB | 6,01 MB | 6,00 MB | 53,2 MB | 53,2 MB |
| 500 | 256 | 1024,0 MB | 1024,0 MB | 6,01 MB | 6,00 MB | 104,4 MB | 104,4 MB |
| 1000 | 64 | 1024,0 MB | 1024,0 MB | 24,02 MB | 24,00 MB | 59,2 MB | 59,2 MB |

Las predicciones coinciden con la medición hasta el kilobyte (las diferencias son los términos $O(n + m)$). Observa la tercera fila frente a la segunda: duplicar $d$ duplica la memoria de la ingenua y **no cambia** la del desarrollo, porque $d$ no aparece en $3nm\cdot 8$.

## 6. Extrapolación al caso del plan

Con $n = m = 5000$ y $d = 512$:

- **Ingenua:** $2 \cdot 5000^2 \cdot 512 \cdot 8 = 2{,}048 \cdot 10^{11}$ bytes $\approx 204{,}8$ GB ($190{,}7$ GiB). Imposible en un portátil: NumPy lanza `MemoryError` al reservar el primer intermedio (102,4 GB) o el sistema empieza a usar el disco como memoria y se congela.
- **Desarrollo:** $3 \cdot 5000^2 \cdot 8 = 6 \cdot 10^8$ bytes $= 600$ MB; con la versión in situ, 200 MB.
- **Por bloques de 128 filas:** $2 \cdot 128 \cdot 5000 \cdot 512 \cdot 8 + 200$ MB $\approx 5{,}24$ GB $+ 0{,}2$ GB. Cabe en 8 GB de RAM; con bloques de 32 filas, unos 1,5 GB.

**Explicación del resultado, en una frase:** la versión ingenua guarda **todas las diferencias coordenada a coordenada** ($nmd$ números, dos veces) antes de sumarlas; el desarrollo hace la suma sobre $d$ dentro del producto de matrices, que acumula cada $a_i^\top b_j$ en un registro del procesador sin guardar los $d$ productos parciales.

> **Para tu GPU de 6 GB.** Las mismas cuentas valen para PyTorch en la GPU (con 4 bytes por elemento en `float32`). La versión ingenua con $n = m = 5000$ y $d = 512$ pediría 102 GB de VRAM; la del desarrollo, 300 MB. `torch.cdist` usa internamente el desarrollo del cuadrado cuando conviene, por esta razón.
