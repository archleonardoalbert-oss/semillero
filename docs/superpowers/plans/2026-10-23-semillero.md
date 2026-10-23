# Semillero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App web local donde el usuario guarda ideas en carpetas y lanza sesiones de Claude Code (una por idea) que las dictaminan con honestidad, en vivo, con cola de 5 y pausa por cuota.

**Architecture:** Servidor Node (Fastify) que guarda todo como archivos Markdown/JSON en `datos/` (repo git propio para proteger los textos del usuario), lanza `claude -p` en stream-json como procesos hijos gestionados por una cola, y retransmite cada evento por WebSocket. Frontend Svelte 5 + Vite con editor Milkdown Crepe (WYSIWYG Markdown + KaTeX) y un renderizador propio de dictámenes (marked + KaTeX).

**Tech Stack:** Node 24 (ESM, `node:test`), Fastify 5.12, @fastify/static 10, @fastify/websocket 11, Svelte 5.57, Vite 8, @sveltejs/vite-plugin-svelte 7, @milkdown/crepe 7.22, katex 0.19, marked 18 + marked-katex-extension 5, dompurify 3, git, notify-send, Python 3 + matplotlib 3.11 (ya instalado).

**Spec:** `docs/superpowers/specs/2026-10-23-semillero-design.md`

## Global Constraints

- Toda la interfaz en español.
- Servidor solo en `127.0.0.1`, puerto `4417`.
- Datos en `~/Proyectos/semillero/datos/` (ruta configurable por env `SEMILLERO_DATOS`, los tests usan un dir temporal; **nunca** un test toca `datos/` real ni el cwd del repo).
- Modelo siempre `opus` (nunca Sonnet), `--effort high`; configurable en ajustes.
- Máximo 5 sesiones en paralelo.
- Pausa cuando `five_hour.utilization >= 0.90` o `seven_day.utilization >= 0.90` (umbrales editables).
- La app solo mata procesos que ella lanzó.
- Estados de idea exactamente: `borrador`, `en-proceso`, `aceptada`, `rechazada`, `aclaracion`, `replica-pendiente`, `detenida`, `pausada`, `error`.
- Etiquetas del panel exactamente: `NUEVA` (nunca analizada), `ANALIZADA` (ya tuvo dictamen).
- Textos de botones exactos: «Comenzar Análisis», «Detener Análisis», «Reanudar Investigación».

## Review Focus

1. Usuario edita/guarda otra idea mientras 5 sesiones corren → el guard no debe revertir sus cambios (test en Task 3).
2. El servidor se reinicia con ideas `en-proceso` → al arrancar pasan a `detenida` y se pueden relanzar retomando la misma sesión (test en Task 5).
3. La sesión termina sin escribir el dictamen o con frontmatter inválido → `error`, nunca `aceptada` por defecto (test en Task 4).
4. Detener una idea que aún está en cola (no arrancada) → sale de la cola y vuelve a su estado pendiente previo, no a `detenida` (test en Task 5).
5. Rutas con `..` o absolutas en `/archivos/*` o en subidas de imagen → 400, nunca leer/escribir fuera de `datos/` (test en Task 6).

---

## Estructura de archivos

```
package.json                 # scripts: dev, build, start, test
server/
  config.js                  # rutas, puerto, defaults de ajustes
  store/fsutil.js            # slugify, escritura atómica, lectura JSON, rutaSegura
  store/carpetas.js          # CRUD carpetas
  store/ideas.js             # CRUD ideas, hilo, estados, pendientes
  store/ajustes.js           # datos/estado.json → ajustes
  engine/guard.js            # git de datos/: commit, verificación y restauración
  engine/veredicto.js        # parseo del frontmatter del dictamen
  engine/prompt.js           # prompt de sistema y mensaje de cada ejecución
  engine/runner.js           # lanza claude, parsea stream, registro, resultado
  engine/cola.js             # concurrencia, detener, pausa por cuota, reanudar
  engine/notificar.js        # notify-send
  api/rutas.js               # REST
  api/ws.js                  # WebSocket de eventos
  index.js                   # arranque
test/                        # node:test, uno por módulo
test/fixtures/fake-claude.mjs  # binario falso que reproduce un stream-json
web/                         # raíz de Vite
  index.html
  src/main.js, App.svelte
  src/lib/api.js, estado.svelte.js, ruta.svelte.js, seleccion.js, eventos.js, markdown.js
  src/vistas/Inicio.svelte, Carpeta.svelte, Idea.svelte, Lista.svelte, Ajustes.svelte
  src/componentes/PanelSeleccion.svelte, Editor.svelte, Dictamen.svelte, EnVivo.svelte,
                  Firmamento.svelte, BotonPrincipal.svelte, Contador.svelte, Aviso.svelte
  src/estilos/tokens.css, base.css, manuscrito.css
systemd/semillero.service
```

