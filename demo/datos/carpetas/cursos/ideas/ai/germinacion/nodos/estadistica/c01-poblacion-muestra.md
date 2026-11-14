# Conferencia 1. De la población a la muestra: estimadores, sesgo, varianza y ECM

## Objetivos

Al terminar esta conferencia serás capaz de:

1. **Distinguir** población, parámetro, muestra, estadístico, estimador y estimación, y **traducir** un problema de evaluación de modelos a ese lenguaje (qué es la población, cuál es el parámetro y qué estimador uso).
2. **Calcular** el sesgo, la varianza, el error típico y el error cuadrático medio (ECM) de estimadores sencillos: la media muestral, la proporción, las dos varianzas muestrales y el máximo de una muestra.
3. **Demostrar** la descomposición $\mathrm{ECM} = \mathrm{sesgo}^2 + \mathrm{varianza}$ y **usarla** para decidir entre dos estimadores.
4. **Explicar** con números por qué un estimador sesgado puede ser mejor que uno insesgado (el encogimiento, raíz de la regularización).
5. **Simular** con NumPy la distribución muestral de un estimador y **medir** su sesgo y su varianza por Monte Carlo.
6. **Relacionar** el sesgo y la varianza de un estimador con el «sesgo-varianza» de los modelos de aprendizaje automático, y **señalar** en qué se diferencian.

## Prerrequisitos

- De [Probabilidad para aprendizaje automático](nodos/probabilidad.md):
  - variables aleatorias y sus distribuciones (conferencias 4 y 5);
  - esperanza y varianza, su linealidad y la varianza de una suma de variables independientes (conferencias 6 y 7);
  - la ley de los grandes números y la desigualdad de Chebyshev (conferencia 10).
- De Python científico: generar números aleatorios con `np.random.default_rng` y operar por ejes (`mean(axis=1)`).

Tres fórmulas de probabilidad que usarás sin parar. Si alguna no te resulta familiar, repásala antes de seguir:

$$\mathbb{E}[aX+b] = a\,\mathbb{E}[X]+b,\qquad \operatorname{Var}(aX+b) = a^2\operatorname{Var}(X),\qquad \operatorname{Var}(X) = \mathbb{E}[X^2]-\mathbb{E}[X]^2,$$

y, si $X_1,\dots,X_n$ son independientes,

$$\operatorname{Var}\Big(\sum_{i=1}^n X_i\Big) = \sum_{i=1}^n \operatorname{Var}(X_i).$$

---

## 1. Motivación: un número sin barra de error no es un resultado

Entrenas un clasificador y lo pruebas con 200 ejemplos que no ha visto: acierta 172, un 86 %. Un compañero repite la evaluación con **otros** 200 ejemplos sacados de la misma fuente y obtiene un 83 %. ¿Quién se equivocó?

Ninguno. La exactitud «de verdad» del modelo, la que tendría sobre todos los casos que verá en producción, es un número fijo que nadie conoce. Lo que tú mediste es una **estimación** de ese número a partir de una **muestra**, y otra muestra da otra estimación. Toda esta asignatura trata de una sola pregunta, formulada de muchas maneras: **¿cuánto puedo fiarme de un número calculado sobre una muestra?**

Para responderla hace falta un lenguaje preciso. Lo construimos en esta conferencia y, antes, te propongo un problema que intentarás resolver con lo que ya sabes.

### Problema para atacar antes de la teoría

> **Problema 0.** Un proceso genera números al azar, uniformemente, entre $0$ y un tope $\theta>0$ desconocido. Has observado $n=5$ valores:
> $$0{,}21,\quad 0{,}48,\quad 0{,}55,\quad 0{,}70,\quad 0{,}74.$$
> 1. Propón **al menos dos** fórmulas razonables para estimar $\theta$ a partir de los datos y calcula cuánto dan aquí.
> 2. ¿Cuál de ellas es «mejor»? Antes de responder, escribe qué significaría exactamente «mejor».

Dedícale diez minutos de verdad. No hace falta que llegues a una respuesta cerrada: lo importante es que te choques con la segunda pregunta.

:::solucion Lo que suele salir (léelo después de intentarlo)
Las dos propuestas más naturales son:

- **El doble de la media.** Si los datos son uniformes en $[0,\theta]$, su media teórica es $\theta/2$, así que $\theta \approx 2\bar x = 2\cdot 0{,}536 = 1{,}072$.
- **El máximo.** $\theta$ tiene que ser al menos el mayor valor visto, así que $\theta\approx \max x_i = 0{,}74$.

Las dos son razonables y dan números muy distintos. Algunas personas proponen una tercera: «el máximo, un poco agrandado, porque el máximo siempre se queda corto».

Lo que no se puede hacer sin más teoría es decir cuál es mejor. Con **una** muestra no basta: cualquiera de las dos puede acertar por suerte. «Mejor» tiene que referirse a cómo se comporta cada fórmula **sobre todas las muestras posibles**: si se equivoca hacia un lado sistemáticamente, si oscila mucho, o cuánto se equivoca en promedio. Eso son exactamente el sesgo, la varianza y el ECM. Al final de la sección 6 resolveremos este problema por completo.
:::

---

## 2. Población, parámetro y muestra

Empezamos por los términos. Todos se usarán en las diez conferencias.

> **Definición 1 (modelo estadístico y parámetro).** Un **modelo estadístico** es una familia de distribuciones de probabilidad $\{F_\theta : \theta\in\Theta\}$ que creemos que puede haber generado los datos. El índice $\theta$ es el **parámetro** y $\Theta$, el **espacio de parámetros**. La distribución que realmente generó los datos es la **población**; su parámetro es un número fijo y desconocido.

Ejemplos:

- **Bernoulli.** $\{\mathrm{Bernoulli}(p) : p\in[0,1]\}$. Cada dato es 1 (acierto) o 0 (fallo). El parámetro $p$ es la probabilidad de acierto.
- **Normal.** $\{\mathcal N(\mu,\sigma^2) : \mu\in\mathbb R,\ \sigma>0\}$. Aquí el parámetro es el vector $\theta = (\mu,\sigma^2)$.
- **Uniforme.** $\{\mathrm{U}(0,\theta) : \theta>0\}$, la del problema 0.

