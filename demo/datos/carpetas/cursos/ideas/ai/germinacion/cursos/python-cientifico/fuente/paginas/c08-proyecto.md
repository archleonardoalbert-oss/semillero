---
titulo: Código de proyecto, no de cuaderno
num: 08
resumen: Lo que separa un repositorio de portafolio de un cuaderno que nadie puede ejecutar: estructura reproducible, funciones puras, pruebas con pytest y perfilar antes de optimizar.
horas: ≈ 3 h
metas: ≈ 3 h de estudio | 2 motores interactivos | un perfil real, medido
objetivos: Estructurar un repositorio reproducible | Escribir pruebas con pytest | Perfilar código lento
---

> **Objetivos.** Al terminar serás capaz de:
>
> 1. **Estructurar** un repositorio reproducible (`src/`, `tests/`, `data/`, `notebooks/`, `pyproject.toml`, `README`) que otra persona pueda ejecutar **con un solo comando**, incluso sin conexión.
> 2. **Convertir** el código de un cuaderno en funciones puras dentro de un paquete instalable.
> 3. **Escribir** pruebas con `pytest`: casos pequeños, fijaciones, parametrización, reales con tolerancia, archivos temporales y propiedades.
> 4. **Perfilar** con `%timeit`, `perf_counter` y `cProfile`, **localizar** el cuello de botella y **verificar** que la versión optimizada da lo mismo.

> **Prerrequisitos.** Todo lo anterior, en especial el entorno y Git de la [conferencia 1](c01-entorno.md) y la vectorización de la [conferencia 3](c03-vectores.md). De Python: módulos, paquetes e `import`, que ya conoces de Django.

## 1. El cuaderno que nadie puede ejecutar

Un repositorio que ve cualquiera que revisa portafolios: `Analisis_final_v3 (2).ipynb`, sin `requirements.txt`, que lee `C:\Users\Leo\Desktop\ventas.xlsx`, cuyas celdas solo funcionan en un orden que nadie recuerda y cuyos resultados cambian cada vez porque no hay semilla. Para un empleo remoto, ese repositorio **resta**: quien te contrata desde otro país no puede verte trabajar; solo ve tu código, y quiere saber si entregas algo que **funciona en otra máquina**.

Los cuadernos tienen problemas estructurales para el código que importa: **estado oculto** (borras una celda y su resultado sigue en memoria hasta que reinicias), **orden arbitrario**, **difíciles de probar y de reutilizar** (no se importa una función de un `.ipynb`) y **difíciles de revisar en Git** (un JSON con salidas incrustadas). La solución no es abandonarlos: **cuadernos para explorar y comunicar; módulos para todo lo que se reutiliza.**

> **Problema para pensar (5 minutos).** Piensa en la red de dígitos que hiciste. Si mañana alguien la clona en otra máquina, ¿qué le faltaría para ejecutarla de principio a fin y obtener **tus mismos números**? Haz la lista.

:::solucion Lo que suele faltar
Las dependencias con versiones exactas; los datos (o cómo obtenerlos) y rutas relativas; las semillas; el orden de ejecución; la versión de Python y el hardware; y una forma de saber que funciona (números esperados o pruebas). Cada punto tiene respuesta en esta conferencia.
:::

## 2. Un repositorio reproducible

Explora la estructura: cada elemento dice qué contiene y si va a Git.

:::widget repo Anatomía de un repositorio reproducible
Haz clic en cada carpeta o archivo. Fíjate en dos cosas: los datos crudos son de solo lectura, y todo lo demás se puede borrar y regenerar con un comando.
:::

Las cinco decisiones que importan: **los datos crudos son de solo lectura** (todo lo derivado lo produce el código); **el diseño `src/`** (el código importable vive en `src/ventas/`, lo que obliga a instalarlo, y así las pruebas prueban lo que se instala); **un punto de entrada** (`python -m ventas.pipeline` reproduce todo); **rutas relativas a la raíz**, en un solo sitio y con `pathlib`; y **un `README` que dice cómo reproducir**, también sin conexión.

