# Lo mínimo de redes: grafos dirigidos, matrices, componentes fuertemente conexas y Laplaciano

**Duración orientativa:** ~1,5 horas (semana 3). **Depende de:** nada. **Punto de partida:** nivel 0.

## 1. Qué es y por qué importa aquí

No necesitas un curso de ciencia de redes. Necesitas **cinco ideas** para construir $J$ sin errores y para explicar resultados que, si no, te parecerán misteriosos; por ejemplo, por qué muchas neuronas tienen $\Delta\alpha$ exactamente 0.

## 2. Lo que tienes que dominar

**1. Matriz de adyacencia dirigida y ponderada, y su convenio.** En tu proyecto $M_{ij}\neq0$ significa «**$j$ actúa sobre $i$**» (fila = destino, columna = origen), porque así $(M\mathbf x)_i=\sum_jM_{ij}x_j$ suma las entradas que *recibe* $i$. El fichero de datos viene como lista `origen, destino, peso`. Si inviertes el convenio obtienes $M^\top$: los autovalores son los mismos, pero los vectores izquierdo y derecho se intercambian y las interpretaciones se dan la vuelta. **Es el error más común; escríbelo en la primera línea de tu código.**

**2. Grados y fuerzas.** Fuerza de entrada $s^{\text{in}}_i=\sum_j|M_{ij}|$ y de salida $s^{\text{out}}_j=\sum_i|M_{ij}|$. Son la **línea base** con la que compararás todo: si tu ranking espectral es casi el ranking de $s^{\text{in}}s^{\text{out}}$, el espectro no aporta nada. En el piloto, la correlación de Spearman entre $|\Delta\alpha|$ y $s^{\text{in}}s^{\text{out}}$ (más el grado gap) fue de $0{,}61$ a $0{,}77$ según el escenario: alta, pero no total.

**3. Componentes fuertemente conexas (CFC).** Una CFC es un conjunto maximal de nodos en el que hay camino dirigido de cualquiera a cualquiera.

> **Proposición 1.** Si se ordenan los nodos por CFC (orden topológico), $M$ queda triangular por bloques, y su espectro es la **unión de los espectros de los bloques diagonales**.

Consecuencia: si la neurona $k$ no está en la CFC que contiene el autovalor dominante (y no hay uniones gap que la conecten), quitarla **no cambia nada** y además $\bar u_kv_k=0$. La red química de *C. elegans* tiene una CFC gigante de 237 de 279 neuronas (Varshney et al., 2011). En el piloto, con química y gap juntas, solo 11–96 neuronas (según el escenario) produjeron $|\Delta\alpha|>10^{-3}$.

En código: `scipy.sparse.csgraph.connected_components(M != 0, directed=True, connection='strong')`.

**4. El Laplaciano de un grafo no dirigido.** Para las uniones gap, con matriz simétrica de pesos $G$: $L=D-G$, con $D=\mathrm{diag}(G\mathbf 1)$. Es simétrico y semidefinido positivo, y $L\mathbf 1=0$. **Al quitar un nodo, el Laplaciano de lo que queda NO es $L$ sin la fila y la columna $k$**: los vecinos de $k$ pierden grado. Esto se corrige en la diagonal (fórmula en [e7](germinacion/nodos/e7-construir-jacobiano.md)).

**5. Perron–Frobenius, y por qué con signos ya no vale.** Si $M\ge0$ y es irreducible (una sola CFC), su radio espectral es un autovalor **real, simple**, con autovectores **positivos**. Con signos negativos, nada de eso está garantizado: el autovalor dominante puede ser complejo, y los autovectores tienen componentes de ambos signos, o complejas. Es la razón de fondo por la que tu proyecto es más interesante que el de la matriz sin signo, y también por la que hay que vigilar [i2](germinacion/nodos/i2-seguir-autovalor.md). Saad (2011) lo enuncia en §1.10.

## 3. Cómo estudiarlo

1. **Barabási, *Network Science*, cap. 2 «Graph theory»** (gratis en línea): secciones sobre grafos dirigidos y ponderados, matriz de adyacencia, caminos y componentes. 45 min.
2. **Varshney et al. (2011)** ([PDF](germinacion/recursos/varshney-2011.pdf)): la parte de componentes conexas, que da cifras exactas del gusano. 20 min.
3. **Saad (2011), §1.10 «Nonnegative matrices»** ([PDF](germinacion/recursos/saad-2011-eig-book.pdf)): solo el enunciado de Perron–Frobenius. 15 min.

## 4. Cómo saber que lo dominas

1. Dada la lista `A→B (3), B→C (1), C→A (2), C→D (5)`, escribe $M$ con el convenio de este nodo, identifica las CFC y di qué autovalores salen del bloque $\{A,B,C\}$ y cuáles de $\{D\}$.
2. Demuestra la Proposición 1 para dos bloques.
3. Construye el Laplaciano de un triángulo con pesos 1, 2, 3; quita un vértice y comprueba que el Laplaciano del resto no es la submatriz.
4. Pon un ejemplo $2\times2$ con un peso negativo cuyo autovalor dominante sea complejo.

## Referencias

- Barabási, A.-L. (2016). *Network Science*, cap. 2. Cambridge University Press. Gratis en línea: https://networksciencebook.com/chapter/2
- Varshney, L. R. et al. (2011). Structural properties of the *C. elegans* neuronal network. *PLoS Comput. Biol.* 7(2), e1001066. arXiv:0907.2373
- Saad, Y. (2011). *Numerical Methods for Large Eigenvalue Problems*, 2.ª ed., §1.10. https://www-users.cse.umn.edu/~saad/eig_book_2ndEd.pdf
- SciPy. *scipy.sparse.csgraph.connected_components*. https://docs.scipy.org/doc/scipy/reference/generated/scipy.sparse.csgraph.connected_components.html