A veces el modelo no es una familia con pocos parámetros: «cualquier distribución con media y varianza finitas». Entonces el parámetro es una **característica** de la población, como su media $\mu = \mathbb E[X]$ o su mediana. Se habla de estadística **no paramétrica**. La conferencia 4 (*bootstrap*) vive en ese mundo.

> **Definición 2 (muestra aleatoria simple).** Una **muestra aleatoria simple** de tamaño $n$ de la población $F$ es un vector $(X_1,\dots,X_n)$ de variables aleatorias **independientes** y con **la misma distribución** $F$. Se abrevia «$X_1,\dots,X_n$ i.i.d. $\sim F$» (independientes e idénticamente distribuidas). Los números concretos que observas, $x_1,\dots,x_n$, son una **realización** de la muestra.

Fíjate en la convención tipográfica, porque es la clave de todo: **mayúsculas** para las variables aleatorias (lo que *podría* salir) y **minúsculas** para los valores observados (lo que *salió*).

### La evaluación de un modelo, en este lenguaje

Tomas un clasificador ya entrenado, $h$, y lo evalúas sobre $n$ ejemplos de prueba $(x_i,y_i)$, extraídos al azar de la misma distribución que verá en producción. Define

$$X_i = \mathbf 1\{h(x_i) = y_i\} = \begin{cases}1 & \text{si } h \text{ acierta el ejemplo } i,\\ 0 & \text{si falla.}\end{cases}$$

- La **población** es la distribución de los casos que el modelo verá en producción.
- El **parámetro** es la **exactitud verdadera** $p = P(h(X)=Y)$, la probabilidad de que el modelo acierte un caso nuevo al azar.
- Las $X_i$ son i.i.d. $\mathrm{Bernoulli}(p)$, **siempre que** los ejemplos de prueba sean independientes y no se hayan usado para entrenar ni para elegir el modelo.
- La exactitud medida, $\hat p = \tfrac1n\sum X_i$, es un **estimador** de $p$.

Esa condición en negrita no es un detalle. Cuando falla (ejemplos repetidos, varias fotos del mismo paciente, días consecutivos de una serie temporal, un conjunto de prueba que usaste para elegir hiperparámetros), todo lo que calculemos a partir de aquí deja de ser cierto. Volveremos a ello en las conferencias 4, 6 y 7.

**Antes de seguir: ¿población, parámetro o estimación?** Clasifica cada cosa: (a) el error absoluto medio que tu modelo de demanda tendrá durante el próximo año en la tienda; (b) el MAE que mides en las últimas 8 semanas de datos; (c) todas las semanas futuras de ventas de esa tienda.

:::solucion Respuesta
(a) es el **parámetro**: un número fijo, desconocido, definido sobre la población. (b) es una **estimación** de ese parámetro, el valor que toma el estimador «MAE sobre una muestra de semanas». (c) es la **población**. Un matiz que veremos en la conferencia 4: las semanas consecutivas no son independientes, así que (b) no es una muestra aleatoria simple y su error típico no se calcula con la fórmula ingenua.
:::

---

## 3. Estadístico, estimador y estimación

> **Definición 3 (estadístico).** Un **estadístico** es cualquier función $T = T(X_1,\dots,X_n)$ de la muestra que **no depende** de parámetros desconocidos. Al ser función de variables aleatorias, un estadístico es también una variable aleatoria.

> **Definición 4 (estimador y estimación).** Un **estimador** de $\theta$ es un estadístico $\hat\theta = T(X_1,\dots,X_n)$ que se usa para aproximar $\theta$. Su valor sobre los datos observados, $T(x_1,\dots,x_n)$, es la **estimación**: un número.

Ejemplos con la población Bernoulli de los aciertos:

| Objeto | Fórmula | ¿Qué es? |
|---|---|---|
| $p$ | $P(h(X)=Y)$ | parámetro (número fijo, desconocido) |
| $\hat p$ | $\tfrac1n\sum_{i=1}^n X_i$ | estimador (variable aleatoria) |
| $0{,}86$ | $\tfrac{172}{200}$ | estimación (número) |
| $\hat p - p$ | | **no** es un estadístico: depende de $p$ |

La frase «el estimador es una variable aleatoria» se entiende con un experimento mental. Imagina que repites la evaluación **muchas veces**, cada vez con un conjunto de prueba nuevo, sacado de la misma población. Cada repetición da un $\hat p$ distinto. El estimador $\hat p$ es la regla y lo que tiene distribución es el resultado de aplicarla a una muestra al azar.

> **Definición 5 (distribución muestral).** La **distribución muestral** de un estimador $\hat\theta$ es su distribución de probabilidad como variable aleatoria, es decir, la distribución de los valores que tomaría sobre todas las muestras posibles de tamaño $n$.

Para $\hat p$ la conocemos exactamente: $n\hat p = \sum X_i \sim \mathrm{Binomial}(n,p)$. En la mayoría de los casos no hay fórmula, pero siempre se puede **simular** si conocemos la población. Este es el patrón de todas las simulaciones de la asignatura:

```python
import numpy as np

rng = np.random.default_rng(0)
p, n, R = 0.86, 200, 100_000          # exactitud verdadera, tamaño de la prueba, repeticiones

aciertos = rng.random((R, n)) < p     # matriz R x n de booleanos: cada fila es un conjunto de prueba
p_gorro = aciertos.mean(axis=1)       # R estimaciones, una por fila

print(p_gorro.mean())                 # ≈ 0.86  -> el estimador acierta en promedio
print(p_gorro.std())                  # ≈ 0.0245 -> pero cada medición oscila unos 2,5 puntos
print(np.mean(np.abs(p_gorro - p) >= 0.03))   # ≈ 0.23: casi 1 de cada 4 veces te equivocas en 3 puntos o más
```

