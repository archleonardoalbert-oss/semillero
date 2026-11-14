# Conferencia 6. pandas II: agregar y reorganizar

> **Objetivos.** Al terminar esta conferencia serás capaz de:
>
> 1. **Usar** `groupby` con `agg` (una fila por grupo) y con `transform` (una fila por fila original), y **elegir** entre los dos según la pregunta.
> 2. **Resolver** en 2-4 líneas problemas del tipo «para cada tienda, el producto más vendido».
> 3. **Combinar** tablas con `merge` **sin multiplicar filas**: predecir el número de filas del resultado, validar la cardinalidad y encontrar las claves que no casan.
> 4. **Reorganizar** entre formato largo y ancho con `pivot_table` y `melt`.
> 5. **Aplicar** `resample` (cambiar de frecuencia) y `rolling` (ventanas móviles) a series temporales, también por grupos, **rellenando** el calendario cuando faltan días.

> **Prerrequisitos.** [Conferencia 5](c05-datos-sucios.md): leer y limpiar, `loc`, máscaras, el índice y la copia al escribir. De NumPy, las reducciones por eje ([conferencia 3](c03-vectores.md)): un `groupby` es una reducción por eje… sobre grupos.

---

## 1. Motivación

El segundo ejercicio del diagnóstico quedó en blanco:

> Tienes un `DataFrame`, `ventas`, con las columnas `tienda`, `producto`, `fecha` y `unidades` (una fila por venta). Escribe el código, de 2 a 4 líneas, que dé para cada `tienda` el `producto` con más unidades vendidas en total.

Y el quinto ejercicio de la prueba de entrada pide, con ventas diarias, las unidades **semanales** por producto y su **media móvil de 4 semanas**.

Las dos cosas son el pan de cada día de quien trabaja con datos de negocio, y las dos son la base de la asignatura de Series temporales y del Proyecto 2 (predicción de demanda). Al final de esta conferencia las resolverás en pocas líneas, y sabrás por qué cada línea es así.

> **Problema para pensar (10 minutos).** Antes de leer, intenta el ejercicio del diagnóstico con lo que sabes: `groupby`, `sum`, `sort_values`, `max`… Una pista: el problema tiene **dos** niveles de agrupación. ¿Cuáles? Escribe tu intento, aunque no funcione; lo corregimos en la sección 3.

---

## 2. *Split-apply-combine*

> **Definición 1 (dividir-aplicar-combinar).** `df.groupby(claves)` hace tres cosas:
> 1. **divide** las filas en grupos según los valores de las claves;
> 2. **aplica** una función a cada grupo;
> 3. **combina** los resultados en una tabla.
>
> Lo que decide la forma del resultado es el tipo de función:
> - **agregación** (`agg`): cada grupo se reduce a **un valor** → una fila por grupo;
> - **transformación** (`transform`): cada grupo devuelve **un valor por fila** → el resultado tiene el **mismo índice que `df`** y se puede añadir como columna;
> - **filtro** (`filter`): cada grupo se conserva o se descarta entero.

La escena siguiente muestra los tres pasos con una tabla pequeña y la diferencia entre `agg` y `transform`.

```escena
{"archivo": "escenas/python-cientifico/groupby.js", "titulo": "groupby: dividir, aplicar, combinar (agg frente a transform)", "pie": "Paso 1: la tabla. Paso 2: se divide por tienda. Paso 3: agg reduce cada grupo a una fila. Paso 4: transform devuelve el resultado del grupo a cada fila original. Cambia la función (suma o media) y mueve las unidades de una fila."}
```

### 2.1. Agregaciones

```python
ventas.groupby("tienda")["unidades"].sum()            # Series: una suma por tienda
ventas.groupby(["tienda", "producto"])["unidades"].sum()   # índice de dos niveles (MultiIndex)
ventas.groupby("tienda", as_index=False)["unidades"].sum() # las claves como columnas, no como índice
```

Para varias estadísticas a la vez, la **agregación con nombre** es la forma más legible: cada argumento es `nombre_de_salida=(columna, función)`:

```python
resumen = ventas.groupby("tienda").agg(
    unidades_total=("unidades", "sum"),
    unidades_media=("unidades", "mean"),
    n_ventas=("unidades", "size"),
    n_productos=("producto", "nunique"),
    primera_venta=("fecha", "min"),
)
```

