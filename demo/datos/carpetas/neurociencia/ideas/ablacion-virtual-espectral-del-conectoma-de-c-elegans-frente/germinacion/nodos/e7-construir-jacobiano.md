# Práctica guiada: cargar los datos y construir el jacobiano con signos

**Duración orientativa:** unas 3 horas (semana 3). **Depende de:** [e3](germinacion/nodos/e3-edo-lineales-estabilidad.md), [e4](germinacion/nodos/e4-python-eig.md), [e5](germinacion/nodos/e5-redes-minimo.md), [e6](germinacion/nodos/e6-celegans-minimo.md).

## 1. Qué es y por qué importa aquí

Es el paso donde más fácil es equivocarse sin darse cuenta: nombres que no casan, convenios de dirección invertidos, uniones gap contadas dos veces. Te dejo la receta exacta que usé en el piloto, **con las cifras que debes reproducir**. Si tus recuentos coinciden, tu matriz está bien.

## 2. Las fuentes (todas abiertas)

1. **Signos (y pesos químicos): Fenyves et al. (2020), *S1 Data*** (XLSX, en el material suplementario del artículo en PLoS; enlace en los recursos). La hoja **`5. Sign prediction`** tiene una fila por arista química:
   - columna 0: neurona origen;
   - columna 3: destino;
   - columna 4: número de contactos (peso);
   - columna 16: polaridad predicha (`+`, `-`, `complex` o `no pred`).

   Las dos primeras filas son cabecera. Los datos proceden de la reconstrucción de WormWiring, es decir, de Cook et al. (2019).
2. **Uniones gap: `herm_full_edgelist.csv`**, del repositorio del *C. elegans Connectome Toolbox* de OpenWorm (`cect`), carpeta `cect/data`. Columnas `Source, Target, Weight, Type`. Usa las filas con `Type == electrical`. **Los nombres traen espacios: haz `strip()`.**
3. *(Alternativa)* Instalar `cect` (`pip install cect`) y usar `get_connectome_dataset("Cook2019Herm")`. Es más cómodo para cambiar de conectoma (Witvliet, Varshney…), pero **los signos de Fenyves no vienen integrados**: tendrás que cruzarlos tú.

## 3. La receta

1. **Lista de neuronas:** las 302 de la hoja `1. NT expr` de Fenyves menos las 20 faríngeas (I1L, I1R, I2L, I2R, I3, I4, I5, I6, M1, M2L, M2R, M3L, M3R, M4, M5, MCL, MCR, MI, NSML, NSMR). Quedan **$N=282$**. CANL y CANR no tienen conexiones: quedan aisladas, con autovalor $-1$, y no molestan.
2. **Matriz química con signo**, convenio *fila = destino*: `M[i_dest, j_orig] += s * peso`. El valor de `s` depende del escenario:
   - **U (sin signo):** $s=+1$ siempre;
   - **A:** $s=\pm1$ si la polaridad es `+`/`-`, y $0$ si es `complex` o `no pred`;
   - **B:** como A, pero `no pred` $\to+1$ (suponer que lo desconocido es excitador);
   - **R (aleatorio):** `complex` y `no pred` $\to+1$ con probabilidad $0{,}778$ (la proporción E/(E+I) de Fenyves) y $-1$ en otro caso.

   Recuentos que debes obtener: **1291 «+», 421 «−», 467 «complex», 1331 «no pred»**, en aristas entre las 282 neuronas.
3. **Uniones gap:** matriz $E$ con `E[i, j] += peso`. En el fichero, casi todos los pares aparecen en ambos sentidos: 2084 entradas recíprocas y solo 5 en un único sentido. Simetriza con $G=\max(E,E^\top)$ y **no** con $E+E^\top$, que duplicaría los pesos. Laplaciano $L=\mathrm{diag}(G\mathbf1)-G$; en el piloto, $\lambda_{\max}(L)\approx274{,}5$.
4. **Jacobiano** (véase [e3](germinacion/nodos/e3-edo-lineales-estabilidad.md)):
$$J(g,h)=-I+g\,M-h\,L/\lambda_{\max}(L).$$
   Calcula $g_c$ (el $g$ en el que $\alpha(J)=0$) por bisección y trabaja en $g=0{,}9\,g_c$, con $h=0{,}5$, como punto de partida. Con eso, $\alpha(J)\approx-0{,}10$ en todos los escenarios. Por qué estos valores, y cómo comprobar que no condicionan las conclusiones, es la incógnita [i1](germinacion/nodos/i1-regimen-acoplamiento.md). En el piloto: $g_c\approx0{,}0093$ (U), $0{,}031$ (A) y $0{,}029$ (B).
5. **Ablación de $k$:** primero suma $h\,G_{ik}/\lambda_{\max}(L)$ a la diagonal de cada vecino gap $i$ de $k$ (pierden ese grado), **sin renormalizar** $\lambda_{\max}(L)$, porque el modelo físico no cambia. Después borra la fila y la columna $k$ con `np.ix_`.

## 4. Qué deberías ver (piloto, para comprobar)

![Figura 1. Espectro de J en los tres escenarios. La línea naranja marca α(J). Con signos aparecen autovalores complejos, pero en estos tres casos el dominante es real.](figuras/piloto-espectro-jacobiano.png)

| Escenario | $\lambda_{\max}$ | $\kappa$ | brecha | Neuronas con $\lvert\Delta\alpha\rvert>10^{-3}$ | Top 3 |
|---|---|---|---|---|---|
| U | $-0{,}100$ | 3,2 | 0,29 | 62 | RIAR, RIAL, SMDVL |
| A | $-0{,}103$ | 1,8 | 0,23 | 11 | RMDDR, RMDVL, RMDR |
| B | $-0{,}100$ | 8,7 | 0,11 | 96 | AIYR, AIZR, AWCR |

Si te sale algo muy distinto, revisa el convenio de dirección y la simetrización de las uniones gap antes que nada.

## 5. Cómo saber que lo dominas

1. Reproduces los recuentos del paso 2 y $\lambda_{\max}(L)\approx274{,}5$.
2. Reproduces la tabla de §4 con un error menor del 1 %, o sabes explicar la diferencia (por ejemplo, otro desempate de nombres).
3. Puedes cambiar de escenario de signos con un solo parámetro.
4. Tu código comprueba los residuos de $\mathbf u$ y $\mathbf v$ ([e4](germinacion/nodos/e4-python-eig.md)).

## Referencias

- Fenyves, B. G. et al. (2020). *PLoS Comput. Biol.* 16(12), e1007974; *S1 Data*: https://journals.plos.org/ploscompbiol/article/file?type=supplementary&id=10.1371/journal.pcbi.1007974.s003
- OpenWorm. *C. elegans Connectome Toolbox (cect)*. https://openworm.org/ConnectomeToolbox/ · datos: https://github.com/openworm/ConnectomeToolbox/tree/main/cect/data
- Cook, S. J. et al. (2019). Whole-animal connectomes of both *Caenorhabditis elegans* sexes. *Nature* 571, 63–71.
- Varshney, L. R. et al. (2011). *PLoS Comput. Biol.* 7(2), e1001066. arXiv:0907.2373
