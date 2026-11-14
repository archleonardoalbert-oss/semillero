---
titulo: Python científico y entorno de trabajo
lema: NumPy vectorizado, pandas sobre datos reales y un entorno con PyTorch y CUDA que funciona desde Cuba, sin conexión.
---

<!--heroe--><section class="hero" aria-label="Presentación">
<div>
<p class="indicador"><span class="pr">&gt;&gt;&gt;</span><span>import numpy as np</span><span class="co"># Curso AI · asignatura 1 · repaso acelerado · ≈ 25 h</span></p>
<h1>Python <em>científico</em><span class="y">y entorno de trabajo</span></h1>
<p class="lema">Todo lo que harás en el curso pasa por aquí: preparar datos, calcular métricas, simular probabilidades, depurar un modelo. Esta asignatura te da la soltura del estilo vectorizado, que es otra forma de pensar distinta de los bucles de C++, y un entorno local que no depende de Colab ni de PyPI.</p>
<p class="pregunta"><strong>Una pregunta para empezar.</strong> Dos líneas de NumPy calculan exactamente la misma matriz de distancias entre 5000 consultas y 5000 documentos. Una necesita unos <strong>200 GB</strong> de memoria; la otra, <strong>600 MB</strong>. ¿Cuál es cuál, y por qué? Al final de la <a href="c03-vectores.html">conferencia 3</a> sabrás contestarlo en bytes, y al final de la asignatura, escribir código que cabe en tu GPU de 6 GB sin probar a ciegas.</p>
<p class="acciones"><a class="primero" href="c01-entorno.html">Empezar: conferencia 1 →</a><a href="#prueba-de-entrada">Prueba de entrada</a></p>
</div>
<figure class="heroe" data-heroe aria-label="La asignatura en cuatro actos sobre una misma matriz"><p class="sin-js">a = np.arange(48).reshape(6, 8)</p></figure>
</section><!--/heroe-->


:::widget memdist La misma cuenta, tres memorias muy distintas
{"modo": "portada"}
Mueve n y d. La barra roja es la versión «natural» con broadcasting; la verde, el desarrollo del cuadrado. Las líneas discontinuas son tu GPU y un portátil corriente.
:::

## 1. Por qué está en el curso

En el diagnóstico te pusiste un 2 en Python numérico («manipulo tablas con pandas y vectorizo sin bucles»), pero dejaste en blanco los tres ejercicios, y dijiste con honestidad que te falta práctica. Por eso es un **repaso acelerado** y no un curso desde cero: ya programas en Python, C++ y C#, y has usado NumPy, pandas, matplotlib y Keras. Lo que falta es **soltura**, y esa solo se gana haciendo.

Tiene una segunda función igual de importante: **montar desde la primera semana un entorno que funcione desde Cuba**. Sin VPN te funcionan GitHub y Hugging Face; Kaggle, Colab y probablemente PyPI, no. Tienes una GPU NVIDIA de 6 GB y entre 10 y 50 GB de datos al mes. Eso obliga a trabajar **en local**, con las dependencias descargadas una vez y fijadas. Si no lo resuelves ahora, perderás semanas después.

## 2. Qué serás capaz de hacer

- **Instalar** y **verificar** un entorno reproducible con PyTorch y CUDA en tu GPU, y **reconstruirlo sin red**.
- **Escribir** sin bucles las operaciones del ML: normalización, distancias, *one-hot*, reducciones por eje, máscaras, *softmax*.
- **Distinguir** vistas de copias y **predecir** la forma y la memoria de una expresión antes de ejecutarla.
- **Simular** experimentos aleatorios reproducibles y dar su error (la base de la asignatura de Probabilidad).
- **Limpiar** y **transformar** tablas reales con pandas 3: tipos, fechas, faltantes, centinelas, `groupby`, `merge` y ventanas temporales.
- **Encontrar** los problemas de unos datos con un análisis exploratorio antes de modelar.
- **Organizar** un proyecto con módulos, pruebas y un `README` que otra persona ejecute con un comando.

