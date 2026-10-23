# Semillero II (germinación) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el ancho de lectura, la cursiva legible, las glosas, el estado «Cambio sugerido» y la germinación descritos en el spec.

**Architecture:**
- El motor existente (cola, runner, guard) gana dos tipos de trabajo:
  - **glosas:** sesiones bifurcadas e inmediatas, fuera del límite de 5;
  - **germinar:** ejecuciones en cola sobre la sesión principal.
- Ambos comparten el guard mediante un registro de objetivos activos.
- El frontend añade una librería de anclas (linealización y serialización de selecciones), el componente `Glosable`, y la vista `Germinacion` con un árbol SVG de layout puro y testeable.

**Tech Stack:** Node 24, Fastify 5, Svelte 5 runes, Vite 8, KaTeX 0.19, marked 18, DOMPurify 3, jsdom para los tests de la web, `@fontsource/literata` 5.3.0.

**Spec:** `docs/superpowers/specs/2026-10-23-germinacion-design.md` (y el original `2026-10-23-semillero-design.md`).

## Global Constraints

- Modelo siempre `opus`, nunca otro.
- Toda la interfaz y los prompts en español.
- Las escrituras del servidor pasan por `guard.proteger`. Las de una sesión, por `guard.verificar` con su lista de objetivos.
- Columna de lectura de la idea: `73.6rem`. Margen de glosas: `20rem`.
- Veredictos válidos: `aceptada | rechazada | aclaracion | cambios`. Color de `cambios`: `#cfe36a`.
- Tests con `node --test`, siempre en directorios temporales (`cfgTemporal`), nunca en `datos/` real.
- Comandos para el usuario en sintaxis fish, sin `!`.

## Review Focus

1. **Glosa sobre una idea que empieza a analizarse mientras la glosa corre.** El guard de una ejecución no debe revertir lo que escribe la otra.
2. **Mapa inválido o a medio escribir al cortar una ejecución `germinar`.** Debe restaurarse el anterior y quedar en `error` sin romper la página.
3. **Selección que empieza o acaba dentro de una fórmula KaTeX.** Se expande a la fórmula entera y su serialización es `$tex$`, nunca el texto duplicado de MathML y HTML.
4. **Ancla que ya no casa porque el documento fue enmendado o editado.** La glosa se muestra como huérfana, sin lanzar excepciones.
5. **Reanudar una idea pausada en germinación.** Debe retomarse como germinación, no como réplica de análisis.

---

### Task 1: Lectura, cursiva y test inestable

**Files:**
- Modify:
  - `web/src/main.js` (quitar el import de `400-italic`)
  - `web/src/estilos/base.css` (`@font-face` de Literata italic 400/600 bajo la familia `'EB Garamond'`, latin + latin-ext, `size-adjust: 88%`)
  - `web/src/vistas/Idea.svelte` (`.pagina { max-width: 73.6rem }`)
  - `test/cola.test.js` (esperar a que existan las llamadas en lugar de usar 30 ms fijos)

- [ ] Step 1: En el test «superar el 90 % de 5 h…», sustituye `await esperar()` por `await hasta(() => falso.llamadas.length === 5)`.
- [ ] Step 2: `npm test` cinco veces seguidas. Expected: 120/120 las cinco.
- [ ] Step 3: Escribe el CSS y el import. `npm run build`. Expected: el build termina y `dist/assets` contiene los woff2 de Literata italic.
- [ ] Step 4: Commit `feat: líneas más largas y cursiva legible (Literata 2°)`.

### Task 2: Veredicto «Cambio sugerido»

**Files:**
- Modify:
  - `server/engine/veredicto.js`
  - `server/engine/prompt.js`
  - `server/api/rutas.js` (`/api/resumen` con `cambios`)
  - `web/src/lib/estados.js`
  - `web/src/estilos/tokens.css` (`--cambios: #cfe36a`)
  - `web/src/vistas/Inicio.svelte` (contador)
  - `web/src/componentes/Dictamen.svelte` (sello)
