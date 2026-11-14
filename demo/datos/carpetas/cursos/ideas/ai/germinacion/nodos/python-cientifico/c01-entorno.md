# Conferencia 1. Un entorno que funcione desde Cuba

> **Objetivos.** Al terminar esta conferencia serás capaz de:
>
> 1. **Crear** un entorno virtual aislado y **explicar** qué contiene y por qué no se instala nada fuera de él.
> 2. **Elegir** la variante de PyTorch (`cu126` o `cu130`) que corresponde a tu GPU y a tu controlador, **instalarla** y **verificar** que `torch.cuda.is_available()` devuelve `True` y que la GPU calcula de verdad.
> 3. **Guardar** todas las dependencias en una carpeta local de ruedas (*wheelhouse*) y **reinstalar** el entorno entero sin conexión.
> 4. **Fijar** las versiones exactas en un archivo de requisitos para que el entorno sea reproducible.
> 5. **Estimar** cuántos gigabytes cuesta la instalación antes de descargarla, y **decidir** qué bajar este mes con tu presupuesto de 10-50 GB.
> 6. **Publicar** el primer repositorio del portafolio en GitHub.

> **Prerrequisitos.** Python general (funciones, módulos, `import`), usar la terminal para moverte por carpetas y ejecutar programas, y Git básico, que ya usaste. No hace falta nada de este curso: es la primera conferencia.

> **Una nota sobre el orden.** El plan coloca el entorno antes que NumPy, y lo mantengo así. No es por tradición: casi todo el contenido del curso que se descarga (PyTorch, modelos de Hugging Face, conjuntos de datos) cuesta gigabytes, y tu conexión es el recurso escaso. Si montas el entorno con prisa en la semana 5, en mitad de un proyecto, lo harás mal y lo pagarás dos veces.

---

## 1. Motivación: el problema real

Tu situación, según el diagnóstico:

- **Funcionan sin VPN:** GitHub (clonar y subir) y Hugging Face (descargar modelos).
- **Solo con VPN:** Kaggle, Colab y, probablemente, PyPI, el repositorio del que `pip` baja los paquetes.
- **Equipo:** una GPU NVIDIA con 6 GB de VRAM o menos.
- **Datos:** entre 10 y 50 GB al mes.

Esto convierte la instalación de un entorno de aprendizaje profundo en un problema de ingeniería con restricciones, no en un trámite. Un tutorial cualquiera dice «ejecuta `pip install torch`». Para ti, esa línea:

1. puede no conectar (PyPI sin VPN);
2. si conecta por VPN, baja unos 3 GB por un canal lento y caro;
3. y si un día rompes el entorno, te obliga a bajarlos otra vez.

El objetivo de hoy es que **pagues esa descarga una sola vez**, que quede guardada en tu disco de forma que puedas reconstruir el entorno sin red en cinco minutos, y que sepas comprobar que la GPU funciona de verdad.

> **Problema para pensar antes de seguir (5 minutos).** Supón que ya instalaste PyTorch por VPN en un entorno y funciona. Mañana un compañero con tu misma máquina quiere el mismo entorno, y tú quieres poder reinstalarlo si formateas el disco. Ninguno de los dos tiene VPN mañana. Con lo que ya sabes de Python y `pip`, ¿qué guardarías hoy y cómo lo usarías mañana? Escribe tu plan en tres líneas antes de abrir la respuesta.

:::solucion Lo que hace falta (y por qué la idea ingenua falla)
La idea ingenua es copiar la carpeta del entorno virtual (`.venv/`) a un USB. Funciona a veces, pero es frágil: un entorno virtual guarda rutas absolutas (por ejemplo, en los guiones de `bin/` y en `pyvenv.cfg`) y depende del intérprete de Python exacto con el que se creó. Si la ruta o la versión de Python cambian, se rompe.

Lo robusto es guardar **dos cosas**:

1. **los archivos de instalación** (las *ruedas* `.whl`) de cada paquete, en una carpeta;
2. **la lista exacta de versiones** (`requirements.txt` con `==`).

Mañana se crea un entorno nuevo y se instala desde la carpeta, sin red: `pip install --no-index --find-links carpeta -r requirements.txt`. Es exactamente lo que construimos en la sección 5.
:::

---

## 2. Vocabulario mínimo

Antes de tocar nada, fijemos los términos (los usaremos todo el curso).

