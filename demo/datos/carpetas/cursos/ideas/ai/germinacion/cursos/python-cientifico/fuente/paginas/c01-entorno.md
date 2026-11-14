---
titulo: Un entorno que funcione desde Cuba
num: 01
resumen: PyTorch con CUDA en tu GPU, descargado una sola vez y reinstalable sin conexión. Elegir la variante correcta, verificar que la GPU calcula de verdad y saber cuántos gigabytes cuesta antes de pagarlos.
horas: ≈ 3 h (más la descarga)
metas: ≈ 3 h de estudio | 2 motores interactivos | la prueba de fuego: reinstalar sin red
objetivos: Instalar PyTorch con CUDA y verificar torch.cuda.is_available() | Guardar las dependencias para reinstalar sin conexión | Estimar el consumo de datos de la instalación
---

> **Objetivos.** Al terminar serás capaz de:
>
> 1. **Crear** un entorno virtual aislado y **explicar** qué contiene.
> 2. **Elegir** la variante de PyTorch (`cu126` o `cu130`) que corresponde a tu GPU y a tu controlador, **instalarla** y **verificar** que `torch.cuda.is_available()` devuelve `True` y que la GPU calcula de verdad.
> 3. **Guardar** las dependencias en una carpeta local de ruedas y **reinstalar** el entorno entero sin conexión.
> 4. **Fijar** las versiones exactas para que el entorno sea reproducible.
> 5. **Estimar** cuántos gigabytes cuesta la instalación antes de descargarla y **decidir** qué bajar este mes.
> 6. **Publicar** el primer repositorio del portafolio en GitHub.

> **Prerrequisitos.** Python general, moverte por carpetas en la terminal y Git básico. Nada más: es la primera conferencia. Si te falta soltura con la terminal, los episodios 1-3 de «La Terminal de Unix» de Software Carpentry (en español, enlace al final) bastan.

> **Por qué va primero.** Casi todo lo que descargarás en este curso (PyTorch, modelos de Hugging Face, conjuntos de datos) cuesta gigabytes, y tu conexión es el recurso escaso. Si montas el entorno con prisa en la semana 5, en mitad de un proyecto, lo harás mal y lo pagarás dos veces.

## 1. El problema real

Tu situación, según el diagnóstico:

- **Funcionan sin VPN:** GitHub (clonar y subir) y Hugging Face (descargar modelos).
- **Solo con VPN:** Kaggle, Colab y, probablemente, PyPI, el repositorio del que `pip` baja los paquetes.
- **Equipo:** una GPU NVIDIA con 6 GB de VRAM o menos. **Datos:** de 10 a 50 GB al mes.

Esto convierte la instalación en un problema de ingeniería con restricciones. Un tutorial dice «ejecuta `pip install torch`». Para ti esa línea puede no conectar (PyPI sin VPN), y si conecta por VPN baja unos 3 GB por un canal lento y caro; si mañana rompes el entorno, te obliga a bajarlos otra vez. El objetivo de hoy es que **pagues esa descarga una sola vez**, que quede guardada en tu disco de forma que reconstruyas el entorno sin red en cinco minutos, y que sepas comprobar que la GPU funciona.

> **Problema para pensar (5 minutos).** Ya instalaste PyTorch por VPN y funciona. Mañana un compañero con tu misma máquina quiere el mismo entorno, y tú quieres poder reinstalarlo si formateas el disco. Ninguno de los dos tendrá VPN. ¿Qué guardarías hoy y cómo lo usarías mañana? Escribe tu plan en tres líneas antes de abrir la respuesta.

:::solucion Lo que hace falta (y por qué la idea ingenua falla)
La idea ingenua es copiar la carpeta del entorno (`.venv/`) a un USB. Funciona a veces, pero es frágil: un entorno virtual guarda **rutas absolutas** (en los guiones de `bin/` y en `pyvenv.cfg`) y depende del intérprete exacto con el que se creó. Lo robusto es guardar dos cosas: los **archivos de instalación** (las ruedas `.whl`) de cada paquete, en una carpeta, y la **lista exacta de versiones** (`requirements.txt` con `==`). Mañana se crea un entorno nuevo y se instala desde la carpeta, sin red. Es lo que construimos en la sección 5.
:::

## 2. Vocabulario mínimo

