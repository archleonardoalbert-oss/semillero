---
titulo: pandas II: agregar y reorganizar
num: 06
resumen: groupby con agg y transform, merge sin multiplicar filas, formatos largo y ancho, y las ventanas temporales que serán la base de la predicción de demanda.
horas: ≈ 4 h
metas: ≈ 4 h de estudio | 3 motores interactivos | el ejercicio del diagnóstico, resuelto en 2 líneas
objetivos: Usar groupby con agg y transform | Hacer merge sin multiplicar filas | Aplicar resample y rolling a series
---

> **Objetivos.** Al terminar serás capaz de:
>
> 1. **Usar** `groupby` con `agg` (una fila por grupo) y con `transform` (una fila por fila original) y **elegir** según la pregunta.
> 2. **Resolver** en pocas líneas «para cada tienda, el producto más vendido».
> 3. **Combinar** tablas con `merge` **sin multiplicar filas**: predecir el número de filas, validar la cardinalidad y encontrar lo que no casa.
> 4. **Reorganizar** entre formato largo y ancho con `pivot_table` y `melt`.
> 5. **Aplicar** `resample` y `rolling` a series temporales, también por grupos, rellenando el calendario.

> **Prerrequisitos.** [Conferencia 5](c05-datos-sucios.md): leer, limpiar, `loc`, el índice y la copia al escribir. De NumPy, las reducciones por eje ([conferencia 3](c03-vectores.md)): un `groupby` es una reducción por eje sobre grupos.

## 1. Lo que quedó en blanco

El segundo ejercicio de Python del diagnóstico: *tienes `ventas` con `tienda`, `producto`, `fecha` y `unidades` (una fila por venta); escribe, en 2-4 líneas, el código que dé para cada tienda el producto con más unidades vendidas en total.* Y el quinto de la prueba de entrada: *las unidades semanales por producto y su media móvil de 4 semanas.* Son el pan de cada día de quien trabaja con datos de negocio, y la base de la asignatura de Series temporales y del Proyecto 2.

> **Problema para pensar (10 minutos).** Intenta el ejercicio del diagnóstico con lo que sabes. Pista: tiene **dos** niveles de agrupación. ¿Cuáles? Escribe tu intento, aunque no funcione; lo corregimos en la sección 3.

## 2. Dividir, aplicar, combinar

> **Definición 1 (*split-apply-combine*).** `df.groupby(claves)` **divide** las filas en grupos según las claves, **aplica** una función a cada grupo y **combina** los resultados. El tipo de función decide la forma: una **agregación** (`agg`) reduce cada grupo a un valor → una fila por grupo; una **transformación** (`transform`) devuelve un valor por fila → el **mismo índice que `df`**, listo para añadir como columna; un **filtro** (`filter`) conserva o descarta grupos enteros.

:::widget groupby Dividir, aplicar, combinar: agg frente a transform
Predice antes del paso 4: ¿cuántas filas tendrá el resultado de `transform`? Luego cambia la función y las unidades de la fila 0 y mira qué cambia en cada salida.
:::

```python
ventas.groupby("tienda")["unidades"].sum()                     # Series: una suma por tienda
ventas.groupby(["tienda", "producto"])["unidades"].sum()       # índice de dos niveles
ventas.groupby("tienda", as_index=False)["unidades"].sum()     # las claves como columnas

resumen = ventas.groupby("tienda").agg(                        # agregación con nombre
    unidades_total=("unidades", "sum"),
    n_ventas=("unidades", "size"),
    n_productos=("producto", "nunique"),
    primera_venta=("fecha", "min"),
)

g = ventas.groupby("tienda")["unidades"]
ventas["cuota"] = ventas["unidades"] / g.transform("sum")      # fracción de su tienda
ventas["z_tienda"] = (ventas["unidades"] - g.transform("mean")) / g.transform("std")
```

Las funciones por nombre (`"sum"`, `"mean"`, `"median"`, `"std"`, `"size"`, `"nunique"`, `"first"`) están optimizadas en C. Una `lambda` llama a Python **una vez por grupo**: con miles de grupos, mucho más lenta. `transform` es el *broadcasting* de NumPy con grupos de tamaño variable: «devuelve a cada fila el resultado de su grupo».

> **Observación 1 (`groupby` en pandas 3).** Las filas con la clave **faltante** se descartan (para verlas, `dropna=False`); con claves `category` solo salen las categorías presentes (`observed=True`); el resultado se ordena por las claves (`sort=False` conserva el orden de aparición).

:::solucion Antes de seguir: quieres añadir a cada venta la media de unidades de su producto en su tienda. ¿`agg` o `transform`?
`transform`, porque el resultado necesita una fila por venta: `ventas["media_tp"] = ventas.groupby(["tienda", "producto"])["unidades"].transform("mean")`.
:::