> **Definición 1 (paquete, distribución y rueda).** Un *paquete* de Python es código importable (`import numpy`). Se distribuye como un archivo descargable, la *distribución*. Hay dos tipos:
> - la **rueda** (*wheel*, extensión `.whl`): un archivo zip ya compilado, listo para copiar en tu entorno;
> - la **distribución de código fuente** (*sdist*, `.tar.gz`): hay que construirla en tu máquina, a veces compilando C o C++.
>
> El nombre de una rueda codifica para qué sirve: `numpy-2.3.4-cp312-cp312-manylinux_2_28_x86_64.whl` es NumPy 2.3.4 para CPython 3.12 en Linux de 64 bits. **Una rueda para Python 3.12 no sirve para Python 3.13.**

> **Definición 2 (entorno virtual).** Un *entorno virtual* es una carpeta con su propio intérprete de Python (un enlace al del sistema) y su propia carpeta `site-packages`, donde se instalan los paquetes. Al *activarlo*, `python` y `pip` apuntan a esa carpeta. Así cada proyecto tiene sus versiones sin interferir con los demás ni con el sistema.

> **Definición 3 (índice de paquetes).** Un *índice* es un servidor que lista distribuciones: PyPI (`pypi.org`) es el oficial; PyTorch mantiene el suyo (`download.pytorch.org/whl/...`) para sus variantes con CUDA. `pip` acepta otros índices con `--index-url` o carpetas locales con `--find-links`.

> **Definición 4 (CUDA, controlador y capacidad de cómputo).** *CUDA* es la plataforma de NVIDIA para programar sus GPU. En tu máquina intervienen:
> - el **controlador** (*driver*) de NVIDIA, que se instala en el sistema operativo y fija la versión **máxima** de CUDA que la GPU puede ejecutar;
> - las **bibliotecas de CUDA** (cuBLAS, cuDNN…), con las que se compiló PyTorch;
> - la **capacidad de cómputo** (*compute capability*) de la GPU, un número como 6.1 (Pascal, p. ej. GTX 1060), 7.5 (Turing: GTX 1660, RTX 2060), 8.6 (Ampere: RTX 3050/3060) u 8.9 (Ada: RTX 4050/4060). Cada compilación de PyTorch incluye código solo para una lista de capacidades.

La figura 1 resume cómo encajan. La lección más útil: **no necesitas instalar el «CUDA Toolkit» de NVIDIA**. Las ruedas de PyTorch traen sus propias bibliotecas de CUDA como paquetes de `pip` (`nvidia-cublas-…`, `nvidia-cudnn-…`). Lo único que pones tú en el sistema es el controlador.

![Figura 1. Las capas de un entorno con GPU. Las dos del medio se instalan con pip dentro del entorno virtual; el controlador va en el sistema operativo, una sola vez.](figuras/python-cientifico/capas-entorno.png)

**Antes de seguir:** si un día ves en un foro «instala CUDA 12.6 desde la web de NVIDIA para usar PyTorch», ¿te hace falta?

:::solucion Respuesta
No, para usar PyTorch con ruedas de `pip` no hace falta: las bibliotecas de CUDA llegan dentro del entorno virtual como dependencias de `torch`. El *Toolkit* (compilador `nvcc`, cabeceras) solo lo necesitas si vas a **compilar** extensiones de CUDA tú mismo, algo que este curso no requiere. Te ahorras unos 3-4 GB de descarga.
:::

---

## 3. Python y el entorno virtual

### 3.1. ¿Qué Python?

Usa una versión de Python **para la que existan ruedas de todo lo que necesitas**. En octubre de 2026:

- PyTorch 2.13 (julio de 2026) publica ruedas para Python 3.10 a 3.14, y 3.15 en pruebas;
- pandas 3.0 exige Python ≥ 3.11;
- algunas bibliotecas del curso tardan meses en publicar ruedas para la última versión de Python.

**Recomendación: Python 3.12 o 3.13.** Es el punto dulce: lo soporta todo el ecosistema. Si tu sistema trae otra versión (las distribuciones de Linux al día, como Arch o CachyOS, ya traen 3.14), no la cambies: instala otra al lado.

Dos formas de tener Python 3.12 sin tocar el del sistema:

- **`uv`** (de Astral): `uv python install 3.12` descarga un Python ya compilado. Esos binarios se publican en GitHub, que te funciona sin VPN, y el propio `uv` se descarga desde GitHub Releases.
- **El gestor de paquetes de tu distribución** o el instalador de python.org en Windows.

> **Observación 1 (honestidad sobre lo no verificado).** No he podido comprobar desde Cuba qué servidores responden con tu conexión. Todo lo que dependa de eso aparece aquí como «pruébalo», con el comando exacto para hacerlo. Tómate 10 minutos esta semana para probarlos y apunta el resultado en el `README` de tu repositorio: te servirá a ti y a cualquier compañero.

### 3.2. Crear y activar el entorno

Con la biblioteca estándar (`venv`):