> **Definición 1 (rueda).** Un paquete de Python se distribuye como una **rueda** (*wheel*, `.whl`: un zip ya compilado, listo para copiar) o como una **distribución de código fuente** (*sdist*, `.tar.gz`: hay que construirla en tu máquina, a veces compilando C o C++). El nombre de una rueda dice para qué sirve: `numpy-2.3.4-cp312-cp312-manylinux_2_28_x86_64.whl` es NumPy 2.3.4 para CPython 3.12 en Linux de 64 bits. **Una rueda para Python 3.12 no sirve para Python 3.13.**

> **Definición 2 (entorno virtual).** Una carpeta con su propio intérprete de Python (un enlace al del sistema) y su propia carpeta `site-packages`. Al *activarlo*, `python` y `pip` apuntan a esa carpeta: cada proyecto tiene sus versiones sin interferir con los demás ni con el sistema.

> **Definición 3 (índice de paquetes).** Un servidor que lista distribuciones. PyPI (`pypi.org`) es el oficial; PyTorch mantiene el suyo (`download.pytorch.org/whl/...`) para sus variantes con CUDA. `pip` acepta otros índices con `--index-url` y carpetas locales con `--find-links`.

> **Definición 4 (controlador, CUDA y capacidad de cómputo).** El **controlador** (*driver*) de NVIDIA se instala en el sistema operativo y fija la versión **máxima** de CUDA que la GPU puede ejecutar. Las **bibliotecas de CUDA** (cuBLAS, cuDNN…) son las que usa PyTorch. La **capacidad de cómputo** de la GPU es un número como 6.1 (Pascal: GTX 1060), 7.5 (Turing: GTX 1660, RTX 2060), 8.6 (Ampere: RTX 3050/3060) u 8.9 (Ada: RTX 4050/4060); cada compilación de PyTorch trae código solo para una lista de capacidades.

La consecuencia más útil: **no necesitas instalar el «CUDA Toolkit» de NVIDIA.** Las ruedas de PyTorch traen sus bibliotecas de CUDA como paquetes de `pip` (`nvidia-cublas-…`, `nvidia-cudnn-…`). Lo único que pones tú en el sistema es el controlador. El *Toolkit* (compilador `nvcc`) solo hace falta para **compilar** extensiones de CUDA, y te ahorra 3-4 GB no bajarlo.

## 3. Python y el entorno virtual

Usa una versión de Python para la que existan ruedas de todo lo que necesitas. En octubre de 2026, PyTorch 2.13 (julio de 2026) publica ruedas para Python 3.10 a 3.14 y pandas 3.0 exige Python ≥ 3.11; algunas bibliotecas tardan meses en publicar ruedas para la última versión. **Recomendación: Python 3.12 o 3.13.** Si tu sistema trae otra (las distribuciones al día ya traen 3.14), no la cambies: instala otra al lado. `uv python install 3.12` (de Astral) descarga un Python ya compilado desde GitHub, que te funciona sin VPN.

> **Observación 1 (lo que no he podido verificar).** No he podido comprobar desde Cuba qué servidores responden con tu conexión. Todo lo que dependa de eso aparece como «pruébalo», con el comando exacto. Dedica 10 minutos esta semana y apunta el resultado en el `README` de tu repositorio.

```bash
# Linux / macOS
python3.12 -m venv .venv          # crea .venv con su propio python y pip
source .venv/bin/activate         # a partir de aquí, `python` es el del entorno
python -c "import sys; print(sys.prefix)"   # debe imprimir la ruta a .venv

# Windows (PowerShell)
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
```

Tres reglas que ahorran días: **un entorno por proyecto**, dentro del proyecto y fuera de Git; **nunca `sudo pip`** ni instalar en el Python del sistema (las distribuciones recientes lo bloquean con `externally-managed-environment`); y **comprueba qué `python` usas** (`which python`). La mitad de los «no me encuentra el módulo» son un entorno sin activar.

> **¿Y conda?** `conda`/`mamba` con `conda-forge` es una alternativa sólida, pero añade otra fuente de paquetes que también tendrías que poder descargar, y PyTorch dejó de publicar en su canal de conda a partir de la 2.6 (enero de 2025). Para este curso, `venv` + `pip` (o `uv`) es más simple y basta.

