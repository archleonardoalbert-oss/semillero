---
veredicto: cambios
etapa: 2
resumen: Es un buen proyecto de 3 a 6 meses y la parte numérica está bien elegida, pero tal como está planteado su resultado principal es previsible (ranking ≈ grado, comparación con Yan sesgada de antemano) y parte del hueco que crees cubrir ya está ocupado; hay que cambiar la matriz que se perturba y la validación.
etiqueta: Buena base; cambiar matriz y validación
---

# Ablación virtual espectral del conectoma de *C. elegans*: dictamen

**Veredicto: cambios.** Como proyecto universitario de 3 a 6 meses tiene sentido: los datos son públicos, el cálculo cabe en un portátil, la matemática es limpia y lo que aprenderías (perturbación de autovalores no normales, análisis de redes dirigidas) te sirve para las extensiones que ya tienes en mente. Pero, tal como lo has escrito, tiene tres problemas serios:

1. **El resultado biológico se puede predecir sin hacer el proyecto.** Con la matriz de adyacencia sin signo, el modo dominante va a señalar las interneuronas de mando y poco más. Además, la comparación con Yan está sesgada de antemano: siete de sus doce clases son motoneuronas, que el modo dominante no puede ver por construcción (§3).
2. **El hueco numérico es más estrecho de lo que crees.** Milanese, Sun y Nishikawa (2010) ya compararon primer orden, segundo orden y recálculo exacto para quitar **nodos** en redes reales. Young y Porter (2024) trabajan con **aristas**, no con nodos (§2).
3. **Hay errores de formulación** que conviene corregir antes de escribir código: la fórmula (1) no es de primer orden, quitar un nodo del Laplaciano no consiste en borrar su fila y su columna, y Davis–Kahan no se aplica a matrices dirigidas (§1).

La versión corregida, que propongo abajo, mantiene tu idea: ablación virtual, precisión de la perturbación y contraste con lo que se sabe. Pero perturba una matriz con significado dinámico (el jacobiano con signos), donde la parte numérica sí es interesante, y valida contra datos medidos y no contra otro modelo.

---

## 1. Correcciones de formulación

### 1.1 Tu ecuación (1) no es el primer orden: es una estimación con vectores truncados

Sea $A$ no negativa e irreducible, con autovalor de Perron $\lambda$, autovector derecho $\mathbf v$ ($A\mathbf v=\lambda\mathbf v$) e izquierdo $\mathbf u$ ($\mathbf u^\top A=\lambda\mathbf u^\top$). Quitar el nodo $k$ es sumar

$$
\Delta A = -\left(\mathbf e_k\mathbf e_k^\top A + A\,\mathbf e_k\mathbf e_k^\top - A_{kk}\,\mathbf e_k\mathbf e_k^\top\right).
$$

La perturbación de primer orden *de verdad*, $\delta\lambda \approx \mathbf u^\top\Delta A\,\mathbf v/\mathbf u^\top\mathbf v$, da

$$
\delta\lambda^{(1)}_k = -\frac{(2\lambda - A_{kk})\,u_k v_k}{\mathbf u^\top\mathbf v}. \tag{1}
$$

Es decir, el **doble** de lo que escribiste. El primer orden puro sobreestima mucho, porque quitar un nodo no es una perturbación pequeña: la componente $v_k$ pasa de golpe a cero. Restrepo, Ott y Hunt (2006) lo corrigen, y tu fórmula es esa corrección. Se puede deducir así:

> **Lema 1 (cociente de Rayleigh con vectores truncados).** Sean $\mathbf u'=\mathbf u-u_k\mathbf e_k$ y $\mathbf v'=\mathbf v-v_k\mathbf e_k$. Entonces
> $$\lambda'_k\approx\frac{\mathbf u'^\top A\,\mathbf v'}{\mathbf u'^\top\mathbf v'}=\frac{\lambda\,\mathbf u^\top\mathbf v-(2\lambda-A_{kk})u_kv_k}{\mathbf u^\top\mathbf v-u_kv_k}\;\Longrightarrow\;\delta\lambda_k\approx-\frac{(\lambda-A_{kk})\,u_kv_k}{\mathbf u^\top\mathbf v-u_kv_k}. \tag{2}$$
> *Demostración:* se desarrolla $\mathbf u'^\top A\mathbf v'$ usando $A\mathbf v=\lambda\mathbf v$ y $\mathbf u^\top A=\lambda\mathbf u^\top$. $\square$