**Prerrequisitos:** Python general (funciones, clases, módulos) y producto de matrices. Los tienes.

## 3. Prueba de entrada

Treinta minutos, sin IA ni internet. **Si resuelves bien los cinco, sáltate las conferencias 2, 3, 5 y 6 y ve directo a sus prácticas** ([P2](p02-vectorizar.md) y [P3](p03-pandas.md)). Lo que ya dominas, no se repite: estorbaría.

1. `X` es un `np.ndarray` de forma `(n, d)`. En **una línea**, devuelve `Z`, la versión estandarizada por columnas (cada columna con media 0 y desviación 1).
2. `ventas` tiene las columnas `tienda`, `producto`, `fecha` y `unidades` (una fila por venta). En 2-4 líneas, da para cada `tienda` el `producto` con más unidades vendidas en total.
3. `A` es `(n, d)` y `B`, `(m, d)`. Sin bucles, calcula `D` `(n, m)` con $D_{ij} = \lVert a_i - b_j\rVert^2$, y explica por qué `((A[:, None, :] - B[None, :, :])**2).sum(-1)` gasta $O(nmd)$ de memoria.
4. `a = np.arange(6); b = a[::2]; b[0] = 100`: ¿cuánto vale `a`? ¿Y si en vez de `a[::2]` fuera `a[[0, 2, 4]]`?
5. Con un `DataFrame` de ventas diarias (`fecha`, `producto`, `unidades`), obtén las unidades semanales por producto y su media móvil de 4 semanas.

