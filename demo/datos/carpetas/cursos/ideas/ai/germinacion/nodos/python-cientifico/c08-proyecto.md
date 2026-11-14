# Conferencia 8. Código de proyecto, no de cuaderno

> **Objetivos.** Al terminar esta conferencia serás capaz de:
>
> 1. **Estructurar** un repositorio reproducible (`src/`, `tests/`, `data/`, `notebooks/`, `pyproject.toml`, `README`) que otra persona pueda clonar y ejecutar **con un solo comando**, incluso sin conexión.
> 2. **Convertir** el código de un cuaderno en funciones puras dentro de un paquete instalable.
> 3. **Escribir** pruebas con `pytest`: casos pequeños, fijaciones (*fixtures*), parametrización, comparación de reales con tolerancia, archivos temporales y propiedades que deben cumplirse.
> 4. **Perfilar** código lento con `%timeit`, `time.perf_counter` y `cProfile`, **localizar** el cuello de botella y **verificar** que la versión optimizada da lo mismo.

> **Prerrequisitos.** Todo lo anterior de esta asignatura, en especial el entorno y Git de la [conferencia 1](c01-entorno.md), la vectorización de la [conferencia 3](c03-vectores.md) y la limpieza de las [conferencias 5](c05-datos-sucios.md) y [6](c06-agregar.md). De Python general: módulos, paquetes e `import`, que ya conoces de Django.

---

## 1. Motivación: el cuaderno que nadie puede ejecutar

Un escenario que ve cualquier persona que revisa portafolios: un repositorio con `Analisis_final_v3 (2).ipynb`, sin `requirements.txt`, que lee `C:\Users\Leo\Desktop\ventas.xlsx`, cuyas celdas solo funcionan si se ejecutan en un orden que nadie recuerda y cuyos resultados cambian cada vez porque no hay semilla.

Para un empleo remoto, ese repositorio **resta**. Quien te contrata desde otro país no puede verte trabajar: solo puede ver tu código. Lo que quiere comprobar es si sabes entregar algo que **funciona en otra máquina**.

Los cuadernos tienen problemas estructurales para el código que importa:

- **estado oculto:** las variables viven en el núcleo; puedes borrar una celda y el resultado sigue en memoria, hasta que reinicias y nada funciona;
- **orden arbitrario:** las celdas se pueden ejecutar en cualquier orden;
- **difíciles de probar y de reutilizar:** no se importa una función de un `.ipynb`;
- **difíciles de revisar en Git:** un `.ipynb` es un JSON con salidas y gráficos incrustados, y un cambio de una línea produce un *diff* ilegible.

La solución no es dejar los cuadernos, sino darles su sitio: **los cuadernos para explorar y comunicar; los módulos para todo lo que se reutiliza.**

> **Problema para pensar (5 minutos).** Abre mentalmente el último cuaderno que hiciste (la red de dígitos, por ejemplo). Si mañana alguien lo clona en otra máquina, ¿qué le faltaría para ejecutarlo de principio a fin y obtener **tus mismos números**? Haz la lista.

:::solucion Lo que suele faltar
1. Las dependencias con versiones exactas (`requirements.txt`).
2. Los datos, o instrucciones para obtenerlos, y rutas relativas al proyecto en vez de absolutas.
3. Las semillas (inicialización de la red, partición de los datos).
4. El orden de ejecución (¿qué celdas, en qué orden?).
5. La versión de Python y el hardware (CPU o GPU).
6. Una forma de saber que funciona: los números esperados o unas pruebas.

Cada punto de esta lista tiene una respuesta en esta conferencia.
:::

---

## 2. La estructura de un repositorio reproducible

