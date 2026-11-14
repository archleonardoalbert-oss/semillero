---
titulo: Cuándo aplanar un arreglo es una vista
num: V3
resumen: Un criterio exacto, con demostración, para que reshape(-1) no copie, en función de la forma y los pasos.
horas: ≈ 1 h
---

> **Qué se demuestra.** La [conferencia 2](c02-ndarray.md) enunció, con solo la idea de la demostración, que `reshape` da una vista cuando el arreglo es contiguo y que aplanar una traspuesta obliga a copiar. Aquí demostramos un criterio **exacto** (condición necesaria y suficiente) para que `x.reshape(-1)` pueda ser una vista, en función de la forma y los pasos de `x`; lo comprobamos con seis casos, y lo extendemos a las fusiones de ejes de un `reshape` cualquiera.
>
> **Técnica.** Modelamos un arreglo como una función del índice lineal en la dirección de memoria; una vista 1D es una progresión aritmética; se compara la una con la otra evaluando en puntos bien elegidos.
>
> **Prerrequisitos.** [Conferencia 2](c02-ndarray.md), secciones 2, 5 y 8.

---

## 1. El modelo

Sea `x` un arreglo de forma $(s_0, \dots, s_{k-1})$, con pasos $(t_0, \dots, t_{k-1})$ en bytes y desplazamiento inicial $c$. Su número de elementos es $N = \prod_r s_r$.

> **Definición 1 (orden C e índice lineal).** Sea $S_r = \prod_{q > r} s_q$ (con $S_{k-1} = 1$). El **índice lineal** del multiíndice $(i_0, \dots, i_{k-1})$, con $0 \le i_r < s_r$, es
>
> $$L = \sum_{r=0}^{k-1} i_r S_r \in \{0, \dots, N-1\}.$$
>
> Es la posición del elemento cuando se recorre `x` en orden C (el último índice corre más rápido), que es el orden en que `reshape` lee los elementos. La aplicación $(i_0, \dots, i_{k-1}) \mapsto L$ es una biyección (es la escritura de $L$ en la base mixta $(s_0, \dots, s_{k-1})$).

> **Definición 2 (función de dirección).** Para cada $L$, sea $i(L)$ su multiíndice. La **dirección** del elemento $L$-ésimo es
>
> $$o(L) = c + \sum_{r} i_r(L)\, t_r .$$