Lee la línea `aciertos = rng.random((R, n)) < p` despacio. `rng.random((R, n))` es una matriz de uniformes en $[0,1)$; compararla con `p` da `True` con probabilidad $p$, es decir, una Bernoulli por casilla. `mean(axis=1)` promedia cada fila. Sin un solo bucle, has repetido la evaluación cien mil veces.

---

## 4. Sesgo: ¿se equivoca hacia un lado?

> **Definición 6 (sesgo).** El **sesgo** de un estimador $\hat\theta$ de $\theta$ es
> $$\operatorname{sesgo}_\theta(\hat\theta) = \mathbb E_\theta[\hat\theta] - \theta.$$
> El estimador es **insesgado** si su sesgo es cero **para todo** $\theta\in\Theta$.

El subíndice $\theta$ en $\mathbb E_\theta$ recuerda que la esperanza se calcula suponiendo que los datos vienen de $F_\theta$. Ser insesgado es una propiedad «para todo $\theta$»: un estimador que acierta en promedio solo cuando $\theta=3$ no es insesgado.

### Ejemplo resuelto 1: la media muestral es insesgada

Sea $X_1,\dots,X_n$ una muestra de una población con media $\mu$. Queremos el sesgo de $\bar X = \tfrac1n\sum X_i$.

- **Paso 1 (linealidad de la esperanza).** $\mathbb E[\bar X] = \tfrac1n\sum_{i=1}^n\mathbb E[X_i]$. No hace falta independencia para esto: la linealidad vale siempre.
- **Paso 2 (misma distribución).** Cada $\mathbb E[X_i]=\mu$, así que $\mathbb E[\bar X] = \tfrac1n\cdot n\mu = \mu$.
- **Conclusión.** $\operatorname{sesgo}(\bar X)=0$ para cualquier población con media finita.

Como $\hat p$ es la media muestral de unas Bernoulli, **la exactitud medida en un conjunto de prueba limpio es un estimador insesgado de la exactitud verdadera**. Retén la palabra «limpio».

### Ejemplo resuelto 2: la varianza muestral con $1/n$ está sesgada

Hay dos fórmulas habituales para la varianza de una muestra:

$$\hat\sigma^2 = \frac1n\sum_{i=1}^n (X_i-\bar X)^2, \qquad S^2 = \frac1{n-1}\sum_{i=1}^n (X_i-\bar X)^2.$$

NumPy usa la primera por defecto (`np.var(x)`, que equivale a `ddof=0`) y pandas, la segunda (`df.var()`, con `ddof=1`). Vamos a ver cuál es insesgada. La población tiene media $\mu$ y varianza $\sigma^2$.

- **Paso 1 (truco de centrar en $\mu$).** Sumamos y restamos $\mu$ dentro del cuadrado:
$$\sum_{i}(X_i-\bar X)^2 = \sum_i \big[(X_i-\mu) - (\bar X-\mu)\big]^2 = \sum_i (X_i-\mu)^2 - 2(\bar X-\mu)\sum_i (X_i-\mu) + n(\bar X-\mu)^2.$$
- **Paso 2 (simplificar el término cruzado).** Como $\sum_i (X_i-\mu) = n(\bar X-\mu)$, el término central vale $-2n(\bar X-\mu)^2$, y queda
$$\sum_{i}(X_i-\bar X)^2 = \sum_i (X_i-\mu)^2 - n(\bar X-\mu)^2.$$
- **Paso 3 (tomar esperanzas).** $\mathbb E[(X_i-\mu)^2] = \sigma^2$ por definición de varianza. Y $\mathbb E[(\bar X-\mu)^2] = \operatorname{Var}(\bar X) = \sigma^2/n$; este segundo hecho sí usa la independencia, y lo demostramos en la sección siguiente. Por tanto,
$$\mathbb E\Big[\sum_{i}(X_i-\bar X)^2\Big] = n\sigma^2 - n\cdot\frac{\sigma^2}{n} = (n-1)\sigma^2.$$
- **Conclusión.** $\mathbb E[\hat\sigma^2] = \tfrac{n-1}{n}\sigma^2$, con sesgo $-\sigma^2/n$: **subestima** la varianza. En cambio, $\mathbb E[S^2] = \sigma^2$: dividir entre $n-1$ corrige el sesgo exactamente.

**Por qué se queda corto.** Las desviaciones se miden respecto de $\bar X$, que es el punto que **minimiza** $\sum (X_i-c)^2$ sobre todos los $c$. Al usar el centro que mejor se ajusta a *esta* muestra, en vez del verdadero $\mu$, las desviaciones salen sistemáticamente un poco más pequeñas. Esto es una primera versión de una idea que verás mil veces en ML: **el error medido sobre los mismos datos con los que ajustaste algo es optimista**. El error de entrenamiento de un modelo es optimista por la misma razón.

**Antes de seguir.** Una población Bernoulli($p$) tiene varianza $p(1-p)$. Si estimas esa varianza con $\hat p(1-\hat p)$, ¿qué sesgo tiene? Pista: $\hat p(1-\hat p)$ es exactamente $\hat\sigma^2$ para datos 0/1.

:::solucion Respuesta
Para datos que solo valen 0 o 1, $X_i^2 = X_i$, así que $\tfrac1n\sum (X_i-\hat p)^2 = \tfrac1n\sum X_i^2 - \hat p^2 = \hat p - \hat p^2 = \hat p(1-\hat p)$. Es $\hat\sigma^2$, con sesgo $-p(1-p)/n$. Con $n = 200$ el sesgo relativo es $1/200 = 0{,}5\,\%$: despreciable. El sesgo $\sigma^2/n$ solo importa con muestras pequeñas.
:::

---

## 5. Varianza y error típico: ¿cuánto oscila?

Un estimador insesgado puede ser inútil si oscila muchísimo. La segunda propiedad mide esa oscilación.

