# Sistemas lineales de EDO, estabilidad y el modelo de tasas

**Duración orientativa:** unas 3 horas (semana 2). **Depende de:** [e1](germinacion/nodos/e1-autovectores-izquierdos.md). **Punto de partida:** nivel 0. Estás cursando EDO ahora mismo: aprovéchalo y pregunta a tu profesor de EDO por los sistemas lineales $\dot{\mathbf x}=A\mathbf x$, que seguramente estén en el temario.

## 1. Qué es y por qué importa aquí

Lo que justifica fijarse en **la parte real máxima** de los autovalores de $J$, y no en otra cosa, es que $J$ es el **jacobiano de un sistema dinámico**: describe cómo evolucionan pequeñas desviaciones de la actividad neuronal respecto a un estado de reposo. La *abscisa espectral*

$$\alpha(J)=\max_i\operatorname{Re}\lambda_i(J) \tag{1}$$

es la tasa a la que decae (si $\alpha<0$) o crece (si $\alpha>0$) la perturbación más persistente. «Quitar una neurona baja $\alpha$» significa: **sin esa neurona, la red olvida antes sus perturbaciones; el modo más lento se acelera**. Sin este nodo no podrías explicar en tu informe qué significa el número que calculas.

## 2. Lo que tienes que dominar

### 2.1 Solución de $\dot{\mathbf x}=J\mathbf x$

Si $J=V\Lambda V^{-1}$ es diagonalizable, con autovectores derechos $\mathbf v_i$ (columnas de $V$) e izquierdos $\mathbf u_i$ normalizados con $\mathbf u_i^*\mathbf v_i=1$ (filas de $V^{-1}$):

$$\mathbf x(t)=e^{tJ}\mathbf x_0=\sum_i e^{\lambda_i t}\,\mathbf v_i\,(\mathbf u_i^*\mathbf x_0). \tag{2}$$

Aquí ves por qué aparecen los **autovectores izquierdos**: $\mathbf u_i^*\mathbf x_0$ es *cuánto excita* la condición inicial al modo $i$, y $\mathbf v_i$ es *la forma* que tiene ese modo. En la ablación, $\bar u_kv_k$ mide a la vez cuánto «escucha» el modo a la neurona $k$ y cuánto «habla» a través de ella. Por eso aparece en la fórmula (3) de [e2](germinacion/nodos/e2-perturbacion-autovalores.md).

> **Teorema 1 (estabilidad lineal).** $\mathbf x(t)\to0$ para toda condición inicial si y solo si $\alpha(J)<0$. Para $t$ grande, $\|\mathbf x(t)\|\sim C\,e^{\alpha(J)t}$, y la constante de tiempo del modo más lento es $1/|\alpha(J)|$.

### 2.2 Linealización del modelo de tasas

El modelo más sencillo de red neuronal con tasas de disparo (o potenciales graduados, como en *C. elegans*) es

$$\tau\,\dot{\mathbf r}=-\mathbf r+W\,\phi(\mathbf r)+\mathbf I, \tag{3}$$

donde $W_{ij}$ es el efecto, con signo, de la neurona $j$ sobre la $i$ y $\phi$ es una ganancia no lineal (por ejemplo, $\tanh$). En un punto fijo $\mathbf r^*$, con $\mathbf x=\mathbf r-\mathbf r^*$:

$$\tau\,\dot{\mathbf x}\approx\big(-I+W\,\mathrm{diag}(\phi'(\mathbf r^*))\big)\,\mathbf x. \tag{4}$$

Si suponemos **la misma ganancia $g=\phi'(r^*_i)$ para todas las neuronas** (una simplificación fuerte, que debes declarar), añadimos las uniones gap como un término de difusión $-h\hat L$ (las corrientes eléctricas igualan voltajes entre neuronas acopladas) y tomamos $\tau=1$, se obtiene el modelo de tu proyecto:

$$J(g,h)=-I+g\,M-h\,\hat L,\qquad M_{ij}=s_{ij}\,w_{ij},\qquad \hat L=L/\lambda_{\max}(L). \tag{5}$$

Aquí $s_{ij}\in\{+1,-1\}$ es el signo de la sinapsis química de $j$ a $i$ (Fenyves et al., 2020), $w_{ij}$ es su número de contactos y $L$ es el Laplaciano de las uniones gap. El modelo es esencialmente el de Varshney et al. (2011), §«linear systems», con signos añadidos.

**Supuestos que debes enumerar en el informe:** linealidad alrededor de un punto fijo, ganancia uniforme, peso proporcional al número de contactos, signos predichos y no medidos, ausencia de neuromodulación. Son las mismas limitaciones que critican Jiang y Lai (2019) a los análisis lineales del conectoma ([PDF](germinacion/recursos/jiang-lai-2019.pdf)). No hace falta resolverlas, pero sí **nombrarlas**.

### 2.3 Crecimiento transitorio (solo la idea)

Con $J$ no normal, aunque $\alpha(J)<0$, $\|e^{tJ}\|$ puede crecer mucho antes de decaer (figura 1). En redes neuronales se llama *amplificación no normal* (Murphy y Miller, 2009). **Para tu entrega no hace falta.** Pero si tu tribunal pregunta «¿basta $\alpha$ para describir la dinámica?», la respuesta honesta es «no, solo el comportamiento asintótico», y esta figura lo explica.

![Figura 1. Dos jacobianos con los mismos autovalores (−1 y −2). El no normal amplifica una perturbación por un factor de ~12 antes de que decaiga.](figuras/crecimiento-transitorio.png)

## 3. Cómo estudiarlo

1. **Tu curso de EDO**: sistemas lineales con coeficientes constantes y la exponencial de matrices. Si aún no lo habéis dado, Strogatz, *Nonlinear Dynamics and Chaos*, **cap. 5 (sistemas lineales) y §6.3 (puntos fijos y linealización)**. Está en casi todas las bibliotecas. 1,5 h.
2. **Varshney et al. (2011)** ([PDF](germinacion/recursos/varshney-2011.pdf)), sección de **sistemas lineales**. Ahí aparecen $\tau\dot V=-LV$ para las uniones gap y la matriz combinada $\Phi=-L_{\text{gap}}+A^\top_{\text{chem}}$. Es el antecedente directo de (5). 45 min.
3. *(Opcional)* Dayan y Abbott, *Theoretical Neuroscience*, **§7.4 (redes recurrentes lineales)**: la descomposición en modos de una red recurrente con exactamente esta notación. O, gratis en línea, Gerstner et al., *Neuronal Dynamics*, cap. 15 (modelos de tasas).

## 4. Cómo saber que lo dominas

1. Resuelve $\dot{\mathbf x}=\begin{pmatrix}-1&50\\0&-2\end{pmatrix}\mathbf x$ con $\mathbf x_0=(0,1)$ usando (2) y comprueba el pico de la figura 1.
2. Deduce (4) a partir de (3) con la regla de la cadena.
3. Demuestra que, si $h=0$, $\alpha(-I+gM)=-1+g\,\max\operatorname{Re}\lambda(M)$. ¿Para qué $g_c$ se vuelve inestable el sistema?
4. Demuestra que $-I-h\hat L$ es estable para todo $h\ge0$ (pista: $L$ es simétrico y semidefinido positivo). Luego responde: ¿se cumple siempre $\alpha(B-h\hat L)\le\alpha(B)$ cuando $B$ **no** es normal? (Pista: no en general; busca un contraejemplo $2\times2$. Es la razón de que $h$ sea un parámetro que hay que barrer, véase [i1](germinacion/nodos/i1-regimen-acoplamiento.md).)
5. En 5 líneas: ¿qué significa biológicamente que quitar una neurona *suba* $\alpha$? (En el piloto ocurre con RIR, AWAL y DVA en uno de los escenarios.)

## Referencias

- Strogatz, S. H. (2015). *Nonlinear Dynamics and Chaos*, 2.ª ed., Westview Press, caps. 5–6.
- Varshney, L. R., Chen, B. L., Paniagua, E., Hall, D. H., Chklovskii, D. B. (2011). Structural properties of the *Caenorhabditis elegans* neuronal network. *PLoS Comput. Biol.* 7(2), e1001066. arXiv:0907.2373
- Dayan, P., Abbott, L. F. (2001). *Theoretical Neuroscience*. MIT Press, §7.4.
- Gerstner, W., Kistler, W. M., Naud, R., Paninski, L. (2014). *Neuronal Dynamics*. Cambridge University Press. https://neuronaldynamics.epfl.ch/online/
- Murphy, B. K., Miller, K. D. (2009). Balanced amplification: a new mechanism of selective amplification of neural activity patterns. *Neuron* 61(4), 635–648. https://doi.org/10.1016/j.neuron.2009.02.005
- Jiang, J., Lai, Y.-C. (2019). Irrelevance of linear controllability to nonlinear dynamical networks. *Nat. Commun.* 10, 3961. arXiv:1909.01288
- Fenyves, B. G. et al. (2020). Synaptic polarity and sign-balance prediction using gene expression data in the *C. elegans* chemical synapse neuronal connectome network. *PLoS Comput. Biol.* 16(12), e1007974.
