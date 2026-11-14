---
titulo: De los ejercicios a un paquete con pruebas
num: P4
resumen: Ocho ejercicios para convertir la práctica 3 en un repositorio que otra persona clona, instala sin conexión y ejecuta con un solo comando, con pruebas, un perfil medido y una optimización demostrada.
horas: ≈ 5 h
---

> **Conferencia que practica:** [8. Código de proyecto, no de cuaderno](c08-proyecto.md), sobre el material de la [práctica 3](p03-pandas.md) (Online Retail II) y con la aleatoriedad de la [conferencia 4](c04-aleatoriedad.md).
>
> **Entregable:** el repositorio público `curso-ai-pandas`, con este `README` como portada: qué hace, cómo instalar (con y sin red), de dónde salen los datos, `make todo` y una tabla con las decisiones de limpieza y sus cuentas. Es la primera pieza de tu portafolio que un reclutador puede ejecutar.
>
> **Cómo trabajar.** Sin asistente de IA. Cada ejercicio deja el repositorio en un estado que funciona: haz un *commit* al terminar cada uno.

## Ejercicio 1. El esqueleto

Crea la estructura de la conferencia 8 para un paquete llamado `minorista`, con `pyproject.toml`, `src/minorista/config.py` (rutas relativas a la raíz) y `.gitignore`. Instálalo en modo editable **sin conexión** desde tu carpeta de ruedas y comprueba que `python -c "import minorista; print(minorista.config.RAIZ)"` imprime la raíz del proyecto.

:::pista Concepto
Diseño `src/`: el paquete solo se importa si está instalado. `pip install -e .` necesita `setuptools`, que sin red debe salir de tu carpeta de ruedas.
:::

:::pista Estrategia
Crea carpetas y archivos vacíos primero (`data/raw`, `data/processed`, `src/minorista/__init__.py`, `tests/`), después `pyproject.toml` y `config.py`, y por último instala.
:::

:::pista Arranque
```text
curso-ai-pandas/
├── pyproject.toml   README.md   .gitignore   Makefile
├── data/raw/   data/processed/
├── src/minorista/__init__.py   config.py   lectura.py   limpieza.py   agregados.py   pipeline.py
└── tests/
```
:::

:::pista Desbloqueo
Para que `minorista.config` esté disponible tras `import minorista`, `__init__.py` debe importarlo: `from . import config`. Y `Path(__file__).resolve().parents[2]` sube de `src/minorista/config.py` a la raíz.
:::

:::solucion Solución modelo
```toml
# pyproject.toml
[build-system]
requires = ["setuptools>=69"]
build-backend = "setuptools.build_meta"

[project]
name = "minorista"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = ["numpy>=2.0", "pandas>=3.0", "pyarrow", "openpyxl"]

[project.optional-dependencies]
dev = ["pytest>=8"]

[tool.pytest.ini_options]
testpaths = ["tests"]
```
```python
# src/minorista/config.py
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
CRUDOS = RAIZ / "data" / "raw"
PROCESADOS = RAIZ / "data" / "processed"
EXCEL = CRUDOS / "online_retail_II.xlsx"
SEMILLA = 42
```
```python
# src/minorista/__init__.py
from . import config
```
```bash
pip install --no-index --find-links ~/ruedas/py312 -e ".[dev]"
python -c "import minorista; print(minorista.config.RAIZ)"
```
**Idea reutilizable:** antes de escribir lógica, el esqueleto instalable y una línea que demuestra que se importa.
:::

## Ejercicio 2. Lectura aislada, y el solape como función

En `lectura.py`, escribe `leer_excel(ruta)` (lee las dos hojas con los tipos correctos) y `unir_hojas(h1, h2)` (concatena quitando de `h2` las facturas que ya están en `h1`). `unir_hojas` debe ser **pura**: no lee archivos.

:::pista Concepto
Separar la entrada/salida de la lógica: la función que toca el disco es mínima; la que decide (el solape) se prueba con tablas de tres filas.
:::

:::pista Estrategia
Copia el código del ejercicio 9 de la práctica 3 y pártelo en dos funciones. La segunda recibe dos `DataFrame` y devuelve uno.
:::

:::pista Arranque
```python
def unir_hojas(h1: pd.DataFrame, h2: pd.DataFrame) -> pd.DataFrame:
    """Concatena las hojas quitando de h2 las facturas que ya aparecen en h1 (las hojas se solapan)."""
```
:::

:::pista Desbloqueo
`h2[~h2["Invoice"].isin(h1["Invoice"])]` y `pd.concat([...], ignore_index=True)`. No modifiques `h1` ni `h2`.
:::