Tu ecuación es (2) quitando $u_kv_k$ del denominador. No es un error grave, pero cambia lo que significa «comparar primer orden, segundo orden y exacto». En realidad tienes **cuatro** estimadores: (1), (2), tu versión simplificada y el segundo orden de Milanese et al. (2010):

$$
\delta\lambda^{(2)}_k \approx -\left(\lambda - A_{kk} + \frac{A_{kk}^2}{\lambda} - \frac{(A^2)_{kk}}{\lambda}\right)\frac{u_kv_k}{\mathbf u^\top\mathbf v}. \tag{3}
$$

El término $(A^2)_{kk}=\sum_i A_{ik}A_{ki}$ cuenta los ciclos de longitud 2 que pasan por $k$, con peso. En *C. elegans* las conexiones recíprocas y las uniones gap (simétricas) abundan justo en los *hubs*. Por eso la corrección (3) pesa más arriba del ranking, que es donde te importa.

### 1.2 Quitar un nodo del Laplaciano no es borrar su fila y su columna

En $A$ sí lo es. En $L=D-A$, además, los vecinos de $k$ pierden grado:

$$
L'_k = \big(L-\operatorname{diag}(A\,\mathbf e_k)\big)_{-k,-k}. \tag{4}
$$

También hay un problema de fondo con $\lambda_2$. En la red de uniones gap, Varshney et al. (2011) miden $\lambda_2=0{,}12$ en una componente gigante de 248 neuronas. Una brecha tan pequeña significa que cualquier ablación de una neurona puente cambia $\lambda_2$ de forma no perturbativa. Si la neurona es un punto de corte, $\lambda_2$ salta a $0$. Ahí la teoría de perturbaciones no falla un poco: falla por completo, y ese caso hay que tratarlo aparte. Para grafos **dirigidos**, $\lambda_2$ ni siquiera está bien definido: hay varios Laplacianos y sus autovalores son complejos.

### 1.3 Davis–Kahan solo vale para matrices hermíticas

El teorema $\sin\Theta$ de Davis y Kahan (1970) exige matrices simétricas o hermíticas. Para la red química dirigida, y más aún con signos, las herramientas correctas son:

> **Observación 1.** Para un autovalor simple, $|\delta\lambda|\le\kappa(\lambda)\,\|\Delta A\|_2+O(\|\Delta A\|^2)$, con $\kappa(\lambda)=\|\mathbf u\|\|\mathbf v\|/|\mathbf u^{*}\mathbf v|$, que es tu número de condición y está bien definido. Para los subespacios invariantes de matrices no normales, el análogo de Davis–Kahan son las cotas de Stewart basadas en $\operatorname{sep}(T_{11},T_{22})$, y la herramienta práctica son los **pseudoespectros** (Trefethen y Embree, 2005). Cuenta con que, para ablaciones de *hubs*, $\|\Delta A\|$ será del orden de $\|A\|$ y las cotas a priori serán inútiles. Lo que vale es la medición empírica.

### 1.4 En FlyWire la perturbación no es «la única vía asequible»

Calcular el autovalor dominante de una matriz dispersa de 139 000 nodos con Arnoldi (ARPACK), arrancando desde el autovector previo, cuesta del orden de un segundo. Hacerlo para todas las ablaciones llevaría unas decenas de horas de CPU y se puede paralelizar (es una estimación de orden de magnitud, no la he medido). La perturbación sirve para **interpretar** y para ablaciones **combinadas** (pares, conjuntos), no porque el cálculo exacto sea imposible.

---

## 2. Qué hay ya hecho y qué queda libre