## 3. El ejercicio del diagnóstico, resuelto

> **Ejemplo 1 (para cada tienda, el producto con más unidades).**
>
> **Paso 1 (dos niveles).** «Con más unidades **en total**» exige sumar primero las ventas de cada par (tienda, producto), y después, **dentro de cada tienda**, elegir el par con la suma máxima.
>
> **Paso 2 (totales por par).** `tot = ventas.groupby(["tienda", "producto"], as_index=False)["unidades"].sum()`
>
> **Paso 3 (el máximo de cada tienda).** `idxmax` devuelve la **etiqueta** de la fila con el máximo de cada grupo; con ellas se seleccionan las filas completas: `mejor = tot.loc[tot.groupby("tienda")["unidades"].idxmax()]`
>
> **Alternativas válidas:** `tot.sort_values("unidades", ascending=False).drop_duplicates("tienda")`, o `tot.sort_values("unidades").groupby("tienda").tail(1)`.
>
> **Empates.** Las tres se quedan con **un** producto aunque haya empate. Para todos los empatados: `tot[tot["unidades"] == tot.groupby("tienda")["unidades"].transform("max")]` (otra vez `transform`: comparar cada fila con el máximo de **su** tienda).

:::error «`ventas.groupby("tienda")["unidades"].max()` da el producto más vendido»
**Por qué es tentador:** «más vendido» suena a «máximo». **Por qué es falso:** da la **venta individual** más grande de cada tienda, no el producto con más unidades **en total**, y además no dice de qué producto es. **Lo correcto:** sumar por (tienda, producto) primero y elegir después (Ejemplo 1).
:::

> **Ejemplo 1b (complétalo).** Los 3 productos con más unidades de cada tienda.
> ```python
> tot = ventas.groupby(["tienda", "producto"], as_index=False)["unidades"].sum()
> top3 = tot.sort_values(...).groupby(...).head(...)
> ```

:::solucion Solución
`tot.sort_values(["tienda", "unidades"], ascending=[True, False]).groupby("tienda").head(3)`. `head(k)` conserva las primeras $k$ filas de cada grupo **en el orden actual**: por eso se ordena por unidades antes.
:::

## 4. Combinar tablas: `merge` sin sorpresas

`pd.merge(izq, der, on="clave", how=...)` une las filas con la misma clave. `how="inner"` conserva solo las claves de las dos tablas; `"left"`, todas las de la izquierda (con `NaN` donde no casan); `"right"`, al revés; `"outer"`, todas. Para enriquecer una tabla de hechos (ventas) con atributos (precio, categoría), lo normal es `how="left"`: no quieres perder ventas porque falte un atributo.

> **Proposición 1 (filas de una unión).** Si la clave $k$ aparece $a_k$ veces a la izquierda y $b_k$ veces a la derecha, la unión interna tiene $\sum_k a_k\,b_k$ filas.
>
> *Demostración.* `merge` produce una fila por cada **par** (fila izquierda, fila derecha) con la misma clave: para la clave $k$ hay $a_k b_k$ pares, y claves distintas no se combinan. $\blacksquare$

Si la tabla de atributos tiene cada clave **una vez**, la unión conserva las filas de la izquierda. Si una clave está **duplicada**, las filas de esa clave se **multiplican**, y todas las sumas posteriores salen infladas sin ningún error.

:::widget merge Una clave duplicada multiplica filas
Empieza con «arroz duplicado» activado y `how="left"`: cuenta las filas de arroz y compara la suma de unidades con la real. Después activa `validate`.
:::

```python
ventas_p = ventas.merge(precios, on="producto", how="left", validate="many_to_one")
# MergeError: Merge keys are not unique in right dataset; not a many-to-one merge
```

`validate="many_to_one"` exige que la clave sea única a la derecha y falla **antes** de que los totales salgan inflados. Úsalo siempre que esperes una relación concreta (`"one_to_one"`, `"one_to_many"`, `"many_to_one"`). Si la fila repetida es un error, quítala; si los dos precios son reales en fechas distintas, la unión correcta es «el último precio vigente en la fecha de cada venta»:

```python
ventas_p = pd.merge_asof(ventas.sort_values("fecha"), precios.sort_values("desde"),
                         left_on="fecha", right_on="desde", by="producto", direction="backward")
```

**Lo que no casa:** `ventas.merge(productos, on="producto", how="outer", indicator=True)` añade la columna `_merge` (`both`, `left_only`, `right_only`). Las causas habituales: variantes de texto (normaliza las dos tablas igual) y tipos distintos (`101` entero frente a `"101"` texto no se emparejan).