:::solucion Solución modelo
```python
# src/minorista/lectura.py
import pandas as pd

TIPOS = {"Invoice": str, "StockCode": str}

def leer_excel(ruta) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Lee las dos hojas de Online Retail II con Invoice y StockCode como texto."""
    hojas = pd.read_excel(ruta, sheet_name=None, dtype=TIPOS)
    return hojas["Year 2009-2010"], hojas["Year 2010-2011"]

def unir_hojas(h1: pd.DataFrame, h2: pd.DataFrame) -> pd.DataFrame:
    """Concatena las hojas quitando de h2 las facturas que ya aparecen en h1 (las hojas se solapan)."""
    return pd.concat([h1, h2[~h2["Invoice"].isin(h1["Invoice"])]], ignore_index=True)
```
**Idea reutilizable:** la decisión (qué es un duplicado entre hojas) vive en una función pura con nombre y documentación; la lectura no decide nada.
:::

## Ejercicio 3. Limpieza con sus cuentas

En `limpieza.py`, escribe `limpiar(df) -> tuple[pd.DataFrame, dict]` que devuelva la tabla de ventas válidas **y un diccionario con cuántas filas eliminó cada regla**, para escribirlo en el `README`. Sin modificar `df`.

:::pista Concepto
Reglas de negocio como máscaras con nombre (práctica 3, ejercicio 10). Devolver las cuentas hace que el informe de limpieza salga del código, no de tu memoria.
:::

:::pista Estrategia
Un diccionario `{nombre: máscara}`, un diccionario de cuentas por comprensión, una máscara combinada «alguna regla», y `assign` para las columnas nuevas.
:::

:::pista Arranque
```python
def limpiar(df):
    reglas = {
        "cancelación": df["Invoice"].str.startswith("C"),
        "cantidad <= 0": df["Quantity"] <= 0,
        "precio <= 0": df["Price"] <= 0,
    }
```
:::

:::pista Desbloqueo
`fuera = np.logical_or.reduce(list(reglas.values()))` combina todas; `cuentas = {k: int(m.sum()) for k, m in reglas.items()}` (las reglas pueden solaparse: añade también el total eliminado).
:::

:::solucion Solución modelo
```python
# src/minorista/limpieza.py
import numpy as np
import pandas as pd

def limpiar(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Ventas válidas: sin cancelaciones, cantidad > 0 y precio > 0. Devuelve también las cuentas por regla."""
    reglas = {
        "cancelación": df["Invoice"].str.startswith("C"),
        "cantidad <= 0": df["Quantity"] <= 0,
        "precio <= 0": df["Price"] <= 0,
    }
    fuera = np.logical_or.reduce([m.to_numpy() for m in reglas.values()])
    cuentas = {k: int(m.sum()) for k, m in reglas.items()} | {"eliminadas en total": int(fuera.sum())}
    ventas = df[~fuera].assign(
        importe=lambda d: d["Quantity"] * d["Price"],
        cliente=lambda d: d["Customer ID"].astype("Int64"),
    )
    return ventas, cuentas
```
`str.startswith` sobre `str` devuelve booleanos; si `Invoice` tuviera faltantes devolvería `NaN` y la máscara fallaría: por eso la lectura fija `dtype=str` y la prueba del ejercicio 4 lo comprueba.

**Idea reutilizable:** una función de limpieza devuelve los datos **y** su auditoría.
:::

## Ejercicio 4. Pruebas de la lectura y la limpieza

Escribe `tests/test_limpieza.py` con una fijación que construya una tabla pequeña (seis filas que cubran: venta normal, cancelación, cantidad negativa sin «C», precio 0, sin cliente, y una factura repetida en las dos hojas) y pruebas para: el solape (`unir_hojas`), cada regla de `limpiar`, que `limpiar` no modifica su entrada, y las cuentas.

:::pista Concepto
`@pytest.fixture` para los datos compartidos; `pd.testing.assert_frame_equal` para comparar tablas; una prueba de **regresión** del solape, el error real que encontraste en la práctica 3.
:::

:::pista Estrategia
Diseña la tabla para que **cada** regla elimine exactamente una fila: así cada cuenta esperada es 1 y una prueba fallida dice exactamente qué regla se rompió.
:::

:::pista Arranque
```python
@pytest.fixture
def hoja():
    return pd.DataFrame({
        "Invoice":     ["100", "C101", "102", "103", "104"],
        "StockCode":   ["A", "A", "B", "C", "D"],
        "Quantity":    [2, -2, -5, 1, 3],
        "Price":       [1.5, 1.5, 0.0, 0.0, 2.0],
        "Customer ID": [7.0, 7.0, None, 8.0, None],
    })
```
:::

