# Conferencia 4. Aleatoriedad reproducible

> **Objetivos.** Al terminar esta conferencia serás capaz de:
>
> 1. **Generar** muestras de las distribuciones habituales con `np.random.default_rng(semilla)` y **explicar** por qué la misma semilla da los mismos números.
> 2. **Implementar** un Monte Carlo sencillo (estimar $\pi$, una esperanza o una probabilidad condicional) y **cuantificar** su error con la regla $1/\sqrt n$.
> 3. **Crear** particiones aleatorias reproducibles: entrenamiento/prueba, estratificadas y en $k$ pliegues.
> 4. **Organizar** la aleatoriedad de un proyecto: una semilla por experimento, flujos independientes con `spawn`, y las semillas de `random`, NumPy y PyTorch.

> **Prerrequisitos.** [Conferencias 2](c02-ndarray.md) y [3](c03-vectores.md): máscaras booleanas (`(x > c).mean()` como fracción), reducciones por eje e indexado avanzado. De probabilidad, solo la idea de frecuencia relativa. Esta conferencia es **el puente con la asignatura de Probabilidad**: aquí aprendes a *simular*; allí aprenderás a *calcular*. Cada resultado que simulemos lo demostrarás allí.

---

## 1. Motivación

Tres situaciones de este curso en las que necesitarás números aleatorios:

1. **Evaluar modelos.** Separar datos de entrenamiento y de prueba al azar. Si la partición cambia cada vez que ejecutas el cuaderno, tu exactitud del 87 % de hoy y la del 85 % de mañana no son comparables: no sabes si mejoraste tú o tuviste suerte.
2. **Calcular lo que no sabes calcular.** ¿Qué probabilidad hay de que una transacción que dio positivo sea fraude? En el diagnóstico respondiste $0{,}99 \cdot 0{,}01$. Antes de aprender el teorema de Bayes puedes **simular** un millón de transacciones y contar. La simulación no te miente: te dirá que estabas lejos.
3. **Entrenar redes.** La inicialización de los pesos, el orden de los lotes y el *dropout* son aleatorios. Para depurar una red necesitas que dos ejecuciones sean idénticas.

Lo que une las tres es la **reproducibilidad**: aleatorio, pero repetible.

> **Problema para pensar (5 minutos).** Ejecuta mentalmente, o en tu máquina:
>
> ```python
> import numpy as np
> rng = np.random.default_rng(42)
> print(rng.random(3))
> print(rng.random(3))
> rng = np.random.default_rng(42)
> print(rng.random(3))
> ```
>
> ¿Cuáles de las tres líneas coinciden? ¿Por qué no son las tres iguales, ni las tres distintas? Tu respuesta debe explicar qué *es* `rng`.

:::solucion Respuesta
La primera y la tercera coinciden (`[0.774 0.439 0.859]`); la segunda es distinta. `rng` es un **generador con estado**: cada llamada avanza ese estado. La segunda llamada continúa la secuencia; al crear un generador nuevo con la misma semilla, la secuencia vuelve a empezar desde el mismo estado.
:::

---

## 2. Qué es un generador pseudoaleatorio

> **Definición 1 (generador pseudoaleatorio).** Un *generador pseudoaleatorio* (PRNG) es un algoritmo **determinista** con un estado interno $s$ y dos funciones:
> - una transición $s_{t+1} = T(s_t)$;
> - una salida $u_t = G(s_t)$, que es un entero de 64 bits o un real en $[0, 1)$.
>
> La **semilla** fija el estado inicial $s_0$. Un buen PRNG produce secuencias que pasan las pruebas estadísticas de aleatoriedad, aunque cada número esté determinado por la semilla.