| Trabajo | Qué hace | Qué deja libre |
|---|---|---|
| Restrepo, Ott y Hunt (2006) | Definen la importancia dinámica $I_k=-\Delta\lambda_k/\lambda\approx u_kv_k/\mathbf u^\top\mathbf v$ y la generalizan a redes dirigidas | No estudian sistemáticamente cuándo falla |
| Milanese, Sun y Nishikawa (2010) | Fórmulas de 1.º y 2.º orden para quitar **nodos** y aristas. Las miden en redes reales (levadura, correo, red eléctrica) frente al recálculo exacto. El 1.º orden falla por un factor de ~22 en nodos; el 2.º orden es mucho mejor | Redes sin peso ni signo y sin *C. elegans*. No desglosan el error por $\kappa$ ni por la brecha espectral |
| Young y Porter (2024) | Precisión del 1.º orden al quitar o añadir **aristas**; cota del cambio del autovector según la brecha | Solo grafos sintéticos no dirigidos y sin peso. Señalan como pendientes los nodos, las aristas dirigidas y las ponderadas |
| Watanabe y Masuda (2010) | Quitan nodos de forma perturbativa para ampliar la brecha espectral, con *C. elegans* (sin dirección) como ejemplo | Sin dirección, sin pesos, sin validación biológica |
| Kim et al. (2016) | Ablación virtual de las 279 neuronas en la red dirigida y ponderada (eficiencia, *clustering*, intermediación); señalan 12 neuronas críticas | Sin espectro y sin contrastar con ablaciones experimentales |
| Bacik et al. (2016) | Todas las ablaciones simples y **dobles** según la estructura de flujo multiescala | Sin espectro |
| Varshney et al. (2011) | Análisis espectral lineal: Laplaciano gap, $\Phi=-L_{\text{gap}}+A_{\text{chem}}^\top$, modos propios | Sin ablaciones |

**Conclusión:** ordenar neuronas por ablación virtual en *C. elegans* ya se ha hecho al menos dos veces (Kim 2016; Bacik 2016). Comparar estimadores de perturbación para quitar nodos frente al recálculo exacto en redes reales también está hecho (Milanese 2010). Lo que **sigue libre**, y es tu aportación real, es lo siguiente: **la precisión de la perturbación para quitar nodos en una red real dirigida, ponderada y con signo, con el error desglosado por $\kappa(\lambda)$, la brecha espectral y la casi degeneración, y con la robustez medida en varios conectomas.** No he encontrado ningún trabajo de 2024 a 2026 que lo haga.

---

## 3. Por qué el resultado biológico, tal como está planteado, es previsible

### 3.1 La importancia del modo dominante es, en esencia, grado de entrada × grado de salida

En redes sin correlaciones de grado, la aproximación de campo medio (Restrepo, Ott y Hunt, 2007) da $u_k\propto k_k^{\text{in}}$ y $v_k\propto k_k^{\text{out}}$ (o al revés, según el convenio). Entonces

$$
I_k\;\approx\;\frac{k_k^{\text{in}}\,k_k^{\text{out}}}{N\,\langle k^{\text{in}}k^{\text{out}}\rangle}. \tag{5}
$$

Tu «riesgo 1» no es un riesgo: es lo que cabe esperar en primera aproximación. La única señal informativa es el **residuo** respecto a (5), que depende de las correlaciones de grado. Eso no invalida el proyecto, pero obliga a que la variable de interés sea ese residuo y no $I_k$.

### 3.2 La comparación con Yan está sesgada de antemano

Las 12 clases de Yan et al. (2017) son:

- para el control de los **músculos**: DA, DB, DD, VA, VB, VD, AS, AVA y PDB;
- para el control de las **motoneuronas**, además: AVB, AVD y PVC.

Su red incluye los 95 músculos como salidas y los receptores táctiles (ALM, AVM, PLM) como entradas. Su medida es el número de músculos controlables (89 de 95 en el gusano intacto).