```text
ventas-mipyme/
├── README.md               ← qué es, cómo instalar, cómo ejecutar, qué resultados esperar
├── pyproject.toml          ← el paquete y sus dependencias de alto nivel
├── requirements.txt        ← versiones exactas (pip freeze), para reproducir
├── .gitignore              ← .venv/, data/raw/, __pycache__/, salidas
├── data/
│   ├── raw/                ← los datos originales: NUNCA se modifican (y no van a Git si son grandes)
│   └── processed/          ← lo que genera el código (Parquet); se puede borrar y regenerar
├── notebooks/
│   └── 01-exploracion.ipynb   ← exploración y figuras; importa del paquete
├── src/
│   └── ventas/
│       ├── __init__.py
│       ├── config.py       ← rutas y constantes
│       ├── limpieza.py     ← funciones puras: DataFrame → DataFrame
│       ├── agregados.py
│       └── pipeline.py     ← el punto de entrada: datos crudos → resultados
├── tests/
│   ├── test_limpieza.py
│   └── test_agregados.py
└── figuras/
```

Las cinco decisiones que importan:

1. **Los datos crudos son de solo lectura.** Todo lo que se deriva de ellos lo produce el código. Si te equivocas, borras `data/processed/` y vuelves a ejecutar.
2. **El diseño `src/`.** El código importable vive en `src/ventas/`. Te obliga a **instalar** el paquete para importarlo, y así las pruebas prueban lo que se instala, no un archivo suelto que «casualmente» está en la carpeta actual.
3. **Un punto de entrada.** `python -m ventas.pipeline` reproduce todo, de los datos crudos a las figuras.
4. **Las rutas, relativas a la raíz del proyecto**, en un solo sitio (`config.py`), con `pathlib`.
5. **El `README` dice cómo reproducir**, también sin conexión, y qué resultado se espera.

### 2.1. `pyproject.toml`

```toml
[build-system]
requires = ["setuptools>=69"]
build-backend = "setuptools.build_meta"

[project]
name = "ventas"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = ["numpy>=2.0", "pandas>=3.0", "matplotlib>=3.8", "pyarrow"]

[project.optional-dependencies]
dev = ["pytest>=8"]

[tool.pytest.ini_options]
testpaths = ["tests"]
```

Se instala en modo editable (los cambios en `src/` se ven sin reinstalar):

```bash
pip install -e ".[dev]"
```

> **Observación 1 (instalar sin conexión).** `pip install -e .` construye el paquete en un entorno aislado y, para eso, **descarga `setuptools`** de PyPI. Sin red, falla. Dos soluciones: guarda la rueda de `setuptools` en tu carpeta `ruedas/` de la conferencia 1 y usa `pip install --no-index --find-links ~/ruedas/py312 -e ".[dev]"`, o instala `setuptools` en el entorno y añade `--no-build-isolation`. Escríbelo en el `README`: es justo el tipo de detalle que hace que tu proyecto funcione en Cuba.

### 2.2. `config.py` y rutas

```python
# src/ventas/config.py
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]      # src/ventas/config.py → raíz del proyecto
DATOS_CRUDOS = RAIZ / "data" / "raw"
DATOS_PROCESADOS = RAIZ / "data" / "processed"
FIGURAS = RAIZ / "figuras"
SEMILLA = 2026
```

Nunca `"C:\\Users\\..."`, nunca `os.chdir`. `Path` funciona igual en Linux y en Windows, y `RAIZ / "data"` construye rutas sin preocuparse por las barras.

---

## 3. Del cuaderno a funciones puras

> **Definición 1 (función pura).** Una función es *pura* si su resultado depende **solo de sus argumentos** y **no tiene efectos secundarios**: no lee variables globales que cambian, no modifica sus argumentos, no escribe archivos ni imprime. Con la misma entrada da siempre la misma salida.

Las funciones puras son fáciles de probar (das una entrada y compruebas la salida), de reutilizar y de razonar. La estrategia para refactorizar un cuaderno:

