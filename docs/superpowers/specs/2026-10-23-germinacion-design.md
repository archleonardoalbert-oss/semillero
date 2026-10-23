# Semillero II: lectura, glosas, «Cambio sugerido» y germinación

Amplía el diseño de `2026-10-23-semillero-design.md`. Todo lo que este documento no cambia sigue vigente: Opus siempre, 5 en paralelo, pausa por cuota, guard sobre `datos/`, honestidad brutal.

## Por qué

El usuario ya usa Semillero y le resulta cómodo. Tiene ideas en campos que aún no domina, así que necesita tres cosas:
- entender las matemáticas de los dictámenes sin salir de la página;
- poder corregir a Claude cuando se equivoca;
- cuando una idea merece la pena, un camino claro para llevarla a cabo: qué estudiar, a qué problemas se enfrenta y con qué material.

## 1. Líneas un 60 % más largas

La columna de lectura y escritura de la página de una idea pasa de `46rem` a `73.6rem` (46 × 1,6), con la misma letra. Esto incluye el título, los editores, las réplicas y los dictámenes. En pantallas más estrechas la columna ocupa el ancho disponible.

## 2. Cursiva legible

La cursiva de EB Garamond tiene 17,2° de inclinación (medido con `post.italicAngle`) y al usuario le cuesta leerla. En su lugar se usa la cursiva de **Literata**, con 2°: se distingue por el dibujo de las letras, no por la inclinación.

- **Decisión mía:** se declara con `@font-face` bajo la familia `'EB Garamond'` con `font-style: italic`, apuntando a los archivos de Literata 400 y 600 italic, con un `size-adjust` que iguala su altura de x a la de Garamond. Así, toda cursiva serif de la app (énfasis, resúmenes, entornos de teorema, pies de figura) cambia sin tocar cada regla.
- Se deja de importar `@fontsource/eb-garamond/400-italic.css`.
- La cursiva monoespaciada del pensamiento en vivo no cambia.

## 3. Glosas: seleccionar, explicar y corregir

### Qué se puede seleccionar

Cualquier fragmento de un documento renderizado: un dictamen, una réplica, el texto original en modo lectura o un nodo de la germinación. Puede ser:
- texto;
- fórmulas: una fórmula KaTeX se trata como átomo, y si la selección la toca, la incluye entera;
- imágenes y gráficos: un clic sobre una imagen, una figura o una fórmula en bloque la selecciona entera.

Al soltar la selección aparece un panel flotante junto a ella con dos acciones:
- **Explicar**: el prompt es opcional. Disponible en cualquier documento.
- **Corregir**: el prompt es obligatorio (qué está mal y por qué). Solo en documentos escritos por Claude.

### El fragmento que recibe Claude

El fragmento se serializa a Markdown:
- cada fórmula vuelve a su fuente `$…$` o `$$…$$` (sacada de la `annotation` TeX que KaTeX deja en el HTML);
- cada imagen se convierte en `![pie](ruta)` con su ruta dentro de `datos/`, para que la sesión pueda leerla con Read.

### Dónde se ve la respuesta

La respuesta es una **glosa**:
- El fragmento queda resaltado con la CSS Custom Highlight API, sin modificar el DOM.
- La nota se muestra al margen, a la altura del fragmento, si hay espacio: una columna de `20rem` a la derecha de la de lectura. Si no hay espacio, la glosa se abre como tarjeta flotante al pulsar el resaltado.
- La glosa es un pequeño hilo: renderiza Markdown con LaTeX y figuras, y admite preguntas de seguimiento.

### Aislamiento (decisión del usuario)

La glosa no aporta **nada** al contexto de la conversación principal.
- La primera petición hace `claude -p --resume <sesión principal> --fork-session`: la copia tiene todo el análisis como contexto, pero la sesión principal no se entera.
- El id de la copia se guarda desde el evento `system/init`.
- Las preguntas de seguimiento retoman esa copia.
- Si la idea aún no tiene sesión, porque se explica su propio texto sin analizar, la glosa empieza una sesión nueva.

### Corrección (decisión del usuario)

La copia juzga si el usuario tiene razón. Su respuesta empieza con un frontmatter `correccion: acertada | parcial | erronea`.

Si es `acertada` o `parcial`, **enmienda** el documento original sin rehacerlo. Ella decide qué partes dependen del error:
- en línea: `~~texto erróneo~~<ins>texto corregido</ins>`;
- en bloque: el entorno `> **Enmienda N.** …`, que se renderiza como cita con filete propio;
- si el veredicto debe cambiar, cambia el frontmatter. El servidor actualiza entonces el estado de la idea.

En la siguiente réplica, la sesión principal recibe solo esta línea: «el dictamen NNN fue enmendado tras una corrección; reléelo antes de responder». No recibe la conversación de la glosa.

### Ejecución

