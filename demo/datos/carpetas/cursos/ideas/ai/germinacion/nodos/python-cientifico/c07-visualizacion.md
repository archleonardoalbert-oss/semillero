# Conferencia 7. Visualización y análisis exploratorio

> **Objetivos.** Al terminar esta conferencia serás capaz de:
>
> 1. **Elegir** el tipo de gráfico a partir de la pregunta (distribución, comparación entre grupos, relación, evolución, composición) y **justificar** la elección.
> 2. **Construir** gráficos con la interfaz de objetos de matplotlib (`fig, ax`) y con seaborn, con ejes, unidades y escalas honestas.
> 3. **Ejecutar** un análisis exploratorio con una lista de comprobaciones fija que **encuentre problemas en los datos antes de modelar**: centinelas, cambios de unidad, huecos, censura y fugas.
> 4. **Detectar** cuándo un gráfico engaña (ejes truncados, bins mal elegidos, sobretrazado) y **corregirlo**.

> **Prerrequisitos.** [Conferencias 5](c05-datos-sucios.md) y [6](c06-agregar.md): leer, limpiar, agrupar y remuestrear. Estadística descriptiva (media, mediana, cuartiles, correlación), que marcaste como conocida en el diagnóstico.

---

## 1. Motivación: los resúmenes numéricos no bastan

> **Problema para pensar (5 minutos).** Tienes cuatro conjuntos de 11 puntos $(x, y)$. En los cuatro:
> - la media de $x$ es 9 y su varianza, 11;
> - la media de $y$ es 7,50 y su varianza, 4,12;
> - la correlación es 0,816;
> - la recta de regresión es $y = 3{,}00 + 0{,}500\,x$.
>
> ¿Se parecen los cuatro conjuntos? ¿Ajustarías el mismo modelo a los cuatro? Decide antes de mirar la figura 1.

![Figura 1. El cuarteto de Anscombe (1973). Mismas medias, varianzas, correlación y recta de regresión. I es una relación lineal con ruido; II, una curva; III, una recta perfecta con un valor anómalo; IV, sin relación salvo por un único punto que fabrica la correlación.](figuras/python-cientifico/anscombe.png)

Anscombe construyó estos datos para demostrar una idea que sigue siendo la razón de esta conferencia: **un modelo, una métrica o un resumen numérico pueden ser idénticos para datos que cuentan historias opuestas**. Solo mirándolos se ve que en II hace falta un término cuadrático, que en III un punto arrastra la recta y que en IV toda la «correlación» depende de una sola observación. Ninguna métrica de validación te lo habría dicho.

Para ti, con la prioridad del empleo, hay una segunda razón: en un proyecto de portafolio, el análisis exploratorio es lo que demuestra que entiendes el problema y no solo que sabes llamar a `fit`.

---

## 2. Matplotlib: la interfaz de objetos

Matplotlib tiene dos interfaces. La de **estado** (`plt.plot(...)`, `plt.title(...)`) actúa sobre «la figura actual»; es cómoda para un gráfico rápido y confusa en cuanto hay varios. Usa siempre la de **objetos**:

```python
import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(7, 4))           # una figura con un sistema de ejes
ax.plot(fechas, unidades, color="tab:blue", lw=1.5, label="diarias")
ax.plot(fechas, media7, color="tab:orange", lw=2, label="media móvil 7 días")
ax.set(title="Ventas de arroz, tienda Centro",
       xlabel="fecha", ylabel="unidades por día")
ax.legend()
fig.tight_layout()
fig.savefig("figuras/arroz.png", dpi=150)
```

> **Definición 1 (anatomía).** Una **figura** (`Figure`) es el lienzo. Contiene uno o varios **ejes** (`Axes`), cada uno un gráfico con su sistema de coordenadas, sus marcas (`ticks`), sus etiquetas y su leyenda. `plt.subplots(f, c)` crea una cuadrícula de $f \times c$ ejes y devuelve un arreglo de NumPy con ellos.

