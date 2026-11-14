# Conferencia 5. pandas I: datos sucios

> **Objetivos.** Al terminar esta conferencia serás capaz de:
>
> 1. **Leer** archivos CSV y Excel con formato español o cubano (separador `;`, coma decimal, fechas `dd/mm/aaaa`, varias hojas) y **obtener** los tipos correctos desde la lectura.
> 2. **Inspeccionar** una tabla nueva en cinco minutos con una lista fija de comprobaciones.
> 3. **Convertir** tipos sin perder datos en silencio (`to_numeric`, `to_datetime`, `category`, enteros con faltantes) y **extraer** componentes de fechas.
> 4. **Tratar** valores faltantes y centinelas, duplicados y texto inconsistente, **justificando** cada decisión.
> 5. **Detectar** valores anómalos con reglas de negocio, con el rango intercuartílico y con la desviación absoluta mediana, y **decidir** qué hacer con cada uno.
> 6. **Modificar** un `DataFrame` de forma correcta con la semántica de copia al escribir (*copy-on-write*) de pandas 3.

> **Prerrequisitos.** NumPy: `dtype`, máscaras booleanas y reducciones ([conferencias 2](c02-ndarray.md) y [3](c03-vectores.md)). Dijiste que ya filtras y agrupas con pandas: esta conferencia no empieza de cero, sino en lo que hace que un análisis real salga mal.

> **Versión.** Todo el código sigue **pandas 3.0** (enero de 2026). Cambió tres cosas que verás en tutoriales antiguos: el texto tiene su propio tipo `str`, las fechas se guardan por defecto con resolución de microsegundos y la *copia al escribir* es obligatoria. Si un tutorial de 2022 no te funciona, casi siempre es por esto.

---

## 1. Motivación: los datos de una mipyme no vienen limpios

Imagina que una mipyme de La Habana te pasa las ventas de su contabilidad. Así llegan casi siempre:

- un CSV exportado de Excel con `;` como separador y coma decimal (`250,00`);
- las fechas como `03/01/2026`, que puede ser el 3 de enero o el 1 de marzo;
- la misma tienda escrita como `Centro`, `centro ` y `CENTRO`;
- celdas vacías, `-`, `s/d` o `9999` cuando no se sabe el precio;
- filas repetidas porque alguien exportó dos veces;
- precios en CUP y en USD mezclados en la misma columna.

Si cargas eso con `pd.read_csv("ventas.csv")` y calculas `df.groupby("tienda")["unidades"].sum()`, obtendrás **un número**. El problema es que será falso y nada te avisará. La limpieza no es un trámite previo al análisis: es la parte del análisis en la que más se equivoca la gente, y de la que depende todo lo demás.

> **Problema para pensar (10 minutos).** Este es el archivo, pequeño a propósito:
>
> ```text
> fecha;tienda;producto;unidades;precio
> 03/01/2026;Centro;Arroz 1kg;12;250,00
> 03/01/2026;centro ;arroz 1kg;3;250,00
> 04/01/2026;Playa;Aceite 1L;-;890,50
> 04/01/2026;Playa;Aceite 1L;-;890,50
> 05/01/2026;Cerro;Pollo 1kg;5;9999
> 13/01/2026;Centro;Café 250g;2;1.200,00
> ```
>
> Sin ejecutar nada, haz una lista de **todo** lo que saldría mal si lo lees con `pd.read_csv` sin opciones y calculas el total vendido (unidades × precio) por tienda. Apunta al menos seis problemas.

:::solucion Los problemas (al menos ocho)
1. **Separador:** sin `sep=";"`, pandas ve una sola columna llamada `fecha;tienda;producto;unidades;precio`.
2. **Coma decimal:** `250,00` se leería como texto, no como 250.
3. **Separador de miles:** `1.200,00` es 1200; sin `thousands="."` y `decimal=","`, es texto.
4. **Fechas:** sin indicarlo, `03/01/2026` queda como texto; si se interpreta al estilo estadounidense, sería el 1 de marzo.
5. **`-` como faltante:** convierte toda la columna `unidades` en texto.
6. **Mayúsculas y espacios:** `Centro` y `centro ` serían dos tiendas; `Arroz 1kg` y `arroz 1kg`, dos productos.
7. **Duplicado:** las dos filas de aceite son idénticas; ¿es una venta repetida o un error de exportación?
8. **Centinela:** `9999` no es un precio real del pollo; es un código de «no sé».