---

### Task 1: Andamiaje y almacén de carpetas

**Files:**
- Create: `package.json`, `.gitignore` (`node_modules`, `dist`, `datos/`), `server/config.js`, `server/store/fsutil.js`, `server/store/carpetas.js`
- Test: `test/fsutil.test.js`, `test/carpetas.test.js`

**Interfaces:**
- Produces:
  - `config.js`: `export function crearConfig({ datos?: string } = {}) -> { datos, puerto: 4417, host: '127.0.0.1', claudeBin: process.env.SEMILLERO_CLAUDE ?? 'claude' }`
  - `fsutil.js`: `slugify(texto) -> string` (minúsculas, sin acentos, `[a-z0-9-]`, máx 60, nunca vacío → `'sin-titulo'`); `slugUnico(dir, base) -> Promise<string>` (añade `-2`, `-3`…); `escribirAtomico(ruta, contenido) -> Promise<void>` (tmp + rename, crea dirs); `leerJSON(ruta, defecto) -> Promise<any>`; `rutaSegura(base, relativa) -> string` (lanza `Error('ruta-invalida')` si sale de `base` o es absoluta).
  - `carpetas.js`: `crearAlmacenCarpetas(cfg)` → `{ listar(): Promise<Carpeta[]>, crear({nombre, color}): Promise<Carpeta>, renombrar(id, nombre), borrar(id) }`. `Carpeta = { id (slug), nombre, color, creada (ISO), orden }`. Guarda `carpetas/<id>/carpeta.json` y crea `notas.md` vacío con encabezado `# Notas de <nombre>`. `borrar` lanza `Error('carpeta-no-vacia')` si tiene ideas. Crea `notas-globales.md` (encabezado `# Notas globales`) si no existe al primer uso.

- [ ] **Step 1:** `npm init`, `"type": "module"`, scripts `"test": "node --test test/"`; instalar `fastify@5.12.7 @fastify/static@10.1.7 @fastify/websocket@11.3.4`.
- [ ] **Step 2: Tests que fallan** — `slugify('Teoría de Números!') === 'teoria-de-numeros'`; `slugify('***') === 'sin-titulo'`; `rutaSegura('/a', '../x')` lanza `ruta-invalida`; `rutaSegura('/a', '/etc/passwd')` lanza; `slugUnico` devuelve `ia-2` si `ia` existe; `crear({nombre:'IA', color:'#7aa2ff'})` → `id === 'ia'` y existen `carpeta.json`, `notas.md`; `listar()` ordena por `orden`; `borrar` con ideas lanza `carpeta-no-vacia`. Cada test usa `fs.mkdtemp(os.tmpdir())`.
- [ ] **Step 3:** Ejecutar `npm test` → FAIL.
- [ ] **Step 4:** Implementar.
- [ ] **Step 5:** `npm test` → PASS. Commit `feat: almacén de carpetas`.

### Task 2: Almacén de ideas, hilo y ajustes

**Files:**
- Create: `server/store/ideas.js`, `server/store/ajustes.js`
- Test: `test/ideas.test.js`, `test/ajustes.test.js`

**Interfaces:**
- Consumes: `fsutil`, `crearConfig`.
- Produces `crearAlmacenIdeas(cfg, { alEscribir?: (rutasRel: string[]) => Promise<void> })` → todas las escrituras del usuario llaman a `alEscribir` con las rutas relativas a `datos/` (Task 3 lo usa para commitear):
  - `crear(carpetaId, { titulo, cuerpo }) -> Idea` → crea `idea.json` y `hilo/001-usuario.md`; `estado: 'borrador'`.
  - `obtener(carpetaId, ideaId) -> IdeaCompleta` = `Idea` + `hilo: Mensaje[]` donde `Mensaje = { n, autor: 'usuario'|'claude', archivo, contenido, meta? }` (meta = frontmatter parseado en claude).
  - `listar({ carpetaId?, estado? }) -> Idea[]`.
  - `editarOriginal(carpetaId, ideaId, { titulo, cuerpo })` → si la idea ya tuvo dictamen, además pone `estado: 'replica-pendiente'` y `editadaTrasDictamen: true`.
  - `responder(carpetaId, ideaId, cuerpo)` → crea siguiente `NNN-usuario.md`, `estado: 'replica-pendiente'`. Lanza `Error('sin-dictamen')` si no hay dictamen previo.
  - `siguienteArchivo(carpetaId, ideaId) -> 'NNN-claude.md'` (número = último + 1, 3 dígitos).
  - `actualizar(carpetaId, ideaId, parche) -> Idea` (merge en `idea.json`; para estado, sessionId, etc.).
  - `pendientes() -> Array<{ carpeta: Carpeta, ideas: Array<Idea & { etiqueta: 'NUEVA'|'ANALIZADA' }> }>` — estados `borrador|replica-pendiente|detenida|error`; `NUEVA` si no tiene ningún `*-claude.md`, si no `ANALIZADA`. Carpetas sin pendientes se omiten.
  - `guardarAdjunto(carpetaId, ideaId, nombre, buffer) -> rutaRel` (en `adjuntos/`, nombre saneado con slug + extensión de lista blanca png/jpg/jpeg/gif/webp/svg).
  - `Idea = { id, carpetaId, titulo, creada, actualizada, estado, estadoPrevio?, sessionId?, etapa?, resumen?, ultimoVeredicto?, editadaTrasDictamen? }`.