Las funciones como texto (`"sum"`, `"mean"`, `"median"`, `"std"`, `"min"`, `"max"`, `"count"`, `"size"`, `"nunique"`, `"first"`, `"last"`) están optimizadas en C. Una `lambda` funciona, pero llama a Python **una vez por grupo**: con miles de grupos, es mucho más lenta.

### 2.2. Transformaciones

`transform` responde preguntas **sobre cada fila en relación con su grupo**:

```python
g = ventas.groupby("tienda")["unidades"]
ventas["total_tienda"] = g.transform("sum")                    # el total de la tienda, en cada fila
ventas["cuota"] = ventas["unidades"] / g.transform("sum")      # qué fracción de su tienda es cada venta
ventas["z_tienda"] = (ventas["unidades"] - g.transform("mean")) / g.transform("std")   # estandarizar por grupo
ventas["rango_en_tienda"] = g.rank(ascending=False)            # el puesto de cada venta en su tienda
```

Compara con NumPy: `X - X.mean(axis=0)` restaba a cada fila la media de su columna gracias al *broadcasting*. `transform` es lo mismo con grupos de tamaño variable: «devuelve a cada fila el resultado de su grupo». En la conferencia 5 ya lo usaste para detectar precios anómalos por producto.

### 2.3. Filtrar grupos

```python
ventas.groupby("producto").filter(lambda d: len(d) >= 30)   # solo productos con al menos 30 ventas
```

Equivalente, y más rápido con muchos grupos: `ventas[ventas.groupby("producto")["unidades"].transform("size") >= 30]`.

> **Observación 1 (`groupby` en pandas 3).**
> - Los **faltantes en la clave** se descartan por defecto: las filas con `tienda` = `NaN` no aparecen en ningún grupo. Para verlas, `dropna=False`.
> - Con claves de tipo `category`, por defecto (`observed=True`) solo salen las categorías **presentes**.
> - El resultado se **ordena** por las claves (`sort=True`); `sort=False` conserva el orden de aparición y es más rápido.

**Antes de seguir:** quieres añadir a cada venta una columna con la media de unidades **de su producto en su tienda**. ¿`agg` o `transform`? Escribe la línea.

:::solucion Respuesta
`transform`, porque el resultado debe tener una fila por venta. `ventas["media_tp"] = ventas.groupby(["tienda", "producto"])["unidades"].transform("mean")`.
:::

---

## 3. El ejercicio del diagnóstico, resuelto

> **Ejemplo 1 (para cada tienda, el producto con más unidades).**
>
> **Paso 1 (dos niveles).** «Con más unidades vendidas **en total**» exige sumar primero las ventas de cada par (tienda, producto). Luego, **dentro de cada tienda**, elegir el par con la suma máxima. Son dos agrupaciones: por `(tienda, producto)` y por `tienda`.
>
> **Paso 2 (totales por par).**
> ```python
> tot = ventas.groupby(["tienda", "producto"], as_index=False)["unidades"].sum()
> ```
> `tot` tiene una fila por par, con columnas `tienda`, `producto` y `unidades`.
>
> **Paso 3 (el máximo de cada tienda).** `idxmax` devuelve la **etiqueta** de la fila con el máximo de cada grupo; con esas etiquetas se seleccionan las filas completas:
> ```python
> mejor = tot.loc[tot.groupby("tienda")["unidades"].idxmax()]
> ```
>
> **Por qué funciona.** `tot.groupby("tienda")["unidades"].idxmax()` es una `Series` indexada por tienda cuyos valores son etiquetas del índice de `tot`. `tot.loc[...]` las usa para seleccionar filas. El resultado: una fila por tienda, con su producto ganador y sus unidades.
>
> **Dos alternativas igual de válidas:**
> ```python
> mejor = tot.sort_values("unidades", ascending=False).drop_duplicates("tienda")
> mejor = tot.sort_values("unidades").groupby("tienda").tail(1)
> ```
>
> **Empates.** Las tres versiones se quedan con **un** producto aunque haya empate (el primero que encuentren). Si quieres todos los empatados:
> ```python
> maximo = tot.groupby("tienda")["unidades"].transform("max")
> mejores = tot[tot["unidades"] == maximo]
> ```
> Fíjate en que esta versión usa `transform`: compara cada fila con el máximo de **su** tienda.