```toml
# pyproject.toml
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

Se instala en modo editable (los cambios en `src/` se ven sin reinstalar) con `pip install -e ".[dev]"`.

:::error «`pip install -e .` funciona igual sin conexión»
**Por qué es tentador:** solo instala tu propio código. **Por qué falla:** para construir el paquete, `pip` crea un entorno aislado y **descarga `setuptools`** de PyPI; sin red, error. **Lo correcto:** guarda la rueda de `setuptools` en tu carpeta de ruedas (está en el `requirements.in` de la conferencia 1) y usa `pip install --no-index --find-links ~/ruedas/py312 -e ".[dev]"`, o instala `setuptools` en el entorno y añade `--no-build-isolation`. Escríbelo en el `README`: es justo el detalle que hace que tu proyecto funcione en Cuba.
:::

```python
# src/ventas/config.py
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]      # src/ventas/config.py → raíz del proyecto
DATOS_CRUDOS = RAIZ / "data" / "raw"
DATOS_PROCESADOS = RAIZ / "data" / "processed"
SEMILLA = 2026
```

Nunca `"C:\\Users\\..."`, nunca `os.chdir`: `Path` funciona igual en Linux y en Windows.

## 3. Del cuaderno a funciones puras

> **Definición 1 (función pura).** Su resultado depende **solo de sus argumentos** y **no tiene efectos secundarios**: no lee variables globales que cambian, no modifica sus argumentos, no escribe archivos ni imprime.

Las funciones puras se prueban dando una entrada y comprobando la salida. Para refactorizar un cuaderno: identifica los pasos; convierte cada uno en una función `DataFrame → DataFrame`; **separa la entrada/salida de la lógica**; haz explícito el azar (las funciones reciben un `rng`); deja en el cuaderno solo las llamadas y los gráficos.

> **Ejemplo 1 (refactorizar).** En el cuaderno:
>
> ```python
> df = pd.read_csv("C:/Users/Leo/Desktop/ventas.csv", sep=";", decimal=",")
> df["tienda"] = df["tienda"].str.strip().str.title()
> df = df[df["precio"] != 9999]
> df["importe"] = df["unidades"] * df["precio"]
> ```
>
> En `src/ventas/limpieza.py`:
>
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
>     """Normaliza tiendas, convierte el centinela de precio en NaN y añade el importe. No modifica df."""
>     precio = df["precio"].mask(df["precio"] == CENTINELA_PRECIO)
>     return df.assign(tienda=df["tienda"].str.strip().str.title(),
>                      precio=precio, importe=df["unidades"] * precio)
> ```
>
> **Por qué así.** La lectura queda aislada: es la única función que toca el disco. `limpiar_ventas` es pura gracias a `assign`. Y hay un **cambio de comportamiento deliberado**: el cuaderno **borraba** las filas con 9999 (perdiendo sus unidades); la función las conserva con precio desconocido, como decidimos en la [conferencia 5](c05-datos-sucios.md). Refactorizar es buen momento para revisar decisiones, pero cada cambio debe ser consciente y tener su prueba.

:::predice ¿Es pura esta función?
```python
UMBRAL = 5
def marcar_grandes(df):
    df["grande"] = df["unidades"] > UMBRAL
    print(df["grande"].sum())
    return df
```
- [ ] Sí: devuelve un `DataFrame`.
- [ ] Sí, salvo por el `print`.
- [x] No, por tres motivos.
---
Depende de una global (`UMBRAL`), **modifica su argumento** (escribe en la tabla de quien la llama) e imprime. Versión pura: `def marcar_grandes(df, umbral): return df.assign(grande=df["unidades"] > umbral)`.
:::

## 4. Pruebas con `pytest`

Una prueba es una función `test_…` en un archivo `tests/test_*.py` que usa `assert`; `pytest` las encuentra y, si fallan, muestra los valores de cada lado.