> **Proposición 1 (invisibilidad estructural).** Si $A$ es reducible, su espectro es la unión de los espectros de los bloques diagonales de sus componentes fuertemente conexas (CFC). Por tanto, quitar una neurona fuera de la CFC que contiene el autovalor de Perron deja $\lambda$ **exactamente** igual, y además $u_kv_k=0$.

La red química de *C. elegans* tiene una CFC gigante de 237 de 279 neuronas (Varshney et al., 2011). Las 42 restantes, entre ellas fuentes y sumideros como muchas motoneuronas, tienen importancia espectral nula por construcción. Si añades las uniones gap, la CFC crece a 274, pero entonces el modo dominante lo marcan las conexiones simétricas. En cualquier caso, sin músculos en la matriz, las siete clases de motoneuronas de Yan dependen de cómo construyas la matriz y no del espectro.

> **Predicción 1 (antes de calcular nada).** Con $A$ sin signo, el top-12 por clases del modo dominante incluirá AVA, AVB, AVD y PVC, que son las 4 clases que Yan comparte con el *rich club* de Towlson et al. (2013), y además AVE y DVA, que no están en Yan. Recuperará como mucho 4 de 12, perderá PDB y las motoneuronas, y el grado ponderado conseguirá prácticamente lo mismo.

Si esta predicción se cumple, y apostaría a que sí, la comparación con Yan no enseña nada. Hay dos problemas más con usar a Yan como «verdad»:

- **Es otro modelo, no una medición.** Lo nuevo que se comprobó en el laboratorio fue PDB y DD04/DD05 frente a DD02/DD03. El resto de las 12 clases ya se conocía por ablaciones clásicas.
- **Su base está discutida.** Jiang y Lai (2019) sostienen que la controlabilidad lineal es en gran parte irrelevante para redes no lineales. Ponen precisamente *C. elegans* como ejemplo: el conjunto mínimo de controladores (101) supera el número de neuronas sensoriales (86).

### 3.3 Existe un patrón de validación mejor, y ya está en `cect`

Randi et al. (*Nature*, 2023) estimularon optogenéticamente neuronas individuales y midieron la respuesta de todo el cerebro en 23 433 pares de neuronas. Es una **perturbación medida** y es lo más cercano a una «ablación inversa» que existe. Encontraron que la propagación difiere de lo que predice la anatomía, en parte por la señalización extrasináptica. El conjunto de datos está en el `cect` de OpenWorm como conectoma funcional de WormNeuroAtlas. Con él, la pregunta deja de ser «¿coincide con otro modelo?» y pasa a ser «¿predice la importancia espectral residual la influencia funcional medida, más allá del grado?». Eso es falsable y nadie lo ha respondido.

---

## 4. Cambios necesarios

**Cambio 1. Perturbar el jacobiano lineal con signos, no la adyacencia sin signo.**

- *Qué:* usar un modelo lineal de tasas al estilo de Varshney,
$$J(g) = -I + g\,(S\circ W_{\text{chem}})^\top - g_{\text{gap}}\,L_{\text{gap}}, \tag{6}$$
donde $S$ son los signos de Fenyves et al. (2020). Estudiar el efecto de cada ablación sobre la **abscisa espectral** $\alpha(J)=\max\operatorname{Re}\lambda$ y sobre los modos lentos. Como $g$ y $g_{\text{gap}}$ no se conocen, hay que barrerlos.
- *Por qué:* $\lambda$ de $A\ge 0$ no tiene significado dinámico propio. $\alpha(J)$ sí lo tiene: es la tasa del modo más lento o más inestable. Además, la matriz con signos es **no normal**, con autovalores complejos y $\kappa(\lambda)$ grandes. Ese es el régimen donde tu pregunta numérica deja de ser trivial. Con $A\ge0$, Perron–Frobenius garantiza un autovalor simple con una brecha amplia, y tu análisis de errores saldría aburrido.
- *Cuidado:* los signos de Fenyves son **predicciones** a partir de expresión génica, no mediciones, y muchas sinapsis no tienen un signo claro. Hay que aleatorizar los signos dudosos y presentar los resultados como distribuciones.
- *Impacto:* convierte un «ranking de centralidad más» en un estudio de sensibilidad de un sistema dinámico, y une el proyecto con tu extensión de ODE y jacobiano desde el principio.

