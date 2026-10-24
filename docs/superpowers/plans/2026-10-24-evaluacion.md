# Semillero V (evaluación) Implementation Plan

> REQUIRED SUB-SKILL: superpowers:executing-plans. TDD en cada tarea.

**Goal:** `docs/superpowers/specs/2026-10-24-evaluacion-design.md`.
**Constraints:**
- Opus siempre, con el esfuerzo de Ajustes.
- Aprobado con 3/5.
- Suficiente: 4 h 30 min (16 200 s).
- Interfaz en español.

## Review Focus
1. Se acaba el tiempo de Suficiente con el servidor reiniciado: al arrancar se entrega lo que haya.
2. Marcar `hecho` o `resuelta` a mano por la API: 409.
3. Una ampliación con ids repetidos o dependencias rotas: se rechaza entera, sin dejar el mapa a medias.
4. Corregir con la sesión perdida: se corrige con una sesión nueva que reciba el examen.
5. Entregar dos veces o responder un examen ya entregado: 409.

### Task 1: Estados protegidos y recuento
- `marcarNodo` rechaza `hecho` y `resuelta`; `fijarDominio` y `fijarResuelta` son internos.
- Tests: rechazo a mano; dominio con la mejor dificultad y, a igual dificultad, la mejor nota.

### Task 2: Exámenes (servidor)
- `server/store/examenes.js` y `server/engine/examenes.js`; prompts `promptExamen`, `mensajeGenerarExamen`, `mensajeCorregirExamen`, `parsearExamen` y `parsearCorreccion`; rutas.
- Tests:
  - generar (args, contexto aguas abajo, búsqueda en Experto);
  - límite de Suficiente;
  - responder y adjuntar;
  - entregar y corregir: aprobado (dominio) y suspenso;
  - errores leves sin penalizar (lo dice el prompt);
  - entrega automática por tiempo y al arrancar;
  - 409 al entregar dos veces;
  - sesión perdida.

### Task 3: Verificación (servidor)
- `server/store/verificaciones.js` y `server/engine/verificacion.js`; prompts; fusión de la ampliación; rutas.
- Tests:
  - rechazo con explicación;
  - aceptación que marca `resuelta` y añade nodos;
  - ampliación inválida que no toca el mapa;
  - la sesión no puede escribir fuera de lo permitido;
  - bloqueo de la germinación mientras verifica.

### Task 4: Interfaz
- Recuento en la cabecera.
- Modal de dificultad y vista de examen con temporizador, autoguardado y entrega.
- Resultados e historial.
- Panel de verificación y su resultado.
- Colores y palpitación en el árbol.

### Task 5: Headless, revisión final y fusión