```bash
# Linux / macOS
python3.12 -m venv .venv          # crea la carpeta .venv con su propio python y pip
source .venv/bin/activate         # a partir de aquí, `python` es el del entorno
python -c "import sys; print(sys.prefix)"   # debe imprimir la ruta a .venv

# Windows (PowerShell)
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
```

Con `uv`, el equivalente es `uv venv --python 3.12`.

Tres reglas que te ahorrarán días:

1. **Un entorno por proyecto**, dentro de la carpeta del proyecto (`.venv/`), y fuera de Git (`.gitignore`).
2. **Nunca instales con `sudo pip`** ni en el Python del sistema: en Linux puedes romper herramientas del sistema operativo (por eso las distribuciones recientes lo bloquean con el error `externally-managed-environment`).
3. **Comprueba siempre qué `python` estás usando** (`which python` en Linux, `where python` en Windows). La mitad de los «no me encuentra el módulo» son un entorno sin activar.

> **¿Y conda?** `conda`/`mamba` con el canal `conda-forge` es una alternativa sólida, sobre todo si necesitas bibliotecas que no son de Python. Pero añade una segunda fuente de paquetes que también tendrías que poder descargar, y PyTorch dejó de publicar en su canal propio de conda a partir de la versión 2.6 (enero de 2025). Para este curso, `venv` + `pip` (o `uv`) es más simple y basta.

**Antes de seguir:** creaste `.venv` con Python 3.12 y lo activaste. Abres otra terminal y ejecutas `python -c "import torch"`: dice `ModuleNotFoundError`, aunque ayer lo instalaste. ¿Qué pasó?

:::solucion Respuesta
La activación vale solo para la terminal donde la hiciste. En la terminal nueva, `python` es el del sistema, que no tiene `torch`. Activa el entorno otra vez (`source .venv/bin/activate`) o llama al intérprete por su ruta (`.venv/bin/python`). VS Code y Jupyter tienen su propio selector de intérprete: elige el de `.venv`.
:::

---

## 4. PyTorch con CUDA: elegir la variante correcta

### 4.1. Las variantes de PyTorch 2.13

PyTorch publica varias compilaciones de la misma versión, una por versión de CUDA. Para la 2.13 (julio de 2026) son:

| Variante | Índice | CUDA | Capacidades de cómputo | Controlador mínimo (aprox.) |
|---|---|---|---|---|
| `cu126` | `https://download.pytorch.org/whl/cu126` | 12.6 | incluye Pascal (6.x), Volta, Turing, Ampere, Ada, Hopper | serie 525 o posterior en Linux (528 en Windows) |
| `cu130` | `https://download.pytorch.org/whl/cu130` | 13.0 | **desde Turing (7.5)** en adelante | serie 580 o posterior |
| `cu132` | `https://download.pytorch.org/whl/cu132` | 13.2 | como `cu130` | experimental |
| `cpu` | `https://download.pytorch.org/whl/cpu` | — | — | — |

Además, desde PyTorch 2.11, `pip install torch` **desde PyPI** instala en Linux la variante de CUDA 13.0.

De la tabla se deduce la regla de decisión, que depende de tu GPU concreta:

> **Regla.** Mira dos datos: el modelo de GPU (de ahí, su capacidad de cómputo) y la versión de CUDA que admite tu controlador (`nvidia-smi`).
> - Si la GPU es **Pascal** (GTX 10xx, capacidad 6.x): usa **`cu126`**. Las variantes de CUDA 13 no traen código para ella.
> - Si es **Turing o posterior** (GTX 16xx, RTX 20xx, 30xx, 40xx…) y `nvidia-smi` dice «CUDA Version: 13.0» o más: **`cu130`**.
> - Si es Turing o posterior pero tu controlador solo llega a 12.x y no puedes actualizarlo: **`cu126`**.

> **Observación 2 (fecha de caducidad).** PyTorch anunció que la 2.14 será la última versión con ruedas de CUDA 12.x: a partir de la 2.15 no habrá `cu126`. Si tu GPU es Pascal, **fija PyTorch 2.13 o 2.14 y guarda sus ruedas**. Te servirán todo el curso: las novedades de 2.15 no te hacen falta para nada de lo que harás aquí.

### 4.2. Diagnóstico de tu máquina (sin descargar nada)

```bash
nvidia-smi
```

La cabecera muestra la versión del controlador y «CUDA Version: X.Y», que es la **máxima** que admite, no una instalación de CUDA. La tabla inferior muestra la GPU, la memoria total y la usada. Para la capacidad de cómputo:

```bash
nvidia-smi --query-gpu=name,compute_cap,memory.total,driver_version --format=csv
```

