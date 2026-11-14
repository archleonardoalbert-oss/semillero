## Cómo se llegó a este problema

La idea de medir la importancia de un nodo por cuánto cambia el autovalor dominante al quitarlo procede de Restrepo, Ott y Hunt (2006). Ellos trabajaban con matrices de adyacencia **no negativas**, y ahí el teorema de Perron–Frobenius da una garantía muy cómoda: si la red es fuertemente conexa, el autovalor dominante es **real, simple y está separado** de los demás. Al quitar un nodo, «el» autovalor dominante sigue siendo, sin ambigüedad, el radio espectral de la matriz nueva. Milanese, Sun y Nishikawa (2010) y Young y Porter (2024) trabajaron en ese mismo marco cómodo.

Al pasar al **jacobiano con signos**, esa garantía desaparece ([e5](germinacion/nodos/e5-redes-minimo.md)). El piloto lo mostró enseguida:

- con signos aleatorios plausibles, en **4 de 20** asignaciones el autovalor dominante era un **par complejo conjugado**;
- con los signos tal como se predicen, en **2 ablaciones** de los escenarios U y A, y en **9** del B, el autovalor que daba la nueva abscisa espectral **no era el continuador** del dominante original. Con signos aleatorios hubo ~8,4 casos por red de media.

En esos casos, quitar la neurona debilita tanto el modo dominante que otro modo, que estaba «detrás», pasa a ocupar su lugar. Las fórmulas perturbativas de [e2](germinacion/nodos/e2-perturbacion-autovalores.md) no pueden predecir eso: por construcción siguen a su autovalor. Si comparas su predicción con la nueva abscisa espectral, el «error» que mides es de **identificación**, no de aproximación.

Luo y Zhou (arXiv:2604.24279, revisado el 3 de octubre de 2026) acaban de describir exactamente esta **ambigüedad de selección modal** en redes dirigidas: el modo lento puede ser complejo y cambiar de identidad al dañar la red.

**Lo que añadió el taller.** Un ejemplo de juguete de $4\times4$ (dos bucles A y B débilmente acoplados; se quita gradualmente una neurona del bucle dominante A) mostró que **«el continuador» no está bien definido** mientras no se diga con qué criterio se identifica. En una familia real $J(t)$ de un parámetro, dos autovalores reales genéricamente **no se cruzan**: o se **repelen** (cruce evitado) o **colisionan** y forman un par complejo que más tarde puede volver a separarse (punto excepcional). En el cruce evitado, la rama superior es continua, así que la continuación dice «es el mismo autovalor», pero su autovector cambia de carácter (pasa de vivir en A a vivir en B), así que el solapamiento dice «es otro modo». Los dos criterios del enunciado original **dan respuestas opuestas justo en los casos que importan**.

![Figura. Trayectorias de Re λ(t) al quitar gradualmente la neurona k del bucle A. (i) cruce evitado: la rama superior es continua, pero su autovector pasa de A (azul) a B (naranja); (ii) y (iii) colisión: los dos reales forman un par complejo (círculos huecos) y luego se separan.](figuras/talleres/i2-seguir-autovalor/juguete-trayectorias.png)

## El problema