- Las glosas se lanzan al momento. No ocupan hueco en el límite de 5 porque son cortas, pero:
  - se rechazan con 409 si la idea está `en-proceso` o si la investigación está pausada por cuota;
  - sus eventos de cuota alimentan el mismo contador de la cola.
- **Lo que una glosa puede escribir:**
  - el documento glosado, solo si es una corrección;
  - `figuras/glosas/**`.
  - Lo demás se revierte, como en cualquier sesión.
- Su ruta cuenta como objetivo activo en las verificaciones del guard de las otras ejecuciones, y viceversa.
- Se guardan en `carpetas/<c>/ideas/<i>/glosas/<id>.json`, escritas solo por el servidor:
  - `{ id, tipo, documento, ancla, fragmento, mensajes:[{autor, contenido, fecha}], estado, sessionId, correccion, enmendado, error }`.
  - `documento` es una ruta relativa a la idea, por ejemplo `hilo/002-claude.md` o `germinacion/nodos/e1.md`.
- Al arrancar el servidor, una glosa que quedó `en-proceso` pasa a `error` y se restaura su documento desde git.

### El ancla

`{ exacto, prefijo, sufijo }` sobre una linealización del documento renderizado: el texto visible, con cada fórmula sustituida por `$tex$` y cada imagen por `![](src)`.
- Para resaltar, se busca `exacto` y se desempata con prefijo y sufijo.
- Si ya no se encuentra (por ejemplo, tras una edición del usuario), la glosa aparece al final como «fragmento ya no presente».

## 4. Estado «Cambio sugerido»

- Nuevo veredicto en el frontmatter: `veredicto: cambios`. El estado de la idea es `cambios`, con la etiqueta «Cambio sugerido» y el color `#cfe36a`, a medio camino entre el verde de aceptada y el ámbar.
- **El prompt lo define así:** la idea es realmente buena y va en la dirección correcta, pero necesita cambios concretos para merecer el tiempo del usuario.
- **El dictamen debe incluir:**
  - qué está bien;
  - cada cambio necesario, con su porqué y cómo altera el impacto;
  - próximos pasos asumiendo los cambios;
  - relación con otras ideas aceptadas.
- No es una forma de suavizar un rechazo ni de evitar aceptar.
- Tiene contador en la portada, entrada en las listas y en el micelio. Una idea en este estado se responde como cualquier otra.
- Solo las **aceptadas** pueden germinar (decisión del usuario).

## 5. Germinación

### Entrada

Una idea `aceptada` sin germinación muestra al final del dictamen la señal **«Comenzar germinación»**. Al pulsarla:
1. El manuscrito se condensa en una semilla que cae al pie de la página. Brota un tallo con la vista en vivo: la sesión se está preparando.
2. Se encola una ejecución de tipo `germinar` que **retoma la sesión principal** (`--resume`). Esa sesión es la que conoce la idea, así que pasa a trabajar con el usuario.

La germinación respeta la cola de 5, la pausa por cuota, «Detener» y «Reanudar». Mientras corre, la idea está `en-proceso` con `estadoPrevio: 'aceptada'` y al terminar vuelve a `aceptada`. El campo `idea.germinacion = { fase, iniciada, ultima }` indica que la página de la idea es ya la germinación.

### Fases

1. **Diagnóstico.** La sesión lee todo (idea, dictámenes, notas, otras ideas), puede hacer búsquedas breves y escribe `germinacion/mapa.json` con `fase: "diagnostico"`.
   - Incluye las preguntas necesarias para saber cuánto sabe el usuario del tema.
   - Cada pregunta es `abierta`, `escala` (0–4 con descripción de cada nivel) u `opciones`.
2. **Respuestas.** El usuario las responde en un cuestionario con buena tipografía (Markdown y LaTeX en los enunciados, editor rico en las abiertas) y pulsa «Enviar respuestas y seguir germinando».
3. **Mapa.** Nueva ejecución con investigación profunda y actualizada, como la etapa 2 o más.
   - La sesión escribe el mapa completo (`fase: "mapa"`), un documento por nodo y los recursos descargados.
   - **Ruta de estudio** (`estudio`): qué aprender, en qué orden y por qué. Cada nodo indica dependencias y duración orientativa.
   - **Incógnitas** (`incognita`): objetivos que el usuario debe ir resolviendo para avanzar. Pueden ser problemas abiertos. Cada una indica si es un problema abierto, su dificultad, qué se sabe y qué se desprende de resolverla (si se puede anticipar), y los trabajos más actuales que la atacan directa o indirectamente.
   - **Recursos:** libros, artículos, cursos y webs. Se descargan a `germinacion/recursos/` **solo si son legalmente accesibles**: arXiv, acceso abierto, páginas de los autores, dominio público o publicación gratuita oficial. Si no lo son, se citan con cómo conseguirlos. Nunca se descarga de sitios piratas.
   - Todo explicado con lujo de detalles.
