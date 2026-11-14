# Python científico y entorno de trabajo (repaso acelerado)

## Por qué está en el curso

Todo lo que harás en este curso pasa por NumPy y pandas: preparar datos, calcular métricas, simular probabilidades, depurar un modelo. En el diagnóstico te pusiste un 2 en Python numérico («manipulo tablas con pandas y vectorizo sin bucles»), pero no resolviste ninguno de los tres ejercicios. Tú mismo dijiste que te falta práctica y que hace tiempo que no usas NumPy. Por eso esta asignatura es un **repaso acelerado**, no un curso desde cero: ya programas en Python, C++ y C#, y has usado NumPy, pandas, matplotlib y Keras. Lo que falta es **soltura con el estilo vectorizado**, que es otra forma de pensar distinta de los bucles de C++.

Tiene una segunda función igual de importante: **montar desde el primer día un entorno que funcione desde Cuba**. Según el diagnóstico:

- **Sin VPN funcionan:** GitHub y Hugging Face.
- **Solo con VPN:** Kaggle, Colab y probablemente PyPI.
- **Tu equipo:** una GPU NVIDIA con 6 GB de VRAM y un presupuesto de 10 a 50 GB al mes.

Esto obliga a un estilo de trabajo **local primero**: todo tiene que poder entrenarse en tu máquina, con dependencias descargadas una vez y fijadas. Si no resuelves esto en la semana 1, perderás semanas más adelante.

## Prerrequisitos

- Python general (funciones, clases, módulos): lo tienes.
- Álgebra lineal básica (producto de matrices): la tienes.

### Prueba de entrada (30 minutos, sin IA)

Si resuelves bien los cinco ejercicios, sáltate las conferencias 2, 3, 5 y 6, y haz solo sus prácticas.

1. Estandarizar por columnas una matriz `X` en una línea.
2. Para cada `tienda`, el `producto` con más unidades (pandas).
3. Matriz de distancias al cuadrado entre las filas de `A` y de `B` sin bucles, y explicar por qué la versión con `A[:, None, :] - B[None, :, :]` gasta $O(nmd)$ de memoria.
4. `a = np.arange(6); b = a[::2]; b[0] = 100`: ¿cuánto vale `a`? ¿Y si en vez de `a[::2]` fuera `a[[0, 2, 4]]`?
5. Con un `DataFrame` de ventas diarias, obtener las unidades semanales por producto y su media móvil de 4 semanas.

## Objetivos de la asignatura

Al terminar serás capaz de:

- **Instalar** y **verificar** un entorno reproducible con PyTorch y CUDA en tu GPU, sin depender de Colab.
- **Escribir** sin bucles las operaciones numéricas típicas del ML: normalización, distancias, *one-hot*, reducciones por eje y máscaras.
- **Distinguir** vistas de copias y **predecir** la forma resultante de un *broadcasting*.
- **Limpiar** y **transformar** tablas reales con pandas: tipos, fechas, faltantes, `groupby`, `merge`, `pivot` y ventanas temporales.
- **Simular** experimentos aleatorios reproducibles (es la base de la asignatura de Probabilidad).
- **Organizar** un proyecto de datos con módulos, pruebas y un `README` que otra persona pueda ejecutar.

## Programa por conferencias

1. **Un entorno que funcione desde Cuba.**
   - Entornos virtuales: `venv`, o `conda`/`mamba` con `conda-forge`.
   - Tres vías para conseguir paquetes, de mejor a peor:
     - instalar por VPN una sola vez y guardar las ruedas (*wheels*) en una carpeta local (`pip download`, después `pip install --no-index --find-links`);
     - usar un espejo de PyPI accesible desde tu red: hay que probarlo, no lo he podido verificar;
     - copiar paquetes de compañeros.
   - Instalar PyTorch con CUDA y comprobar `torch.cuda.is_available()`.
   - Fijar versiones con `requirements.txt` o `environment.yml`.
   - Estimar el consumo: PyTorch con CUDA ocupa unos 2-3 GB y hay que bajarlo una sola vez.
   - Jupyter y VS Code.
   - Git y GitHub para el portafolio desde el primer día.
