---
titulo: Aleatoriedad reproducible
num: 04
resumen: Aleatorio, pero repetible. Generadores con semilla, Monte Carlo con su error típico y particiones que no te engañan. Es el puente con la asignatura de Probabilidad: aquí se simula, allí se demuestra.
horas: ≈ 3 h
metas: ≈ 3 h de estudio | 3 motores interactivos | el detector de fraude del diagnóstico, simulado
objetivos: Generar muestras con default_rng y semilla | Implementar un Monte Carlo sencillo | Crear particiones aleatorias reproducibles
---

> **Objetivos.** Al terminar serás capaz de:
>
> 1. **Generar** muestras de las distribuciones habituales con `np.random.default_rng(semilla)` y **explicar** por qué la misma semilla da los mismos números.
> 2. **Implementar** un Monte Carlo sencillo (una probabilidad, una esperanza, una probabilidad condicional) y **cuantificar** su error con la regla $1/\sqrt n$.
> 3. **Crear** particiones reproducibles: entrenamiento/prueba, estratificadas y en $k$ pliegues.
> 4. **Organizar** la aleatoriedad de un proyecto: un generador por experimento, flujos independientes con `spawn` y las semillas de `random`, NumPy y PyTorch.

> **Prerrequisitos.** [Conferencias 2](c02-ndarray.md) y [3](c03-vectores.md): máscaras (`(x > c).mean()` como fracción), reducciones por eje e indexado avanzado. De probabilidad, solo la idea de frecuencia relativa. Cada resultado que simules aquí lo demostrarás en la asignatura de Probabilidad.

## 1. Tres sitios donde necesitarás azar

1. **Evaluar modelos.** Separar entrenamiento y prueba al azar. Si la partición cambia cada vez que ejecutas el cuaderno, tu 87 % de hoy y tu 85 % de mañana no son comparables: no sabes si mejoraste tú o tuviste suerte.
2. **Calcular lo que no sabes calcular.** ¿Qué probabilidad hay de que una transacción que dio positivo sea fraude? En el diagnóstico respondiste $0{,}99 \cdot 0{,}01$. Antes de aprender el teorema de Bayes puedes **simular** un millón de transacciones y contar. La simulación no miente: te dirá cuánto te alejaste.
3. **Entrenar redes.** La inicialización, el orden de los lotes y el *dropout* son aleatorios. Para depurar una red necesitas que dos ejecuciones sean idénticas.

Lo que une las tres es la **reproducibilidad**: aleatorio, pero repetible.

:::predice ¿Qué líneas imprimen lo mismo?
```python
rng = np.random.default_rng(42)
print(rng.random(3))    # (1)
print(rng.random(3))    # (2)
rng = np.random.default_rng(42)
print(rng.random(3))    # (3)
```
- [ ] Las tres: la semilla es la misma.
- [x] (1) y (3); la (2) es distinta.
- [ ] Ninguna: son números aleatorios.
- [ ] (1) y (2); la (3) es distinta.
---
`rng` es un **generador con estado**: cada llamada avanza el estado. La (2) continúa la secuencia; al crear un generador nuevo con la misma semilla, la secuencia vuelve a empezar: (1) y (3) dan `[0.774 0.439 0.859]`.
:::

## 2. Qué es un generador pseudoaleatorio

> **Definición 1 (generador pseudoaleatorio).** Un PRNG es un algoritmo **determinista** con un estado interno $s$, una transición $s_{t+1} = T(s_t)$ y una salida $u_t = G(s_t)$ (enteros de 64 bits o reales en $[0, 1)$). La **semilla** fija el estado inicial. Un buen PRNG produce secuencias que pasan las pruebas estadísticas de aleatoriedad aunque cada número esté determinado por la semilla.