1. **Identifica los pasos** (las celdas que hacen algo con sentido propio): leer, limpiar, agregar, graficar.
2. **Convierte cada paso en una función** que recibe un `DataFrame` (y parámetros) y devuelve otro. Nada de variables globales.
3. **Separa la entrada/salida de la lógica:** una función lee el archivo; otra, pura, lo limpia. Así pruebas la limpieza sin archivos.
4. **Haz explícito el azar:** las funciones aleatorias reciben un `rng` ([conferencia 4](c04-aleatoriedad.md)).
5. **Deja en el cuaderno solo las llamadas** y los gráficos.

> **Ejemplo 1 (refactorizar, resuelto).** En el cuaderno:
>
> ```python
> df = pd.read_csv("C:/Users/Leo/Desktop/ventas.csv", sep=";", decimal=",")
> df["tienda"] = df["tienda"].str.strip().str.title()
> df = df[df["precio"] != 9999]
> df["importe"] = df["unidades"] * df["precio"]
> semanal = df.groupby(["producto", pd.Grouper(key="fecha", freq="W")])["unidades"].sum()
> ```
>
> **Paso 1 (lectura, separada).** `limpieza.py`:
> ```python
> import pandas as pd
>
> CENTINELA_PRECIO = 9999
>
> def leer_ventas(ruta) -> pd.DataFrame:
>     """Lee el CSV de ventas con el formato de la tienda (; y coma decimal)."""
>     return pd.read_csv(ruta, sep=";", decimal=",", thousands=".",
>                        parse_dates=["fecha"], date_format="%d/%m/%Y")
>
> def limpiar_ventas(df: pd.DataFrame) -> pd.DataFrame:
>     """Normaliza tiendas, convierte el centinela de precio en NaN y añade el importe.
>
>     No modifica `df`: devuelve una tabla nueva.
>     """
>     precio = df["precio"].mask(df["precio"] == CENTINELA_PRECIO)
>     return df.assign(
>         tienda=df["tienda"].str.strip().str.title(),
>         precio=precio,
>         importe=df["unidades"] * precio,
>     )
> ```
>
> **Por qué así.** La lectura queda aislada (es la única función que toca el disco). `limpiar_ventas` es pura: recibe una tabla y devuelve otra, sin modificar la de entrada (gracias a `assign`). Y hay **un cambio de comportamiento deliberado**: el cuaderno **borraba** las filas con precio 9999 (perdiendo sus unidades); la función las conserva con precio desconocido, como decidimos en la [conferencia 5](c05-datos-sucios.md). Refactorizar es buen momento para revisar decisiones, pero cada cambio de comportamiento debe ser **consciente** y tener su prueba.
>
> **Paso 2 (agregados).** `agregados.py`:
> ```python
> def unidades_semanales(df: pd.DataFrame) -> pd.DataFrame:
>     """Unidades por semana (lunes-domingo) y producto, con las semanas sin ventas a 0."""
>     sem = df.groupby(["producto", pd.Grouper(key="fecha", freq="W")])["unidades"].sum()
>     return sem.unstack("producto", fill_value=0).asfreq("W", fill_value=0)
> ```
>
> **Paso 3 (punto de entrada).** `pipeline.py`:
> ```python
> from ventas import config
> from ventas.limpieza import leer_ventas, limpiar_ventas
> from ventas.agregados import unidades_semanales
>
> def main():
>     df = limpiar_ventas(leer_ventas(config.DATOS_CRUDOS / "ventas.csv"))
>     config.DATOS_PROCESADOS.mkdir(parents=True, exist_ok=True)
>     df.to_parquet(config.DATOS_PROCESADOS / "ventas_limpias.parquet")
>     unidades_semanales(df).to_parquet(config.DATOS_PROCESADOS / "semanal.parquet")
>
> if __name__ == "__main__":
>     main()
> ```
>
> Y el cuaderno queda en tres líneas: `from ventas.limpieza import ...`, la llamada y los gráficos.

**Antes de seguir:** esta función, ¿es pura? ¿Qué problemas tiene?

```python
UMBRAL = 5
def marcar_grandes(df):
    df["grande"] = df["unidades"] > UMBRAL
    print(df["grande"].sum())
    return df
```