Si `nvidia-smi` no existe o falla, el controlador no está instalado o no se cargó. Arregla eso primero: sin controlador, ninguna variante de PyTorch verá la GPU.

> **Ejemplo 1 (decisión resuelta).** Supón que `nvidia-smi` imprime:
>
> ```
> name, compute_cap, memory.total [MiB], driver_version
> NVIDIA GeForce GTX 1660 Ti, 7.5, 6144 MiB, 580.95.05
> ```
> y la cabecera dice «CUDA Version: 13.0».
>
> 1. **Capacidad 7.5** (Turing): las dos variantes la soportan.
> 2. **El controlador admite CUDA 13.0**: `cu130` funciona.
> 3. **Decisión:** `cu130`, que es la variante por defecto, la más probada y la que seguirá recibiendo versiones nuevas. Si el controlador dijera «CUDA Version: 12.4», la decisión sería `cu126` (o actualizar el controlador).
> 4. **Memoria:** 6144 MiB = 6 GiB. El sistema y el escritorio usan unos cientos de MiB; para tus modelos quedarán unos 5,5 GiB. Lo tendremos en cuenta en el bloque de aprendizaje profundo.

**Antes de seguir:** tu compañero tiene una GTX 1060 de 6 GB con un controlador que dice «CUDA Version: 13.0». Instala `pip install torch` desde PyPI con VPN, y `torch.cuda.is_available()` da `True`, pero al multiplicar dos tensores en la GPU obtiene un error del estilo `no kernel image is available for execution on the device`. ¿Por qué, si el controlador es moderno?

:::solucion Respuesta
Porque el problema no es el controlador sino la **capacidad de cómputo**. La GTX 1060 es Pascal (6.1) y la rueda de PyPI es la de CUDA 13.0, que no contiene código compilado para capacidades inferiores a 7.5. `is_available()` solo comprueba que hay un controlador y una GPU; no que la rueda tenga *kernels* para esa GPU. Necesita la variante `cu126`. Por eso nuestra verificación (sección 6) ejecuta una operación real en la GPU y consulta `torch.cuda.get_arch_list()`, en vez de fiarse de `is_available()`.
:::

---

## 5. Descargar una vez, instalar siempre: la carpeta de ruedas

### 5.1. La idea

`pip` tiene dos órdenes que separan **descargar** de **instalar**:

- `pip download -d carpeta paquetes…`: baja las ruedas del paquete **y de todas sus dependencias** a una carpeta, sin instalar nada.
- `pip install --no-index --find-links carpeta paquetes…`: instala **sin red**, buscando solo en esa carpeta. Si falta algo, falla de inmediato (lo cual es bueno: te enteras hoy y no en tres meses).

Con esto el procedimiento queda en dos fases:

```text
 FASE 1 (una vez, con VPN o desde otra conexión)     FASE 2 (cuando quieras, sin red)
 ┌────────────────────────────────────────┐          ┌──────────────────────────────────┐
 │ pip download → ruedas/  (≈ 3-4 GB)      │  ─────▶  │ python -m venv .venv             │
 │ requirements.txt con versiones exactas │  copia   │ pip install --no-index           │
 │ copia de seguridad: disco externo, HF  │          │     --find-links ruedas/ -r req… │
 └────────────────────────────────────────┘          └──────────────────────────────────┘
```

### 5.2. Fase 1, paso a paso

**Paso 1. Escribe tus requisitos de alto nivel** en `requirements.in` (solo lo que importas directamente):

```text
# requirements.in: lo que el curso usa en los primeros meses
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
pyarrow         # tipos de texto rápidos y Parquet en pandas 3
```

¿Por qué fijar `torch` y no lo demás? Porque `torch` es el pesado (no quieres que una versión nueva te obligue a bajar 3 GB) y porque la variante de CUDA va ligada a la versión.

**Paso 2. Descarga.** La variante de CUDA se elige con el índice. Para `cu126` (cambia a `cu130` según la sección 4):

```bash
mkdir -p ~/ruedas/py312
pip download -d ~/ruedas/py312 \
    --index-url https://download.pytorch.org/whl/cu126 \
    --extra-index-url https://pypi.org/simple \
    -r requirements.in
```

- `--index-url` apunta al índice de PyTorch, donde está `torch` con la variante elegida. Ese índice también replica varias dependencias de `torch` (las bibliotecas de NVIDIA, `filelock`, `sympy`…).
- `--extra-index-url` añade PyPI para el resto (pandas, seaborn…).
- Las ruedas se descargan **para el Python y el sistema operativo desde los que ejecutas la orden**: hazlo con el Python 3.12 del entorno activado. Si quisieras ruedas para otra plataforma, tendrías que usar `--platform`, `--python-version` y `--only-binary=:all:`; no lo necesitas.