> **Definición 3 (vista 1D).** `x.reshape(-1)` **puede ser una vista** si existe un arreglo 1D sobre el mismo búfer (desplazamiento $c'$, paso $w$) cuyo elemento $L$ está en la dirección del elemento $L$-ésimo de `x`, es decir, si existen $c'$ y $w$ con
>
> $$o(L) = c' + w\,L \quad \text{para todo } L \in \{0, \dots, N-1\}.$$

Un arreglo 1D de NumPy solo puede describir progresiones aritméticas de direcciones (su fórmula de dirección tiene un único paso). Así que la definición 3 es exactamente la condición de que NumPy pueda devolver una vista.

---

## 2. Los ejes de longitud 1 no cuentan

> **Lema 1.** Si $s_r = 1$, eliminar el eje $r$ (de la forma y de los pasos) no cambia $o(L)$ para ningún $L$.

*Demostración.* Si $s_r = 1$, el índice $i_r$ vale siempre 0, así que el término $i_r t_r$ es nulo para cualquier $t_r$. Además $S_q$ no cambia para ningún $q \ne r$ (multiplicar o no por $s_r = 1$ da lo mismo), así que el multiíndice de los ejes restantes que corresponde a cada $L$ es el mismo. $\blacksquare$

Por eso, en lo que sigue, suponemos que **todos los ejes tienen longitud mayor que 1** (si no hay ningún eje, o queda uno solo, `x` ya es 1D y la conclusión es trivial).

---

## 3. El criterio

> **Teorema 1.** Sea `x` con todos sus ejes de longitud $s_r > 1$ y $k \ge 2$. Entonces `x.reshape(-1)` puede ser una vista si y solo si
>
> $$t_r = s_{r+1}\, t_{r+1} \qquad \text{para todo } r = 0, \dots, k-2.$$
>
> En ese caso, la vista tiene desplazamiento $c$ y paso $w = t_{k-1}$.

*Demostración.*

*($\Leftarrow$) La condición basta.* Por inducción descendente sobre $r$ se prueba que $t_r = t_{k-1} S_r$. Para $r = k-1$ es cierto porque $S_{k-1} = 1$. Si es cierto para $r+1$, la hipótesis da $t_r = s_{r+1} t_{r+1} = s_{r+1}\, t_{k-1} S_{r+1} = t_{k-1} S_r$, porque $S_r = s_{r+1} S_{r+1}$ por definición. Sustituyendo en la función de dirección:

$$o(L) = c + \sum_r i_r(L)\, t_{k-1} S_r = c + t_{k-1} \sum_r i_r(L) S_r = c + t_{k-1} L,$$

donde la última igualdad es la definición 1 del índice lineal. Es la forma de la definición 3 con $c' = c$ y $w = t_{k-1}$.

*($\Rightarrow$) La condición es necesaria.* Supongamos $o(L) = c' + wL$ para todo $L$.

- Con $L = 0$ (multiíndice nulo): $o(0) = c$, luego $c' = c$.
- Con $L = S_r$, para cada $r$. Es un índice válido: como $s_r > 1$, $S_r \le N / s_r \le N/2 < N$. Su multiíndice es $i_r = 1$ y los demás 0 (es la escritura de $S_r$ en la base mixta). Entonces $o(S_r) = c + t_r$, y por hipótesis $o(S_r) = c + w S_r$. Luego $t_r = w\,S_r$ para todo $r$.

Por tanto $t_r = w S_r = w\, s_{r+1} S_{r+1} = s_{r+1}\, t_{r+1}$. $\blacksquare$

**La idea de la demostración en una frase:** las direcciones de un arreglo son una función «lineal en base mixta» del índice lineal; son una progresión aritmética exactamente cuando el paso de cada eje es el del siguiente multiplicado por su longitud, es decir, cuando cada eje «continúa» donde acaba el siguiente.

> **Corolario 1 (contiguo en orden C).** Si `x` es contiguo en orden C, aplanarlo es una vista.

*Demostración.* Contiguo en orden C significa $t_r = e\, S_r$ con $e$ = `itemsize`, y entonces $t_r = e\, s_{r+1} S_{r+1} = s_{r+1} t_{r+1}$. $\blacksquare$

> **Corolario 2 (traspuesta).** Si `x` es contiguo en orden C de forma $(a, b)$ con $a, b > 1$, aplanar `x.T` obliga a copiar.

*Demostración.* `x` tiene pasos $(b e, e)$; `x.T` tiene forma $(b, a)$ y pasos $(e, b e)$. El criterio pediría $t_0 = s_1 t_1$, es decir, $e = a \cdot b e$, o sea $ab = 1$, imposible con $a, b > 1$. $\blacksquare$

---

## 4. Comprobación con seis casos

Con `x = np.arange(12).reshape(3, 4)` (`int64`, pasos $(32, 8)$):

| Arreglo | Forma | Pasos | Criterio | `np.shares_memory(x, v.reshape(-1))` |
|---|---|---|---|---|
| `x.T` | (4, 3) | (8, 32) | $8 = 3 \cdot 32$: **no** | `False` |
| `x[:, ::2]` | (3, 2) | (32, 16) | $32 = 2 \cdot 16$: **sí** | `True` |
| `x[:, :2]` | (3, 2) | (32, 8) | $32 = 2 \cdot 8$: **no** | `False` |
| `x[::2]` | (2, 4) | (64, 8) | $64 = 4 \cdot 8$: **no** | `False` |
| `x[1:2]` | (1, 4) | (32, 8) | eje de longitud 1 (lema 1): queda 1D | `True` |
| `x[:, 1:2]` | (3, 1) | (32, 8) | eje de longitud 1: queda 1D | `True` |

Los seis resultados de la última columna se obtuvieron con NumPy 2.5 y coinciden con el teorema. El motor aplica el criterio a cualquier rebanada de la matriz $3 \times 4$: en el paso 3 dice si aplanar el resultado sería una vista o una copia. Antes de avanzar, decide tú con la condición $t_0 = s_1 t_1$.

:::widget memoria El criterio sobre cualquier rebanada
{"op": "rebanada", "aplanar": true}
Predice y comprueba: columnas pares (`a[:, ::2]`), las dos últimas filas (`a[1:, :]`), filas alternas (`a[::2, :]`) y la traspuesta. Para `a[:, :2]`, que el motor no recorta por el final, usa la tabla de arriba.
::: El segundo caso sorprende: tomar las columnas pares de una matriz de 4 columnas deja los elementos 0, 2, 4, 6, 8, 10, que están **equiespaciados** en memoria (cada 16 bytes), así que se pueden aplanar sin copiar. En cambio, las dos primeras columnas (0, 1, 4, 5, 8, 9) tienen saltos irregulares.

---

## 5. Extensión: fusionar grupos de ejes

Un `reshape` general hace dos cosas: **dividir** ejes (siempre posible como vista: un eje de paso $t$ y longitud $pq$ se describe con dos ejes de longitudes $(p, q)$ y pasos $(qt, t)$, porque $i\,t = (i_1 q + i_2) t$) y **fusionar** grupos de ejes consecutivos.

> **Corolario 3.** Fusionar los ejes consecutivos $r, r+1, \dots, r'$ en uno solo, dejando los demás intactos, da una vista si y solo si los ejes del grupo de longitud mayor que 1 cumplen la condición del teorema 1 entre sí. El eje fusionado tiene el paso del último eje del grupo (de longitud mayor que 1).

*Demostración.* Fijados los índices de los ejes fuera del grupo, las direcciones del grupo son un subarreglo con los pasos $t_r, \dots, t_{r'}$, y su desplazamiento es la contribución de los ejes fijados. El teorema 1, aplicado a ese subarreglo, dice cuándo el grupo se puede recorrer con un solo paso. Como la condición no depende de los índices fijados, vale para todos a la vez, y el eje fusionado, junto con los ejes no fusionados con sus pasos originales, describe el resultado. $\blacksquare$

Ejemplo, con `T = np.arange(24).reshape(2, 3, 4)` (pasos $(96, 32, 8)$):

- `T.reshape(6, 4)` fusiona los ejes 0 y 1: $96 = 3 \cdot 32$, vista (`True`).
- `T.transpose(1, 0, 2).reshape(3, 8)` fusiona los ejes de longitudes $(2, 4)$ y pasos $(96, 8)$: $96 \ne 4 \cdot 8$, copia (`False`).
- `T[:, :, ::2].reshape(2, 6)` fusiona los ejes de longitudes $(3, 2)$ y pasos $(32, 16)$: $32 = 2 \cdot 16$, vista (`True`).

Estas tres predicciones también se comprobaron con NumPy. Es, en esencia, el algoritmo que NumPy aplica para decidir si `reshape` puede evitar la copia.

---

## 6. Por qué importa

- **Rendimiento y memoria:** una copia oculta de un tensor de 1 GB, dentro de un bucle de entrenamiento, puede agotar la memoria de tu GPU. PyTorch distingue `view` (falla si hace falta copiar, con el mismo criterio) de `reshape` (copia si hace falta). Cuando `view` falla con el error *view size is not compatible with input tensor's size and stride*, el teorema 1 te dice por qué, y `.contiguous()` es la copia explícita que lo arregla.
- **Corrección:** si cuentas con que `reshape` sea una vista para escribir a través de ella, y no lo es, tus escrituras se pierden. Comprueba con `np.shares_memory`.

### Ejercicio

Sin ejecutar, decide si estas operaciones dan una vista y compruébalo después: (a) `np.arange(24).reshape(4, 6)[:, ::3].reshape(-1)`; (b) `np.arange(24).reshape(4, 6)[::2, :].reshape(-1)`; (c) `np.zeros((5, 1, 7)).transpose(1, 0, 2).reshape(-1)`.

:::solucion Solución
(a) Forma $(4, 2)$, pasos $(48, 24)$: $48 = 2 \cdot 24$, **vista** (elementos 0, 3, 6, 9…, cada 24 bytes). (b) Forma $(2, 6)$, pasos $(96, 8)$: $96 \ne 6 \cdot 8 = 48$, **copia** (filas 0 y 2: hay un salto). (c) La traspuesta tiene forma $(1, 5, 7)$; por el lema 1 se ignora el eje de longitud 1 y quedan pasos $(56, 8)$ con $56 = 7 \cdot 8$: **vista**. Mover un eje de longitud 1 nunca obliga a copiar.
:::