El generador por defecto de NumPy es **PCG64** (O'Neill, 2014): estado de 128 bits, periodo $2^{128}$ y buena calidad estadística. NumPy separa el **generador de bits** (`PCG64`), que produce bits, del **`Generator`**, que los convierte en muestras de distribuciones; `np.random.default_rng(semilla)` crea los dos.

:::error «`np.random.seed(0)` y ya está todo fijado»
**Por qué es tentador:** lo verás en miles de tutoriales. **Por qué es un problema:** es la API heredada, con un **estado global** compartido por todo el programa y por las bibliotecas que importas. Si una función que llamas consume números del estado global, todos tus números posteriores cambian. Y `default_rng` **no** lee ese estado: mezclar las dos APIs da resultados no reproducibles. **Lo correcto:** crea `rng = np.random.default_rng(semilla)` una vez y pásalo a las funciones que lo necesiten.
:::

> **Observación 1.** PCG64 no sirve para contraseñas: su salida es predecible si se observa lo suficiente. Para eso está el módulo `secrets`.

## 3. Muestrear distribuciones

| Distribución | Orden | Cuidado con |
|---|---|---|
| Uniforme en $[0, 1)$ | `rng.random(size)` | |
| Enteros en $\{a, \dots, b-1\}$ | `rng.integers(a, b, size)` | **`b` no se incluye**: un dado es `integers(1, 7)` |
| Normal $\mathcal N(\mu, \sigma^2)$ | `rng.normal(mu, sigma, size)` | el segundo argumento es la **desviación**, no la varianza |
| Exponencial de tasa $\lambda$ | `rng.exponential(scale, size)` | pide la **escala** $1/\lambda$, no la tasa |
| Binomial, Poisson | `rng.binomial(n, p, size)`, `rng.poisson(lam, size)` | |
| Normal multivariante | `rng.multivariate_normal(mu, Sigma, size)` | aquí sí, la matriz de **covarianza** |
| Elegir, permutar | `rng.choice(a, size, replace=False)`, `rng.permutation(n)`, `rng.shuffle(x)` | `shuffle` es in situ |

`size` admite una tupla: `rng.normal(size=(1000, 3))` da 1000 vectores de 3 normales. **Genera todo de golpe**, nunca un número por vuelta de un bucle. La figura muestra la comprobación mínima de que entendiste los parámetros: la muestra contra su teoría.

![Muestras de 5000 valores (barras) frente a la densidad o probabilidad teórica (ámbar): normal de media 2 y desviación 0,5; exponencial de tasa 1,5 (escala 1/1,5); binomial B(20; 0,3).](img/muestras-teoria.png)

:::solucion Antes de seguir: 10 000 esperas exponenciales con media 4 minutos y 10 000 tiradas de un dado.
`rng.exponential(scale=4, size=10_000)` (la media de una exponencial es su escala $1/\lambda$) y `rng.integers(1, 7, size=10_000)`.
:::

## 4. Monte Carlo: calcular contando

> **Definición 2 (método de Monte Carlo).** Para estimar $\theta = \mathbb E[h(X)]$ se generan $X_1, \dots, X_n$ independientes con la distribución de $X$ y se calcula $\hat\theta_n = \frac1n\sum_{i=1}^n h(X_i)$. Una probabilidad es la esperanza de una indicadora, $P(A) = \mathbb E[\mathbf 1_A]$: la **fracción de simulaciones en que ocurre $A$**. En NumPy, `mascara.mean()`.

> **Teorema 1 (error de Monte Carlo; se demuestra en Probabilidad).** Si $\mathrm{Var}(h(X)) = \sigma^2 < \infty$, el error típico de $\hat\theta_n$ es $\mathrm{ET} = \sigma/\sqrt n$. Para una probabilidad $p$, $\sigma^2 = p(1-p)$. En la práctica $\sigma$ se estima con la desviación de las simulaciones, y $\hat\theta_n \pm 2\,\mathrm{ET}$ contiene el valor verdadero en torno al 95 % de las veces.

La consecuencia es la **regla $1/\sqrt n$**: para dividir el error entre 10, multiplica $n$ por 100.

### Ejemplo resuelto 1: estimar $\pi$

> **Ejemplo 1.** Un punto uniforme en $[0,1]^2$ cae en el cuarto de círculo $u_1^2 + u_2^2 \le 1$ con probabilidad $p = \pi/4$. Por tanto $\pi = 4p$.
>
> 1. Simular $n$ puntos de una vez: `P = rng.random((n, 2))`.
> 2. Indicadora: `dentro = (P**2).sum(axis=1) <= 1`.
> 3. Estimar: `pi_hat = 4 * dentro.mean()`.
> 4. Error típico: $4\sqrt{p(1-p)/n} \approx 1{,}64/\sqrt n$.
>
> Con un millón de puntos y la semilla 0: $\hat\pi = 3{,}141168$, $\mathrm{ET} = 0{,}0016$. Dos decimales fiables, el tercero apenas. El error real (0,0004) cae dentro de lo esperado.

:::widget montecarlo Monte Carlo de π y la regla 1/√n
Cambia la semilla varias veces en el paso 4: cada trayectoria es distinta y todas acaban dentro de la banda.
:::

La figura lo confirma con 200 semillas por cada $n$: el error observado cae exactamente como $1{,}64/\sqrt n$.

![Error típico observado de la estimación de π (puntos) frente a la fórmula teórica (línea). Una década más de puntos reduce el error en un factor √10 ≈ 3,16.](img/error-montecarlo.png)

### Ejemplo resuelto 2: el detector de fraude del diagnóstico

> **Ejemplo 2.** Sensibilidad del 99 % (si hay fraude, da positivo con probabilidad 0,99), especificidad del 95 % (si no hay fraude, falsa alarma con probabilidad 0,05) y un 1 % de fraudes. ¿Qué fracción de los positivos es fraude?
>
> 1. **La realidad:** `fraude = rng.random(n) < 0.01`. Comparar una uniforme con $p$ da una Bernoulli de parámetro $p$.
> 2. **El detector, según el caso:** `positivo = np.where(fraude, rng.random(n) < 0.99, rng.random(n) < 0.05)`.
> 3. **Condicionar = filtrar:** `fraude[positivo]` son las etiquetas reales de las transacciones que dieron positivo.
> 4. **Contar:** `fraude[positivo].mean()`.
>
> ```python
> rng = np.random.default_rng(1)
> n = 1_000_000
> fraude = rng.random(n) < 0.01
> positivo = np.where(fraude, rng.random(n) < 0.99, rng.random(n) < 0.05)
> fraude[positivo].mean()     # 0.167
> ```

Antes de ver el motor, comprométete con una cifra para el paso 2. Después mueve la tasa base.

:::widget fraude Condicionar es filtrar: 10 000 transacciones
Frecuencias naturales: en lugar de probabilidades, cuántas transacciones de cada tipo hay. Prueba con una tasa base del 10 % y con una especificidad del 99,9 %.
:::

Tu respuesta del diagnóstico, $0{,}99 \cdot 0{,}01 = 0{,}0099$, es la fracción de transacciones que son **a la vez** fraude y positivas: el numerador correcto. Lo que faltó fue **condicionar**: dividir entre la fracción de positivos, $0{,}0594$. En NumPy, filtrar con `[positivo]` es exactamente quedarse con el denominador. En la asignatura de Probabilidad lo escribirás como $P(F\mid +) = P(+\mid F)\,P(F)/P(+)$.

:::autoexplica ¿Por qué `fraude[positivo].mean()` estima $P(F \mid +)$ y `(fraude & positivo).mean()` no?
---
`(fraude & positivo).mean()` divide los casos «fraude y positivo» entre **todas** las transacciones: estima $P(F \cap +)$, unos 0,0099. `fraude[positivo]` primero se queda solo con las transacciones positivas, y la media divide entre **cuántas hay**: el denominador pasa a ser el número de positivos. Es la definición de probabilidad condicional, $P(F \mid +) = P(F \cap +)/P(+)$, hecha con una máscara. También se puede escribir `(fraude & positivo).sum() / positivo.sum()`.
:::

### Ejemplo para completar: la esperanza del máximo

> **Ejemplo 3.** $X_1, X_2$ independientes y uniformes en $[0, 1]$. Estima $\mathbb E[\max(X_1, X_2)]$ y su error típico.
> ```python
> rng = np.random.default_rng(2)
> M = ...                       # (n,): el máximo de cada par
> est, et = M.mean(), ...
> ```

:::solucion Solución
`M = rng.random((1_000_000, 2)).max(axis=1)` y `et = M.std() / np.sqrt(len(M))`: $\approx 0{,}6668 \pm 0{,}0002$. El valor exacto es $2/3$ (otro ejercicio del diagnóstico): la densidad del máximo es $2x$ en $[0, 1]$, y $\int_0^1 2x^2\,dx = 2/3$.
:::

**Cuándo no usar Monte Carlo:** para probabilidades muy pequeñas con mucha precisión. Estimar $p = 10^{-6}$ con un error relativo del 10 % exige del orden de $10^8$ simulaciones, porque $\mathrm{ET}/p \approx 1/\sqrt{np}$.

## 5. Particiones aleatorias reproducibles

### Entrenamiento y prueba

```python
def particion(n, frac_prueba, semilla):
    rng = np.random.default_rng(semilla)
    idx = rng.permutation(n)                   # 0..n-1 en orden aleatorio
    n_prueba = int(round(frac_prueba * n))
    return idx[n_prueba:], idx[:n_prueba]      # (entrenamiento, prueba)

ent, pru = particion(len(X), 0.2, semilla=42)
X_ent, y_ent, X_pru, y_pru = X[ent], y[ent], X[pru], y[pru]
```

Se permutan **índices**, no los datos, para que `X`, `y` y cualquier otro arreglo alineado se partan con **la misma** permutación.

:::error «Barajo `X` y `y` con `rng.shuffle` y luego corto»
**Por qué es tentador:** parece lo mismo que permutar índices. **Por qué falla:** cada `shuffle` consume otros números del generador, así que `X` e `y` quedan barajados con **permutaciones distintas**: cada fila acaba con la etiqueta de otro ejemplo, y el modelo aprende ruido. **Lo correcto:** una sola permutación de índices aplicada a todo.
:::

### Estratificar

Con clases desbalanceadas (el 1 % de fraudes), una partición al azar puede dejar algún pliegue casi sin la clase rara. **Estratificar** es partir cada clase por separado:

```python
def particion_estratificada(y, frac_prueba, semilla):
    rng = np.random.default_rng(semilla)
    prueba = []
    for c in np.unique(y):                             # un bucle por CLASE, no por ejemplo
        idx_c = np.flatnonzero(y == c)
        k = int(round(frac_prueba * len(idx_c)))
        prueba.append(rng.choice(idx_c, size=k, replace=False))
    prueba = np.concatenate(prueba)
    return np.setdiff1d(np.arange(len(y)), prueba), prueba
```

Un bucle de Python sobre un eje **pequeño** (las clases) está bien; la regla de la vectorización prohíbe los bucles sobre los datos.

:::widget particion Cinco pliegues: al azar frente a estratificado
Pulsa «otra semilla» cinco o seis veces con «estratificar» apagado y cuenta cuántas veces algún pliegue se queda con 0 o 1 minoritarios. Después actívalo.
:::

### $k$ pliegues

```python
idx = np.random.default_rng(0).permutation(n)
pliegues = np.array_split(idx, k)          # k trozos de tamaño casi igual
for i in range(k):
    prueba = pliegues[i]
    entrenamiento = np.concatenate(pliegues[:i] + pliegues[i + 1:])
```

En la práctica usarás `sklearn.model_selection` (`train_test_split`, `StratifiedKFold`, `GroupKFold`); su parámetro `random_state` es exactamente la semilla.

> **Observación 2 (cuándo «aleatorio» es un error).** Si los datos tienen **tiempo** (ventas diarias) o **grupos** (varias fotos del mismo paciente, varias filas del mismo cliente), barajar al azar mete en el entrenamiento información del futuro o del mismo grupo que se evalúa, y la evaluación sale optimista. Era el ejercicio de las ventas del diagnóstico. Lo resolverás en ML I y en Series temporales.

## 6. Organizar la aleatoriedad de un proyecto

**Pasar el generador, no usar el estado global.** Una función que necesita azar recibe un `rng`:

```python
def ruido(x, sigma, rng):
    return x + rng.normal(0, sigma, size=x.shape)

rng = np.random.default_rng(123)       # una vez, al principio del experimento
```

**Flujos independientes con `spawn`.** Si dos partes necesitan azar (generar datos y partirlos), no uses semillas 1, 2, 3 a mano:

```python
raiz = np.random.default_rng(42)
rng_datos, rng_particion = raiz.spawn(2)     # flujos independientes (SeedSequence por debajo)
```

Si cambias cuántos números consume la generación de datos, la partición **no cambia**: cada parte tiene su flujo.

**Las tres semillas de un proyecto con PyTorch:**

```python
import random, numpy as np, torch

def fijar_semillas(semilla: int):
    random.seed(semilla)                 # el módulo random de Python
    np.random.seed(semilla)              # el estado global heredado (lo usan algunas bibliotecas)
    torch.manual_seed(semilla)           # PyTorch en CPU y en todas las GPU
    return np.random.default_rng(semilla)   # el generador que usarás tú
```

Aun así, la GPU no garantiza resultados idénticos bit a bit: algunas operaciones de cuDNN son no deterministas por velocidad (`torch.use_deterministic_algorithms(True)` lo fuerza a costa de rendimiento).

:::error «Pruebo 20 semillas y me quedo con la mejor»
**Por qué es tentador:** la semilla parece un número sin importancia. **Por qué es un error:** elegirla mirando el resultado es ajustar un hiperparámetro con la prueba; ese 89 % no se repetirá con datos nuevos y no resiste una entrevista técnica. **Lo correcto:** fija la semilla antes de mirar, o informa de la media y la variabilidad sobre varias («87,1 % ± 0,8 sobre 5 semillas»).
:::

## 7. Errores típicos

| Error | Síntoma | Arreglo |
|---|---|---|
| Crear el generador con la misma semilla en cada llamada | los mismos números una y otra vez | crea `rng` una vez y pásalo |
| `rng.integers(1, 6)` para un dado | nunca sale el 6 | `integers(1, 7)` |
| `rng.normal(0, 4)` creyendo que 4 es la varianza | el doble de dispersión | `normal(0, 2)` |
| `rng.exponential(1.5)` creyendo que es la tasa | media 1,5 en vez de 1/1,5 | `exponential(scale=1/1.5)` |
| Un número por vuelta de un bucle | lento | `size=(...)` |

:::llevas Ideas que te llevas
- **`rng = np.random.default_rng(semilla)`, una vez por experimento,** y pásalo a las funciones.
- **Una probabilidad es una media de indicadoras;** `A[B].mean()` estima $P(A \mid B)$: condicionar es filtrar.
- **Regla $1/\sqrt n$:** da siempre el error típico junto al resultado. Una cifra más cuesta 100 veces más.
- **Para partir, permuta índices.** Estratifica con clases raras. Desconfía del azar con tiempo o grupos.
- **`spawn` para flujos independientes;** tres semillas con PyTorch; nunca elijas la semilla mirando la prueba.
:::

## 8. Preguntas de recuperación

1. ¿Qué es la semilla de un generador y qué garantiza?
2. Escribe un Monte Carlo para la probabilidad de que dos dados sumen 7, con su error típico.
3. ¿Cuántas simulaciones necesitas para estimar una probabilidad cercana a 0,5 con un error típico de 0,001?
4. ¿Cómo estimas $P(A \mid B)$ por simulación con las máscaras `A` y `B`?
5. Escribe una partición 80/20 reproducible.
6. ¿Por qué `spawn` es mejor que usar las semillas 1 y 2?

:::solucion Respuestas
1. Es el estado inicial; con la misma semilla, el mismo generador y la misma versión de NumPy, la secuencia es idéntica.
2. `d = rng.integers(1, 7, size=(n, 2)).sum(axis=1); p = (d == 7).mean(); et = np.sqrt(p * (1 - p) / n)`. Da $\approx 1/6$.
3. $\sqrt{0{,}25/n} = 0{,}001 \Rightarrow n = 250\,000$.
4. `A[B].mean()`, o `(A & B).sum() / B.sum()`.
5. `idx = np.random.default_rng(42).permutation(n); k = int(0.2 * n); pru, ent = idx[:k], idx[k:]`.
6. `SeedSequence` deriva semillas hijas con garantías de independencia estadística, y cada flujo queda aislado de lo que consuma el otro.
:::

## 9. Lecturas

- **NumPy, «Random sampling»** (`https://numpy.org/doc/stable/reference/random/index.html`), en inglés: `Generator`, la tabla de distribuciones y «Parallel random number generation» (`SeedSequence`, `spawn`).
- **Universidad de Cádiz, *Estadística descriptiva y probabilidad*** (en español, licencia GFDL; ya está en los recursos del curso): los capítulos de probabilidad, para ver resueltos a mano los ejemplos que aquí simulaste.
- **PyTorch, «Reproducibility»** (`https://pytorch.org/docs/stable/notes/randomness.html`), en inglés.