**Paso 3. Instala desde la carpeta** (aunque tengas red), para probar que está completa:

```bash
python -m venv .venv && source .venv/bin/activate
pip install --no-index --find-links ~/ruedas/py312 -r requirements.in
```

**Paso 4. Congela las versiones exactas** que se instalaron:

```bash
pip freeze > requirements.txt
```

`requirements.txt` tiene ahora **todas** las dependencias, también las indirectas, con `==`: `numpy==2.3.4`, `nvidia-cudnn-cu12==9.10.2.21`, etc. Es el archivo que subes a GitHub. `requirements.in` dice lo que quieres; `requirements.txt`, exactamente lo que tienes.

**Paso 5. Copia de seguridad de la carpeta `ruedas/`.** Un disco externo, y si puedes, una copia fuera de tu máquina. Como Hugging Face te funciona sin VPN, una opción práctica es subir la carpeta a un **repositorio privado de Hugging Face** (tipo *dataset*) desde una conexión con VPN o desde la de un amigo, y bajarla después sin VPN con `huggingface-cli download`. GitHub también sirve para archivos sueltos (los *releases* admiten archivos de hasta 2 GB), pero no para carpetas de varios GB.

> **Observación 3 (licencias).** PyTorch tiene licencia BSD y las bibliotecas de NVIDIA, la licencia de NVIDIA, que permite redistribuirlas con limitaciones. Para no meterte en líos, mantén esas copias **privadas y para tu uso** (o el de tu grupo), no como un espejo público.

### 5.3. ¿Y si PyPI responde sin VPN o hay un espejo?

Lo dijo el plan y lo repito: **no he podido verificar ningún espejo de PyPI accesible desde Cuba**. Si alguien te da una dirección (de tu universidad, de una comunidad), pruébala así, sin instalar nada:

```bash
pip download --no-deps -d /tmp/prueba --index-url https://ESPEJO/simple numpy
```

Si baja una rueda `numpy-…whl`, el espejo funciona. Para usarlo siempre, guárdalo en la configuración de `pip` (`~/.config/pip/pip.conf` en Linux, `%APPDATA%\pip\pip.ini` en Windows):

```ini
[global]
index-url = https://ESPEJO/simple
```

Un espejo que sirva PyPI casi nunca replica el índice de PyTorch. **Las ruedas de `torch` con CUDA tendrás que bajarlas igual de `download.pytorch.org`** (o de tu copia).

**Antes de seguir:** ejecutas el paso 3 y `pip` responde `ERROR: Could not find a version that satisfies the requirement pyarrow`. ¿Qué significa y cómo lo arreglas sin descargar todo de nuevo?

:::solucion Respuesta
Que en la carpeta no hay una rueda de `pyarrow` compatible con ese Python y ese sistema. Pasa si la descarga se interrumpió o si descargaste con un Python distinto del que instala (por ejemplo, descargaste con 3.13 e instalas con 3.12). Solución: con red, `pip download -d ~/ruedas/py312 pyarrow` usando el **mismo** Python; `pip` solo baja lo que falta. Por eso la instalación de prueba se hace el mismo día de la descarga.
:::

---

## 6. Verificar que la GPU funciona de verdad

`torch.cuda.is_available()` es necesario pero no suficiente (lo viste en la pregunta de la sección 4). Una verificación seria comprueba **cuatro cosas**:

1. que `torch` es la variante con CUDA (`torch.version.cuda` no es `None`);
2. que ve la GPU (`is_available()`, nombre, capacidad, memoria);
3. que la rueda trae código para tu capacidad (`torch.cuda.get_arch_list()` contiene `sm_XY`);
4. que **una operación real** en la GPU da el mismo resultado que en la CPU.

```python
import torch

print("torch", torch.__version__, "| CUDA de la rueda:", torch.version.cuda)
print("¿GPU disponible?", torch.cuda.is_available())

if torch.cuda.is_available():
    dispositivo = torch.device("cuda")
    nombre = torch.cuda.get_device_name(0)
    mayor, menor = torch.cuda.get_device_capability(0)
    libre, total = torch.cuda.mem_get_info()           # bytes
    print(f"{nombre} | capacidad {mayor}.{menor} | libre {libre/2**30:.2f} de {total/2**30:.2f} GiB")
    print("arquitecturas compiladas en la rueda:", torch.cuda.get_arch_list())

    # La prueba de verdad: una operación en GPU contra la misma en CPU
    a = torch.randn(2048, 2048)
    b = torch.randn(2048, 2048)
    en_cpu = a @ b
    en_gpu = (a.to(dispositivo) @ b.to(dispositivo)).cpu()
    print("¿coinciden CPU y GPU?", torch.allclose(en_cpu, en_gpu, rtol=1e-3, atol=1e-3))
```