:::solucion Respuesta
No es pura por tres motivos: depende de una variable global (`UMBRAL`), **modifica su argumento** (`df["grande"] = ...` escribe en la tabla de quien la llamó) e imprime. Versión pura: `def marcar_grandes(df, umbral): return df.assign(grande=df["unidades"] > umbral)`, y el `print` lo hace quien la llama si lo necesita.
:::

---

## 4. Pruebas con `pytest`

### 4.1. Lo mínimo

Una prueba es una función cuyo nombre empieza por `test_`, en un archivo `tests/test_*.py`, que usa `assert`. `pytest` las encuentra y las ejecuta:

```python
# tests/test_limpieza.py
import numpy as np
import pandas as pd
from ventas.limpieza import limpiar_ventas

def test_normaliza_tiendas():
    df = pd.DataFrame({"tienda": ["centro ", "CENTRO", "Playa"],
                       "unidades": [1, 2, 3], "precio": [10.0, 10.0, 20.0]})
    resultado = limpiar_ventas(df)
    assert set(resultado["tienda"]) == {"Centro", "Playa"}

def test_centinela_es_nan_y_no_se_pierden_filas():
    df = pd.DataFrame({"tienda": ["A", "A"], "unidades": [1, 2], "precio": [10.0, 9999.0]})
    resultado = limpiar_ventas(df)
    assert len(resultado) == 2                       # no se borran filas
    assert np.isnan(resultado["precio"].iloc[1])
    assert np.isnan(resultado["importe"].iloc[1])

def test_no_modifica_la_entrada():
    df = pd.DataFrame({"tienda": ["a "], "unidades": [1], "precio": [9999.0]})
    copia = df.copy()
    limpiar_ventas(df)
    pd.testing.assert_frame_equal(df, copia)         # la entrada sigue igual
```

```bash
pytest              # ejecuta todas
pytest -x -q        # se detiene en el primer fallo, salida breve
pytest -k centinela # solo las que contienen «centinela» en el nombre
```

Cuando una prueba falla, `pytest` muestra los valores de cada lado del `assert`. Esa es la razón de usar `assert` simple y no `if ... print`.

### 4.2. Qué probar

No hace falta probarlo todo; sí lo que puede romperse en silencio:

- **los casos límite:** tabla vacía, un solo grupo, todo `NaN`, una columna constante, empates;
- **las decisiones de limpieza:** que el centinela se trata como acordaste, que no se pierden filas, que no se duplican tras un `merge`;
- **las propiedades** que deben cumplirse para cualquier entrada (sección 4.4);
- **los errores que ya cometiste una vez:** cada error real que encuentres merece una prueba que lo reproduzca, para que no vuelva (prueba de **regresión**).

### 4.3. Herramientas de `pytest` que usarás

**Comparar reales con tolerancia.** Nunca `==` con reales ([conferencia 2](c02-ndarray.md)):

```python
import pytest
assert 0.1 + 0.2 == pytest.approx(0.3)
np.testing.assert_allclose(Z.mean(axis=0), 0, atol=1e-12)        # arreglos
pd.testing.assert_series_equal(obtenido, esperado, check_names=False)
```

**Fijaciones (*fixtures*): datos que comparten varias pruebas.**

```python
@pytest.fixture
def ventas_pequenas():
    return pd.DataFrame({
        "fecha": pd.to_datetime(["2026-01-05", "2026-01-06", "2026-01-19"]),   # lunes, martes, lunes
        "producto": ["arroz", "arroz", "aceite"],
        "unidades": [3, 4, 2],
    })

def test_semanas_sin_ventas_a_cero(ventas_pequenas):
    sem = unidades_semanales(ventas_pequenas)
    assert len(sem) == 3                                    # semanas del 11, 18 y 25 de enero
    assert sem.loc["2026-01-11", "arroz"] == 7
    assert sem.loc["2026-01-18", "arroz"] == 0              # la semana vacía existe y vale 0
    assert sem.loc["2026-01-25", "aceite"] == 2
```