```python
fig, axs = plt.subplots(2, 2, figsize=(10, 7), sharex=True)
axs[0, 0].hist(x, bins=40)
axs[0, 1].scatter(x, y, s=8, alpha=0.4)
for ax in axs.flat:            # recorrer todos los ejes
    ax.grid(alpha=0.3)
```

Lo mínimo que todo gráfico necesita: **título que diga qué se ve, ejes con nombre y unidades, y una leyenda si hay más de una serie**. Un gráfico sin unidades no se puede interpretar.

### 2.1. seaborn: gráficos estadísticos desde un `DataFrame` largo

seaborn construye sobre matplotlib y entiende las tablas en **formato largo** ([conferencia 6](c06-agregar.md)): le dices qué columna va en cada eje y cuál define el color o los paneles.

```python
import seaborn as sns

sns.histplot(data=ventas, x="precio", hue="tienda", bins=40, element="step", ax=ax)
sns.boxplot(data=ventas, x="tienda", y="precio", ax=ax)
sns.scatterplot(data=ventas, x="precio", y="unidades", hue="producto", alpha=0.5, ax=ax)
sns.lineplot(data=semanal, x="fecha", y="unidades", hue="producto", ax=ax)
sns.relplot(data=semanal, x="fecha", y="unidades", col="producto", col_wrap=3, kind="line")   # pequeños múltiplos
sns.heatmap(tabla.corr(numeric_only=True), vmin=-1, vmax=1, cmap="BrBG", annot=True, ax=ax)
```

Las funciones con `ax=` (*axes-level*) dibujan en unos ejes que tú creas; `relplot`, `displot` y `catplot` (*figure-level*) crean su propia figura con paneles. Usa las primeras cuando compongas una figura a mano y las segundas para pequeños múltiplos.

---

## 3. Elegir el gráfico por la pregunta

El tipo de gráfico **no se elige por gusto: lo decide la pregunta**. La figura 2 muestra los seis casos más comunes.

![Figura 2. Seis preguntas y el gráfico que las responde: distribución (histograma), comparación entre grupos (cajas), relación entre dos variables (dispersión), evolución (líneas), magnitud por categoría (barras ordenadas que empiezan en 0) y asociación entre muchas variables (mapa de calor con escala divergente).](figuras/python-cientifico/galeria-preguntas.png)

| Pregunta | Gráfico | Alternativas | Evita |
|---|---|---|---|
| ¿Cómo se distribuye una variable? | histograma | densidad (KDE), ECDF, `boxplot` | un histograma con 5 *bins* |
| ¿Difieren los grupos? | cajas (`boxplot`) | violines, puntos con dispersión (`stripplot`) | barras con la media sola |
| ¿Se relacionan dos variables numéricas? | dispersión | `hexbin` o densidad 2D si hay muchos puntos | líneas que unen puntos sin orden |
| ¿Cómo cambia en el tiempo? | líneas | pequeños múltiplos por grupo | barras por día con muchos días |
| ¿Cuánto hay en cada categoría? | barras horizontales **ordenadas**, desde 0 | puntos (*dot plot*) | tartas con más de 3 sectores |
| ¿Qué variables van juntas? | mapa de calor de correlaciones | matriz de dispersión (`pairplot`) | colores arcoíris |

Cuatro reglas de honestidad:

1. **Las barras empiezan en 0.** La longitud de una barra *es* el valor; si cortas el eje, una diferencia del 3 % parece del 300 %. Las líneas y los puntos sí pueden tener el eje recortado (codifican posición, no longitud).
2. **Una escala por eje.** Nunca dos ejes verticales con escalas distintas en el mismo gráfico: el lector compara alturas que no son comparables y cualquier «cruce» es un artefacto de la escala elegida. Si hay dos magnitudes, dos paneles.
3. **Escala logarítmica para variables con cola larga** (precios, ingresos, tamaños) y para magnitudes que varían en órdenes de magnitud. Dilo en el eje.
4. **El color significa algo** y siempre lo mismo en todo el informe: una categoría, una magnitud (una escala de un solo tono, de claro a oscuro) o un signo (una escala divergente con el neutro en el 0, como en la correlación). No uses el arcoíris (`jet`): crea fronteras que no existen en los datos.

