## Cómo se llegó a este problema

En 2006, Restrepo, Ott y Hunt hicieron una pregunta sencilla: si la sincronización o la propagación en una red dependen de su autovalor dominante $\lambda$, ¿cuánto pesa cada nodo en ese autovalor? Su respuesta, la **importancia dinámica**, es el cambio relativo de $\lambda$ al quitar el nodo, y propusieron estimarlo sin recalcular nada, solo con los autovectores izquierdo $\mathbf u$ y derecho $\mathbf v$. Con eso se puede ordenar una red de un millón de nodos con una sola descomposición espectral.

El problema es que **quitar un nodo no es una perturbación pequeña**: su componente en el autovector pasa de golpe a cero. Milanese, Sun y Nishikawa (2010) lo midieron en cuatro redes reales sin signo. En una red aleatoria, el primer orden «puro» se equivocaba **por un factor de ~22**; un segundo orden con una corrección por el grado lo mejoraba mucho. Catorce años después, Young y Porter (2024) estudiaron con detalle la precisión del primer orden, pero **para aristas** y solo en grafos sintéticos no dirigidos. En su conclusión dejan explícitamente como pendientes la eliminación de nodos y las redes dirigidas y ponderadas. Luo y Zhou (octubre de 2026) acaban de dar una susceptibilidad de primer orden para eliminar nodos en Laplacianos no hermíticos, pero con pesos no negativos.

Tu proyecto cae exactamente en el hueco que nadie ha medido: **una red real, dirigida, ponderada y con signo**, donde el jacobiano es **no normal** y el número de condición $\kappa(\lambda)$ deja de ser casi 1. El piloto ya dio dos pistas:

- el primer orden puro sobreestima el efecto casi exactamente **el doble**, y la deducción de [e2](germinacion/nodos/e2-perturbacion-autovalores.md) explica por qué;
- el estimador corregido (Rayleigh con vectores truncados) acierta mucho más, pero su error **crece con $\kappa$** y tiene una dispersión que nadie ha explicado.

Esa dispersión es la incógnita.

## El problema

Sea $J\in\mathbb R^{N\times N}$ con autovalor dominante simple $\lambda$ y autovectores $\mathbf u$, $\mathbf v$. Para cada neurona $k$, sean:

- $\Delta\lambda_k^{\text{seg}}$: el cambio exacto del autovalor seguido ([i2](germinacion/nodos/i2-seguir-autovalor.md));
- $\delta\lambda_k^{(1)}$: el estimador de primer orden, ecuación (2) de [e2](germinacion/nodos/e2-perturbacion-autovalores.md);
- $\delta\lambda_k^{(T)}$: el estimador de Rayleigh truncado, ecuación (3) de [e2](germinacion/nodos/e2-perturbacion-autovalores.md).

Se define el error relativo

$$\varepsilon_k^{(\cdot)}=\frac{|\operatorname{Re}\delta\lambda_k^{(\cdot)}-\operatorname{Re}\Delta\lambda^{\text{seg}}_k|}{|\operatorname{Re}\Delta\lambda^{\text{seg}}_k|}.$$

**Pregunta:** ¿qué propiedades de $J$ y de la neurona $k$ predicen $\varepsilon_k^{(T)}$? Hay cinco candidatos naturales:

1. el **peso de la neurona en el modo**, $p_k=|\bar u_kv_k|/|\mathbf u^*\mathbf v|$;
2. el **número de condición** $\kappa(\lambda)=\|\mathbf u\|\|\mathbf v\|/|\mathbf u^*\mathbf v|$;
3. la **brecha** $\gamma=\operatorname{Re}\lambda_1-\operatorname{Re}\lambda_2$;
4. la **localización** del modo, $\mathrm{IPR}=\sum_i|v_i|^4/(\sum_i|v_i|^2)^2$ ($1/\mathrm{IPR}$ es el «número efectivo de neuronas» del modo);
5. la **norma de la perturbación** $\|\Delta J_k\|_2$, en relación con $\gamma$.