`pytest` ve que la prueba pide un argumento llamado `ventas_pequenas` y le pasa lo que devuelve la fijación del mismo nombre.

**Parametrizar: la misma prueba con varios casos.**

```python
@pytest.mark.parametrize("entrada, esperado", [
    (" centro", "Centro"), ("CENTRO", "Centro"), ("playa  ", "Playa"),
])
def test_normalizar_tienda(entrada, esperado):
    df = pd.DataFrame({"tienda": [entrada], "unidades": [1], "precio": [1.0]})
    assert limpiar_ventas(df)["tienda"].iloc[0] == esperado
```

**Archivos temporales:** la fijación integrada `tmp_path` da una carpeta nueva y vacía para cada prueba, que `pytest` gestiona solo.

```python
def test_leer_ventas_formato_espanol(tmp_path):
    ruta = tmp_path / "v.csv"
    ruta.write_text("fecha;tienda;producto;unidades;precio\n03/01/2026;A;arroz;2;1.250,50\n",
                    encoding="utf-8")
    df = leer_ventas(ruta)
    assert df["precio"].iloc[0] == pytest.approx(1250.5)
    assert df["fecha"].iloc[0] == pd.Timestamp("2026-01-03")     # 3 de enero, no 1 de marzo
```

**Comprobar que algo falla como debe:**

```python
def test_merge_valida_claves_unicas():
    ventas = pd.DataFrame({"producto": ["arroz"]})
    precios = pd.DataFrame({"producto": ["arroz", "arroz"], "precio": [1, 2]})
    with pytest.raises(pd.errors.MergeError):
        ventas.merge(precios, on="producto", validate="many_to_one")
```

### 4.4. Probar propiedades

Para el código numérico, a menudo no conoces la salida exacta, pero sí **propiedades** que debe cumplir para cualquier entrada. Pruébalas con datos aleatorios **con semilla fija**:

```python
def estandarizar(X):
    s = X.std(axis=0)
    return (X - X.mean(axis=0)) / np.where(s == 0, 1, s)

@pytest.mark.parametrize("semilla", [0, 1, 2])
def test_estandarizar_propiedades(semilla):
    rng = np.random.default_rng(semilla)
    X = rng.normal(loc=5, scale=3, size=(200, 4))
    Z = estandarizar(X)
    assert Z.shape == X.shape
    np.testing.assert_allclose(Z.mean(axis=0), 0, atol=1e-12)
    np.testing.assert_allclose(Z.std(axis=0), 1, atol=1e-12)

def test_estandarizar_columna_constante():
    X = np.ones((5, 2)); X[:, 1] = np.arange(5)
    Z = estandarizar(X)
    assert np.isfinite(Z).all()                         # sin NaN aunque la desviación sea 0
    np.testing.assert_allclose(Z[:, 0], 0)
```

Y la propiedad más útil al optimizar: **la versión rápida da lo mismo que la lenta**.

```python
def test_distancias_rapida_igual_a_lenta():
    rng = np.random.default_rng(0)
    A, B = rng.normal(size=(30, 5)), rng.normal(size=(20, 5))
    lenta = ((A[:, None, :] - B[None, :, :]) ** 2).sum(-1)
    np.testing.assert_allclose(distancias(A, B), lenta, atol=1e-10)
```

**Antes de seguir:** escribe una prueba para la función `particion(n, frac_prueba, semilla)` de la [conferencia 4](c04-aleatoriedad.md). ¿Qué propiedades debe cumplir?

:::solucion Una solución
```python
def test_particion():
    ent, pru = particion(100, 0.2, semilla=7)
    assert len(pru) == 20 and len(ent) == 80
    assert set(ent).isdisjoint(pru)                          # disjuntas
    assert set(ent) | set(pru) == set(range(100))            # cubren todo
    ent2, pru2 = particion(100, 0.2, semilla=7)
    np.testing.assert_array_equal(pru, pru2)                 # reproducible con la misma semilla
    _, pru3 = particion(100, 0.2, semilla=8)
    assert not np.array_equal(pru, pru3)                     # distinta con otra semilla
```
:::

