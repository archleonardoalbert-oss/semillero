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

## Dónde están tus datos

Todo está en `datos/`, en archivos Markdown y JSON legibles:

- `datos/carpetas/<bancal>/ideas/<idea>/hilo/`: tu idea (`001-usuario.md`), los dictámenes
  (`NNN-claude.md`) y tus réplicas, en orden.
- `adjuntos/`: tus imágenes. `figuras/`: las de Claude. `registro/`: cada ejecución en
  stream-json.
- `notas-globales.md` y `carpetas/<bancal>/notas.md`: la memoria que comparten las sesiones.

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