Cuatro detalles que conviene entender:

- `torch.version.cuda` es la versión de CUDA **con la que se compiló la rueda** (12.6 o 13.0). Si imprime `None`, instalaste la variante de CPU.
- `mem_get_info()` devuelve la memoria **libre** y la **total** en bytes. Dividir entre $2^{30}$ da GiB; los «6 GB» del fabricante son 6 GiB.
- Comparamos con `allclose` y una tolerancia, no con `==`, porque la GPU suma en otro orden y puede usar la precisión TF32 (en Ampere y posteriores), así que los últimos dígitos difieren. En la conferencia 3 veremos por qué el orden de la suma cambia el resultado en coma flotante.
- La primera operación en la GPU tarda (inicializa el contexto de CUDA, unos segundos). No midas tiempos con ella.

En la clase práctica 1 convertirás esto en `verificar_entorno.py`, con la regresión lineal de juguete en la GPU que pide el plan.

---

## 7. Estimar el consumo de datos antes de descargar

Con 10-50 GB al mes, cada gigabyte se planifica. El método: **pregunta el tamaño antes de bajar**, y ten órdenes de magnitud en la cabeza.

### 7.1. Órdenes de magnitud (octubre de 2026, Linux x86-64, Python 3.12)

| Componente | Descarga aproximada | Comentario |
|---|---|---|
| `torch` 2.13 (variante CUDA), solo la rueda | 0,8-1 GB | desde la 2.13, las ruedas de Linux son «pequeñas»: CUDA va aparte |
| bibliotecas de NVIDIA (`nvidia-*`: cuBLAS, cuDNN, NCCL…) | 1,5-2,5 GB | cuDNN y cuBLAS son las grandes |
| `triton` | 0,15-0,2 GB | compilador que usa `torch.compile` |
| pila científica (numpy, pandas, matplotlib, seaborn, scikit-learn, pyarrow, jupyterlab…) | 0,2-0,3 GB | |
| **Total del entorno del curso** | **≈ 3-4 GB, una vez** | instalado ocupa más: ≈ 6-8 GB en disco |
| un modelo de lenguaje pequeño (Hugging Face) | 0,5-5 GB | lo planificarán sus asignaturas |

Son estimaciones con un margen amplio: los tamaños exactos cambian con cada versión. Por eso importa el método para medirlo tú.

### 7.2. Cómo medir antes de comprometerte

1. **Mira el tamaño en el índice.** En `https://download.pytorch.org/whl/torch/` (o la página del paquete en PyPI) cada archivo muestra su tamaño. Para `torch` basta con abrir la página y buscar tu combinación (`cp312`, `manylinux`, `cu126`).
2. **`pip download` muestra el tamaño de cada archivo** antes de bajarlo (`Downloading torch-…whl (… MB)`). Puedes interrumpirlo con Ctrl+C si se dispara.
3. **Mide lo descargado:** `du -sh ~/ruedas/py312` (Linux) da el total real, que apuntarás en tu `README`.

> **Ejemplo 2 (presupuesto resuelto).** Tienes 20 GB este mes. ¿Cuánto te queda tras montar el entorno, y qué reservas?
>
> 1. **Entorno:** el peor caso de la tabla, 4 GB. Le sumo un 25 % por descargas fallidas que se repiten: $4 \times 1{,}25 = 5$ GB.
> 2. **Datos de las prácticas de esta asignatura:** *Online Retail II* pesa unos 45 MB comprimido y los datos de Data Carpentry, 1 MB. Despreciable: 0,1 GB.
> 3. **Margen para la vida normal** (actualizaciones del sistema, documentación): pongamos 3 GB.
> 4. **Restante:** $20 - 5 - 0{,}1 - 3 \approx 12$ GB. Alcanza para dos o tres modelos pequeños el mes que los necesites. **Conclusión:** el entorno cabe este mes sin problema, siempre que se descargue **una vez**.

> **Observación 4 (la caché de pip).** `pip` guarda una copia de lo que descarga en su caché (`~/.cache/pip`). Si repites una instalación con red, a veces no vuelve a descargar. Pero la caché no está pensada para instalar sin red ni para copiarla a otra máquina: para eso está la carpeta de ruedas. `pip cache dir` te dice dónde está y `pip cache purge` la vacía si te quedas sin disco.

**Antes de seguir:** la variante `cu130` y la `cu126` de la misma versión de `torch`, ¿comparten las bibliotecas de NVIDIA? ¿Qué implica para tu presupuesto cambiar de una a otra?

