# Lo mínimo de *C. elegans*: neuronas, sinapsis y de dónde sale el signo

**Duración orientativa:** 2–3 horas (semana 3). **Depende de:** nada. **Punto de partida:** nivel 0.

## 1. Qué es y por qué importa aquí

Tu informe lo va a leer un matemático (tu profesor), pero si nombras neuronas tienes que saber qué son. Más importante todavía: tienes que entender **por qué los signos de las sinapsis son inciertos**, porque el piloto muestra que esa incertidumbre **decide el resultado** ([i4](germinacion/nodos/i4-robustez-signos.md)). No necesitas saber más biología que la de este nodo.

## 2. Lo que tienes que dominar

### 2.1 El animal y su sistema nervioso

- El hermafrodita adulto tiene **302 neuronas**: 20 en el sistema nervioso de la faringe, casi aislado del resto, y 282 somáticas. Tu red usa las 282 somáticas, igual que la mayoría de los análisis.
- Las neuronas se agrupan en **clases** (unas 118). El nombre tiene 3 letras y un sufijo: `L`/`R` para izquierda/derecha (AVAL, AVAR), `D`/`V` para dorsal/ventral (SMDD, SMDV) o un número para las motoneuronas de la cuerda ventral (DA01…DA09, VD01…VD13). **Los pares L/R suelen tener conexiones casi simétricas**, y eso produce modos casi degenerados ([i5](germinacion/nodos/i5-localizacion-pares-lr.md)).
- Tipos funcionales: **sensoriales** (AWC olfato, ASE sal, ALM/PLM tacto…), **interneuronas** (AIY, AIZ, AIB, RIA, AVA…) y **motoneuronas** (SMD y RMD mueven la cabeza; DA/VA/DB/VB/DD/VD/AS, el cuerpo).
- La mayoría de las neuronas de *C. elegans* **no disparan potenciales de acción clásicos**: señalizan con potenciales graduados. Eso hace que un modelo de tasas o voltajes continuos, como el tuyo, sea razonable en primera aproximación.

### 2.2 Dos tipos de conexión

- **Sinapsis químicas.** Son dirigidas: la neurona presináptica libera un neurotransmisor que actúa sobre receptores de la postsináptica. El conectoma (White et al., 1986; Cook et al., 2019) cuenta los **contactos** entre cada par. Tú usarás ese número como peso: es un sustituto de la fuerza, no una medida de ella.
- **Uniones gap (sinapsis eléctricas).** Son canales que conectan directamente los citoplasmas, por lo que la corriente fluye hacia el lado de menor voltaje: actúan como **difusión**, de ahí el Laplaciano. Se suelen tratar como simétricas, aunque algunas rectifican.

### 2.3 El signo: depende del receptor, no solo del transmisor

Este es el punto clave. Una sinapsis química es **excitadora** si el receptor postsináptico es un canal **catiónico** (despolariza) e **inhibidora** si es **aniónico**, de cloruro (hiperpolariza). En *C. elegans*:

| Transmisor | Receptores excitadores (cationes) | Receptores inhibidores (cloruro) |
|---|---|---|
| Acetilcolina (ACh) | nAChR: `acr-*`, `unc-29`, `unc-38`… | canales de cloruro activados por ACh: `acc-*`, `lgc-47`… |
| Glutamato (Glu) | `glr-*` (tipo AMPA/NMDA) | GluCl: `glc-*`, `avr-14`, `avr-15` |
| GABA | `exp-1`, `lgc-35` | `unc-49`, `gab-1`, `ggr-*`… |

Así que **el glutamato puede excitar o inhibir según la neurona que lo recibe**. Fenyves et al. (2020) cruzaron el transmisor de cada neurona presináptica con los receptores expresados en cada postsináptica y clasificaron cada sinapsis como **+** (solo hay receptores excitadores), **−** (solo inhibidores), **complex** (de ambos tipos) o **no pred** (no hay receptor conocido que encaje). Resultado: predijeron el signo del **73 %** de las sinapsis, con una proporción excitadoras:inhibidoras de ~3,5:1. En la red de 282 neuronas del piloto, por **aristas** (pares de neuronas): 1291 «+», 421 «−», 467 «complex» y **1331 «no pred»**. Más de la mitad de las aristas no tienen un signo claro.

Además, el atlas de neurotransmisores de Wang et al. (2024, *eLife*) revisó las asignaciones con reporteros génicos más fiables. Las predicciones de 2020 no están escritas en piedra.

### 2.4 Lo que el conectoma no ve