`pd.concat([enero, febrero], ignore_index=True)` **apila** tablas con las mismas columnas; no busca claves.

:::solucion Antes de seguir: `clientes` (500 filas, `id` único) y `pedidos` (3000 filas; 40 son de clientes que no están en `clientes`). ¿Cuántas filas dan `how="left"` e `how="inner"`, y qué `validate` pondrías?
`left`: 3000 (cada pedido casa con a lo sumo un cliente; los 40 sin cliente quedan con `NaN`). `inner`: 2960. `validate="many_to_one"`.
:::

## 5. Formato largo y ancho

> **Definición 2.** En formato **largo**, cada fila es una observación: `(fecha, producto, unidades)`. En formato **ancho**, una variable se reparte en columnas: una fila por fecha y una columna por producto. El largo es para **calcular** (agrupar, unir, entrenar); el ancho, para **mirar** y para cálculos entre columnas.

```python
ancho = ventas.pivot_table(index="fecha", columns="producto", values="unidades",
                           aggfunc="sum", fill_value=0)                 # largo → ancho
ventas.pivot_table(index="tienda", columns="producto", values="unidades",
                   aggfunc="sum", margins=True, margins_name="Total")   # tabla cruzada
largo = ancho.reset_index().melt(id_vars="fecha", var_name="producto", value_name="unidades")
```

`pivot` (sin `_table`) solo reorganiza y falla si hay dos filas para la misma celda; `pivot_table` agrega. `fill_value=0` es correcto aquí **solo** si la tabla registra todas las ventas (si hubo un apagón, no).

## 6. Series temporales: `resample` y `rolling`

Las operaciones temporales trabajan sobre un índice de fechas: `s = ventas.groupby("fecha")["unidades"].sum()` da una serie diaria; `s.loc["2026-01"]` selecciona enero.

**Primero, rellenar el calendario.** La serie anterior solo tiene los días con ventas:

```python
dias = pd.date_range(s.index.min(), s.index.max(), freq="D")
s = s.reindex(dias, fill_value=0)        # los días sin ventas valen 0 (si sabes que fue así)
```

> **Definición 3 (remuestreo).** `s.resample(regla)` agrupa la serie en **intervalos consecutivos sin solapamiento** (días, semanas, meses) y aplica una agregación a cada uno: un `groupby` por intervalo de tiempo.

> **Definición 4 (ventana móvil).** `s.rolling(k).f()` calcula, **para cada posición**, `f` sobre las $k$ observaciones que **terminan** en ella. El resultado tiene la misma longitud que `s`.

```python
s.resample("W").sum()          # semanal: lunes-domingo, etiquetado con el domingo
s.resample("ME").sum()         # mensual (en pandas 3, "M" ya no existe: "ME" o "MS")
s.rolling(7).mean()            # media de los últimos 7 valores; NaN en los 6 primeros
s.rolling("7D").sum()          # ventana por tiempo, no por filas
s.shift(1)                     # el valor del periodo anterior (un «rezago»)
s.pct_change()                 # variación relativa
```

:::widget ventanas resample frente a rolling, y la fuga de la ventana
Mueve el día marcado y la longitud de la ventana. Después activa «usar como predictor»: la ventana se aparta un día. Esa diferencia de un día es la diferencia entre un modelo honesto y uno que hace trampa.
:::

:::error «Como variable para predecir las ventas del día t, uso `s.rolling(7).mean()`»
**Por qué es tentador:** es «la media de la última semana», que parece información del pasado. **Por qué es una fuga:** sin desplazar, la ventana del día $t$ **incluye el propio día $t$**, que es justo lo que quieres predecir; la evaluación sale mucho mejor de lo que será en producción. `center=True` es peor: usa días futuros. **Lo correcto:** `s.shift(1).rolling(7).mean()`. Es la respuesta a «¿qué variables no puedes usar?» del diagnóstico.
:::

Tres detalles más: los intervalos vacíos aparecen en `resample` (una semana sin filas sale con `sum` = 0; usa `sum(min_count=1)` si eso importa); las semanas incompletas de los extremos salen anormalmente bajas (recórtalas); y fin de mes es `"ME"`, fin de trimestre `"QE"`, fin de año `"YE"`, y horas y minutos van en minúscula (`"h"`, `"min"`).

### El ejercicio 5 de la prueba de entrada