> **Definición 7 (varianza y error típico).** La **varianza** de un estimador es $\operatorname{Var}_\theta(\hat\theta) = \mathbb E_\theta\big[(\hat\theta - \mathbb E_\theta[\hat\theta])^2\big]$. Su raíz cuadrada se llama **error típico** (en inglés, *standard error*, SE):
> $$\mathrm{SE}(\hat\theta) = \sqrt{\operatorname{Var}(\hat\theta)}.$$

El error típico es la desviación típica **de la distribución muestral**: no la de los datos, sino la del número que calculas con ellos. Confundir las dos es el error más frecuente de esta asignatura.

### Ejemplo resuelto 3: la varianza de la media y la ley de la raíz de $n$

- **Paso 1.** $\operatorname{Var}(\bar X) = \tfrac1{n^2}\operatorname{Var}\big(\sum X_i\big)$, porque sacar una constante de la varianza la eleva al cuadrado.
- **Paso 2 (aquí se usa la independencia).** Las $X_i$ son independientes, luego la varianza de la suma es la suma de varianzas: $\operatorname{Var}(\sum X_i) = n\sigma^2$.
- **Conclusión.**
$$\operatorname{Var}(\bar X) = \frac{\sigma^2}{n},\qquad \mathrm{SE}(\bar X) = \frac{\sigma}{\sqrt n}.$$

Para la exactitud, $\sigma^2 = p(1-p)$, y

$$\boxed{\ \mathrm{SE}(\hat p) = \sqrt{\frac{p(1-p)}{n}}\ }$$

Con $p = 0{,}86$ y $n = 200$: $\sqrt{0{,}86\cdot 0{,}14/200} = \sqrt{0{,}000602} \approx 0{,}0245$, unos **2,5 puntos porcentuales**. Es el número que viste en la simulación. Ahora entiendes por qué un 86 % y un 83 % medidos sobre dos conjuntos distintos de 200 ejemplos no se contradicen: están a poco más de un error típico.

Dos consecuencias que debes saber de memoria:

1. **Ley de la raíz de $n$.** Para dividir el error típico entre 2 necesitas **cuatro veces** más datos. Pasar de 200 a 800 ejemplos de prueba baja el error típico de 2,5 a 1,2 puntos.
2. **El peor caso es $p=1/2$.** Como $p(1-p)\le 1/4$, siempre se cumple $\mathrm{SE}(\hat p)\le 1/(2\sqrt n)$. Es una cota rápida para hacer cuentas mentales: con $n=100$, el error típico de cualquier proporción es como mucho 5 puntos; con $n = 400$, 2,5; con $n = 10\,000$, medio punto.

| $n$ (ejemplos de prueba) | $\mathrm{SE}$ si $p=0{,}86$ | Cota $1/(2\sqrt n)$ |
|---:|---:|---:|
| 50 | 4,9 puntos | 7,1 |
| 200 | 2,5 | 3,5 |
| 1 000 | 1,1 | 1,6 |
| 10 000 | 0,35 | 0,5 |

### El error típico estimado

$\mathrm{SE}(\hat p)$ depende de $p$, que no conocemos. En la práctica se **estima** sustituyendo $p$ por $\hat p$:

$$\widehat{\mathrm{SE}}(\hat p) = \sqrt{\frac{\hat p(1-\hat p)}{n}}.$$

Para la media de datos continuos, $\widehat{\mathrm{SE}}(\bar X) = S/\sqrt n$. Estos errores típicos estimados son los que acompañan, con el signo $\pm$, a cualquier resultado serio. La conferencia 3 los convertirá en intervalos de confianza.

**Antes de seguir: el MAE de un modelo de demanda.** Calculas el error absoluto de tu modelo en 64 días de prueba independientes: la media es $\bar e = 12{,}4$ unidades y la desviación típica muestral de los errores, $S = 9{,}6$. ¿Cuál es el error típico del MAE? ¿Cuántos días necesitarías para que fuera de 0,6 unidades?

:::solucion Respuesta
El MAE es una media de los errores absolutos $|e_i|$, así que $\widehat{\mathrm{SE}} = S/\sqrt n = 9{,}6/8 = 1{,}2$ unidades. Para bajarlo a la mitad (0,6) hacen falta cuatro veces más días: $256$. Ojo: los días consecutivos de ventas no suelen ser independientes; si lo no son, $1{,}2$ es una subestimación (lo arreglaremos con el *bootstrap* por bloques en la conferencia 4).
:::

---

## 6. El error cuadrático medio y su descomposición

Ya tenemos dos defectos posibles: equivocarse hacia un lado (sesgo) y oscilar (varianza). Necesitamos un solo número que los combine para poder comparar estimadores.

> **Definición 8 (error cuadrático medio).** El **error cuadrático medio** de $\hat\theta$ es
> $$\mathrm{ECM}_\theta(\hat\theta) = \mathbb E_\theta\big[(\hat\theta-\theta)^2\big].$$

Es la distancia al cuadrado entre la estimación y la verdad, promediada sobre todas las muestras posibles. Su raíz, $\sqrt{\mathrm{ECM}}$, está en las unidades de $\theta$ y se interpreta como «cuánto me equivoco típicamente».

> **Teorema 1 (descomposición sesgo-varianza del ECM).** Si $\hat\theta$ tiene varianza finita,
> $$\mathrm{ECM}(\hat\theta) = \operatorname{sesgo}(\hat\theta)^2 + \operatorname{Var}(\hat\theta).$$

**Demostración.** Llama $m = \mathbb E[\hat\theta]$, un número fijo. Sumamos y restamos $m$ dentro del cuadrado y desarrollamos:

$$(\hat\theta-\theta)^2 = (\hat\theta - m)^2 + 2(\hat\theta-m)(m-\theta) + (m-\theta)^2.$$

Tomamos esperanzas término a término. El primero da $\operatorname{Var}(\hat\theta)$. El último es una constante, $(m-\theta)^2 = \operatorname{sesgo}^2$. En el término cruzado, $(m-\theta)$ es constante y sale fuera: $2(m-\theta)\,\mathbb E[\hat\theta - m] = 2(m-\theta)\cdot 0 = 0$. $\blacksquare$

