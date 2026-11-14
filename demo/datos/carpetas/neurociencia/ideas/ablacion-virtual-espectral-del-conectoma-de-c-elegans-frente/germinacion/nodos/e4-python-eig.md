# Herramientas numéricas en Python: autovalores, autovectores izquierdos y fiabilidad

**Duración orientativa:** 2–3 horas (semanas 1–2, en paralelo con e1–e2). **Depende de:** [e1](germinacion/nodos/e1-autovectores-izquierdos.md). **Punto de partida:** nivel 1. Programas con `numpy` y has usado `np.linalg.eig`, pero no sabes obtener ni emparejar los autovectores izquierdos.

## 1. Qué es y por qué importa aquí

Tu entrega es, al final, un programa que hace ~300 veces lo siguiente: borrar una neurona, recalcular el espectro y compararlo con dos estimaciones. Hay tres errores típicos que estropean silenciosamente los resultados, y este nodo existe para que no los cometas:

1. **Emparejar mal $\mathbf u$ y $\mathbf v$.** `eig` devuelve los autovalores **sin ningún orden garantizado**, y el autovector izquierdo de la columna $i$ no tiene por qué corresponder al derecho de la columna $i$ si los calculas por separado.
2. **Confundir $\mathbf u^\top$ con $\mathbf u^*$** cuando el autovalor es complejo. En el piloto, con signos aleatorios, el autovalor dominante salió complejo en 4 de 20 casos.
3. **Fiarte de un autovalor mal condicionado.** El error numérico de `eig` es del orden de $\kappa(\lambda)\,\varepsilon_{\text{máq}}\,\|J\|$. Con $\kappa\sim10^2$ es irrelevante ($\sim10^{-14}$), pero debes **comprobarlo y decirlo**.

## 2. Lo que tienes que dominar

### 2.1 SciPy calcula ambos a la vez y ya emparejados

```python
import numpy as np
from scipy.linalg import eig

w, vl, vr = eig(J, left=True, right=True)
# w[i]: autovalor; vr[:, i]: autovector derecho; vl[:, i]: izquierdo,
# en el convenio  vl[:, i].conj().T @ J = w[i] * vl[:, i].conj().T
i = np.argmax(w.real)              # abscisa espectral
lam, v, u = w[i], vr[:, i], vl[:, i]
uv = np.vdot(u, v)                 # u^* v  (vdot conjuga el primer argumento)
kappa = np.linalg.norm(u) * np.linalg.norm(v) / abs(uv)
```

Si solo tienes `numpy`, obtén los izquierdos con `np.linalg.eig(J.conj().T)` y **empareja por cercanía** de $\bar\lambda$. Es lo que hice en el piloto, y funciona si los autovalores están bien separados. SciPy es más seguro.

### 2.2 Comprobaciones que tu código debe hacer siempre

- **Residuos:** $\|J\mathbf v-\lambda\mathbf v\|/\|J\|\|\mathbf v\|$ y $\|\mathbf u^*J-\lambda\mathbf u^*\|/\|J\|\|\mathbf u\|$ deben salir $\lesssim10^{-12}$.
- **Desempate con autovalores complejos:** elige el de parte imaginaria $\ge0$ del par conjugado y documéntalo. $\alpha$ no cambia, pero la $\mathbf v$ elegida sí.
- **Brecha:** la diferencia entre $\operatorname{Re}\lambda_1$ y la parte real del siguiente autovalor *distinto* (sin contar el conjugado). Si es pequeña, apúntalo (véase [i2](germinacion/nodos/i2-seguir-autovalor.md)).
- **Reproducibilidad:** fija la semilla (`np.random.default_rng(semilla)`) en todo lo aleatorio, guarda los resultados en un `.csv` o `.npz` con el nombre de la neurona y usa `git` desde el primer día.

### 2.3 El bucle de ablaciones

Para $N=282$ neuronas, `eig` de una matriz $281\times281$ tarda del orden de una décima de segundo. El bucle entero dura menos de un minuto, así que **no hace falta optimizar nada**. Lo único delicado es construir bien la matriz reducida: `np.ix_(keep, keep)`, con la corrección de grado de las uniones gap explicada en [e7](germinacion/nodos/e7-construir-jacobiano.md).

### 2.4 Por qué `eig` es fiable aquí (lo que dirás en el informe)

LAPACK (`geev`) reduce $J$ a forma de Hessenberg y aplica el algoritmo QR. Es **estable hacia atrás**: los autovalores que calcula son los exactos de $J+E$ con $\|E\|\approx\varepsilon_{\text{máq}}\|J\|$. Combinado con el teorema 1 de [e1](germinacion/nodos/e1-autovectores-izquierdos.md), el error en $\lambda$ es $\lesssim\kappa(\lambda)\,\varepsilon_{\text{máq}}\|J\|$. Como las diferencias que mides ($|\Delta\alpha|$ de $10^{-5}$ a $10^{-1}$) son muchos órdenes mayores, **el error numérico es despreciable frente al error de modelo**. Esta frase, con los números de tu caso, debe aparecer en tu informe.

## 3. Cómo estudiarlo

1. **Documentación de `scipy.linalg.eig`** (enlace en los recursos): lee el significado exacto de `vl` y `vr`. 20 min.
2. **Saad (2011), §3.3.1** ([PDF](germinacion/recursos/saad-2011-eig-book.pdf)): el condicionamiento que justifica §2.4. Ya lo leíste en e1; aquí basta con conectar las dos cosas.
3. **Tu asignatura de Matemática Numérica**: si cubre QR o la estabilidad hacia atrás, este es el puente. **Pregunta a tu profesor** si le parece bien que el informe incluya un párrafo sobre esto: es justo su terreno.

## 4. Cómo saber que lo dominas

1. Con la matriz $2\times2$ de [e1](germinacion/nodos/e1-autovectores-izquierdos.md), obtén con `scipy.linalg.eig` $\mathbf u$, $\mathbf v$ y $\kappa$, y comprueba que coinciden con tu cálculo a mano (salvo escala).
2. Matriz real aleatoria de $200\times200$: comprueba la biortogonalidad `vl.conj().T @ vr` $\approx$ diagonal.
3. Escribe una función `lead(J)` que devuelva `lam, u, v, kappa, brecha` y pase los dos tests de residuos.
4. Mide cuánto tarda el bucle de 282 ablaciones con una matriz aleatoria del mismo tamaño.

## Referencias

- SciPy. *scipy.linalg.eig*. https://docs.scipy.org/doc/scipy/reference/generated/scipy.linalg.eig.html
- Anderson, E. et al. (1999). *LAPACK Users' Guide*, 3.ª ed., SIAM, §4.8 (cotas de error para el problema no simétrico de autovalores). https://www.netlib.org/lapack/lug/node91.html
- Saad, Y. (2011). *Numerical Methods for Large Eigenvalue Problems*, 2.ª ed., §3.3. https://www-users.cse.umn.edu/~saad/eig_book_2ndEd.pdf