```python
# tests/test_limpieza.py
import numpy as np
import pandas as pd
import pytest
from ventas.limpieza import leer_ventas, limpiar_ventas

def test_centinela_es_nan_y_no_se_pierden_filas():
    df = pd.DataFrame({"tienda": ["A", "A"], "unidades": [1, 2], "precio": [10.0, 9999.0]})
    r = limpiar_ventas(df)
    assert len(r) == 2
    assert np.isnan(r["precio"].iloc[1]) and np.isnan(r["importe"].iloc[1])

def test_no_modifica_la_entrada():
    df = pd.DataFrame({"tienda": ["a "], "unidades": [1], "precio": [9999.0]})
    copia = df.copy()
    limpiar_ventas(df)
    pd.testing.assert_frame_equal(df, copia)

@pytest.mark.parametrize("entrada, esperado", [(" centro", "Centro"), ("CENTRO", "Centro"), ("playa  ", "Playa")])
def test_normalizar_tienda(entrada, esperado):
    df = pd.DataFrame({"tienda": [entrada], "unidades": [1], "precio": [1.0]})
    assert limpiar_ventas(df)["tienda"].iloc[0] == esperado

def test_leer_formato_espanol(tmp_path):                 # tmp_path: carpeta temporal nueva
    ruta = tmp_path / "v.csv"
    ruta.write_text("fecha;tienda;producto;unidades;precio\n03/01/2026;A;arroz;2;1.250,50\n", encoding="utf-8")
    df = leer_ventas(ruta)
    assert df["precio"].iloc[0] == pytest.approx(1250.5)
    assert df["fecha"].iloc[0] == pd.Timestamp("2026-01-03")    # 3 de enero, no 1 de marzo
```

Herramientas que usarás: `pytest.approx` y `np.testing.assert_allclose` (nunca `==` con reales); **fijaciones** (`@pytest.fixture`: datos que comparten varias pruebas, que `pytest` pasa a la prueba que tenga un argumento con su nombre); `@pytest.mark.parametrize` (la misma prueba con varios casos); `tmp_path` (archivos temporales); y `with pytest.raises(pd.errors.MergeError):` para comprobar que algo falla como debe.

**Qué probar:** los casos límite (tabla vacía, un solo grupo, todo `NaN`, columna constante, empates), las decisiones de limpieza, las **propiedades** que deben cumplirse para cualquier entrada, y **cada error real que encuentres** (prueba de regresión, para que no vuelva).

```python
@pytest.mark.parametrize("semilla", [0, 1, 2])
def test_estandarizar_propiedades(semilla):
    X = np.random.default_rng(semilla).normal(loc=5, scale=3, size=(200, 4))
    Z = estandarizar(X)
    np.testing.assert_allclose(Z.mean(axis=0), 0, atol=1e-12)
    np.testing.assert_allclose(Z.std(axis=0), 1, atol=1e-12)

def test_distancias_rapida_igual_a_lenta():             # la prueba que se escribe ANTES de optimizar
    rng = np.random.default_rng(0)
    A, B = rng.normal(size=(30, 5)), rng.normal(size=(20, 5))
    lenta = ((A[:, None, :] - B[None, :, :]) ** 2).sum(-1)
    np.testing.assert_allclose(distancias(A, B), lenta, atol=1e-10)
```

:::autoexplica ¿Qué propiedades debe cumplir `particion(n, frac_prueba, semilla)` de la [conferencia 4](c04-aleatoriedad.md)? Escribe la prueba.
---
Tamaños correctos, conjuntos disjuntos, que entre los dos cubran todos los índices, y reproducibilidad (misma semilla, mismo resultado; otra semilla, otro):
```python
def test_particion():
    ent, pru = particion(100, 0.2, semilla=7)
    assert len(pru) == 20 and len(ent) == 80
    assert set(ent).isdisjoint(pru) and set(ent) | set(pru) == set(range(100))
    np.testing.assert_array_equal(pru, particion(100, 0.2, semilla=7)[1])
    assert not np.array_equal(pru, particion(100, 0.2, semilla=8)[1])
```
:::

## 5. Perfilar: medir antes de optimizar

