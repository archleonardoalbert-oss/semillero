# Semillero III: etiquetas explicativas, caminos seleccionables y germinación flexible

Amplía `2026-10-23-germinacion-design.md`. Todo lo demás sigue vigente.

## Por qué

Una idea correcta pero con poco impacto (la ablación espectral de *C. elegans*) salió «Rechazada», como si estuviera mal. El usuario quiere:
- etiquetas que expliquen el porqué;
- que las alternativas que propone Claude se puedan elegir con un toque, no solo leer;
- poder germinar cualquier idea salvo las que de verdad no tienen recorrido.

## 1. Veredictos: categoría fija + etiqueta libre (decisión del usuario)

Categorías (`veredicto` del frontmatter y `estado` de la idea):

| Valor | Nombre | Cuándo |
|---|---|---|
| `aceptada` | Aceptada | Merece el tiempo tal cual. |
| `cambios` | Cambio sugerido | Buena y bien encaminada, con cambios concretos. |
| `no-recomendada` | No recomendado | Correcta y viable, pero no aporta lo suficiente: resultados pobres, impacto escaso o poco material para un proyecto real. |
| `rechazada` | Rechazada rotundamente | Errónea, inviable, ya existe tal cual o no tiene sentido. |
| `aclaracion` | Necesita aclaración | Faltan datos para juzgar con honestidad. |

- El frontmatter gana `etiqueta:`, una frase de 2 a 6 palabras que matiza la categoría (p. ej. «Variación recomendada, resultados pobres»). Es opcional para el parser: si falta, se usa el nombre de la categoría.
- Se ve:
  - bajo el sello del dictamen;
  - en la cabecera de la idea;
  - en las listas.
- La idea guarda `veredicto` (el último, aunque el estado pase a pendiente) y `etiqueta`.
- **Ideas antiguas:** las que ya están en `rechazada` pasan a mostrarse como «Rechazada rotundamente». Para reclasificarlas, el usuario responde pidiéndolo y se reanaliza.
- **Color de `no-recomendada`:** `#d08c60`, terracota entre el rojo de rechazada y el ámbar.
- Tiene contador en la portada, lista propia y el micelio la atenúa un poco.

## 2. Caminos que propone Claude (opciones seleccionables)

### Formato

Cada vez que el dictamen propone alternativas o cambios, Claude las declara además en un bloque al final del cuerpo:

````
```semillero-caminos
[
  { "id": "jacobiano-ajustado", "tipo": "variacion", "titulo": "…", "descripcion": "Markdown" },
  { "id": "no-normalidad", "tipo": "idea-nueva", "titulo": "…", "descripcion": "…" }
]
```
````

- **Tipos:**
  - `variacion`: la misma idea, reorientada;
  - `idea-nueva`: otro proyecto que merece su propio análisis.
- **Validación del servidor:**
  - entre 1 y 6 caminos;
  - ids con el formato `^[a-z0-9-]{1,40}$`, únicos;
  - título y descripción no vacíos.
- Si el bloque no es válido, se ignora y se deja visible como código.
- El servidor lo extrae del cuerpo y lo sirve aparte (`m.caminos`).

### Interfaz

- Bajo el dictamen, una fila de opciones de colores:
  - variaciones en la familia verde (savia);
  - ideas nuevas en la familia violeta (otra semilla).
- Cada opción lleva su título y la marca «Variación» o «Idea nueva».
- **Solo las del último dictamen son seleccionables;** las antiguas se ven apagadas.
- **Al tocar una opción** se despliega su descripción, un comentario opcional y el botón «Elegir esta variación» o «Crear como idea nueva».
- **Se elige una sola a la vez (decisión del usuario).** Tocar otra la sustituye. Volver a tocar la elegida la desmarca.

### Efecto

- **Variación:**
  - se guarda como réplica pendiente (`NNN-usuario.md`), con el texto «Elijo el camino «título»» y el comentario;
  - la idea queda en `replica-pendiente` con `eleccion = { dictamen, camino, archivo }`, y su estado se muestra como «Camino elegido, sin analizar»;
  - en el siguiente «Comenzar Análisis», la sesión recibe la réplica y reanaliza la idea con esa variación;
  - desmarcar borra esa réplica, si solo contiene la elección, y devuelve el estado al veredicto.
- **Idea nueva:**
  - se crea al momento en el mismo bancal, como borrador (NUEVA en el panel). Su cuerpo es la descripción, el comentario y una línea de procedencia que enlaza la idea original para que su sesión la lea;
  - la nueva idea guarda `origen = { carpetaId, ideaId, camino }` y la original guarda `derivadas[]`;
  - la opción muestra «Creada: abrir»;
  - desmarcar borra la idea nueva solo si sigue en borrador sin analizar.

## 3. Germinar fuera de «Aceptada» (decisión del usuario)

- **«Comenzar germinación»** aparece en todo veredicto salvo `rechazada`:
  - en `aceptada`, igual que ahora;
  - en `cambios`, `no-recomendada` y `aclaracion` (también si están en `replica-pendiente` por encima), la señal cambia de texto: Claude no la aceptó tal cual, y se explica la etiqueta.
- **Al pulsar en esos estados se abre «Antes de germinar»**, la última recomendación:
  - la etiqueta y el resumen del dictamen;
  - las variaciones del último dictamen, para elegir una (opcional, con comentario);
  - el texto de la idea en un editor, para modificarlo allí mismo.
- **El botón «Germinar con esta versión» germina directamente, sin reanalizar.** Elegir una opción o modificar la idea equivale a aceptarla en esa versión.
  - Si el texto cambió, se guarda el `001-usuario.md`.
  - El servidor añade una petición pendiente que explica la decisión a la sesión: el veredicto que no aceptó la idea, el camino elegido con su comentario, y que la idea se modificó (y debe releerse). Esa versión cuenta como la aceptada.
- **En `rechazada` no hay señal ni ruta:** el servidor responde 409 `no-germinable`.

## 4. Explicaciones superficiales o profundas (decisión del usuario)

- **Explicar** pide profundidad:
  - **Superficial:** Sonnet (`--model sonnet`), esfuerzo `low` (decisión mía: la idea es que sea rápida);
  - **Profunda:** Opus, esfuerzo `medium`.
- **Corregir** sigue con Opus y el esfuerzo de Ajustes.
- La profundidad se guarda en la glosa y la heredan sus preguntas de seguimiento.
- Es la única excepción a «siempre Opus», y la ha pedido el usuario explícitamente.
