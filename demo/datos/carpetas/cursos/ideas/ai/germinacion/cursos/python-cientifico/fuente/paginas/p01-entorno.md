---
titulo: Tu entorno, verificado y reproducible
num: P1
resumen: Ocho ejercicios para leer ruedas, elegir la variante, diagnosticar errores y entregar el primer repositorio del portafolio: un entorno que se reconstruye sin red.
horas: ≈ 3 h
---

> **Conferencia que practica:** [1. Un entorno que funcione desde Cuba](c01-entorno.md).
>
> **Entregable:** un repositorio público en GitHub, `curso-ai-python`, con `requirements.in`, `requirements.txt`, `verificar_entorno.py`, `reconstruir.sh` y un `README` que diga cómo reproducir tu entorno sin conexión. Los ejercicios 6, 7 y 8 lo construyen.
>
> **Cómo trabajar.** Intenta cada ejercicio sin abrir las pistas. Si te atascas más de 10 minutos, abre **una** pista y vuelve a intentarlo. Las pistas van de lo más general (el concepto) a lo más concreto (el paso difícil). Sin asistente de IA: es la forma de saber si tu 4 en autonomía es real.

---

## Ejercicio 1. Leer el nombre de una rueda

Para cada archivo, di qué paquete y versión es, para qué versión de Python, para qué sistema operativo y arquitectura, y si te sirve en un Linux x86-64 con Python 3.12.

1. `numpy-2.3.4-cp312-cp312-manylinux_2_27_x86_64.manylinux_2_28_x86_64.whl`
2. `pandas-3.0.1-cp313-cp313-win_amd64.whl`
3. `torch-2.13.0+cu126-cp312-cp312-manylinux_2_28_x86_64.whl`
4. `requests-2.32.5-py3-none-any.whl`
5. `pyarrow-21.0.0.tar.gz`

:::pista Concepto
El nombre de una rueda sigue el patrón `paquete-versión-python-abi-plataforma.whl`. Cada campo restringe dónde se puede instalar.
:::

:::pista Estrategia
Separa por guiones. El tercer campo (`cp312`, `py3`) dice la versión de Python; el último (`manylinux…_x86_64`, `win_amd64`, `any`), la plataforma. Un `+cu126` dentro de la versión es una etiqueta local de PyTorch.
:::

:::pista Arranque
El 1: `numpy`, versión 2.3.4, `cp312` = CPython 3.12, `manylinux_2_28_x86_64` = cualquier Linux de 64 bits con glibc 2.28 o posterior. Te sirve.
:::

:::pista Desbloqueo
`py3-none-any` significa «cualquier Python 3, sin código compilado, cualquier plataforma»: es Python puro. Y `.tar.gz` no es una rueda: es una distribución de código fuente.
:::

:::solucion Solución modelo
1. NumPy 2.3.4, CPython 3.12, Linux x86-64 con glibc ≥ 2.27/2.28. **Sirve.**
2. pandas 3.0.1, CPython 3.13, Windows de 64 bits. **No sirve**: ni la versión de Python ni el sistema coinciden.
3. PyTorch 2.13.0, variante CUDA 12.6, CPython 3.12, Linux x86-64. **Sirve** (si la GPU y el controlador lo admiten: ejercicio 2).
4. requests 2.32.5, Python puro (`py3-none-any`): **sirve en cualquier sitio**.
5. Una distribución de código fuente de pyarrow: `pip` tendría que **compilarla** (C++ y muchas dependencias). En la práctica no sirve; busca la rueda.

**Idea reutilizable:** antes de copiar ruedas a otra máquina, lee el campo de Python y el de plataforma. Es la causa número uno de «no encuentra una versión que satisfaga el requisito» al instalar sin conexión.
:::

---

## Ejercicio 2. Elegir la variante de PyTorch

Para cada máquina, decide `cu126`, `cu130` o «hay que arreglar algo antes», y justifica.

| Máquina | GPU | `nvidia-smi`: «CUDA Version» |
|---|---|---|
| A | GTX 1060 6 GB | 13.0 |
| B | RTX 3050 Laptop 6 GB | 13.0 |
| C | GTX 1660 Super 6 GB | 12.4 |
| D | RTX 4050 Laptop 6 GB | `nvidia-smi: command not found` |

