# Semillero — almacén de pensamientos con dictamen de Claude

Fecha: 2026-10-23 · Estado: diseño aprobado en conversación, pendiente de revisión del documento.

> Notación: lo marcado **[decisión de Claude]** no lo pidió el usuario; lo decidí yo y él puede cambiarlo.
> El nombre «Semillero» y la ruta `~/Proyectos/semillero` son **[decisión de Claude]**.

## 1. Intención y porqué

Al usuario (Leonardo) se le ocurren muchas ideas (IA, neurociencia, hardware, física, teoría de números…) y proyectos posibles, pero tiene poco tiempo y la inmensa mayoría se olvidan, hasta el punto de no recordar ni la idea. Quiere:

1. Un sitio local donde volcar cada idea con todo el detalle posible para que no se pierda.
2. Que Claude Code, con acceso total a todos sus pensamientos, las analice con un botón y le dé un **veredicto firme y honesto**: si vale la pena, cómo empezar, impacto real y cómo se combina con otras ideas suyas.

El peor resultado posible para él es embarcarse en un proyecto sin sentido, que se estanque o que no sirva. Por eso el análisis debe ser **sincero, sin buscarle el lado bueno a las cosas**.

## 2. Objetivos, no-objetivos, anti-objetivos

**Objetivos**
- Capturar ideas con calidad de escritura de artículo científico (LaTeX formal, imágenes, gráficos).
- Organizarlas en carpetas temáticas creadas por el usuario.
- Análisis por idea con una sesión persistente de Claude Code por idea, retomable con réplicas.
- Ver en directo el pensamiento y las búsquedas de cada sesión, como en la terminal.
- Estética muy original y profesional, oscura, con animaciones y transiciones espectaculares.

**No-objetivos (por ahora)**
- Multiusuario, nube, sincronización entre dispositivos, acceso desde el móvil.
- App de escritorio nativa: se hace web local primero; envolverla en ventana propia (Tauri/Electron o ventana `--app` de Chromium) queda para más adelante, el usuario lo decidirá después. El código del frontend no debe depender de estar en un navegador normal.

**Anti-objetivos (sería un fracaso aunque funcione)**
- Dictámenes complacientes o tibios («interesante, tiene potencial…»). Debe atreverse a decir «Olvídalo».
- Mezclar visualmente lo que escribe el usuario con lo que responde Claude.
- Perder una idea o una sesión (datos corruptos, sesión que no se puede retomar).
- Un editor pobre (textarea plano, LaTeX mal renderizado).
- Estética genérica tipo plantilla de dashboard.

## 3. Modelo de datos

Todo vive en **archivos en disco** legibles por Claude (Markdown + JSON), no en una base de datos opaca, para que las sesiones tengan acceso total con sus herramientas de archivo. **[decisión de Claude]**

```
~/Proyectos/semillero/datos/
  notas-globales.md            # memoria permanente compartida por todas las sesiones
  estado.json                  # p. ej. fecha del último análisis, ajustes
  carpetas/
    <slug-carpeta>/
      carpeta.json             # {id, nombre, color/glifo, creada, orden}
      notas.md                 # memoria permanente de la carpeta
      ideas/
        <slug-idea>/
          idea.json            # {id, titulo, creada, estado, etapa, sessionId, ...}
          hilo/
            001-usuario.md     # la idea original
            002-claude.md      # primer dictamen
            003-usuario.md     # réplica del usuario
            004-claude.md      # dictamen siguiente …
          adjuntos/            # imágenes que pega el usuario
          figuras/             # gráficos/imágenes que produce Claude
          registro/
            <timestamp>.jsonl  # flujo stream-json crudo de cada ejecución (para ver en directo y repasar)
```

**Estados de una idea** (campo `estado`):
- `borrador`: escrita, nunca analizada → aparece como **NUEVA** en el panel.
- `en-proceso`: en cola o ejecutándose.
- `aceptada` / `rechazada`: con dictamen.
- `aclaracion`: Claude no puede juzgar con honestidad sin más datos y hace preguntas concretas (pedido aprobado por el usuario). El usuario responde en la caja de réplica → `replica-pendiente`.
- `pausada`: se detuvo por el límite de cuota (ver 5.4); distinta de `detenida` (parada manual).
- `replica-pendiente`: el usuario escribió una réplica tras el dictamen → aparece como **ANALIZADA** en el panel.
- `detenida` / `error`: se detuvo o falló; puede relanzarse.

