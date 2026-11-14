---
titulo: Datos reales: ecología y un comercio en línea
num: P3
resumen: Doce ejercicios con dos conjuntos reales y públicos: el estudio de roedores de Portal (Data Carpentry) y Online Retail II, un millón de líneas de un comercio británico con sus trampas de verdad. Intercalan las conferencias 2 a 7.
horas: ≈ 6 h
---

> **Conferencias que practica:** [5](c05-datos-sucios.md), [6](c06-agregar.md) y [7](c07-visualizacion.md), con ejercicios que retoman la [2](c02-ndarray.md), la [3](c03-vectores.md) y la [4](c04-aleatoriedad.md). El orden está mezclado a propósito: en un proyecto real nadie te dice qué técnica toca.
>
> **Datos (ya descargados en los recursos de la asignatura, sin conexión):**
> - **Portal Project, versión de Data Carpentry** (CC0): `dc-surveys.csv` (35 549 capturas de animales entre 1977 y 2002), `dc-species.csv` (54 especies) y `dc-plots.csv` (24 parcelas).
> - **Online Retail II** (Chen, 2019; UCI, CC BY 4.0, DOI 10.24432/C5CG6D): `online-retail-ii.zip`, un Excel de dos hojas con 1 067 371 líneas de factura de un comercio en línea británico (2009-2011).
>
> Copia los archivos a `data/raw/` de un repositorio nuevo (`curso-ai-pandas`). La [práctica 4](p04-paquete.md) lo convertirá en un paquete con pruebas.
>
> **Cómo trabajar.** Sin asistente de IA. Antes de abrir una pista, intenta 10 minutos. Cada solución trae **valores de control** calculados sobre estos mismos archivos: si tu número no coincide, el error está en tu código (o en una decisión distinta, que debes poder justificar).

## Ejercicio 1. Leer y auditar las capturas

Lee `dc-surveys.csv` y aplica la rutina de inspección de la conferencia 5. Responde: ¿cuántas filas y columnas hay? ¿Qué `dtype` tiene cada columna y por qué `weight` no es entero? ¿Cuántos faltantes hay por columna?

:::pista Concepto
La rutina de cinco minutos: `shape`, `dtypes`, `isna().sum()`, `nunique()`, `describe()`. Una columna de enteros con un solo faltante no puede ser `int64`.
:::

:::pista Estrategia
Lee sin parámetros especiales (es un CSV con comas y punto decimal), y aplica la rutina línea a línea, anotando cada respuesta como comentario.
:::

:::pista Arranque
```python
import pandas as pd
s = pd.read_csv("data/raw/dc-surveys.csv")
s.shape, s.dtypes
```
:::

:::pista Desbloqueo
`s.isna().sum()` da los faltantes. Para el porqué de `float64`, recuerda que `NaN` es un número real: una columna entera con faltantes no tiene otra forma de representarlos en NumPy (salvo el tipo anulable `"Int64"`).
:::

:::solucion Solución modelo
```python
s = pd.read_csv("data/raw/dc-surveys.csv")
s.shape            # (35549, 9)
s.dtypes           # record_id, month, day, year, plot_id: int64
                   # species_id, sex: str          hindfoot_length, weight: float64
s.isna().sum()     # species_id 763, sex 2511, hindfoot_length 4111, weight 3266; el resto 0
s["sex"].value_counts(dropna=False)   # M 17348, F 15690, NaN 2511
```
`weight` y `hindfoot_length` son medidas enteras (gramos, milímetros), pero tienen faltantes, y en NumPy un entero no puede ser `NaN`: pandas las lee como `float64`. Si quisieras enteros, `s["weight"].astype("Int64")`.

**Idea reutilizable:** antes de calcular nada, forma, tipos y faltantes. Explicar cada `float64` inesperado te salva de errores posteriores.
:::

## Ejercicio 2. Fechas imposibles

Construye una columna `fecha` a partir de `year`, `month` y `day`. ¿Cuántas fechas no existen? Da un ejemplo. ¿Qué haces con esas filas?