:::pista Concepto
Dos condiciones independientes: la **capacidad de cómputo** de la GPU debe estar en la lista de la variante, y la versión de CUDA de la variante no puede superar la que admite el controlador.
:::

:::pista Estrategia
Primero traduce cada GPU a su arquitectura y capacidad (Pascal 6.1, Turing 7.5, Ampere 8.6, Ada 8.9). Luego aplica la regla de la sección 4.1 de la conferencia.
:::

:::pista Arranque
A: GTX 1060 es Pascal (6.1). `cu130` no trae código para capacidades menores que 7.5, así que, aunque el controlador sea moderno, la opción es `cu126`.
:::

:::pista Desbloqueo
D no tiene un problema de variante: sin `nvidia-smi`, el controlador no está instalado (o no cargó). Ninguna variante verá la GPU hasta arreglarlo.
:::

:::solucion Solución modelo
- **A:** `cu126`. Pascal (6.1) solo está en las variantes de CUDA 12.6. Además, conviene fijar PyTorch 2.13 o 2.14 y guardar las ruedas: a partir de la 2.15 no habrá `cu126`.
- **B:** `cu130`. Ampere (8.6) está en todas las variantes y el controlador admite CUDA 13.0. Es la variante por defecto.
- **C:** `cu126`. Turing (7.5) está en las dos variantes, pero el controlador solo llega a CUDA 12.4. La alternativa es actualizar el controlador a la serie 580 o posterior y usar `cu130`.
- **D:** arreglar antes el controlador. Después, Ada (8.9) con un controlador moderno: `cu130`.

**Idea reutilizable:** «¿qué GPU?» y «¿qué controlador?» son dos preguntas distintas, y `is_available()` solo responde la segunda.
:::

---

## Ejercicio 3. El presupuesto de datos

Tienes 15 GB este mes. Planeas:

- instalar el entorno del curso con Python 3.12 (`cu130`);
- un compañero te pide las mismas ruedas, pero él tiene Python 3.13;
- la asignatura siguiente pedirá un modelo de 1,2 GB.

(a) ¿Cuánto gastas en el peor caso razonable? (b) ¿Qué harías para no pagar dos veces el entorno si tu compañero y tú usáis versiones de Python distintas? (c) ¿Cuánto te costaría equivocarte de variante (`cu130` en una GTX 1060) y tener que repetir?

:::pista Concepto
Las ruedas compiladas son específicas de la versión de Python, pero no todas: las de Python puro (`py3-none-any`) y las bibliotecas de NVIDIA no dependen de la versión de Python.
:::

:::pista Estrategia
Usa la tabla de la sección 7.1: ~3-4 GB por entorno. Separa qué parte de la descarga depende de la versión de Python (la rueda de `torch`, ~0,8-1 GB, y las de NumPy, pandas…) y qué parte no (las `nvidia-*`, ~1,5-2,5 GB).
:::

:::pista Arranque
(a) Tu entorno: 4 GB × 1,25 = 5 GB. El modelo: 1,2 GB. Ya van 6,2 GB.
:::

:::pista Desbloqueo
(b) Las ruedas `nvidia-*` llevan la etiqueta `py3-none-manylinux…`: sirven para 3.12 y 3.13. Para el compañero solo hace falta bajar lo que depende de la versión (≈ 1-1,3 GB), con `pip download --python-version 3.13 --only-binary=:all: --platform manylinux_2_28_x86_64` en la misma carpeta.
:::

:::solucion Solución modelo
(a) Entorno propio con margen: ≈ 5 GB; ruedas para la otra versión de Python: ≈ 1,5 GB con margen; modelo: 1,2 GB. Total ≈ 7,7 GB, más unos 3 GB de uso normal: unos 11 GB. Cabe en 15 GB.

(b) Una sola carpeta de ruedas para los dos. Las bibliotecas de NVIDIA y los paquetes de Python puro sirven a ambos; solo se bajan por duplicado las ruedas compiladas (`torch`, `numpy`, `pandas`, `pyarrow`…). Mejor aún: poneros de acuerdo en **una** versión de Python (3.12), y la carpeta sirve entera para los dos.