:::pista Desbloqueo
En esa tabla, la fila «102» cumple **dos** reglas (cantidad negativa y precio 0): las cuentas por regla suman más que el total eliminado. Es un buen caso para comprobar que el total no se calcula sumando reglas.
:::

:::solucion Solución modelo
```python
# tests/test_limpieza.py
import pandas as pd
import pytest
from minorista.lectura import unir_hojas
from minorista.limpieza import limpiar

@pytest.fixture
def hoja():
    return pd.DataFrame({
        "Invoice":     ["100", "C101", "102", "103", "104"],
        "StockCode":   ["A", "A", "B", "C", "D"],
        "Quantity":    [2, -2, -5, 1, 3],
        "Price":       [1.5, 1.5, 0.0, 0.0, 2.0],
        "Customer ID": [7.0, 7.0, None, 8.0, None],
    })

def test_unir_hojas_quita_el_solape(hoja):           # regresión: las hojas reales se solapan
    h2 = pd.concat([hoja.iloc[[4]], pd.DataFrame({"Invoice": ["200"], "StockCode": ["E"], "Quantity": [1],
                                                  "Price": [1.0], "Customer ID": [9.0]})], ignore_index=True)
    r = unir_hojas(hoja, h2)
    assert len(r) == len(hoja) + 1
    assert r["Invoice"].value_counts().max() == 1

def test_limpiar_reglas_y_cuentas(hoja):
    ventas, cuentas = limpiar(hoja)
    assert list(ventas["Invoice"]) == ["100", "104"]          # la venta sin cliente se conserva
    assert cuentas == {"cancelación": 1, "cantidad <= 0": 2, "precio <= 0": 2, "eliminadas en total": 3}
    assert ventas["importe"].tolist() == pytest.approx([3.0, 6.0])
    assert ventas["cliente"].isna().tolist() == [False, True]

def test_limpiar_no_modifica_la_entrada(hoja):
    copia = hoja.copy()
    limpiar(hoja)
    pd.testing.assert_frame_equal(hoja, copia)
```
Comprueba las cuentas a mano: «cantidad ≤ 0» afecta a C101 (−2) y 102 (−5); «precio ≤ 0», a 102 y 103; en total salen C101, 102 y 103, tres filas, aunque las reglas sumen 5.

**Idea reutilizable:** una tabla diminuta diseñada para que cada regla se vea por separado vale más que mil filas reales en una prueba.
:::

## Ejercicio 5. La partición por factura, con propiedades

Mueve la partición del ejercicio 12 de la práctica 3 a `particion.py` como `particion_por_factura(df, frac, semilla)` y pruébala con propiedades, parametrizando tres semillas: tamaños aproximados, disjuntas por factura, que cubren todo, reproducibles y distintas con otra semilla.

:::pista Concepto
Propiedades que se cumplen para cualquier entrada (conferencia 8, sección 4), con datos aleatorios **con semilla fija**.
:::

:::pista Estrategia
Genera en la prueba una tabla sintética con 200 facturas de 1 a 6 líneas cada una (`rng.integers`), aplica la función y comprueba cada propiedad con un `assert`.
:::

:::pista Arranque
```python
@pytest.mark.parametrize("semilla", [0, 1, 2])
def test_particion_por_factura(semilla):
    rng = np.random.default_rng(100 + semilla)
    lineas = rng.integers(1, 7, size=200)
    df = pd.DataFrame({"Invoice": np.repeat([f"F{i}" for i in range(200)], lineas)})
```
:::

:::pista Desbloqueo
«Tamaño aproximado»: el 20 % de las **facturas** (exactamente 40), no de las líneas. Comprueba `pru["Invoice"].nunique() == 40`.
:::

