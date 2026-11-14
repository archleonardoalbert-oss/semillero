---
titulo: pandas I: datos sucios
num: 05
resumen: Los datos de una mipyme no vienen limpios, y un análisis sobre datos sucios da un número falso sin ningún error. Leer con los tipos correctos, tratar fechas, faltantes, duplicados y centinelas, y detectar anómalos sin borrar lo importante.
horas: ≈ 4 h
metas: ≈ 4 h de estudio | 2 motores interactivos | escrito para pandas 3.0
objetivos: Leer CSV y Excel con los tipos correctos | Tratar fechas, faltantes y duplicados | Detectar valores anómalos
---

> **Objetivos.** Al terminar serás capaz de:
>
> 1. **Leer** CSV y Excel con formato español o cubano (separador `;`, coma decimal, fechas `dd/mm/aaaa`, varias hojas) y **obtener** los tipos correctos desde la lectura.
> 2. **Inspeccionar** una tabla nueva en cinco minutos con una lista fija de comprobaciones.
> 3. **Convertir** tipos sin perder datos en silencio y **extraer** componentes de fechas.
> 4. **Tratar** faltantes, centinelas, duplicados y texto inconsistente, **justificando** cada decisión.
> 5. **Detectar** anómalos con reglas de negocio, con el rango intercuartílico y con la mediana y la MAD, y **decidir** qué hacer con cada uno.
> 6. **Modificar** un `DataFrame` correctamente con la copia al escribir de pandas 3.

> **Prerrequisitos.** NumPy: `dtype`, máscaras y reducciones ([conferencias 2](c02-ndarray.md) y [3](c03-vectores.md)). Dijiste que ya filtras y agrupas con pandas: esta conferencia empieza en lo que hace que un análisis real salga mal.

> **Versión.** Todo sigue **pandas 3.0** (enero de 2026), que cambió tres cosas que verás en tutoriales antiguos: el texto tiene su propio tipo `str`, las fechas se guardan por defecto en microsegundos y la *copia al escribir* es obligatoria. Si un tutorial de 2022 no te funciona, casi siempre es por esto.

## 1. Un número falso sin ningún error

Una mipyme de La Habana te pasa las ventas de su contabilidad: un CSV exportado de Excel con `;` como separador y coma decimal, fechas `03/01/2026` (¿3 de enero o 1 de marzo?), la misma tienda escrita como `Centro` y `centro `, `-` cuando no se sabe, `9999` cuando falta el precio, y filas repetidas porque alguien exportó dos veces. Si lo cargas con `pd.read_csv("ventas.csv")` y calculas el total por tienda, obtendrás **un número**. Será falso, y nada te avisará.

> **Problema para pensar (10 minutos).** Antes de tocar el motor, lee el archivo de la izquierda y haz una lista de **todo** lo que saldría mal con `pd.read_csv` sin opciones al calcular el total (unidades × precio) por tienda. Apunta al menos seis problemas. Después, en el motor, ve activando parámetros hasta que no quede ninguno, y compara con tu lista.

:::widget lector Leer bien un CSV «a la cubana»
Cada botón añade una línea a tu código. Fíjate en la tabla final: con el centinela sin tratar, Cerro «vendió» 49 995 CUP; con el texto sin normalizar hay cuatro tiendas; y una tienda sin ningún dato válido suma 0, no «no sé».
:::

:::solucion La lista completa de problemas
1. **Separador:** sin `sep=";"`, una sola columna (o un error de análisis).
2. **Coma decimal:** `250,00` queda como texto.
3. **Punto de miles:** `1.200,00` es 1200; sin `thousands="."` es texto.
4. **Fechas:** sin formato explícito quedan como texto, o al revés (`03/01` como 1 de marzo).
5. **`-` como faltante:** convierte toda la columna `unidades` en texto.
6. **Mayúsculas y espacios:** `Centro` y `centro ` son dos tiendas.
7. **Duplicado:** las dos filas del aceite son idénticas: ¿venta repetida o exportación doble?
8. **Centinela:** `9999` no es el precio del pollo.

Y la más sutil: aunque lo arregles todo, las unidades del aceite son desconocidas, así que su total es desconocido, no 0.
:::

## 2. El modelo de pandas en un minuto