:::pista Concepto
`pd.to_datetime` acepta un `DataFrame` con columnas llamadas `year`, `month` y `day`. Con `errors="coerce"`, lo imposible se vuelve `NaT`.
:::

:::pista Estrategia
Convierte, cuenta los `NaT` y muestra las filas originales que fallaron con una máscara.
:::

:::pista Arranque
```python
s["fecha"] = pd.to_datetime(s[["year", "month", "day"]], errors="coerce")
```
:::

:::pista Desbloqueo
`s.loc[s["fecha"].isna(), ["year", "month", "day"]]` muestra los culpables. Piensa en qué meses tienen 30 días.
:::

:::solucion Solución modelo
```python
s["fecha"] = pd.to_datetime(s[["year", "month", "day"]], errors="coerce")
s["fecha"].isna().sum()                                   # 136
s.loc[s["fecha"].isna(), ["year", "month", "day"]].head() # p. ej. 2000-9-31: septiembre tiene 30 días
s["fecha"].min(), s["fecha"].max()                        # 1977-07-16, 2002-12-31
```
Son errores de transcripción. **No borres las filas**: las medidas del animal siguen siendo válidas para análisis que no dependan del día exacto. Deja `NaT` y anótalo; para series temporales mensuales podrías usar `year` y `month`, que sí son válidos.

**Idea reutilizable:** `errors="coerce"` + contar + mirar los culpables. Nunca solo lo primero.
:::

## Ejercicio 3. Unir con especies y parcelas sin multiplicar filas

Une las capturas con `dc-species.csv` (por `species_id`) y con `dc-plots.csv` (por `plot_id`). Garantiza con código que ninguna unión multiplica filas. ¿Cuántas capturas hay de cada `taxa` (roedores, aves…), contando las que no tienen especie?

:::pista Concepto
Proposición 1 de la conferencia 6: si la clave es única en la tabla de la derecha, la unión conserva las filas de la izquierda. `validate="many_to_one"` lo exige.
:::

:::pista Estrategia
Dos `merge` encadenados con `how="left"` y `validate`, comprobando `len` antes y después; luego `value_counts(dropna=False)`.
:::

:::pista Arranque
```python
sp = pd.read_csv("data/raw/dc-species.csv")
pl = pd.read_csv("data/raw/dc-plots.csv")
d = s.merge(sp, on="species_id", how="left", validate="many_to_one")
```
:::

:::pista Desbloqueo
Las 763 capturas sin `species_id` no casan con ninguna especie: con `how="left"` se conservan con `taxa` = `NaN`. Con `how="inner"` desaparecerían sin avisar.
:::

:::solucion Solución modelo
```python
d = (s.merge(sp, on="species_id", how="left", validate="many_to_one")
      .merge(pl, on="plot_id", how="left", validate="many_to_one"))
assert len(d) == len(s)                       # 35549: ninguna fila multiplicada
d["taxa"].value_counts(dropna=False)          # Rodent 34247, NaN 763, Bird 450, Rabbit 75, Reptile 14
```
`validate` pasa porque `species_id` es única en las 54 filas de especies y `plot_id`, en las 24 de parcelas.

**Idea reutilizable:** `how="left"` + `validate` + `assert len(...)`: tres líneas que evitan los totales inflados.
:::

## Ejercicio 4. El patrón del diagnóstico, con otros datos

Para cada tipo de parcela (`plot_type`), ¿qué especie se capturó más veces? Da también cuántas veces.

:::pista Concepto
Es el ejercicio del diagnóstico (el producto más vendido de cada tienda) con otros nombres: dos niveles de agrupación.
:::

:::pista Estrategia
Cuenta capturas por (`plot_type`, `species_id`) y, dentro de cada `plot_type`, quédate con la fila del máximo.
:::

:::pista Arranque
```python
t = d.groupby(["plot_type", "species_id"], as_index=False).size()   # columna «size»
```
:::