La técnica (sumar y restar la media, y ver que el término cruzado se anula porque una desviación respecto de su media tiene esperanza cero) es la misma que usaste en el ejemplo 2 y la que usarás en la sección 8 para el error de un modelo. La [demostración para valientes 1](nodos/estadistica/v01-ecm.md) la hace con todo detalle, también para estimadores vectoriales, y deduce de ella la descomposición del error de predicción.

**Corolario.** Si $\hat\theta$ es insesgado, $\mathrm{ECM}(\hat\theta)=\operatorname{Var}(\hat\theta)$. Por ejemplo, $\mathrm{ECM}(\hat p) = p(1-p)/n$.

### Volvemos al problema 0

Con la uniforme en $[0,\theta]$ comparamos tres estimadores: $2\bar X$, el máximo $M = \max_i X_i$ y $\tfrac{n+1}{n}M$.

**El estimador $2\bar X$.** La uniforme en $[0,\theta]$ tiene media $\theta/2$ y varianza $\theta^2/12$. Por los ejemplos 1 y 3:

$$\mathbb E[2\bar X] = \theta,\qquad \operatorname{Var}(2\bar X) = 4\cdot\frac{\theta^2}{12n} = \frac{\theta^2}{3n},\qquad \mathrm{ECM} = \frac{\theta^2}{3n}.$$

**El máximo $M$.** Necesitamos su distribución, y la técnica es la misma que usaste para $\max(X_1,X_2)$ en el diagnóstico (Probabilidad, conferencia 6): el máximo es menor que $m$ si y solo si **todos** lo son. Para $0\le m\le\theta$,

$$P(M\le m) = \prod_{i=1}^n P(X_i\le m) = \Big(\frac m\theta\Big)^n,\qquad f_M(m) = \frac{n\,m^{n-1}}{\theta^n}.$$

Integrando,

$$\mathbb E[M] = \int_0^\theta m\cdot\frac{n m^{n-1}}{\theta^n}\,dm = \frac{n}{n+1}\theta,\qquad \mathbb E[M^2] = \frac{n}{n+2}\theta^2.$$

Luego el sesgo es $-\theta/(n+1)$, la varianza es

$$\operatorname{Var}(M) = \frac{n}{n+2}\theta^2 - \frac{n^2}{(n+1)^2}\theta^2 = \frac{n\,\theta^2}{(n+1)^2(n+2)},$$

y el ECM vale

$$\mathrm{ECM}(M) = \frac{\theta^2}{(n+1)^2} + \frac{n\,\theta^2}{(n+1)^2(n+2)} = \frac{\theta^2\,[(n+2)+n]}{(n+1)^2(n+2)} = \frac{2\theta^2}{(n+1)(n+2)}.$$

**El máximo corregido $\tfrac{n+1}{n}M$.** Es insesgado por construcción. Su varianza es $\tfrac{(n+1)^2}{n^2}\operatorname{Var}(M) = \tfrac{\theta^2}{n(n+2)}$, que es también su ECM.

Con $n=5$ y $\theta = 1$:

| Estimador | Sesgo | Varianza | ECM | Estimación con los datos del problema |
|---|---:|---:|---:|---:|
| $2\bar X$ | 0 | 0,0667 | 0,0667 | 1,072 |
| $M$ | $-0{,}167$ | 0,0198 | 0,0476 | 0,740 |
| $\tfrac{6}{5}M$ | 0 | 0,0286 | **0,0286** | 0,888 |

![Figura 1. Distribución muestral de los tres estimadores de θ con n = 5 y θ = 1, obtenida simulando 200.000 muestras. La línea verde discontinua es el valor verdadero; la blanca, la media del estimador. El máximo está sesgado hacia abajo pero oscila mucho menos que 2X̄; el máximo corregido conserva la poca varianza y elimina el sesgo.](figuras/estadistica/c01-uniforme-estimadores.png)

Tres lecciones de la tabla y de la figura 1:

1. **Ser insesgado no basta.** $2\bar X$ es insesgado y es el peor de los tres. Su ECM decrece como $1/n$, mientras que el del máximo corregido lo hace como $1/n^2$: con $n=100$, el primero es unas 34 veces peor.
2. **Un estimador sesgado puede ganar a uno insesgado.** $M$ tiene sesgo y aun así tiene menos ECM que $2\bar X$.
3. **El sesgo, si se conoce, se corrige.** Multiplicar $M$ por $(n+1)/n$ elimina el sesgo a costa de aumentar un poco la varianza, y el resultado es el mejor de los tres.

**Antes de seguir: a ojo, en la figura.** Sin calcular nada: en la figura 1, ¿qué estimador produce más a menudo valores mayores que 1,5? ¿Y cuáles no pueden producirlos nunca?

:::solucion Respuesta
$2\bar X$, el único con cola derecha apreciable: si salen varios valores grandes, la media se dispara. $M$ nunca pasa de $\theta=1$, porque ningún dato puede superarlo, y $\tfrac65 M$ nunca pasa de $1{,}2$.
:::

---

## 7. Sesgar a propósito: el encogimiento

El problema 0 parece un caso raro. No lo es: en ML se introduce sesgo **a propósito** constantemente, y la descomposición del ECM explica por qué.

Toma una población con media $\mu$ y varianza $\sigma^2$, y considera la familia de estimadores **encogidos** hacia cero:

$$\hat\theta_c = c\,\bar X,\qquad c\in[0,1].$$

Con $c=1$ es la media muestral; con $c=0$ es el estimador absurdo «siempre 0». Calculamos:

- **Sesgo:** $\mathbb E[c\bar X]-\mu = (c-1)\mu$.
- **Varianza:** $c^2\sigma^2/n$.
- **ECM:** $\mathrm{ECM}(c) = (1-c)^2\mu^2 + c^2\dfrac{\sigma^2}n$.