- Produces `crearAjustes(cfg)` → `{ leer(): Ajustes, guardar(parcial) }`, `Ajustes = { modelo: 'opus', esfuerzo: 'high', paralelo: 5, umbral5h: 0.90, umbral7d: 0.90, ultimoAnalisis: null }`.

- [ ] **Step 1: Tests que fallan** — crear → `hilo/001-usuario.md` contiene el cuerpo y `estado==='borrador'`; `pendientes()` la etiqueta `NUEVA`; tras escribir a mano `002-claude.md` + `actualizar(estado:'aceptada')`, no está en pendientes; `responder` → `003-usuario.md`, `estado==='replica-pendiente'`, etiqueta `ANALIZADA`; `responder` sin dictamen lanza `sin-dictamen`; `editarOriginal` tras dictamen → `replica-pendiente`; `siguienteArchivo` → `'004-claude.md'`; `guardarAdjunto(..., 'a.exe')` lanza; `alEscribir` recibe `['carpetas/ia/ideas/x/hilo/001-usuario.md', 'carpetas/ia/ideas/x/idea.json']`; ajustes por defecto con `modelo==='opus'` y `paralelo===5`.
- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** Implementar. **Step 4:** PASS. **Step 5:** Commit `feat: almacén de ideas e hilo`.

### Task 3: Guard git y parser de veredicto

**Files:**
- Create: `server/engine/guard.js`, `server/engine/veredicto.js`
- Test: `test/guard.test.js`, `test/veredicto.test.js`