- Test: `test/veredicto.test.js`, `test/prompt.test.js`, `test/api.test.js`

**Interfaces:**
- Produces:
  - `parsearDictamen` acepta `veredicto: cambios`.
  - `ETIQUETA_ESTADO.cambios = 'Cambio sugerido'` y `COLOR_ESTADO.cambios = '#cfe36a'`.
  - `resumen.cambios: number`.

- [ ] Step 1: Tests:
  - `acepta cambios como veredicto`: `meta.veredicto === 'cambios'`.
  - `el prompt define Cambio sugerido`: `promptSistema()` contiene `cambios` y «dirección correcta».
  - En api: `resumen cuenta las ideas en cambios`, con una idea en estado `cambios` → `cambios === 1`.
- [ ] Step 2: Ejecuta los tests. Expected: FAIL en los tres.
- [ ] Step 3: Implementa. En el prompt, añade una sección con el contenido obligatorio de «cambios» (qué está bien, cada cambio con su porqué y su efecto en el impacto, próximos pasos asumiendo los cambios, relación con otras aceptadas) y la advertencia de que no es un rechazo suavizado. Añádelo también al frontmatter documentado. Añade el contador «cambio sugerido / cambios sugeridos» en Inicio y el sello «Cambio sugerido».
- [ ] Step 4: `npm test`. Expected: todo verde.
- [ ] Step 5: Commit `feat: veredicto Cambio sugerido`.

### Task 3: Librería de anclas y serialización de selecciones

**Files:**
- Create: `web/src/lib/ancla.js`
- Test: `test/web-ancla.test.js` (jsdom + `crearRenderizador` real para generar HTML con KaTeX)

**Interfaces:**
- Produces:
  - `linealizar(raiz: Element) → { texto: string, piezas: Array<{ nodo: Node, inicio: number, fin: number, atomo: boolean }> }`. Una fórmula (`.katex`, o `.katex-display` si está en bloque) es un átomo con texto `$tex$` o `$$tex$$`. Una `img` es un átomo con texto `![alt](src)`. El resto son nodos de texto.
  - `expandirRango(raiz, range) → Range`: amplía los extremos para cubrir átomos enteros.
  - `serializar(raiz, range) → { markdown: string, imagenes: string[] }`. `imagenes` contiene las rutas `/archivos/...` sin el prefijo `/archivos/`.
  - `crearAncla(raiz, range) → { exacto, prefijo, sufijo }`, con 40 caracteres de contexto.
  - `localizar(raiz, ancla) → Range | null`. Busca todas las apariciones de `exacto` y elige la de mayor coincidencia de prefijo y sufijo.

- [ ] Step 1: Tests:
  - `linealizar sustituye la fórmula por su fuente`: el HTML de `'Sea $x^2$ grande'` → `texto === 'Sea $x^2$ grande'`.
  - `una selección que corta una fórmula se expande a la fórmula entera`.
  - `serializar texto + fórmula + imagen`: el markdown contiene `$\\sigma(W_1 x)$` y `![Figura 1](figuras/a.png)`, e `imagenes` es `['carpetas/c/ideas/i/figuras/a.png']`.
  - `crearAncla y localizar devuelven el mismo texto`.
  - `localizar desempata por contexto` entre dos apariciones iguales.
  - `localizar devuelve null si el fragmento ya no existe`.
- [ ] Step 2: `node --test test/web-ancla.test.js`. Expected: FAIL (el módulo no existe).
- [ ] Step 3: Implementa. Recorre con TreeWalker y salta los descendientes de los átomos. La fuente TeX sale de `annotation[encoding="application/x-tex"]`.
- [ ] Step 4: Expected: PASS. `npm test` verde.
- [ ] Step 5: Commit `feat: anclas y serialización de fragmentos`.

### Task 4: Motor de glosas (servidor)

