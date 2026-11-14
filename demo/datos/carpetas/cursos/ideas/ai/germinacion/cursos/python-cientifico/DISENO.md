# Diseño de la web «Python científico y entorno de trabajo»

## Concepto: «Memoria viva» (el búfer y la tabla)

La idea que sostiene la asignatura es que un `ndarray` es **una forma de leer un búfer de bytes** y que un `DataFrame` es **una tabla de columnas con tipo**. Todo el diseño sale de ahí:

- **De día, papel milimetrado de cuaderno de ingeniería**: una mesa color papel con retícula fina (línea más marcada cada 4 celdas) y, encima, una **hoja** blanca cálida donde se lee.
- **De noche, una memoria de fósforo**: el mismo papel convertido en una pantalla azul noche, con la retícula tenue y celdas que brillan como un monitor antiguo.
- **El fondo vive** (`motores/fondo.js`): de vez en cuando, una «vista» recorre la retícula encendiendo celdas separadas por un paso fijo (los *strides* de la conferencia 2) y se apaga despacio. Nunca se enciende nada bajo un texto: títulos, índice, portada y barra son zonas tranquilas.
- **La tira de bytes** de la barra superior es el programa: cada pieza es una celda (`c1`…`c8` conferencias, `p1`…`p4` prácticas con borde discontinuo, `v1`…`v3` demostraciones redondas). La actual brilla en azul; las visitadas, en azul pálido. Al pasar el ratón aparece el título.
- **El código vive en islas de terminal** (fondo casi negro con un filo de luz azul), en los dos temas.
- **Las celdas** (rectángulos con un valor en monoespaciada) son el elemento gráfico de todos los motores.

## La portada: un momento de entrada

- A la izquierda, un indicador de terminal (`>>> import numpy as np  # Curso AI · …`), el título gigante con «científico» en un degradado azul → rosa → naranja (los tres colores con significado del curso), el lema, la pregunta de los 200 GB frente a 600 MB y dos llamadas («Empezar» y «Prueba de entrada»).
- A la derecha, **la escena** (`motores/heroe.js`): la asignatura en cuatro actos sobre la misma matriz `6 × 8` y su búfer de 384 bytes: los bytes suben a formar la matriz (`reshape`), una vista enciende 9 celdas con líneas a sus bytes (`a[::2, 1::3]`), cada columna cae a su media (`mean(axis=0)`) y la fila de medias se estira sobre las seis filas (*broadcasting*). Avanza sola, con calma; tiene pausa y puntos para saltar, se detiene fuera de pantalla y, con `prefers-reduced-motion`, se queda quieta en el acto de la vista.
- En la portada no hay índice lateral: la escena ocupa el ancho.

## Paleta (variables CSS por tema; mismo significado en todo el curso y en los motores)

| Papel | Claro | Oscuro | Significa |
|---|---|---|---|
| azul | `#0072b2` | `#62b0ea` | el dato original, el búfer, la vista; enlaces; la pieza actual |
| naranja (texto) | `#e69f00` (`#8a5700`) | `#f2b544` (`#f2c46a`) | lo nuevo: resultado, copia, ejemplos, prácticas |
| rosa (texto) | `#cc79a7` (`#9c4778`) | `#e394c4` (`#eaa6cf`) | lo seleccionado: índices, máscaras, predicciones, demostraciones |
| verde (texto) | `#009e73` (`#006e50`) | `#3fc79d` (`#5fd3ad`) | correcto, compatible, soluciones |
| bermellón (texto) | `#d55e00` (`#a84600`) | `#f08a4b` (`#f39a62`) | error, incompatible, fuga, refutaciones |
| violeta | `#6a5a9e` | `#a99be0` | autoexplicación y conceptos umbral |
| mesa / hoja / tinta | `#f3efe4` / `#fffdf8` / `#1b1e25` | `#0b0f15` / `#121821` / `#e8e3d6` | fondo, superficie de lectura, texto |

Base Okabe-Ito (validada para daltonismo con codificación secundaria: los motores siempre rotulan con texto, ✓/✗ y cifras). En oscuro los acentos están aclarados y algo desaturados, el texto nunca es blanco puro y todos los textos superan 4,5:1 sobre la hoja (comprobado). Las sombras del claro son cálidas y suaves; en oscuro la elevación se marca con superficies algo más claras y un halo azul muy tenue en lo activo.

## Tipografía

- **Bricolage Grotesque** (variable, OFL): títulos (800 en la portada, interletrado negativo) y rótulos.
- **Literata** (OFL): lectura, 1,0625 rem, interlínea 1,7, medida de 70 caracteres.
- **JetBrains Mono** (OFL): código, formas, pasos, cifras, etiquetas en versalitas.
- **KaTeX 0.19** (MIT): fórmulas pre-renderizadas al construir.

Todo está en `fuentes/` y `lib/katex/`, con sus licencias. Nada se carga de internet.

## Maquetación

Rejilla de dos columnas (índice lateral de cristal esmerilado de 14,5 rem + contenido). El título de cada pieza vive **sobre la retícula**; el contenido, en **la hoja** (tarjeta con un filo de cuatro colores arriba y sombra profunda). Dentro de la hoja, la columna de lectura va **centrada** (70 ch) y los motores, figuras y tablas ocupan todo el ancho. Por debajo de 1080 px desaparece el índice lateral; por debajo de 760 px, la barra se parte en dos filas y la hoja se ciñe a la pantalla.