### 3.1. Tres trampas frecuentes

- **Los *bins* del histograma cambian la historia.** Con pocos, una distribución bimodal parece unimodal; con demasiados, todo es ruido. Prueba varios, o usa la regla de Freedman-Diaconis (`bins="fd"`). La escena siguiente lo muestra.
- **El sobretrazado** (*overplotting*): con 100 000 puntos, una dispersión es una mancha. Usa transparencia (`alpha=0.1`), puntos pequeños, una muestra aleatoria o `hexbin`.
- **Las medias sin dispersión:** una barra con la media de cada grupo esconde si los grupos se solapan por completo. Muestra la distribución (cajas, puntos) o, al menos, un intervalo.

```escena
{"archivo": "escenas/python-cientifico/bins-histograma.js", "titulo": "El número de bins cambia lo que ves", "pie": "Los mismos 400 datos (precios de dos tipos de producto). Paso 1: los datos en una línea. Paso 2: el histograma con los bins que elijas. Paso 3: comparación con la regla de Freedman-Diaconis. Prueba con 4 bins y con 80."}
```

**Antes de seguir:** para cada pregunta, ¿qué gráfico harías? (a) ¿Las ventas del sábado son mayores que las del resto de días? (b) ¿Las tiendas con más existencias venden más? (c) ¿Cómo evolucionaron las ventas semanales de los 5 productos principales en 2025?

:::solucion Respuesta
(a) Cajas (o violines) de las ventas diarias por día de la semana: comparación entre 7 grupos, mostrando la dispersión, no solo la media. (b) Dispersión de existencias frente a ventas, una observación por tienda y día (cuidado: puede haber censura, sección 5). (c) Líneas: cinco en el mismo panel si se distinguen, o cinco pequeños múltiplos con el mismo eje y si se cruzan mucho.
:::

---

## 4. El análisis exploratorio como procedimiento

> **Definición 2 (análisis exploratorio de datos).** El análisis exploratorio (EDA, Tukey 1977) es el examen sistemático de unos datos **antes de modelarlos**, con dos fines: **entender** el fenómeno (distribuciones, relaciones, patrones temporales) y **encontrar problemas** (errores, sesgos, fugas) que invalidarían un modelo.

Un EDA no es «hacer muchos gráficos». Es responder una lista de preguntas en orden y anotar las respuestas. Esta es la lista que usarás en los proyectos:

1. **La pregunta y la unidad.** ¿Qué quieres predecir o entender? ¿Qué es una fila: una venta, un día, un cliente? ¿Qué filas *deberían* existir (todos los días, todos los productos)?
2. **Estructura y calidad** (la rutina de la [conferencia 5](c05-datos-sucios.md)): forma, tipos, faltantes, duplicados, cardinalidad.
3. **Cada variable por separado:** histograma de cada numérica (en log si tiene cola larga), barras de cada categórica. Busca centinelas, picos raros, valores imposibles.
4. **El tiempo**, si lo hay: la serie completa, a la frecuencia natural y agregada. Busca huecos, saltos de nivel, cambios de comportamiento y ceros sospechosos.
5. **Por grupos:** las mismas distribuciones por tienda, producto o fuente. Un problema que afecta a un solo grupo se esconde en el total.
6. **Relaciones:** cada variable frente a la variable objetivo; correlaciones entre las predictoras.
7. **Fugas y trampas para el modelo:** variables que predicen **demasiado** bien, variables que solo se conocen **después** del hecho, identificadores correlacionados con la etiqueta, duplicados que caerían a la vez en entrenamiento y en prueba.
8. **Conclusiones escritas:** una lista de hallazgos y de **decisiones** (qué se corrige, qué se descarta, qué se pregunta al dueño de los datos).