:::solucion Respuesta
No: la `cu126` depende de paquetes `nvidia-*-cu12` y la `cu130`, de paquetes de CUDA 13 (otros nombres y versiones). Cambiar de variante supone volver a descargar casi todo: unos 3 GB. Por eso se decide la variante **antes** de descargar, con el diagnóstico de la sección 4.
:::

---

## 8. Herramientas de trabajo: Jupyter, VS Code y Git

### 8.1. Jupyter y VS Code

- **JupyterLab** (`jupyter lab`) es ideal para **explorar**: probar una idea, mirar un gráfico, inspeccionar datos.
- **VS Code** con las extensiones de Python y Jupyter abre cuadernos (`.ipynb`) y archivos `.py` y depura los dos.
- Para que un cuaderno use el Python de tu entorno, registra el entorno como núcleo (*kernel*) una vez:

```bash
python -m ipykernel install --user --name curso-ai --display-name "Python (curso AI)"
```

En la conferencia 8 verás por qué el código que importa **no** se queda en cuadernos. Por ahora: los cuadernos para mirar, los módulos `.py` para lo que se reutiliza.

### 8.2. Git y GitHub desde el primer día

GitHub te funciona sin VPN: es tu escaparate para el empleo remoto. Cada práctica de esta asignatura va a un repositorio público. El mínimo para empezar:

```bash
git init curso-ai-python && cd curso-ai-python
python -m venv .venv
printf ".venv/\n__pycache__/\n.ipynb_checkpoints/\ndata/raw/\n*.whl\n" > .gitignore
git add .gitignore && git commit -m "Estructura inicial"
git remote add origin git@github.com:TU_USUARIO/curso-ai-python.git
git push -u origin main
```

Lo que **nunca** va a Git:

- el entorno virtual (`.venv/`);
- las ruedas;
- los datos grandes (`data/raw/`);
- las claves o contraseñas.

Lo que **siempre** va:

- el código;
- `requirements.in` y `requirements.txt`;
- el `README` con las instrucciones para reproducir el entorno.

---

## 9. Ejemplo integrador resuelto: del cero al entorno verificado

> **Ejemplo 3.** Empiezas en un Linux con una RTX 3050 de 6 GB (capacidad 8.6), controlador con «CUDA Version: 13.0» y VPN disponible solo esta tarde. Quieres terminar con: entorno instalado y verificado, ruedas guardadas, `requirements.txt` en GitHub y el consumo medido.
>
> 1. **Diagnóstico (sin red).** `nvidia-smi --query-gpu=name,compute_cap,driver_version --format=csv` → `8.6`, CUDA 13.0 → variante `cu130` (sección 4).
> 2. **Python 3.12.** Con `uv python install 3.12` (desde GitHub, sin VPN) o el de tu sistema.
> 3. **Entorno:** `python3.12 -m venv .venv && source .venv/bin/activate`, y `python -m pip install --upgrade pip` (hay que actualizar `pip` antes de la descarga grande).
> 4. **Con VPN, descarga:** `pip download -d ~/ruedas/py312 --index-url https://download.pytorch.org/whl/cu130 --extra-index-url https://pypi.org/simple -r requirements.in`. Mientras baja, apunta los tamaños que imprime.
> 5. **Todavía con VPN, instala desde la carpeta:** `pip install --no-index --find-links ~/ruedas/py312 -r requirements.in`. Si falta algo, lo bajas ahora que hay red.
> 6. **Verifica** con el guion de la sección 6: `CUDA de la rueda: 13.0`, `True`, `sm_86` en la lista y `¿coinciden CPU y GPU? True`.
> 7. **Congela:** `pip freeze > requirements.txt`. **Mide:** `du -sh ~/ruedas/py312`.
> 8. **Prueba de fuego (sin VPN):** borra `.venv`, créalo de nuevo e instala desde `ruedas/`. Si la verificación vuelve a pasar, tu entorno es reproducible sin red.
> 9. **Publica:** `README` con la variante, la versión de Python, el tamaño medido y los dos comandos de instalación; `git push`.
>
> El paso 8 es el que casi nadie hace y el que demuestra que lo conseguiste.

---

## 10. Errores típicos y cómo detectarlos