> **Definición 1 (`Series`, `DataFrame`, `Index`).** Una **`Series`** es un arreglo 1D con un `dtype` **más** un índice de etiquetas. Un **`DataFrame`** es una colección de `Series` que **comparten el índice**, una por columna, cada una con su `dtype`. Las operaciones entre `Series` **se alinean por etiqueta, no por posición**.

```python
a = pd.Series([1, 2, 3], index=["x", "y", "z"])
b = pd.Series([10, 20, 30], index=["y", "z", "w"])
a + b          # w NaN · x NaN · y 12.0 · z 23.0
```

`a + b` suma `y` con `y`, y donde una etiqueta falta en uno de los dos, pone `NaN`. Por eso, tras filtrar filas, el índice queda con huecos (`0, 2, 5…`): `df.reset_index(drop=True)` lo renumera.

| Forma | Selecciona por | Ejemplo |
|---|---|---|
| `df["col"]`, `df[["a", "b"]]` | nombre de columna | una `Series`; un `DataFrame` |
| `df.loc[filas, columnas]` | **etiquetas** y máscaras | `df.loc[df["unidades"] > 0, ["fecha", "unidades"]]` |
| `df.iloc[filas, columnas]` | **posiciones** | `df.iloc[:5, 0]` |
| `df.query("...")` | una expresión en texto | `df.query("unidades > 0 and tienda == 'Centro'")` |

Con `loc`, las rebanadas de etiquetas **incluyen** el final (`df.loc["2026-01-01":"2026-01-31"]` incluye el 31); con `iloc`, como en Python, no.

## 3. Leer bien desde el principio

La regla de oro: **cuantos más problemas se resuelvan en la lectura, menos código de limpieza y menos errores colados.**

```python
df = pd.read_csv(
    "datos/raw/ventas.csv",
    sep=";",                     # separador de campos
    decimal=",",                 # coma decimal
    thousands=".",               # punto de miles
    na_values=["-", "s/d", "N/D"],   # además de las celdas vacías
    parse_dates=["fecha"],
    date_format="%d/%m/%Y",      # formato EXPLÍCITO: día/mes/año
    dtype={"codigo": "str"},     # los identificadores son texto
    encoding="utf-8",
)
df.dtypes      # fecha datetime64[us] · tienda str · producto str · unidades float64 · precio float64
```

- **`sep`, `decimal`, `thousands`** resuelven el formato numérico español. Un CSV de un Excel en español usa `;` porque la coma ya es el separador decimal.
- **`na_values`** declara los centinelas **de texto**. El `9999` **no** lo pongas ahí a ciegas: podría ser una cantidad real en otra columna. Se trata aparte (sección 6).
- **`date_format`** fija el formato. Sin él, pandas adivina, y la adivinanza puede salir al revés. Con formato explícito, lo que no encaja **falla**: es lo que quieres.
- **`dtype={"codigo": "str"}`**: si no, `00731` se lee como el entero 731. Los identificadores son texto aunque parezcan números.
- **`encoding`**: si ves `CafÃ©`, el archivo estaba en otra codificación; los Excel antiguos de Windows suelen ir en `cp1252`.

**Excel.** `pd.read_excel("ventas.xlsx", sheet_name=None)` lee **todas** las hojas en un diccionario, y `pd.concat(hojas.values(), ignore_index=True)` las junta (necesita `openpyxl`). Las hojas «para personas» traen títulos y totales: usa `skiprows=`, `header=` y quita las filas de totales. Una fecha de Excel a veces llega como número de serie: `pd.to_datetime(s, unit="D", origin="1899-12-30")`.

**Parquet**, para tus propios datos. CSV y Excel son formatos de intercambio, no de trabajo: una vez limpia la tabla, `df.to_parquet(...)` conserva los tipos, comprime y se lee decenas de veces más rápido.

## 4. Inspección en cinco minutos

Ante una tabla nueva, **antes de calcular nada**, la misma lista siempre:

```python
df.shape                                  # 1. ¿cuántas filas y columnas? ¿cuadra?
df.sample(5, random_state=0)              # 2. filas reales, no solo las primeras
df.dtypes                                 # 3. ¿cada columna tiene el tipo que debe?
df.isna().mean().round(3)                 # 4. proporción de faltantes por columna
df.duplicated().sum()                     # 5. filas duplicadas exactas
df.nunique()                              # 6. valores distintos (¿3 tiendas o 7?)
df.describe()                             # 7. mínimos, máximos, cuartiles
df["tienda"].value_counts(dropna=False)   # 8. frecuencias, también de los faltantes
```

