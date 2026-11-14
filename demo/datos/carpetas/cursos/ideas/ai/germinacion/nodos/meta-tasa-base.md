# Meta práctica: la paradoja de la tasa base, calculada y simulada

## Cómo se llegó a este problema

En el diagnóstico te planteé un detector de fraude con un 99 % de sensibilidad y un 95 % de especificidad, donde solo el 1 % de las transacciones son fraude. Tu respuesta fue $(1-0{,}99)\cdot 0{,}99 = 0{,}0099$.

Ese número no es la respuesta, pero **tampoco es un disparate**: es $P(F \cap +)$, la probabilidad de que una transacción sea fraude *y* dé positivo. Es el numerador correcto del teorema de Bayes. Te faltó dividir entre la probabilidad de dar positivo, que incluye las transacciones legítimas que el detector marca por error. Y esas son muchas, porque hay 99 legítimas por cada fraude.

Comentaste también que la notación $P(+\mid F)$ y los términos «sensibilidad» y «especificidad» eran ambiguos. Tienes razón en que debí definirlos en palabras:

- **sensibilidad** $= P(+\mid F)$: de los fraudes reales, qué fracción detecta;
- **especificidad** $= P(-\mid \neg F)$: de las transacciones legítimas, qué fracción deja pasar como legítimas.

Pero la notación misma *era* la definición, y no reconocerla es justo el hueco que esta meta cierra. Este mismo error, confundir $P(A\mid B)$ con $P(B\mid A)$, lo cometen médicos, jueces e ingenieros. En ML aparece cada vez que alguien presume de un detector «muy preciso» para un suceso raro.

## El problema

> **Meta.** Para un detector con sensibilidad $s$, especificidad $e$ y prevalencia $\pi$:
> 1. **Deduce** a mano $P(F \mid +) = \dfrac{s\,\pi}{s\,\pi + (1-e)(1-\pi)}$ a partir de la definición de probabilidad condicional y de la probabilidad total.
> 2. **Calcula** el caso del diagnóstico ($s=0{,}99$, $e=0{,}95$, $\pi=0{,}01$) y **explícalo** con frecuencias naturales sobre 10.000 transacciones.
> 3. **Simula** $10^6$ transacciones con NumPy (`default_rng`) y comprueba que la proporción simulada coincide con la fórmula.
> 4. **Reproduce** la figura de abajo y **responde**: ¿qué especificidad haría falta para que el 90 % de los positivos fueran fraude real con $\pi = 1\%$?
> 5. **Relaciónalo** con el ML: ¿qué métrica de un clasificador es $P(F\mid +)$? ¿Por qué esa métrica cambia si el mismo modelo se usa en una población con otra prevalencia, y la exhaustividad no?

**Criterio de éxito:**

- la simulación coincide con la fórmula dentro de ±0,2 puntos porcentuales;
- el razonamiento del punto 2 cabe en 5 líneas;
- respondes bien a los puntos 4 y 5 sin ayuda.

**Respuesta de control** (no la mires antes de intentarlo): $0{,}0099/(0{,}0099 + 0{,}0495) \approx 16{,}7\,\%$. De 10.000 transacciones, 100 son fraude y 99 dan positivo; de las 9.900 legítimas, 495 dan positivo por error. Así que solo 99 de 594 positivos son fraude.

![Valor predictivo positivo frente a prevalencia](figuras/tasa-base.png)

## Qué representaría resolverlo

Dominar esto desbloquea la conferencia 5 de ML I (métricas) y la interpretación correcta de la precisión, la exhaustividad y las curvas PR. Te protege del error más caro en la detección de anomalías y fraude. Es también la puerta de entrada al razonamiento bayesiano que verás en Estadística (conferencia 9) y que está detrás de TabPFN.

## Lo que se sabe

Es un resultado clásico, no un problema abierto. Lo interesante está en la psicología:

- Kahneman y Tversky documentaron en los años setenta que las personas ignoran sistemáticamente la tasa base (*base-rate neglect*);
- Gigerenzer y Hoffrage (1995) mostraron que presentar los datos como **frecuencias naturales** («de 10.000 casos…») en vez de probabilidades multiplica la proporción de respuestas correctas.

Por eso la meta te pide las dos representaciones.

## Recursos

- Yohai, *Notas de Probabilidades y Estadística*, § 1.5 (probabilidad condicional), [PDF](germinacion/recursos/yohai-notas-probabilidades.pdf).
- Espejo Miranda et al., *Estadística descriptiva y probabilidad*, cap. 4, § 6-8 (probabilidad total y Bayes, p. 131-136, con ejercicios resueltos), [PDF](germinacion/recursos/uca-estadistica-descriptiva-probabilidad.pdf).

## Referencias

- Gigerenzer, G. y Hoffrage, U. (1995). How to improve Bayesian reasoning without instruction: frequency formats. *Psychological Review* 102(4), 684-704.
- Tversky, A. y Kahneman, D. (1974). Judgment under uncertainty: heuristics and biases. *Science* 185, 1124-1131.
- Yohai, V. J. (2006). *Notas de Probabilidades y Estadística*. FCEN-UBA.