El generador por defecto de NumPy es **PCG64** (O'Neill, 2014): estado de 128 bits, periodo $2^{128}$ y buena calidad estadística. NumPy separa dos piezas:

- el **generador de bits** (`PCG64`), que produce bits;
- el **`Generator`**, que convierte esos bits en muestras de distribuciones (normal, Poisson…).

`np.random.default_rng(semilla)` crea las dos de una vez.

> **Observación 1 (la API antigua).** Encontrarás mucho código con `np.random.seed(0)` y `np.random.rand(...)`. Es la API heredada: usa un **estado global** compartido por todo el programa (y por las bibliotecas que importes) y el generador MT19937. NumPy la mantiene solo por compatibilidad y recomienda `default_rng` para todo el código nuevo. El estado global es frágil: si una función que llamas consume números del estado global, todos tus números posteriores cambian.

> **Observación 2 (no criptográfico).** PCG64 no sirve para contraseñas ni claves: su salida es predecible si se observa lo suficiente. Para eso está el módulo `secrets` de Python.

---

## 3. Muestrear distribuciones

Con un generador `rng = np.random.default_rng(2026)`:

| Distribución | Orden | Cuidado con |
|---|---|---|
| Uniforme en $[0, 1)$ | `rng.random(size)` | |
| Uniforme en $[a, b)$ | `rng.uniform(a, b, size)` | |
| Enteros en $\{a, \dots, b-1\}$ | `rng.integers(a, b, size)` | **`b` no se incluye**; un dado es `integers(1, 7)` (o `endpoint=True`) |
| Normal $\mathcal N(\mu, \sigma^2)$ | `rng.normal(mu, sigma, size)` | el segundo argumento es la **desviación típica**, no la varianza |
| Exponencial de tasa $\lambda$ | `rng.exponential(scale, size)` | NumPy pide la **escala** $1/\lambda$, no la tasa |
| Binomial $\mathrm{B}(n, p)$ | `rng.binomial(n, p, size)` | |
| Poisson de media $\lambda$ | `rng.poisson(lam, size)` | |
| Normal multivariante | `rng.multivariate_normal(mu, Sigma, size)` | aquí sí se pasa la matriz de **covarianza** |
| Elegir de un conjunto | `rng.choice(a, size, replace=True, p=None)` | `replace=False` para no repetir |
| Permutar | `rng.permutation(n)` (copia) · `rng.shuffle(x)` (in situ) | |

El argumento `size` admite una tupla: `rng.normal(size=(1000, 3))` da 1000 vectores de 3 normales independientes. **Genera todo de golpe**, nunca en un bucle de un número por vuelta: es la regla de la vectorización aplicada al azar.

La figura 1 compara tres muestras con su distribución teórica: es la comprobación mínima de que has entendido bien los parámetros.

![Figura 1. Muestras de 5000 valores (barras) frente a la densidad o la probabilidad teórica (ámbar). A la izquierda, una normal de media 2 y desviación 0,5; en el centro, una exponencial de tasa 1,5 (escala 1/1,5); a la derecha, una binomial B(20; 0,3).](figuras/python-cientifico/muestras-teoria.png)

**Antes de seguir:** quieres simular 10 000 tiempos de espera exponenciales con una media de 4 minutos y 10 000 tiradas de un dado. Escribe las dos líneas.

:::solucion Respuesta
`rng.exponential(scale=4, size=10_000)`: la media de una exponencial es su escala $1/\lambda$, así que $\lambda = 1/4$ y la escala es 4. `rng.integers(1, 7, size=10_000)`: el 7 no se incluye.
:::

---

## 4. Monte Carlo: calcular contando

> **Definición 2 (método de Monte Carlo).** Para estimar una cantidad que se puede escribir como una esperanza, $\theta = \mathbb E[h(X)]$, se generan $X_1, \dots, X_n$ independientes con la distribución de $X$ y se calcula la media muestral
>
> $$\hat\theta_n = \frac{1}{n}\sum_{i=1}^n h(X_i).$$
>
> Una probabilidad es un caso particular: $P(A) = \mathbb E[\mathbf 1_A]$, la esperanza de la indicadora, así que $\hat P(A)$ es la **fracción de simulaciones en que ocurre $A$**. En NumPy, `mascara.mean()`.

¿Por qué funciona y cuánto se equivoca? Lo demostrarás en la asignatura de Probabilidad (ley de los grandes números y teorema central del límite). Por ahora, el resultado que necesitas:

> **Teorema 1 (error de Monte Carlo; se demuestra en Probabilidad).** Si $\mathrm{Var}(h(X)) = \sigma^2 < \infty$, el error típico de $\hat\theta_n$ es
>
> $$\mathrm{ET}(\hat\theta_n) = \frac{\sigma}{\sqrt n}.$$
>
> Para una probabilidad $p$, $\sigma^2 = p(1-p)$. En la práctica, $\sigma$ se estima con la desviación típica de las simulaciones, y $\hat\theta_n \pm 2\,\mathrm{ET}$ contiene el valor verdadero en torno al 95 % de las veces.

La consecuencia es la **regla $1/\sqrt n$**: para dividir el error entre 10 hay que multiplicar $n$ por 100. Una cifra decimal más cuesta cien veces más cálculo.

### 4.1. Ejemplo resuelto 1: estimar $\pi$

> **Ejemplo 1.** Un punto $(U_1, U_2)$ uniforme en el cuadrado $[0,1]^2$ cae dentro del cuarto de círculo $u_1^2 + u_2^2 \le 1$ con probabilidad igual al área de ese cuarto, $p = \pi/4$. Por tanto, $\pi = 4p$.
>
> 1. **Simular** $n$ puntos de una vez: `P = rng.random((n, 2))`, forma `(n, 2)`.
> 2. **Indicadora** de «dentro»: `dentro = (P**2).sum(axis=1) <= 1`, forma `(n,)`, booleana.
> 3. **Estimar:** `pi_hat = 4 * dentro.mean()`.
> 4. **Error típico:** $\mathrm{ET}(\hat\pi) = 4\sqrt{p(1-p)/n} = 4\sqrt{(\pi/4)(1-\pi/4)/n} \approx 1{,}64/\sqrt n$.
>
> ```python
> rng = np.random.default_rng(0)
> n = 1_000_000
> P = rng.random((n, 2))
> pi_hat = 4 * ((P ** 2).sum(axis=1) <= 1).mean()      # 3.141168
> et = 4 * np.sqrt(pi_hat / 4 * (1 - pi_hat / 4) / n)   # 0.00164
> ```
>
> **Interpretación.** Con un millón de puntos, $\hat\pi = 3{,}1412$ con un error típico de 0,0016: las dos primeras cifras decimales son fiables; la tercera, apenas. El error real aquí es 0,0004, dentro de lo esperado.

La escena permite verlo crecer. Cambia la semilla: cada semilla da otra trayectoria, pero todas acaban dentro de la banda $\pm 2\,\mathrm{ET}$, que se estrecha como $1/\sqrt n$.

```escena
{"archivo": "escenas/python-cientifico/montecarlo-pi.js", "titulo": "Monte Carlo de π y la regla 1/√n", "pie": "Paso 1: el cuadrado y el cuarto de círculo. Paso 2: caen los puntos. Paso 3: la estimación en función de n (escala logarítmica). Paso 4: la banda de ±2 errores típicos. Cambia la semilla y compara trayectorias."}
```

La figura 2 confirma la regla: el error medido con 200 semillas distintas cae exactamente como $1{,}64/\sqrt n$.

![Figura 2. Error típico observado de la estimación de π (puntos) frente a la fórmula teórica (línea). Una década más de puntos reduce el error en un factor √10 ≈ 3,16.](figuras/python-cientifico/error-montecarlo.png)

### 4.2. Ejemplo resuelto 2: el detector de fraude del diagnóstico

> **Ejemplo 2.** Un detector tiene sensibilidad del 99 % (si hay fraude, da positivo con probabilidad 0,99), especificidad del 95 % (si no hay fraude, da negativo con probabilidad 0,95, es decir, da un **falso positivo** con probabilidad 0,05), y el 1 % de las transacciones son fraude. ¿Qué fracción de los positivos son fraude de verdad?
>
> 1. **Simular la realidad:** `fraude = rng.random(n) < 0.01`. Cada transacción es fraude con probabilidad 0,01 (la comparación `< p` convierte una uniforme en una Bernoulli de parámetro $p$).
> 2. **Simular el detector, según el caso.** `np.where` elige elemento a elemento:
>    ```python
>    positivo = np.where(fraude, rng.random(n) < 0.99, rng.random(n) < 0.05)
>    ```
> 3. **Condicionar = filtrar.** «Entre los positivos» es una máscara: `fraude[positivo]` son las etiquetas reales de las transacciones que dieron positivo.
> 4. **Contar:** `fraude[positivo].mean()`.
>
> ```python
> rng = np.random.default_rng(1)
> n = 1_000_000
> fraude = rng.random(n) < 0.01
> positivo = np.where(fraude, rng.random(n) < 0.99, rng.random(n) < 0.05)
> fraude[positivo].mean()     # 0.167
> ```
>
> **Resultado: solo el 16,7 % de los positivos son fraude.** De cada 10 000 transacciones, unas 100 son fraude y 99 de ellas dan positivo; de las 9900 legítimas, el 5 % (495) también dan positivo. Entre los $99 + 495 = 594$ positivos, 99 son fraude: $99/594 \approx 0{,}167$.

Tu respuesta del diagnóstico, $0{,}99 \cdot 0{,}01 = 0{,}0099$, es la fracción de transacciones que son **a la vez** fraude y positivas: el numerador correcto. Lo que faltó fue **condicionar**, es decir, dividir entre la fracción de positivos, $0{,}0594$. La simulación hace visible esa división: filtrar con `[positivo]` es exactamente quedarse con el denominador. En la asignatura de Probabilidad, y en la meta «Paradoja de la tasa base», lo escribirás como $P(F \mid +) = P(+ \mid F)P(F)/P(+)$.

**Antes de seguir:** con el mismo código, ¿cuánto vale la probabilidad de fraude entre los positivos si el fraude fuera el 10 % de las transacciones? Predice primero si sube o baja, y luego escribe la línea que cambia.

:::solucion Respuesta
Sube: hay más fraudes verdaderos para la misma tasa de falsos positivos. Cambia `fraude = rng.random(n) < 0.10`. El valor exacto es $0{,}099/(0{,}099 + 0{,}045) \approx 0{,}6875$; la simulación dará $\approx 0{,}69$.
:::

### 4.3. Ejemplo parcialmente resuelto: la esperanza del máximo

> **Ejemplo 3 (complétalo).** $X_1, X_2$ son independientes y uniformes en $[0, 1]$. Estima $\mathbb E[\max(X_1, X_2)]$ con un millón de simulaciones y da su error típico.
>
> ```python
> rng = np.random.default_rng(2)
> M = ...                                  # (n,): el máximo de cada par
> est = M.mean()
> et = ...                                 # error típico
> ```

:::solucion Solución
`M = rng.random((1_000_000, 2)).max(axis=1)` y `et = M.std() / np.sqrt(len(M))`. Sale $\approx 0{,}6668 \pm 0{,}0002$. El valor exacto es $2/3$: es otro ejercicio del diagnóstico, que demostrarás en Probabilidad (la densidad del máximo es $2x$ en $[0,1]$).
:::

### 4.4. Cuándo usar Monte Carlo, y cuándo no

- **Sí:** cuando el cálculo exacto es difícil o imposible, para **comprobar** un cálculo a mano (si tu fórmula y tu simulación discrepan, una de las dos está mal), y para la incertidumbre de una métrica (el *bootstrap* de la asignatura de Estadística es un Monte Carlo sobre tus datos).
- **No:** cuando necesitas mucha precisión en una probabilidad pequeña. Para estimar $p = 10^{-6}$ con un error relativo del 10 % hacen falta del orden de $10^8$ simulaciones, porque $\mathrm{ET}/p \approx 1/\sqrt{np}$.

---

## 5. Particiones aleatorias reproducibles

### 5.1. Entrenamiento y prueba

El método básico: permutar los índices y cortar.

```python
def particion(n, frac_prueba, semilla):
    rng = np.random.default_rng(semilla)
    idx = rng.permutation(n)                     # los índices 0..n-1 en orden aleatorio
    n_prueba = int(round(frac_prueba * n))
    return idx[n_prueba:], idx[:n_prueba]       # (entrenamiento, prueba)

ent, pru = particion(len(X), 0.2, semilla=42)
X_ent, y_ent = X[ent], y[ent]                   # indexado avanzado: copias
X_pru, y_pru = X[pru], y[pru]
```

¿Por qué permutar **índices** y no los datos? Porque así `X` e `y` (y cualquier otro arreglo alineado con ellos) se parten **con la misma permutación**. Barajar `X` y `y` por separado rompería la correspondencia entre cada ejemplo y su etiqueta.

### 5.2. Partición estratificada

Con clases desbalanceadas (el 1 % de fraudes), una partición al azar puede dejar la prueba casi sin fraudes. La **estratificación** parte cada clase por separado, para que todas mantengan su proporción:

```python
def particion_estratificada(y, frac_prueba, semilla):
    rng = np.random.default_rng(semilla)
    prueba = []
    for c in np.unique(y):                               # un bucle por CLASE, no por ejemplo
        idx_c = np.flatnonzero(y == c)                   # índices de la clase c
        k = int(round(frac_prueba * len(idx_c)))
        prueba.append(rng.choice(idx_c, size=k, replace=False))
    prueba = np.concatenate(prueba)
    entrenamiento = np.setdiff1d(np.arange(len(y)), prueba)
    return entrenamiento, prueba
```

Fíjate en el bucle: recorre las **clases**, que son pocas, no los ejemplos. Un bucle de Python sobre un eje pequeño está bien; la regla de la vectorización prohíbe los bucles sobre los datos.

### 5.3. $k$ pliegues

Para la validación cruzada (la estudiarás en ML I), los datos se dividen en $k$ partes; cada una hace de prueba una vez:

```python
idx = np.random.default_rng(0).permutation(n)
pliegues = np.array_split(idx, k)          # k trozos de tamaño casi igual (aunque n no sea múltiplo de k)
for i in range(k):
    prueba = pliegues[i]
    entrenamiento = np.concatenate(pliegues[:i] + pliegues[i + 1:])
```

En la práctica usarás `sklearn.model_selection` (`train_test_split`, `StratifiedKFold`, `GroupKFold`), que hace esto con más opciones. Pero ahora sabes qué hay dentro, y que su parámetro `random_state` es exactamente la semilla.

> **Observación 3 (cuándo una partición aleatoria es un error).** Si los datos tienen **tiempo** (ventas diarias) o **grupos** (varias fotos del mismo paciente, varias filas del mismo cliente), barajar al azar mete en el entrenamiento información del futuro o del mismo grupo que se evalúa, y la evaluación sale optimista. Era el ejercicio de las ventas del diagnóstico. Lo resolverás en ML I y en Series temporales; aquí basta con recordar que **«aleatorio» no siempre es «correcto»**.

**Antes de seguir:** `X` tiene 1000 filas y `y` 1000 etiquetas. Un compañero hace `rng.shuffle(X); rng.shuffle(y)` y luego corta. ¿Qué está mal, y por qué el modelo seguramente rendirá como el azar?

:::solucion Respuesta
Cada `shuffle` usa números distintos del generador (el estado avanzó), así que `X` e `y` quedan barajados con **permutaciones diferentes**: cada fila acaba con la etiqueta de otro ejemplo. El modelo aprende de etiquetas aleatorias. La solución es una sola permutación de índices aplicada a los dos: `idx = rng.permutation(len(X)); X, y = X[idx], y[idx]`.
:::

---

## 6. Organizar la aleatoriedad de un proyecto

### 6.1. Pasar el generador, no la semilla global

Una función que necesita azar debe **recibir** un generador (o una semilla) en vez de usar un estado global:

```python
def ruido(x, sigma, rng):
    return x + rng.normal(0, sigma, size=x.shape)

rng = np.random.default_rng(123)       # una sola vez, al principio del experimento
y1 = ruido(x, 0.1, rng)
```

Así el experimento entero depende de **una** semilla, y cada función es reproducible y fácil de probar (en la conferencia 8 escribirás pruebas que fijan el generador).

### 6.2. Flujos independientes con `spawn`

Si dos partes de un experimento necesitan azar (generar datos y partirlos, o varios procesos en paralelo), no uses semillas «a mano» como 1, 2, 3: los flujos de semillas consecutivas no están garantizados como independientes en todos los generadores. NumPy ofrece una forma correcta:

```python
raiz = np.random.default_rng(42)
rng_datos, rng_particion = raiz.spawn(2)     # dos generadores con flujos independientes
```

`spawn` usa por debajo `SeedSequence`, que deriva semillas hijas con garantías estadísticas. Así, si cambias cuántos números consume la generación de datos, la partición **no cambia**: cada parte tiene su propio flujo.

### 6.3. Las tres semillas de un proyecto de ML

En un proyecto con PyTorch hay al menos tres fuentes de azar:

```python
import random, numpy as np, torch

def fijar_semillas(semilla: int):
    random.seed(semilla)                 # el módulo random de Python
    np.random.seed(semilla)              # el estado global heredado (lo usan algunas bibliotecas)
    torch.manual_seed(semilla)           # PyTorch en CPU y en todas las GPU
    return np.random.default_rng(semilla)   # el generador que TÚ usarás
```

Aun con todo fijado, **la GPU no garantiza resultados idénticos bit a bit**: algunas operaciones de cuDNN eligen algoritmos no deterministas por velocidad. `torch.use_deterministic_algorithms(True)` lo fuerza, a costa de rendimiento. Lo verás en aprendizaje profundo; aquí basta con saber que «misma semilla» garantiza resultados iguales en CPU, y casi iguales en GPU.

### 6.4. Una semilla no es un hiperparámetro

Si pruebas 20 semillas y te quedas con la que da mejor exactitud, **has sobreajustado a la semilla**: ese resultado no se repetirá con datos nuevos. Lo honesto es fijar la semilla **antes** de mirar los resultados, o informar de la media y la variabilidad sobre varias semillas («87,1 % ± 0,8 sobre 5 semillas»). Es la diferencia entre un portafolio creíble y uno que no resiste una entrevista técnica.

---

## 7. Errores típicos y cómo detectarlos

| Error | Síntoma | Arreglo |
|---|---|---|
| Crear el generador dentro de un bucle o una función que se llama muchas veces, con la misma semilla | se repiten los mismos números en cada llamada | crea `rng` una vez y pásalo |
| `rng.integers(1, 6)` para un dado | nunca sale el 6 | el extremo superior no se incluye: `integers(1, 7)` |
| `rng.normal(0, 4)` creyendo que 4 es la varianza | dispersión el doble de la esperada | el segundo argumento es la desviación: `normal(0, 2)` |
| `rng.exponential(1.5)` creyendo que 1,5 es la tasa | media 1,5 en vez de 1/1,5 | `exponential(scale=1/1.5)` |
| Barajar `X` e `y` por separado | el modelo no aprende | una permutación de índices |
| Generar un número por vuelta de un bucle | lento | `size=(...)` de una vez |
| Mezclar `np.random.seed` y `default_rng` creyendo que la primera fija la segunda | resultados no reproducibles | `default_rng` ignora el estado global |
| Elegir la mejor semilla | resultados que no se repiten | fija la semilla antes; informa media ± desviación |

---

## 8. Ideas que te llevas

- **`rng = np.random.default_rng(semilla)` una vez por experimento,** y pásalo a las funciones.
- **Una probabilidad es una media de indicadoras:** `(condicion).mean()`. Condicionar es filtrar: `A[B].mean()` estima $P(A \mid B)$.
- **Regla $1/\sqrt n$:** el error de Monte Carlo es $\sigma/\sqrt n$. Una cifra decimal más cuesta $100\times$ más simulaciones. Da siempre el error típico junto al resultado.
- **Para partir datos, permuta índices**, nunca los arreglos por separado. Estratifica con clases desbalanceadas. Desconfía del azar con tiempo o con grupos.
- **Flujos independientes con `spawn`;** tres semillas en un proyecto con PyTorch.

---

## 9. Preguntas de recuperación

1. ¿Qué es la semilla de un generador y qué garantiza?
2. Escribe un Monte Carlo para la probabilidad de que la suma de dos dados sea 7, con su error típico.
3. ¿Cuántas simulaciones necesitas, aproximadamente, para estimar una probabilidad cercana a 0,5 con un error típico de 0,001?
4. ¿Cómo estimas $P(A \mid B)$ por simulación si tienes las máscaras `A` y `B`?
5. Escribe una partición entrenamiento/prueba del 80/20 reproducible.
6. ¿Por qué `spawn` es mejor que usar las semillas 1 y 2 para dos flujos?
7. ¿Por qué elegir la semilla con mejores resultados es un error?

:::solucion Respuestas
1. Es el estado inicial del generador; con la misma semilla (y la misma versión de NumPy y el mismo generador), la secuencia es idéntica.
2. `d = rng.integers(1, 7, size=(n, 2)).sum(axis=1); p = (d == 7).mean(); et = np.sqrt(p * (1 - p) / n)`. Debe dar $\approx 1/6$.
3. $\sqrt{0{,}25/n} = 0{,}001 \Rightarrow n = 250\,000$.
4. `A[B].mean()`: la fracción de casos con `A` entre los que cumplen `B`. Equivale a `(A & B).sum() / B.sum()`.
5. `idx = np.random.default_rng(42).permutation(n); k = int(0.2 * n); pru, ent = idx[:k], idx[k:]`.
6. Porque `SeedSequence` deriva semillas hijas con garantía de independencia estadística, y porque cada flujo queda aislado: cambiar lo que consume uno no altera al otro.
7. Porque es elegir un hiperparámetro con el conjunto de prueba: el resultado está sesgado a favor y no se repetirá con datos nuevos.
:::

---

## 10. Lecturas

- **NumPy, «Random sampling»** (`https://numpy.org/doc/stable/reference/random/index.html`), en inglés: la guía de `Generator`, la tabla de distribuciones y la sección «Parallel random number generation» sobre `SeedSequence` y `spawn`.
- **Universidad de Cádiz, *Estadística descriptiva y probabilidad*** (en español, licencia GFDL; ya descargado en los recursos del curso): los capítulos de probabilidad, para ver resueltos a mano los ejemplos que aquí simulaste.
- **PyTorch, «Reproducibility»** (`https://pytorch.org/docs/stable/notes/randomness.html`), en inglés: qué garantiza y qué no la semilla en GPU.