Es una parábola en $c$. Derivando e igualando a cero, $-2(1-c)\mu^2 + 2c\,\sigma^2/n = 0$, de donde

$$c^* = \frac{\mu^2}{\mu^2+\sigma^2/n}<1.$$

Siempre que $\sigma^2/n>0$, **el óptimo es encoger**: aceptar un poco de sesgo compra más reducción de varianza de la que cuesta. Con $\mu = 1$, $\sigma=2$ y $n=10$: $c^* = 1/1{,}4 \approx 0{,}71$, y el ECM baja de $\sigma^2/n = 0{,}40$ a $0{,}29$, un 29 % menos.

Hay un problema evidente: $c^*$ depende de $\mu$, que es justo lo que queremos estimar. En la práctica, $c$ se elige por otros medios: con validación cruzada (en ML) o con un *prior* (en la conferencia 9, donde «encoger hacia la media global» será la forma bayesiana de tratar las tasas con pocos datos). Lo que no cambia es el mecanismo, y la escena siguiente te deja verlo.

```escena
{"archivo": "escenas/estadistica/ecm-encogimiento.js", "titulo": "Sesgo, varianza y ECM del estimador encogido", "pie": "Paso 1: la distribución muestral de X̄ (cian) está centrada en μ (verde). Paso 2: al encoger con c < 1 se desplaza (sesgo, en ámbar) y se estrecha. Pasos 3-4: sesgo², varianza y su suma, el ECM, con su mínimo c* en verde. Arrastra el punto ciruela o mueve c, n y σ: con n grande o σ pequeña, encoger apenas compensa."}
```

Observa en la escena:

1. **Paso 1.** La distribución de $\bar X$ está centrada en $\mu$, con anchura $\sigma/\sqrt n$. Las cuarenta bolitas son estimaciones de cuarenta muestras distintas.
2. **Paso 2.** Al multiplicar por $c<1$, la campana se desplaza hacia cero (aparece el sesgo) y a la vez se estrecha (baja la varianza).
3. **Paso 3.** El sesgo al cuadrado crece al alejarse de $c=1$; la varianza crece al acercarse.
4. **Paso 4.** Su suma, el ECM, tiene el mínimo en $c^*<1$. Prueba con $n=60$: $c^*$ se acerca a 1, porque con muchos datos la varianza ya es pequeña y encoger no compensa. Prueba con $\sigma=4$ y $n=3$: el óptimo es encoger muchísimo.

**La conexión con ML.** La regresión *ridge* minimiza $\lVert y - Xw\rVert^2 + \lambda\lVert w\rVert^2$, y su solución $\hat w_\lambda = (X^\top X + \lambda I)^{-1}X^\top y$ es un estimador encogido hacia cero de los coeficientes: con $\lambda>0$ está sesgado y tiene menos varianza que mínimos cuadrados. Cuando en ML se dice «la regularización reduce la varianza a costa de algo de sesgo», se habla exactamente de esto.

:::pista Antes de seguir
Con $\mu=1$ y $\sigma=2$, ¿a partir de qué $n$ el encogimiento óptimo reduce el ECM menos de un 5 % respecto de $\bar X$? Usa que $\mathrm{ECM}(c^*) = \dfrac{\mu^2\,\sigma^2/n}{\mu^2+\sigma^2/n}$ (compruébalo sustituyendo $c^*$).
:::

:::solucion Respuesta
El cociente $\mathrm{ECM}(c^*)/\mathrm{ECM}(1) = \dfrac{\mu^2}{\mu^2+\sigma^2/n} = c^*$. La reducción relativa es $1-c^* = \dfrac{\sigma^2/n}{\mu^2+\sigma^2/n}$. Pedimos que sea menor que $0{,}05$: $\sigma^2/n < 0{,}05\,(\mu^2 + \sigma^2/n)$, es decir, $0{,}95\,\sigma^2/n < 0{,}05$, o sea $n > 19\,\sigma^2/\mu^2 = 76$. Con más de 76 datos, encoger aporta menos de un 5 %. **Moraleja:** las técnicas de encogimiento importan sobre todo con pocos datos, que es tu caso.
:::

---

## 8. Consistencia: lo mínimo que se le pide a un estimador

Sesgo y varianza son propiedades para un $n$ fijo. También queremos que, con más datos, el estimador se acerque a la verdad.

> **Definición 9 (consistencia).** Una sucesión de estimadores $\hat\theta_n$ es **consistente** para $\theta$ si converge en probabilidad a $\theta$: para todo $\varepsilon>0$,
> $$\lim_{n\to\infty} P_\theta\big(|\hat\theta_n-\theta|>\varepsilon\big) = 0.$$

> **Proposición 1 (consistencia en media cuadrática).** Si $\mathrm{ECM}(\hat\theta_n)\to0$, entonces $\hat\theta_n$ es consistente. En particular, basta con que el sesgo y la varianza tiendan a cero.

**Demostración.** Por la desigualdad de Markov aplicada a la variable no negativa $(\hat\theta_n-\theta)^2$,

$$P\big(|\hat\theta_n-\theta|>\varepsilon\big) = P\big((\hat\theta_n-\theta)^2>\varepsilon^2\big) \le \frac{\mathbb E[(\hat\theta_n-\theta)^2]}{\varepsilon^2} = \frac{\mathrm{ECM}(\hat\theta_n)}{\varepsilon^2}\longrightarrow 0.\qquad\blacksquare$$

Así, $\bar X$ es consistente (ECM $=\sigma^2/n$), $\hat\sigma^2$ también (su sesgo $-\sigma^2/n$ tiende a cero: es **asintóticamente insesgado**) y los tres estimadores del problema 0 lo son. La ley débil de los grandes números es exactamente la consistencia de $\bar X$.

La consistencia es un requisito mínimo, no un elogio: dice que con infinitos datos aciertas, pero no cuántos datos necesitas. Para eso sirven el error típico y el ECM.

---

## 9. Sesgo y varianza en aprendizaje automático: la analogía y la diferencia

