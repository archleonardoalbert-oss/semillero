# Pseudoespectros y perturbación de subespacios (después de la entrega)

**Duración orientativa:** 2–3 semanas a tu ritmo. **Depende de:** [e2](germinacion/nodos/e2-perturbacion-autovalores.md). **No entra en el plazo de 1,5 meses.** Es la teoría que necesitarás si sigues con el proyecto y quieres atacar en serio [i5](germinacion/nodos/i5-localizacion-pares-lr.md) o escribir un artículo.

## 1. Qué es y por qué importa aquí

La fórmula de primer orden solo vale para **autovalores simples y bien separados**. En el conectoma, los pares izquierda/derecha generan pares de modos casi degenerados, y en el piloto el autovalor dominante cambia de identidad en ~8 ablaciones por red. Para tratar estos casos hay que pasar de perturbar un autovalor a perturbar el **subespacio invariante** de un grupo de autovalores, y para cuantificar la fragilidad global del espectro, a los **pseudoespectros**.

## 2. Lo que hay que dominar

> **Definición 1 (pseudoespectro).** $\Lambda_\varepsilon(A)=\{z\in\mathbb C:\ \sigma_{\min}(zI-A)\le\varepsilon\}=\bigcup_{\|E\|\le\varepsilon}\Lambda(A+E)$.

> **Definición 2 (abscisa pseudoespectral).** $\alpha_\varepsilon(A)=\max\{\operatorname{Re}z: z\in\Lambda_\varepsilon(A)\}$. Acota el crecimiento transitorio: $\sup_t\|e^{tA}\|\ge\alpha_\varepsilon/\varepsilon$ (teorema de Kreiss en versión continua).

> **Teorema 1 (Davis–Kahan, solo matrices hermíticas).** Si $A$ y $A+E$ son hermíticas y $\mathcal V$, $\tilde{\mathcal V}$ son los subespacios espectrales de un grupo de autovalores separado del resto por una brecha $\delta$, entonces $\|\sin\Theta(\mathcal V,\tilde{\mathcal V})\|\le\|E\|/\delta$.

> **Teorema 2 (Stewart, caso no hermítico, enunciado informal).** Para la forma de Schur $A=Q\begin{pmatrix}T_{11}&T_{12}\\0&T_{22}\end{pmatrix}Q^*$, el subespacio asociado a $T_{11}$ se mueve como mucho $\sim\|E\|/\operatorname{sep}(T_{11},T_{22})$ mientras $\|E\|$ sea pequeña frente a $\operatorname{sep}$. Aquí $\operatorname{sep}(T_{11},T_{22})=\min_{\|X\|_F=1}\|T_{11}X-XT_{22}\|_F$, que puede ser **mucho menor** que la distancia entre los espectros.

**Aplicación al proyecto:** cuando un par L/R sostiene dos modos casi degenerados, la pregunta correcta no es «¿cuánto cambia $\lambda_1$?», sino «¿cuánto cambia el subespacio de los dos modos y cómo se reparten los autovalores dentro de él?». Esto se reduce a diagonalizar una matriz $2\times2$ (la perturbación restringida al subespacio), que es el análogo no hermítico de la perturbación degenerada de la mecánica cuántica.

## 3. Cómo estudiarlo

1. **Saad (2011), §3.3.2–3.3.3 (condicionamiento de autovectores y de subespacios invariantes) y §3.5 (pseudoautovalores)** ([PDF](germinacion/recursos/saad-2011-eig-book.pdf)).
2. **Trefethen y Embree (2005), *Spectra and Pseudospectra***, caps. 1–2 y la parte sobre transitorios. Está en las bibliotecas universitarias. La web del proyecto *Pseudospectra Gateway* (Oxford) es gratuita y tiene galerías y código (EigTool).
3. Stewart y Sun (1990), *Matrix Perturbation Theory*, cap. V: la referencia definitiva, solo si llegas a necesitarla.

## 4. Cómo saber que lo dominas

1. Calcula a mano $\operatorname{sep}$ para $T_{11}=1$, $T_{22}=2$ y compáralo con el $\kappa$ de [e1](germinacion/nodos/e1-autovectores-izquierdos.md).
2. Reproduce la figura de pseudoespectros de [e1](germinacion/nodos/e1-autovectores-izquierdos.md) calculando $\sigma_{\min}(zI-A)$ en una malla.
3. Para un par L/R del conectoma con brecha pequeña, calcula la perturbación restringida al subespacio de dos modos y compárala con el recálculo exacto.

## Referencias

- Saad, Y. (2011). *Numerical Methods for Large Eigenvalue Problems*, 2.ª ed., cap. 3. https://www-users.cse.umn.edu/~saad/eig_book_2ndEd.pdf
- Trefethen, L. N., Embree, M. (2005). *Spectra and Pseudospectra: The Behavior of Nonnormal Matrices and Operators*. Princeton University Press.
- Embree, M., Trefethen, L. N. *Pseudospectra Gateway*. https://www.cs.ox.ac.uk/pseudospectra/
- Davis, C., Kahan, W. M. (1970). The rotation of eigenvectors by a perturbation. III. *SIAM J. Numer. Anal.* 7(1), 1–46.
- Stewart, G. W., Sun, J.-G. (1990). *Matrix Perturbation Theory*. Academic Press.