Qué buscar: columnas numéricas que salieron `str` (hay un texto escondido); mínimos negativos imposibles, máximos absurdos (`9999`) o una media muy lejos de la mediana; más categorías de las que existen.

## 5. Tipos: convertir sin perder datos en silencio

**Números escondidos en texto.** Encuentra el culpable antes de forzar la conversión:

```python
s = pd.Series(["12", "3", "-", "5", "doce"])
c = pd.to_numeric(s, errors="coerce")     # lo que no se entiende → NaN
s[c.isna() & s.notna()]                   # ¿qué falló?  →  "-", "doce"
```

:::error «`errors="coerce"` y listo»
**Por qué es tentador:** la columna pasa a ser numérica y el código sigue. **Por qué es peligroso:** convierte en `NaN` **cualquier** cosa que no entiende, también un `"1.200"` mal formateado o una unidad escrita con letras, sin avisar. Puedes perder la mitad de la columna. **Lo correcto:** después de cada conversión forzada, muestra lo que falló (segunda línea del bloque) y cuéntalo.
:::

**Enteros con faltantes.** Un entero de NumPy no puede ser `NaN`, así que una columna de enteros con un faltante pasa a `float64`. Para conservar enteros: `df["unidades"].astype("Int64")` (con mayúscula: entero anulable con `pd.NA`).

**Categorías.** Pocos valores repetidos (tienda, país) → `astype("category")`: gasta mucha menos memoria y fija los valores válidos.

**Fechas.**

```python
f = pd.to_datetime(df["fecha_texto"], format="%d/%m/%Y", errors="coerce")
f.isna().sum()                       # ¿cuántas no encajaron?
df["dia_semana"] = f.dt.dayofweek    # 0 = lunes … 6 = domingo
df["mes"] = f.dt.month
df["es_fin_de_semana"] = f.dt.dayofweek >= 5
```

:::predice `pd.to_datetime(["01/02/2026", "13/02/2026"], format="%m/%d/%Y", errors="coerce")`. ¿Qué devuelve?
- [ ] 1 de febrero y 13 de febrero
- [x] 2 de enero y `NaT`
- [ ] Un error: el segundo no encaja
---
`2026-01-02` y `NaT` (el faltante de las fechas): no existe el mes 13. Eso te dice que el archivo está en formato **día/mes** y que el formato elegido es incorrecto. Una fracción alta de `NaT` tras convertir delata un formato equivocado. En pandas 3, convertir texto da `datetime64[us]`; si alguna vez conviertes fechas a enteros, obtendrás **microsegundos** desde 1970, no nanosegundos como antes: para números, usa `(f - f.min()).dt.days`.
:::

## 6. Faltantes y centinelas

Antes de rellenar o borrar, pregunta **por qué falta** el dato:

| Causa | Ejemplo | Tratamiento razonable |
|---|---|---|
| no se registró, al azar | el cajero olvidó apuntar unas unidades | imputar o descartar, **documentándolo** |
| no aplica | «fecha de devolución» de una venta no devuelta | dejarlo: no es un error |
| depende del propio valor | los días sin venta **no tienen fila** | crear las filas con 0 ([conferencia 6](c06-agregar.md)) |
| fallo del sistema | 13 días sin datos por un apagón | marcar el periodo; no imputarlo como normal |

El tercer caso es el más traicionero: un día sin ventas ni siquiera es un `NaN`, y la media diaria sobre las filas existentes sale **inflada**.

```python
df.dropna(subset=["unidades"])                          # descartar si falta en ESA columna
df["unidades"].fillna(0)                                # solo si 0 es la verdad
df.groupby("producto")["precio"].transform("median")    # la mediana de su producto (conferencia 6)
df["precio"].ffill()                                    # repetir el último valor (series)
```

Un **centinela** (`9999`, `-1`, un 0 imposible) es un faltante disfrazado. Se detecta con `describe` y `value_counts` y se convierte con una regla explícita y contada:

```python
centinela = df["precio"] == 9999
print(centinela.sum(), "precios centinela")
df.loc[centinela, "precio"] = float("nan")
```

> **Observación 1 (no imputes para quedar bien).** Rellenar todo con la media hace que la tabla «parezca» completa y reduce artificialmente la variabilidad. Para un **modelo**, la imputación se aprende **solo con el entrenamiento** (otra vez la fuga de datos). Para un **informe**, lo honesto suele ser decir «faltan 37 días».

## 7. Duplicados y texto

```python
df[df.duplicated(keep=False)]                                    # ver todas las copias
df.duplicated(subset=["fecha", "tienda", "producto"]).sum()      # duplicados de clave
df = df.drop_duplicates()
```

Un duplicado exacto puede ser un error de exportación **o dos ventas reales iguales**. La pregunta decisiva: **¿hay un identificador de transacción?** Si lo hay, los duplicados de ese identificador son errores; si no, quitar duplicados puede borrar ventas. Decídelo con quien conoce el negocio y anótalo en el código.

El accesor `.str` aplica operaciones de texto a toda la columna:

```python
df["tienda"] = df["tienda"].str.strip().str.title()           # "centro " → "Centro"
p = df["producto"].str.strip().str.lower()
p.str.extract(r"(\d+)\s*(kg|g|l)")                            # cantidad y unidad
sin_tildes = p.str.normalize("NFKD").str.encode("ascii", errors="ignore").str.decode("ascii")
df["tienda"] = df["tienda"].replace({"Ctro": "Centro", "C. Habana": "Centro Habana"})   # correcciones explícitas
```

Cuando las variantes no siguen una regla, un **diccionario de correcciones** explícito es lo más claro y lo más fácil de revisar.

> **Ejemplo 1 (el total por tienda, con honestidad).** Tras leer bien, normalizar, convertir el centinela y quitar el duplicado confirmado:
>
> ```python
> df["importe"] = df["unidades"] * df["precio"]
> df.groupby("tienda")["importe"].agg(["sum", "count", "size"])
> #            sum  count  size
> # Centro  6150.0      3     3      ← 12·250 + 3·250 + 2·1200
> # Cerro      0.0      0     1      ← ¡sum de solo NaN es 0!
> # Playa      0.0      0     1
> ```
>
> `sum` ignora los `NaN` y, si todos lo son, devuelve 0. Cerro y Playa **no vendieron 0**: **no sabemos** cuánto vendieron. `count` (no faltantes) frente a `size` (filas) lo revela, y `sum(min_count=1)` devuelve `NaN` cuando no hay ningún valor válido.

## 8. Detectar valores anómalos

Un **anómalo** puede ser un error (centinela, coma mal puesta, otra unidad) o un dato real e importante (una compra mayorista, un fraude). **Detectar no es borrar**: es marcar para revisar.

**Primero, reglas de negocio**, las más fiables:

```python
reglas = {
    "unidades negativas": df["unidades"] < 0,            # ¿devoluciones? En Online Retail II, sí
    "precio cero o negativo": df["precio"] <= 0,
    "fecha futura": df["fecha"] > pd.Timestamp.today(),
}
for nombre, m in reglas.items():
    print(f"{nombre}: {m.sum()}")
```

**Después, reglas estadísticas:**

> **Definición 2 (regla del rango intercuartílico, de Tukey).** Con $Q_1$, $Q_3$ los cuartiles e $\mathrm{IQR} = Q_3 - Q_1$, un valor es **sospechoso** si $x < Q_1 - 1{,}5\,\mathrm{IQR}$ o $x > Q_3 + 1{,}5\,\mathrm{IQR}$.

> **Definición 3 (puntuación z robusta).** Con la mediana $\tilde x$ y la **desviación absoluta mediana** $\mathrm{MAD} = \mathrm{mediana}(|x_i - \tilde x|)$, se define $z_i^{\text{rob}} = 0{,}6745\,(x_i - \tilde x)/\mathrm{MAD}$ y se marca $|z^{\text{rob}}| > 3{,}5$ (Iglewicz y Hoaglin). El 0,6745 hace que, con datos normales, sea comparable a la puntuación z clásica.