El punto 8 es el que convierte unos gráficos en un análisis. Sin él, nadie (ni tú dentro de un mes) sabe qué se decidió ni por qué.

---

## 5. Ejemplo resuelto: el EDA de una mipyme

> **Ejemplo 1.** Una tienda te da un año de ventas diarias (365 días) de un producto, el registro de precios de 1500 ventas en tres tiendas y las existencias al abrir de 400 días. Quiere predecir la demanda. Aplicamos la lista y encontramos cuatro problemas (figura 3). Los datos son sintéticos, pero los cuatro problemas son reales y frecuentes.

![Figura 3. Cuatro gráficos de un EDA, cuatro problemas: (1) un hueco de 13 días sin datos y 8 días con cero ventas consecutivos; (2) un precio centinela 999; (3) una tienda con la mitad de los registros en otra unidad; (4) ventas que nunca superan las existencias: la demanda está censurada.](figuras/python-cientifico/eda-ventas.png)

**Panel 1 (punto 4 de la lista: el tiempo).** La serie diaria tiene dos anomalías:

- **Un hueco** entre los días 150 y 163. No son ceros: son días sin registro (en la tabla, `NaN` o filas ausentes). *Decisión:* marcar el periodo como desconocido; no imputarlo como ventas normales ni como ceros.
- **Ocho días seguidos con ventas exactamente 0** (días 230-237) en un producto que vende unas 40 unidades diarias. La probabilidad de 8 ceros seguidos por azar es despreciable: casi seguro es una **rotura de inventario** (no había producto). *Decisión:* esos ceros **no son demanda cero**. Preguntar al dueño y, si se confirma, tratarlos como demanda desconocida.

¿Cómo se ve en código? `s.plot()` después de rellenar el calendario con `reindex` ([conferencia 6](c06-agregar.md)); sin rellenar, el hueco quedaría unido por una línea recta y no se vería.

**Panel 2 (punto 3: cada variable).** El histograma de precios es una campana con cola a la derecha… y una barra aislada en 999. Con `value_counts` se ve que son exactamente 25 ventas con precio 999. *Decisión:* centinela («precio pendiente»): convertir en faltante.

**Panel 3 (punto 5: por grupos).** Por tienda, Centro y Playa tienen precios en torno a 180-190 CUP. La caja de Cerro se estira desde casi 0 hasta 300. Al mirar sus datos, la mitad de sus registros están en torno a 1,85 y la otra mitad en torno a 185: **la mitad de los precios de esa tienda está en otra unidad** (un factor 100; quizá alguien los anotó en otra moneda o en cientos). El histograma global no lo mostraba porque los valores pequeños se perdían en el total. *Decisión:* preguntar, corregir con una regla documentada (`precio < 10 → precio × 100` en esa tienda y ese periodo) y comprobar que la caja corregida se parece a las demás.

**Panel 4 (punto 6: relaciones).** Las ventas frente a las existencias al abrir: los puntos nunca superan la diagonal $\text{ventas} = \text{existencias}$, y muchos están **sobre** ella. Cuando había pocas existencias, se vendió todo: la demanda real pudo ser mayor. Es **demanda censurada**. Un modelo entrenado con «ventas» como si fueran «demanda» aprenderá a predecir de menos justo en los días de más demanda. *Decisión:* marcar los días con ventas = existencias como censurados (lo tratarás en la asignatura de Series temporales: demanda intermitente y censura).

**Conclusiones escritas (punto 8):**