(c) Otros ~3 GB: las bibliotecas de CUDA 12 no comparten nombre ni versión con las de CUDA 13, así que casi todo se descarga de nuevo. Por eso el diagnóstico (ejercicio 2) se hace **antes** de descargar.

**Idea reutilizable:** separa lo que depende de la versión de Python de lo que no; las decisiones baratas (qué variante, qué Python) se toman antes de la descarga cara.
:::

---

## Ejercicio 4. Diagnosticar mensajes de error

Para cada mensaje, di la causa más probable y el arreglo.

1. `ERROR: Could not find a version that satisfies the requirement torch==2.13.0 (from versions: none)`, al ejecutar `pip install --no-index --find-links ruedas -r requirements.txt`.
2. `RuntimeError: CUDA error: no kernel image is available for execution on the device`.
3. `error: externally-managed-environment`.
4. `torch.cuda.is_available()` devuelve `False` y `torch.version.cuda` es `None`.
5. `ModuleNotFoundError: No module named 'pandas'` en un cuaderno de Jupyter, aunque `pip list` en la terminal muestra pandas.

:::pista Concepto
Cada mensaje apunta a una capa distinta de la figura 1 de la conferencia: la carpeta de ruedas, la GPU, el sistema operativo, la variante, el intérprete.
:::

:::pista Estrategia
Pregúntate en cada caso: ¿qué esperaba encontrar el programa y dónde lo buscó?
:::

:::pista Arranque
1: con `--no-index`, `pip` solo busca en `ruedas/`. «from versions: none» significa que no hay **ninguna** rueda de `torch` compatible allí.
:::

:::pista Desbloqueo
5: Jupyter ejecuta el código en un *núcleo* que puede ser otro Python. `import sys; print(sys.executable)` dentro del cuaderno te lo dice.
:::

:::solucion Solución modelo
1. En `ruedas/` no hay una rueda de `torch` 2.13.0 compatible con este Python y esta plataforma: se descargó con otra versión de Python, o la descarga falló. Comprueba el nombre del archivo (ejercicio 1) y descarga con el mismo Python.
2. La rueda no trae código para la capacidad de cómputo de tu GPU: típicamente `cu130` en una GPU Pascal. Instala `cu126`.
3. Intentas instalar en el Python del sistema. Crea y activa un entorno virtual.
4. Está instalada la variante de CPU (por ejemplo, `pip install torch` desde PyPI en Windows). Reinstala con `--index-url https://download.pytorch.org/whl/cu126` (o `cu130`).
5. El núcleo de Jupyter es otro intérprete. Registra el del entorno con `python -m ipykernel install --user --name curso-ai` y elígelo en el cuaderno.

**Idea reutilizable:** ante un error de entorno, identifica **qué capa** falla antes de reinstalar nada. Reinstalar a ciegas cuesta gigabytes.
:::

---

## Ejercicio 5. Los comandos exactos para otra máquina

Un compañero tiene **Windows**, Python 3.12, una GTX 1660 Ti y un controlador que admite CUDA 12.8. Tiene VPN solo una hora. Escríbele, en orden, los comandos para: crear el entorno, descargar todo lo del `requirements.in` de la conferencia a una carpeta, instalar desde ella, verificar y congelar las versiones.

:::pista Concepto
Mismo procedimiento de dos fases que en Linux; cambian la activación del entorno, las rutas y la variante.
:::

:::pista Estrategia
Decide primero la variante (ejercicio 2): Turing con un controlador de CUDA 12.8. Luego adapta los comandos de las secciones 3.2 y 5.2 a PowerShell.
:::

:::pista Arranque
Variante: `cu126`, porque el controlador no llega a 13.0. Entorno: `py -3.12 -m venv .venv` y `.venv\Scripts\Activate.ps1`.
:::

:::pista Desbloqueo
En Windows, `pip install torch` desde PyPI instala la variante de **CPU**. El índice de PyTorch con `--index-url` es imprescindible, y PyPI va como `--extra-index-url`.
:::

:::solucion Solución modelo
```powershell
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
mkdir C:\ruedas\py312
pip download -d C:\ruedas\py312 `
    --index-url https://download.pytorch.org/whl/cu126 `
    --extra-index-url https://pypi.org/simple `
    -r requirements.in
