# Reto de nivel: quedar en el 10 % superior de una competición pública de ML

## Cómo se llegó a este problema

En el dictamen propuse una medalla de bronce en Kaggle (el 10 % superior) como **la prueba de nivel más objetiva y gratuita** que existe en ML. En una competición no hay manera de engañarse:

- el conjunto de prueba privado está oculto;
- la tabla final reordena a quien sobreajustó a la pública;
- compites contra miles de personas, muchas con más experiencia y más GPU.

Para alguien sin título ni experiencia laboral en el área, un buen puesto es una señal que los reclutadores entienden. Pero tu diagnóstico añade un obstáculo: **Kaggle y Colab solo te funcionan con VPN**. Kaggle es de Google, que aplica las sanciones de EE. UU. a Cuba, y entrar desde Cuba con VPN puede ir contra sus condiciones de uso y acabar en el cierre de la cuenta. No conozco cómo se aplica eso en la práctica, así que no puedo darte una recomendación segura.

## El problema

> **Reto.** Terminar en el **10 % superior de la clasificación privada** de una competición pública de ML con al menos 500 equipos, **en solitario**, entrenando en tu propia GPU de 6 GB. La competición debe ser tabular, de series temporales o de texto en español.

Plataformas posibles. Comprueba tú mismo la accesibilidad y las condiciones de cada una para residentes en Cuba:

| Plataforma | Sede | Comentario |
|---|---|---|
| Kaggle | EE. UU. (Google) | La de más prestigio. Requiere VPN en tu caso, con riesgo de incumplir sus condiciones |
| Zindi | Sudáfrica | Problemas de África y del Sur Global; no he podido verificar su accesibilidad desde Cuba |
| DrivenData | EE. UU. | Problemas sociales; probablemente sujeta a las mismas sanciones |
| AIcrowd | Suiza | Competiciones de investigación |
| Tareas de IberLEF | España (SEPLN) | No son competiciones con tabla pública, pero sí evaluaciones ciegas y clasificatorias. Algunas usan Kaggle o Codalab |

**Criterio de éxito:** un puesto ≤ percentil 10 en la clasificación privada, y una publicación de la solución (repositorio + escrito) que explique qué funcionó y qué no.

## Qué representaría resolverlo

- **Para tu empleo:** una señal de nivel independiente, comparable a la experiencia laboral en muchas entrevistas, que verifica justo lo que este curso entrena (validación honesta y *boosting*).
- **Lo que no se puede anticipar:** si una medalla compensará en la práctica las barreras de contratación desde Cuba. Es probable que ayude, pero no hay datos.

## Lo que se sabe

- **Qué gana en las competiciones tabulares:** el *boosting* con buena ingeniería de variables y, sobre todo, una **validación local que reproduzca la partición privada**. Gana quien confía en su validación cruzada y no en la tabla pública.
- **Qué gana en series de ventas:** en la competición M5 (ventas de Walmart, miles de equipos) dominaron los modelos globales de LightGBM (Makridakis et al., 2022). Es exactamente lo que aprendes en ML II y en Series temporales.
- **Lo difícil para ti:**
  - el tiempo (unos 13 h/semana frente a equipos dedicados);
  - la GPU, que no importa en tabular pero sí en visión y en texto grande;
  - el acceso.

  Por eso el reto se limita a competiciones tabulares, de series o de texto en español.

## Recursos

- ML II y Series temporales, completas.
- La meta «Comparar dos modelos con rigor», para no sobreajustar a la tabla pública.

## Referencias

- Makridakis, S., Spiliotis, E. y Assimakopoulos, V. (2022). M5 accuracy competition: results, findings, and conclusions. *International Journal of Forecasting* 38(4), 1346-1364.
- Bojer, C. S. y Meldgaard, J. P. (2021). Kaggle forecasting competitions: an overlooked learning opportunity. *International Journal of Forecasting* 37(2), 587-603.