Y una más sutil: aunque lo arregles todo, las unidades de aceite son desconocidas, así que su total es desconocido, no 0.
:::

---

## 2. El modelo de pandas en un minuto

> **Definición 1 (`Series`, `DataFrame`, `Index`).**
> - Una **`Series`** es un arreglo 1D con un `dtype` **más** un índice de etiquetas.
> - Un **`DataFrame`** es una colección de `Series` **que comparten el mismo índice**, una por columna. Cada columna tiene su propio `dtype`.
> - El **`Index`** son las etiquetas de las filas (por defecto, $0, 1, \dots, n-1$). Las operaciones entre `Series` **se alinean por etiqueta, no por posición**.

La última frase explica muchas sorpresas:

```python
a = pd.Series([1, 2, 3], index=["x", "y", "z"])
b = pd.Series([10, 20, 30], index=["y", "z", "w"])
a + b
# w     NaN
# x     NaN
# y    12.0
# z    23.0
```

`a + b` no suma posición a posición: suma `y` con `y`, y donde una etiqueta falta en uno de los dos, pone `NaN`. Por eso, tras filtrar filas, el índice queda con huecos (`0, 2, 5…`), y si combinas con otra tabla por posición te equivocas. `df.reset_index(drop=True)` renumera.

### 2.1. Seleccionar: `loc`, `iloc` y máscaras

| Forma | Selecciona por | Ejemplo |
|---|---|---|
| `df["col"]`, `df[["a", "b"]]` | nombre de columna | una `Series`; un `DataFrame` |
| `df.loc[filas, columnas]` | **etiquetas** (y máscaras) | `df.loc[df["unidades"] > 0, ["fecha", "unidades"]]` |
| `df.iloc[filas, columnas]` | **posiciones** enteras | `df.iloc[:5, 0]` |
| `df[mascara]` | máscara booleana de filas | `df[df["tienda"] == "Centro"]` |
| `df.query("...")` | expresión en texto | `df.query("unidades > 0 and tienda == 'Centro'")` |

Con `loc`, las rebanadas de etiquetas **incluyen** el final (`df.loc["2026-01-01":"2026-01-31"]` incluye el 31); con `iloc`, como en Python, no.

---

## 3. Leer bien desde el principio

La regla de oro: **cuantos más problemas se resuelvan en la lectura, menos código de limpieza hace falta y menos errores se cuelan.** `read_csv` tiene parámetros para casi todo.

```python
import io
import pandas as pd

texto = """fecha;tienda;producto;unidades;precio
03/01/2026;Centro;Arroz 1kg;12;250,00
03/01/2026;centro ;arroz 1kg;3;250,00
04/01/2026;Playa;Aceite 1L;-;890,50
04/01/2026;Playa;Aceite 1L;-;890,50
05/01/2026;Cerro;Pollo 1kg;5;9999
13/01/2026;Centro;Café 250g;2;1.200,00
"""

df = pd.read_csv(
    io.StringIO(texto),          # en la vida real: "datos/ventas.csv"
    sep=";",                     # separador de campos
    decimal=",",                 # coma decimal
    thousands=".",               # punto de miles
    na_values=["-", "s/d", "N/D"],   # además de las celdas vacías, que ya son NaN
    parse_dates=["fecha"],
    date_format="%d/%m/%Y",      # formato EXPLÍCITO: día/mes/año
    encoding="utf-8",
)
df.dtypes
# fecha       datetime64[us]
# tienda      str
# producto    str
# unidades    float64       ← tiene faltantes, así que no puede ser int64
# precio      float64
```

Cada parámetro, por qué:

- **`sep`, `decimal` y `thousands`** resuelven el formato numérico español. Un CSV exportado de un Excel configurado en español usa casi siempre `;` porque la coma ya es el separador decimal.
- **`na_values`** declara los centinelas **de texto** que significan «falta». El centinela numérico `9999` **no** lo pongas aquí a ciegas: también podría ser una cantidad real en otra columna. Lo tratamos aparte (sección 6).
- **`date_format`** fija el formato exacto. Sin él, pandas intenta adivinar, y en `03/01/2026` la adivinanza puede salir al revés. Con un formato explícito, una fecha que no encaja **falla**, y es lo que quieres.
- **`encoding`.** Si ves caracteres como `CafÃ©`, el archivo estaba en otra codificación. Los archivos de Excel antiguos en Windows suelen estar en `cp1252` (o `latin-1`); prueba `encoding="cp1252"`.

