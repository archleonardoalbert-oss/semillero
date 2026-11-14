## Cómo se llegó a este problema

En 2017, Yan, Vértes, Towlson, Chew, Walker, Schafer y Barabási publicaron en *Nature* algo que pocas veces se consigue en ciencia de redes: una **predicción teórica confirmada en el laboratorio**. Aplicaron controlabilidad estructural al conectoma, tomando como entradas los receptores táctiles (ALM, AVM, PLM) y como salidas los 95 músculos, y predijeron que el control de la locomoción requiere **12 clases** de neuronas: DA, DB, DD, VA, VB, VD, AS, AVA y PDB para controlar los músculos, y además AVB, AVD y PVC para controlar las motoneuronas. Once ya se conocían por ablaciones clásicas; la duodécima, **PDB**, era nueva, y al destruirla con láser el gusano perdía la polaridad dorsoventral en los giros amplios. También acertaron a nivel de neurona individual: DD04 y DD05 afectaban al movimiento posterior, y DD02 y DD03 no.

Esa es la referencia que dio título a tu idea. Pero el camino hasta aquí ha cambiado lo que se puede comparar:

- **Jiang y Lai (2019)** criticaron que la controlabilidad lineal sea relevante en redes no lineales, y usaron justamente *C. elegans* como ejemplo: el conjunto mínimo de controladores (101) supera el número de neuronas sensoriales (86). La misma crítica alcanza a tu modelo lineal.
- **Kim et al. (2016)** y **Bacik et al. (2016)** ya ordenaron las neuronas por ablación virtual con otros criterios (medidas de grafo y estructura de flujo). Son otras «verdades computacionales» con las que contrastar.
- **El piloto** mostró que tu ranking depende de los signos ([i4](germinacion/nodos/i4-robustez-signos.md)), y que ni siquiera sin signos destacan las interneuronas de mando que Yan comparte con el *rich club* del conectoma.

## El problema

Sea $T=\{k: P_k>0{,}5\}$ el conjunto de neuronas que caen en el top 10 en más de la mitad de las asignaciones de signo ([i4](germinacion/nodos/i4-robustez-signos.md)). Sean $Y$ las 12 clases de Yan, $K$ las 12 neuronas críticas de Kim et al. (2016) y $E$ un catálogo de neuronas cuya ablación láser produce un defecto conductual documentado.

**Pregunta:** ¿el solapamiento de $T$ con $Y$, $K$ y $E$ es mayor que el que se obtendría eligiendo neuronas al azar, o al azar entre las de grado parecido? ¿Y qué significa ese solapamiento, o su ausencia, si las preguntas que responde cada método son distintas?

Hay tres razones de partida por las que **no cabe esperar coincidencia con Yan**:

1. **Yan predice otra cosa:** qué neuronas hacen falta para **controlar los músculos** desde el tacto. Tú mides qué neuronas sostienen **el modo más lento** del jacobiano. Una discrepancia no refuta ninguna de las dos.
2. **Siete de sus 12 clases son motoneuronas** (DA, DB, DD, VA, VB, VD, AS). Tu red no incluye músculos, así que esas motoneuronas son casi sumideros y difícilmente pesarán en un modo recurrente.
3. **El ranking depende de los signos:** cualquier coincidencia hay que evaluarla sobre el conjunto de asignaciones, no sobre una sola.

## Qué representaría resolverlo

- **En la versión mínima (la entrega):** un párrafo de contexto biológico honesto que evita dos errores habituales: vender una coincidencia casual como validación y presentar una discrepancia esperable como refutación.
- **En la versión seria (después):** una comparación cuantitativa con un catálogo curado de ablaciones experimentales. Es el tipo de resultado que podría convertir el proyecto en publicable, **pero solo si el ranking resulta robusto en [i4](germinacion/nodos/i4-robustez-signos.md)**. No puedo anticipar el resultado.
- Con el piloto, la previsión es **poco solapamiento con Yan** (RIM, AIB y SAA no están en sus 12 clases) y **algo de coherencia con el circuito de navegación** (AIB y RIM participan en las marchas atrás y los giros). Eso es una observación, no una validación.

## Estado del arte y matices

- **Yan et al. (2017):** validaron con láser PDB y DD04/DD05; el resto de sus 12 clases ya se conocía. Su red incluye los músculos y las uniones gap, pero no usa pesos ni signos.
- **Jiang y Lai (2019):** la crítica principal a los análisis lineales del conectoma ([PDF](germinacion/recursos/jiang-lai-2019.pdf)).
- **Kim et al. (2016):** ablación virtual de las 279 neuronas sobre la red dirigida y ponderada (eficiencia, *clustering*, intermediación). Sus 12 neuronas críticas son AQR, AVAL, AVAR, AVER, AVHL, DVA, DVC, PVCL, PVCR, PVPR, DA01 y VD01. No hay validación experimental.
- **Bacik et al. (2016):** todas las ablaciones simples y **dobles** según la estructura de flujo multiescala.

## Enfoque propuesto

**Versión mínima (≈1 hora, semana 5).** Una tabla con estas columnas:

- las neuronas de $T$;
- si pertenecen a alguna clase de Yan o a la lista de Kim;
- el efecto de su ablación láser según WormAtlas o la literatura (una línea con la cita).

Y un párrafo honesto que recoja los tres matices de «El problema».

**Versión seria (después de la entrega):**

1. Curar el catálogo $E$ a partir de la literatura de ablaciones.
2. Hacer un test por permutación contra neuronas de grado comparable ([e10](germinacion/nodos/e10-estadistica-validacion.md)).
3. Opcionalmente, añadir los músculos a la red para que la comparación con Yan sea justa.

## Ficha

- **Tipo:** contraste biológico.
- **Abierta:** sí.
- **Dificultad:** alta.
- **Depende de:** [i4](germinacion/nodos/i4-robustez-signos.md) y [e6](germinacion/nodos/e6-celegans-minimo.md).
- **Calendario:** versión mínima de 1 hora en la semana 5; la versión seria, después de la entrega.

## Referencias

- Yan, G., Vértes, P. E., Towlson, E. K., Chew, Y. L., Walker, D. S., Schafer, W. R., Barabási, A.-L. (2017). Network control principles predict neuron function in the *Caenorhabditis elegans* connectome. *Nature* 550, 519–523. https://pmc.ncbi.nlm.nih.gov/articles/PMC5710776/
- Jiang, J., Lai, Y.-C. (2019). Irrelevance of linear controllability to nonlinear dynamical networks. *Nat. Commun.* 10, 3961. arXiv:1909.01288
- Kim, J. S., Kim, S., Kralik, J. D., Jeong, J. (2016). Vulnerability-based critical neurons, synapses, and pathways in the *Caenorhabditis elegans* connectome. *PLoS Comput. Biol.* 12(8), e1005084. https://pmc.ncbi.nlm.nih.gov/articles/PMC4991803/
- Bacik, K. A., Schaub, M. T., Beguerisse-Díaz, M., Billeh, Y. N., Barahona, M. (2016). Flow-based network analysis of the *Caenorhabditis elegans* connectome. *PLoS Comput. Biol.* 12(8), e1005055. arXiv:1511.00673
- Altun, Z. F., Hall, D. H. WormAtlas: fichas de neuronas individuales. https://www.wormatlas.org/
