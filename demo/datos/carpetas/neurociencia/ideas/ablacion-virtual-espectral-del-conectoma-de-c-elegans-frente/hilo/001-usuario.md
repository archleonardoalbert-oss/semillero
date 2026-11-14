Quiero hacer un proyecto de matemática numérica aplicada a neurociencia: **ablacionar virtualmente, una a una, las neuronas del conectoma de *C. elegans* y medir cuánto cambia el espectro de la red**, para ordenar las neuronas por importancia y comparar ese orden con lo que se sabe de verdad.

## La idea

Represento el conectoma (unas 279 neuronas, sinapsis químicas dirigidas y uniones gap) como una matriz $A$. Quitar la neurona $k$ equivale a borrar su fila y su columna. Lo que me interesa es cuánto cambia el autovalor dominante $\lambda$, y también otros modos, como $\lambda_2$ del Laplaciano o los modos lentos.

A primer orden se puede predecir sin recalcular nada, con los autovectores izquierdo $\mathbf{u}$ y derecho $\mathbf{v}$ (Restrepo, Ott y Hunt, 2006):

$$
\delta\lambda_k \approx -\frac{(\lambda - A_{kk})\,u_k v_k}{\mathbf{u}^{\top}\mathbf{v}} \tag{1}
$$

Con unas 300 neuronas, el recálculo exacto cuesta segundos, así que el objetivo no es ahorrar cálculo. Lo que quiero es:

1. **Interpretar:** la fórmula (1) atribuye la importancia de una neurona a cómo se localiza el modo sobre ella.
2. **Medir cuándo falla la aproximación en un conectoma real.** Young y Porter (2024) solo lo midieron en grafos sintéticos y dejaron pendientes las redes dirigidas y ponderadas. Quiero desglosar el error según el número de condición $\kappa(\lambda) = \|\mathbf{u}\|\|\mathbf{v}\|/|\mathbf{u}^\top\mathbf{v}|$, el *gap* espectral y los autovalores casi degenerados (con subespacios y Davis–Kahan), y comparar primer orden, segundo orden y recálculo exacto.
3. **Enfrentar el ranking espectral con el de Yan et al. (*Nature*, 2017).** Ellos usaron controlabilidad estructural, sin pesos ni espectro, y predijeron 12 clases de neuronas esenciales; la ablación láser de PDB confirmó una de ellas. ¿El espectro recupera esas clases? ¿Encuentra otras?

## Lo que sé de antemano

* **Datos públicos:** el paquete `cect` de OpenWorm (Varshney 2011, Cook 2019, los 8 conectomas de Witvliet) y los signos de las sinapsis de Fenyves (2020).
* **Validación posible sin laboratorio:** las 12 clases de Yan, las ablaciones de PDB y DD04/DD05, y la robustez entre conectomas distintos.
* **Riesgos:**
  * Que el ranking espectral salga casi igual que el grado ponderado. Lo controlaría con correlaciones parciales y modelos nulos que conserven el grado.
  * Que solo recupere las interneuronas de mando ya conocidas (AVA, AVB, AVD, PVC). Por eso quiero mirar varios modos, no solo el dominante.
* **Por qué este ángulo:** de los cinco que estudié, es el de matemática más limpia y menos riesgo de que alguien lo publique antes. Además, es la base de las mejores combinaciones: escalar el mismo código al conectoma de la mosca (FlyWire, 139 000 neuronas), donde la perturbación ya es la única vía asequible, o unirlo a un modelo de ODEs mediante la sensibilidad del Jacobiano.

## Mi duda

No soy experto en neurociencia y la teoría de perturbaciones de autovalores no dirigidos/dirigidos con signo la domino a medias. ¿Tiene sentido como proyecto universitario de 3 a 6 meses?