¿Por qué falla el intento más común, `ventas.groupby("tienda")["unidades"].max()`? Porque da la **venta individual** más grande de cada tienda, no el producto con más unidades **en total**, y además no dice de qué producto es.

**Antes de seguir (ejemplo para completar).** Ahora quieres, para cada tienda, los **3** productos con más unidades. Completa:

```python
tot = ventas.groupby(["tienda", "producto"], as_index=False)["unidades"].sum()
top3 = (tot.sort_values(...)
           .groupby(...)
           .head(...))
```

:::solucion Solución
`tot.sort_values(["tienda", "unidades"], ascending=[True, False]).groupby("tienda").head(3)`. Ordenar por tienda no es imprescindible para `head`, pero deja el resultado agrupado y legible. `groupby(...).head(k)` conserva las primeras $k$ filas de cada grupo **en el orden actual**, de ahí que haya que ordenar por unidades antes.
:::

---

## 4. Combinar tablas: `merge` sin sorpresas

### 4.1. Los cuatro tipos de unión

`pd.merge(izq, der, on="clave", how=...)` une filas con la misma clave:

| `how` | Conserva | Faltantes |
|---|---|---|
| `"inner"` (por defecto) | solo las claves presentes en **las dos** tablas | ninguno nuevo |
| `"left"` | todas las filas de la izquierda | `NaN` donde la derecha no tiene la clave |
| `"right"` | todas las de la derecha | al revés |
| `"outer"` | todas las de las dos | en ambos lados |

Para enriquecer una tabla de hechos (ventas) con atributos (precio, categoría del producto), lo normal es `how="left"`: no quieres perder ventas porque falte un atributo.

### 4.2. La trampa: claves duplicadas multiplican filas

> **Proposición 1 (número de filas de una unión interna).** Si la clave $k$ aparece $a_k$ veces en la tabla izquierda y $b_k$ veces en la derecha, la unión interna tiene
>
> $$\sum_k a_k \, b_k \text{ filas.}$$
>
> *Demostración.* `merge` produce una fila por cada **par** (fila izquierda, fila derecha) con la misma clave. Para la clave $k$ hay $a_k b_k$ pares; las claves distintas no se combinan entre sí, así que se suman. $\blacksquare$

Si la tabla de atributos tiene cada clave **una sola vez** ($b_k = 1$), la unión conserva el número de filas de la izquierda. Si una clave está **duplicada** en la derecha, las filas de esa clave se **multiplican**, y todas las sumas posteriores salen infladas sin ningún error.

> **Ejemplo 2 (la multiplicación, resuelta).** `ventas` tiene 1000 filas, 200 de ellas de arroz. La tabla `precios` tiene una fila por producto, salvo el arroz, que tiene **dos** (el precio cambió en marzo y alguien añadió una fila en vez de actualizar).
>
> 1. **Predicción** con la proposición: arroz, $200 \times 2 = 400$; los demás, $800 \times 1 = 800$. Total, 1200 filas.
> 2. **Consecuencia:** `ventas_p["unidades"].sum()` cuenta dos veces cada venta de arroz. Los ingresos del arroz se calculan con los dos precios, sumados.
> 3. **Detección inmediata:** compara el número de filas antes y después, y deja que pandas lo compruebe:
>    ```python
>    ventas_p = ventas.merge(precios, on="producto", how="left", validate="many_to_one")
>    # MergeError: Merge keys are not unique in right dataset; not a many-to-one merge
>    ```
>    `validate="many_to_one"` (o `"m:1"`) exige que la clave sea única en la derecha y lanza un error si no lo es. **Úsalo siempre que esperes una relación concreta**: `"one_to_one"`, `"one_to_many"`, `"many_to_one"`.
> 4. **Arreglo.** Depende del significado:
>    - si la fila repetida es un error, quítala: `precios.drop_duplicates("producto", keep="last")`;
>    - si los dos precios son reales en fechas distintas, la unión correcta es **por producto y por fecha vigente**: a cada venta, el último precio vigente en su fecha. Eso es `pd.merge_asof`:
>    ```python
>    ventas_p = pd.merge_asof(ventas.sort_values("fecha"),
>                             precios.sort_values("desde"),
>                             left_on="fecha", right_on="desde",
>                             by="producto", direction="backward")
>    ```