:::pista Desbloqueo
`t.loc[t.groupby("plot_type")["size"].idxmax()]`. Las capturas sin especie no cuentan: `groupby` descarta las claves faltantes.
:::

:::solucion Solución modelo
```python
t = d.groupby(["plot_type", "species_id"], as_index=False).size()
t.loc[t.groupby("plot_type")["size"].idxmax()]
# Control                    DM  6760
# Long-term Krat Exclosure   PB  1047
# Rodent Exclosure           RM  1045
# Short-term Krat Exclosure  DM  1156
# Spectab exclosure          DM  1584
```
DM (*Dipodomys merriami*, una rata canguro) domina donde no se excluye a las ratas canguro; en las parcelas que las excluyen ganan otras especies. Es exactamente el efecto que el experimento quería medir.

**Idea reutilizable:** «el más X de cada grupo» = agregar por los dos niveles + `idxmax` por el grupo exterior.
:::

## Ejercicio 5. ¿Duplicados o animales gemelos?

¿Cuántas filas son idénticas a otra salvo por `record_id`? ¿Cuántas filas participan en esos grupos y cuántas de ellas no tienen ni peso ni longitud de pata? ¿Las borrarías?

:::pista Concepto
`duplicated` sobre un subconjunto de columnas; `keep=False` marca **todas** las copias, no solo las sobrantes. Un duplicado no es necesariamente un error.
:::

:::pista Estrategia
Quita `record_id`, cuenta los duplicados sobrantes, luego mira los grupos completos con `keep=False` y cuenta cuántos no tienen medidas.
:::

:::pista Arranque
```python
sin_id = s.drop(columns=["record_id", "fecha"])
sin_id.duplicated().sum()
```
:::

:::pista Desbloqueo
`grupo = sin_id.duplicated(keep=False)` y después `(grupo & s["weight"].isna() & s["hindfoot_length"].isna()).sum()`.
:::

:::solucion Solución modelo
```python
sin_id = s.drop(columns=["record_id", "fecha"])
sin_id.duplicated().sum()                                          # 760 filas sobrantes
grupo = sin_id.duplicated(keep=False)
grupo.sum()                                                        # 1442 filas en grupos repetidos
(grupo & s["weight"].isna() & s["hindfoot_length"].isna()).sum()   # 388 sin ninguna medida
```
**No las borraría.** Cada fila tiene su propio `record_id`: son registros distintos. Dos animales de la misma especie y sexo, capturados el mismo día en la misma parcela, con el mismo peso redondeado al gramo, es perfectamente posible; y cuando no hay medidas, la fila solo dice «se capturó un animal de esta especie», y dos animales dan dos filas iguales. Borrarlas **subestimaría las capturas**. La decisión correcta es conservarlas y anotarlo en el `README`.

**Idea reutilizable:** antes de `drop_duplicates`, pregunta si hay un identificador y qué significa una fila.
:::

## Ejercicio 6. Pesos anómalos, por especie

Marca como anómalos los pesos con $|z^{\text{rob}}| > 3{,}5$ **dentro de cada especie** (mediana y MAD de su especie). ¿Cuántos salen? ¿Qué especie aporta más? ¿Por qué sería un error aplicar la regla a todos los pesos juntos?

:::pista Concepto
`groupby(...).transform("median")` devuelve a cada fila la mediana de **su** especie (conferencia 6); la z robusta es la de la conferencia 5. Cuidado con las especies cuya MAD es 0.
:::

:::pista Estrategia
Mediana por especie con `transform`; desviación absoluta; su mediana por especie con otro `transform`; la puntuación; y una máscara.
:::

:::pista Arranque
```python
g = s.groupby("species_id")["weight"]
med = g.transform("median")
mad = (s["weight"] - med).abs().groupby(s["species_id"]).transform("median")
```
:::