Randi et al. (2023, *Nature*) estimularon neuronas una a una y midieron la respuesta de las demás. La propagación de señales difiere de lo que predice la anatomía, en parte por la **señalización extrasináptica** (neuropéptidos y aminas que actúan a distancia sin sinapsis). Tu modelo la ignora por completo; dilo en el informe.

### 2.5 Las neuronas que te van a salir (piloto)

Con distintas asignaciones de signo, el piloto destacó estas neuronas. Conviene saber qué hacen:

- **RIA, SMD, RMD**: el circuito que controla el **movimiento de la cabeza** al reptar (RIA integra señales y modula SMD/RMD). Con conexiones fuertes y recíprocas entre ellas, forman bucles que sostienen modos lentos.
- **AIY, AIZ, AIB**: interneuronas de primera capa que reciben de las sensoriales anfidiales (AWC, ASE…) y regulan los giros y las marchas atrás durante la quimiotaxis.
- **RIM**: participa en las marchas atrás y los giros (es tiraminérgica).
- **AVA, AVB, AVD, PVC**: las **interneuronas de mando** de la locomoción (AVA y AVD hacia atrás; AVB y PVC hacia delante). Son las «estrellas» de Yan et al. (2017). En el piloto pesan **poco** en el modo dominante, contra lo que yo había predicho en el dictamen.

## 3. Cómo estudiarlo

1. **WormAtlas, «Nervous system – general description»** (gratis en línea): introducción y nomenclatura. 40 min.
2. **Fenyves et al. (2020)** ([PDF](germinacion/recursos/fenyves-2020.pdf)): introducción, figura 1 (el método) y resultados globales. Salta los detalles de expresión génica. 45 min.
3. **Gjorgjieva, Biron y Haspel (2014)**, revisión sobre la locomoción (acceso abierto en PMC): el circuito motor y las interneuronas de mando. Primeras secciones. 30 min.
4. *(Ojeada)* **Randi et al. (2023)**: resumen y figura 1, para saber qué se midió. El PDF está en los recursos si la descarga terminó bien; si no, en arXiv.
5. Cuando una neurona te salga en los resultados, busca su ficha en WormAtlas («Individual neurons»).

## 4. Cómo saber que lo dominas

1. ¿Qué diferencia hay entre AVAL y AVAR? ¿Y entre SMDD y SMDV?
2. Explica por qué una sinapsis glutamatérgica puede ser inhibidora.
3. ¿Qué significa que Fenyves etiquete una arista como «complex»? ¿Y como «no pred»? Propón dos formas razonables de tratar cada caso en $M$.
4. ¿Por qué las uniones gap se modelan con un Laplaciano y las sinapsis químicas no?
5. Nombra dos fenómenos biológicos que tu modelo lineal ignora.

## Referencias

- Altun, Z. F., Hall, D. H. (2011). *Nervous system, general description*. WormAtlas. https://www.wormatlas.org/hermaphrodite/nervous/Neuroframeset.html
- White, J. G., Southgate, E., Thomson, J. N., Brenner, S. (1986). The structure of the nervous system of the nematode *Caenorhabditis elegans*. *Phil. Trans. R. Soc. Lond. B* 314, 1–340.
- Cook, S. J. et al. (2019). Whole-animal connectomes of both *Caenorhabditis elegans* sexes. *Nature* 571, 63–71. https://doi.org/10.1038/s41586-019-1352-7
- Fenyves, B. G., Szilágyi, G. S., Vassy, Z., Sőti, C., Csermely, P. (2020). Synaptic polarity and sign-balance prediction using gene expression data in the *C. elegans* chemical synapse neuronal connectome network. *PLoS Comput. Biol.* 16(12), e1007974. arXiv:2101.05177
- Wang, C. et al. (2024). A neurotransmitter atlas of *C. elegans* males and hermaphrodites. *eLife* 13, RP95402. https://elifesciences.org/articles/95402
- Gjorgjieva, J., Biron, D., Haspel, G. (2014). Neurobiology of *Caenorhabditis elegans* locomotion: where do we stand? *BioScience* 64(6), 476–486. https://pmc.ncbi.nlm.nih.gov/articles/PMC4776678/
- Randi, F., Sharma, A. K., Dvali, S., Leifer, A. M. (2023). Neural signal propagation atlas of *Caenorhabditis elegans*. *Nature* 623, 406–414. arXiv:2208.04790
- Yan, G. et al. (2017). Network control principles predict neuron function in the *C. elegans* connectome. *Nature* 550, 519–523. https://pmc.ncbi.nlm.nih.gov/articles/PMC5710776/