¿Por qué no la z clásica, $(x - \bar x)/s$? Porque la media y la desviación típica **se dejan arrastrar por los propios anómalos**: unos cuantos valores enormes inflan $s$, y entonces el umbral $\bar x + 3s$ sube tanto que valores claramente raros quedan dentro (*enmascaramiento*). La mediana y la MAD apenas se mueven con unos pocos extremos: son **robustas**.

Los precios, ingresos y cantidades tienen **cola larga a la derecha**: muchos valores pequeños y unos pocos grandes, todos legítimos. En escala lineal, cualquier regla marca toda la cola; en escala logarítmica la distribución se vuelve casi simétrica y la regla marca lo que de verdad no encaja. Compruébalo:

:::widget atipicos Tres reglas, dos escalas
600 precios legítimos con cola larga, tres centinelas 9999 y un precio 0. Busca la combinación que detecte los tres centinelas con menos falsas alarmas, y fíjate en lo que ninguna regla detecta.
:::

```python
x = df["precio"].dropna()
q1, q3 = x.quantile([0.25, 0.75])
fuera_iqr = (x < q1 - 1.5 * (q3 - q1)) | (x > q3 + 1.5 * (q3 - q1))
med = x.median()
z_rob = 0.6745 * (x - med) / (x - med).abs().median()
lx = np.log10(x[x > 0])            # el log no admite 0 ni negativos: trátalos con reglas de negocio
```

Un precio de 900 CUP es normal para el aceite y absurdo para unos fósforos: aplica las reglas **dentro de cada grupo**:

```python
med_g = df.groupby("producto")["precio"].transform("median")
mad_g = (df["precio"] - med_g).abs().groupby(df["producto"]).transform("median")
df["anomalo"] = (0.6745 * (df["precio"] - med_g) / mad_g).abs() > 3.5
```

| Hallazgo | Acción |
|---|---|
| error con corrección conocida (otra unidad, una coma) | corregir con una regla documentada |
| centinela | convertir en faltante |
| dato real extremo (compra mayorista) | **conservar**; quizá analizar aparte |
| no se sabe | marcar (`df["revisar"] = True`) y preguntar |

:::error «Borro los anómalos porque estropean el gráfico y el modelo»
**Por qué es tentador:** el histograma queda bonito y el error del modelo baja. **Por qué es un error:** un fraude es, por definición, un anómalo; una compra mayorista es un cliente que importa. Borrar sesga el análisis y el modelo hacia una realidad que no existe, y en producción esos casos seguirán llegando. **Lo correcto:** marcar, preguntar, corregir solo lo que tiene corrección conocida, y usar escalas o métodos robustos para el resto.
:::

## 9. Modificar un `DataFrame` en pandas 3: copia al escribir

> **Definición 4 (copia al escribir).** En pandas 3, **cualquier objeto que obtienes de otro (una columna, un filtro, una rebanada) se comporta como una copia independiente**. Por dentro, pandas comparte la memoria mientras nadie escriba y solo copia en el momento de modificar.

```python
centro = df[df["tienda"] == "Centro"]
centro["precio"] = 0                                   # cambia `centro`, no `df`

df[df["precio"] > 5000]["precio"] = float("nan")       # ✗ asignación encadenada: no modifica df
df.loc[df["precio"] > 5000, "precio"] = float("nan")   # ✓ un solo .loc
df = df.assign(importe=df["unidades"] * df["precio"])  # ✓ columnas nuevas en cadena
```

La regla: **para cambiar `df`, escribe `df.loc[...] = ...` o `df["col"] = ...`; cualquier otra cosa cambia una copia.** Es lo **contrario** de NumPy, donde una rebanada es una vista que sí comparte memoria al escribir ([conferencia 2](c02-ndarray.md)). Las dos bibliotecas eligieron distinto; tenlo presente al pasar de una a otra.

:::predice ¿Cuál de estas líneas **no** modifica `df` en pandas 3?
- [ ] `df["unidades"] = df["unidades"].fillna(0)`
- [x] `df["unidades"].fillna(0, inplace=True)`
- [ ] `df.loc[df["unidades"].isna(), "unidades"] = 0`
---
`df["unidades"]` es, por la copia al escribir, un objeto independiente; `inplace=True` modifica ese objeto, que se pierde. Es una asignación encadenada disfrazada (pandas 3 avisa). Evita `inplace=True`: casi nunca ahorra memoria y confunde.
:::