En los cursos de ML oirás hablar del «dilema sesgo-varianza» de un modelo. Es la misma descomposición, aplicada a otro estimador. Conviene verlo con precisión, porque la analogía es útil pero tiene trampas.

### La descomposición del error de predicción

Supón que los datos siguen $Y = f(x) + \varepsilon$, con $\mathbb E[\varepsilon]=0$, $\operatorname{Var}(\varepsilon)=\sigma^2$ y $\varepsilon$ independiente de todo lo demás. Entrenas un modelo con un conjunto de entrenamiento aleatorio $\mathcal D$ y obtienes una función $\hat f_{\mathcal D}$. Fija un punto $x$. Entonces $\hat f_{\mathcal D}(x)$ es **un estimador del número $f(x)$**, y lo aleatorio es el conjunto de entrenamiento. Para un $Y$ nuevo en ese $x$,

$$\mathbb E_{\mathcal D,\varepsilon}\Big[\big(Y-\hat f_{\mathcal D}(x)\big)^2\Big] = \underbrace{\sigma^2}_{\text{ruido irreducible}} + \underbrace{\big(\mathbb E_{\mathcal D}[\hat f_{\mathcal D}(x)] - f(x)\big)^2}_{\text{sesgo}^2} + \underbrace{\operatorname{Var}_{\mathcal D}\big(\hat f_{\mathcal D}(x)\big)}_{\text{varianza}}.$$

La prueba es el teorema 1 más un paso: como $Y - \hat f = \varepsilon + (f(x) - \hat f)$ y $\varepsilon$ es independiente de $\mathcal D$ con media cero, el cuadrado esperado se separa en $\sigma^2 + \mathrm{ECM}(\hat f_{\mathcal D}(x))$, y el ECM se descompone por el teorema 1. Los detalles están en la [demostración para valientes 1](nodos/estadistica/v01-ecm.md).

### Lo que se parece y lo que no

| | Estimador clásico | Modelo de ML |
|---|---|---|
| Qué se estima | un número $\theta$ | una función $f$ (un número por cada $x$) |
| Qué es aleatorio | la muestra | el conjunto de entrenamiento (y la semilla) |
| Sesgo | $\mathbb E[\hat\theta]-\theta$ | falta de capacidad: el modelo no puede representar $f$ |
| Varianza | oscilación entre muestras | sensibilidad a qué ejemplos tocaron en el entrenamiento |
| Ruido | no aparece | $\sigma^2$: ningún modelo baja de ahí |
| Se controla con | la elección del estimador, $n$ | complejidad, regularización, $n$, promediar modelos |

Tres diferencias que importan:

1. **En ML no se puede medir el sesgo ni la varianza de un modelo con un solo conjunto de datos**, porque requieren promediar sobre muchos conjuntos de entrenamiento. Lo que sí ves son sus síntomas: el error de entrenamiento y el de validación. El diagnóstico de tu prueba (el modelo A con 2 % y 25 % sufre de varianza; el B con 24 % y 25 %, de sesgo) es un **razonamiento cualitativo** basado en esos síntomas, no un cálculo de la descomposición. Lo trabajarás a fondo en «Aprendizaje automático I».
2. **El «sesgo» de ML no es el sesgo de un estimador de la evaluación.** Son dos estimadores distintos con dos sesgos distintos. Uno es el modelo, $\hat f$, como estimador de $f$. El otro es la métrica que calculas, por ejemplo $\hat p$, como estimador de la exactitud verdadera del modelo. Esta asignatura trata casi siempre del **segundo**.
3. **Promediar reduce varianza, no sesgo.** Promediar $B$ modelos entrenados de forma independiente divide la varianza entre $B$ y deja el sesgo igual. Si están correlacionados con correlación $\rho$, la varianza del promedio tiende a $\rho\sigma^2$, no a cero (lo viste en Probabilidad, conferencia 7). Es la base de *bagging* y de los *random forests*.

### El estimador que de verdad te importa: la métrica de evaluación

Vuelve al segundo estimador de la lista. Para una métrica medida sobre un conjunto, hay tres situaciones típicas:

- **Error de entrenamiento:** estimador **sesgado hacia el optimismo** del error verdadero, por la misma razón que $\hat\sigma^2$ subestima la varianza: el modelo se ajustó a esos datos.
- **Error en un conjunto de prueba limpio:** estimador **insesgado**, con un error típico que puedes calcular (sección 5).
- **Error del mejor de muchos modelos en el conjunto de validación:** de nuevo **sesgado hacia el optimismo**, porque elegir el máximo de varias estimaciones ruidosas es como el estimador $M$ del problema 0, pero al revés: el máximo de medidas ruidosas sobreestima. Lo cuantificarás en la conferencia 7 y en la práctica 3, con datos sin ninguna señal.

:::pista Antes de seguir
Entrenas 30 configuraciones de un modelo y eliges la que tiene menor error en validación: un 18 %. Las 30 tienen, en realidad, el mismo error verdadero, del 22 %. ¿Qué propiedad del estimador «error de la configuración elegida» explica que veas un 18 %?
:::

:::solucion Respuesta
El **sesgo**. Cada error de validación es un estimador insesgado del 22 %, pero con su propio ruido. Al quedarte con el **mínimo** de 30 estimaciones ruidosas, te quedas sistemáticamente con la que tuvo más suerte: $\mathbb E[\min_j \hat e_j] < 22\,\%$ aunque cada $\mathbb E[\hat e_j] = 22\,\%$. El estimador «error del ganador» está sesgado hacia abajo. La forma de obtener una estimación insesgada del modelo elegido es evaluarlo en un conjunto de prueba que no se usó para elegir.
:::

---

## 10. Errores típicos y cómo detectarlos