Otros parámetros útiles: `usecols` (leer solo algunas columnas: ahorra memoria), `dtype={"codigo": "str"}` (que los códigos `00123` no pierdan sus ceros a la izquierda), `skiprows` y `nrows` (saltar cabeceras de informe o leer una muestra), `index_col`.

### 3.1. Excel

```python
hojas = pd.read_excel("ventas.xlsx", sheet_name=None)   # dict {nombre_de_hoja: DataFrame}
df = pd.concat(hojas.values(), ignore_index=True)        # todas las hojas en una tabla
```

- Necesita el paquete `openpyxl` (está en el `requirements.in` de la conferencia 1).
- `sheet_name=None` lee **todas** las hojas; `sheet_name="Enero"` lee una.
- Las hojas «para personas» suelen tener títulos, celdas combinadas y totales al final. Usa `skiprows=` y `header=` para saltar la cabecera decorativa, y elimina las filas de totales después (`df[df["producto"] != "TOTAL"]`).
- Una fecha de Excel a veces llega como **número de serie** (días desde el 30/12/1899): `pd.to_datetime(s, unit="D", origin="1899-12-30")`.

### 3.2. Parquet: lo que usarás para tus propios datos

CSV y Excel son formatos de intercambio, no de trabajo. Una vez limpia la tabla, guárdala en **Parquet**: conserva los tipos (fechas, categorías), comprime y se lee decenas de veces más rápido.

```python
df.to_parquet("datos/procesados/ventas.parquet")    # requiere pyarrow
df = pd.read_parquet("datos/procesados/ventas.parquet")
```

**Antes de seguir:** un CSV tiene una columna `codigo_producto` con valores como `00731`. Al leerlo, ¿qué `dtype` le asigna pandas y qué se pierde? ¿Cómo lo evitas?

:::solucion Respuesta
Pandas lo infiere como entero (`int64`) y `00731` pasa a ser `731`: se pierden los ceros a la izquierda y dos códigos distintos (`0731` y `00731`) pueden colisionar. Se evita con `dtype={"codigo_producto": "str"}`. Regla general: **los identificadores son texto** aunque parezcan números; no tiene sentido sumarlos.
:::

---

## 4. Inspección en cinco minutos

Ante una tabla nueva, **antes de calcular nada**, ejecuta siempre la misma lista. Es una rutina de cinco minutos que te ahorra horas.

```python
df.shape                       # 1. ¿cuántas filas y columnas? ¿cuadra con lo esperado?
df.head(); df.sample(5, random_state=0)   # 2. mirar filas reales, no solo las primeras
df.dtypes                      # 3. ¿cada columna tiene el tipo que debería?
df.isna().sum()                # 4. faltantes por columna
df.isna().mean().round(3)      #    ... y en proporción
df.duplicated().sum()          # 5. filas duplicadas exactas
df.nunique()                   # 6. valores distintos por columna (¿2 tiendas o 7 «tiendas»?)
df.describe()                  # 7. resumen numérico: mínimos, máximos, cuartiles
df["tienda"].value_counts(dropna=False)   # 8. frecuencias de cada categoría, incluidos los faltantes
```

Qué buscar en cada salida:

- en `dtypes`, columnas numéricas que salieron como `str` (hay un texto escondido);
- en `describe`, mínimos negativos donde no puede haberlos, máximos absurdos (`9999`), o la media muy lejos de la mediana (`50%`);
- en `nunique`, más categorías de las que existen (variantes de escritura);
- en `value_counts`, las variantes concretas.

En nuestro ejemplo, `df["tienda"].value_counts()` mostraría `Centro` (2), `Playa` (2), `centro ` (1) y `Cerro` (1): **cuatro** tiendas donde hay **tres**.

---

## 5. Tipos: convertir sin perder datos en silencio

### 5.1. Números escondidos en texto

Si una columna numérica salió como `str`, hay al menos un valor que no se pudo convertir. **Encuéntralo antes de forzar la conversión:**

```python
s = pd.Series(["12", "3", "-", "5", "doce"])
convertida = pd.to_numeric(s, errors="coerce")    # lo que no se puede convertir → NaN
s[convertida.isna() & s.notna()]                  # ¿qué valores fallaron?  →  "-", "doce"
```

