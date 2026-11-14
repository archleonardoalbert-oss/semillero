# Estadística para validar contra datos medidos (después de la entrega)

**Duración orientativa:** 2–3 semanas a tu ritmo. **Depende de:** [e8](germinacion/nodos/e8-comparar-rankings.md). **No entra en el plazo de 1,5 meses.** Hace falta para [i7](germinacion/nodos/i7-validacion-randi.md).

## 1. Qué es y por qué importa aquí

Responder «¿predice la importancia espectral algo que se mide en el animal, *más allá del grado*?» exige tres herramientas: controlar una variable de confusión (el grado), tener en cuenta que las neuronas no son independientes (pares L/R, estructura de red) y generar una distribución nula creíble.

## 2. Lo que hay que dominar

1. **Regresión con covariable y correlación parcial.** Ajustar $y\sim\beta_0+\beta_1\,\text{grado}+\beta_2\,\text{espectral}$ y contrastar $\beta_2$, o correlacionar los **residuos** de $y$ y del ranking espectral tras regresar ambos sobre el grado. Con rangos: correlación parcial de Spearman.
2. **Tests por permutación.** Genera la distribución del estadístico bajo la hipótesis nula permutando etiquetas o, mejor, **recableando la red** de forma que se conserven los grados de entrada y salida y la proporción de signos de cada neurona. Recalcula el ranking espectral en cada red recableada.
3. **Bootstrap por bloques.** Remuestrea **clases de neuronas** (cada par L/R junto) y no neuronas sueltas, para no inflar artificialmente el tamaño muestral.
4. **Comparaciones múltiples.** Si pruebas varios modos, escenarios y valores de $g$, corrige (Benjamini–Hochberg) o, mejor aún, **declara el análisis principal antes de mirar los datos**.

## 3. Cómo estudiarlo

1. **OpenIntro Statistics** (libro gratuito): los capítulos de regresión múltiple e inferencia. Es un repaso rápido.
2. **Good, *Permutation, Parametric and Bootstrap Tests of Hypotheses*** (biblioteca): los capítulos introductorios.
3. Para los modelos nulos de redes con signo: la sección de métodos de Szilágyi et al. (2026, *BMC Biology*), que analiza motivos con signo justo en este conectoma ([PDF](germinacion/recursos/szilagyi-2026-signed-motifs.pdf), si la descarga terminó bien).

## 4. Cómo saber que lo dominas

1. Genera datos sintéticos donde $y$ depende solo del grado y comprueba que tu análisis **no** atribuye efecto al ranking espectral.
2. Implementa el recableado que conserva grados y signos, y verifica que conserva lo que dice conservar.

## Referencias

- Diez, D., Çetinkaya-Rundel, M., Barr, C. (2019). *OpenIntro Statistics*, 4.ª ed. https://www.openintro.org/book/os/
- Good, P. I. (2005). *Permutation, Parametric and Bootstrap Tests of Hypotheses*, 3.ª ed. Springer.
- Szilágyi, G. S., Gulyás, A., Vassy, Z., Csermely, P., Fenyves, B. G. (2026). Signed motif analysis of the *Caenorhabditis elegans* neuronal network reveals positive feedforward and negative feedback loops. *BMC Biology* 24, 167. https://doi.org/10.1186/s12915-026-02641-4
- Benjamini, Y., Hochberg, Y. (1995). Controlling the false discovery rate. *J. R. Stat. Soc. B* 57(1), 289–300.