| Hallazgo | Evidencia | Decisión |
|---|---|---|
| 13 días sin registro | panel 1, `isna()` | marcar; no imputar |
| 8 ceros seguidos | panel 1 | probable rotura de inventario: preguntar; excluir como demanda |
| 25 precios = 999 | panel 2, `value_counts` | centinela → `NaN` |
| precios de Cerro ×100 | panel 3, `groupby` + cajas | corregir con regla documentada tras confirmar |
| ventas ≤ existencias | panel 4 | demanda censurada: variable `censurado` |

Ninguno de estos cuatro problemas produce un error de Python. Todos producen un modelo peor que parece bueno.

**Antes de seguir:** en el panel 4, ¿qué patrón verías si **no** hubiera censura, es decir, si la tienda nunca se quedara sin existencias?

:::solucion Respuesta
Una nube de puntos con ventas en torno a su media (unas 25 unidades), sin relación con las existencias y muy por debajo de la diagonal: las existencias no limitarían las ventas. La acumulación de puntos **sobre** la diagonal es la firma de la censura.
:::

---

## 6. Buscar fugas antes de modelar

La fuga de datos (*data leakage*) es el error más caro del ML: el modelo funciona de maravilla en la evaluación y falla en producción. Muchas fugas se ven en un EDA si se buscan a propósito:

- **Una variable predice demasiado bien.** Si una sola variable separa casi perfectamente las clases, desconfía antes de celebrar. ¿Se conoce **antes** de que ocurra lo que quieres predecir? Ejemplo: «fecha de devolución» para predecir si un pedido se devolverá.
- **Identificadores con señal.** Si el número de cliente o de factura se correlaciona con la etiqueta (porque se asignaron por orden y el fenómeno cambió en el tiempo), un modelo lo aprovechará.
- **Agregados que incluyen el futuro.** Una «media de ventas del producto» calculada con **todo** el año y usada para predecir enero.
- **Duplicados o casi duplicados** entre filas: si dos copias caen una en entrenamiento y otra en prueba, la prueba mide memoria, no generalización.

Un gráfico útil para todo esto: la variable objetivo frente a cada predictora, y la tasa de la clase positiva por valor de cada categórica. Cualquier cosa «demasiado limpia» merece una pregunta.

---

## 7. Un gráfico para publicar

En un repositorio de portafolio, los gráficos los verá un reclutador en diez segundos. La diferencia entre un gráfico de exploración y uno de comunicación:

- **Título que dice la conclusión**, no la variable: «Las ventas caen un 40 % en los días sin existencias», no «Ventas frente a existencias».
- **Solo lo necesario**: quita la rejilla pesada, los bordes superior y derecho y la leyenda si puedes rotular las líneas directamente.
- **Destaca lo importante con color** y deja el resto en gris.
- **Tamaño de letra legible** y la figura guardada en `png` a 150-200 ppp (o en `svg`).

```python
fig, ax = plt.subplots(figsize=(7, 3.5))
ax.plot(s.index, s, color="0.7", lw=1)                     # contexto, en gris
ax.plot(s.index, s.rolling(28).mean(), color="tab:blue", lw=2.5)
ax.axvspan(inicio_hueco, fin_hueco, color="tab:red", alpha=0.15)
ax.text(inicio_hueco, s.max(), "sin registros", color="tab:red", va="top")
ax.spines[["top", "right"]].set_visible(False)
ax.set(title="La demanda de arroz crece un 25 % en el año", ylabel="unidades por día")
```

---

## 8. Errores típicos y cómo detectarlos

| Error | Síntoma | Arreglo |
|---|---|---|
| Confiar en resúmenes numéricos | conclusiones como «r = 0,8, hay relación lineal» | grafica siempre (Anscombe) |
| Barras que no empiezan en 0 | diferencias exageradas | eje desde 0, o puntos |
| Dos ejes y con escalas distintas | «cruces» que no significan nada | dos paneles |
| Histograma con *bins* arbitrarios | modas ocultas o ruido | varios *bins*; `bins="fd"` |
| Dispersión con muchos puntos | una mancha | `alpha`, muestra, `hexbin` |
| Graficar la serie sin rellenar el calendario | huecos invisibles | `reindex` antes de `plot` |
| Mirar solo el total | problemas de un grupo escondidos | por grupos, pequeños múltiplos |
| EDA sin conclusiones escritas | gráficos que nadie interpreta | tabla de hallazgos y decisiones |
| Arcoíris como escala | fronteras falsas | un tono (magnitud) o divergente (signo) |