> **Conjetura 1 (por contrastar, no demostrada).** $\varepsilon_k^{(T)}$ está controlado por la cantidad adimensional
> $$\eta_k=\frac{p_k\,\kappa(\lambda)\,\|\Delta J_k\|_2}{\gamma}.$$
> Es pequeña para casi todas las neuronas, y el error se concentra en las de $p_k$ grande cuando el modo está localizado.

La forma de $\eta_k$ procede del término de segundo orden de la expansión de $\lambda(\varepsilon)$. Ese término contiene la resolvente reducida, cuya norma escala como $\kappa/\gamma$ en matrices no normales. No es un teorema: es una hipótesis razonable que tus datos pueden apoyar o tumbar.

## Qué representaría resolverlo

- **Para tu entrega:** es el resultado matemático del trabajo y encaja exactamente con una asignatura de Matemática Numérica. Un enunciado del tipo «para el 90 % de las neuronas el estimador truncado tiene un error menor que X, y los fallos se concentran donde $\eta_k>c$» es una conclusión cuantitativa y defendible.
- **Para la extensión a FlyWire** (139 000 neuronas): una regla fiable de cuándo basta el estimador permitiría cribar ablaciones **combinadas** (pares, grupos) sin recalcular, que es donde el cálculo exacto se vuelve combinatorio. No puedo anticipar si una regla medida en el gusano se transfiere a la mosca.
- **Para el campo:** sería una extensión, con datos reales y signos, de Milanese et al. (2010) y Young y Porter (2024). Es publicable en una revista de redes de nivel medio si se hace bien y se amplía a varias redes, pero **no en 1,5 meses**.

## Estado del arte

| Trabajo | Qué cubre | Qué no |
|---|---|---|
| Restrepo, Ott y Hunt (2006) | Proponen el estimador truncado para nodos en redes dirigidas | No miden sistemáticamente cuándo falla |
| Milanese, Sun y Nishikawa (2010) | 1.º y 2.º orden frente al exacto, quitando nodos en 4 redes reales; el 1.º orden falla «por un factor de ~22» en su red ER | Sin signos; sin desglose del error por $\kappa$ ni por la brecha |
| Young y Porter (2024) | Precisión del 1.º orden para **aristas**; cota del cambio del autovector en función de la brecha | Solo grafos sintéticos no dirigidos; nodos y redes dirigidas o ponderadas, pendientes |
| Luo y Zhou (oct. 2026) | Susceptibilidad modal de 1.º orden para quitar nodos; rama lenta de Laplacianos **no hermíticos**; redes reales | Pesos **no negativos**; su objetivo es una estrategia de ataque, no la precisión |

Tu hueco: **el jacobiano con signos de un conectoma real**, en régimen no normal, con el error desglosado por los cinco candidatos. Es modesto, pero es tuyo.

## Lo que ya muestra el piloto (orientativo; debes reproducirlo)

Con la receta de [e7](germinacion/nodos/e7-construir-jacobiano.md), $f=0{,}9$ y $h=0{,}5$:

- **El primer orden puro sobreestima sistemáticamente ≈2 veces**: error relativo mediano de ≈1,1 en las 20 neuronas más influyentes.
- **El estimador truncado es mucho mejor**: error mediano en el top 20 del **0,24 %** (escenario A), **8 %** (U y B) y **16 %** de mediana en 30 asignaciones aleatorias de los signos dudosos.
- **El error del truncado crece con $\kappa$**: en las 30 asignaciones aleatorias, $\kappa$ va de 4,5 a 138 y la correlación entre $\log\kappa$ y $\log\varepsilon^{(T)}$ es $0{,}54$ (figura 1). La relación es clara pero muy dispersa, y **explicar esa dispersión es lo que falta**.
- **Localización extrema en el escenario A:** $1/\mathrm{IPR}\approx2$. El modo vive en **dos** neuronas (RMDDR y RMDVL), y quitar cualquiera de ellas lo destruye ($\Delta\alpha\approx-0{,}21$). Es el caso límite en que «perturbación» deja de tener sentido. En U, $1/\mathrm{IPR}\approx10$; en B, $\approx25$.