`errors="coerce"` es cómodo y peligroso: convierte en `NaN` cualquier cosa que no entiende, también un `"1.200"` mal formateado. Por eso la segunda línea, que **muestra lo que falló**, no es opcional.

### 5.2. Enteros con faltantes

En NumPy un entero no puede ser `NaN`, así que una columna de enteros con un solo faltante se convierte en `float64` (por eso `unidades` salió `float64`). Si quieres conservar enteros, pandas tiene tipos **anulables** con su propio faltante, `pd.NA`:

```python
df["unidades"] = df["unidades"].astype("Int64")   # con I mayúscula: entero que admite <NA>
```

### 5.3. Categorías

Una columna con pocos valores repetidos (tienda, país, tipo de producto) puede ser `category`: guarda cada valor una vez y un código entero por fila. Gasta mucha menos memoria y fija el conjunto de valores válidos.

```python
df["tienda"] = df["tienda"].astype("category")
df["tienda"].cat.categories          # los valores posibles
```

Ojo al agrupar por una categoría: `groupby` usa `observed=True` por defecto desde pandas 3 (solo aparecen las categorías presentes). Lo verás en la conferencia 6.

### 5.4. Fechas

```python
f = pd.to_datetime(df["fecha_texto"], format="%d/%m/%Y", errors="coerce")
f.isna().sum()                       # ¿cuántas no encajaron en el formato?
df["dia_semana"] = f.dt.dayofweek    # 0 = lunes … 6 = domingo
df["mes"] = f.dt.month
df["semana"] = f.dt.isocalendar().week
df["es_fin_de_semana"] = f.dt.dayofweek >= 5
(f.max() - f.min()).days             # duración del periodo, en días
```

- **Siempre con `format`** cuando lo conoces. Sin él, `03/01/2026` puede leerse al revés: en un archivo con `13/01/2026` en otra fila, pandas detectaría el día primero o fallaría según la versión, y **las fechas ambiguas cambiarían de significado según el archivo**.
- El accesor `.dt` da los componentes. `f.dt.day_name()` devuelve los nombres en inglés (`Monday`); para español, usa una lista propia con `dayofweek`.
- En pandas 3, `to_datetime` de texto da `datetime64[us]` (microsegundos). Si conviertes fechas a enteros (`astype("int64")`), obtendrás **microsegundos** desde 1970, no nanosegundos como antes: no lo hagas; si necesitas números, usa `(f - f.min()).dt.days`.

**Antes de seguir:** `pd.to_datetime(["01/02/2026", "13/02/2026"], format="%m/%d/%Y", errors="coerce")`. ¿Qué devuelve y qué te dice eso sobre el archivo?

:::solucion Respuesta
`2026-01-02` y `NaT` (el faltante de las fechas): no existe el mes 13. Eso te dice que el archivo está en formato **día/mes**, y que el formato `%m/%d/%Y` es incorrecto. Con `%d/%m/%Y` serían el 1 y el 13 de febrero. Por eso conviene revisar cuántos `NaT` produce la conversión: una fracción alta delata un formato equivocado.
:::

---

## 6. Faltantes y centinelas

### 6.1. Primero, entender por qué falta

Antes de rellenar o borrar, pregunta **por qué** falta el dato. La causa decide el tratamiento:

| Causa | Ejemplo | Tratamiento razonable |
|---|---|---|
| no se registró, al azar | el cajero olvidó apuntar unas unidades | imputar (mediana del producto) o descartar, **documentándolo** |
| no aplica | «fecha de devolución» en una venta no devuelta | dejar el faltante: no es un error |
| depende del propio valor | los días sin venta no tienen fila | **crear** las filas faltantes con 0 (conferencia 6) |
| un fallo del sistema | 13 días sin datos por un apagón | marcar el periodo, no imputar como si fuera normal |

El tercer caso es el más traicionero en ventas: un día sin ventas **no aparece** en la tabla, así que ni siquiera es un `NaN`. La media de ventas diarias calculada sobre las filas existentes sale **inflada**.

### 6.2. Herramientas

```python
df.isna().sum()                                     # faltantes por columna
df[df["unidades"].isna()]                           # mira las filas: ¿hay un patrón?
df.dropna(subset=["unidades"])                      # descartar solo si falta en esa columna
df["unidades"].fillna(0)                            # rellenar con una constante (¡solo si 0 es verdad!)
df.groupby("producto")["precio"].transform("median")   # la mediana de cada producto (conferencia 6)
df["precio"].ffill()                                # repetir el último valor válido (series temporales)
```