| Síntoma | Causa probable | Cómo comprobarlo y arreglarlo |
|---|---|---|
| `torch.version.cuda` es `None` | instalaste la variante de CPU (p. ej., en Windows `pip install torch` desde PyPI trae la de CPU) | reinstala con `--index-url …/cu126` o `…/cu130` |
| `is_available()` es `False` | controlador ausente o demasiado antiguo para la variante | `nvidia-smi`; compara su «CUDA Version» con la de la rueda |
| `no kernel image is available` | la rueda no trae código para tu capacidad (Pascal con `cu130`) | `torch.cuda.get_arch_list()`; usa `cu126` |
| `ModuleNotFoundError` con el paquete instalado | otro intérprete (entorno sin activar, núcleo de Jupyter equivocado) | `import sys; print(sys.executable)` |
| `pip install --no-index` no encuentra un paquete | descargaste con otro Python o falta una dependencia | descarga con el mismo Python; instala de prueba el mismo día |
| `externally-managed-environment` | intentas instalar en el Python del sistema | usa un entorno virtual |
| la descarga de 3 GB se corta a la mitad | conexión inestable | `pip download` reanuda paquete a paquete: vuelve a lanzarlo y solo baja lo que falta |
| CPU y GPU no coinciden con `==` | es normal: otro orden de suma y TF32 | compara con `allclose` y tolerancia |

---

## 11. Ideas que te llevas

- **Separa descargar de instalar.** `pip download` una vez; `pip install --no-index --find-links` siempre.
- **`requirements.in` dice lo que quieres; `requirements.txt`, lo que tienes.** Este último, con `==`, es el que hace reproducible el entorno.
- **La variante de PyTorch se decide por dos números:** la capacidad de cómputo de la GPU y la versión de CUDA que admite el controlador. Pascal → `cu126`.
- **Verificar es ejecutar,** no preguntar: una operación real en la GPU comparada con la CPU.
- **Estima antes de descargar** y mide después (`du -sh`). Apunta el resultado.
- **Prueba de fuego:** borra el entorno y reconstrúyelo sin red. Si funciona, estás a salvo.

---

## 12. Preguntas de recuperación

Respóndelas sin mirar el texto; después comprueba.

1. ¿Qué diferencia hay entre una rueda y una distribución de código fuente? ¿Por qué te interesa tener solo ruedas?
2. Escribe de memoria las dos órdenes de `pip` que permiten instalar sin conexión.
3. ¿Qué te dice la línea «CUDA Version» de `nvidia-smi`? ¿Y qué no te dice?
4. Una GPU con capacidad 6.1 y otra con 8.9: ¿qué variante de PyTorch 2.13 eliges para cada una?
5. ¿Por qué `torch.cuda.is_available() == True` no garantiza que la GPU calcule?
6. ¿Cuántos GB, en orden de magnitud, cuesta descargar el entorno del curso? ¿Cómo lo mides con exactitud?
7. ¿Qué archivos de un proyecto van a Git y cuáles nunca?

:::solucion Respuestas
1. La rueda está compilada y se instala copiando; la distribución de código fuente hay que construirla en tu máquina, a veces compilando C/C++ con herramientas que quizá no tienes. Con ruedas la instalación sin red es predecible.
2. `pip download -d ruedas/ -r requirements.in` (con red) y `pip install --no-index --find-links ruedas/ -r requirements.txt` (sin red).
3. La versión **máxima** de CUDA que admite el controlador. No dice qué CUDA tiene instalado tu entorno (eso lo dice `torch.version.cuda`) ni si la rueda trae código para tu GPU.
4. Para 6.1 (Pascal), `cu126`. Para 8.9 (Ada), `cu130` si el controlador admite CUDA 13; si no, `cu126`.
5. Porque solo comprueba que hay controlador y GPU visibles, no que la rueda incluya *kernels* para esa capacidad de cómputo. Hay que ejecutar una operación real.
6. Unos 3-4 GB de descarga (más en disco). Con los tamaños que imprime `pip download` y con `du -sh` sobre la carpeta de ruedas.
7. Van el código, `requirements.in`, `requirements.txt`, el `README` y los guiones. Nunca van `.venv/`, las ruedas, los datos grandes ni las claves.
:::

---

## 13. Lecturas

- **PyTorch, «Get Started Locally»** (`https://pytorch.org/get-started/locally/`), en inglés: el selector oficial de la orden de instalación. Úsalo para comprobar que la orden de esta conferencia sigue vigente cuando la leas.
- **Software Carpentry, «La Terminal de Unix»** (`https://swcarpentry.github.io/shell-novice-es/`), en español y con licencia CC BY 4.0: los episodios 1-3 si te falta soltura con la terminal.
- **Software Carpentry, «Control de versiones con Git»** (`https://swcarpentry.github.io/git-novice-es/`), en español y con licencia CC BY 4.0: los episodios 1-7 (configurar Git, el historial, `.gitignore` y GitHub).
- **Raschka, Liu y Mirjalili, *Machine Learning con PyTorch y Scikit-Learn* (Marcombo, 2023)**, cap. 12, sección sobre la instalación de PyTorch. Es opcional y de pago; las versiones del libro ya están desfasadas, así que quédate con las ideas y no con los comandos.