![Figura 1. Error relativo mediano (20 neuronas más influyentes) de los dos estimadores frente al κ del modo dominante, en 30 asignaciones aleatorias de los signos dudosos. El primer orden se queda en ~100 % (factor 2); el truncado, entre 6 % y 100 %, y crece con κ.](figuras/piloto-error-kappa.png)

**Advertencia:** el piloto todavía **no separa los casos de cambio de identidad** ([i2](germinacion/nodos/i2-seguir-autovalor.md)). Algunos errores grandes pueden deberse a eso y no a la aproximación.

## Enfoque propuesto

1. Para cada neurona y escenario, calcula $\Delta\lambda^{\text{seg}}$, $\Delta\alpha$, $\delta\lambda^{(1)}$, $\delta\lambda^{(T)}$, $p_k$ y $\|\Delta J_k\|_2$. Para cada red, $\kappa$, $\gamma$ e IPR.
2. **Figura principal:** $\varepsilon^{(T)}_k$ frente a $p_k$, coloreada por escenario. Después, frente a $\eta_k$ (Conjetura 1).
3. **Si la Conjetura 1 se sostiene**, el resultado es una regla práctica con un umbral $c$ medido. **Si no**, el resultado es mostrar qué variable explica mejor el error.
4. **Comprobación sintética:** repite con una matriz aleatoria con signos del mismo tamaño, densidad y proporción E:I. ¿El conectoma se comporta distinto de una red aleatoria? En la versión mínima basta con una sola red de comparación; la versión rigurosa está en [e10](germinacion/nodos/e10-estadistica-validacion.md).

## Ficha

- **Tipo:** la pregunta numérica central de tu entrega.
- **Abierta:** sí. No he encontrado ningún trabajo que mida la precisión de estas fórmulas para eliminar nodos en una red real, dirigida, ponderada y con signo.
- **Dificultad:** media-alta para tu nivel actual, pero asumible con e1, e2 y e4.
- **Depende de:** [e2](germinacion/nodos/e2-perturbacion-autovalores.md), [e7](germinacion/nodos/e7-construir-jacobiano.md), [i1](germinacion/nodos/i1-regimen-acoplamiento.md) e [i2](germinacion/nodos/i2-seguir-autovalor.md).
- **Calendario:** semanas 4–5.
- **Cómo sabrás que la has resuelto:** tienes una figura de error frente a la variable predictora con una relación clara (o la demostración de que ninguna candidata la tiene), una frase cuantitativa y la explicación del factor 2.

## Referencias

- Restrepo, J. G., Ott, E., Hunt, B. R. (2006). Characterizing the dynamical importance of network nodes and links. *Phys. Rev. Lett.* 97, 094102. arXiv:cond-mat/0606122 · [PDF](germinacion/recursos/restrepo-ott-hunt-2006.pdf)
- Milanese, A., Sun, J., Nishikawa, T. (2010). Approximating spectral impact of structural perturbations in large networks. *Phys. Rev. E* 81, 046112. arXiv:1001.1431 · [PDF](germinacion/recursos/milanese-sun-nishikawa-2010.pdf)
- Young, J., Porter, M. A. (2024). Dynamical importance and network perturbations. *Phys. Rev. E* 110, 064304. arXiv:2403.14584 · [PDF](germinacion/recursos/young-porter-2024.pdf)
- Luo, K., Zhou, H. (2026). Functional dismantling of network relaxation through slow-branch susceptibility. arXiv:2604.24279v2 · [PDF](germinacion/recursos/luo-zhou-2026.pdf)
- Saad, Y. (2011). *Numerical Methods for Large Eigenvalue Problems*, 2.ª ed., cap. 3. https://www-users.cse.umn.edu/~saad/eig_book_2ndEd.pdf
- Trefethen, L. N., Embree, M. (2005). *Spectra and Pseudospectra*. Princeton University Press.