### 6.3. Centinelas numéricos

Un centinela (`9999`, `-1`, `0` en una columna que no puede ser 0) es un faltante disfrazado. Se detecta con `describe` y `value_counts`, y se convierte en faltante **con una regla explícita**:

```python
centinela = df["precio"] == 9999
print(centinela.sum(), "precios centinela")       # documenta cuántos
df.loc[centinela, "precio"] = float("nan")
```

> **Observación 1 (no imputes para quedar bien).** Rellenar todos los faltantes con la media hace que la tabla «parezca» completa y reduce artificialmente la variabilidad. Para un **modelo**, la imputación se aprende **solo con los datos de entrenamiento** (otra vez la fuga de datos: ML I). Para un **informe**, a menudo lo honesto es decir «faltan 37 días» y no inventarlos.

---

## 7. Duplicados y texto inconsistente

### 7.1. Duplicados

```python
df.duplicated().sum()                                  # filas idénticas en TODAS las columnas
df[df.duplicated(keep=False)]                          # ver todas las copias, no solo las repetidas
df.duplicated(subset=["fecha", "tienda", "producto"]).sum()   # duplicados de clave
df = df.drop_duplicates()                              # quedarse con la primera de cada grupo idéntico
```

Un duplicado exacto puede ser un error de exportación **o dos ventas iguales reales** (dos clientes compraron 2 kg de arroz el mismo día). La pregunta decisiva: **¿hay un identificador de transacción?** Si lo hay, los duplicados de ese identificador son errores; si no, quitar duplicados puede borrar ventas reales. Decídelo con quien conoce el negocio y anótalo en el código.

### 7.2. Texto

El accesor `.str` aplica operaciones de texto a toda la columna, vectorizadas:

```python
t = df["tienda"].str.strip().str.title()        # "centro " → "Centro"; "CENTRO" → "Centro"
p = df["producto"].str.strip().str.lower()      # normalizar productos
p.str.contains("arroz")                         # máscara booleana
p.str.extract(r"(\d+)\s*(kg|g|l)")              # extraer cantidad y unidad con una expresión regular
p.str.replace(r"\s+", " ", regex=True)          # colapsar espacios múltiples
```

Para comparar sin tildes (`Café` frente a `Cafe`), normaliza Unicode:

```python
sin_tildes = (p.str.normalize("NFKD")
               .str.encode("ascii", errors="ignore")
               .str.decode("ascii"))
```

Y cuando las variantes no siguen una regla, un **diccionario de correspondencias** explícito es lo más claro y lo más fácil de revisar:

```python
correcciones = {"ctro": "Centro", "c. habana": "Centro Habana"}
df["tienda"] = t.replace(correcciones)
```

> **Ejemplo 1 (limpieza completa del archivo inicial, resuelto).**
>
> 1. **Leer** con `sep`, `decimal`, `thousands`, `na_values=["-"]` y `date_format="%d/%m/%Y"` (sección 3). Resultado: `unidades` y `precio` son `float64`, `fecha` es `datetime64`.
> 2. **Normalizar el texto:** `df["tienda"] = df["tienda"].str.strip().str.title()` y `df["producto"] = df["producto"].str.strip().str.lower()`. Ahora hay 3 tiendas y `arroz 1kg` aparece igual en las dos filas.
> 3. **Centinela:** `df.loc[df["precio"] == 9999, "precio"] = float("nan")` (1 fila).
> 4. **Duplicados:** `df.duplicated().sum()` da 1 (la segunda fila de aceite). Supongamos que el dueño confirma que fue una exportación doble: `df = df.drop_duplicates()`. Quedan 5 filas.
> 5. **Importe:** `df["importe"] = df["unidades"] * df["precio"]`. Es `NaN` en el aceite (unidades desconocidas) y en el pollo (precio desconocido).
> 6. **Total por tienda, con honestidad:**
>    ```python
>    df.groupby("tienda")["importe"].agg(["sum", "count", "size"])
>    #            sum  count  size
>    # Centro  6150.0      3     3      ← 12·250 + 3·250 + 2·1200
>    # Cerro      0.0      0     1      ← ¡sum de solo NaN es 0!
>    # Playa      0.0      0     1
>    ```
>    `sum` ignora los `NaN` y, si todos lo son, devuelve 0. Por eso pedimos también `count` (no faltantes) y `size` (filas): Cerro y Playa **no vendieron 0**; **no sabemos** cuánto vendieron. En un informe, eso se escribe así, no como un cero.