**Interfaces:**
- Produces `crearGuard(cfg)` → `{ iniciar(): Promise<void>` (git init en `datos/` si no existe, `.gitignore` con `**/registro/`, commit inicial; user.name/email locales `Semillero`)`, commitear(rutasRel: string[] | 'todo', mensaje): Promise<void>`, `verificar({ propios: string[] /* rutas permitidas para esta ejecución, globs: hilo/NNN-claude.md, figuras/**, notas de su carpeta, notas-globales.md */, ajenosActivos: string[] /* objetivos de otras ejecuciones en curso, incl. sus figuras/** */ }) -> Promise<{ restaurados: string[] }>` }`. Todas las operaciones git pasan por un mutex interno (una a la vez).
- `verificar`: `git status --porcelain -uall`; cada ruta cambiada que no casa con `propios` ni `ajenosActivos` se restaura (`git checkout HEAD -- ruta` si está trackeada, borrar si es nueva). Como el servidor commitea cada escritura del usuario al momento (via `alEscribir`), cualquier cambio no commiteado fuera de lo permitido es ajeno.
- Produces `parsearDictamen(texto) -> { meta: { veredicto, etapa, resumen }, cuerpo } | null` — frontmatter entre `---` al inicio; `veredicto ∈ {aceptada, rechazada, aclaracion}`, `etapa ∈ {1, 2}`; `resumen` string no vacío. Cualquier otra cosa → `null`.

- [ ] **Step 1: Tests que fallan** — (repo temporal) sesión simulada modifica `hilo/001-usuario.md` y crea `hilo/002-claude.md` → `verificar` restaura el primero, conserva el segundo, `restaurados` = `['carpetas/ia/ideas/x/hilo/001-usuario.md']`; **Review Focus 1:** el usuario guarda otra idea vía `commitear` durante la ejecución → no se restaura; archivo objetivo de otra ejecución activa → no se restaura; archivo nuevo ajeno (`carpetas/ia/ideas/y/idea.json` modificado) → restaurado. `parsearDictamen` con frontmatter válido → meta; sin frontmatter → `null`; `veredicto: quizas` → `null`; `etapa: 3` → `null`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar (child_process `execFile('git', [...], { cwd: datos })`). **Step 4:** PASS. **Step 5:** Commit `feat: guard git y parser de dictamen`.

### Task 4: Prompt y runner de Claude

**Files:**
- Create: `server/engine/prompt.js`, `server/engine/runner.js`, `test/fixtures/fake-claude.mjs`
- Test: `test/prompt.test.js`, `test/runner.test.js`

**Interfaces:**
- Consumes: `parsearDictamen`, almacén de ideas.
- Produces `promptSistema() -> string` — en español; contiene literalmente: honestidad total y prohibición de complacencia («el peor resultado es que el usuario pierda tiempo en algo sin sentido»); las dos etapas (filtro con búsqueda breve solo si hace falta; investigación profunda con fuentes fiables y recientes); el contenido obligatorio según veredicto (aceptada: opinión completa, próximos pasos, impacto real, complementos con otras ideas **aceptadas**; rechazada: por qué no vale la pena, caminos alternativos; aclaracion: preguntas concretas y por qué cambian el veredicto, solo si de verdad no puede juzgar); formato de salida: Markdown + LaTeX KaTeX (`$…$`, `$$…$$`, `\tag{n}` para numerar), entornos tipo `> **Definición 1.**`/`> **Teorema 1.**`, figuras `![Figura N. pie](figuras/archivo.png)` generadas con `python3` + matplotlib en `figuras/` de su idea, sección final `## Referencias` con enlaces; el frontmatter exacto (`veredicto`, `etapa`, `resumen`); qué puede leer (todo `datos/`, incluidos `registro/` de otras ideas) y escribir (solo su archivo de dictamen, sus `figuras/`, y **añadir al final** de `notas.md` de su carpeta y `notas-globales.md` con encabezado `### <titulo idea> · <fecha>`); prohibición de modificar cualquier otro archivo o escribir fuera de `datos/`.
- `mensajeEjecucion({ tipo: 'inicial'|'replica'|'reanudar', idea, carpeta, rutaIdea, archivoDestino, replica? }) -> string` — inicial: «Analiza la idea en `<rutaIdea>` (lee `hilo/001-usuario.md` y `adjuntos/`)…»; replica: incluye el texto de la réplica y si `editadaTrasDictamen`, avisa de que la idea original cambió; reanudar: «Tu ejecución se interrumpió; continúa donde la dejaste». Todos terminan con la frase exacta `Escribe tu dictamen en <archivoDestino>` (ruta relativa a `datos/`).
- `argsClaude({ sessionId, nueva: boolean, ajustes, mensaje }) -> string[]` = `['-p', mensaje, '--output-format','stream-json','--verbose','--include-partial-messages', nueva ? '--session-id' : '--resume', sessionId, '--model', ajustes.modelo, '--effort', ajustes.esfuerzo, '--append-system-prompt', promptSistema(), '--permission-mode','dontAsk', '--allowedTools', 'Read Glob Grep WebSearch WebFetch Write Edit Bash(python3:*) Bash(mkdir:*) Bash(ls:*)', '--safe-mode']` — `--safe-mode` evita que los hooks/plugins del usuario (p. ej. superpowers) contaminen la sesión.
- Produces `ejecutar({ cfg, args, cwd, rutaRegistro, alEvento: (ev) => void, señal: AbortSignal }) -> Promise<{ codigo, resultado?: object, rateLimit?: object, abortado: boolean }>` — spawn de `cfg.claudeBin`, parsea stdout por líneas JSON, escribe cada línea en `rutaRegistro` (jsonl), llama `alEvento(ev)` por cada evento, guarda el último `rate_limit_event.rate_limit_info`; al abortar: `SIGINT`, y `SIGTERM` a los 5 s si sigue vivo.
- `fake-claude.mjs`: lee env `FAKE_ESCENARIO` (`ok`, `sin-dictamen`, `lento`, `cuota`) y emite líneas stream-json (init, deltas de thinking/texto, un `tool_use` WebSearch, `rate_limit_event` con `utilization` 0.5 o 0.95 en `cuota`, `result`); en `ok` escribe el archivo destino (último argumento ruta tras «Escribe tu dictamen en ») con frontmatter válido.

- [ ] **Step 0: Verificación real del CLI (una vez, manual)** — en un dir temporal: `claude -p "Busca en la web la versión actual de KaTeX y escribe solo el número en v.txt" --output-format stream-json --verbose --model opus --effort low --permission-mode dontAsk --allowedTools "WebSearch Write" --safe-mode --session-id <uuid>` → existe `v.txt`, hay `tool_use` WebSearch en el stream, sin eventos de hooks del usuario. Luego `--resume <uuid> -p "¿qué número escribiste?"` → responde coherente. Si algún flag no funciona, ajustar `argsClaude` y anotarlo en el plan.
- [ ] **Step 1: Tests que fallan** — `promptSistema()` incluye `'veredicto:'`, `'aclaracion'`, `'## Referencias'`, `'notas-globales.md'`; `argsClaude({nueva:true})` contiene `--session-id` y no `--resume`, y `nueva:false` al revés; contiene `'opus'` y `'--safe-mode'`; `ejecutar` con fake `ok` → `alEvento` recibe ≥1 `stream_event`, el registro jsonl tiene las mismas líneas, `rateLimit.unifiedWindows.five_hour.utilization === 0.5`; con `lento` + abort → `abortado: true` en < 6 s.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS. **Step 5:** Commit `feat: prompt y runner de claude`.