«Pendiente» = `borrador`, `replica-pendiente`, `detenida`, `error`. Las `pausadas` NO aparecen en el panel de «Comenzar Análisis»: solo en el de «Reanudar Investigación». Una idea solo aparece en el panel si está pendiente.

Editar una idea ya analizada: el usuario puede editar el texto original; si lo hace tras un dictamen, se trata como réplica pendiente («el usuario modificó la idea») para que la sesión lo sepa. **[decisión de Claude]**

## 4. Pantallas

### 4.1 Inicio
- Contadores grandes: **Ideas aceptadas**, **Ideas rechazadas**, **Ideas en proceso**, y **Necesitan aclaración** (la idea pide respuesta tuya). Al pulsar cada uno se abre la lista de esas ideas (agrupadas por carpeta).
- Botón principal **«Comenzar Análisis»**. Mientras haya sesiones en curso se transforma en **«Detener Análisis»** (y sigue pudiendo lanzar otras: ver 5.4).
- Acceso a las carpetas y a crear carpeta.
- Propuesta visual **[decisión de Claude]**: metáfora de «observatorio/semillero»: cada carpeta es una constelación o región, cada idea un punto de luz cuyo color y pulso indica su estado (ámbar aceptada, rojo apagado rechazada, pulso vivo en proceso, blanco frío nueva). Debe ser original, con animaciones de entrada, transiciones entre pantallas (morph del punto de la idea a su página), microinteracciones.

### 4.2 Carpeta
Lista/tablero de sus ideas con título, estado y fecha; botón «Nueva idea»; acceso a las notas de la carpeta (las escribe Claude, el usuario puede leerlas). Crear, renombrar y borrar carpetas (borrar pide confirmación y solo si está vacía o tras mover/borrar sus ideas). **[decisión de Claude]**

### 4.3 Página de una idea (formato «Manuscrito», elegido por el usuario)
- Una sola columna con aspecto de artículo científico: tipografía serif cuidada, márgenes amplios.
- **Editor WYSIWYG estilo Typora/Obsidian en modo directo**: se escribe Markdown y se renderiza al momento; LaTeX en línea `$…$` y en bloque `$$…$$` renderizado con KaTeX; posibilidad de abrir el código de un bloque de fórmula para editarlo. Soporte de tablas, código, listas, citas, imágenes pegadas/arrastradas (van a `adjuntos/`).
- Hilo en orden: idea original → dictamen → réplica → dictamen…
- **Diferenciación fuerte usuario vs Claude** (pedido explícito): acento de color distinto, tipografía de encabezado distinta, y los mensajes de Claude enmarcados como «Dictamen» con etiqueta, estado (ACEPTADA/RECHAZADA), etapa y fecha. Los dictámenes son de solo lectura.
- Al final, caja de **réplica** (mismo editor) para responder al último dictamen. Guardar la réplica pone la idea en `replica-pendiente`.
- Si el último dictamen es de `aclaracion`, se muestra como «Claude necesita aclaración» con sus preguntas, y la caja de réplica queda destacada.
- Si la idea está en proceso: **vista en directo** del razonamiento, búsquedas, páginas leídas y herramientas usadas, como en la terminal (texto en streaming, bloques de pensamiento, llamadas a WebSearch/WebFetch con sus URLs, resultados). También se puede repasar el registro de ejecuciones pasadas.
- Los dictámenes renderizan LaTeX formal (ecuaciones numeradas, entornos tipo definición/teorema), figuras con pie y fuente, y terminan con bibliografía con enlaces.

### 4.4 Panel «Comenzar Análisis»
- Panel pequeño (modal/hoja) con todas las ideas pendientes, **agrupadas por carpeta**, cada una con etiqueta **NUEVA** (nunca analizada) o **ANALIZADA** (tiene réplica pendiente / se modificó tras dictamen). Las detenidas o con error se muestran también, con su etiqueta **[decisión de Claude]**.
- Al abrir, **ninguna está marcada**. Se puede marcar cada idea, cada carpeta entera (marca todas sus ideas; casilla en estado intermedio si están marcadas solo algunas) o todas de golpe.
- Botón para lanzar las marcadas.