## 10. Errores típicos

| Error | Síntoma | Arreglo |
|---|---|---|
| Leer sin `sep`/`decimal` | una columna, o números como texto | mira `shape` y `dtypes` tras leer |
| Fechas sin `format` | fechas ambiguas al revés | siempre `format=`; cuenta los `NaT` |
| Identificadores como números | ceros perdidos, colisiones | `dtype={"codigo": "str"}` |
| Variantes de texto | más categorías de las reales | `nunique`, `value_counts`; `.str.strip()` |
| `sum` de un grupo sin datos | 0 donde no se sabe | `min_count=1`; `count` frente a `size` |
| z clásica con anómalos grandes | umbral inflado | mediana y MAD; escala log |
| Asignación encadenada o `inplace` | el cambio no se guarda | `df.loc[mascara, "col"] = valor` |

:::llevas Ideas que te llevas
- **Lee bien una vez** (`sep`, `decimal`, `thousands`, `na_values`, `date_format`, `dtype`) y comprueba `shape` y `dtypes` justo después.
- **Rutina de inspección:** forma, muestra, tipos, faltantes, duplicados, `nunique`, `describe`, `value_counts`.
- **Toda conversión forzada se audita.** Un faltante no es un cero, y una fila que no existe tampoco.
- **Anómalos:** reglas de negocio primero; luego IQR o MAD, en la escala adecuada y por grupos. Detectar ≠ borrar.
- **pandas 3:** para modificar, `df.loc[mascara, "col"] = valor`.
:::

## 11. Preguntas de recuperación

1. Escribe la llamada a `read_csv` para un archivo con `;`, coma decimal, punto de miles, `s/d` como faltante y fechas `dd/mm/aaaa`.
2. ¿Por qué `pd.to_numeric(..., errors="coerce")` exige una comprobación posterior? Escríbela.
3. ¿Por qué una columna de enteros con faltantes sale `float64`, y qué tipo la conserva entera?
4. Enuncia la regla del IQR y la de la MAD. ¿Por qué la segunda es robusta?
5. ¿Qué diferencia hay entre `count` y `size` en un `groupby`?
6. ¿Qué hace `df[mascara]["col"] = 0` en pandas 3?

:::solucion Respuestas
1. `pd.read_csv(ruta, sep=";", decimal=",", thousands=".", na_values=["s/d"], parse_dates=["fecha"], date_format="%d/%m/%Y")`.
2. Porque convierte en `NaN` lo que no entiende sin avisar. `c = pd.to_numeric(s, errors="coerce"); s[c.isna() & s.notna()]`.
3. El `int64` de NumPy no representa `NaN`, que es real. El tipo anulable `"Int64"`.
4. IQR: fuera de $[Q_1 - 1{,}5\,\mathrm{IQR},\ Q_3 + 1{,}5\,\mathrm{IQR}]$. MAD: $|0{,}6745\,(x - \tilde x)/\mathrm{MAD}| > 3{,}5$. La mediana y la MAD apenas cambian con unos pocos extremos; la media y la desviación, sí.
5. `count` cuenta valores no faltantes; `size`, filas. Si `count` es 0, la suma vale 0 aunque no sepas nada.
6. Nada sobre `df`: modifica un intermedio. Lo correcto es `df.loc[mascara, "col"] = 0`.
:::

## 12. Lecturas

- **Data Carpentry, «Análisis y visualización de datos usando Python»** (`https://datacarpentry.github.io/python-ecology-lesson-es/`), en español, CC BY 4.0: episodios 3, 4 y 5. Sus datos están en los recursos de esta asignatura y tienen faltantes reales (la [práctica 3](p03-pandas.md) los usa).
- **pandas, «What's new in 3.0.0»** (`https://pandas.pydata.org/docs/whatsnew/v3.0.0.html`), en inglés: el tipo `str`, la copia al escribir y la resolución de fechas.
- **pandas, «IO tools»** (`https://pandas.pydata.org/docs/user_guide/io.html`), en inglés: todos los parámetros de `read_csv` y `read_excel`.
- **Amat Rodrigo, «Detección de anomalías con Isolation Forest»** (`https://www.cienciadedatos.net/documentos/py22-deteccion-anomalias-isolation-forest-python`), en español: para cuando las reglas univariantes no basten.