:::predice Activaste `.venv`, instalaste `torch` y funcionó. Abres otra terminal y `python -c "import torch"` da `ModuleNotFoundError`. ¿Por qué?
- [ ] La instalación se corrompió al cerrar la terminal.
- [x] La activación solo vale en la terminal donde se hizo; la nueva usa el Python del sistema.
- [ ] Hay que reinstalar `torch` en cada sesión.
---
Activa otra vez el entorno o llama al intérprete por su ruta (`.venv/bin/python`). VS Code y Jupyter tienen su propio selector de intérprete: elige el de `.venv`.
:::

## 4. PyTorch con CUDA: elegir la variante

PyTorch publica varias compilaciones de la misma versión, una por versión de CUDA. Para la 2.13:

| Variante | CUDA | Capacidades de cómputo | Controlador |
|---|---|---|---|
| `cu126` | 12.6 | incluye Pascal (6.x), Volta, Turing, Ampere, Ada, Hopper | cualquiera de CUDA 12 (serie 525 o posterior) |
| `cu130` | 13.0 | **desde Turing (7.5)** | serie 580 o posterior |
| `cu132` | 13.2 | como `cu130` | experimental |
| `cpu` | — | — | — |

Desde PyTorch 2.11, `pip install torch` **desde PyPI** instala en Linux la variante de CUDA 13.0 (y en Windows, la de CPU). De la tabla sale la regla de decisión:

> **Regla.** Dos números deciden: la capacidad de cómputo de la GPU y la versión de CUDA que admite el controlador (`nvidia-smi`). Si la GPU es **Pascal** (GTX 10xx), **`cu126`**: las variantes de CUDA 13 no traen código para ella. Si es Turing o posterior y el controlador dice «CUDA Version: 13.0» o más, **`cu130`**. Si es Turing o posterior pero el controlador solo llega a 12.x, **`cu126`** (o actualiza el controlador).

> **Observación 2 (fecha de caducidad).** PyTorch anunció que la 2.14 será la última versión con ruedas de CUDA 12: desde la 2.15 no habrá `cu126`. Si tu GPU es Pascal, **fija PyTorch 2.13 o 2.14 y guarda sus ruedas**: te servirán todo el curso.

Para diagnosticar tu máquina, sin descargar nada:

```bash
nvidia-smi --query-gpu=name,compute_cap,memory.total,driver_version --format=csv
nvidia-smi        # la cabecera dice «CUDA Version: X.Y»: la MÁXIMA que admite el controlador
```

Si `nvidia-smi` no existe o falla, el controlador no está instalado o no cargó: arregla eso primero. Prueba el motor con tu GPU real y con la de un compañero:

:::widget variante Qué variante de PyTorch te toca
Las cinco capas del entorno: las dos del medio llegan con pip dentro del entorno virtual; el controlador va en el sistema operativo, una sola vez. Ninguna capa puede ser más moderna de lo que admite la de debajo.
:::

:::error «Si `torch.cuda.is_available()` da `True`, la GPU funciona»
**Por qué es tentador:** es la comprobación que aparece en todos los tutoriales. **Por qué es falso:** `is_available()` solo comprueba que hay un controlador y una GPU visibles, no que la rueda tenga código para esa GPU. Con una GTX 1060 (Pascal, 6.1) y la rueda de CUDA 13 de PyPI, `is_available()` da `True` y la primera multiplicación falla con `no kernel image is available for execution on the device`. **Lo correcto:** ejecutar una operación real en la GPU y consultar `torch.cuda.get_arch_list()` (sección 6).
:::

## 5. Descargar una vez, instalar siempre

`pip` separa **descargar** de **instalar**:

- `pip download -d carpeta paquetes…` baja las ruedas del paquete **y de todas sus dependencias**, sin instalar.
- `pip install --no-index --find-links carpeta paquetes…` instala **sin red**, buscando solo en esa carpeta. Si falta algo, falla de inmediato: mejor hoy que dentro de tres meses.

**Paso 1. Los requisitos de alto nivel** en `requirements.in` (solo lo que importas directamente):

```text
torch==2.13.0
numpy
pandas
matplotlib
seaborn
scikit-learn
jupyterlab
ipykernel
pytest
openpyxl        # para leer Excel con pandas
pyarrow         # Parquet y texto rápido en pandas 3
setuptools      # para instalar tus paquetes sin red (conferencia 8)
```

Se fija `torch` porque es el pesado y porque la variante de CUDA va ligada a la versión.

**Paso 2. Descargar** (cambia `cu126` por la variante que te dio la sección 4), con el Python 3.12 del entorno activado, porque las ruedas se descargan para el Python y el sistema desde los que ejecutas la orden:

```bash
mkdir -p ~/ruedas/py312
pip download -d ~/ruedas/py312 \
    --index-url https://download.pytorch.org/whl/cu126 \
    --extra-index-url https://pypi.org/simple \
    -r requirements.in
```

**Paso 3. Instalar desde la carpeta**, aunque tengas red, para probar que está completa:

```bash
pip install --no-index --find-links ~/ruedas/py312 -r requirements.in
```

**Paso 4. Congelar** las versiones exactas: `pip freeze > requirements.txt`. Ahora `requirements.txt` tiene **todas** las dependencias, también las indirectas, con `==`. `requirements.in` dice lo que quieres; `requirements.txt`, exactamente lo que tienes. El segundo es el que va a GitHub.

**Paso 5. Copia de seguridad** de la carpeta `ruedas/`: un disco externo y, si puedes, una copia fuera de tu máquina. Como Hugging Face te funciona sin VPN, una opción práctica es un **repositorio privado de Hugging Face** (tipo *dataset*) al que subes la carpeta desde una conexión con VPN y del que la bajas después sin ella. Mantén esas copias privadas: las bibliotecas de NVIDIA tienen su propia licencia, que limita la redistribución pública.

> **¿Y un espejo de PyPI?** No he podido verificar ninguno accesible desde Cuba. Si te dan una dirección, pruébala sin instalar nada: `pip download --no-deps -d /tmp/prueba --index-url https://ESPEJO/simple numpy`. Si baja una rueda, funciona; guárdalo en `~/.config/pip/pip.conf` (`[global]` y `index-url = …`). Ojo: un espejo de PyPI casi nunca replica el índice de PyTorch: las ruedas con CUDA tendrás que bajarlas igual.

:::solucion Antes de seguir: el paso 3 responde `Could not find a version that satisfies the requirement pyarrow`. ¿Qué significa?
Que en la carpeta no hay una rueda de `pyarrow` compatible con **ese** Python y **ese** sistema: la descarga se cortó, o descargaste con otro Python (3.13) e instalas con 3.12. Con red, `pip download -d ~/ruedas/py312 pyarrow` con el mismo Python baja solo lo que falta. Por eso se instala de prueba el mismo día de la descarga.
:::

## 6. Verificar que la GPU calcula de verdad

Una verificación seria comprueba cuatro cosas: que `torch` es la variante con CUDA (`torch.version.cuda` no es `None`); que ve la GPU; que la rueda trae código para tu capacidad (`get_arch_list()` contiene `sm_XY`); y que **una operación real** en la GPU da lo mismo que en la CPU.

```python
import torch

print("torch", torch.__version__, "| CUDA de la rueda:", torch.version.cuda)
print("¿GPU disponible?", torch.cuda.is_available())
if torch.cuda.is_available():
    mayor, menor = torch.cuda.get_device_capability(0)
    libre, total = torch.cuda.mem_get_info()                  # bytes
    print(f"{torch.cuda.get_device_name(0)} | capacidad {mayor}.{menor} | "
          f"libre {libre / 2**30:.2f} de {total / 2**30:.2f} GiB")
    print("arquitecturas de la rueda:", torch.cuda.get_arch_list())
    a, b = torch.randn(2048, 2048), torch.randn(2048, 2048)
    en_gpu = (a.to("cuda") @ b.to("cuda")).cpu()
    print("¿coinciden CPU y GPU?", torch.allclose(a @ b, en_gpu, rtol=1e-3, atol=1e-3))
```

Cuatro detalles: `torch.version.cuda` es la versión **con la que se compiló la rueda** (si es `None`, instalaste la de CPU); `mem_get_info()` da bytes, y dividir entre $2^{30}$ da GiB (tus «6 GB» son 6 GiB, de los que el escritorio usa unos cientos de MiB); se compara con `allclose` porque la GPU suma en otro orden y puede usar TF32, así que los últimos dígitos difieren (lo verás en la [conferencia 3](c03-vectores.md)); y la primera operación tarda segundos (inicializa CUDA): no midas tiempos con ella. En la [práctica 1](p01-entorno.md) lo convertirás en `verificar_entorno.py`.

## 7. Estimar el consumo antes de descargar

