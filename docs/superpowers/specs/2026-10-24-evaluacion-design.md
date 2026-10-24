# Semillero V: exámenes de dominio y verificación rigurosa de resultados

Amplía los diseños anteriores, que siguen vigentes en todo lo demás.

## Por qué

Los estados de los nodos dejan de ser decorativos. «Dominado» se gana aprobando un examen generado al momento y «Resuelta» se gana pasando una verificación implacable. Pendiente, Estudiando, Abierta y Atacando los pone el usuario y simplemente se cuentan.

## Estados y recuento

- La cabecera de la germinación muestra el recuento por estado, para estudio y para incógnitas.
- El servidor rechaza poner `hecho` o `resuelta` a mano (409: `requiere-examen` y `requiere-verificacion`). Esos estados solo los pone al aprobar o al verificar.
- Bajar de estado está permitido. El historial (exámenes y verificaciones) no se pierde nunca.

## 1. Exámenes de dominio (nodos de estudio)

### Dificultades

| Nivel | Qué evalúa | Exigencia al corregir | Tiempo |
|---|---|---|---|
| Suficiente | Solo lo que el usuario necesitará más adelante en su idea para entender y atacar sus incógnitas y problemas abiertos (conceptos y técnicas aguas abajo en el mapa) | Entender y saber aplicar | **4 h 30 min**, se entrega solo al acabar |
| Avanzado | Comodidad completa con toda la rama, no solo lo que pide la idea | Rigor de curso avanzado | Sin límite |
| Experto | Implacable: problemas avanzados y orgánicos, preferiblemente sacados de fuentes fiables reales (olimpiadas, cualificaciones de doctorado, libros de referencia, artículos) y endurecidos por la sesión; incluye problemas que no parecen de la rama y que se resuelven con ella | Máxima, demostraciones completas | Sin límite |

- **Generación al momento.** Al elegir la dificultad, una sesión nueva de Opus (esfuerzo de Ajustes) genera el examen. Lee el documento del nodo, el mapa, las incógnitas que dependen del nodo y, en Experto, busca en internet. Es distinto en cada intento.
- **Rúbrica oculta.** La sesión guarda su rúbrica en la propia conversación; no se escribe en disco, para que el usuario no pueda verla antes de entregar.
- **Respuestas** (decisión del usuario):
  - cada pregunta tiene un editor con LaTeX y adjuntos (imágenes o documentos: PDF, txt, md, py, ipynb);
  - lo escrito se guarda solo y se puede dejar a medias y volver, salvo que se acabe el tiempo en Suficiente.
- **Corrección:**
  - la misma sesión (`--resume`) puntúa cada pregunta y da la nota sobre 5 con un decimal, con un comentario por pregunta y otro general;
  - la exigencia sube con la dificultad;
  - los errores tontos, claramente humanos, se señalan pero no penalizan.
- **Aprobado: 3/5** (decisión del usuario). Con 2 o menos es suspenso.
  - Al aprobar, el nodo pasa a `hecho` con `dominio = { dificultad, nota, examen }`. Se conserva la mejor dificultad y, a igual dificultad, la mejor nota.
  - Reintentos ilimitados (decisión del usuario).
- **Registro.** Todos los intentos se guardan (`germinacion/examenes/<nodo>/<id>/examen.json`) con las preguntas, las respuestas, los adjuntos y la corrección.
- **Árbol:** un nodo dominado se colorea según la mejor dificultad aprobada: Suficiente en verde, Avanzado en cian y Experto en dorado. Con 5/5, palpita.

## 2. Verificación de resultados (incógnitas y problemas abiertos)

- **Envío.** Al pulsar «Resuelta» se abre un panel para enviar la demostración, el experimento o los datos: texto con LaTeX y adjuntos. El taller puede ayudar a redactarlo, pero solo el verificador marca el nodo como resuelto.
- **El verificador** es una sesión NUEVA de Opus, independiente del taller. Juzga SIEMPRE con rigor total. Solo acepta un resultado concluyente que cierre el problema sin lugar a dudas, y lo comprueba todo: reproduce cálculos, busca contraejemplos y contrasta con la literatura. Lee el enunciado, el taller, el mapa y los adjuntos.
- **Si lo rechaza:** explicación completa del porqué (sin rebajar la exigencia ante un avance parcial, aunque lo reconozca) y una recomendación de los siguientes pasos: modificar el envío o cambiar el foco.
- **Si lo acepta:**
  - escribe el análisis de lo que implica el resultado, conectado con la idea;
  - si el resultado revela problemas nuevos, propone nodos (`incognita`, que pueden ser abiertos) en `verificaciones/<nodo>/<id>/ampliacion.json`, con sus documentos en `germinacion/nodos/`;
  - el servidor los fusiona en el mapa (validado entero), marca el nodo `resuelta` con la referencia a la verificación, lo commitea y el árbol crece.
- **Registro.** Cada verificación queda en `germinacion/verificaciones/<nodo>/<id>/verificacion.json`.
- **Contexto para otras sesiones.** El taller y la germinación leen las verificaciones (se les indica en sus prompts).

## Ejecución

- Exámenes y verificaciones corren al momento, como glosas y talleres, coordinados por el guard (registro de escritores).
- Respetan la pausa por cuota y no arrancan con la idea en proceso.
- La germinación no arranca mientras una verificación escribe en `germinacion/nodos`.