### 4.5 Panel «Detener Análisis»
Mismo componente y mismo algoritmo de selección, pero lista las ideas en cola o en ejecución. Detener mata el proceso de forma limpia; la sesión conserva lo hecho y la idea queda `detenida`.

## 5. Motor de análisis

### 5.1 Sesiones
- Una sesión de Claude Code por idea, creada la primera vez con `claude -p --session-id <uuid>` y retomada después con `--resume <uuid>`. El `sessionId` se guarda en `idea.json`.
- Ejecución con `--output-format stream-json --verbose --include-partial-messages` (verificado con Claude Code 2.1.302: emite eventos `system/init`, `stream_event` con deltas, `assistant`, `user` con resultados de herramientas, `rate_limit_event` con `utilization` de las ventanas de 5 h y 7 días, y `result`).
- Directorio de trabajo: `datos/`. Herramientas permitidas: Read, Glob, Grep, WebSearch, WebFetch, Write/Edit **solo dentro de `datos/`**, Bash para generar gráficos con Python (matplotlib) en `figuras/`. Sin permisos interactivos (nadie va a responder prompts): usar `--permission-mode dontAsk` (o equivalente) con lista blanca. El builder valida qué combinación funciona en esta versión.
- Usa la cuenta/plan de Claude ya autenticado del usuario (no API key).

### 5.2 Qué puede leer y escribir cada sesión
- **Leer**: todas las ideas de todas las carpetas, los hilos y registros de cualquier otra sesión, las notas de cada carpeta y las globales. («Comunicarse entre sí» = poder leerse, no mensajería en vivo.)
- **Escribir**: su propio dictamen y figuras, las notas de su carpeta y las notas globales (memoria permanente). Nunca modifica lo escrito por el usuario ni dictámenes ajenos.
- **Protección de los textos del usuario** **[decisión de Claude]**: `datos/` es un repositorio git; antes de cada ejecución se hace un commit; al terminar, el servidor comprueba que la sesión solo cambió lo permitido (su `hilo/NNN-claude.md`, sus `figuras/`, `veredicto`, notas de su carpeta y globales) y restaura cualquier otro archivo modificado. No es un sandbox del sistema operativo (Bash con Python podría escribir fuera de `datos/`); se acepta ese riesgo con instrucciones explícitas en el prompt.
- Con 5 sesiones en paralelo, la escritura en notas compartidas debe ser segura: **[decisión de Claude]** las sesiones añaden entradas (append con encabezado de idea y fecha) en vez de reescribir el archivo; si se usa Edit, que el builder lo haga robusto.

### 5.3 Protocolo de cada análisis (prompt de sistema)
Tono obligatorio: honestidad total, sin complacencia; el peor resultado es que el usuario pierda tiempo en algo sin sentido.

1. **Etapa 1 — Filtro**: juicio rápido de la idea; búsqueda breve solo si hace falta. Si no pasa → rechazada.
2. **Etapa 2 — Investigación profunda**: búsqueda amplia y actualizada por internet, priorizando fuentes fiables y recientes; integrar lo encontrado con la idea. Puede acabar rechazándola.
3. **Dictamen** escrito en Markdown + LaTeX en el siguiente `hilo/NNN-claude.md`, con figuras en `figuras/` y bibliografía con enlaces.
   - Si **no** es «Olvídalo»: opinión completa; próximos pasos; impacto real; cómo se complementa o mejora con otras ideas **aceptadas** del usuario (si las hay).
   - Si es mala: por qué no vale la pena; caminos alternativos parecidos y potencialmente mejores (si los hay).
4. **Resultado estructurado**: además del Markdown, la sesión deja el veredicto (`aceptada`/`rechazada`/`aclaracion`), la etapa alcanzada y un resumen de una línea, de forma que el servidor lo lea sin interpretar prosa (p. ej. un frontmatter en el `.md` o un `veredicto.json`). El servidor valida al terminar; si falta, marca `error`.
   - Si necesita aclaración: preguntas concretas y por qué cada una cambia el veredicto. Solo cuando de verdad no pueda juzgar; no es una forma de evitar un veredicto duro.