---

## 5. Perfilar: medir antes de optimizar

> **Regla.** No optimices por intuición. **Mide**, encuentra la función que se lleva el tiempo, optimiza **solo esa**, comprueba que el resultado no cambió (con una prueba) y **vuelve a medir**.

### 5.1. Medir un fragmento

En Jupyter, `%timeit` repite la expresión muchas veces y da la media y la dispersión:

```python
%timeit (X - X.mean(0)) / X.std(0)
# 1.2 ms ± 15 µs per loop (mean ± std. dev. of 7 runs, 1,000 loops each)
```

En un *script*, con `time.perf_counter` (el reloj de mayor resolución) y repitiendo:

```python
import time
def cronometrar(f, *args, repeticiones=5):
    tiempos = []
    for _ in range(repeticiones):
        t0 = time.perf_counter(); f(*args); tiempos.append(time.perf_counter() - t0)
    return min(tiempos)          # el mínimo: el menos afectado por otras tareas del sistema
```

Mide siempre **después** de una primera llamada de calentamiento: la primera paga costes únicos (importar, reservar memoria, inicializar BLAS o CUDA).

### 5.2. Encontrar el cuello de botella: `cProfile`

Para un programa entero, `cProfile` (de la biblioteca estándar) cuenta cuántas veces se llama cada función y cuánto tiempo pasa en ella:

```bash
python -m cProfile -o perfil.out -m ventas.pipeline
python -c "import pstats; pstats.Stats('perfil.out').sort_stats('cumulative').print_stats(10)"
```

En un cuaderno: `%prun main()`. Cómo leer la salida, con un ejemplo real (una tubería que estandariza 20 000 puntos, asigna cada uno a su centroide más cercano entre 64 y promedia por grupo):

```text
   ncalls  tottime  percall  cumtime  percall filename:lineno(function)
        1    0.000    0.000    0.218    0.218 perfil_demo.py:26(pipeline)
        1    0.087    0.087    0.184    0.184 perfil_demo.py:14(vecino_mas_cercano)
    20000    0.009    0.000    0.086    0.000 {method 'sum' of 'numpy.ndarray' objects}
    20005    0.073    0.000    0.073    0.000 {method 'reduce' of 'numpy.ufunc' objects}
```

- **`cumtime`**: tiempo dentro de la función **y de todo lo que llama**. Ordena por esto para ver qué rama del programa es cara.
- **`tottime`**: tiempo dentro de la función **sin** contar sus llamadas. Señala dónde se gasta de verdad.
- **`ncalls`**: el delator. `sum` se llama **20 000 veces**: hay un bucle de Python que llama a NumPy una vez por fila.

Diagnóstico: `vecino_mas_cercano` se lleva el 84 % del tiempo (0,184 de 0,218 s), y lo hace con un bucle de 20 000 vueltas que, en cada una, calcula las distancias a los 64 centroides. Es el patrón «bucle sobre las filas» que la [conferencia 3](c03-vectores.md) enseña a eliminar:

```python
def vecino_mas_cercano(X, C):
    D = (X ** 2).sum(1)[:, None] + (C ** 2).sum(1)[None, :] - 2 * X @ C.T   # (n, k)
    return D.argmin(axis=1)
```

Resultado medido: de 0,163 s a 0,025 s (unas 6,5 veces), y una prueba que compara las dos versiones confirma que asignan exactamente los mismos centroides. Con más centroides, la diferencia crece.

### 5.3. Los sospechosos habituales