**Cambio 2. Usar la simetría izquierda/derecha como laboratorio de casi degeneración.**

- *Qué:* los pares bilaterales (AVAL/AVAR…) producen pares de modos casi degenerados, uno simétrico y otro antisimétrico. Quitar *una* neurona del par rompe la simetría. Compara la ablación de una sola neurona con la de la **clase** entera, que además es como se suele hacer en el laboratorio y como lo plantea Yan.
- *Por qué:* es una fuente natural y biológica de casi degeneración, justo donde la perturbación de autovalores aislados falla y hay que pasar a subespacios. Es el núcleo numérico que ninguna referencia de §2 cubre.

**Cambio 3. Validar contra mediciones, con Yan solo como comparación secundaria.**

- *Patrón principal:* la influencia funcional medida en Randi et al. (2023) y un catálogo de ablaciones experimentales clásicas tomado de la literatura (circuito del tacto, locomoción).
- *Yan, si lo mantienes:* incluye los músculos en la matriz para que la comparación sea justa, y declara de antemano la Predicción 1.
- *Robustez:* compara los ocho conectomas de Witvliet y los de Cook 2019 y Varshney 2011.
- *Por qué:* comparar un modelo con otro modelo no valida nada. Con los datos de Randi, un resultado negativo también es publicable.

**Cambio 4. Hacer del residuo respecto al grado la variable principal.**

- *Qué:* regresión de $I_k$ (o de $\Delta\alpha_k$) sobre $k^{\text{in}}k^{\text{out}}$ y sobre las fuerzas de entrada y salida. Modelos nulos que conserven la secuencia de fuerzas dirigida y la proporción de signos. Comparación siempre contra una línea base de grado.
- *Impacto:* sin esto, cualquier coincidencia con la biología se explica por los *hubs* y no aporta nada.

**Cambio 5. Medir el error de ranking, no solo el absoluto.**

- *Qué:* además de $|\delta\lambda-\Delta\lambda|$, la $\tau$ de Kendall y la coincidencia en el top-$k$ entre estimadores. Milanese et al. vieron que un orden superior puede *empeorar* el ranking aunque mejore el error medio.

---

## 5. Próximos pasos, en orden

1. **Semanas 1–2. Matrices.**
   - Instala `cect` y construye las matrices química, gap y combinada para Varshney 2011, Cook 2019 y Witvliet 1–8.
   - Descompón en CFC y comprueba la Proposición 1.
   - Calcula $\lambda$, $\mathbf u$, $\mathbf v$ y $\kappa$.
2. **Semanas 2–4. Ablaciones sin signo, como línea base.**
   - Calcula el recálculo exacto para cada neurona y cada clase.
   - Compara con los estimadores (1), (2), tu versión simplificada y (3).
   - Calcula los errores, la $\tau$ de Kendall, el residuo respecto a (5) y los modelos nulos.
   - **Escribe la Predicción 1 antes de mirar los resultados.**
3. **Mes 2. Jacobiano con signos (6).**
   - Barre $g$ y calcula $\alpha(J)$, $\kappa$ y los pseudoespectros.
   - Analiza los pares L/R: brecha entre modos simétricos y antisimétricos frente al error del estimador.
   - Compara la ablación individual con la de la clase.
4. **Mes 3. Validación.** Datos de Randi (influencia funcional frente a importancia residual), ablaciones de la literatura y, de forma secundaria, Yan con músculos.
5. **Meses 4–5. Redacción.** Si sobra tiempo, FlyWire, centrado en ablaciones **combinadas**, donde la perturbación sí ahorra trabajo combinatorio.

**Criterio para cortar.** Si al terminar el paso 2 el residuo respecto al grado no se mantiene estable entre conectomas (por ejemplo, $\tau<0{,}3$ entre los conectomas adultos de Witvliet y Cook), abandona las afirmaciones biológicas y escribe solo la parte numérica. Ese trabajo sigue siendo válido por sí solo.

