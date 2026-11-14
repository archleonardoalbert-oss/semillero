## Cómo se llegó a este problema

El cuerpo del gusano tiene, en gran medida, simetría bilateral, y su sistema nervioso también. La mayoría de las clases de neuronas vienen en pares izquierda/derecha (AVAL/AVAR, RIAL/RIAR…), o en cuartetos dorsal/ventral e izquierda/derecha (RMDDL, RMDDR, RMDVL, RMDVR). Desde el trabajo clásico de White et al. (1986), y en los análisis cuantitativos que el *Connectome Toolbox* de OpenWorm hace de cada conjunto de datos, se sabe que las conexiones de cada par son **casi** simétricas, pero no del todo. Parte de la asimetría es biología real y parte es ruido de la reconstrucción por microscopía electrónica.

En álgebra lineal, la simetría tiene consecuencias precisas. Si la red fuera exactamente simétrica, con $P$ la permutación que intercambia cada neurona L con su R, se cumpliría $PJP^\top=J$, y los modos se separarían en **simétricos** y **antisimétricos**. Con una simetría solo aproximada aparecen **pares de modos casi degenerados**, y un fenómeno conocido en física de sistemas desordenados: una pequeña asimetría puede bastar para que un modo se **localice en un solo lado**.

El piloto se topó con esto de lleno. En el escenario A (signos dudosos a cero), el modo dominante vive en **dos** neuronas ($1/\mathrm{IPR}\approx2$): RMDDR y RMDVL. Quitar RMDDR baja $\alpha$ en $0{,}216$; quitar su gemela RMDDL, solo $0{,}0016$. Es una asimetría de **más de 100 veces** en un par que se considera funcionalmente equivalente. La explicación más probable es que el bucle espejo RMDDL–RMDVR tiene pesos algo menores, de modo que su modo queda justo detrás y no es el dominante. Si es así, el «ganador» depende de unas pocas sinapsis contadas de más o de menos.

## El problema

Sea $P$ la permutación L↔R (las neuronas sin pareja quedan fijas) y sea $\Delta_{\text{sim}}=\|PJP^\top-J\|/\|J\|$ la asimetría relativa del jacobiano.

1. **Casi degeneración:** ¿cuántos pares de autovalores $(\lambda_a,\lambda_b)$ cerca de la abscisa espectral tienen autovectores relacionados por $P$, es decir, $|\langle P\mathbf v_a,\mathbf v_b\rangle|\approx1$, y cuál es su separación $|\lambda_a-\lambda_b|$ comparada con $\Delta_{\text{sim}}$?
2. **Ablación individual frente a ablación de clase:** ¿el ranking por clases, quitando las dos neuronas del par a la vez como hacen los experimentos de laboratorio y Yan et al. (2017), es más estable entre escenarios de signos que el ranking por neuronas sueltas?
3. **Reproducibilidad:** ¿la asimetría L/R de $\Delta\alpha$ se repite entre conectomas de individuos distintos (Cook 2019 frente a los dos adultos de Witvliet et al. 2021)? Si no se repite, es ruido de la reconstrucción.

## Qué representaría resolverlo

- **Si la localización en un lado es un artefacto**, el procedimiento correcto para cualquier análisis espectral del conectoma es **simetrizar** o **ablacionar por clases**. Es una recomendación metodológica útil y fácil de adoptar por otros.
- **Si es robusta entre conectomas**, sería una predicción de **asimetría funcional** entre neuronas gemelas que se puede comprobar con ablaciones láser de una sola neurona.
- **Matemáticamente**, es el caso de estudio natural para pasar de perturbar autovalores a perturbar subespacios ([e9](germinacion/nodos/e9-pseudoespectros-subespacios.md)): diagonalizar la perturbación restringida al subespacio de dos modos.
- No sé cuál de los dos casos ocurrirá.

## Estado del arte

- **OpenWorm Connectome Toolbox:** incluye un cuaderno que mide la simetría bilateral de las conexiones en cada conjunto de datos. Es un punto de partida directo para estimar $\Delta_{\text{sim}}$.
- **Varshney et al. (2011):** observan modos propios del Laplaciano gap que agrupan circuitos concretos, pero no analizan su simetría L/R.
- **Witvliet et al. (2021):** ocho conectomas a lo largo del desarrollo, dos de ellos adultos. Permiten distinguir variabilidad entre individuos de asimetría sistemática.
- **Teoría:** la perturbación de subespacios casi degenerados en matrices no normales (Stewart, $\operatorname{sep}$, pseudoespectros) está en [e9](germinacion/nodos/e9-pseudoespectros-subespacios.md).

## Enfoque propuesto

1. Construye $P$ emparejando los nombres que terminan en `L` y `R`. Los cuartetos (`DL`/`DR`, `VL`/`VR`) se emparejan dentro de cada nivel dorsal o ventral.
2. Calcula $\Delta_{\text{sim}}$ para cada escenario de signos.
3. Para los 10 autovalores de mayor parte real, calcula el solapamiento de cada $P\mathbf v_a$ con los demás autovectores e identifica los pares.
4. Repite las ablaciones por clase y compara con [i4](germinacion/nodos/i4-robustez-signos.md).
5. Con `cect`, repite el cálculo en los adultos de Witvliet. Ojo: los signos de Fenyves se definieron sobre la reconstrucción de Cook, así que habrá que cruzar nombres.

## Ficha

- **Tipo:** pregunta matemática con lectura biológica.
- **Abierta:** sí.
- **Dificultad:** alta.
- **Depende de:** [i3](germinacion/nodos/i3-precision-perturbativa.md).
- **Calendario:** opcional; solo si en la semana 5 te sobra tiempo. Si no, es lo primero que atacaría después de la entrega, junto con [e9](germinacion/nodos/e9-pseudoespectros-subespacios.md).

## Referencias

- White, J. G., Southgate, E., Thomson, J. N., Brenner, S. (1986). The structure of the nervous system of the nematode *Caenorhabditis elegans*. *Phil. Trans. R. Soc. Lond. B* 314, 1–340.
- OpenWorm. *Investigating bilateral symmetry* (cuaderno del Connectome Toolbox). https://openworm.org/ConnectomeToolbox/notebooks/BilateralSymmetry/
- Witvliet, D. et al. (2021). Connectomes across development reveal principles of brain maturation. *Nature* 596, 257–261. https://doi.org/10.1038/s41586-021-03778-8
- Varshney, L. R. et al. (2011). *PLoS Comput. Biol.* 7(2), e1001066. arXiv:0907.2373 · [PDF](germinacion/recursos/varshney-2011.pdf)
- Yan, G. et al. (2017). Network control principles predict neuron function in the *C. elegans* connectome. *Nature* 550, 519–523.
- Saad, Y. (2011). *Numerical Methods for Large Eigenvalue Problems*, 2.ª ed., §3.3.3. https://www-users.cse.umn.edu/~saad/eig_book_2ndEd.pdf