### Task 5: Cola, pausa por cuota, reanudación y recuperación

**Files:**
- Create: `server/engine/cola.js`, `server/engine/notificar.js`
- Test: `test/cola.test.js`

**Interfaces:**
- Consumes: ideas, ajustes, guard, `ejecutar`, `argsClaude`, `mensajeEjecucion`, `parsearDictamen`.
- Produces `crearCola({ cfg, ideas, ajustes, guard, ejecutar?, notificar? })` → EventEmitter con:
  - `lanzar(refs: Array<{carpetaId, ideaId}>)` → guarda `estadoPrevio`, `estado: 'en-proceso'`, encola; arranca hasta `ajustes.paralelo`.
  - `detener(refs)` → si en ejecución: aborta, estado `detenida`; si en cola: la saca y restaura `estadoPrevio`.
  - `reanudar(refs)` → solo acepta ideas `pausada` (las demás se ignoran); tipo de mensaje `reanudar`; activa `ignorarUmbralHasta = resetsAt` de la ventana que provocó la pausa.
  - `estado() -> { ejecutando: Ref[], enCola: Ref[], pausadaPorCuota: boolean, cuota: { cincoHoras, sieteDias, resetsAt } | null }`.
  - `recuperar()` (al arrancar) → toda idea `en-proceso` pasa a `detenida`.
  - Eventos emitidos: `'evento'` `{ ref, ev }` (cada línea del stream), `'idea'` `{ ref, idea }` (cambio de estado), `'cola'` `estado()`, `'pausa'` `{ motivo: 'cuota', cuota }`.
- Flujo de una ejecución: `sessionId` = el de la idea o `crypto.randomUUID()` (nueva) → `guard.commitear('todo', 'antes <ref>')` → `ejecutar` con `cwd = datos`, registro `registro/<ISO>.jsonl` → `guard.verificar` → leer `archivoDestino` y `parsearDictamen`: válido → `estado = meta.veredicto`, `etapa`, `resumen`, `ultimoVeredicto`; inválido o ausente → `error` (**Review Focus 3**) → `guard.commitear('todo', 'tras <ref>')`.
- Pausa: en cada `rate_limit_event`, si `five_hour.utilization >= umbral5h` o `seven_day.utilization >= umbral7d` y `Date.now()/1000 < ignorarUmbralHasta` es falso → `pausadaPorCuota = true`, abortar las en ejecución → `pausada`; las en cola → `estadoPrevio`; `notificar('Semillero', 'Investigación pausada: cuota de 5 h al 90 %')`; emitir `'pausa'`. Un `result` con `is_error` por límite de uso también pausa. `pausadaPorCuota` se pone a `false` cuando no queda ninguna idea `pausada`.
- `notificar(titulo, cuerpo)` → `execFile('notify-send', ['-a','Semillero', titulo, cuerpo])`, errores ignorados.

- [ ] **Step 1: Tests que fallan** (con `ejecutar` falso inyectado y `ajustes.paralelo` real 5) — lanzar 7 → 5 `ejecutando`, 2 `enCola`; al terminar una arranca la siguiente; fake `ok` → `aceptada` con `resumen`; fake `sin-dictamen` → `error`; **Review Focus 4:** `detener` de una en cola → vuelve a `borrador`; detener en ejecución → `detenida`; fake `cuota` (0.95) → todas las ejecutándose `pausada`, las en cola a su estado previo, `notificar` llamado una vez, evento `'pausa'`; `reanudar` de una `borrador` no hace nada; `reanudar` de una `pausada` la ejecuta con tipo `reanudar` y no vuelve a pausar con 0.95 antes de `resetsAt`; **Review Focus 2:** `recuperar()` con una idea `en-proceso` → `detenida`, y relanzarla usa `--resume` con su `sessionId`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS. **Step 5:** Commit `feat: cola con pausa por cuota`.

### Task 6: API HTTP, WebSocket y servicio

**Files:**
- Create: `server/api/rutas.js`, `server/api/ws.js`, `server/index.js`, `systemd/semillero.service`
- Test: `test/api.test.js` (con `fastify.inject`)