:::solucion Soluciones (ábrelas solo después de intentarlo)
1. `Z = (X - X.mean(axis=0)) / X.std(axis=0)`. (En producción, protege las columnas constantes: [conferencia 3](c03-vectores.md#ejemplo-resuelto-estandarizar-en-una-linea).)
2. `tot = ventas.groupby(["tienda", "producto"], as_index=False)["unidades"].sum()` y `tot.loc[tot.groupby("tienda")["unidades"].idxmax()]`.
3. `D = (A**2).sum(1)[:, None] + (B**2).sum(1)[None, :] - 2 * A @ B.T`. La versión con *broadcasting* materializa las diferencias `(n, m, d)`; el desarrollo solo crea arreglos $O(n + m)$ y $O(nm)$, porque la suma sobre $d$ ocurre dentro del producto de matrices.
4. `[100, 1, 2, 3, 4, 5]`: la rebanada es una vista del mismo búfer. Con la lista es una copia y `a` no cambia.
5. `sem = df.groupby(["producto", pd.Grouper(key="fecha", freq="W")])["unidades"].sum().unstack("producto", fill_value=0).asfreq("W", fill_value=0)` y `sem.rolling(4, min_periods=1).mean()`.

Criterio: correcto en lo esencial, aunque no idéntico. Si fallaste alguno, haz su conferencia completa.
:::

## 4. Mapa de la asignatura

Pasa el ratón (o el tabulador) por una idea para ver de cuáles depende y cuáles dependen de ella; haz clic para ir a su conferencia. Las salidas en color ciruela son las asignaturas del curso que la usarán.

:::widget mapa Cómo se conectan las ideas
Las conferencias 2 y 3 (NumPy) sostienen casi todo; la 5 contrasta las vistas de NumPy con la copia al escribir de pandas.
:::

## 5. Programa

{{programa}}

El orden de lectura recomendado (el de los botones «Siguiente» al pie de cada página) intercala las prácticas: **C1 → P1 → C2 → C3 → C4 → P2 → C5 → C6 → C7 → P3 → C8 → P4**. Las demostraciones para valientes son opcionales y se leen cuando la conferencia correspondiente remite a ellas. Respecto al plan del curso, se mantienen las ocho conferencias y las cuatro prácticas; se añade una tercera demostración (cuándo aplanar es una vista), porque formaliza la idea más difícil de la conferencia 2.

## 6. Cómo estudiarla

- **Tiempo:** unas 25 horas en 2-3 semanas, a tu ritmo de ~13 h/semana: 3-4 h por conferencia y 3-6 h por práctica, más la descarga del entorno.
- **Sin asistente de IA en los ejercicios.** Te diste un 4 en autonomía («escribo yo casi todo»); esta asignatura es el sitio para comprobarlo. Usa la IA, si acaso, para preguntar por un mensaje de error, nunca para que escriba la solución.
- **Predice antes de ver.** Cada página te pide comprometerte con una respuesta antes de enseñártela (los recuadros rosas) y explicar con tus palabras (los morados). Hazlo de verdad: el contraste entre lo que esperabas y lo que ves es donde se aprende.
- **Los motores se manipulan.** Recorre los pasos, retrocede y cambia los mandos siguiendo las sugerencias del pie de cada uno.
- **Pistas graduadas.** En las prácticas, cada ejercicio tiene cuatro pistas: concepto, estrategia, arranque y desbloqueo. Abre una sola cada vez, después de 10 minutos de intento.
- **Recuperación espaciada.** Al final de cada conferencia hay preguntas sin mirar; vuelve a las de la conferencia anterior al empezar la siguiente. Los ejercicios de «predice la forma» de las conferencias 2 y 3 generan preguntas nuevas cada vez.
- **Todo a GitHub.** Cada práctica es un repositorio público: es tu portafolio desde el día uno.

## 7. Evaluación

- **Prueba de dominio sin asistente (60 %):** 8 ejercicios cortos de NumPy y pandas en 60 minutos, sin IA ni internet, con la documentación oficial descargada como único apoyo.
- **Prácticas P1-P4 (40 %):** repositorios públicos, reproducibles y con pruebas.
- **Criterio de paso:** al menos 7 de 8. Si no llegas, repite las conferencias 3 y 6 con los ejercicios de las prácticas 2 y 3 que no hiciste.

## 8. Recursos

**Descargados en la asignatura** (funcionan sin conexión): los tres archivos del estudio de roedores de Portal en la versión de Data Carpentry ([`dc-surveys.csv`](../../recursos/python-cientifico/dc-surveys.csv), [`dc-species.csv`](../../recursos/python-cientifico/dc-species.csv), [`dc-plots.csv`](../../recursos/python-cientifico/dc-plots.csv)) y [Online Retail II](../../recursos/python-cientifico/online-retail-ii.zip) (UCI, CC BY 4.0), que usan las prácticas 3 y 4.

**En español, en línea y con licencia libre:** las lecciones de Data Carpentry («Análisis y visualización de datos usando Python») y de Software Carpentry («La Terminal de Unix» y «Control de versiones con Git»), con licencia CC BY 4.0; los tutoriales de Joaquín Amat Rodrigo en cienciadedatos.net; el curso de aprendizaje automatizado de la UNAM (Fuentes Pineda, 2026-2) en GitHub, que puedes clonar sin VPN; y la documentación de Python, traducida al español.

**De pago, opcional:** Raschka, Liu y Mirjalili, *Machine Learning con PyTorch y Scikit-Learn* (Marcombo, 2023), y McKinney, *Python para análisis de datos*, 3.ª ed. (Anaya, 2023), escrito por el creador de pandas. Si no puedes comprarlos, la asignatura es autosuficiente sin ellos; evita las descargas «gratuitas» de los buscadores, que son piratas.

> **Una nota sobre el idioma.** Elegiste el español, y todo el material de la asignatura está en español. Pero la documentación oficial de NumPy, pandas y PyTorch solo existe en inglés, y tu prioridad es el empleo remoto: las conferencias citan esas páginas por su nombre para que te acostumbres a encontrarlas. Cuando quieras, pide que se añada el inglés técnico al curso.