**Files:**
- Create:
  - `server/store/glosas.js`
  - `server/engine/glosas.js`
- Modify:
  - `server/engine/guard.js` (`restaurar(rutas)`)
  - `server/engine/cola.js` (`objetivosActivos()`, `ajenosExternos` inyectable, `registrarCuota(ev)`, getter `pausadaPorCuota` en `estado()`)
  - `server/engine/prompt.js` (`promptGlosa()`, `mensajeGlosa()`, `argsGlosa()`)
  - `server/api/rutas.js`
  - `server/api/ws.js`
  - `server/index.js`
- Test: `test/glosas.test.js`, `test/guard.test.js`

**Interfaces:**
- Consumes: `crearCola`, `guard`, `ideas`, `ejecutar` (inyectable).
- Produces:
  - `crearAlmacenGlosas(cfg, { proteger })`: `listar(c, i)`, `obtener(c, i, id)`, `crear(c, i, datos)`, `actualizar(c, i, id, parche)`, `anadirMensaje(c, i, id, msg)`.
  - `crearMotorGlosas({ cfg, ideas, glosas, guard, cola, ejecutar })`, que es un EventEmitter con los eventos `'glosa'` `{ ref, glosa }` y `'glosa-evento'` `{ ref, id, ev }`:
    - `pedir(ref, { tipo, documento, ancla, fragmento, prompt })`;
    - `seguir(ref, id, prompt)`;
    - `objetivosActivos()`;
    - `recuperar()`.
  - Errores: `en-proceso` (409), `cuota` (409), `prompt-vacio` (400), `documento-invalido` (400), `glosa-no-existe` (404).
  - `argsGlosa({ sessionId, bifurcar, ajustes, mensaje })`: con `bifurcar`, añade `--resume id --fork-session`; sin `sessionId`, ningún flag de sesión; con `sessionId` y sin `bifurcar`, `--resume id`.
  - `parsearRespuestaGlosa(texto) → { correccion: 'acertada'|'parcial'|'erronea'|null, cuerpo }`.
  - Rutas:
    - `GET /api/carpetas/:c/ideas/:i/glosas`
    - `POST …/glosas`
    - `POST …/glosas/:g/seguir`
  - WebSocket: `{ tipo: 'glosa', ref, glosa }` y `{ tipo: 'glosa-evento', ref, id, ev }`.

- [ ] Step 1: Tests con `ejecutar` falso. La respuesta final llega como evento `result` con `.result`, y el `init` trae un `session_id` nuevo.
  - `explicar bifurca la sesión principal y guarda la respuesta`: args con `--resume S --fork-session`; la glosa queda `lista` con `mensajes[1].contenido`; `sessionId` es el del `init`.
  - `seguir retoma la sesión de la glosa sin bifurcar`.
  - `sin sesión principal la glosa empieza de cero`: sin `--resume`.
  - `corregir acertada que enmienda el dictamen se commitea y actualiza el veredicto`: el falso reescribe `hilo/002-claude.md` con `veredicto: rechazada` → `idea.estado === 'rechazada'`, `glosa.enmendado === true`, `idea.enmendados` incluye `'002-claude.md'`.
  - `una glosa no puede tocar otros archivos`: el falso escribe en `hilo/001-usuario.md` → se restaura.
  - `rechaza glosas con la idea en proceso` (409) `y con la cuota pausada`.
  - `corregir sin prompt falla` y `corregir sobre un documento del usuario falla`.
  - `la verificación de un análisis no revierte lo que escribe una glosa activa`: con la cola y una glosa simultáneas, el análisis termina mientras la glosa escribe `figuras/glosas/x.png` → el archivo sigue ahí.
  - `recuperar marca como error las glosas cortadas y restaura su documento`.
  - En guard: `restaurar devuelve a HEAD y borra lo no trackeado`.