## 6. Impacto real

- **Para ti:** alto. Es un proyecto que se termina, con una probabilidad de cerrar un buen trabajo de fin de grado o máster que estimo en torno al 80 %, y te deja dominando justo la teoría que ahora conoces a medias.
- **Para el campo:** modesto. Un artículo metodológico en una revista de redes de nivel medio (*Applied Network Science*, *Journal of Complex Networks*) es plausible si los cambios 1, 2 y 5 se hacen bien. Le doy en torno a un 25–35 %.
- **Descubrimiento biológico** (encontrar neuronas esenciales nuevas y creíbles sin laboratorio): menos del 10 %. No vendas el proyecto por ese lado.

## 7. Relación con tus otras ideas

Todavía no tienes otras ideas **aceptadas**. «Memoria neuronal» (carpeta AI) fue rechazada y «Del Software al Hadware» está vacía. Hay que señalar algo: esta idea es justo lo que aquel dictamen echaba en falta, una pregunta concreta, medible y falsable. Es un cambio de nivel claro respecto a esa propuesta.

```semillero-caminos
[
  { "id": "jacobiano-con-signo", "tipo": "variacion", "titulo": "Ablación sobre el jacobiano con signos", "descripcion": "Perturbar $J=-I+g(S\\circ W)^\\top-g_{gap}L_{gap}$ (signos de Fenyves) y medir la abscisa espectral y los modos lentos en vez de $\\lambda$ de $A\\ge0$. Da significado dinámico y entra en el régimen no normal, donde la pregunta numérica deja de ser trivial." },
  { "id": "casi-degeneracion-bilateral", "tipo": "variacion", "titulo": "Simetría L/R como núcleo numérico", "descripcion": "Centrar el estudio en los pares bilaterales: modos casi degenerados simétricos y antisimétricos, ablación de una neurona frente a la clase, y cuándo hay que pasar de la perturbación de autovalores a la de subespacios. Es la parte que ninguna referencia cubre." },
  { "id": "solo-numerico-redes-reales", "tipo": "variacion", "titulo": "Artículo puramente numérico", "descripcion": "Quitar la biología: precisión de los estimadores (1)–(3) para quitar nodos en decenas de redes reales dirigidas y ponderadas (incluida *C. elegans*), con el error desglosado por $\\kappa$, la brecha y la estructura de CFC. Extiende Milanese 2010 y Young–Porter 2024 de forma directa." },
  { "id": "espectro-vs-atlas-randi", "tipo": "idea-nueva", "titulo": "Espectro frente al atlas funcional de Randi", "descripcion": "¿La sensibilidad espectral o la función de Green del conectoma con signos predice la influencia funcional medida optogenéticamente (Randi et al., 2023) mejor que el grado? Datos ya en `cect`; un resultado negativo también es informativo." },
  { "id": "flywire-ablaciones-combinadas", "tipo": "idea-nueva", "titulo": "Ablaciones combinadas en FlyWire", "descripcion": "Escalar a 139 000 neuronas centrándose en ablaciones de **pares y conjuntos**, donde el cálculo exacto sí se vuelve combinatorio y la perturbación aporta de verdad." }
]
```

## Referencias

