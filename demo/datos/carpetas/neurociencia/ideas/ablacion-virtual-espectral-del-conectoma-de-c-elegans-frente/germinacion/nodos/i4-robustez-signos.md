## Cómo se llegó a este problema

Durante décadas, el conectoma de *C. elegans* fue un mapa **sin signos**: White et al. (1986) y luego Cook et al. (2019) contaron qué neurona contacta con cuál y cuántas veces, pero un contacto sináptico no dice si **excita o inhibe**. Eso depende del receptor de la neurona que recibe ([e6](germinacion/nodos/e6-celegans-minimo.md)): el glutamato excita a través de los receptores `glr-*` e inhibe a través de los canales de cloruro `glc-*` o `avr-14`. Medirlo sinapsis a sinapsis con electrofisiología es lentísimo, así que en 2020 Fenyves, Szilágyi, Vassy, Sőti y Csermely tomaron un atajo ingenioso: cruzar el neurotransmisor de cada neurona emisora con los receptores que expresa cada receptora. Predijeron el signo del 73 % de las sinapsis, con una proporción excitadoras:inhibidoras de ≈3,5:1.

Ese conjunto de datos es lo que hizo posible tu camino del «jacobiano con signos». Pero, contado por **aristas** (pares de neuronas) en la red de 282 neuronas, el balance es menos cómodo: 1291 «+», 421 «−», 467 «complex» (hay receptores de los dos tipos) y **1331 «no pred»** (no se conoce ningún receptor que encaje). **Más de la mitad de las aristas no tienen un signo claro.** Además, el atlas de neurotransmisores de Wang et al. (2024) revisó varias asignaciones con reporteros génicos más fiables, así que ni siquiera los signos predichos son definitivos.

El piloto convirtió esta incertidumbre en el hallazgo principal del proyecto: **el ranking de neuronas cambia casi por completo según cómo se rellenen los signos dudosos**. Es también lo que más me sorprendió. En el dictamen predije que mandarían las interneuronas de mando (AVA, AVB, AVD y PVC), y no ocurre en ningún escenario.

## El problema

Sea $\mathcal S$ el conjunto de asignaciones de signo compatibles con lo que se sabe: las aristas «+» y «−» quedan fijas, y las «complex» y «no pred» pueden ser $\pm1$, con una distribución previa, por ejemplo $P(+)=0{,}778$, la proporción E/(E+I) de Fenyves. Para $s\in\mathcal S$ se construye $J_s$ y la ordenación $R(s)$ de las neuronas por $\Delta\alpha_k(s)$.

**Pregunta:** ¿qué propiedades de $R(s)$ son (casi) invariantes en $\mathcal S$? Por ejemplo:

- la probabilidad de que cada neurona esté en el top 10, $P_k=\Pr_{s}[k\in\mathrm{top}_{10}(R(s))]$;
- la distribución de $\Delta\alpha_k(s)$ para cada neurona.

Y la pregunta inversa: **¿qué aristas de signo dudoso deciden el resultado?** Cambiar el signo de la arista $j\to i$ es la perturbación $\Delta J=-2J_{ij}\,\mathbf e_i\mathbf e_j^\top$. Por la fórmula de primer orden de [e2](germinacion/nodos/e2-perturbacion-autovalores.md),

$$\delta\lambda_{ij}^{\text{signo}}\approx-\frac{2J_{ij}\,\bar u_i\,v_j}{\mathbf u^*\mathbf v}. \tag{1}$$

Con una sola descomposición espectral se pueden ordenar **las ~1800 aristas dudosas** según cuánto movería $\alpha$ fijar su signo. Invertir un signo no elimina un nodo, sino que modifica una sola entrada, así que es de esperar que (1) sea bastante más precisa que en la ablación. Hay que comprobarlo con el recálculo exacto.

## Qué representaría resolverlo

- **Si hay un núcleo robusto** (por ejemplo, RIM y AIB), tendrás una afirmación biológica modesta pero defendible: «en un modelo lineal con signos predichos, estas neuronas sostienen el modo lento con independencia de la asignación de los signos dudosos».
- **Si no lo hay**, la conclusión es metodológica, y útil para cualquiera que haga análisis espectrales del conectoma: los rankings espectrales con signos de *C. elegans* son prematuros hasta que se midan los signos clave.
- **La lista de (1)** diría **qué sinapsis conviene medir primero**: un resultado que un laboratorio puede usar. Es la parte con más potencial de originalidad. No puedo anticipar si esas sinapsis ya se han medido por electrofisiología; comprobarlo exige revisar la literatura experimental, y la *S4 Table* de Fenyves et al. (2020), que compara con resultados publicados, es el punto de partida.

## Lo que dice el piloto: casi nada es invariante

![Figura 1. Δα de las neuronas que destacan en algún escenario. Puntos grises: 30 asignaciones aleatorias de los signos dudosos (78 % excitadoras). Las neuronas que mandan con un criterio de signos desaparecen con otro.](figuras/piloto-dependencia-signos.png)