:::solucion Solución modelo
```python
# src/minorista/particion.py
import numpy as np
import pandas as pd

def particion_por_factura(df: pd.DataFrame, frac: float, semilla: int) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Entrenamiento y prueba con una fracción de las FACTURAS en prueba; ninguna factura queda partida."""
    facturas = df["Invoice"].unique()
    prueba = np.random.default_rng(semilla).permutation(facturas)[: int(frac * len(facturas))]
    es_prueba = df["Invoice"].isin(prueba)
    return df[~es_prueba], df[es_prueba]
```
```python
# tests/test_particion.py
import numpy as np
import pandas as pd
import pytest
from minorista.particion import particion_por_factura

@pytest.mark.parametrize("semilla", [0, 1, 2])
def test_particion_por_factura(semilla):
    rng = np.random.default_rng(100 + semilla)
    df = pd.DataFrame({"Invoice": np.repeat([f"F{i}" for i in range(200)], rng.integers(1, 7, size=200))})
    ent, pru = particion_por_factura(df, 0.2, semilla)
    assert pru["Invoice"].nunique() == 40
    assert set(ent["Invoice"]).isdisjoint(pru["Invoice"])
    assert len(ent) + len(pru) == len(df)
    ent2, pru2 = particion_por_factura(df, 0.2, semilla)
    pd.testing.assert_frame_equal(pru, pru2)
    assert not pru.equals(particion_por_factura(df, 0.2, semilla + 10)[1])
```
**Idea reutilizable:** las funciones aleatorias se prueban por sus propiedades y por su reproducibilidad, nunca por un valor concreto «que salió una vez».
:::

## Ejercicio 6. Perfilar la tubería y quitar el cuello de botella

Escribe `pipeline.py` con `main()` (leer → unir → limpiar → semanal → guardar en `data/processed/`). Perfílalo con `cProfile`. ¿Qué paso se lleva el tiempo? Arréglalo sin cambiar el resultado y mide de nuevo.

:::pista Concepto
Medir antes de optimizar. En una tubería con un Excel de 45 MB, sospecha de la lectura antes que de pandas.
:::

:::pista Estrategia
`python -m cProfile -o perfil.out -m minorista.pipeline` y ordena por `cumulative`. Busca la primera función tuya con `cumtime` grande.
:::

:::pista Arranque
```python
def main():
    h1, h2 = leer_excel(config.EXCEL)
    ventas, cuentas = limpiar(unir_hojas(h1, h2))
    config.PROCESADOS.mkdir(parents=True, exist_ok=True)
    ventas.to_parquet(config.PROCESADOS / "ventas.parquet")
```
:::

:::pista Desbloqueo
`leer_excel` (en realidad, `openpyxl`) se lleva casi todo el tiempo: interpretar el XML del Excel es lento. La solución es una **caché**: si existe `data/processed/crudo.parquet`, léelo; si no, lee el Excel y guárdalo. La prueba de equivalencia: la tabla leída de la caché es igual a la del Excel.
:::

:::solucion Solución modelo
```python
# src/minorista/pipeline.py
import pandas as pd
from minorista import config
from minorista.lectura import leer_excel, unir_hojas
from minorista.limpieza import limpiar

def crudo() -> pd.DataFrame:
    """Las dos hojas unidas sin solape; la primera vez lee el Excel (lento) y guarda una caché en Parquet."""
    cache = config.PROCESADOS / "crudo.parquet"
    if cache.exists():
        return pd.read_parquet(cache)
    df = unir_hojas(*leer_excel(config.EXCEL))
    config.PROCESADOS.mkdir(parents=True, exist_ok=True)
    df.to_parquet(cache)
    return df

def main():
    ventas, cuentas = limpiar(crudo())
    ventas.to_parquet(config.PROCESADOS / "ventas.parquet")
    for k, v in cuentas.items():
        print(f"{k}: {v}")

if __name__ == "__main__":
    main()
```
Mide tú los tiempos (dependen de tu máquina): la primera ejecución sigue pagando la lectura del Excel, que con `openpyxl` cuesta minutos; las siguientes leen Parquet en segundos o menos. Anota los dos números en el `README`. La caché es un dato **derivado**: vive en `data/processed/`, no va a Git y se puede borrar para forzar la relectura.

**Idea reutilizable:** el cuello de botella casi nunca está donde lo intuyes; cuando es la entrada/salida, la respuesta suele ser un formato mejor, no un algoritmo mejor.
:::

## Ejercicio 7. Una función lenta, una prueba y una versión rápida

Un compañero escribió esto para el importe total y el número de facturas de cada cliente:

```python
def resumen_clientes_lento(ventas):
    filas = {}
    for _, r in ventas.iterrows():
        if pd.isna(r["cliente"]):
            continue
        f = filas.setdefault(r["cliente"], {"importe": 0.0, "facturas": set()})
        f["importe"] += r["Quantity"] * r["Price"]
        f["facturas"].add(r["Invoice"])
    return pd.DataFrame({c: {"importe": v["importe"], "n_facturas": len(v["facturas"])}
                         for c, v in filas.items()}).T.sort_index()
```

