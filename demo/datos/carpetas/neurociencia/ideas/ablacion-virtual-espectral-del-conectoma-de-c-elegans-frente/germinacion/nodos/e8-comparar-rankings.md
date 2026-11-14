# Comparar rankings: Spearman, Kendall y coincidencia en el top-k

**Duración orientativa:** ~1 hora (semana 5). **Depende de:** nada. **Punto de partida:** nivel 0 en estadística. Para la entrega solo necesitas lo de este nodo; lo demás queda en [e10](germinacion/nodos/e10-estadistica-validacion.md), para después.

## 1. Qué es y por qué importa aquí

Vas a producir varias ordenaciones de las 282 neuronas: por $\Delta\alpha$ exacto, por cada estimador, por cada escenario de signos y por grado. Las preguntas «¿se parecen?» y «¿el espectro aporta algo más que el grado?» necesitan números, no impresiones.

## 2. Lo que tienes que dominar

> **Definición 1 (Spearman).** $\rho_S$ es la correlación de Pearson entre los **rangos**: sustituye cada valor por su posición en la ordenación.

> **Definición 2 (Kendall).** $\tau=\dfrac{(\text{pares concordantes})-(\text{pares discordantes})}{\binom n2}$. Un par $(i,j)$ es concordante si las dos ordenaciones colocan $i$ y $j$ en el mismo orden. $\tau=1$: idénticas; $\tau=0$: sin relación; $\tau=-1$: invertidas.

> **Definición 3 (coincidencia en el top-k).** $|\mathrm{top}_k(a)\cap\mathrm{top}_k(b)|/k$.

**Cuál usar.** Kendall es más fácil de interpretar (la probabilidad de que un par esté en el mismo orden es $(1+\tau)/2$). El top-$k$ responde a lo que importa biológicamente: *¿destacan las mismas neuronas?* Usa los dos.

**Dos trampas:**

1. **Empates.** Muchas neuronas tienen $\Delta\alpha\approx0$. Esa larga cola de casi ceros domina $\tau$ y $\rho_S$ aunque no signifique nada. Calcula también las correlaciones **restringidas al top 30–50** de cualquiera de las dos ordenaciones.
2. **Signo frente a magnitud.** $\Delta\alpha$ puede ser positivo (quitar la neurona *desestabiliza*). Decide si ordenas por $\Delta\alpha$ o por $|\Delta\alpha|$ y dilo.

**Lo que dicen los números del piloto:**

- Entre escenarios de signos (U, A, B): $\tau\in[-0{,}07,\,0{,}14]$, con 0–3 neuronas comunes en el top 10.
- Entre 30 asignaciones aleatorias de los signos dudosos: $\tau$ medio $0{,}13$.
- Entre $|\Delta\alpha|$ y la línea base de grado: $\rho_S=0{,}61$–$0{,}77$.

Ver [i4](germinacion/nodos/i4-robustez-signos.md).

## 3. Cómo estudiarlo

1. **Documentación de `scipy.stats.kendalltau` y `scipy.stats.spearmanr`**: las definiciones, el tratamiento de empates y qué significa el valor $p$ que devuelven. 30 min.
2. Haz los ejercicios. 30 min.

**Advertencia.** Los valores $p$ de `kendalltau` suponen observaciones independientes. Tus neuronas no lo son: hay pares L/R y estructura de red. **Para la entrega, informa de $\tau$ y del top-$k$ sin valores $p$**, o con un test por permutación si te sobra tiempo.

## 4. Cómo saber que lo dominas

1. Calcula a mano $\tau$ entre $(1,2,3,4)$ y $(2,1,4,3)$. (Sale $1/3$.)
2. Implementa $\tau$ en 5 líneas de `numpy` y compáralo con SciPy en datos aleatorios.
3. Genera dos vectores con 250 ceros y 32 valores informativos idénticos. ¿Qué $\tau$ sale? ¿Y en el top 32? Explica la diferencia.

## Referencias

- SciPy. *scipy.stats.kendalltau*. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kendalltau.html
- SciPy. *scipy.stats.spearmanr*. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.spearmanr.html
- Kendall, M. G. (1938). A new measure of rank correlation. *Biometrika* 30(1/2), 81–93.