---

## 9. Ideas que te llevas

- **Los resúmenes pueden ser idénticos para datos opuestos:** mira los datos antes de modelarlos.
- **La pregunta elige el gráfico:** distribución → histograma; grupos → cajas; relación → dispersión; tiempo → líneas; categorías → barras ordenadas desde 0.
- **Interfaz de objetos de matplotlib** (`fig, ax = plt.subplots()`) y seaborn sobre tablas largas.
- **EDA = lista fija + conclusiones escritas.** Tiempo, variables, grupos, relaciones, fugas.
- **Los problemas graves no dan error:** centinelas, cambios de unidad, huecos, ceros de inventario, censura.

---

## 10. Preguntas de recuperación

1. ¿Qué demuestra el cuarteto de Anscombe y qué consecuencia práctica tiene?
2. ¿Qué gráfico usarías para comparar la distribución de precios entre 5 tiendas? ¿Por qué no barras con la media?
3. ¿Por qué las barras deben empezar en 0 y las líneas no necesariamente?
4. Enumera los ocho puntos de la lista del EDA.
5. ¿Cómo se ve la demanda censurada en un gráfico de ventas frente a existencias?
6. Da dos señales de una posible fuga de datos que puedes ver en un EDA.
7. ¿Por qué hay que rellenar el calendario antes de graficar una serie diaria?

:::solucion Respuestas
1. Que datos con las mismas medias, varianzas, correlación y recta de regresión pueden tener estructuras opuestas. Hay que graficar antes de modelar o de concluir.
2. Cajas o violines por tienda (con los puntos si son pocos). Las barras con la media esconden la dispersión y el solapamiento entre grupos.
3. Porque una barra codifica el valor con su **longitud**, que solo es proporcional al valor si empieza en 0; una línea o un punto lo codifican con su **posición**, que se lee igual con el eje recortado.
4. Pregunta y unidad; estructura y calidad; cada variable; el tiempo; por grupos; relaciones; fugas; conclusiones escritas.
5. Los puntos nunca superan la diagonal ventas = existencias y muchos se acumulan sobre ella.
6. Una variable que separa las clases casi perfectamente; un identificador o una fecha de registro correlacionados con la etiqueta; variables que solo se conocen después del hecho; duplicados.
7. Porque los días sin filas no aparecen, y la línea los une con un segmento recto: los huecos y los ceros se vuelven invisibles.
:::

---

## 11. Lecturas

- **Data Carpentry, «Análisis y visualización de datos usando Python»** (`https://datacarpentry.github.io/python-ecology-lesson-es/`), en español, CC BY 4.0: episodio 9 («Entrada de datos y visualización: Matplotlib y Pandas»).
- **Matplotlib, «Quick start guide»** (`https://matplotlib.org/stable/users/explain/quick_start.html`), en inglés: la anatomía de una figura y la interfaz de objetos.
- **seaborn, «User guide and tutorial»** (`https://seaborn.pydata.org/tutorial.html`), en inglés: las secciones sobre distribuciones, gráficos categóricos y pequeños múltiplos.
- **Anscombe, F. J. (1973). «Graphs in Statistical Analysis». *The American Statistician*, 27(1), 17-21**: el artículo original, breve y todavía actual.
- **Amat Rodrigo, J., «Análisis de normalidad»** y **«Correlación lineal con Python»** (cienciadedatos.net), en español: cómo combinar gráficos y pruebas al explorar.
