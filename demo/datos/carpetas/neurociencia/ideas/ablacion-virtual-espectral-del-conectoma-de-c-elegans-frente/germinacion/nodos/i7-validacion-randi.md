## Cómo se llegó a este problema

Durante décadas, la gran promesa del conectoma de *C. elegans* fue que, conociendo el cableado completo, se podría predecir cómo fluye la actividad por el sistema nervioso. En 2023, Francesco Randi, Anuj Sharma, Sophie Dvali y Andrew Leifer pusieron esa promesa a prueba directamente. Activaron con luz (optogenética) neuronas individuales de la cabeza del gusano, una a una, y registraron con imagen de calcio la respuesta de todas las demás. Midieron así **23 433 pares de neuronas** y construyeron un **atlas funcional de propagación de señales**.

El resultado fue aleccionador: **la propagación medida difiere de lo que predice la anatomía**. Parte de la diferencia procede de la **señalización extrasináptica**: neuropéptidos y aminas que actúan a distancia sin sinapsis visibles. Ripoll-Sánchez et al. (2023) cartografiaron esa red de neuropéptidos ese mismo año. Además, el atlas medido predecía la actividad espontánea mejor que los modelos anatómicos.

En el dictamen propuse este atlas como **la validación natural** de tu proyecto, en lugar de comparar con otro modelo (Yan). Tras el piloto tiene además un segundo interés, quizá mayor: como tu ranking depende casi por completo de los signos desconocidos ([i4](germinacion/nodos/i4-robustez-signos.md)), unos datos que miden directamente si una neurona excita o inhibe a otra podrían **restringir esos signos**.

## El problema

Sea $F\in\mathbb R^{n\times n}$ el atlas funcional: $F_{ij}$ es la amplitud de la respuesta de $i$ al estimular $j$, con su significación estadística y con muchas entradas ausentes, porque solo cubre neuronas de la cabeza y no todas se identifican en cada animal. El modelo lineal predice la respuesta de $i$ a un pulso en $j$:

$$\hat F_{ij}(t)=\big(e^{tJ}\big)_{ij}\quad\text{o, en estado estacionario,}\quad \hat F_{ij}=\big(-J^{-1}\big)_{ij}.$$

**Dos preguntas:**

1. **Inferencia de signos:** ¿qué asignación $s\in\mathcal S$ (escenarios U, A, B o las aleatorias) hace que $\hat F(J_s)$ se parezca más a $F$ en las entradas observadas, con una métrica de comparación adecuada (por ejemplo, la concordancia de signos de las respuestas significativas)?
2. **Validación de la importancia:** ¿la importancia espectral **residual**, descontado el grado, predice qué neuronas tienen más influencia funcional medida?

## Qué representaría resolverlo

- **Si algún escenario de signos encaja claramente mejor**, tendrías un método para **restringir los signos con datos funcionales** y, con él, una respuesta mucho mejor a [i4](germinacion/nodos/i4-robustez-signos.md). Sería probablemente lo más original del proyecto.
- **Si ninguno encaja**, sería una prueba más, ahora con signos, de que el modelo lineal del conectoma químico más gap no basta, como ya sugieren Randi et al. Un resultado negativo, pero bien medido, también se puede publicar.
- No puedo anticipar cuál de las dos cosas ocurrirá.

## Estado del arte

- **Randi et al. (2023):** comparan su atlas con predicciones anatómicas y concluyen que difieren, en parte por la señalización extrasináptica. Señalan, por ejemplo, que RID señaliza a neuronas con las que no tiene conexión directa ([PDF](germinacion/recursos/randi-2023.pdf), preprint en arXiv).
- **Ripoll-Sánchez et al. (2023, *Neuron*):** conectoma de neuropéptidos, ya incluido en `cect`.
- **Datos disponibles:** el atlas está en `cect` («Functional connectome from WormNeuroAtlas») y en WormNeuroAtlas.
- No conozco ningún trabajo que use el atlas para **elegir entre asignaciones de signos** de Fenyves. Es una idea que no he podido comprobar a fondo: búscala antes de empezar.

## Por qué no entra en el plazo

Exige:

- manejar un conjunto de datos funcional con valores ausentes y cobertura parcial;
- definir bien la comparación entre modelo y datos (¿qué escala temporal?, ¿qué normalización?, ¿solo signos o también amplitudes?);
- hacer la estadística de [e10](germinacion/nodos/e10-estadistica-validacion.md), con modelos nulos que conserven grados y signos.

Son, como mínimo, varias semanas a 5 horas semanales.

## Enfoque propuesto (después de la entrega)

1. Carga el atlas con `cect` y cruza los nombres con tu lista de 282 neuronas.
2. Restringe la comparación a los pares con respuesta significativa ($q<0{,}05$) y empieza por la **concordancia de signos** (¿excita o inhibe?), que es robusta a la normalización.
3. Calcula la concordancia para cada escenario de signos y su distribución en las asignaciones aleatorias. ¿Destaca algún escenario?
4. Solo entonces, la pregunta 2 con correlación parcial frente al grado ([e10](germinacion/nodos/e10-estadistica-validacion.md)).

## Ficha

- **Tipo:** validación contra datos medidos.
- **Abierta:** sí.
- **Dificultad:** muy alta.
- **Depende de:** [i6](germinacion/nodos/i6-comparacion-biologia.md) y [e10](germinacion/nodos/e10-estadistica-validacion.md).
- **Calendario:** después de la entrega. Es la continuación natural si el proyecto te gusta y quieres llevarlo a algo publicable.

## Referencias

- Randi, F., Sharma, A. K., Dvali, S., Leifer, A. M. (2023). Neural signal propagation atlas of *Caenorhabditis elegans*. *Nature* 623, 406–414. arXiv:2208.04790 · [PDF](germinacion/recursos/randi-2023.pdf)
- OpenWorm Connectome Toolbox: *Randi et al. 2023*. https://openworm.org/ConnectomeToolbox/Randi_2023/
- Ripoll-Sánchez, L. et al. (2023). The neuropeptidergic connectome of *C. elegans*. *Neuron* 111(22), 3570–3589. https://doi.org/10.1016/j.neuron.2023.09.043
- Fenyves, B. G. et al. (2020). *PLoS Comput. Biol.* 16(12), e1007974. [PDF](germinacion/recursos/fenyves-2020.pdf)