Sea $J$ real con autovalor dominante $\lambda$ (el de mayor parte real) y autovectores $\mathbf u$, $\mathbf v$. Tras quitar la neurona $k$, se obtiene $J^{(-k)}$ con autovalores $\{\lambda'_i\}$ (sin contar el autovalor $J_{kk}$ de la neurona aislada). Sean $\mathbf u^{(-k)}$, $\mathbf v^{(-k)}$ los vectores $\mathbf u$, $\mathbf v$ con su componente $k$ anulada. Definimos:

$$\Delta\alpha_k=\max_i\operatorname{Re}\lambda'_i-\operatorname{Re}\lambda,\qquad \Delta\lambda^{\text{seg}}_k=\lambda'_{i^*}-\lambda,$$

donde $\lambda'_{i^*}$ es el **continuador diabático** de $\lambda$: el autovalor cuyo autovector más se parece a $\mathbf v^{(-k)}$,

$$i^*=\arg\max_i s_i,\qquad s_i=\frac{|\mathbf v_i'^{*}\mathbf v^{(-k)}|}{\|\mathbf v'_i\|\,\|\mathbf v^{(-k)}\|},$$

con un **margen de confianza** $m_k=s_{(1)}/s_{(2)}$ (cociente entre el mayor y el segundo mayor solapamiento, contando el par conjugado como uno solo). Esta es la definición pertinente para [i3](germinacion/nodos/i3-precision-perturbativa.md), porque el estimador $\delta\lambda^{(T)}_k$ es un cociente de Rayleigh construido con $\mathbf u^{(-k)}$ y $\mathbf v^{(-k)}$: aproxima el modo con ese carácter, no la rama continua.

Cada ablación se clasifica en:

- **(a) mismo modo dominante:** $i^*$ es el índice de la abscisa espectral (o su conjugado);
- **(b) relevo de modo:** $i^*$ no lo es, con $m_k$ holgado;
- **(c) identidad ambigua:** $m_k$ pequeño, o los dos criterios de solapamiento (el anterior y el coeficiente biortogonal $|\mathbf u_i'^{*}\mathbf v^{(-k)}|\,\|\mathbf v'_i\|/(|\mathbf u_i'^{*}\mathbf v'_i|\,\|\mathbf v^{(-k)}\|)$) eligen autovalores distintos.

**Preguntas:**

1. **Mecanismo:** en los casos (b) y (c) del conectoma real, ¿el relevo se produce por un **cruce evitado** (repulsión de dos reales), por una **colisión** con paso por un par complejo, o porque un par complejo ajeno supera en parte real al modo dominante (el único cruce genérico)? Se diagnostica con la homotopía $J(t)$, $t\in[0,1]$.
2. **Modelo reducido $2\times2$:** ¿explica la matriz efectiva $M(t)=\begin{pmatrix}a(t)&\beta\\\gamma&b\end{pmatrix}$, con autovalores $\tfrac{a+b}{2}\pm\sqrt{\big(\tfrac{a-b}{2}\big)^2+\beta\gamma}$, qué mecanismo aparece en cada caso según el signo de $\beta\gamma$ (repulsión si $\beta\gamma>0$, colisión si $\beta\gamma<0$)?
3. **Autovalor complejo:** como los estimadores del par conjugado son conjugados entre sí (porque $J$ es real), todo error definido sobre partes reales es el mismo para los dos miembros. ¿Basta entonces con seguir el miembro con $\operatorname{Im}\lambda\ge0$, o hay casos en que el par se separa en dos reales y la elección cambia $\operatorname{Re}\Delta\lambda^{\text{seg}}$?

## Qué representaría resolverlo

- **Para el análisis numérico ([i3](germinacion/nodos/i3-precision-perturbativa.md)):** separar (a), (b) y (c) limpia la medida del error. Lo que hoy aparece como «la aproximación falla a veces» se descompone en precisión de un modo, relevo de modo y ambigüedad genuina. Los casos (c) se excluyen del ajuste de error y se informan aparte.
- **Para la teoría:** el modelo $2\times2$ explica con una fórmula de bachillerato por qué la continuación y el solapamiento discrepan y cuándo aparece un par complejo. Encaja con el ejemplo $2\times2$ de [e1](germinacion/nodos/e1-autovectores-izquierdos.md).
- **Para la biología:** los casos (b) tienen una lectura directa: «sin esta neurona, la dinámica lenta pasa a sostenerla otro circuito». Qué circuitos aparecen solo se sabrá calculándolo.
- **Para el informe:** la figura de trayectorias del juguete, y la de al menos un caso real, explican el fenómeno mejor que cualquier párrafo.

## Estado del arte

- **Luo y Zhou (2026):** proponen seguir la rama del modo lento (*branch tracking*) y quedarse con su parte real. Definen una «susceptibilidad modal» de primer orden para eliminar nodos a partir del soporte biortogonal del modo, es decir, de $\mathbf u$ y $\mathbf v$ ([PDF](germinacion/recursos/luo-zhou-2026.pdf), secciones II–III). **Su marco supone pesos no negativos** (Laplacianos de grafos dirigidos), así que no cubre tu jacobiano con signos. Es el antecedente más cercano y debes citarlo. Comprueba en su texto si su «rama» es la continua (adiabática) o la de carácter (diabática): según el juguete, no son lo mismo.
- **Análisis numérico clásico:** seguir un autovalor a lo largo de un parámetro es un problema de **continuación**; se resuelve avanzando con pasos pequeños o emparejando por solapamiento de autovectores (Saad, 2011, §3.3, sobre el condicionamiento de los autovectores). Que los autovalores reales de una familia real de un parámetro no se crucen, sino que se repelan o colisionen, es un hecho clásico de la teoría de perturbaciones (Kato, 1995, cap. II; en física, «cruce evitado» y «punto excepcional»).

## Enfoque propuesto

1. **Juguete $4\times4$ (≈1,5 h, puede hacerse en paralelo con e1/e4).** Dos bucles: $J_{01}=J_{10}=a$, $J_{23}=J_{32}=b<a$, diagonal $\approx-1$ (con valores ligeramente distintos para no tener degeneraciones), y acoplamiento débil $J_{21}=c$, $J_{13}=d$ que no pasa por la neurona $k=0$. Quita $k$ multiplicando su fila y su columna (fuera de la diagonal) por $1-t$, y dibuja $\operatorname{Re}\lambda(t)$ coloreado según dónde vive el autovector. Cambia el signo de $cd$ y observa la repulsión y la colisión.
2. **Modelo $2\times2$ (≈1 h, a mano).** Deduce la fórmula de $\lambda_\pm$, la brecha mínima $2\sqrt{\beta\gamma}$ si $\beta\gamma>0$ y el intervalo complejo $|a-b|<2\sqrt{|\beta\gamma|}$ si $\beta\gamma<0$. Compáralos con el juguete ($\beta\gamma\approx cd/4$).
3. **En el conectoma (semana 4):** para cada ablación guarda $\Delta\alpha_k$, $\Delta\lambda^{\text{seg}}_k$, $i^*$, $m_k$ y la clase (a)/(b)/(c). La bandera de relevo es una **comparación de índices**, no una tolerancia sobre $|\Delta\alpha-\operatorname{Re}\Delta\lambda^{\text{seg}}|$.
4. **Evalúa los estimadores solo frente a $\Delta\lambda^{\text{seg}}$** y solo en los casos (a) y (b).
5. **Homotopía solo para los casos (b)/(c)** (son pocos: 2, 2 y 9 en el piloto): 50 pasos en $t$, clasifica el mecanismo y dibuja al menos uno.

## Ficha

- **Tipo:** problema metodológico.
- **Abierta:** no del todo; las herramientas existen, pero su aplicación a la ablación en redes con signo no está hecha, y el criterio de identidad debe justificarse.
- **Dificultad:** media.
- **Depende de:** [e2](germinacion/nodos/e2-perturbacion-autovalores.md) y [e4](germinacion/nodos/e4-python-eig.md).
- **Calendario:** juguete y modelo $2\times2$ en las semanas 1–2, junto con e1; conectoma en la semana 4. Presupuesto total: ≤4 h.
- **Cómo sabrás que la has resuelto:** tu código produce para cada ablación $\Delta\alpha$, $\Delta\lambda^{\text{seg}}$, $m_k$ y la clase; tienes la figura del juguete con los dos mecanismos explicados por el modelo $2\times2$, y al menos un caso real con su mecanismo identificado.

## Referencias

- Luo, K., Zhou, H. (2026). Functional dismantling of network relaxation through slow-branch susceptibility. arXiv:2604.24279v2. https://arxiv.org/abs/2604.24279 · [PDF](germinacion/recursos/luo-zhou-2026.pdf)
- Restrepo, J. G., Ott, E., Hunt, B. R. (2006). Characterizing the dynamical importance of network nodes and links. *Phys. Rev. Lett.* 97, 094102. arXiv:cond-mat/0606122
- Milanese, A., Sun, J., Nishikawa, T. (2010). Approximating spectral impact of structural perturbations in large networks. *Phys. Rev. E* 81, 046112. arXiv:1001.1431
- Young, J., Porter, M. A. (2024). Dynamical importance and network perturbations. *Phys. Rev. E* 110, 064304. arXiv:2403.14584
- Saad, Y. (2011). *Numerical Methods for Large Eigenvalue Problems*, 2.ª ed., §1.10 y §3.3. https://www-users.cse.umn.edu/~saad/eig_book_2ndEd.pdf
- Kato, T. (1995). *Perturbation Theory for Linear Operators*, reimpr. de la 2.ª ed., Springer, cap. II (perturbación analítica en dimensión finita, puntos excepcionales).
