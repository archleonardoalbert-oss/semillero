# Autovalores y autovectores izquierdos de matrices no simétricas

**Duración orientativa:** unas 3 horas (semana 1). **Punto de partida:** nivel 0 del diagnóstico. Sabes calcular autovalores, pero no has trabajado con autovectores izquierdos ni con matrices no normales.

## 1. Qué es y por qué lo necesitas aquí

Todo el proyecto gira en torno a una sola pregunta: **cuánto cambia el autovalor de mayor parte real de un jacobiano $J$ cuando se quita una neurona**. Como $J$ procede de sinapsis dirigidas (la neurona $j$ afecta a la $i$ sin que ocurra lo contrario), **$J$ no es simétrica**. En las matrices simétricas que viste en Álgebra Lineal todo es cómodo: autovalores reales, autovectores ortogonales y perturbaciones que mueven los autovalores como mucho $\|E\|$. En las no simétricas nada de eso se cumple. Para entender por qué, y cuánto, hacen falta dos objetos que probablemente no has visto: el **autovector izquierdo** y el **número de condición de un autovalor**.

## 2. Lo que tienes que dominar

> **Definición 1 (autovectores derecho e izquierdo).** Sea $A\in\mathbb C^{n\times n}$ y $\lambda$ un autovalor. Un vector $\mathbf v\neq 0$ es *autovector derecho* si $A\mathbf v=\lambda\mathbf v$. Un vector $\mathbf u\neq0$ es *autovector izquierdo* si $\mathbf u^{*}A=\lambda\,\mathbf u^{*}$, o lo que es lo mismo, $A^{*}\mathbf u=\bar\lambda\,\mathbf u$.

Aquí $\mathbf u^{*}=\bar{\mathbf u}^{\top}$ es el transpuesto conjugado. Si $A$ y $\lambda$ son reales, basta con $\mathbf u^\top A=\lambda\mathbf u^\top$. **Si $A$ es simétrica, $\mathbf u=\mathbf v$**, y por eso nunca te hizo falta distinguirlos.

> **Proposición 1 (biortogonalidad).** Si $A\mathbf v_j=\lambda_j\mathbf v_j$, $\mathbf u_i^*A=\lambda_i\mathbf u_i^*$ y $\lambda_i\neq\lambda_j$, entonces $\mathbf u_i^*\mathbf v_j=0$.
>
> *Demostración.* $\lambda_i\,\mathbf u_i^*\mathbf v_j=\mathbf u_i^*A\mathbf v_j=\lambda_j\,\mathbf u_i^*\mathbf v_j$, así que $(\lambda_i-\lambda_j)\,\mathbf u_i^*\mathbf v_j=0$. $\square$

Es decir, el autovector izquierdo de $\lambda_i$ es ortogonal a **todos los demás** autovectores derechos. Si $\lambda$ es simple, además $\mathbf u^*\mathbf v\neq0$ (si fuera cero, $\mathbf u$ sería ortogonal a una base de $\mathbb C^n$). Este es el dato clave del proyecto: **$\mathbf u^*\mathbf v$ puede ser distinto de cero y aun así muy pequeño**.

> **Definición 2 (número de condición de un autovalor simple).**
> $$\kappa(\lambda)=\frac{\|\mathbf u\|_2\,\|\mathbf v\|_2}{|\mathbf u^*\mathbf v|}=\frac{1}{|\cos\theta(\mathbf u,\mathbf v)|}\;\ge 1. \tag{1}$$

Vale $1$ si y solo si $\mathbf u\parallel\mathbf v$, lo que ocurre siempre en las matrices normales ($AA^*=A^*A$; por ejemplo, las simétricas).

> **Teorema 1 (primer orden, se demuestra en el nodo siguiente).** Si $\lambda$ es simple y $A\to A+\varepsilon E$ con $\|E\|_2=1$, entonces $|\lambda(\varepsilon)-\lambda|\le\kappa(\lambda)\,\varepsilon+O(\varepsilon^2)$, y la cota se alcanza con $E=\mathbf u\mathbf v^*/(\|\mathbf u\|\|\mathbf v\|)$.

> **Teorema 2 (Bauer–Fike).** Si $A=V\Lambda V^{-1}$ es diagonalizable y $\mu$ es autovalor de $A+E$, existe un autovalor $\lambda$ de $A$ con $|\mu-\lambda|\le\kappa_2(V)\,\|E\|_2$, donde $\kappa_2(V)=\|V\|\|V^{-1}\|$.

Bauer–Fike da una cota **global** (vale para todos los autovalores a la vez, sin necesidad de que $E$ sea pequeña), pero suele ser muy pesimista. El $\kappa(\lambda)$ de (1) es **local** y mucho más fino. En el proyecto usarás (1).

### 2.1 El ejemplo del diagnóstico, resuelto

$$A=\begin{pmatrix}1&100\\0&2\end{pmatrix},\qquad\lambda_1=1,\ \lambda_2=2.$$

- **Derecho de $\lambda_1=1$:** $(A-I)\mathbf v=0\Rightarrow\begin{pmatrix}0&100\\0&1\end{pmatrix}\mathbf v=0\Rightarrow\mathbf v=(1,0)^\top$.
- **Izquierdo de $\lambda_1=1$:** $(A-I)^\top\mathbf u=0\Rightarrow\begin{pmatrix}0&0\\100&1\end{pmatrix}\mathbf u=0\Rightarrow\mathbf u=(1,-100)^\top$.
- $\mathbf u^\top\mathbf v=1$, $\|\mathbf u\|\|\mathbf v\|=\sqrt{10001}\approx100$, así que $\kappa(1)\approx100$.