1. **Confundir la desviación típica de los datos con el error típico del estimador.** Si dices «la exactitud es 0,86 ± 0,35» has puesto $\sqrt{p(1-p)}$, la desviación típica de una Bernoulli, en vez de $\sqrt{p(1-p)/n}$. **Detección:** un error típico tiene que hacerse más pequeño al aumentar $n$. Si tu «barra de error» no depende de $n$, no es un error típico.
2. **Creer que insesgado significa bueno.** El ejemplo de $2\bar X$ lo desmiente. **Detección:** pregunta siempre por el ECM o, al menos, por la varianza.
3. **Usar `np.var` sin pensar en `ddof`.** NumPy divide entre $n$ y pandas entre $n-1$. Con $n=5$ la diferencia es del 25 %. **Detección:** escribe siempre `ddof` explícitamente.
4. **Tratar observaciones dependientes como independientes.** Los fotogramas de un vídeo, varias fotos de la misma hoja o días consecutivos no son i.i.d.; la fórmula $\sigma/\sqrt n$ subestima el error típico, a veces muchísimo. **Detección:** pregúntate «si quito este ejemplo, ¿hay otro casi igual en los datos?».
5. **Medir la calidad de un modelo con el mismo conjunto con que lo elegiste.** Es un estimador sesgado. **Detección:** si el número sale del mismo conjunto en que comparaste alternativas, no es una estimación insesgada.
6. **Confundir el parámetro con la estimación al hablar.** «La exactitud del modelo es 0,86» es falso; «la exactitud medida en 200 ejemplos es 0,86, con un error típico de 0,025» es correcto.

## Ideas que te llevas

- **Toda métrica calculada sobre datos es un estimador**, con su distribución muestral. Antes de interpretarla pregunta: ¿qué población?, ¿qué parámetro?, ¿qué sesgo?, ¿qué error típico?
- **$\mathrm{SE}(\hat p)=\sqrt{p(1-p)/n}$**, con la cota $1/(2\sqrt n)$. Con 200 ejemplos, unos 2,5 puntos.
- **Ley de la raíz de $n$:** cuatro veces más datos para la mitad de error.
- **$\mathrm{ECM}=\mathrm{sesgo}^2+\mathrm{varianza}$**, probado sumando y restando la media. Sirve para comparar estimadores y para entender la regularización.
- **El encogimiento** cambia un poco de sesgo por mucha varianza, sobre todo con pocos datos.
- **Ajustar y medir con los mismos datos da estimaciones optimistas** ($\hat\sigma^2$, error de entrenamiento, el mejor de muchos modelos).
- **Simular la distribución muestral** con una matriz `R × n` y `mean(axis=1)` es la herramienta universal para comprobar cualquier afirmación de la asignatura.

## Preguntas de recuperación

Respóndelas sin mirar el texto; después compruébalo.

1. Define sesgo, varianza y ECM de un estimador. ¿Cuál de los tres puede ser negativo?
2. Escribe la descomposición del ECM y el truco algebraico de su demostración.
3. ¿Por qué $\frac1n\sum(X_i-\bar X)^2$ subestima la varianza? Da la razón intuitiva y el valor exacto del sesgo.
4. Una exactitud del 90 % medida en 400 ejemplos: calcula su error típico.
5. ¿Cuántos ejemplos de prueba necesitas para que el error típico de cualquier exactitud sea como máximo de 1 punto?
6. Pon un ejemplo de estimador sesgado con menos ECM que uno insesgado.
7. ¿Qué es lo aleatorio cuando se habla de la varianza de un modelo de ML? ¿Y cuando se habla del error típico de su exactitud de prueba?
8. ¿Por qué el error del mejor de 50 modelos en validación es un estimador optimista?

:::solucion Respuestas
1. $\operatorname{sesgo} = \mathbb E[\hat\theta]-\theta$; $\operatorname{Var}=\mathbb E[(\hat\theta-\mathbb E\hat\theta)^2]$; $\mathrm{ECM}=\mathbb E[(\hat\theta-\theta)^2]$. Solo el sesgo puede ser negativo.
2. $\mathrm{ECM} = \operatorname{sesgo}^2 + \operatorname{Var}$. Se suma y resta $\mathbb E[\hat\theta]$ dentro del cuadrado; el término cruzado tiene esperanza cero.
3. Porque $\bar X$ es el centro que minimiza la suma de cuadrados de esta muestra, así que las desviaciones respecto de él son menores que respecto de $\mu$. El sesgo es $-\sigma^2/n$.
4. $\sqrt{0{,}9\cdot0{,}1/400} = 0{,}3/20 = 0{,}015$: 1,5 puntos.
5. $1/(2\sqrt n)\le 0{,}01 \iff \sqrt n\ge 50 \iff n\ge 2500$.
6. El máximo $M$ frente a $2\bar X$ en la uniforme; o $c^*\bar X$ frente a $\bar X$.
7. En el modelo, el conjunto de entrenamiento (y la semilla). En la exactitud de prueba, el conjunto de prueba.
8. Porque se elige el mínimo de muchas estimaciones ruidosas, y el mínimo selecciona errores de medida favorables: su esperanza es menor que el error verdadero.
:::

## Lecturas

- **Espejo Miranda et al., *Inferencia estadística* (Univ. de Cádiz, 2007)**, [PDF](recursos/estadistica/uca-inferencia-estadistica.pdf): cap. 2, § 1-2 (conceptos de estadístico y estimador) y § 5 (propiedades de los estimadores: insesgadez, error cuadrático medio, eficiencia y consistencia), p. 11-30. Haz los problemas resueltos de insesgadez del final del capítulo.
- **Yohai, *Notas de Probabilidades y Estadística***, [PDF](recursos/estadistica/yohai-notas-probabilidades.pdf): cap. 10 (leyes de los grandes números), para repasar la consistencia de $\bar X$.
- **Fernández Casal, Costa y Oviedo de la Fuente, *Métodos predictivos de aprendizaje estadístico* (2024)**, [PDF](recursos/estadistica/fernandez-costa-oviedo-aprendizaje.pdf): § 1.3.1 (equilibrio entre sesgo y varianza: infraajuste y sobreajuste), para la versión de ML de la sección 9.