### 4.3. Encontrar lo que no casa

```python
m = ventas.merge(productos, on="producto", how="outer", indicator=True)
m["_merge"].value_counts()          # both / left_only / right_only
m.loc[m["_merge"] == "left_only", "producto"].unique()   # productos vendidos sin ficha
```

Las causas habituales de claves que no casan:

- **variantes de texto** (`"Arroz"` frente a `"arroz "`): normaliza las dos tablas igual (conferencia 5);
- **tipos distintos** (`101` como entero en una tabla y `"101"` como texto en la otra): pandas no los empareja.

### 4.4. `concat`: apilar, no combinar

`pd.concat([enero, febrero, marzo], ignore_index=True)` pone tablas con las mismas columnas una debajo de otra. No busca claves. Úsalo para juntar meses, hojas de Excel o archivos; usa `merge` para añadir columnas de otra tabla.

**Antes de seguir:** `clientes` (500 filas, `id` único) y `pedidos` (3000 filas, varios por cliente; 40 pedidos son de clientes que no están en `clientes`). ¿Cuántas filas tienen `pedidos.merge(clientes, on="id", how="left")` y `how="inner"`? ¿Qué `validate` pondrías?

:::solucion Respuesta
`left`: 3000 (cada pedido casa con a lo sumo un cliente; los 40 sin cliente quedan con `NaN`). `inner`: 2960. `validate="many_to_one"`.
:::

---

## 5. Formato largo y ancho

> **Definición 2 (formato largo y ancho).** En formato **largo** (*tidy*), cada fila es una observación: `(fecha, producto, unidades)`. En formato **ancho**, una variable se reparte en columnas: una fila por fecha y una columna por producto.

El largo es el formato para **calcular** (agrupar, filtrar, unir, entrenar modelos). El ancho es para **mirar** (informes, tablas cruzadas, mapas de calor) y para algunos cálculos entre columnas.

```python
# largo → ancho, agregando si hay varias filas por celda
ancho = ventas.pivot_table(index="fecha", columns="producto", values="unidades",
                           aggfunc="sum", fill_value=0)

# tabla cruzada con totales
ventas.pivot_table(index="tienda", columns="producto", values="unidades",
                   aggfunc="sum", margins=True, margins_name="Total")

# ancho → largo
largo = ancho.reset_index().melt(id_vars="fecha", var_name="producto", value_name="unidades")
```

- `pivot` (sin `_table`) solo reorganiza, y da un error si hay dos filas para la misma celda. `pivot_table` agrega.
- `fill_value=0` rellena las combinaciones sin ventas. Aquí sí es correcto: si un producto no tiene ninguna fila en una fecha **y** sabes que la tabla registra todas las ventas, se vendieron 0. (Si hubo un apagón, no; revisa la conferencia 5.)
- `unstack` y `stack` hacen lo mismo con un índice de varios niveles: `ventas.groupby(["fecha", "producto"])["unidades"].sum().unstack(fill_value=0)` equivale al primer `pivot_table`.

---

## 6. Series temporales: `resample` y `rolling`

### 6.1. El índice de fechas

Las operaciones temporales trabajan sobre un `DatetimeIndex`:

```python
s = ventas.groupby("fecha")["unidades"].sum()          # una serie diaria, con índice de fechas
s.loc["2026-01"]                                      # todo enero (selección por texto parcial)
s.loc["2026-01-10":"2026-01-20"]                      # ambos extremos incluidos
```

### 6.2. Rellenar el calendario

La serie anterior **solo tiene los días con ventas**. Si un producto no se vendió un martes, ese martes no existe. Antes de calcular medias, desplazamientos o ventanas, hay que crear los días que faltan:

```python
dias = pd.date_range(s.index.min(), s.index.max(), freq="D")
s = s.reindex(dias, fill_value=0)                     # los días sin ventas valen 0
```

Si sabes que hubo días **sin registro** (un apagón, un cuaderno perdido), rellénalos con `NaN`, no con 0: marca esos días aparte y rellena el resto.

### 6.3. `resample`: cambiar de frecuencia