pip install --no-index --find-links C:\ruedas\py312 -r requirements.in
python verificar_entorno.py
pip freeze > requirements.txt
```
Las ruedas que descarga serán `win_amd64`: no le servirán a un compañero con Linux (ejercicio 1). El acento grave (`` ` ``) continúa la línea en PowerShell, como `\` en bash.

**Idea reutilizable:** las ruedas son específicas de la plataforma; una carpeta de ruedas por combinación (sistema, versión de Python).
:::

---

## Ejercicio 6. `verificar_entorno.py` (entregable)

Escribe un *script* que:

1. imprima las versiones de Python, NumPy, pandas, matplotlib y PyTorch, y la versión de CUDA de la rueda;
2. si hay GPU, imprima su nombre, su capacidad de cómputo, la memoria libre y total en GiB, y si la capacidad está en `torch.cuda.get_arch_list()`;
3. entrene una **regresión lineal de juguete** en la GPU (o en la CPU si no hay GPU) por descenso de gradiente, con el gradiente escrito a mano, y compruebe que recupera los coeficientes verdaderos y que coincide con la solución de mínimos cuadrados de NumPy;
4. termine con código de salida 0 si todo está bien y 1 si algo falla.

Datos de juguete: $X \in \mathbb R^{n\times d}$ con entradas normales, $n = 100\,000$, $d = 20$; $w_{\text{real}}$ normal; $y = Xw_{\text{real}} + 0{,}1\,\varepsilon$.

:::pista Concepto
La pérdida $f(w) = \frac1n\lVert Xw - y\rVert^2$ tiene gradiente $\nabla f = \frac2n X^\top(Xw - y)$ (lo derivarás en la asignatura de matemáticas del ML). El descenso de gradiente es $w \leftarrow w - \eta\,\nabla f(w)$. En PyTorch, las operaciones son las mismas que en NumPy (`@`, `.T`), pero los tensores viven en un dispositivo.
:::

:::pista Estrategia
Genera los datos en la CPU con un generador con semilla, cópialos a la GPU con `.to(dispositivo)`, haz el bucle de descenso en la GPU, y trae el resultado con `.cpu()` para compararlo con `np.linalg.lstsq`. Para medir el tiempo en la GPU hay que esperar a que termine: `torch.cuda.synchronize()`.
:::

:::pista Arranque
```python
dispositivo = torch.device("cuda" if torch.cuda.is_available() else "cpu")
g = torch.Generator().manual_seed(0)
X = torch.randn(n, d, generator=g)
w_real = torch.randn(d, generator=g)
y = X @ w_real + 0.1 * torch.randn(n, generator=g)
```
:::

:::pista Desbloqueo
Con $X$ normal estándar, $\frac2n X^\top X \approx 2I$, así que con $\eta = 0{,}1$ el error se multiplica por $\approx 0{,}8$ en cada paso: 300 pasos bastan de sobra. (Por qué $\eta$ no puede ser mayor que 1 aquí lo verás en la asignatura de matemáticas.) Compara con tolerancia: los dos métodos coinciden hasta $\sim 10^{-5}$ en `float32`.
:::

:::solucion Solución modelo
```python
"""Verifica el entorno del curso: versiones, GPU y una regresión lineal de juguete en la GPU."""
import platform
import sys
import time

import numpy as np


