# Meta práctica: gradientes desde cero, derivados y verificados

## Cómo se llegó a este problema

En el diagnóstico dejaste sin hacer los cuatro ejercicios de cálculo: el gradiente de mínimos cuadrados, la pérdida logística, el paso del descenso de gradiente y la retropropagación en dos capas. Dijiste que lo estudiaste y que «necesitas tiempo para acostumbrarte de nuevo». Esta meta es ese reencuentro, con un criterio de éxito que no deja dudas.

Hay una razón más profunda. Tu experiencia previa es una red en Keras que reconocía dígitos, pero Keras calcula los gradientes por ti. Mientras no hayas escrito una retropropagación a mano y comprobado que es correcta, PyTorch será una caja negra, y depurar un entrenamiento que no aprende será adivinar. Casi todos los cursos serios de aprendizaje profundo hacen implementar la retropropagación a mano por eso mismo.

## El problema

> **Meta.** En NumPy, sin PyTorch ni autograd:
> 1. **Deriva** a mano y **programa** la pérdida y el gradiente de:
>    - mínimos cuadrados, $f(w)=\lVert Xw-y\rVert^2$, cuyo gradiente es $2X^\top(Xw-y)$;
>    - la regresión logística con regularización L2;
>    - una red $h=\mathrm{ReLU}(W_1x+b_1)$, $\hat y = \mathrm{softmax}(W_2h+b_2)$ con entropía cruzada.
> 2. **Verifica** cada gradiente con diferencias centradas, $\frac{f(w+\varepsilon e_i)-f(w-\varepsilon e_i)}{2\varepsilon}$. El error relativo debe quedar por debajo de $10^{-6}$ (en `float64`).
> 3. **Entrena** la red con descenso de gradiente por mini-lotes en el conjunto de dígitos de 8×8 de scikit-learn (1.797 imágenes). Reporta la exactitud en un conjunto de prueba separado.
> 4. **Comprueba** que tu red y una red idéntica en PyTorch, con la misma inicialización y los mismos lotes, dan las mismas pérdidas paso a paso, hasta $10^{-5}$.
> 5. **Explora** el paso de aprendizaje: muestra un $\eta$ que diverge, uno que converge lento y uno bueno, y relaciónalo con $0 < \eta < 2/\lambda_{\max}$.

**Criterio de éxito:**

- los tres comprobadores de gradiente pasan;
- la exactitud en prueba es ≥ 95 %;
- la coincidencia con PyTorch se cumple;
- todo está en un repositorio público con un README que explique las derivaciones en LaTeX.

## Qué representaría resolverlo

- **Desbloquea:** la asignatura de aprendizaje profundo (PyTorch dejará de ser magia) y la parte de LoRA en Ingeniería de LLM.
- **Para el portafolio:** es un proyecto pequeño, pero un entrevistador técnico reconoce enseguida a quien ha implementado la retropropagación a mano.

## Lo que se sabe

Es un resultado conocido desde Rumelhart, Hinton y Williams (1986), y la comprobación numérica de gradientes es una práctica estándar. No hay nada abierto. La dificultad es **de ejecución**: los errores típicos son las dimensiones transpuestas, olvidar la derivada de ReLU en 0, la inestabilidad numérica de $\log(\mathrm{softmax})$ (que se resuelve restando el máximo) y comprobar en `float32`, cuya precisión no basta.

## Recursos

- Colmenarejo Allavena y López Herraiz, *Las matemáticas de la inteligencia artificial* (UCM, LibreTexts), caps. 4 (regla de la cadena), 6 (gradiente descendiente) y 9 (retropropagación).
- Jacar.es, «Retropropagación, la derivación matemática paso a paso».
- Repaso de matemáticas del ML, conferencias 5, 6 y 8.

## Referencias

- Rumelhart, D. E., Hinton, G. E. y Williams, R. J. (1986). Learning representations by back-propagating errors. *Nature* 323, 533-536.
- Colmenarejo Allavena, I. y López Herraiz, J. *Las matemáticas de la inteligencia artificial*. UCM, LibreTexts.
- Jacar.es. «Retropropagación, la derivación matemática paso a paso». https://jacar.es/retropropagacion-derivacion-matematica-paso-a-paso/