- [ ] Step 2: Expected: FAIL.
- [ ] Step 3: Implementa.
  - El documento se valida con `^(hilo/\d{3}-claude\.md|hilo/\d{3}-usuario\.md|germinacion/nodos/[a-z0-9-]+\.md)$`. Corregir solo se permite sobre `-claude.md` o `germinacion/nodos/`.
  - Los objetivos de una glosa son `figuras/glosas/**` y, si es una corrección, el documento.
  - Al terminar: `guard.verificar({ propios, ajenosActivos: cola.objetivosActivos() + otras glosas })`, después `commitear`.
  - Si el documento es un dictamen que cambió y su frontmatter es válido, se actualiza la idea `{ estado, resumen, etapa }` solo si la idea no está `en-proceso`, y se añade el archivo a `idea.enmendados`.
  - La cola llama a `ajenosExternos()` en su `cerrar` para la lista `otros`.
- [ ] Step 4: Expected: PASS. `npm test` verde.
- [ ] Step 5: Commit `feat: motor de glosas con sesiones bifurcadas`.

### Task 5: Enmiendas y réplica posterior

**Files:**
- Modify:
  - `web/src/lib/markdown.js` (`Enmienda` en ENTORNOS; `ins` permitido por DOMPurify, que ya lo permite)
  - `web/src/estilos/manuscrito.css` (`del`, `ins`, `.entorno-enmienda`)
  - `server/engine/prompt.js` (el mensaje de réplica menciona `enmendados` pendientes)
  - `server/engine/cola.js` (vaciar `enmendados` tras una ejecución con dictamen)
- Test: `test/web-markdown.test.js`, `test/prompt.test.js`, `test/cola.test.js`

- [ ] Step 1: Tests:
  - `enmienda como entorno`: `> **Enmienda 1.** x` → `class="entorno entorno-enmienda"`.
  - `del e ins se conservan`.
  - `la réplica avisa de dictámenes enmendados sin contar la glosa`: `mensajeEjecucion({ tipo: 'replica', idea: { enmendados: ['002-claude.md'] } … })` contiene «002-claude.md fue enmendado».
  - `tras un dictamen nuevo se vacía enmendados`.
- [ ] Step 2: Expected: FAIL.
- [ ] Step 3: Implementa.
- [ ] Step 4: Expected: PASS.
- [ ] Step 5: Commit `feat: enmiendas visibles y aviso a la sesión principal`.

### Task 6: Glosas en la interfaz

**Files:**
- Create:
  - `web/src/componentes/Glosable.svelte` (envuelve un HTML renderizado: resalta, detecta la selección y coloca las glosas)
  - `web/src/componentes/PanelGlosa.svelte` (panel flotante Explicar/Corregir + prompt)
  - `web/src/componentes/Glosa.svelte` (tarjeta: fragmento citado, hilo, vivo, seguir)
  - `web/src/lib/glosas.svelte.js` (estado por idea, carga y suscripción al WebSocket)
- Modify:
  - `web/src/lib/api.js`
  - `web/src/lib/estado.svelte.js` (reenviar `glosa` y `glosa-evento`)
  - `web/src/componentes/Dictamen.svelte`
  - `web/src/vistas/Idea.svelte` (réplicas renderizadas dentro de Glosable; layout con margen)

**Interfaces:**
- Consumes:
  - Task 3: `linealizar`, `expandirRango`, `serializar`, `crearAncla`, `localizar`.
  - Task 4: rutas y mensajes WS.
- Produces: `<Glosable html documento autor glosas modo="auto|flotante">`. `autor` es `'claude'|'usuario'` y decide si se ofrece «Corregir».

- [ ] Step 1: Implementa:
  - Panel con transición de escala desde el punto de selección; clic en `img`, `figure` o `.katex-display` para seleccionarlo entero.
  - Resaltado con `CSS.highlights`, con un `Highlight` por estado (explicar, corregir o activa).
  - Margen: tarjetas a la altura del ancla, sin solaparse (las que chocan bajan) y una línea fina hasta el fragmento.
  - En modo flotante, la tarjeta se abre al pulsar el resaltado.
  - Glosas huérfanas al final.