## Movimiento (sereno y con significado; todo se apaga con `prefers-reduced-motion`)

- **Entre páginas:** salida con fundido, leve subida y desenfoque de 2 px (260 ms, `--semillero-salida`); entrada con fundido y subida (650 ms, curva `cubic-bezier(.2,.7,.2,1)`). El fondo se atenúa durante la salida.
- **Al hacer scroll:** secciones, motores, figuras y predicciones aparecen una vez (opacidad y 14 px); lo que ya se ve al cargar no se esconde.
- **Microinteracciones:** celdas de la tira que suben, botones que se hunden al pulsar, opciones de predicción que se desplazan al pasar y que celebran (acierto) o tiemblan (fallo), desplegables con flecha que gira y contenido que entra, narración de los motores que se renueva con un deslizamiento, «✓ copiado» en el código, el chip de la marca que late, indicador «motor interactivo» con un punto vivo, barra de progreso de lectura degradada bajo la barra superior.
- **Fondo:** 30 fps como mucho, en pausa si la pestaña no se ve, un fotograma fijo con movimiento reducido.

## Temas

Cada página lleva en el `<head>`, antes de los estilos, el script obligatorio que fija `data-tema` desde `?tema=` o la preferencia del sistema. El interruptor sol/luna de la barra llama a `window.semillero.cambiarTema`. `motores/motor.js` lee los colores de las variables CSS (`C`), escucha `semillero-tema` y los cambios de `data-tema`, y **redibuja todos los lienzos**; los motores que construyen HTML con colores se suscriben con `alCambiarTema`. El mapa conceptual usa clases CSS. Las figuras PNG (de fondo oscuro) se enmarcan como pantallas en los dos temas.

## Componentes pedagógicos (bloques de las fuentes)

| Bloque | Aspecto | Función |
|---|---|---|
| `> **Objetivos.**`, `> **Definición…**`, `> **Proposición…**`, `> **Ejemplo…**` (renglones de cuaderno), `> **Problema para pensar…**`, `> **Observación…**` | cajas teñidas del color de su tipo | se clasifican solas por la primera palabra en negrita |
| `:::predice` | marco rosa con «?», opciones-botón | comprometerse antes de ver; marca ✓/✗ y abre la explicación |
| `:::autoexplica` | violeta con «✎» y área de texto | autoexplicación (se guarda si hay almacenamiento) |
| `:::error` | bermellón con «✗» | refutación |
| `:::umbral` | marco violeta con sombra desplazada | concepto umbral (las vistas) |
| `:::pista Concepto/Estrategia/Arranque/Desbloqueo` | escalera de cuatro barras crecientes | pistas graduadas |
| `:::solucion` | etiqueta verde «Respuesta» | soluciones desplegables |
| `:::widget nombre Título` | tarjeta con punto «vivo» | carga `motores/w-nombre.js` |
| `:::llevas` | caja azul | ideas que te llevas |

## Motores (`motores/`)

`motor.js` es el núcleo: colores del tema, lienzo HiDPI en coordenadas lógicas, pincel de celdas, **pasos discretos controlados por el estudiante** (◀ ▶ ↺, puntos, narración, flechas del teclado), mandos y un generador con semilla. Estado → `dibujar(paso, p)` determinista → mandos.

| Motor | Página | Qué hace visible |
|---|---|---|
| `fondo.js`, `heroe.js` | todas, portada | el fondo vivo; la escena de cuatro actos |
| `w-variante`, `w-presupuesto` | C1 | variante de PyTorch por GPU y controlador; GB de equivocarse |
| `w-memoria` | C2, V3 | búfer, pasos, vista frente a copia; criterio de aplanado |
| `w-formas` | C2, C3 | «predice la forma» con corrección (recuperación) |
| `w-broadcast`, `w-memdist` | C3, portada | reglas del broadcasting; memoria de las distancias |
| `w-montecarlo`, `w-fraude`, `w-particion` | C4 | regla 1/√n; condicionar = filtrar; estratificar |
| `w-lector`, `w-atipicos` | C5 | parámetros de `read_csv`; IQR, z y MAD |
| `w-groupby`, `w-merge`, `w-ventanas` | C6 | agg/transform; Σ a_k·b_k y `validate`; resample, rolling y la fuga |
| `w-anscombe`, `w-bins` | C7 | estadísticos idénticos; los bins cambian la historia |
| `w-repo`, `w-perfil` | C8 | anatomía de un repositorio; perfil real de cProfile |
| `w-mapa` | portada | mapa conceptual enlazado |

## Cómo modificarla

1. Edita `fuente/paginas/*.md` (cabecera `titulo`, `num`, `resumen`, `horas`, `metas`). En `index.md`, la escena de entrada va entre `<!--heroe-->` y `<!--/heroe-->`: el generador la saca de la hoja.
2. `node fuente/construir.mjs` regenera las `.html` (usa `marked` y `katex` de `node_modules` de Semillero; ruta configurable con `SEMILLERO_NODE_MODULES`) y copia fuentes, KaTeX y figuras.
3. Comprueba con `node server/cursos/probar-sitio.js --capturas /tmp/capturas <carpeta del curso>` y mira las capturas en claro, oscuro y móvil.

Orden de navegación (`LECTURA` en `construir.mjs`): C1 → P1 → C2 → C3 → C4 → P2 → C5 → C6 → C7 → P3 → C8 → P4 → V1 → V2 → V3.