def main() -> int:
    import matplotlib
    import pandas as pd
    import torch

    print(f"Python {platform.python_version()} | NumPy {np.__version__} | pandas {pd.__version__} "
          f"| matplotlib {matplotlib.__version__} | torch {torch.__version__} (CUDA de la rueda: {torch.version.cuda})")
    ok = True

    if torch.cuda.is_available():
        dispositivo = torch.device("cuda")
        mayor, menor = torch.cuda.get_device_capability(0)
        libre, total = torch.cuda.mem_get_info()
        arqs = torch.cuda.get_arch_list()
        print(f"GPU: {torch.cuda.get_device_name(0)} | capacidad {mayor}.{menor} | "
              f"libre {libre / 2**30:.2f} de {total / 2**30:.2f} GiB")
        if f"sm_{mayor}{menor}" not in arqs:
            print(f"AVISO: la rueda no trae código para sm_{mayor}{menor} (trae {arqs})")
            ok = False
    else:
        dispositivo = torch.device("cpu")
        print("Sin GPU: la prueba se hará en la CPU")
        if torch.version.cuda is not None:       # rueda de CUDA que no ve la GPU: algo falla
            print("AVISO: la rueda es de CUDA pero no ve ninguna GPU (¿controlador?)")
            ok = False

    # Regresión lineal de juguete por descenso de gradiente, con el gradiente a mano
    n, d, pasos, eta = 100_000, 20, 300, 0.1
    g = torch.Generator().manual_seed(0)
    X = torch.randn(n, d, generator=g)
    w_real = torch.randn(d, generator=g)
    y = X @ w_real + 0.1 * torch.randn(n, generator=g)
    Xd, yd = X.to(dispositivo), y.to(dispositivo)
    w = torch.zeros(d, device=dispositivo)

    if dispositivo.type == "cuda":
        torch.cuda.synchronize()
    t0 = time.perf_counter()
    for _ in range(pasos):
        grad = (2 / n) * (Xd.T @ (Xd @ w - yd))
        w -= eta * grad
    if dispositivo.type == "cuda":
        torch.cuda.synchronize()            # esperar a que la GPU termine antes de medir
    segundos = time.perf_counter() - t0

    w_gd = w.cpu().numpy()
    w_mc = np.linalg.lstsq(X.numpy(), y.numpy(), rcond=None)[0]   # referencia en CPU
    err_real = np.abs(w_gd - w_real.numpy()).max()
    err_mc = np.abs(w_gd - w_mc).max()
    print(f"Descenso de gradiente en {dispositivo}: {pasos} pasos en {segundos:.3f} s | "
          f"máx |w - w_real| = {err_real:.2e} | máx |w - w_mínimos_cuadrados| = {err_mc:.2e}")
    if err_real > 1e-2 or err_mc > 1e-3:
        print("FALLO: la regresión no recupera los coeficientes")
        ok = False

    print("ENTORNO CORRECTO" if ok else "HAY PROBLEMAS: revisa los avisos")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
```

**Por qué cada decisión.** Los `import` pesados van dentro de `main` para que, si falta un paquete, el error salga en ejecución con el nombre del paquete. El gradiente a mano evita depender todavía de `autograd` y de los optimizadores (los verás en aprendizaje profundo). `synchronize` es imprescindible: las operaciones de CUDA son **asíncronas**, y sin esperar mediríamos solo el tiempo de *encolarlas*. La referencia `lstsq` se calcula en CPU con NumPy: dos implementaciones independientes que coinciden son mucho más convincentes que una sola. El código de salida permite usarlo en el `reconstruir.sh` del ejercicio 7.

**Idea reutilizable:** una verificación de entorno ejecuta algo real y lo compara con una referencia independiente; nunca se fía de un `True` aislado.
:::

---

## Ejercicio 7. La prueba de fuego como *script* (entregable)

Escribe `reconstruir.sh` (o `reconstruir.ps1` en Windows) que, **sin red**: borre `.venv`, lo cree de nuevo, instale desde tu carpeta de ruedas con `requirements.txt`, ejecute `verificar_entorno.py` y diga si todo fue bien. La ruta de las ruedas debe poder cambiarse sin editar el *script*.

:::pista Concepto
Un *script* de shell es la forma de hacer un procedimiento **repetible**: si funciona una vez, funciona siempre igual. El código de salida del verificador (ejercicio 6) le dice al *script* si hubo éxito.
:::

:::pista Estrategia
Usa una variable de entorno con valor por defecto para la carpeta de ruedas (`${RUEDAS:-$HOME/ruedas/py312}`) y `set -euo pipefail` para que el *script* se detenga en el primer error.
:::

:::pista Arranque
```bash
#!/usr/bin/env bash
set -euo pipefail
RUEDAS="${RUEDAS:-$HOME/ruedas/py312}"
PYTHON="${PYTHON:-python3.12}"
```
:::

:::pista Desbloqueo
Llama al `python` del entorno por su ruta (`.venv/bin/python`) en vez de activar el entorno: en un *script*, `source activate` es frágil y la ruta explícita no deja dudas sobre qué intérprete se usa.
:::

:::solucion Solución modelo
```bash
#!/usr/bin/env bash
# Reconstruye el entorno del curso SIN conexión desde la carpeta de ruedas y lo verifica.
# Uso: ./reconstruir.sh            (ruedas en ~/ruedas/py312)
#      RUEDAS=/media/usb/ruedas ./reconstruir.sh
set -euo pipefail
RUEDAS="${RUEDAS:-$HOME/ruedas/py312}"
PYTHON="${PYTHON:-python3.12}"

