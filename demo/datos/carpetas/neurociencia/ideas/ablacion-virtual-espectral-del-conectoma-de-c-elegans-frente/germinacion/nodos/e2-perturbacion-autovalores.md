# Perturbación de autovalores y ablación de un nodo

**Duración orientativa:** 3–4 horas (semana 2). **Depende de:** [e1](germinacion/nodos/e1-autovectores-izquierdos.md). **Punto de partida:** nivel 1. Has visto la fórmula de primer orden en el caso simétrico, pero no la sabes deducir.

## 1. Qué es y por qué importa aquí

La teoría de perturbaciones responde a esta pregunta: si $A$ cambia un poco, ¿cuánto cambian sus autovalores? Tu proyecto la usa de una forma especial, porque **quitar una neurona no es un cambio pequeño**: su componente en el autovector pasa de golpe a cero. Por eso la fórmula de primer orden «de libro» sobreestima el efecto aproximadamente por un factor 2, y una corrección muy sencilla, el **cociente de Rayleigh con vectores truncados**, lo arregla casi siempre. En el piloto, con el conectoma real, lo he comprobado (figura 1). Entender *por qué* es el núcleo matemático de tu entrega.

## 2. Lo que tienes que dominar

### 2.1 La fórmula de primer orden

> **Teorema 1.** Sea $\lambda$ un autovalor simple de $A$, con $A\mathbf v=\lambda\mathbf v$ y $\mathbf u^*A=\lambda\mathbf u^*$. Para $A(\varepsilon)=A+\varepsilon E$ existen funciones analíticas $\lambda(\varepsilon)$ y $\mathbf v(\varepsilon)$ con $\lambda(0)=\lambda$, y
> $$\lambda'(0)=\frac{\mathbf u^*E\,\mathbf v}{\mathbf u^*\mathbf v}. \tag{1}$$
>
> *Deducción (la que debes saber reproducir).* Derivamos $A(\varepsilon)\mathbf v(\varepsilon)=\lambda(\varepsilon)\mathbf v(\varepsilon)$ en $\varepsilon=0$:
> $$E\mathbf v+A\mathbf v'=\lambda'\mathbf v+\lambda\mathbf v'.$$
> Multiplicamos por $\mathbf u^*$ a la izquierda. Como $\mathbf u^*A\mathbf v'=\lambda\mathbf u^*\mathbf v'$, los términos en $\mathbf v'$ se cancelan y queda $\mathbf u^*E\mathbf v=\lambda'\,\mathbf u^*\mathbf v$. $\square$

La analiticidad sale del teorema de la función implícita aplicado al polinomio característico en una raíz simple. Basta con que conozcas el enunciado.

De (1) se deduce inmediatamente $|\lambda'(0)|\le\kappa(\lambda)\|E\|_2$, el teorema 1 del nodo [e1](germinacion/nodos/e1-autovectores-izquierdos.md).

### 2.2 Aplicación a la ablación de la neurona $k$

Para quitar la neurona $k$ de $J$ borramos su fila y su columna. Para trabajar en dimensión fija, equivale a **anular las entradas fuera de la diagonal de la fila y la columna $k$**: el nodo queda aislado con su autovalor $J_{kk}<0$, que no compite por ser el máximo. Si además hay uniones gap con Laplaciano $L$, los vecinos de $k$ **pierden grado**, y su diagonal cambia en $d_i=h\,G_{ik}/\lambda_{\max}(L)$ (lo verás en el nodo [e7](germinacion/nodos/e7-construir-jacobiano.md)). Con $\Delta J$ igual a ese cambio, usando $\sum_{j\neq k}J_{kj}v_j=(\lambda-J_{kk})v_k$ y su análogo por la izquierda, (1) da

$$\delta\lambda_k^{(1)}=\frac{-2(\lambda-J_{kk})\,\bar u_k v_k+\sum_i d_i\,\bar u_i v_i}{\mathbf u^*\mathbf v}. \tag{2}$$

### 2.3 El arreglo: cociente de Rayleigh con vectores truncados

> **Lema 1.** Sean $\mathbf u'=\mathbf u-u_k\mathbf e_k$ y $\mathbf v'=\mathbf v-v_k\mathbf e_k$, y sea $J'=J+\Delta J$. El cociente de Rayleigh de dos lados $\lambda_T=\mathbf u'^*J'\mathbf v'/\mathbf u'^*\mathbf v'$ vale
> $$\delta\lambda_k^{(T)}=\lambda_T-\lambda=\frac{-(\lambda-J_{kk})\,\bar u_k v_k+\sum_{i\neq k}d_i\,\bar u_i v_i}{\mathbf u^*\mathbf v-\bar u_k v_k}. \tag{3}$$

*Ejercicio obligatorio:* demuéstralo. Desarrolla $\mathbf u'^*J\mathbf v'=\mathbf u^*J\mathbf v-\bar u_k(J\mathbf v)_k-(\mathbf u^*J)_kv_k+\bar u_kJ_{kk}v_k$.

**Interpretación.** Compara (2) con (3): el factor 2 se ha convertido en 1. El primer orden «cuenta dos veces» la pérdida de la neurona, una por su fila y otra por su columna, porque supone que el autovector apenas cambia. En realidad la componente $k$ del autovector desaparece, y el truncado lo refleja. Cuando $|\bar u_kv_k|\ll|\mathbf u^*\mathbf v|$ (la neurona pesa poco en el modo), (3) es casi exacto. Cuando el modo está **localizado** en pocas neuronas, ninguna de las dos fórmulas es fiable. Eso es la incógnita [i3](germinacion/nodos/i3-precision-perturbativa.md).

