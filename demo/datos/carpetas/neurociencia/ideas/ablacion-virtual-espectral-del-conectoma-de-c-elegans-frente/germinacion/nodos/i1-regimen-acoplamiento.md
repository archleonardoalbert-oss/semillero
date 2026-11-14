## Cómo se llegó a este problema

Cuando Varshney, Chen, Paniagua, Hall y Chklovskii publicaron en 2011 su análisis estructural del conectoma de *C. elegans*, incluyeron una sección breve y muy influyente: escribieron la dinámica de la red como un sistema **lineal**. Primero, las uniones gap como una ecuación de difusión, $\tau\dot V=-L_{\text{gap}}V$, y después la red combinada mediante la matriz $\Phi=-L_{\text{gap}}+A_{\text{chem}}^\top$. Su objetivo era descriptivo: mostrar qué circuitos aparecen en los modos propios. Para eso no les hacía falta preguntarse **con qué fuerza** acopla cada sinapsis. Dieron a cada contacto peso 1 y no barrieron ningún parámetro.

Tu proyecto hereda ese modelo y le añade los signos de Fenyves et al. (2020). Pero al convertirlo en un jacobiano con significado dinámico,

$$J(g,h)=-I+g\,M-h\,\hat L,$$

aparecen dos números que el conectoma **no contiene**:

- **$g$** convierte «número de contactos» en fuerza de acoplamiento. Además absorbe la ganancia $\phi'(r^*)$ del modelo de tasas ([e3](germinacion/nodos/e3-edo-lineales-estabilidad.md)), que tampoco se conoce.
- **$h$** decide cuánto pesan las uniones gap frente a las sinapsis químicas.

Los modelos biofísicos del gusano entero, como el de Kunert, Shlizerman y Kutz (2014) y sus sucesores, evitan esta ambigüedad ajustando conductancias neurona a neurona. Eso queda muy lejos de tu alcance y de tu objetivo. El atlas funcional de Randi et al. (2023) mide respuestas efectivas que, en principio, permitirían calibrar $g$ y $h$, pero hacerlo es trabajo de meses ([i7](germinacion/nodos/i7-validacion-randi.md)).

En el piloto tuve que elegir algo para poder calcular: $g=0{,}9\,g_c$ y $h=0{,}5$. Es una elección razonable, pero arbitraria. Antes de creer cualquier ranking de neuronas hay que saber si esa elección lo condiciona. De ahí sale esta incógnita.

## El problema

Sea $g_c(h)$ el acoplamiento crítico, es decir, el valor de $g$ en que la abscisa espectral $\alpha(J(g,h))=\max_i\operatorname{Re}\lambda_i$ se anula. Parametrizamos $g=f\cdot g_c(h)$ con $f\in(0,1)$, de modo que $f$ mide la distancia a la inestabilidad. Para cada par $(f,h)$, sea $R(f,h)$ la ordenación de las 282 neuronas según

$$\Delta\alpha_k(f,h)=\alpha\big(J^{(-k)}(f,h)\big)-\alpha\big(J(f,h)\big),$$

donde $J^{(-k)}$ es el jacobiano sin la neurona $k$, con la corrección de grado de las uniones gap de [e7](germinacion/nodos/e7-construir-jacobiano.md).

**Pregunta:** ¿cuánto varía $R(f,h)$ en una región razonable de parámetros? Se mide con la $\tau$ de Kendall y el solapamiento del top-10 respecto a la referencia $(f,h)=(0{,}9;\,0{,}5)$.

> **Proposición 1 (caso sin uniones gap; demuéstrala tú).** Si $h=0$, entonces $\alpha(J)=-1+g\,\mu(M)$ y $\alpha(J^{(-k)})=-1+g\,\mu(M^{(-k)})$, donde $\mu$ es la abscisa espectral. Por tanto, $\Delta\alpha_k=g\,\Delta\mu_k$ y **el ranking no depende de $f$**. Toda la dependencia de los parámetros procede de $h$, es decir, de la competencia entre la parte química y la eléctrica.

La demostración ocupa dos líneas: sumar un múltiplo de la identidad desplaza todos los autovalores lo mismo. Pero sale un resultado útil: la rejilla solo tiene que explorar de verdad la dirección $h$.

## Qué representaría resolverlo

