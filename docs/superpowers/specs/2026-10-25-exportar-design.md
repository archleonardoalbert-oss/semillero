# Exportar una germinación como ejecutable

## Intención

Llevar una germinación a otros sitios como página independiente. Un ejecutable para Linux (cualquier distro) y otro para Windows. Al abrirlo, levanta una web local y abre el navegador con la germinación completa y nada más.

## Qué incluye (decisiones del usuario)

- **El árbol entero** con su leyenda y el vocabulario del tipo del bancal.
- **La Visión del camino.**
- **El documento de cada nodo,** con sus figuras y fórmulas.
- **Todos los recursos que la sesión descargó para cada nodo** (PDF, libros y demás), que se abren desde la página. Se mantiene el enlace a la fuente original.
- **Las raíces son solo «Tu idea» y el dictamen vigente** (el último), los dos como documentos de lectura.

## Qué NO incluye

- **Sesiones y conversaciones:** nada de sesiones, chats, talleres, glosas ni réplicas.
- **Registros:** ni exámenes ni verificaciones.
- **Estados y notas:** ningún estado de ningún nodo (dominado, atacando, resuelto…). Tampoco las notas del usuario ni el cuestionario de diagnóstico.
- **Archivos sobrantes:** solo se empaqueta lo que referencian los documentos incluidos y los archivos de los recursos.

## Forma

- **Un solo archivo por sistema operativo,** con todo dentro: la página, los datos y los documentos.
- **Se genera con un botón «Exportar» en la germinación.** Se elige Linux o Windows y el navegador lo descarga.
- **El lanzador está escrito en Go.** Se compila desde el propio Semillero con `CGO_ENABLED=0`: un binario estático para linux/amd64 y un `.exe` para windows/amd64, con los archivos embebidos (`embed`).
- **Al ejecutarlo:**
  - Sirve la página en `127.0.0.1`. Usa un puerto preferido derivado de la idea, para que el navegador recuerde lo visto entre aperturas, y otro libre si ese está ocupado.
  - Abre el navegador: `xdg-open` en Linux, `rundll32 url.dll,FileProtocolHandler` en Windows. Además muestra la dirección por si no se abre.
  - La página mantiene una conexión de Server-Sent Events. Cuando se cierra la última pestaña, el ejecutable termina a los 10 s; al recargar se reconecta antes.
  - No hay pulsos periódicos, porque Chrome frena los temporizadores de las pestañas en segundo plano a uno por minuto.

## Piezas

- `web/visor.html` y `web/src/visor/*`: una página Svelte aparte, construida con su propia configuración de Vite en `web/dist-visor`.
  - Reutiliza `Arbol.svelte`, `arbol.js` y el renderizador de Markdown.
  - Tiene una lámina propia de solo lectura.
  - No importa nada de la API ni del WebSocket.
- `server/exportar/paquete.js`: arma la carpeta del sitio.
  - `datos.json` contiene el título, el bancal, el vocabulario, el mapa sin diagnóstico, los documentos y las raíces.
  - Los archivos van en `archivos/idea/…`, de modo que el renderizador los resuelve con `base = 'idea'`.
- `server/exportar/lanzador/`: el programa Go (`main.go` y `go.mod`, sin dependencias).
- `server/exportar/compilar.js`: copia el lanzador y el sitio a una carpeta temporal y ejecuta `go build` con `GOTOOLCHAIN=local`. Las compilaciones van de una en una.
- `GET /api/carpetas/:c/ideas/:i/exportar/:so` (`so` = `linux` | `windows`): devuelve el archivo como descarga. Exige que la germinación esté en la fase de mapa.