:::pista Desbloqueo
Una MAD de 0 daría división por cero (infinito, y todo marcado). Sustitúyela por `NaN`: `mad = mad.replace(0, np.nan)`. Las comparaciones con `NaN` dan `False`.
:::

:::solucion Solución modelo
```python
import numpy as np
g = s.groupby("species_id")["weight"]
med = g.transform("median")
mad = (s["weight"] - med).abs().groupby(s["species_id"]).transform("median").replace(0, np.nan)
z_rob = 0.6745 * (s["weight"] - med) / mad
s["peso_anomalo"] = z_rob.abs() > 3.5
s["peso_anomalo"].sum()                                       # 556
s.loc[s["peso_anomalo"], "species_id"].value_counts().head(4) # DM 167, OT 89, DO 83, RM 79
```
Con todos los pesos juntos, la regla mezclaría especies de 10 g con especies de 160 g (NL, la rata de campo, tiene una mediana de 164 g): marcaría como anómala a casi toda especie grande y no vería un roedor pequeño con un peso imposible para su especie. Los 556 marcados se **revisan**, no se borran: muchos serán hembras preñadas o juveniles.

**Idea reutilizable:** las reglas de anómalos se aplican dentro del grupo comparable, con `transform`.
:::

## Ejercicio 7. La serie mensual de capturas

Cuenta las capturas por mes (desde julio de 1977 hasta diciembre de 2002) y calcula su media móvil de 12 meses. ¿Cuántos meses tiene la serie y en cuántos no hubo capturas? ¿Esos meses son ceros o faltantes?

:::pista Concepto
`resample("MS").size()` sobre un índice de fechas (conferencia 6). Un mes sin filas sale con 0: ¿significa que no había animales o que no se muestreó?
:::

:::pista Estrategia
Quita las fechas `NaT` del ejercicio 2, pon `fecha` como índice, remuestrea y cuenta los ceros. Después decide y aplica `rolling(12)`.
:::

:::pista Arranque
```python
m = s.dropna(subset=["fecha"]).set_index("fecha").resample("MS").size()
len(m), (m == 0).sum()
```
:::

:::pista Desbloqueo
En este estudio, que un mes no tenga **ninguna** fila significa que no hubo campaña de muestreo (ni siquiera aparece una captura de una especie común). Trátalos como faltantes: `m.where(m > 0)`. `rolling(12, min_periods=9)` evita que unos pocos meses faltantes anulen toda la ventana.
:::

:::solucion Solución modelo
```python
m = s.dropna(subset=["fecha"]).set_index("fecha").resample("MS").size()
len(m)                      # 306 meses: de 1977-07 a 2002-12
(m == 0).sum()              # 24 meses sin ninguna captura
m = m.where(m > 0)          # sin muestreo → faltante, no cero
media12 = m.rolling(12, min_periods=9).mean()
m.groupby(m.index.year).sum().idxmax()     # 1997, el año con más capturas (2493)
```
Si dejaras los ceros, la media móvil caería artificialmente en las épocas sin campaña, y un modelo aprendería «descensos» que no ocurrieron. Es la distinción de la conferencia 5 entre «no hubo» y «no se sabe».

**Idea reutilizable:** tras `resample`, pregunta qué significa un intervalo vacío antes de usarlo.
:::

## Ejercicio 8. Un gráfico que responda una pregunta

Pregunta: *¿en qué se diferencian las distribuciones de peso de las cinco especies con más pesos registrados?* Haz el gráfico adecuado según la conferencia 7, con título que diga la conclusión, unidades y escala justificada.

:::pista Concepto
«¿Difieren los grupos?» → cajas o violines, no barras con la media. Pesos de 10 a 280 g: piensa en la escala.
:::

:::pista Estrategia
Elige las 5 especies con `value_counts().head(5).index`, filtra con `isin` y usa `sns.boxplot` (o `violinplot`) con `ax=`.
:::

:::pista Arranque
```python
top5 = s.dropna(subset=["weight"])["species_id"].value_counts().head(5).index   # DM, PP, DO, PB, RM
datos = s[s["species_id"].isin(top5)]
```
:::