Esta es la fórmula de Restrepo, Ott y Hunt (2006). Para matrices de adyacencia sin signo, Milanese, Sun y Nishikawa (2010) añadieron un término de segundo orden que corrige por los ciclos de longitud 2 que pasan por $k$:
$$\delta\lambda_k^{(2)}\approx-\Big(\lambda-A_{kk}+\tfrac{A_{kk}^2}{\lambda}-\tfrac{(A^2)_{kk}}{\lambda}\Big)\frac{u_kv_k}{\mathbf u^\top\mathbf v}.$$
**No es imprescindible para tu entrega**, pero conviene que sepas que existe.

![Figura 1. Piloto con el conectoma real (escenario B, véase e7): el primer orden puro (naranja) queda casi siempre sobre la recta y = 2x, y el cociente de Rayleigh truncado (azul) sobre y = x. Los puntos que se alejan son ablaciones donde el modo está localizado o cambia de identidad.](figuras/piloto-estimadores.png)

### 2.4 Lo que pasa con autovalores dobles o casi dobles (solo la idea)

Si $\lambda$ es doble, (1) deja de tener sentido: $\mathbf u^*\mathbf v$ puede ser 0 y el autovalor ya no es una función derivable de $\varepsilon$. En una matriz con un bloque de Jordan de tamaño $m$, una perturbación $\varepsilon$ mueve los autovalores del orden de $\varepsilon^{1/m}$. Si $\lambda$ es *casi* doble (otro autovalor está a distancia $\delta$ pequeña), $\kappa(\lambda)$ suele ser grande y la aproximación falla en cuanto $\|\Delta J\|\gtrsim\delta$. La herramienta correcta es entonces perturbar el **subespacio** de los dos modos. Para la entrega basta con que **detectes** estos casos (brecha pequeña, $\kappa$ grande) y los señales. La teoría completa queda en [e9](germinacion/nodos/e9-pseudoespectros-subespacios.md), para después de la entrega.

## 3. Cómo estudiarlo

1. **Bindel (2009), lec24** ([PDF](germinacion/recursos/bindel-2009-lec24.pdf)): la deducción de (1) y el comentario sobre multiplicidad $m$. 30 min.
2. **Saad (2011), §3.1.5 «Linear perturbations of A»** y **§3.3.1** ([PDF](germinacion/recursos/saad-2011-eig-book.pdf)). La notación con proyectores espectrales es más pesada de lo que necesitas: quédate con los enunciados. 1 h.
3. **Restrepo, Ott y Hunt (2006)** ([PDF](germinacion/recursos/restrepo-ott-hunt-2006.pdf)). Son 4 páginas: lee la definición de *dynamical importance* y su aproximación para nodos. 30 min.
4. **Milanese, Sun y Nishikawa (2010)** ([PDF](germinacion/recursos/milanese-sun-nishikawa-2010.pdf)): la sección de nodos y la tabla de resultados en redes reales. Fíjate en que el primer orden se equivoca «por un factor de ~22» en su red ER: es tu mismo fenómeno, más exagerado. 45 min.
5. *(Opcional)* **Young y Porter (2024)** ([PDF](germinacion/recursos/young-porter-2024.pdf)): el estado del arte para **aristas** en grafos sintéticos. En su conclusión dejan como pendientes los nodos y las redes dirigidas y ponderadas: es el hueco que ocupas tú.

## 4. Cómo saber que lo dominas

1. Deduce (1) en una hoja, sin mirar.
2. Deduce (2) y (3) para el caso sin uniones gap ($d_i=0$).
3. Toma $A=\begin{pmatrix}0&2&0\\1&0&1\\0&1&0\end{pmatrix}$. Calcula a mano o con `numpy` el autovalor dominante, quita el nodo 2 (el central) y compara el exacto con (2) y (3).
4. Con `numpy`: matriz aleatoria no negativa de $100\times100$. Para cada nodo, compara $\delta\lambda^{(1)}$, $\delta\lambda^{(T)}$ y el exacto, y representa una figura como la 1. ¿Te sale la recta $y=2x$?
5. Explica en 5 líneas por qué el factor 2 desaparece al truncar los vectores.

## Referencias

- Bindel, D. (2009). *CS 6210 lecture notes, lec24*. https://www.cs.cornell.edu/~bindel/class/cs6210-f09/lec24.pdf
- Saad, Y. (2011). *Numerical Methods for Large Eigenvalue Problems*, 2.ª ed., §3.1.5 y §3.3. https://www-users.cse.umn.edu/~saad/eig_book_2ndEd.pdf
- Restrepo, J. G., Ott, E., Hunt, B. R. (2006). Characterizing the dynamical importance of network nodes and links. *Phys. Rev. Lett.* 97, 094102. arXiv:cond-mat/0606122
- Milanese, A., Sun, J., Nishikawa, T. (2010). Approximating spectral impact of structural perturbations in large networks. *Phys. Rev. E* 81, 046112. arXiv:1001.1431
- Young, J., Porter, M. A. (2024). Dynamical importance and network perturbations. *Phys. Rev. E* 110, 064304. arXiv:2403.14584