- [ ] Step 2: Verificación en Chromium headless sobre datos de demo, sin capturar la pantalla del usuario: seleccionar una fórmula, pedir una explicación con el `ejecutar` real sustituido por `fake-claude`, y ver la glosa en el margen. Expected: la captura muestra el resaltado y la tarjeta.
- [ ] Step 3: `npm test` y `npm run build` verdes.
- [ ] Step 4: Commit `feat: glosas al margen para explicar y corregir`.

### Task 7: Germinación (servidor)

**Files:**
- Create:
  - `server/engine/mapa.js` (`validarMapa`)
  - `server/store/germinacion.js` (progreso y respuestas)
- Modify:
  - `server/engine/cola.js` (`germinar(ref, { mensajeUsuario })`; tipos `germinar` y `reanudar` según `idea.trabajo`; objetivos de germinación; validación del mapa al cerrar)
  - `server/engine/prompt.js` (`promptGerminacion()`, `mensajeGerminacion({ fase, idea, rutaIdea, respuestas, cambiosProgreso, peticion })`; `argsClaude` acepta `sistema`)
  - `server/api/rutas.js`
- Test: `test/mapa.test.js`, `test/germinacion.test.js`

**Interfaces:**
- Produces:
  - `validarMapa(obj) → { ok: true, mapa } | { ok: false, motivo }`, con las reglas del spec.
  - `crearAlmacenGerminacion(cfg, { proteger })`:
    - `leerMapa(c, i)` devuelve `mapa | null`;
    - `leerProgreso(c, i)`;
    - `guardarRespuestas(c, i, respuestas)`;
    - `marcarNodo(c, i, id, { estado, notas })`;
    - `cambiosDesdeEnvio(c, i)` devuelve un texto Markdown;
    - `marcarEnviado(c, i)`.
  - `cola.germinar(ref, { peticion })`:
    - solo si `estado === 'aceptada'`; si no, lanza `no-aceptada`;
    - encola `{ tipo: 'germinar' }` y deja `idea.trabajo = 'germinacion'`;
    - a la primera, `idea.germinacion = { fase: 'preparando', iniciada }`.
  - Al cerrar un `germinar`:
    - si el mapa es válido, el estado final es `aceptada` con `germinacion.fase = mapa.fase` y `germinacion.ultima`;
    - si no, se restauran los archivos de `germinacion/` desde git y el estado es `error` con un motivo que empieza por «Mapa inválido: »;
    - si se paró o se pausó, el estado es `pausada` o `detenida` (reanudable).
  - `tipoDe` devuelve `'reanudar'` también para germinación, y el mensaje de reanudar usa `mensajeGerminacion` con `fase: 'reanudar'` cuando `idea.trabajo === 'germinacion'`.
  - Desde `detenida` o `error` con `trabajo === 'germinacion'`, «Comenzar Análisis» la retoma como germinación (aparece en pendientes con la etiqueta `GERMINACIÓN`).
  - Rutas:
    - `POST …/germinar` `{ peticion? }`;
    - `GET …/germinacion` → `{ mapa, progreso }`;
    - `PUT …/germinacion/respuestas`;
    - `PATCH …/germinacion/nodos/:n`.
- [ ] Step 1: Tests:
  - mapa: `mapa válido`; `id duplicado`; `dependencia inexistente`; `ciclo`; `ruta fuera de germinacion`; `diagnóstico sin preguntas`; `recurso sin url ni archivo`.
  - germinacion:
    - `germinar una aceptada retoma la sesión principal con el prompt de germinación`: args con `--resume` y `--append-system-prompt` que contiene «germinación»; el mensaje dice `mapa.json`;
    - `germinar una no aceptada falla`;
    - `un mapa válido deja la idea aceptada con su fase`;
    - `un mapa inválido se restaura y deja error`;
    - `la germinación no puede escribir progreso.json`;
    - `reanudar una germinación pausada usa el mensaje de germinación`;
    - `cambiosDesdeEnvio lista nodos con estado nuevo y notas nuevas`;
    - `las respuestas del diagnóstico llegan en el mensaje`.