- **Entre los tres escenarios deterministas** (U: sin signo; A: dudosos = 0; B: dudosos excitadores): $\tau$ de Kendall entre $-0{,}07$ y $0{,}14$. En el top 10, 3, 0 y 0 neuronas en común.
- **Entre 30 asignaciones aleatorias:** $\tau$ medio de $0{,}13$.
- **Algunas neuronas destacan con frecuencia.** Porcentaje de asignaciones en que cada una cae en el top 10: **RIML 70 %, AIBR 67 %, AIBL 67 %, RIMR 60 %, SAAVL 57 %, AIZR 50 %**. RIM y AIB forman parte del circuito de marcha atrás y giros que se recluta durante la navegación quimiotáctica.
- **Corrección a mi dictamen.** Allí predije que, sin signos, mandarían AVA, AVB, AVD y PVC. En este modelo, incluso sin signos (U), mandan RIA, SMD y RMD (el circuito de la cabeza), y AVA solo produce $\Delta\alpha\approx-0{,}003$. Aquella predicción se refería a la adyacencia sin Laplaciano y con otros pesos; aun así, falló, y debes saberlo.

**Lectura honesta:** con los signos disponibles, la pregunta «¿qué neuronas son importantes para el modo lento?» **no tiene una respuesta única**. Que esto quede bien medido y bien explicado *es* un resultado válido, y bastante interesante, para tu entrega.

## Estado del arte

- **Fenyves et al. (2020)** presentan sus signos como predicciones y estudian la robustez de la **proporción global** E:I (3,1–4,1 según la reconstrucción). No estudian cómo se propaga la incertidumbre a la dinámica.
- **Szilágyi et al. (2026, *BMC Biology*)**, del mismo grupo, analizan **motivos con signo** de tres nodos en este conectoma: abundan los bucles positivos hacia delante y los negativos de retroalimentación. Es estructura local; no hay espectro ni ablación ([PDF](germinacion/recursos/szilagyi-2026-signed-motifs.pdf)).
- **Wang et al. (2024, *eLife*)** revisan el mapa de neurotransmisores. Podrían cambiar algunos signos de Fenyves, y nadie ha recalculado sus predicciones con el atlas nuevo ([PDF](germinacion/recursos/wang-2024-elife.pdf)).
- No he encontrado ningún trabajo que propague la incertidumbre de los signos a un ranking dinámico de neuronas.

## Enfoque propuesto

**Versión mínima (para la entrega):**

1. Genera un conjunto de $n=50$–$100$ asignaciones aleatorias (escenario R de [e7](germinacion/nodos/e7-construir-jacobiano.md)) con semillas fijas.
2. Calcula para cada neurona $P_k$, la mediana de $\Delta\alpha_k$ y su rango intercuartílico.
3. Haz una tabla con las neuronas de $P_k>0{,}5$ y rehaz tú la figura 1.
4. Si vas mal de tiempo, quédate con los tres escenarios deterministas y su $\tau$.

**Versión ampliada (si llegas):**

5. Calcula (1) para las ~1800 aristas dudosas en el escenario de referencia.
6. Comprueba la precisión de (1) frente al recálculo exacto en las 20 primeras.
7. Mira si las primeras de la lista se concentran en pocos circuitos.

## Ficha

- **Tipo:** la pregunta biológica central y el hallazgo más importante del piloto.
- **Abierta:** sí.
- **Dificultad:** alta, sobre todo conceptualmente: decidir qué se puede concluir.
- **Depende de:** [i3](germinacion/nodos/i3-precision-perturbativa.md) y [e8](germinacion/nodos/e8-comparar-rankings.md).
- **Calendario:** semana 5.
- **Cómo sabrás que la has resuelto:** tienes la tabla de $P_k$ con al menos 50 asignaciones y una frase que diga qué es robusto y qué no. En la versión ampliada, además, la lista de las 20 sinapsis más influyentes según (1), con su comprobación exacta.

## Referencias

- Fenyves, B. G., Szilágyi, G. S., Vassy, Z., Sőti, C., Csermely, P. (2020). Synaptic polarity and sign-balance prediction using gene expression data in the *C. elegans* chemical synapse neuronal connectome network. *PLoS Comput. Biol.* 16(12), e1007974. arXiv:2101.05177 · [PDF](germinacion/recursos/fenyves-2020.pdf)
- Szilágyi, G. S., Gulyás, A., Vassy, Z., Csermely, P., Fenyves, B. G. (2026). Signed motif analysis of the *Caenorhabditis elegans* neuronal network reveals positive feedforward and negative feedback loops. *BMC Biology* 24, 167. https://doi.org/10.1186/s12915-026-02641-4
- Wang, C. et al. (2024). A neurotransmitter atlas of *C. elegans* males and hermaphrodites. *eLife* 13, RP95402. https://elifesciences.org/articles/95402
- White, J. G., Southgate, E., Thomson, J. N., Brenner, S. (1986). The structure of the nervous system of the nematode *Caenorhabditis elegans*. *Phil. Trans. R. Soc. Lond. B* 314, 1–340.
- Cook, S. J. et al. (2019). Whole-animal connectomes of both *Caenorhabditis elegans* sexes. *Nature* 571, 63–71.
- Restrepo, J. G., Ott, E., Hunt, B. R. (2006). *Phys. Rev. Lett.* 97, 094102.