- **Si el ranking es estable en la rejilla**, podrás escribir con fundamento que los resultados no dependen del acoplamiento elegido. El foco del informe pasa entonces, legítimamente, a la incertidumbre de los signos ([i4](germinacion/nodos/i4-robustez-signos.md)), que el piloto señala como el factor dominante.
- **Si depende fuertemente de $h$**, eso ya es un resultado: la importancia dinámica de una neurona dependería de cuánto pesan las uniones gap, una cantidad que se puede intentar estimar experimentalmente. Además, obligaría a presentar los rankings como función de $h$ y no como una lista única.
- No puedo anticipar cuál de los dos casos ocurrirá: en el piloto solo usé $h=0{,}5$.
- En ambos casos, la Proposición 1 es un resultado pequeño, limpio y demostrable para la sección teórica del informe.

## Estado del arte

- **Varshney et al. (2011):** pesos unitarios por contacto y ningún barrido de parámetros. Su objetivo era identificar circuitos en los modos, no ordenar neuronas.
- **Kunert, Shlizerman y Kutz (2014):** modelo biofísico con conductancias por neurona sobre el conectoma completo. Muestra que la dinámica de baja dimensión depende de los parámetros, pero a otra escala de complejidad.
- **Randi et al. (2023):** respuestas funcionales medidas. Es la única vía realista para calibrar $g$ y $h$ contra datos, pero queda fuera del plazo.
- No conozco ningún trabajo que estudie la **sensibilidad de un ranking espectral del conectoma a la proporción química/gap**.

## Enfoque propuesto

1. **Calcula $g_c(h)$ por bisección** sobre $g$ hasta que $\alpha(J)$ cambie de signo. Comprueba la bisección con el caso $h=0$, donde $g_c=1/\mu(M)$ en forma cerrada.
2. **Barre una rejilla pequeña:** $f\in\{0{,}5;\ 0{,}9;\ 0{,}99\}$ y $h\in\{0;\ 0{,}5;\ 2\}$. Son 9 combinaciones; cada una cuesta menos de un minuto.
3. **Mide la estabilidad:** la $\tau$ de Kendall y el solapamiento del top-10 de cada combinación frente a la referencia. Usa las precauciones de [e8](germinacion/nodos/e8-comparar-rankings.md) con la cola de valores casi nulos.
4. **Verifica numéricamente la Proposición 1:** con $h=0$, las tres columnas de $f$ deben dar $\tau=1$ salvo errores de redondeo.
5. **Si vas mal de tiempo:** quédate con $h\in\{0;\ 0{,}5\}$ y un único $f$.

## Ficha

- **Tipo:** decisión de modelado con consecuencias medibles.
- **Abierta:** no en sentido científico, pero nadie la ha resuelto para este modelo.
- **Dificultad:** media.
- **Depende de:** [e3](germinacion/nodos/e3-edo-lineales-estabilidad.md) y [e7](germinacion/nodos/e7-construir-jacobiano.md).
- **Calendario:** semana 4, las primeras 1–2 horas.
- **Cómo sabrás que la has resuelto:** tienes una tabla $3\times3$ con la $\tau$ de cada combinación frente a la referencia, una frase de conclusión y la demostración de la Proposición 1.

## Referencias

- Varshney, L. R., Chen, B. L., Paniagua, E., Hall, D. H., Chklovskii, D. B. (2011). Structural properties of the *Caenorhabditis elegans* neuronal network. *PLoS Comput. Biol.* 7(2), e1001066. arXiv:0907.2373 · [PDF](germinacion/recursos/varshney-2011.pdf)
- Kunert, J., Shlizerman, E., Kutz, J. N. (2014). Low-dimensional functionality of complex network dynamics: neurosensory integration in the *Caenorhabditis elegans* connectome. *Phys. Rev. E* 89, 052805. https://doi.org/10.1103/PhysRevE.89.052805
- Randi, F., Sharma, A. K., Dvali, S., Leifer, A. M. (2023). Neural signal propagation atlas of *Caenorhabditis elegans*. *Nature* 623, 406–414. arXiv:2208.04790 · [PDF](germinacion/recursos/randi-2023.pdf)
- Fenyves, B. G. et al. (2020). Synaptic polarity and sign-balance prediction using gene expression data in the *C. elegans* chemical synapse neuronal connectome network. *PLoS Comput. Biol.* 16(12), e1007974.