**Antes de seguir:** en el paso 6, ¿cómo harías que la suma de un grupo sin ningún dato válido diera `NaN` en vez de 0?

:::solucion Respuesta
Con el parámetro `min_count`: `df.groupby("tienda")["importe"].sum(min_count=1)` exige al menos un valor válido; si no lo hay, el resultado es `NaN`. Así los grupos sin información no se confunden con grupos que vendieron 0.
:::

---

## 8. Detectar valores anómalos

Un **valor anómalo** (*outlier*) es uno que no encaja con el resto. Puede ser un error (un centinela, una coma mal puesta, otra unidad) o un dato real e importante (una compra mayorista, un fraude). **Detectar no es borrar**: es marcar para revisar.

### 8.1. Primero, reglas de negocio

Las reglas que salen de entender el problema son las más fiables y las primeras que debes aplicar:

```python
reglas = {
    "unidades negativas": df["unidades"] < 0,           # ¿devoluciones? En Online Retail II, sí
    "precio cero o negativo": df["precio"] <= 0,
    "fecha futura": df["fecha"] > pd.Timestamp.today(),
    "fuera del horario": ~df["hora"].between(8, 20),     # si existe esa columna
}
for nombre, mascara in reglas.items():
    print(f"{nombre}: {mascara.sum()}")
```

### 8.2. Reglas estadísticas

> **Definición 2 (regla del rango intercuartílico, de Tukey).** Sea $Q_1$ el primer cuartil, $Q_3$ el tercero y $\mathrm{IQR} = Q_3 - Q_1$. Un valor $x$ es **sospechoso** si $x < Q_1 - 1{,}5\,\mathrm{IQR}$ o $x > Q_3 + 1{,}5\,\mathrm{IQR}$.

> **Definición 3 (puntuación z robusta).** Con la mediana $\tilde x$ y la **desviación absoluta mediana** $\mathrm{MAD} = \mathrm{mediana}(|x_i - \tilde x|)$, se define
>
> $$z_i^{\text{rob}} = \frac{0{,}6745\,(x_i - \tilde x)}{\mathrm{MAD}}$$
>
> y se marca $|z^{\text{rob}}| > 3{,}5$ (criterio de Iglewicz y Hoaglin). El factor 0,6745 hace que, con datos normales, $z^{\text{rob}}$ sea comparable a la puntuación z clásica.

¿Por qué no la puntuación z clásica, $(x - \bar x)/s$? Porque la media y la desviación típica **se dejan arrastrar por los propios anómalos**: un solo `9999` entre precios de 200 sube la media y, sobre todo, la desviación, y entonces nada parece anómalo. Al anómalo «se le esconde» su propio efecto (*enmascaramiento*). La mediana y la MAD no se mueven con unos pocos valores extremos: son **robustas**.

```python
x = df["precio"].dropna()
q1, q3 = x.quantile([0.25, 0.75])
iqr = q3 - q1
fuera_iqr = (x < q1 - 1.5 * iqr) | (x > q3 + 1.5 * iqr)

med = x.median()
mad = (x - med).abs().median()
z_rob = 0.6745 * (x - med) / mad
fuera_mad = z_rob.abs() > 3.5
```

### 8.3. La escala importa

Los precios, los ingresos y las cantidades suelen tener **cola larga a la derecha**: muchos valores pequeños y unos pocos grandes, todos legítimos. En escala lineal, cualquier regla marca como anómala toda la cola. En escala **logarítmica** la distribución se hace más simétrica y la regla marca lo que de verdad no encaja (figura 1).

![Figura 1. Precios simulados con cola larga y dos centinelas 9999. A la izquierda, la regla del IQR en escala lineal marca 30 precios: toda la cola, que es legítima. A la derecha, la misma regla sobre log10(precio) marca 11, entre ellos los centinelas.](figuras/python-cientifico/atipicos-escala.png)

```python
lx = np.log10(x[x > 0])            # el log no admite 0 ni negativos: trátalos aparte
```

### 8.4. Por grupos

Un precio de 900 CUP es normal para el aceite y absurdo para una caja de fósforos. Las reglas estadísticas se aplican **dentro de cada grupo** (producto, tienda) con `groupby(...).transform(...)`, que verás en la conferencia 6:

```python
med_g = df.groupby("producto")["precio"].transform("median")
mad_g = (df["precio"] - med_g).abs().groupby(df["producto"]).transform("median")
df["anomalo"] = (0.6745 * (df["precio"] - med_g) / mad_g).abs() > 3.5
```

### 8.5. ¿Y después de detectar?

| Hallazgo | Acción |
|---|---|
| error evidente con corrección conocida (otra unidad, una coma) | corregir con una regla y documentarla |
| centinela | convertir en faltante |
| dato real extremo (compra mayorista) | **conservar**; quizá analizar aparte o usar métodos robustos |
| no se sabe | marcar con una columna (`df["revisar"] = True`) y preguntar |

**Nunca** borres anómalos solo porque estropean un gráfico o un modelo. Un fraude es, por definición, un anómalo.

---

## 9. Modificar un `DataFrame` en pandas 3: copia al escribir

> **Definición 4 (copia al escribir, *copy-on-write*).** En pandas 3, **cualquier objeto que obtienes de otro (una columna, un filtro, una rebanada) se comporta como una copia independiente**. Por dentro, pandas comparte la memoria mientras nadie escriba y solo copia en el momento de modificar.

Consecuencias prácticas:

```python
# 1. Modificar un subconjunto NO cambia el original (y ya no hay SettingWithCopyWarning)
centro = df[df["tienda"] == "Centro"]
centro["precio"] = 0              # cambia `centro`, no `df`

# 2. La asignación encadenada NO funciona: no modifica df
df[df["precio"] > 5000]["precio"] = float("nan")   # ✗ no hace nada (pandas avisa con ChainedAssignmentError)

# 3. La forma correcta: un solo .loc con máscara de filas y nombre de columna
df.loc[df["precio"] > 5000, "precio"] = float("nan")   # ✓

# 4. Para crear columnas en cadena, assign (devuelve un DataFrame nuevo)
df = df.assign(importe=df["unidades"] * df["precio"],
               mes=df["fecha"].dt.month)
```

La regla es fácil de recordar: **para cambiar `df`, escribe `df.loc[...] = ...` o `df["col"] = ...`; cualquier otra cosa cambia una copia.** Esto es lo contrario de lo que pasaba con las vistas de NumPy ([conferencia 2](c02-ndarray.md)): allí una rebanada **sí** comparte memoria al escribir. Las dos bibliotecas eligieron de forma distinta, y conviene tenerlo presente cuando pases arreglos de una a otra (`df["x"].to_numpy()` puede devolver una vista de solo lectura).

**Antes de seguir:** ¿qué hace cada línea sobre `df`?

```python
df["unidades"] = df["unidades"].fillna(0)        # (a)
df["unidades"].fillna(0, inplace=True)           # (b)
df.loc[df["unidades"].isna(), "unidades"] = 0    # (c)
```

:::solucion Respuesta
(a) y (c) modifican `df`. (b) **no**: `df["unidades"]` es (por la copia al escribir) un objeto independiente, y `inplace=True` modifica ese objeto, que se pierde. Es una asignación encadenada disfrazada; pandas 3 avisa. Evita `inplace=True`: casi nunca ahorra memoria y confunde.
:::

---

## 10. Errores típicos y cómo detectarlos

| Error | Síntoma | Detección y arreglo |
|---|---|---|
| Leer sin `sep`/`decimal` | una sola columna, o números como texto | mira `df.shape` y `df.dtypes` tras leer |
| Fechas sin `format` | fechas ambiguas al revés según el archivo | siempre `format=`; cuenta los `NaT` |
| `errors="coerce"` sin revisar | datos perdidos en silencio | muestra los valores que fallaron |
| Identificadores como números | ceros perdidos, códigos que colisionan | `dtype={"codigo": "str"}` |
| Variantes de texto | más categorías de las reales | `nunique`, `value_counts`; `.str.strip()`, diccionario |
| `sum` de un grupo sin datos | 0 donde no se sabe | `min_count=1`; informa `count` y `size` |
| Días sin ventas sin fila | medias infladas | rellena el calendario (conferencia 6) |
| Puntuación z clásica con anómalos grandes | nada parece anómalo | mediana y MAD; escala log |
| Borrar anómalos | se pierden casos reales importantes | marcar y revisar |
| Asignación encadenada o `inplace` sobre una columna | el cambio no se guarda | `df.loc[mascara, "col"] = valor` |

---

## 11. Ideas que te llevas