> **Definición 3 (remuestreo).** `s.resample(regla)` agrupa la serie en **intervalos de tiempo consecutivos y sin solapamiento** (días, semanas, meses) y aplica una agregación a cada uno. Es un `groupby` por intervalo de tiempo.

```python
s.resample("W").sum()       # semanal: semanas de lunes a domingo, etiquetadas con el domingo
s.resample("W-MON").sum()   # semanas que terminan el lunes
s.resample("ME").sum()      # mensual, etiquetado con el último día del mes
s.resample("MS").sum()      # mensual, etiquetado con el primer día
s.resample("QE").mean()     # trimestral
```

Tres detalles que causan errores:

- **Alias en pandas 3:** fin de mes es `"ME"`, fin de trimestre `"QE"` y fin de año `"YE"`. Los antiguos `"M"`, `"Q"` y `"Y"` se eliminaron. Horas, minutos y segundos se escriben en minúscula: `"h"`, `"min"`, `"s"`.
- **Los intervalos vacíos aparecen.** Una semana sin ninguna fila sale con `sum` = 0 (o `NaN` con `mean`). Es otra forma de rellenar el calendario. Pero también convierte en 0 una semana **sin datos**; si eso importa, usa `sum(min_count=1)`.
- **Las semanas incompletas en los extremos.** Si los datos empiezan un jueves, la primera «semana» solo tiene 4 días y su suma sale baja. Quita la primera y la última semana si no están completas, o empieza los datos en lunes.

### 6.4. `rolling`: ventanas móviles

> **Definición 4 (ventana móvil).** `s.rolling(k).f()` calcula, **para cada posición**, la función `f` sobre las $k$ observaciones que **terminan** en ella (la actual y las $k - 1$ anteriores). El resultado tiene la misma longitud que `s`.

```python
s.rolling(7).mean()                     # media de los últimos 7 valores; NaN en los 6 primeros
s.rolling(7, min_periods=1).mean()      # admite ventanas incompletas al principio
s.rolling(7, center=True).mean()        # centrada: usa 3 días antes y 3 después (¡mira el futuro!)
s.rolling("7D").sum()                   # ventana por TIEMPO, no por número de filas
s.shift(1)                              # el valor del periodo anterior (un «rezago»)
s.pct_change()                          # variación relativa respecto al periodo anterior
s.expanding().mean()                    # media acumulada desde el principio
```

La diferencia con `resample` es esencial:

- `resample("W").sum()` da **una fila por semana** (cambia la frecuencia);
- `rolling(7).sum()` da **una fila por día** con la suma de los últimos 7 días (la frecuencia no cambia, la ventana se desliza).

La escena las compara sobre la misma serie diaria.

```escena
{"archivo": "escenas/python-cientifico/resample-rolling.js", "titulo": "resample frente a rolling", "pie": "Paso 1: la serie diaria. Paso 2: resample('W').mean() la corta en semanas sin solapamiento, un valor por semana. Paso 3: rolling(k).mean() desliza una ventana de k días y da un valor por día. Paso 4: las dos juntas. Cambia k y arrastra el punto ciruela del eje (o usa el deslizador) para mover la ventana."}
```

> **Observación 2 (`rolling` y el futuro).** `rolling(k)` sin `center` solo usa el pasado y el presente, así que su valor en el día $t$ se conoce al **final** del día $t$. Si lo usas como variable para predecir las ventas **del mismo día $t$**, estás usando la respuesta: hay que desplazarlo primero, `s.shift(1).rolling(7).mean()`. Es la fuga temporal que verás en Series temporales y la respuesta a «¿qué variables no puedes usar?» del diagnóstico. `center=True` está bien para **describir** una serie en un gráfico, nunca para predecir.

### 6.5. Por grupos: el ejercicio 5 de la prueba de entrada