| Componente | Descarga aproximada | Comentario |
|---|---|---|
| `torch` 2.13 (variante CUDA), solo la rueda | 0,8-1 GB | desde la 2.13, CUDA va en ruedas aparte |
| bibliotecas de NVIDIA (`nvidia-*`) | 1,5-2,5 GB | cuDNN y cuBLAS son las grandes |
| `triton` | 0,15-0,2 GB | lo usa `torch.compile` |
| pila científica (numpy, pandas, matplotlib, scikit-learn, pyarrow, jupyterlab…) | 0,2-0,3 GB | |
| **Total del entorno del curso** | **≈ 3-4 GB, una vez** | instalado ocupa ≈ 6-8 GB de disco |

Son órdenes de magnitud con margen: los tamaños cambian con cada versión. El método para medir tú: el índice muestra el tamaño de cada archivo (`https://download.pytorch.org/whl/torch/`); `pip download` imprime `Downloading torch-…whl (… MB)` antes de bajarlo (puedes cortar con Ctrl+C); y `du -sh ~/ruedas/py312` da el total real, que apuntarás en tu `README`.

:::widget presupuesto Tu mes de datos
Activa «me equivoqué de variante» y «rompí el entorno y no guardé las ruedas»: es lo que cuesta no hacer este procedimiento.
:::

> **Observación 3 (la caché de pip).** `pip` guarda lo que descarga en `~/.cache/pip` y, con red, a veces no vuelve a descargar. Pero la caché no está pensada para instalar sin red ni para copiarla a otra máquina: para eso está la carpeta de ruedas.

:::solucion Antes de seguir: ¿`cu130` y `cu126` comparten las bibliotecas de NVIDIA? ¿Qué implica para tu presupuesto?
No: `cu126` depende de paquetes `nvidia-*-cu12` y `cu130`, de paquetes de CUDA 13. Cambiar de variante es volver a bajar casi todo, unos 3 GB. Por eso se decide la variante **antes** de descargar.
:::

## 8. Jupyter, VS Code y Git

**JupyterLab** es ideal para **explorar**; **VS Code** abre cuadernos y archivos `.py` y depura los dos. Para que un cuaderno use el Python del entorno, regístralo una vez como núcleo: `python -m ipykernel install --user --name curso-ai --display-name "Python (curso AI)"`. En la [conferencia 8](c08-proyecto.md) verás por qué el código que importa no se queda en cuadernos.

**GitHub te funciona sin VPN: es tu escaparate para el empleo remoto.** Cada práctica va a un repositorio público:

```bash
git init curso-ai-python && cd curso-ai-python
printf ".venv/\n__pycache__/\n.ipynb_checkpoints/\ndata/raw/\n*.whl\n" > .gitignore
git add .gitignore && git commit -m "Estructura inicial"
git remote add origin git@github.com:TU_USUARIO/curso-ai-python.git
git push -u origin main
```

Nunca van a Git el entorno virtual, las ruedas, los datos grandes ni las claves. Siempre van el código, `requirements.in`, `requirements.txt` y el `README` con las instrucciones para reproducir.

## 9. Ejemplo integrador resuelto

> **Ejemplo 1 (del cero al entorno verificado).** Linux, RTX 3050 de 6 GB (8.6), controlador con «CUDA Version: 13.0» y VPN solo esta tarde.
>
> 1. **Diagnóstico (sin red):** capacidad 8.6 y CUDA 13.0 → `cu130`.
> 2. **Python 3.12** con `uv python install 3.12` (desde GitHub, sin VPN) o el del sistema.
> 3. **Entorno:** `python3.12 -m venv .venv && source .venv/bin/activate` y `python -m pip install --upgrade pip`.
> 4. **Con VPN, descarga** con `--index-url https://download.pytorch.org/whl/cu130`; apunta los tamaños que imprime.
> 5. **Todavía con VPN, instala desde la carpeta.** Si falta algo, bájalo ahora.
> 6. **Verifica:** `CUDA de la rueda: 13.0`, `True`, `sm_86` en la lista y `¿coinciden CPU y GPU? True`.
> 7. **Congela** (`pip freeze > requirements.txt`) y **mide** (`du -sh ~/ruedas/py312`).
> 8. **Prueba de fuego, sin VPN:** borra `.venv`, créalo de nuevo e instala desde `ruedas/`. Si la verificación vuelve a pasar, tu entorno es reproducible sin red.
> 9. **Publica** el `README` con la variante, la versión de Python, el tamaño medido y los dos comandos de instalación.
>
> El paso 8 es el que casi nadie hace y el que demuestra que lo conseguiste.