| Patrón lento | Alternativa |
|---|---|
| `for i in range(len(X))` sobre filas de un arreglo | operaciones por eje, *broadcasting*, `@` |
| `df.iterrows()` o `df.apply(f, axis=1)` | operaciones de columnas: `df["a"] * df["b"]`, `np.where`, `.str`, `.dt` |
| `groupby(...).apply(lambda ...)` | `agg`/`transform` con funciones por nombre |
| crecer una lista o un `DataFrame` dentro de un bucle (`pd.concat` en cada vuelta) | acumular en una lista y concatenar **una vez** al final |
| leer el mismo CSV grande en cada ejecución | guardarlo en Parquet una vez |
| `float64` donde basta `float32` | la mitad de memoria y de tráfico |

> **Observación 2 (la memoria también se perfila).** Si el problema no es el tiempo sino la memoria, `tracemalloc` (biblioteca estándar) dice qué líneas reservan más; `df.memory_usage(deep=True)` dice cuánto ocupa cada columna (las de texto suelen ser las grandes: pasarlas a `category` ayuda). Y la estimación a mano de la [conferencia 3](c03-vectores.md) sigue siendo la primera herramienta.

---

## 6. El `README` y el «un solo comando»

El `README` es la primera (y a veces la única) página que leerá quien evalúe tu repositorio. Debe contestar cinco preguntas en este orden:

```markdown
# Ventas de una mipyme: limpieza y demanda semanal

Qué hace en una frase, y el resultado principal (una figura o una tabla).

## Instalación
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && pip install -e . --no-deps
# Sin conexión (ruedas guardadas, ver la conferencia 1):
# pip install --no-index --find-links RUTA_RUEDAS -r requirements.txt && pip install -e . --no-deps --no-build-isolation

## Datos
De dónde salen, su licencia y dónde ponerlos (data/raw/ventas.csv).

## Ejecución
python -m ventas.pipeline     # genera data/processed/ y figuras/
pytest                        # 14 pruebas, < 5 s

## Resultados y decisiones
Lo que encontraste y las decisiones de limpieza (centinelas, duplicados, censura).
```

**El «un solo comando».** Si el proyecto tiene varios pasos, un `Makefile` (o un pequeño `tareas.py`) los encadena: `make todo` = instalar, ejecutar la tubería y pasar las pruebas. La prueba de calidad es la misma que en la conferencia 1: **clona tu repositorio en otra carpeta, sigue tu `README` al pie de la letra y comprueba que obtienes los mismos números.**

> **Observación 3 (integración continua, una ventaja para ti).** GitHub Actions ejecuta tus pruebas en los servidores de GitHub **en cada `push`**, y esos servidores sí tienen acceso a PyPI. Como GitHub te funciona sin VPN, puedes tener integración continua sin descargar nada tú. Un archivo `.github/workflows/pruebas.yml` de 15 líneas basta (lo verás en MLOps), y la insignia verde «tests passing» en el `README` es una señal que los reclutadores reconocen.

---

## 7. Errores típicos y cómo detectarlos

| Error | Síntoma | Arreglo |
|---|---|---|
| Rutas absolutas | «FileNotFoundError» en cualquier otra máquina | `pathlib` relativo a la raíz, en `config.py` |
| Lógica en el cuaderno | no se puede probar ni reutilizar | funciones puras en `src/`; el cuaderno solo llama |
| Funciones que modifican su entrada | resultados que cambian al reejecutar celdas | `assign`, `.copy()`; prueba «no modifica la entrada» |
| `pip install -e .` sin red | falla al construir | rueda de `setuptools` guardada o `--no-build-isolation` |
| Pruebas con `==` sobre reales | fallos aleatorios | `pytest.approx`, `assert_allclose` |
| Pruebas con azar sin semilla | pruebas que fallan a veces | `default_rng(semilla)` en la prueba |
| Optimizar sin medir | horas en la parte que no importaba | `cProfile` primero |
| Medir la primera llamada | tiempos inflados | calentamiento; el mínimo de varias repeticiones |
| Optimizar sin prueba de equivalencia | la versión rápida da otro resultado | prueba «rápida = lenta» antes de cambiar |
| `README` sin instrucciones de datos | nadie puede reproducir | sección «Datos» con origen, licencia y ubicación |