> **Ejemplo 3 (unidades semanales por producto y su media móvil de 4 semanas).** `df` tiene `fecha`, `producto` y `unidades`, con una fila por venta.
>
> **Paso 1 (semanal por producto).** Hay que agrupar por producto **y** remuestrear por semana. Se puede hacer con un `Grouper` de tiempo dentro del `groupby`:
> ```python
> sem = (df.groupby(["producto", pd.Grouper(key="fecha", freq="W")])["unidades"]
>          .sum())
> ```
> `sem` es una `Series` con índice de dos niveles, `(producto, fecha)`.
>
> **Paso 2 (rellenar semanas sin ventas).** Con `Grouper`, una semana sin ninguna fila de un producto **no aparece**. Para tener todas las semanas en todos los productos, pasamos a formato ancho, rellenamos y volvemos:
> ```python
> sem = sem.unstack("producto", fill_value=0).asfreq("W", fill_value=0)
> ```
> Ahora `sem` es un `DataFrame` con una fila por semana (todas, sin huecos) y una columna por producto.
>
> **Paso 3 (media móvil de 4 semanas).** En formato ancho, `rolling` actúa sobre cada columna, es decir, sobre cada producto por separado:
> ```python
> media4 = sem.rolling(4, min_periods=1).mean()
> ```
>
> **Paso 4 (de vuelta al formato largo, si lo necesitas para un modelo o un gráfico por grupos):**
> ```python
> resultado = (sem.stack().rename("unidades").to_frame()
>                 .join(media4.stack().rename("media_4s")))
> ```
>
> **Por qué el formato ancho aquí.** En formato largo, `rolling(4)` sobre la columna entera mezclaría productos (las 4 filas anteriores podrían ser de otro producto). En ancho, cada columna es un producto y su índice son semanas consecutivas, así que la ventana de 4 filas es exactamente de 4 semanas. Si prefieres no pasar a ancho, la alternativa es `sem.groupby(level="producto").transform(lambda x: x.rolling(4, min_periods=1).mean())`, pero entonces el paso 2 (rellenar semanas) se hace con `reindex` sobre un índice completo.

**Antes de seguir:** tienes las ventas diarias de un producto en `s` (con todos los días). Escribe: (a) las ventas mensuales; (b) la media de los 28 días anteriores, utilizable como variable para predecir las ventas de cada día; (c) la variación de las ventas semanales respecto a la semana anterior.

:::solucion Respuesta
(a) `s.resample("ME").sum()`. (b) `s.shift(1).rolling(28).mean()`: el `shift(1)` deja fuera el propio día. (c) `s.resample("W").sum().pct_change()`.
:::

---

## 7. Encadenar operaciones de forma legible

Un análisis real son muchos pasos. Escríbelos como una **cadena** de métodos, uno por línea, en vez de una docena de variables intermedias (`df2`, `df3`, `df_final`):

```python
informe = (
    ventas
    .query("unidades > 0")                                     # fuera devoluciones
    .assign(importe=lambda d: d["unidades"] * d["precio"],
            mes=lambda d: d["fecha"].dt.to_period("M"))
    .groupby(["mes", "tienda"], as_index=False)
    .agg(importe=("importe", "sum"), ventas=("importe", "size"))
    .sort_values(["mes", "importe"], ascending=[True, False])
)
```

- `assign` con `lambda d: ...` usa la tabla **en ese punto de la cadena** (no la original).
- En pandas 3 puedes escribir `pd.col("unidades") * pd.col("precio")` en lugar de `lambda d: d["unidades"] * d["precio"]` dentro de `assign`. Hace lo mismo, con menos ruido.
- Para depurar una cadena, comenta las líneas desde el final hacia atrás y mira el resultado intermedio.

---

## 8. Errores típicos y cómo detectarlos

| Error | Síntoma | Detección y arreglo |
|---|---|---|
| `groupby(...).max()` para «el mejor producto» | da la venta máxima, no el total, ni el producto | suma por par y luego `idxmax` |
| `agg` donde querías `transform` | no se puede asignar como columna (otro índice) | ¿una fila por grupo o por fila original? |
| `lambda` en `agg` con miles de grupos | muy lento | funciones por nombre (`"sum"`, `"mean"`) |
| Claves duplicadas en la tabla de atributos | filas multiplicadas, totales inflados | `validate="many_to_one"`; compara `len` antes y después |
| Claves que no casan | `NaN` inesperados tras `merge` | `indicator=True`; normaliza texto y tipos |
| Faltantes en la clave del `groupby` | filas que «desaparecen» | `dropna=False` |
| Medias sobre días con ventas | media inflada | rellena el calendario (`reindex`, `asfreq`) |
| `"M"` en `resample` | error en pandas 3 | `"ME"` o `"MS"` |
| `rolling` en formato largo con varios productos | ventanas que mezclan productos | por grupos o en formato ancho |
| `rolling` sin `shift` como predictor | resultados demasiado buenos | `shift(1)` antes de la ventana |
| Semanas incompletas en los extremos | primera o última semana anormalmente bajas | recorta los extremos |