:::autoexplica ¿Por qué el paso 5 (instalar desde la carpeta) se hace **con** VPN, si el objetivo es poder instalar sin ella?
---
Porque instalar con `--no-index` es la única forma de comprobar que la carpeta está **completa**: `pip` solo mira en ella, así que cualquier rueda que falte (una dependencia indirecta, una descarga cortada, una rueda para otro Python) da error en ese momento. Si el error aparece mientras todavía hay VPN, se arregla con un `pip download` de segundos. Si aparece dentro de tres meses sin VPN, el entorno no se puede reconstruir.
:::

## 10. Errores típicos

| Síntoma | Causa probable | Arreglo |
|---|---|---|
| `torch.version.cuda` es `None` | variante de CPU (p. ej., `pip install torch` en Windows) | reinstala con `--index-url …/cu126` o `…/cu130` |
| `is_available()` es `False` | controlador ausente o antiguo | `nvidia-smi`; compara con la variante |
| `no kernel image is available` | la rueda no trae código para tu capacidad (Pascal con `cu130`) | `get_arch_list()`; `cu126` |
| `ModuleNotFoundError` con el paquete instalado | otro intérprete o núcleo de Jupyter | `import sys; print(sys.executable)` |
| `--no-index` no encuentra un paquete | descarga con otro Python, o incompleta | descarga con el mismo Python |
| `externally-managed-environment` | instalas en el Python del sistema | entorno virtual |
| CPU y GPU no coinciden con `==` | normal: otro orden de suma y TF32 | `allclose` con tolerancia |

:::llevas Ideas que te llevas
- **Separa descargar de instalar:** `pip download` una vez; `pip install --no-index --find-links` siempre.
- **`requirements.in` dice lo que quieres; `requirements.txt`, lo que tienes**, con `==`.
- **La variante se decide por dos números:** capacidad de cómputo y CUDA del controlador. Pascal → `cu126`.
- **Verificar es ejecutar,** no preguntar: una operación real en la GPU comparada con la CPU.
- **Estima antes de descargar y mide después.** La prueba de fuego: borrar y reconstruir sin red.
:::

## 11. Preguntas de recuperación

1. ¿Qué diferencia hay entre una rueda y una distribución de código fuente? ¿Por qué te conviene tener solo ruedas?
2. Escribe de memoria las dos órdenes de `pip` que permiten instalar sin conexión.
3. ¿Qué te dice la línea «CUDA Version» de `nvidia-smi`? ¿Qué no te dice?
4. Una GPU con capacidad 6.1 y otra con 8.9: ¿qué variante de PyTorch 2.13 eliges para cada una?
5. ¿Cuántos GB cuesta descargar el entorno del curso, en orden de magnitud? ¿Cómo lo mides con exactitud?

:::solucion Respuestas
1. La rueda está compilada y se instala copiando; la de código fuente hay que construirla, a veces compilando C/C++ con herramientas que quizá no tienes. Con ruedas la instalación sin red es predecible.
2. `pip download -d ruedas/ -r requirements.in` (con red) y `pip install --no-index --find-links ruedas/ -r requirements.txt` (sin red).
3. La versión **máxima** de CUDA que admite el controlador. No dice qué CUDA usa tu entorno (eso es `torch.version.cuda`) ni si la rueda tiene código para tu GPU.
4. 6.1 (Pascal): `cu126`. 8.9 (Ada): `cu130` si el controlador admite CUDA 13; si no, `cu126`.
5. Unos 3-4 GB de descarga. Con los tamaños que imprime `pip download` y con `du -sh` sobre la carpeta de ruedas.
:::

## 12. Lecturas

- **PyTorch, «Get Started Locally»** (`https://pytorch.org/get-started/locally/`), en inglés: el selector oficial de la orden de instalación. Compruébalo cuando leas esto: las versiones avanzan.
- **PyTorch 2.13 Release Blog** (`https://pytorch.org/blog/pytorch-2-13-release-blog/`), en inglés: variantes de CUDA y versiones de Python de la versión que usamos.
- **Software Carpentry, «La Terminal de Unix»** (`https://swcarpentry.github.io/shell-novice-es/`), en español, CC BY 4.0: episodios 1-3.
- **Software Carpentry, «Control de versiones con Git»** (`https://swcarpentry.github.io/git-novice-es/`), en español, CC BY 4.0: episodios 1-7.