[ -d "$RUEDAS" ] || { echo "No existe la carpeta de ruedas: $RUEDAS"; exit 1; }
rm -rf .venv
"$PYTHON" -m venv .venv
.venv/bin/python -m pip install --no-index --find-links "$RUEDAS" --upgrade pip
.venv/bin/python -m pip install --no-index --find-links "$RUEDAS" -r requirements.txt
if .venv/bin/python verificar_entorno.py; then
    echo "OK: entorno reconstruido sin red y verificado"
else
    echo "FALLO: el entorno se instaló pero la verificación no pasó"; exit 1
fi
```
Dale permisos con `chmod +x reconstruir.sh`. Pruébalo **con la red desactivada** de verdad (modo avión o desconectando el cable): es la única prueba que cuenta. Fíjate en que usa `requirements.txt` (las versiones exactas), no `requirements.in`.

**Idea reutilizable:** todo procedimiento que vayas a repetir más de dos veces merece un *script* que falle de forma ruidosa.
:::

---

## Ejercicio 8. Publicar (entregable)

Crea el repositorio `curso-ai-python` en GitHub con: `.gitignore`, `requirements.in`, `requirements.txt`, `verificar_entorno.py`, `reconstruir.sh` y un `README.md` que tenga (a) la variante de PyTorch y la versión de Python que usas y por qué; (b) el tamaño **medido** de tu carpeta de ruedas; (c) cómo instalar con y sin conexión; (d) la salida de `verificar_entorno.py` en tu máquina; (e) qué servicios te funcionan sin VPN (lo que comprobaste en el diagnóstico y lo que pruebes ahora, como un espejo de PyPI).

:::pista Concepto
El `README` es documentación para otra persona (y para ti dentro de seis meses). Debe poder seguirse sin preguntarte nada.
:::

:::pista Estrategia
Escribe el `README` con las cinco secciones pedidas y luego **síguelo tú mismo** en una carpeta nueva (`git clone` del repositorio recién subido).
:::

:::pista Arranque
`.gitignore` mínimo: `.venv/`, `__pycache__/`, `.ipynb_checkpoints/`, `*.whl`, `data/raw/`. Comprueba con `git status` que nada de eso aparece antes del primer `commit`.
:::

:::pista Desbloqueo
El tamaño medido sale de `du -sh ~/ruedas/py312` (Linux) o de las propiedades de la carpeta (Windows). Ponlo con la fecha: dentro de un año, otra versión ocupará otra cosa.
:::

:::solucion Solución modelo
Un `README.md` que cumple:

```markdown
# Entorno del curso de IA (Python 3.12 + PyTorch 2.13 cu126)

Entorno reproducible **sin conexión** para una GTX 1660 Ti (Turing, 7.5) con un controlador de CUDA 12.8.
Variante `cu126` porque el controlador no admite CUDA 13. Python 3.12 porque todo el ecosistema tiene ruedas para él.

## Consumo medido (27/10/2026)
Carpeta de ruedas: 3,4 GB (`du -sh ~/ruedas/py312`). Instalado: 6,8 GB.

## Instalar con conexión
pip download -d ~/ruedas/py312 --index-url https://download.pytorch.org/whl/cu126 \
    --extra-index-url https://pypi.org/simple -r requirements.in

## Instalar sin conexión
RUEDAS=~/ruedas/py312 ./reconstruir.sh

## Verificación en mi máquina
(salida completa de verificar_entorno.py)

## Qué funciona sin VPN desde mi conexión (octubre de 2026)
GitHub (clonar y subir): sí. Hugging Face (descargar modelos): sí. PyPI: no. Kaggle y Colab: no.
```
(Los números de este ejemplo son ilustrativos: pon los tuyos.)

**Idea reutilizable:** un repositorio de portafolio se juzga por si otra persona puede reproducirlo. Este es el primero; todos los demás seguirán el mismo patrón.
:::