:::pista Desbloqueo
Ordena las cajas por mediana (`order=`) para que la comparación se lea de un vistazo, y prueba `ax.set_yscale("log")`: si los grupos difieren en factores, la escala log los hace comparables.
:::

:::solucion Solución modelo
```python
import matplotlib.pyplot as plt
import seaborn as sns

top5 = s.dropna(subset=["weight"])["species_id"].value_counts().head(5).index
datos = s[s["species_id"].isin(top5)]
orden = datos.groupby("species_id")["weight"].median().sort_values().index
fig, ax = plt.subplots(figsize=(7, 4))
sns.boxplot(data=datos, x="species_id", y="weight", order=orden, ax=ax)
ax.set_yscale("log")
ax.set(xlabel="especie", ylabel="peso (g, escala log)",
       title="DM y DO pesan entre 2,5 y 5 veces más que PP y RM")
ax.spines[["top", "right"]].set_visible(False)
fig.savefig("figuras/pesos-top5.png", dpi=150, bbox_inches="tight")
```
Comprueba el título con los datos antes de publicarlo: `datos.groupby("species_id")["weight"].median()` da RM 10 g, PP 17 g, PB 31 g, DM 44 g y DO 50 g; $44/17 \approx 2{,}6$ y $50/10 = 5$. Un título-conclusión que no cuadra con la figura es peor que uno descriptivo.

**Idea reutilizable:** la pregunta elige el gráfico; el título dice la respuesta, verificada.
:::

## Ejercicio 9. Online Retail II: leer un Excel de un millón de filas

Descomprime `online-retail-ii.zip`, lee **las dos hojas**, júntalas y guarda el resultado en Parquet. Lee como texto `Invoice` y `StockCode`. ¿Cuántas filas hay? ¿Hay algo raro entre las fechas de las dos hojas?

:::pista Concepto
`read_excel(..., sheet_name=None)` devuelve un diccionario de hojas; `pd.concat` las apila. Leer un millón de filas de Excel tarda minutos: hazlo una vez y guarda Parquet (conferencia 5).
:::

:::pista Estrategia
Lee, concatena y mira el mínimo y el máximo de `InvoiceDate` en **cada** hoja por separado.
:::

:::pista Arranque
```python
hojas = pd.read_excel("data/raw/online_retail_II.xlsx", sheet_name=None,
                      dtype={"Invoice": str, "StockCode": str})
{k: (v["InvoiceDate"].min(), v["InvoiceDate"].max()) for k, v in hojas.items()}
```
:::

:::pista Desbloqueo
La hoja 2009-2010 termina el 9 de diciembre de 2010, y la 2010-2011 empieza el 1 de diciembre de 2010: **se solapan nueve días**. ¿Están esas facturas en las dos hojas?
:::

:::solucion Solución modelo
```python
h1, h2 = hojas["Year 2009-2010"], hojas["Year 2010-2011"]
len(h1) + len(h2)                              # 1 067 371 (525 461 + 541 910)
comunes = set(h1["Invoice"]) & set(h2["Invoice"])
len(comunes)                                   # 1088 facturas en ambas hojas
h2["Invoice"].isin(comunes).sum()              # 22 523 filas repetidas (1-9 de diciembre de 2010)
df = pd.concat([h1, h2[~h2["Invoice"].isin(h1["Invoice"])]], ignore_index=True)
len(df)                                        # 1 044 848
df.to_parquet("data/processed/online_retail.parquet")
```
Si concatenas sin más, las ventas de esos nueve días cuentan **dos veces**, y diciembre de 2010 sale inflado en cualquier serie. Las filas repetidas son idénticas, así que quitarlas por factura es seguro. Fíjate en `dtype=str`: `Invoice` mezcla números (`489434`) y textos (`C489449`); sin el `dtype`, la columna queda con tipos mezclados.