> **Regla.** No optimices por intuición. **Mide**, encuentra la función que se lleva el tiempo, optimiza **solo esa**, comprueba con una prueba que el resultado no cambió y **vuelve a medir**.

**Un fragmento:** `%timeit expr` en Jupyter repite y da media y dispersión. En un *script*, `time.perf_counter()` repetido, quedándote con el mínimo (el menos afectado por otras tareas), y siempre **después** de una llamada de calentamiento (la primera paga costes únicos: importar, reservar memoria, inicializar BLAS o CUDA).

**Un programa entero:** `cProfile`, de la biblioteca estándar, cuenta cuántas veces se llama cada función y cuánto tiempo pasa en ella:

```bash
python -m cProfile -o perfil.out -m ventas.pipeline
python -c "import pstats; pstats.Stats('perfil.out').sort_stats('cumulative').print_stats(10)"
```

En un cuaderno, `%prun main()`. Esta es la salida real (NumPy 2.5) de una tubería que estandariza 20 000 puntos y asigna cada uno a su centroide más cercano entre 64:

```text
   ncalls  tottime  percall  cumtime  percall filename:lineno(function)
        1    0.000    0.000    0.189    0.189 perfil_demo.py:26(pipeline)
        1    0.086    0.086    0.183    0.183 perfil_demo.py:14(vecino_mas_cercano)
    20000    0.009    0.000    0.085    0.000 {method 'sum' of 'numpy.ndarray' objects}
    20005    0.073    0.000    0.073    0.000 {method 'reduce' of 'numpy.ufunc' objects}
    20000    0.011    0.000    0.011    0.000 {method 'argmin' of 'numpy.ndarray' objects}
```

**`cumtime`** es el tiempo en la función **y en todo lo que llama**; **`tottime`**, sin contar sus llamadas; **`ncalls`** es el delator: `sum` y `argmin` se llaman **20 000 veces**, es decir, hay un bucle de Python que llama a NumPy una vez por fila. `vecino_mas_cercano` se lleva el 97 % del tiempo. Con la vectorización de la [conferencia 3](c03-vectores.md):

```python
def vecino_mas_cercano(X, C):
    D = (X ** 2).sum(1)[:, None] + (C ** 2).sum(1)[None, :] - 2 * X @ C.T   # (n, k)
    return D.argmin(axis=1)
```

el perfil completo baja de 0,189 s a 0,022 s (medido igual), y la prueba de equivalencia confirma que asigna exactamente los mismos centroides.

:::widget perfil El perfil, antes y después
Cada barra es una función; su ancho, su tiempo acumulado; debajo, lo que llama. Haz clic para ver ncalls, tottime y cumtime, y después activa «después de vectorizar».
:::

| Patrón lento | Alternativa |
|---|---|
| `for i in range(len(X))` sobre filas | reducciones por eje, *broadcasting*, `@` |
| `df.iterrows()`, `df.apply(f, axis=1)` | operaciones de columnas, `np.where`, `.str`, `.dt` |
| `groupby(...).apply(lambda ...)` | `agg`/`transform` con funciones por nombre |
| `pd.concat` dentro de un bucle | acumular en una lista y concatenar una vez |
| leer el mismo CSV grande cada vez | Parquet |
| `float64` donde basta `float32` | la mitad de memoria y de tráfico |

> **Observación 1 (la memoria también se perfila).** `tracemalloc` (biblioteca estándar) dice qué líneas reservan más; `df.memory_usage(deep=True)`, cuánto ocupa cada columna (las de texto suelen ser las grandes). La [demostración para valientes 2](v02-memoria-distancias.md) lo usa para medir exactamente lo que predice la teoría.

## 6. El `README` y el «un solo comando»

El `README` contesta cinco preguntas en orden: **qué es** (una frase y el resultado principal), **instalación** (con y sin conexión), **datos** (de dónde, licencia, dónde ponerlos), **ejecución** (`python -m ventas.pipeline` y `pytest`) y **resultados y decisiones**. Si hay varios pasos, un `Makefile` o un `tareas.py` los encadena. La prueba de calidad es la de la conferencia 1: **clona tu repositorio en otra carpeta, sigue tu `README` al pie de la letra y comprueba que obtienes los mismos números.**