---

## 8. Ideas que te llevas

- **Cuadernos para explorar; módulos para lo que se reutiliza.** Diseño `src/`, `pyproject.toml`, instalación editable.
- **Datos crudos de solo lectura; todo lo demás se regenera** con un solo comando.
- **Funciones puras:** entrada → salida, sin globales, sin modificar argumentos, con el azar explícito.
- **Pruebas:** casos límite, decisiones de limpieza, propiedades con semilla fija y «la versión rápida da lo mismo que la lenta».
- **Perfilar:** mide (`%timeit`, `perf_counter`), localiza (`cProfile`: `cumtime`, `tottime`, `ncalls`), optimiza solo el cuello de botella, prueba la equivalencia y vuelve a medir.
- **El `README` es la prueba de fuego:** otra persona, otra carpeta, los mismos números.

---

## 9. Preguntas de recuperación

1. Dibuja de memoria la estructura de carpetas de un proyecto reproducible y di qué va en cada una.
2. ¿Qué es una función pura y por qué facilita las pruebas?
3. ¿Por qué el diseño `src/` obliga a instalar el paquete, y por qué eso es bueno?
4. ¿Qué hace `pip install -e .` y qué hace falta para que funcione sin conexión?
5. Escribe una prueba con `pytest` que use `tmp_path` para comprobar que un CSV con coma decimal se lee bien.
6. En la salida de `cProfile`, ¿qué diferencia hay entre `tottime` y `cumtime`, y qué te dice un `ncalls` muy alto en una función de NumPy?
7. ¿Qué prueba escribes **antes** de sustituir una función lenta por una rápida?

:::solucion Respuestas
1. `data/raw` (originales, solo lectura), `data/processed` (derivados, regenerables), `src/paquete` (código importable), `tests` (pruebas), `notebooks` (exploración), `figuras`, y en la raíz `README.md`, `pyproject.toml`, `requirements.txt` y `.gitignore`.
2. Su salida depende solo de su entrada y no tiene efectos secundarios; basta con darle una entrada pequeña y comprobar la salida, sin preparar estado global ni archivos.
3. Porque el paquete no está en la carpeta actual sino en `src/`, así que `import` solo lo encuentra si está instalado. Las pruebas comprueban entonces el paquete tal como lo usaría otra persona.
4. Instala el paquete enlazando el código fuente (los cambios se ven sin reinstalar). Necesita el sistema de construcción (`setuptools`): sin red, su rueda en la carpeta local o `--no-build-isolation` con `setuptools` ya instalado.
5. Ver la sección 4.3, `test_leer_ventas_formato_espanol`.
6. `tottime` es el tiempo dentro de la propia función; `cumtime` incluye lo que llama. Un `ncalls` alto en una función de NumPy (`sum`, `reduce`) delata un bucle de Python que llama a NumPy fila a fila: hay que vectorizar.
7. Una prueba que compara las salidas de las dos versiones sobre entradas aleatorias con semilla fija (con tolerancia si son reales).
:::

---

## 10. Lecturas

- **pytest, «Get started»** y **«How to use fixtures»** (`https://docs.pytest.org/`), en inglés.
- **Python Packaging User Guide, «Packaging Python Projects»** (`https://packaging.python.org/en/latest/tutorials/packaging-projects/`), en inglés: `pyproject.toml` y el diseño `src/`.
- **Python, documentación de `cProfile` y `pstats`** (`https://docs.python.org/es/3/library/profile.html`), **en español**: la documentación oficial de Python está traducida.
- **Software Carpentry, «Control de versiones con Git»** (`https://swcarpentry.github.io/git-novice-es/`), en español, CC BY 4.0: episodios 8-10 (colaboración, conflictos y ciencia abierta).
- **Data Carpentry, «Análisis y visualización de datos usando Python»**, en español: episodio 7 («Flujos de trabajo y automatización»), sobre bucles, funciones y *scripts*.
