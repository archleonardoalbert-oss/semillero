# Semillero

Almacén local de ideas. Cada idea vive en un bancal (carpeta temática) y, al pulsar
**Comenzar Análisis**, una sesión de Claude Code la juzga sin complacencia: filtro rápido,
investigación profunda si lo pasa y un dictamen con LaTeX, figuras y referencias. Cada idea
conserva su sesión, así que tus réplicas continúan la misma conversación.

## Uso

- Abre <http://localhost:4417>.
- El servidor corre como servicio de usuario y sigue trabajando aunque cierres el navegador:

  ```fish
  systemctl --user status semillero
  systemctl --user restart semillero
  journalctl --user -u semillero -f
  ```

## Veredictos

Aceptada, **Cambio sugerido** (buena y bien encaminada, pero con cambios concretos que hacer),
Rechazada o Necesita aclaración.

## Glosas: explicar y corregir

Selecciona cualquier fragmento de un dictamen, de una réplica o de una página de la germinación
(texto, una fórmula o una imagen; las fórmulas y las imágenes se seleccionan enteras con un clic)
y elige:

- **Explicar**: Claude te lo explica desde cero, con la petición opcional que escribas.
- **Corregir**: le dices qué está mal. Claude lo comprueba con honestidad y, si tienes razón,
  enmienda solo las partes del texto que dependían del error (tachado y versión corregida).

Las glosas se responden al momento en una copia aislada de la sesión (`--fork-session`): no
añaden nada a la conversación principal. Quedan ancladas al fragmento, al margen si la pantalla
es ancha y como marcas numeradas si no.

## Germinación

Una idea aceptada muestra **Comenzar germinación**. La misma sesión que la analizó:

1. te hace un diagnóstico para saber de dónde partes;
2. investiga a fondo y traza un mapa: la ruta de estudio, las incógnitas (algunas pueden ser
   problemas abiertos) y los recursos, descargados cuando son de libre acceso;
3. lo mantiene vivo: marcas tu progreso y tus notas en cada nodo, pulsas **Comunicar avances**
   y la sesión reajusta el mapa.

El mapa se ve como un árbol que crece desde la semilla de la idea; la semilla abre el manuscrito.

## Dónde están tus datos

Todo está en `datos/`, en archivos Markdown y JSON legibles:

- `datos/carpetas/<bancal>/ideas/<idea>/hilo/`: tu idea (`001-usuario.md`), los dictámenes
  (`NNN-claude.md`) y tus réplicas, en orden.
- `adjuntos/`: tus imágenes. `figuras/`: las de Claude. `registro/`: cada ejecución en
  stream-json.
- `notas-globales.md` y `carpetas/<bancal>/notas.md`: la memoria que comparten las sesiones.
- `glosas/`: cada glosa con su hilo. `germinacion/`: el mapa (`mapa.json`), un documento por
  nodo (`nodos/`), los recursos descargados (`recursos/`) y tu progreso (`progreso.json`).

`datos/` es un repositorio git propio. Si una sesión modifica algo que no le corresponde,
como tus textos o el dictamen de otra idea, se restaura automáticamente.

## Desarrollo

```fish
npm install
npm test          # tests de servidor y lógica del frontend
npm run build     # compila la web en web/dist (el servicio la sirve sin reiniciar)
npm run dev       # Vite en :5173 con proxy al servidor en :4417
```

Ajustes (modelo, esfuerzo, paralelismo y umbrales de cuota) en la página **Ajustes** de la app.