> **Observación 2 (integración continua, una ventaja para ti).** GitHub Actions ejecuta tus pruebas en los servidores de GitHub en cada `push`, y esos servidores sí tienen PyPI. Como GitHub te funciona sin VPN, tienes integración continua sin descargar nada tú. La insignia «tests passing» en el `README` es una señal que los reclutadores reconocen (lo verás en MLOps).

## 7. Errores típicos

| Error | Síntoma | Arreglo |
|---|---|---|
| Rutas absolutas | `FileNotFoundError` en otra máquina | `pathlib` relativo a la raíz |
| Lógica en el cuaderno | no se prueba ni se reutiliza | funciones puras en `src/` |
| Funciones que modifican su entrada | resultados que cambian al reejecutar | `assign`; prueba «no modifica la entrada» |
| Pruebas con `==` sobre reales | fallos aleatorios | `approx`, `assert_allclose` |
| Pruebas con azar sin semilla | fallan a veces | `default_rng(semilla)` |
| Optimizar sin medir | horas en lo que no importaba | `cProfile` primero |
| Optimizar sin prueba de equivalencia | la versión rápida da otro resultado | prueba «rápida = lenta» |

:::llevas Ideas que te llevas
- **Cuadernos para explorar; módulos para reutilizar.** Diseño `src/`, `pyproject.toml`, instalación editable (también sin red).
- **Datos crudos de solo lectura;** todo lo demás se regenera con un comando.
- **Funciones puras** y **pruebas** de casos límite, decisiones y propiedades con semilla.
- **Perfilar:** `cumtime` dice qué rama es cara; `ncalls` alto en NumPy delata un bucle de Python.
- **El `README` es la prueba de fuego:** otra persona, otra carpeta, los mismos números.
:::

## 8. Preguntas de recuperación

1. Dibuja de memoria la estructura de un proyecto reproducible y di qué va en cada carpeta.
2. ¿Qué es una función pura y por qué facilita las pruebas?
3. ¿Qué hace `pip install -e .` y qué hace falta para que funcione sin conexión?
4. En `cProfile`, ¿qué diferencia hay entre `tottime` y `cumtime`, y qué te dice un `ncalls` alto en una función de NumPy?
5. ¿Qué prueba escribes **antes** de sustituir una función lenta por una rápida?

:::solucion Respuestas
1. `data/raw` (solo lectura), `data/processed` (regenerable), `src/paquete`, `tests`, `notebooks`, `figuras`, y en la raíz `README.md`, `pyproject.toml`, `requirements.txt`, `.gitignore`.
2. Su salida depende solo de su entrada y no tiene efectos secundarios: basta una entrada pequeña y comprobar la salida.
3. Instala el paquete enlazando el código fuente. Necesita `setuptools`: sin red, su rueda en la carpeta local o `--no-build-isolation`.
4. `tottime` es el tiempo propio; `cumtime` incluye lo que llama. Un `ncalls` alto en `sum` o `reduce` delata un bucle de Python que llama a NumPy fila a fila.
5. Una que compare las dos versiones sobre entradas aleatorias con semilla fija, con tolerancia si son reales.
:::

## 9. Lecturas

- **pytest, «Get started»** y **«How to use fixtures»** (`https://docs.pytest.org/`), en inglés.
- **Python Packaging User Guide, «Packaging Python Projects»** (`https://packaging.python.org/en/latest/tutorials/packaging-projects/`), en inglés: `pyproject.toml` y el diseño `src/`.
- **Python, documentación de `cProfile` y `pstats`** (`https://docs.python.org/es/3/library/profile.html`), **en español**.
- **Software Carpentry, «Control de versiones con Git»** (`https://swcarpentry.github.io/git-novice-es/`), en español: episodios 8-10.
- **Data Carpentry**, episodio 7 («Flujos de trabajo y automatización»), en español.