Consecuencia: si perturbas una entrada en $10^{-3}$, el autovalor puede moverse del orden de $0{,}1$. Compruébalo: con $E=\begin{pmatrix}0&0\\\delta&0\end{pmatrix}$ el polinomio característico es $(1-\lambda)(2-\lambda)-100\delta$, y para $\delta=10^{-3}$ los autovalores son $\approx0{,}908$ y $\approx2{,}092$. Un cambio de $10^{-3}$ en una entrada los mueve $\approx0{,}09$: casi cien veces más, como predice $\kappa\,\delta=0{,}1$.

La figura 1 lo muestra con **pseudoespectros**: las regiones del plano complejo a las que pueden llegar los autovalores si se perturba $A$ con una matriz de norma $\le\varepsilon$. En la matriz normal son discos de radio $\varepsilon$. En la no normal, con $\varepsilon=0{,}1$, la región ya es un óvalo que engloba ambos autovalores.

![Figura 1. Pseudoespectros de una matriz normal y de la matriz no normal del ejemplo. Con la misma perturbación, los autovalores de la no normal pueden desplazarse unas cien veces más.](figuras/pseudoespectros-2x2.png)

### 2.2 Por qué importa en el conectoma

En el jacobiano con signos del gusano (nodo [Construir el jacobiano](germinacion/nodos/e7-construir-jacobiano.md)), mi piloto obtuvo $\kappa(\lambda_{\max})$ entre $\approx2$ y $\approx140$, según cómo se asignen los signos dudosos. Con signos aleatorios plausibles, el error de la aproximación perturbativa crece con $\kappa$ (nodo [i3](germinacion/nodos/i3-precision-perturbativa.md)). Este nodo te da el lenguaje para explicar ese resultado.

## 3. Cómo estudiarlo

1. **Bindel, apuntes de CS 6210 (2009), lección 24** ([PDF](germinacion/recursos/bindel-2009-lec24.pdf)). Son pocas páginas y van directas a la sensibilidad de primer orden con autovectores izquierdo y derecho. Léelos enteros (40 min).
2. **Saad, apuntes de CSCI 5304, «Eigenvalue problems»** ([PDF](germinacion/recursos/saad-csci5304-lecn12.pdf)). Busca la definición de *condition number of an eigenvalue* y el ejemplo $3\times3$ con $\mathrm{cond}(\lambda_1)\approx603{,}64$. Rehaz el ejemplo con `numpy` (30 min).
3. **Saad, *Numerical Methods for Large Eigenvalue Problems* (2.ª ed., 2011)**, gratis en la web del autor ([PDF](germinacion/recursos/saad-2011-eig-book.pdf)):
   - §1.8.2–1.8.3 (formas de Jordan y de Schur) y §1.9.1 (matrices normales): solo las definiciones y los enunciados.
   - **§3.3.1 «Conditioning of eigenvalues»**: es el núcleo; léelo con lápiz.
   - §3.5 «Pseudo-eigenvalues»: opcional, sirve de puente con la figura 1.
4. *(Si tienes acceso en la biblioteca)* Golub y Van Loan, *Matrix Computations*, 4.ª ed., §7.2: la referencia estándar. No es imprescindible.

## 4. Cómo saber que lo dominas

1. Calcula a mano $\mathbf u$, $\mathbf v$ y $\kappa$ para $\lambda=2$ en el ejemplo anterior. (Debe salir $\kappa(2)=\kappa(1)$; explica por qué en el caso $2\times2$.)
2. Demuestra que si $A$ es normal, $\kappa(\lambda)=1$ para todo autovalor simple.
3. Sea $A_t=\begin{pmatrix}1&t\\0&2\end{pmatrix}$. Escribe $\kappa(1)$ en función de $t$ y represéntalo para $t\in[0,1000]$.
4. Con `numpy`: genera $A$ aleatoria de $50\times50$, perturba con $E$ de norma $10^{-8}$ y comprueba que $|\delta\lambda_i|\lesssim\kappa(\lambda_i)\cdot10^{-8}$ para todos los autovalores.
5. Explica con tus palabras, en 3 líneas, por qué un autovalor con $\kappa$ grande es «frágil» y qué tiene que ver eso con que $\mathbf u$ y $\mathbf v$ formen un ángulo casi recto.

Si haces 1–3 sin mirar y 4 en menos de 30 minutos, pasa al nodo siguiente.

## Referencias

- Bindel, D. (2009). *CS 6210: Matrix Computations, lecture notes, week 9 (lec24)*. Cornell University. https://www.cs.cornell.edu/~bindel/class/cs6210-f09/lec24.pdf
- Saad, Y. *CSCI 5304 lecture notes: Eigenvalue problems (LecN12)*. University of Minnesota. https://www-users.cse.umn.edu/~saad/csci5304_F24/FILES/LecN12.pdf
- Saad, Y. (2011). *Numerical Methods for Large Eigenvalue Problems*, 2.ª ed., SIAM Classics. Versión del autor: https://www-users.cse.umn.edu/~saad/eig_book_2ndEd.pdf
- Golub, G. H., Van Loan, C. F. (2013). *Matrix Computations*, 4.ª ed., Johns Hopkins University Press, §7.2.
- Trefethen, L. N., Embree, M. (2005). *Spectra and Pseudospectra*. Princeton University Press.