---

## 9. Ideas que te llevas

- **`agg` → una fila por grupo; `transform` → una fila por fila original.** Elige por la forma de la respuesta.
- **«El mejor de cada grupo»:** agrega por los dos niveles y luego `idxmax` (o `sort_values` + `drop_duplicates`).
- **Antes de un `merge`, predice el número de filas** con $\sum_k a_k b_k$ y usa `validate`. Después, `indicator=True` para lo que no casa.
- **Largo para calcular, ancho para mirar.** `pivot_table` y `melt` van y vuelven.
- **`resample` cambia la frecuencia; `rolling` desliza una ventana.** Rellena el calendario antes y usa `shift(1)` si la ventana va a predecir.

---

## 10. Preguntas de recuperación

1. Escribe de memoria la solución al ejercicio del diagnóstico (el producto más vendido de cada tienda) y explica cada línea.
2. ¿Qué diferencia hay entre `df.groupby("t")["x"].mean()` y `df.groupby("t")["x"].transform("mean")` en forma e índice?
3. Una tabla `A` tiene la clave `k` repetida 3 veces y `B` la tiene repetida 2 veces. ¿Cuántas filas de `k` tiene `A.merge(B, on="k")`? ¿Qué `validate` lo habría detectado?
4. ¿Qué hace `validate="many_to_one"` y cuándo lo usarías?
5. ¿Qué diferencia hay entre `s.resample("W").mean()` y `s.rolling(7).mean()`?
6. ¿Por qué `s.rolling(7).mean()` no se puede usar tal cual para predecir el valor del mismo día?
7. ¿Por qué hay que rellenar el calendario antes de calcular la media diaria de ventas?

:::solucion Respuestas
1. `tot = ventas.groupby(["tienda", "producto"], as_index=False)["unidades"].sum()` (totales por par) y `tot.loc[tot.groupby("tienda")["unidades"].idxmax()]` (para cada tienda, la etiqueta de la fila con más unidades, y esas filas completas).
2. `mean()` devuelve una fila por grupo, indexada por `t`. `transform("mean")` devuelve una fila por cada fila de `df`, con el mismo índice, y la media de su grupo en cada una.
3. $3 \times 2 = 6$ filas. `validate="one_to_one"` o `"many_to_one"` (exige unicidad en `B`) habría lanzado un error.
4. Comprueba que la clave es única en la tabla de la derecha y lanza `MergeError` si no lo es. Al añadir atributos (una fila por producto, cliente…) a una tabla de hechos.
5. `resample("W").mean()` da una fila por semana, la media de cada semana natural sin solapamiento. `rolling(7).mean()` da una fila por día, la media de los 7 días que terminan en él.
6. Porque incluye el valor del propio día, que es lo que quieres predecir: hay que desplazar con `shift(1)` primero.
7. Porque los días sin ventas no tienen fila; la media sobre las filas existentes excluye los ceros y sale inflada.
:::

---

## 11. Lecturas

- **Data Carpentry, «Análisis y visualización de datos usando Python»** (`https://datacarpentry.github.io/python-ecology-lesson-es/`), en español, CC BY 4.0: episodio 6 («Combinando DataFrames con Pandas»), con `concat` y `merge` sobre `surveys.csv`, `species.csv` y `plots.csv` (en los recursos de este nodo).
- **pandas, guía de usuario: «Group by: split-apply-combine»** y **«Merge, join, concatenate and compare»** (`https://pandas.pydata.org/docs/user_guide/`), en inglés.
- **pandas, guía de usuario: «Time series / date functionality»** y **«Windowing operations»**, en inglés: la referencia de `resample`, los alias de frecuencia y `rolling`.
- **Amat Rodrigo, J., «Forecasting series temporales con Python y Scikit-learn»** (`https://www.cienciadedatos.net/documentos/py27-forecasting-series-temporales-python-scikitlearn`), en español: un adelanto de cómo se usan rezagos y ventanas para predecir, que será la base de la asignatura de Series temporales.