2. **NumPy I: el `ndarray`.** Forma, `dtype`, ejes; indexado básico, avanzado y booleano; vistas frente a copias; `reshape`, `transpose`, `stack`.
3. **NumPy II: pensar en vectores.** Reducciones por eje (`mean(axis=0)`), *broadcasting* y sus reglas, estandarización, distancias por pares con el truco $\lVert a-b\rVert^2 = \lVert a\rVert^2 + \lVert b\rVert^2 - 2a^\top b$, `np.linalg` (resolver sistemas, normas, autovalores) y el coste en memoria de cada solución.
4. **Aleatoriedad reproducible.** `np.random.default_rng(semilla)`, muestreo de distribuciones, permutaciones y particiones aleatorias. Primer Monte Carlo: estimar $\pi$ y simular un detector de fraude. Es el puente con la asignatura de Probabilidad.
5. **pandas I: datos sucios.** Lectura de CSV y Excel (los datos de una mipyme suelen venir así), tipos, fechas, valores faltantes, duplicados, categorías y texto.
6. **pandas II: agregar y reorganizar.** `groupby` con `agg` y `transform`, `merge` (y sus trampas: claves duplicadas que multiplican filas), `pivot_table`, `resample` y `rolling` sobre series temporales. Es la base de la asignatura de series temporales.
7. **Visualización y análisis exploratorio.** matplotlib y seaborn: histogramas, diagramas de dispersión, series y gráficos por grupos. Cómo hacer un análisis exploratorio que encuentre problemas en los datos antes de modelar.
8. **Código de proyecto, no de cuaderno.** Pasar del cuaderno a módulos, funciones puras, pruebas con `pytest`, perfilar con `%timeit` y `cProfile`, y estructurar un repositorio (`data/`, `src/`, `notebooks/`, `README`).

## Clases prácticas

- **P1 (conf. 1):** un *script* `verificar_entorno.py` que imprima las versiones, si la GPU está disponible y la memoria libre, y que entrene una regresión lineal de juguete en GPU. Súbelo a GitHub.
- **P2 (conf. 2-3):** cinco ejercicios de vectorización, cada uno contra una versión con bucles: comprueba que dan lo mismo con `np.allclose` y mide la diferencia de tiempo.
- **P3 (conf. 5-6):** limpieza de un conjunto real de ventas minoristas (por ejemplo, *Online Retail II*, de acceso público). Unidades por semana y producto, los 10 productos más vendidos por país, y detección de devoluciones y precios anómalos.
- **P4 (conf. 8):** convierte P3 en un paquete con pruebas que se ejecute con un solo comando.

## Demostraciones para valientes

- Implementa `np.einsum` para tres casos (producto matricial, traza, producto exterior por lotes) y explica por qué es tan útil en los transformers.
- Mide cómo escala la memoria de las dos versiones de la matriz de distancias con $n = m = 5000$ y $d = 512$, y explica el resultado en bytes.

## Evaluación

- **Prueba de dominio sin asistente (60 %):** 8 ejercicios cortos de NumPy y pandas en 60 minutos, sin IA ni internet, con la documentación oficial descargada como único apoyo.
- **Prácticas P1-P4 (40 %):** repositorio público, reproducible y con pruebas.
- **Criterio de paso:** ≥ 7 de 8 ejercicios correctos. Si no llegas, repite las conferencias 3 y 6 con ejercicios nuevos.

## Bibliografía principal

- **Recursos en español gratuitos:**
  - cienciadedatos.net, de Joaquín Amat Rodrigo: tutoriales de Python para ciencia de datos.
  - Los cuadernos del curso de Aprendizaje Automatizado de la UNAM (2026-2).
- **De pago (opcional):** Raschka et al., *Machine Learning con PyTorch y Scikit-Learn* (Marcombo, 2023). Repasa el entorno y NumPy en sus primeros capítulos.

> **Nota.** La documentación oficial de NumPy y pandas solo está en inglés. Como elegiste el español como único idioma, el material de las conferencias lo sustituirá. Aun así, para un empleo remoto tendrás que leer documentación en inglés tarde o temprano (lo explica el resumen del mapa).

## Referencias

- Amat Rodrigo, J. *Ciencia de datos con Python*. cienciadedatos.net. https://cienciadedatos.net/
- Fuentes Pineda, G. *Curso de aprendizaje automatizado*, PCIC-UNAM, 2026-2. https://github.com/gibranfp/CursoAprendizajeAutomatizado
- Raschka, S., Liu, Y. y Mirjalili, V. (2023). *Machine Learning con PyTorch y Scikit-Learn*. Marcombo. ISBN 978-84-267-3573-7.