- [ ] Step 2: Expected: FAIL.
- [ ] Step 3: Implementa. Los objetivos de germinación son:
  - `${rutaIdea}/germinacion/mapa.json`, `germinacion/nodos/**`, `germinacion/recursos/**`;
  - `figuras/**` y `carpetas/<c>/notas.md`;
  - `notas-globales.md` va en `propios`.
- [ ] Step 4: Expected: PASS. `npm test` verde.
- [ ] Step 5: Commit `feat: germinación en el motor`.

### Task 8: Germinación (interfaz)

**Files:**
- Create:
  - `web/src/lib/arbol.js` (layout puro)
  - `web/src/componentes/Arbol.svelte` (SVG, pan/zoom, crecimiento)
  - `web/src/vistas/Germinacion.svelte`
  - `web/src/componentes/Cuestionario.svelte`
  - `web/src/componentes/LaminaNodo.svelte`
  - `web/src/componentes/Brote.svelte` (señal «Comenzar germinación» y transición de semilla)
- Modify:
  - `web/src/vistas/Idea.svelte` (con germinación delega en Germinacion; la semilla abre el manuscrito como lámina)
  - `web/src/lib/api.js`
- Test: `test/web-arbol.test.js`

**Interfaces:**
- Produces: `disponer(mapa) → { nodos: [{ id, x, y, tipo, capa }], ramas: [{ de, a, grosor }], hojas: [{ recurso, nodo, x, y }], caja }`.
  - La semilla en `(0, 0)`.
  - `y` es negativa hacia arriba: `-(capa + 1) * 140`.
  - Los estudios de una misma capa se reparten centrados alrededor de x = 0 (ordenados por el baricentro de sus padres).
  - Cada incógnita se coloca a ±220 en x de su padre de estudio, alternando lados, con y desplazada media capa.

- [ ] Step 1: Tests:
  - `la semilla está abajo y las capas suben`;
  - `los estudios sin dependencias son capa 0`;
  - `una incógnita cuelga a un lado de su estudio`;
  - `cada recurso es una hoja de su nodo`;
  - `ningún par de nodos se solapa` (distancia > 60).
- [ ] Step 2: Expected: FAIL.
- [ ] Step 3: Implementa el layout y después la vista:
  - Ramas con Bézier cúbicas y trazado animado con `stroke-dashoffset`; nodos que florecen escalonados.
  - Pan con puntero, zoom con rueda centrado en el cursor y encaje con doble clic.
  - Lámina del nodo con transición desde el nodo: View Transition, o FLIP si no hay soporte.
  - Cuestionario centrado, con escala de niveles y editor en las preguntas abiertas.
  - Panel de vivo lateral mientras corre.
  - «Comunicar avances / pedir cambios».
  - Y la señal «Comenzar germinación», con la semilla cayendo.
- [ ] Step 4: Verificación en Chromium headless con un mapa de demo (diagnóstico y mapa) y las capturas revisadas. `npm test` y `npm run build` verdes.
- [ ] Step 5: Commit `feat: página de germinación con árbol vivo`.

### Task 9: Prueba real y cierre

- [ ] Step 1: Datos temporales y servidor en otro puerto (`SEMILLERO_PUERTO=4418`, `SEMILLERO_DATOS` en el scratchpad). Con Opus real:
  - una glosa «Explicar» sobre una fórmula de un dictamen (comprobar que la sesión principal no cambia: el número de líneas del jsonl de la sesión principal no cambia);
  - el diagnóstico de una germinación.
- [ ] Step 2: README: glosas y germinación.
- [ ] Step 3: Revisión final de la rama completa con un revisor nuevo. Arreglar Critical e Important con TDD.