**Interfaces:**
- Produces `construirApp(cfg, { cola? }) -> FastifyInstance` y REST bajo `/api`:
  - `GET /api/resumen` → `{ aceptadas, rechazadas, enProceso, aclaracion, pausadas, cola: cola.estado() }`
  - `GET/POST /api/carpetas`, `PATCH/DELETE /api/carpetas/:c`, `GET /api/carpetas/:c/notas`, `GET /api/notas-globales`
  - `GET /api/ideas?estado=&carpeta=`, `POST /api/carpetas/:c/ideas`, `GET/PATCH /api/carpetas/:c/ideas/:i`, `POST /api/carpetas/:c/ideas/:i/replica`, `POST /api/carpetas/:c/ideas/:i/adjuntos` (body crudo, `?nombre=`; límite 20 MB) → `{ ruta }`
  - `GET /api/carpetas/:c/ideas/:i/registros` → lista; `GET .../registros/:archivo` → jsonl
  - `GET /api/pendientes` → `ideas.pendientes()`; `GET /api/pausadas` → mismo formato agrupado, solo `pausada`; `GET /api/activas` → agrupado, `ejecutando` + `enCola`
  - `POST /api/analisis/lanzar|detener|reanudar` body `{ refs }`
  - `GET/PUT /api/ajustes`
  - `GET /archivos/*` → sirve desde `datos/` con `rutaSegura` (**Review Focus 5**)
  - Estáticos de `web/dist` en `/` (fallback a `index.html`).
- `WS /ws` → al conectar envía `{tipo:'cola', datos}`; reenvía `'evento'` (`{tipo:'evento', ref, ev}`), `'idea'`, `'cola'`, `'pausa'`.
- `index.js`: `crearConfig`, `guard.iniciar()`, `cola.recuperar()`, `listen({host:'127.0.0.1', port:4417})`.
- `systemd/semillero.service` (unidad de usuario): `ExecStart=/usr/bin/node %h/Proyectos/semillero/server/index.js`, `Restart=on-failure`, `WantedBy=default.target`, `Environment=PATH=…` incluyendo `%h/.local/bin` (donde está `claude`; verificar con `which claude`), `OOMScoreAdjust=-500` y `ManagedOOMPreference=avoid` (systemd-oomd ya mató otros servicios del usuario).

- [ ] **Step 1: Tests que fallan** — `POST /api/carpetas` → 201; crear idea y `GET /api/pendientes` la trae con `NUEVA`; `GET /archivos/..%2F..%2Fetc%2Fpasswd` → 400; adjunto con `nombre=../x.png` → guarda como `x.png` dentro de `adjuntos/` (o 400); `POST /api/analisis/lanzar` con cola falsa → la cola recibe los refs; `GET /api/resumen` cuenta estados.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS. **Step 5:** Commit `feat: api http y websocket`.

### Task 7: Frontend base, estética e Inicio

**Files:**
- Create: `web/index.html`, `web/vite.config.js` (root `web`, proxy `/api`, `/archivos`, `/ws` → 4417, build a `web/dist`), `web/src/main.js`, `App.svelte`, `lib/api.js`, `lib/ruta.svelte.js`, `lib/estado.svelte.js`, `estilos/tokens.css`, `estilos/base.css`, `componentes/Firmamento.svelte`, `componentes/BotonPrincipal.svelte`, `componentes/Contador.svelte`, `componentes/Aviso.svelte`, `vistas/Inicio.svelte`, `vistas/Lista.svelte`
- Test: `test/web-boton.test.js` (lógica pura)

**Interfaces:**
- Produces `lib/ruta.svelte.js`: router por hash `#/`, `#/carpeta/:c`, `#/idea/:c/:i`, `#/lista/:estado`, `#/ajustes`; `ir(ruta)` con View Transitions API (`document.startViewTransition`) cuando exista.
- `lib/estado.svelte.js`: estado global reactivo (`$state`) con `resumen`, `cola`, `carpetas`; conecta `/ws` con reconexión; expone `suscribir(ref, fn)` para eventos de una idea.
- `lib/boton.js`: `modoBoton({ cola, pausadas }) -> 'reanudar'|'detener'|'comenzar'` — `pausadas > 0` → `reanudar`; `ejecutando+enCola > 0` → `detener`; si no `comenzar`. (Con modo `detener`/`reanudar` el panel ofrece enlace secundario a «Comenzar Análisis» para lanzar nuevas.)
- Diseño (usar la skill `frontend-design` al implementar): fondo casi negro azulado; `Firmamento.svelte` = canvas animado donde cada carpeta es una constelación y cada idea un punto de luz (color por estado: ámbar aceptada `#e0a458`, rojo apagado rechazada, blanco frío nueva, violeta aclaración, pulso vivo en proceso); parallax suave con el ratón; contadores grandes con números animados; el botón principal con morph de texto entre modos; transiciones de vista con View Transitions (el punto de una idea se expande en su página). Respetar `prefers-reduced-motion`. Tipografías vía `@fontsource` (nada de CDN en runtime; app local): EB Garamond (cuerpo manuscrito), una sans geométrica para UI, una mono para el en vivo.
- `Lista.svelte`: ideas de un estado agrupadas por carpeta (de `GET /api/ideas?estado=`).