- **Lee bien una vez:** `sep`, `decimal`, `thousands`, `na_values`, `date_format`, `dtype`. Comprueba `shape` y `dtypes` justo después.
- **Rutina de inspección:** `shape`, muestra, `dtypes`, faltantes, duplicados, `nunique`, `describe`, `value_counts`.
- **Toda conversión forzada se audita:** qué valores fallaron y cuántos.
- **Antes de tratar un faltante, pregunta por qué falta.** Un faltante no es un cero, y una fila que no existe tampoco.
- **Anómalos:** primero las reglas de negocio; luego IQR o MAD, en la escala adecuada y por grupos. Detectar ≠ borrar.
- **pandas 3:** para modificar, `df.loc[mascara, "col"] = valor`. Todo lo demás es una copia.

---

## 12. Preguntas de recuperación

1. Escribe la llamada a `read_csv` para un archivo con `;`, coma decimal, punto de miles, `s/d` como faltante y fechas `dd/mm/aaaa` en la columna `fecha`.
2. ¿Por qué `pd.to_numeric(..., errors="coerce")` exige una comprobación posterior? Escribe esa comprobación.
3. ¿Por qué una columna de enteros con faltantes sale como `float64`? ¿Qué tipo la conserva entera?
4. Enuncia la regla del IQR y la de la MAD. ¿Por qué la segunda es robusta?
5. ¿Qué diferencia hay entre `count` y `size` en un `groupby`, y por qué importa al sumar?
6. ¿Qué hace `df[mascara]["col"] = 0` en pandas 3? ¿Cuál es la forma correcta?
7. Da dos razones por las que un valor anómalo no debe borrarse sin más.

:::solucion Respuestas
1. `pd.read_csv(ruta, sep=";", decimal=",", thousands=".", na_values=["s/d"], parse_dates=["fecha"], date_format="%d/%m/%Y")`.
2. Porque convierte en `NaN` cualquier valor no interpretable, sin avisar. `c = pd.to_numeric(s, errors="coerce"); s[c.isna() & s.notna()]` muestra lo que falló.
3. Porque el `int64` de NumPy no puede representar `NaN`, que es un real. El tipo anulable `"Int64"` lo conserva, con `pd.NA` como faltante.
4. IQR: sospechoso si queda fuera de $[Q_1 - 1{,}5\,\mathrm{IQR},\ Q_3 + 1{,}5\,\mathrm{IQR}]$. MAD: $|0{,}6745\,(x - \tilde x)/\mathrm{MAD}| > 3{,}5$. Es robusta porque la mediana y la MAD apenas cambian con unos pocos valores extremos, mientras que la media y la desviación típica se dejan arrastrar.
5. `count` cuenta los valores no faltantes y `size`, las filas. Si `count` es 0, la suma vale 0 aunque no sepas nada; comparar los dos lo revela, y `sum(min_count=1)` devuelve `NaN` en ese caso.
6. Nada sobre `df`: modifica un objeto intermedio (asignación encadenada). Lo correcto es `df.loc[mascara, "col"] = 0`.
7. Puede ser el caso más importante (un fraude, un cliente mayorista), y borrarlo sesga el análisis y el modelo hacia una realidad que no existe.
:::

---

## 13. Lecturas

- **Data Carpentry, «Análisis y visualización de datos usando Python»** (`https://datacarpentry.github.io/python-ecology-lesson-es/`), en español y con licencia CC BY 4.0: episodios 3 («Comenzando con datos»), 4 («Indexación, segmentación y creación de subconjuntos») y 5 («Tipos de datos y formatos»). Sus datos (`surveys.csv` y compañía) están en los recursos de este nodo, y tienen faltantes reales en `weight` y `hindfoot_length`.
- **pandas, «What's new in 3.0.0»** (`https://pandas.pydata.org/docs/whatsnew/v3.0.0.html`), en inglés: las secciones sobre el tipo `str`, la copia al escribir y la resolución de fechas.
- **pandas, guía de usuario: «IO tools»** (`https://pandas.pydata.org/docs/user_guide/io.html`), en inglés: la referencia de todos los parámetros de `read_csv` y `read_excel`.
- **Amat Rodrigo, J., cienciadedatos.net**, «Detección de anomalías con Isolation Forest» (`https://www.cienciadedatos.net/documentos/py22-deteccion-anomalias-isolation-forest-python`), en español: para cuando las reglas univariantes no basten (lo retomarás en ML II).