4. **Mapa vivo.** El usuario:
   - marca nodos como `pendiente`, `en curso` o `hecho` (incógnitas: `abierta`, `atacando` o `resuelta`);
   - escribe notas por nodo;
   - envía una petición general («Comunicar avances / pedir cambios»).
   - Al enviar, el servidor compone el mensaje con los cambios de progreso desde la última ejecución y la petición. La sesión reajusta el mapa: profundiza, añade o poda nodos y actualiza recursos.

### Formato `mapa.json` (lo escribe Claude y lo valida el servidor)

```json
{
  "version": 1,
  "fase": "diagnostico | mapa",
  "resumen": "Markdown: visión del camino",
  "diagnostico": { "intro": "Markdown", "preguntas": [ { "id": "p1", "texto": "Markdown", "tipo": "abierta|escala|opciones", "niveles": ["…5 descripciones…"], "opciones": ["…"] } ] },
  "nodos": [ { "id": "e1", "tipo": "estudio|incognita", "titulo": "…", "resumen": "una línea", "documento": "nodos/e1.md", "depende": ["…"], "recursos": ["r1"], "duracion": "…", "abierto": true, "dificultad": "…" } ],
  "recursos": [ { "id": "r1", "tipo": "libro|articulo|curso|web", "titulo": "…", "autores": "…", "anio": 2025, "url": "…", "archivo": "recursos/x.pdf | null", "nota": "Markdown" } ]
}
```

- **Validación:**
  - ids únicos con el formato `^[a-z0-9-]{1,40}$`;
  - las dependencias y los recursos apuntan a ids que existen y no forman ciclos;
  - las rutas `documento` y `archivo` quedan dentro de `germinacion/`;
  - en fase `mapa` hay al menos un nodo; en fase `diagnostico`, al menos una pregunta.
- Si el mapa no es válido, el servidor restaura el anterior desde git y la ejecución termina en `error` con el motivo.
- El progreso del usuario vive en `germinacion/progreso.json`. Lo escribe el servidor y está protegido de las sesiones:
  - `{ respuestas, nodos: { id: { estado, notas } }, enviado }`, donde `enviado` es la instantánea de lo ya comunicado a la sesión.
- **Lo que pueden escribir las ejecuciones `germinar`:**
  - `germinacion/mapa.json`;
  - `germinacion/nodos/**`;
  - `germinacion/recursos/**`;
  - `figuras/**`;
  - las notas de la carpeta y las globales.

### La página: un árbol que crece hacia arriba (decisión del usuario)

Cuando la idea tiene germinación, entrar en ella muestra el árbol a pantalla completa en lugar del manuscrito.
- **Abajo, la semilla** ❦: el título de la idea y el sello del dictamen. Al pulsarla se abre el manuscrito original (dictámenes, réplicas, glosas) como lámina superpuesta.
- **El tallo:** los nodos de estudio, en capas según sus dependencias (la profundidad es la altura). Las ramas son curvas orgánicas cuyo grosor decrece con la altura.
- **Las incógnitas** brotan a los lados del nodo de estudio del que dependen, con forma de rombo ◇. Las abiertas (problemas abiertos) llevan un halo.
- **Los recursos** son hojas pequeñas pegadas a su nodo. Al pasar el ratón muestran el título.
- **El color dice el progreso:** pendiente en tono apagado, en curso con pulso y hecho/resuelta encendido.
- **Se puede mover y ampliar:** arrastrar para desplazar, rueda para ampliar y doble clic para encajar todo. Al entrar, el árbol se encaja completo.
- **Animación de crecimiento:** las ramas se trazan desde la semilla hacia arriba y los nodos florecen en secuencia. Ocurre en la primera vista de un mapa nuevo y cuando el mapa cambia, solo en los nodos nuevos. Se respeta `prefers-reduced-motion`.
- **Al pulsar un nodo** se abre su lámina, con transición desde el nodo:
  - el documento del nodo en formato manuscrito, con glosas;
  - el selector de estado;
  - las notas del usuario, en un editor;
  - la lista de recursos, con un botón «Abrir» para el PDF local y un enlace a la fuente.
- **Durante una ejecución,** un panel lateral muestra la vista en vivo. En la fase de diagnóstico, el cuestionario ocupa el centro sobre el árbol en brote.

### Prompt de germinación

Es un prompt de sistema propio, `promptGerminacion()`, que se añade en estas ejecuciones con el mismo tono honesto. Le explica:
- el objetivo: un mapa claro de qué estudiar y a qué se enfrenta el usuario;
- las fases;
- el formato exacto de `mapa.json`;
- el estilo de los documentos de los nodos (artículo científico, LaTeX, figuras);
- la política legal de descargas;
- que las incógnitas pueden ser problemas abiertos y que no debe inventar lo que se desprende de resolverlas cuando no se sabe;
- que debe dejarlo todo explicado con detalle.

## Fuera de alcance

- Germinar ideas en «Cambio sugerido».
- Editar el mapa a mano: el usuario lo cambia mediante peticiones a la sesión.
- La decisión entre web y escritorio sigue aplazada.