- [ ] **Step 1:** Instalar `svelte@5.57.2 vite@8.3.5 @sveltejs/vite-plugin-svelte@7.3.1` y fuentes.
- [ ] **Step 2: Test que falla** — `modoBoton({cola:{ejecutando:[],enCola:[]},pausadas:0})==='comenzar'`; con 1 ejecutando → `'detener'`; con pausadas 2 y 1 ejecutando → `'reanudar'`.
- [ ] **Step 3:** FAIL → implementar → PASS.
- [ ] **Step 4:** `npm run build` sin errores; `npm start` y `curl -s localhost:4417/ | grep -q '<div id="app"'`.
- [ ] **Step 5:** Commit `feat: frontend base e inicio`.

### Task 8: Panel de selección (Comenzar / Detener / Reanudar)

**Files:**
- Create: `web/src/lib/seleccion.js`, `web/src/componentes/PanelSeleccion.svelte`
- Test: `test/web-seleccion.test.js`

**Interfaces:**
- Produces `seleccion.js`: `crearSeleccion(grupos: Array<{carpeta, ideas}>)` → `{ marcadas: Set<string> /* 'c/i' */, alternarIdea(c,i), alternarCarpeta(c), alternarTodas(), estadoCarpeta(c) -> 'ninguna'|'parcial'|'todas', estadoTodas() -> idem, refs() -> Array<{carpetaId, ideaId}> }`. Empieza vacía. `alternarCarpeta` marca todas si no estaban todas, si no desmarca todas; igual `alternarTodas`.
- `PanelSeleccion.svelte` props `{ modo: 'comenzar'|'detener'|'reanudar', alCerrar }`: carga `GET /api/pendientes` | `/api/activas` | `/api/pausadas`; casilla por carpeta (con estado parcial `indeterminate`), por idea con etiqueta `NUEVA`/`ANALIZADA` (en `detener`: `EN CURSO`/`EN COLA`; en `reanudar`: `PAUSADA`), botón «Marcar todas», botón de acción (`Analizar N`, `Detener N`, `Reanudar N`) deshabilitado con 0; en `reanudar`, aviso con la hora de reinicio de la ventana de 5 h si aún no pasó; enlace secundario «Comenzar análisis de ideas nuevas» en modos `detener`/`reanudar`. Animación de entrada del panel y de las casillas.

- [ ] **Step 1: Tests que fallan** — inicial `refs().length===0`; `alternarCarpeta('ia')` con 3 ideas → `estadoCarpeta('ia')==='todas'` y 3 refs; luego `alternarIdea('ia','x')` → `'parcial'`; `alternarCarpeta('ia')` desde parcial → `'todas'`; `alternarTodas()` dos veces → 0 refs.
- [ ] **Step 2:** FAIL → implementar → PASS. **Step 3:** Commit `feat: panel de selección`.

### Task 9: Carpeta e Idea (manuscrito, editor, dictámenes)

**Files:**
- Create: `web/src/vistas/Carpeta.svelte`, `web/src/vistas/Idea.svelte`, `web/src/componentes/Editor.svelte`, `web/src/componentes/Dictamen.svelte`, `web/src/lib/markdown.js`, `web/src/estilos/manuscrito.css`
- Test: `test/web-markdown.test.js`

**Interfaces:**
- Consumes: API de Task 6.
- Produces `markdown.js`: `renderizarDictamen(md, baseArchivos) -> html` — marked + marked-katex-extension (`throwOnError: false`, KaTeX con `\tag`), imágenes con título → `<figure><img><figcaption>`, rutas relativas `figuras/…`/`adjuntos/…` reescritas a `/archivos/<baseArchivos>/…`, enlaces externos `target=_blank rel=noopener`, blockquotes que empiezan por `**Definición|Teorema|Lema|Proposición|Corolario|Observación N.**` → `<aside class="entorno entorno-<tipo>">`, salida saneada con DOMPurify (permitiendo MathML/clases KaTeX).
- `Editor.svelte` props `{ valor, alGuardar(md), alSubirImagen(file) -> Promise<url> }` — Milkdown Crepe con features LaTeX e ImageBlock (`onUpload` → `POST .../adjuntos`), tema oscuro propio; guarda con Ctrl+S y autoguardado con debounce de 1,5 s; la URL guardada en el Markdown es relativa (`adjuntos/x.png`) y se muestra vía `/archivos/...`.
- `Idea.svelte`: título editable; hilo en orden; mensajes del usuario con `Editor` (el original editable; réplicas pasadas en solo lectura) en el estilo «usuario» (acento azul `#7aa2ff`, encabezado sans, etiqueta «Tú · fecha»); dictámenes con `Dictamen.svelte` en el estilo «Claude» (filete ámbar `#e0a458`, encabezado en versalitas serif, sello de estado ACEPTADA/RECHAZADA/NECESITA ACLARACIÓN, etapa, fecha, resumen destacado); caja de réplica al final si hay dictamen (destacada si `aclaracion`); `EnVivo` arriba si está en proceso; selector de registros pasados.
- `Carpeta.svelte`: ideas de la carpeta con estado y fecha, «Nueva idea» (crea y navega), lector de `notas.md`, renombrar/borrar carpeta.