- Restrepo, J. G., Ott, E., Hunt, B. R. (2006). *Characterizing the dynamical importance of network nodes and links*. Phys. Rev. Lett. 97, 094102. https://arxiv.org/abs/cond-mat/0606122
- Restrepo, J. G., Ott, E., Hunt, B. R. (2007). *Approximating the largest eigenvalue of network adjacency matrices*. Phys. Rev. E 76, 056119. https://doi.org/10.1103/PhysRevE.76.056119
- Milanese, A., Sun, J., Nishikawa, T. (2010). *Approximating spectral impact of structural perturbations in large networks*. Phys. Rev. E 81, 046112. https://arxiv.org/abs/1001.1431
- Young, J., Porter, M. A. (2024). *Dynamical importance and network perturbations*. Phys. Rev. E 110, 064304. https://arxiv.org/abs/2403.14584
- Watanabe, T., Masuda, N. (2010). *Enhancing the spectral gap of networks by node removal*. Phys. Rev. E 82, 046102. https://arxiv.org/abs/1003.4340
- Yan, G., Vértes, P. E., Towlson, E. K., Chew, Y. L., Walker, D. S., Schafer, W. R., Barabási, A.-L. (2017). *Network control principles predict neuron function in the Caenorhabditis elegans connectome*. Nature 550, 519–523. https://doi.org/10.1038/nature24056 · https://pmc.ncbi.nlm.nih.gov/articles/PMC5710776/
- Towlson, E. K. et al. (2018). *Caenorhabditis elegans and the network control framework—FAQs*. Phil. Trans. R. Soc. B. https://pmc.ncbi.nlm.nih.gov/articles/PMC6158218/
- Jiang, J., Lai, Y.-C. (2019). *Irrelevance of linear controllability to nonlinear dynamical networks*. Nat. Commun. 10, 3961. https://doi.org/10.1038/s41467-019-11822-5
- Kim, J. S., Kim, S., Kralik, J. D., Jeong, J. (2016). *Vulnerability-based critical neurons, synapses, and pathways in the Caenorhabditis elegans connectome*. PLoS Comput. Biol. 12(8), e1005084. https://pmc.ncbi.nlm.nih.gov/articles/PMC4991803/
- Bacik, K. A., Schaub, M. T., Beguerisse-Díaz, M., Billeh, Y. N., Barahona, M. (2016). *Flow-based network analysis of the Caenorhabditis elegans connectome*. PLoS Comput. Biol. 12(8), e1005055. https://arxiv.org/abs/1511.00673
- Varshney, L. R., Chen, B. L., Paniagua, E., Hall, D. H., Chklovskii, D. B. (2011). *Structural properties of the Caenorhabditis elegans neuronal network*. PLoS Comput. Biol. 7(2), e1001066. https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1001066 · https://ar5iv.labs.arxiv.org/html/0907.2373
- Towlson, E. K., Vértes, P. E., Ahnert, S. E., Schafer, W. R., Bullmore, E. T. (2013). *The rich club of the C. elegans neuronal connectome*. J. Neurosci. 33(15), 6380–6387. https://doi.org/10.1523/JNEUROSCI.3784-12.2013
- Randi, F., Sharma, A. K., Dvali, S., Leifer, A. M. (2023). *Neural signal propagation atlas of Caenorhabditis elegans*. Nature 623, 406–414. https://doi.org/10.1038/s41586-023-06683-4 · datos en `cect`: https://openworm.org/ConnectomeToolbox/Randi_2023/
- Fenyves, B. G., Szilágyi, G. S., Vassy, Z., Sőti, C., Csermely, P. (2020). *Synaptic polarity and sign-balance prediction using gene expression data in the Caenorhabditis elegans chemical synapse neuronal connectome network*. PLoS Comput. Biol. https://openworm.org/ConnectomeToolbox/Fenyves_2020/
- OpenWorm. *C. elegans Connectome Toolbox (`cect`)*. https://openworm.org/ConnectomeToolbox/
- van Elteren, C., Quax, R., Sloot, P. (2022). *Dynamic importance of network nodes is poorly predicted by static structural features*. Physica A 593, 126889. https://arxiv.org/abs/1904.06654
- Lin, A. et al. (2024). *Network statistics of the whole-brain connectome of Drosophila*. Nature. https://www.nature.com/articles/s41586-024-07968-y
- Davis, C., Kahan, W. M. (1970). *The rotation of eigenvectors by a perturbation. III*. SIAM J. Numer. Anal. 7(1), 1–46. https://doi.org/10.1137/0707001
- Trefethen, L. N., Embree, M. (2005). *Spectra and Pseudospectra: The Behavior of Nonnormal Matrices and Operators*. Princeton University Press. https://press.princeton.edu/books/hardcover/9780691119465/spectra-and-pseudospectra