5. **Réplicas**: al retomar, el mensaje es la réplica del usuario; la sesión continúa con todo el contexto, responde a lo pedido o cuestionado y puede cambiar el veredicto.

### 5.4 Cola y límites
- Máximo **5 sesiones en paralelo** (pedido explícito); el resto en cola, en orden de lanzamiento.
- Se puede lanzar más ideas mientras otras corren: se suman a la cola.
- **Modelo**: Opus en ambas etapas (el usuario rechazó usar Sonnet), esfuerzo alto. Configurable en una pantalla de ajustes.
- **Umbral de cuota** (pedido del usuario): cuando `rate_limit_event` indique que la ventana de **5 h llega al 90 %** (o la de 7 días al 90 % **[decisión de Claude]**), se **pausa** la investigación: las sesiones en ejecución se detienen de forma limpia y pasan a `pausada`, y las que estaban en cola y nunca habían arrancado vuelven a su estado pendiente anterior **[decisión de Claude]**. Ambos umbrales, editables en ajustes.
- Al pausar: **aviso visible** al usuario (notificación en la página y notificación de escritorio **[decisión de Claude]**), y el botón principal pasa a **«Reanudar Investigación»**.
- Pulsar «Reanudar Investigación» abre el mismo panel con el mismo algoritmo de selección, pero **solo con las ideas pausadas** (nunca las que no se habían comenzado). Reanudar retoma la misma sesión (`--resume`) pidiéndole que continúe donde lo dejó. Si se pulsa antes de que se reinicie la ventana, se reanuda igualmente por decisión del usuario, sin volver a pausarse por el umbral del 90 % (solo se pararía si el plan rechaza las peticiones de verdad). **[decisión de Claude]**
- Cuando la ventana de 5 h se reinicia (`resetsAt`), las pausadas que no se reanudaron manualmente siguen pausadas hasta que el usuario las reanude; el botón sigue mostrando «Reanudar Investigación» mientras haya pausadas. **[decisión de Claude]** Con pausadas pendientes, ¿cómo se lanzan ideas nuevas? El panel de «Reanudar» incluye un enlace secundario a «Comenzar Análisis» de nuevas. **[decisión de Claude]**

### 5.5 Persistencia del trabajo
- Las sesiones siguen trabajando mientras el portátil esté encendido y con internet, **aunque el navegador esté cerrado**. Por eso el backend corre como **servicio systemd de usuario** que arranca con la sesión. **[decisión de Claude]**
- Si el servidor se reinicia a mitad de un análisis: la idea pasa a `detenida` (relanzable, y se retoma la misma sesión).
- No hay que matar ni tocar programas del usuario fuera de los procesos que lanza la app.

## 6. Pila técnica **[decisión de Claude]** (versiones comprobadas en npm el 2026-10-23)
- **Backend**: Node.js 24 + Fastify 5 (`@fastify/static`, `@fastify/websocket`) para la API REST y el streaming en vivo por WebSocket; lanza `claude` como procesos hijos.
- **Frontend**: Svelte 5 + Vite 8; editor **Milkdown Crepe 7.22** (ProseMirror, Markdown nativo, LaTeX con KaTeX, imágenes, tablas) para la escritura estilo Typora; KaTeX 0.19 para renderizar dictámenes; render de Markdown de dictámenes con el mismo motor o `marked` + KaTeX.
- Servido en `http://localhost:<puerto>` solo en loopback.
- Python 3 con matplotlib disponible para que Claude genere gráficos (verificar/instalar en un venv del proyecto).

## 7. Restricciones
- Todo en español en la interfaz.
- Usuario en Linux (CachyOS, niri, shell fish). Los comandos que se le den, sin prefijo `!`.
- Solo local; sin exponer a la red.
- Nada de capturas de pantalla de su escritorio sin pedir permiso.

## 8. Lo que queda al builder
- Diseño visual concreto (paleta exacta, tipografías, animaciones) dentro de lo descrito: oscuro, muy original, profesional, transiciones espectaculares, usuario vs Claude muy diferenciados.
- Formato exacto del resultado estructurado y del prompt de sistema (respetando 5.3).
- Estructura del código, tests, puerto.
- Cómo presentar el flujo en vivo (siempre que muestre pensamiento, búsquedas, URLs y herramientas como en la terminal).