- [ ] **Step 1: Tests que fallan** — `renderizarDictamen('$$E=mc^2\\tag{1}$$','carpetas/ia/ideas/x')` contiene `class="katex-display"` y `(1)`; `'![Figura 1. Pérdida](figuras/a.png)'` → `<figure>` con `src="/archivos/carpetas/ia/ideas/x/figuras/a.png"` y `<figcaption>Figura 1. Pérdida</figcaption>`; `'<script>alert(1)</script>'` no produce `<script`; `'> **Teorema 1.** Todo…'` → `class="entorno entorno-teorema"`. (Ejecutar con `node --test` usando `jsdom` para DOMPurify: instalar `jsdom` como devDependency.)
- [ ] **Step 2:** FAIL → implementar → PASS.
- [ ] **Step 3:** Verificación manual en el navegador (sin capturas de pantalla del escritorio del usuario): crear carpeta, idea con fórmula `$\sum_i x_i$` e imagen pegada; recargar y comprobar que persiste en `datos/.../hilo/001-usuario.md` y `adjuntos/`.
- [ ] **Step 4:** Commit `feat: manuscrito, editor y dictámenes`.

### Task 10: Vista en vivo

**Files:**
- Create: `web/src/lib/eventos.js`, `web/src/componentes/EnVivo.svelte`
- Test: `test/web-eventos.test.js`

**Interfaces:**
- Produces `eventos.js`: `crearTranscripcion()` → `{ aplicar(ev), bloques: Bloque[] }` con `Bloque = { tipo: 'pensamiento'|'texto'|'herramienta'|'resultado'|'sistema', texto, herramienta?, entrada?, url?, query?, terminado }` — `stream_event` `content_block_start/delta/stop` construye bloques de `thinking`/`text` incrementales; `tool_use` (de `assistant` o `input_json_delta`) → bloque herramienta con `query` (WebSearch) o `url` (WebFetch) o ruta (Read/Write); `user` con `tool_result` → bloque resultado truncado a 600 caracteres; `rate_limit_event` → sistema con % de la ventana; `result` → sistema «Terminado en X min».
- `EnVivo.svelte` props `{ ref }`: al montar descarga el registro actual (`GET .../registros/<último>`) y lo aplica, luego se suscribe al WS; estética de terminal refinada (mono, pensamiento en gris tenue itálico, búsquedas con icono y la query, URLs clicables, auto-scroll que se suelta si el usuario sube).

- [ ] **Step 1: Tests que fallan** — aplicar fixture de `test/fixtures/stream-ejemplo.jsonl` (sacado del fake `ok`) → hay un bloque `pensamiento` con el texto concatenado de los deltas, un bloque `herramienta` con `query` no vacía, un `sistema` final.
- [ ] **Step 2:** FAIL → implementar → PASS. **Step 3:** Commit `feat: vista en vivo`.

### Task 11: Ajustes, pulido, instalación y prueba real

**Files:**
- Create: `web/src/vistas/Ajustes.svelte`, `README.md` (corto, en español: arrancar, servicio, dónde están los datos)
- Modify: lo que pida el pulido

- [ ] **Step 1:** `Ajustes.svelte`: modelo (texto, por defecto `opus`), esfuerzo, umbrales 5 h / 7 días (%), paralelo (1–5) → `PUT /api/ajustes`; muestra la cuota actual.
- [ ] **Step 2:** Pase de pulido con la skill `frontend-design`: transiciones entre todas las vistas, estados vacíos con personalidad (primera carpeta), `Aviso.svelte` al recibir `'pausa'`, accesibilidad de teclado en el panel.
- [ ] **Step 3:** `npm test` → todo PASS; `npm run build` OK.
- [ ] **Step 4:** Instalar servicio: copiar unidad a `~/.config/systemd/user/`, `systemctl --user daemon-reload && systemctl --user enable --now semillero` → `curl -s localhost:4417/api/resumen` responde.
- [ ] **Step 5: Prueba real de punta a punta** con una idea de prueba corta en una carpeta «Pruebas» (avisar antes al usuario porque consume cuota): lanzar, ver eventos en vivo por WS (`curl`/script), dictamen escrito con frontmatter válido, estado final correcto, `guard` sin restauraciones, réplica → segunda ejecución con `--resume` responde con contexto. Borrar la carpeta de prueba al terminar.
- [ ] **Step 6:** Commit `feat: ajustes, pulido e instalación`.