**Idea reutilizable:** cuando juntes archivos o hojas, comprueba que sus rangos no se solapan.
:::

## Ejercicio 10. Devoluciones, precios raros y clientes desconocidos

En `df` (ya sin el solape): ¿cuántas líneas son cancelaciones (`Invoice` empieza por «C»)? ¿Cuántas tienen cantidad negativa y cuántas de esas **no** son cancelaciones? ¿Cuántas tienen precio ≤ 0? ¿Cuántas no tienen cliente? Quedan duplicados exactos: ¿cuántos? Construye `ventas`, la tabla de ventas válidas, justificando cada filtro.

:::pista Concepto
Reglas de negocio primero (conferencia 5): cada regla es una máscara con nombre que se cuenta.
:::

:::pista Estrategia
Un diccionario de máscaras y un bucle que imprime cuántas cumple cada una; después, `ventas = df[~cancelacion & (cantidad > 0) & (precio > 0)]`.
:::

:::pista Arranque
```python
reglas = {
    "cancelación": df["Invoice"].str.startswith("C"),
    "cantidad < 0": df["Quantity"] < 0,
    "precio <= 0": df["Price"] <= 0,
    "sin cliente": df["Customer ID"].isna(),
}
```
:::

:::pista Desbloqueo
`(df["Quantity"] < 0) & ~df["Invoice"].str.startswith("C")` son ajustes de inventario (daños, pérdidas), casi siempre sin cliente y con precio 0. Para los duplicados, `df.duplicated().sum()`; decide con el razonamiento del ejercicio 5.
:::

:::solucion Solución modelo
Valores de control sobre `df` (1 044 848 filas, ya sin el solape): 19 165 cancelaciones; 22 557 cantidades negativas, de las que 3 393 no son cancelaciones; 6 029 precios ≤ 0; 235 287 líneas sin cliente; 11 812 duplicados exactos. (Si no quitaste el solape, saldrán 19 494, 22 950, 3 457, 6 207 y 243 007: la diferencia es exactamente lo que se contaba dos veces.)

```python
for nombre, m in reglas.items():
    print(f"{nombre}: {m.sum()}")
ajustes = (df["Quantity"] < 0) & ~reglas["cancelación"]
df.duplicated().sum()                       # 11 812
ventas = df[~reglas["cancelación"] & (df["Quantity"] > 0) & (df["Price"] > 0)].copy()
ventas["importe"] = ventas["Quantity"] * ventas["Price"]
ventas["Customer ID"] = ventas["Customer ID"].astype("Int64")
```
Decisiones: las cancelaciones y los ajustes no son ventas (para la **demanda** podrías querer las devoluciones aparte); los precios ≤ 0 son muestras o ajustes; las líneas sin cliente **sí** son ventas (compras sin cuenta), así que se conservan para la demanda y se excluyen solo de los análisis por cliente. Los duplicados exactos dentro de una misma factura son ambiguos (¿dos líneas iguales o un error de exportación?): sin un identificador de línea, lo prudente es conservarlos y documentarlo, o quitarlos y decir cuánto cambia el total. Escríbelo en el `README`.

**Idea reutilizable:** un filtro por decisión, con su nombre y su cuenta; nunca un filtro mágico de una línea sin explicar.
:::

## Ejercicio 11. Unidades semanales y los diez más vendidos por país

Con `ventas`: (a) las unidades semanales de cada `StockCode`, con las semanas sin ventas a 0, y su media móvil de 4 semanas; (b) los 10 productos con más unidades de cada país.

:::pista Concepto
(a) es el ejemplo 2 de la conferencia 6 (`Grouper` + `unstack` + `asfreq` + `rolling` en ancho). (b) es el ejemplo 1b (orden + `groupby().head`).
:::

:::pista Estrategia
Para (a), con 4000 productos el formato ancho tiene 4000 columnas: es razonable, pero puedes quedarte con los 50 más vendidos. Para (b), suma por (país, producto), ordena y corta.
:::