Escribe primero la **prueba de equivalencia**, después `resumen_clientes` vectorizada con `groupby`, y mide la diferencia con 50 000 filas de `ventas`.

:::pista Concepto
`iterrows` crea una `Series` por fila: es el patrón lento número uno de pandas (conferencia 8, tabla de sospechosos). La versión vectorizada es una agregación con nombre.
:::

:::pista Estrategia
La prueba compara las dos funciones sobre una tabla pequeña con un cliente faltante y una factura con dos líneas. Después, `groupby("cliente").agg(importe=..., n_facturas=...)`.
:::

:::pista Arranque
```python
def resumen_clientes(ventas):
    return (ventas.dropna(subset=["cliente"])
                  .groupby("cliente")
                  .agg(importe=("importe", "sum"), n_facturas=("Invoice", "nunique")))
```
:::

:::pista Desbloqueo
La versión lenta devuelve tipos `object` (por construir el `DataFrame` desde diccionarios y trasponer) y un índice con otro nombre: en la prueba, compara con `check_dtype=False` y `check_names=False`, o convierte antes con `.astype(float)`.
:::

:::solucion Solución modelo
```python
def test_resumen_clientes_igual_a_lento():
    v = pd.DataFrame({"Invoice": ["1", "1", "2", "3"], "Quantity": [2, 1, 4, 1], "Price": [1.0, 3.0, 0.5, 9.0],
                      "cliente": pd.array([7, 7, 7, pd.NA], dtype="Int64")})
    v["importe"] = v["Quantity"] * v["Price"]
    rapido = resumen_clientes(v)
    lento = resumen_clientes_lento(v)
    pd.testing.assert_frame_equal(rapido.astype(float), lento.astype(float), check_names=False, check_index_type=False)
    assert rapido.loc[7, "n_facturas"] == 2 and rapido.loc[7, "importe"] == pytest.approx(7.0)
```
```python
muestra = ventas.head(50_000)
%timeit resumen_clientes_lento(muestra)
%timeit resumen_clientes(muestra)
```
Mide tú el factor; con `iterrows` sobre decenas de miles de filas suele ser de dos o tres órdenes de magnitud. Lo que no depende de la máquina: la prueba existía **antes** de cambiar el código, así que la versión rápida está demostrada equivalente.

**Idea reutilizable:** prueba de equivalencia primero, versión rápida después, medición al final.
:::

## Ejercicio 8. Un solo comando, y la prueba de fuego

Escribe un `Makefile` con los objetivos `instalar` (sin red), `datos` (la tubería), `pruebas` y `todo`. Escribe el `README`. Después: clona el repositorio en otra carpeta **con la red desactivada**, copia allí el Excel a `data/raw/` y ejecuta `make todo`. ¿Sale lo mismo?

:::pista Concepto
El «un solo comando» de la conferencia 8 y la prueba de fuego de la conferencia 1, juntas.
:::

:::pista Estrategia
Cada objetivo del `Makefile` es una línea de lo que ya haces a mano. La variable `RUEDAS` debe poder cambiarse desde fuera (`make todo RUEDAS=/media/usb/ruedas`).
:::

:::pista Arranque
```make
RUEDAS ?= $(HOME)/ruedas/py312
PY := .venv/bin/python
```
:::

:::pista Desbloqueo
En un `Makefile`, las órdenes van indentadas con un **tabulador**, no con espacios. Y las pruebas no necesitan el Excel (usan tablas sintéticas): por eso pueden correr en GitHub Actions sin descargar 45 MB.
:::

:::solucion Solución modelo
```make
RUEDAS ?= $(HOME)/ruedas/py312
PY := .venv/bin/python

instalar:
	python3.12 -m venv .venv
	$(PY) -m pip install --no-index --find-links $(RUEDAS) -r requirements.txt
	$(PY) -m pip install --no-index --find-links $(RUEDAS) --no-deps -e .

datos:
	$(PY) -m minorista.pipeline

pruebas:
	$(PY) -m pytest -q

todo: instalar pruebas datos
```
El `README` lleva las cinco secciones de la conferencia 8 y la tabla de cuentas que imprime `main()`. Si en la carpeta nueva y sin red `make todo` termina con las pruebas en verde y las mismas cuentas de limpieza, el proyecto es reproducible. Si falla, el mensaje te dirá qué falta: casi siempre una rueda que no estaba en la carpeta (vuelve a la conferencia 1) o una ruta absoluta escondida.

**Idea reutilizable:** «funciona en mi máquina» no es un resultado; «funciona en otra carpeta, sin red, con un comando» sí lo es.
:::
