# Semillero VI: tipos de bancal

## Intención

Que Semillero juzgue cualquier tipo de idea, no solo las académicas, con 0 complacencia y con los criterios serios de cada campo.

## Decisiones del usuario

- Cada bancal tiene un **tipo** elegido de una lista cerrada y una **descripción** libre. Los dos se pueden editar.
- Los tipos son:
  - Investigación académica
  - Negocio o emprendimiento
  - Producto o proyecto técnico
  - Creativo
  - Aprender algo nuevo
  - Otro
- **Aprender algo nuevo** evalúa con rigor si vale la pena aprender una habilidad hoy.
  - El criterio de más peso es la demanda actual.
  - Se investiga de forma exhaustiva y global en portales de empleo: LinkedIn, Indeed, los principales de cada región y el del país del usuario.
  - También en estadísticas oficiales: BLS, EURES, OCDE Skills for Jobs, WEF y Lightcast.
  - El dictamen resume qué sectores y qué países la demandan más, los salarios y la tendencia.
- Antes de elegir un tipo, el selector explica a qué se refiere, cómo se juzgarán sus ideas y da ejemplos.
- En los tipos no académicos, «Dominado» se gana por defecto con un **caso práctico** aplicado a la idea. Los nodos de teoría pura siguen con examen, y la sesión decide en cada nodo. El caso práctico no tiene límite de tiempo.
- **«Tu contexto»** está en Ajustes (país, capital, tiempo, habilidades, metas) y lo leen todas las sesiones.

## Implementación

- `server/engine/tipos.js` es la única fuente. Por cada tipo define:
  - la parte que ve el usuario: `resumen`, `comoJuzga`, `ejemplos`;
  - el vocabulario de la interfaz (`vocab`);
  - las instrucciones para las sesiones: `analisis`, `formato`, `germinacion`, `dominio`, `verificacion`.
- Las funciones `prompt*` de `prompt.js` toman el tipo y añaden la sección «Este bancal» al núcleo común.
- Cada mensaje lleva delante el bloque del bancal (`bloqueBancal`): el tipo, la descripción y el contexto.
- Los bancales antiguos sin tipo se tratan como académicos.

## Fuentes de los criterios

- **Negocio**
  - CB Insights, causas de cierre de startups: no había necesidad de mercado.
  - BLS, supervivencia de establecimientos: ~50 % a 5 años y ~35 % a 10.
  - The Mom Test y la escala de evidencia de Strategyzer: lo que se dice frente a lo que se hace.
  - Disciplined Entrepreneurship: TAM de abajo arriba en el beachhead.
  - Métricas SaaS: LTV:CAC ≥ 3 y recuperación del CAC en menos de 12 meses.
- **Producto**
  - Los cuatro riesgos de Marty Cagan.
  - La escala TRL.
  - Jobs-to-be-done.
  - Hardware: BOM, certificaciones CE/FCC y fabricación.
- **Creativo**
  - Authors Guild 2023: mediana de 10 000 $ a tiempo completo; autopublicados, 12 800 $.
  - Extensiones que aceptan los agentes literarios y comp titles.
  - Estadísticas de lanzamientos en Steam en 2025.
- **Aprender**
  - OIT WP140 (2025): un 25 % de empleos expuestos a la IA generativa y un 3,3 % en el grado más alto.
  - WEF Future of Jobs 2025.
  - Anthropic Economic Index.
  - Lightcast: prima de ~28 % en las ofertas con habilidades de IA.
  - Horas del FSI por idioma.
  - Macnamara et al. 2014.
  - Para la demanda: LinkedIn Skills on the Rise y Skills Signal, Indeed Hiring Lab (datos CC BY 4.0), EURES 2025, OCDE Skills for Jobs (edición 2026, 38 países).