> **Ejemplo 2 (unidades semanales por producto y media móvil de 4 semanas).**
>
> **Paso 1 (semanal por producto).** Agrupar por producto **y** por semana con un `Grouper` de tiempo:
> ```python
> sem = df.groupby(["producto", pd.Grouper(key="fecha", freq="W")])["unidades"].sum()
> ```
> **Paso 2 (rellenar semanas sin ventas).** Con `Grouper`, una semana sin filas de un producto no aparece. En formato ancho se rellena todo de una vez:
> ```python
> sem = sem.unstack("producto", fill_value=0).asfreq("W", fill_value=0)
> ```
> **Paso 3 (media móvil).** En ancho, `rolling` actúa sobre cada columna, es decir, sobre cada producto por separado: `media4 = sem.rolling(4, min_periods=1).mean()`.
>
> **Por qué en ancho.** En formato largo, `rolling(4)` sobre la columna entera mezclaría productos: las 4 filas anteriores podrían ser de otro. En ancho, cada columna es un producto y sus filas son semanas consecutivas.

:::solucion Antes de seguir: con las ventas diarias de un producto en `s` (todos los días), escribe las ventas mensuales, una media de los 28 días anteriores utilizable para predecir cada día, y la variación semanal.
`s.resample("ME").sum()`; `s.shift(1).rolling(28).mean()`; `s.resample("W").sum().pct_change()`.
:::

## 7. Encadenar operaciones

Un análisis real son muchos pasos. Escríbelos como una cadena, uno por línea, en vez de una docena de variables (`df2`, `df3`, `df_final`):

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

`assign` con `lambda d: ...` usa la tabla **en ese punto de la cadena**. En pandas 3 puedes escribir `pd.col("unidades") * pd.col("precio")` en lugar de la `lambda`. Para depurar, comenta líneas desde el final y mira el intermedio.

## 8. Errores típicos

| Error | Síntoma | Arreglo |
|---|---|---|
| `agg` donde querías `transform` | no se puede asignar como columna | ¿una fila por grupo o por fila? |
| `lambda` en `agg` con miles de grupos | muy lento | funciones por nombre |
| clave duplicada en la tabla de atributos | filas multiplicadas, totales inflados | `validate`; compara `len` antes y después |
| claves que no casan | `NaN` tras `merge` | `indicator=True`; normaliza texto y tipos |
| medias sobre días con ventas | media inflada | rellena el calendario |
| `rolling` en formato largo con varios productos | ventanas que mezclan productos | en ancho o por grupos |
| `rolling` sin `shift` como predictor | resultados demasiado buenos | `shift(1)` antes |

:::llevas Ideas que te llevas
- **`agg` → una fila por grupo; `transform` → una fila por fila original.**
- **«El mejor de cada grupo»:** agrega por los dos niveles y luego `idxmax`.
- **Antes de un `merge`, predice las filas** ($\sum_k a_k b_k$) y usa `validate`; después, `indicator=True`.
- **Largo para calcular, ancho para mirar.**
- **`resample` cambia la frecuencia; `rolling` desliza una ventana.** Rellena el calendario y desplaza con `shift(1)` si vas a predecir.
:::

## 9. Preguntas de recuperación

1. Escribe de memoria la solución al ejercicio del diagnóstico y explica cada línea.
2. ¿Qué diferencia hay entre `groupby("t")["x"].mean()` y `groupby("t")["x"].transform("mean")` en forma e índice?
3. La clave `k` aparece 3 veces en `A` y 2 en `B`. ¿Cuántas filas de `k` da `A.merge(B, on="k")`?
4. ¿Qué diferencia hay entre `s.resample("W").mean()` y `s.rolling(7).mean()`?
5. ¿Por qué hay que rellenar el calendario antes de calcular la media diaria de ventas?

:::solucion Respuestas
1. `tot = ventas.groupby(["tienda", "producto"], as_index=False)["unidades"].sum()` y `tot.loc[tot.groupby("tienda")["unidades"].idxmax()]`.
2. `mean()`: una fila por grupo, indexada por `t`. `transform("mean")`: una fila por fila de `df`, con su mismo índice.
3. $3 \times 2 = 6$.
4. `resample` da una fila por semana natural, sin solapamiento; `rolling` da una fila por día, con la media de los 7 que terminan en él.
5. Porque los días sin ventas no tienen fila: la media sobre las filas existentes excluye los ceros y sale inflada.
:::

## 10. Lecturas

- **Data Carpentry, «Análisis y visualización de datos usando Python»**, en español, CC BY 4.0: episodio 6 («Combinando DataFrames con Pandas»), con `surveys.csv`, `species.csv` y `plots.csv`.
- **pandas, «Group by: split-apply-combine»**, **«Merge, join, concatenate and compare»**, **«Time series»** y **«Windowing operations»** (`https://pandas.pydata.org/docs/user_guide/`), en inglés.
- **Amat Rodrigo, «Forecasting series temporales con Python y Scikit-learn»** (`https://www.cienciadedatos.net/documentos/py27-forecasting-series-temporales-python-scikitlearn`), en español: rezagos y ventanas para predecir.