:::pista Arranque
```python
sem = (ventas.groupby(["StockCode", pd.Grouper(key="InvoiceDate", freq="W")])["Quantity"]
             .sum().unstack("StockCode", fill_value=0).asfreq("W", fill_value=0))
```
:::

:::pista Desbloqueo
Las semanas de los extremos (empieza un martes, termina un viernes) están incompletas: quita la primera y la última fila de `sem` antes de la media móvil, o caerán anormalmente bajas.
:::

:::solucion Solución modelo
```python
sem = (ventas.groupby(["StockCode", pd.Grouper(key="InvoiceDate", freq="W")])["Quantity"]
             .sum().unstack("StockCode", fill_value=0).asfreq("W", fill_value=0))
sem = sem.iloc[1:-1]                                   # semanas incompletas fuera
media4 = sem.rolling(4, min_periods=1).mean()

tot = ventas.groupby(["Country", "StockCode"], as_index=False)["Quantity"].sum()
top10 = (tot.sort_values(["Country", "Quantity"], ascending=[True, False])
            .groupby("Country").head(10))
```
Comprobaciones: `sem.sum().sum()` debe ser la suma de `ventas["Quantity"]` menos lo de las semanas recortadas; `top10.groupby("Country").size().max()` es 10. Hay 43 países, pero el Reino Unido acapara más del 90 % de las líneas: para muchos países, el «top 10» se basa en muy pocas ventas, y conviene decirlo junto a la tabla.

**Idea reutilizable:** series por grupo → formato ancho, calendario completo, extremos recortados, ventana.
:::

## Ejercicio 12. Una partición por factura, y NumPy contra pandas

(a) Separa el 20 % de las **facturas** (no de las líneas) como prueba, de forma reproducible, y comprueba que ninguna factura queda partida. (b) Calcula las unidades por país con `np.bincount` y comprueba que coinciden con `groupby`.

:::pista Concepto
(a) Las líneas de una misma factura no son independientes: si unas caen en entrenamiento y otras en prueba, el modelo «ve» la prueba (conferencia 4, observación sobre grupos). Se permutan las **facturas**. (b) `pd.factorize` convierte una columna en códigos enteros $0, \dots, k-1$; `np.bincount` suma por código (conferencia 3, patrón 5).
:::

:::pista Estrategia
(a) `rng.permutation` de las facturas únicas, corte, `isin`. (b) `factorize`, `bincount` con pesos, y comparación con `np.allclose` tras alinear el orden.
:::

:::pista Arranque
```python
rng = np.random.default_rng(42)
facturas = ventas["Invoice"].unique()
prueba = rng.permutation(facturas)[: int(0.2 * len(facturas))]
```
:::

:::pista Desbloqueo
`groupby(..., sort=False)` devuelve los países en orden de primera aparición, que es el mismo orden que usa `factorize`; aun así, alinea explícitamente con `.reindex(paises)`.
:::

:::solucion Solución modelo
```python
rng = np.random.default_rng(42)
facturas = ventas["Invoice"].unique()
prueba = rng.permutation(facturas)[: int(0.2 * len(facturas))]
es_prueba = ventas["Invoice"].isin(prueba)
ent, pru = ventas[~es_prueba], ventas[es_prueba]
assert set(ent["Invoice"]).isdisjoint(pru["Invoice"])      # ninguna factura partida

codigos, paises = pd.factorize(ventas["Country"])
u = np.bincount(codigos, weights=ventas["Quantity"].to_numpy())
ref = ventas.groupby("Country")["Quantity"].sum().reindex(paises)
assert np.allclose(u, ref.to_numpy())
```
La partición por factura es la misma idea que `GroupKFold` de scikit-learn, que usarás en ML I. Y `bincount` es la prueba de que `groupby(...).sum()` es una reducción por grupos: la misma operación que en NumPy, con etiquetas.

**Idea reutilizable:** parte por la unidad que es independiente (la factura, el cliente, el paciente), no por la fila.
:::
