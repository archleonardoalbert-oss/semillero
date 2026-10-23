# Semillero IV: taller por incógnita, enunciados con historia y árbol botánico

Amplía los diseños anteriores, que siguen vigentes en todo lo demás.

## Por qué

La germinación ya traza bien el camino. El siguiente paso natural es trabajar los problemas: una colaboración estrecha con una sesión dedicada a cada incógnita. Esa sesión asesora al usuario mientras investiga, le corrige, le hace ver lo que no ve de sus resultados y conecta su problema con incógnitas de otras ideas. Así el problema evoluciona con lo investigado.

## 1. Taller de una incógnita (decisiones del usuario: pantalla dividida, el enunciado lo propone la sesión y lo acepta el usuario)

- **Dónde.** Solo los nodos `incognita` tienen taller, incluidos los problemas abiertos. Su lámina pasa a pantalla dividida:
  - a la izquierda, el enunciado con glosas;
  - debajo del enunciado, los recursos, las dependencias y las notas;
  - a la derecha, fija, la conversación «Taller con Claude».
- **La sesión.** Es propia de ese nodo y empieza de cero, sin bifurcar de la germinación, para no arrastrar información ajena. El primer mensaje lleva un resumen preparado por el servidor:
  - el título y la visión de la idea (`mapa.resumen`);
  - la ruta del enunciado, sus dependencias (título y documento) y las notas del usuario en el nodo;
  - un índice de las incógnitas de **todas** las germinaciones del semillero, con idea, id, título, si es problema abierto y documento, para que pueda conectarlas.

  Puede leer cualquier otro archivo bajo demanda. Corre con Opus y el esfuerzo de Ajustes, al momento, sin cola, como las glosas. No arranca si la idea está en proceso o la cuota está pausada.
- **Adjuntos.** El usuario adjunta resultados: imágenes, PDF, txt, md, csv, py, ipynb y json, de hasta 20 MB. Se guardan en `germinacion/talleres/<nodo>/adjuntos/` y la sesión los lee con Read. Al seleccionar texto del enunciado aparece una tercera acción, **Citar en el taller**, que añade el fragmento a la caja de texto.
- **Lo que hace la sesión** (lo dice su prompt):
  - evaluar si el usuario va por buen camino y qué le falta;
  - decirle qué no está viendo en sus resultados (también lo que los hace más relevantes);
  - corregirle con honestidad y guiar su foco;
  - conectar el problema con incógnitas de otras ideas.
- **Conexiones.** En su respuesta, la sesión puede incluir un bloque `semillero-conexiones` con `[{ "carpetaId", "ideaId", "nodo", "relacion" }]`. El servidor descarta los destinos que no existen y guarda el resto en el taller sin repetirlos. La lámina muestra las conexiones salientes y las entrantes (que vienen de otros talleres) como enlaces que abren ese nodo en su idea.
- **Evolución del enunciado.** Cuando la sesión cree que el problema ha cambiado (se acota, se transforma, aparece un subproblema):
  - escribe la versión completa en `germinacion/talleres/<nodo>/propuesta.md` e incluye un bloque `semillero-propuesta` con `{ "resumen": "…" }`;
  - la interfaz muestra una tarjeta con «Ver cambios» (diff por párrafos en el panel izquierdo), «Aplicar» y «Descartar»;
  - **Aplicar:** el servidor archiva la versión vigente en `talleres/<nodo>/versiones/NNN.md`, copia la propuesta a `nodos/<nodo>.md`, borra la propuesta y lo commitea;
  - **Descartar:** borra la propuesta;
  - el historial de versiones se puede ver y restaurar.
- **Lo que puede escribir:** `germinacion/talleres/<nodo>/propuesta.md` y `figuras/talleres/<nodo>/**`. Nada más. El resto lo escribe el servidor (`taller.json`, adjuntos, versiones), y el guard coordina el taller con la cola y las glosas.
- **Con la germinación.** Sus siguientes ejecuciones no reescriben los enunciados que tengan versiones aplicadas, salvo que el usuario lo pida, y leen `talleres/` para conocer los avances.

## 2. Enunciados con historia

Los documentos de las incógnitas empiezan con:
- `## Cómo se llegó a este problema`: los antecedentes directos y cómo surge;
- `## El problema`;
- `## Qué representaría resolverlo`.

Después siguen el estado del arte, los enfoques y las referencias. Así lo pide el prompt de germinación. Tras el despliegue, se lanza una ejecución sobre la germinación real del usuario que reescribe solo sus 7 incógnitas.

## 3. Glosas en los nodos

Ya existen. Se verifica que funcionan dentro de la lámina y se añade «Citar en el taller».

## 4. Árbol botánico (decisión del usuario: raíces bajo tierra)

- **Suelo** en y = 0.
- **Raíces** bajo tierra: una por mensaje del manuscrito (tu idea, cada dictamen, cada réplica), en abanico hacia abajo. Al pulsar una se abre el manuscrito desplazado a ese mensaje.
- **Tronco:** los nodos `estudio`, por capas de dependencia, en una banda estrecha de varios nodos de ancho. Las ramas son gruesas.
- **Copa:** las incógnitas en anillos por encima del tronco, según su profundidad entre incógnitas, repartidas en arco.
  - Una incógnita normal es una **hoja**; un problema abierto, un **fruto** con halo; una incógnita resuelta, un fruto dorado.
  - Cada una se une con una rama a su estudio de referencia. Las dependencias entre incógnitas son curvas finas discontinuas.
- **Títulos:**
  - los del tronco, en columnas a ambos lados, unidos por líneas guía;
  - los de la copa, hacia fuera en sentido radial.
  - Una pasada de colisiones garantiza que ningún título se solape con otro.
  - Los títulos largos se truncan a unos 38 caracteres; al pasar el ratón, el título completo sale en una tarjeta fija que no tapa otros títulos.
  - Al pasar por un nodo se resaltan también sus dependencias.
- **Recursos:** salen del árbol (decisión mía, para que esté limpio) y siguen en la lámina de cada nodo.
