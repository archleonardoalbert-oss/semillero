# Llevar modelos a producción (MLOps ligero)

## Por qué está en el curso

Un modelo en un cuaderno no le sirve a nadie, y un portafolio con demos desplegadas vale mucho más que uno con cuadernos. Tienes una ventaja real: sabes Django y has construido un ERP completo (Economy). En el diagnóstico te pusiste un 1 («Django en local») y no respondiste el ejercicio de cargar un modelo. La respuesta corta es esta:

- **dónde cargarlo:** **una vez por proceso**, al arrancar (a nivel de módulo o en `AppConfig.ready()`), o en un servicio aparte;
- **qué no hacer:** cargarlo dentro de la vista, porque añadiría 3 s a **cada** petición y multiplicaría el uso de memoria con peticiones concurrentes.

Esta asignatura es **ligera a propósito**. No pretende formarte como ingeniero de plataformas, sino darte lo mínimo para que tus tres proyectos sean **reproducibles, desplegables y mantenibles**. Además, tiene en cuenta un contexto que casi ningún curso considera: desplegar **sin conexión fiable**, en el ordenador de una mipyme, con CPU.

## Prerrequisitos

- ML I completo.
- Python científico, conferencia 8 (estructura de proyecto y pruebas).
- Django: ya lo sabes.

## Objetivos de la asignatura

- **Estructurar** un proyecto de ML reproducible: configuración, semillas, dependencias fijadas y datos versionados.
- **Registrar** experimentos (MLflow) y **comparar** ejecuciones.
- **Servir** un modelo desde Django o FastAPI cargándolo una sola vez, y **medir** la latencia.
- **Empaquetar** el servicio en Docker, con o sin GPU.
- **Escribir** pruebas para datos, modelo y API, y **automatizarlas** con GitHub Actions.
- **Monitorizar** la deriva de datos y de predicciones, y **definir** cuándo reentrenar.
- **Publicar** demos y tarjetas de modelo que sirvan de portafolio.

## Programa por conferencias

1. **Del cuaderno al paquete.** Estructura, configuración con archivos, semillas, `requirements` fijados y un comando único para entrenar y evaluar.
2. **Experimentos y datos.** MLflow en local (parámetros, métricas y artefactos); DVC para versionar datos y modelos sin subirlos a GitHub.
3. **Servir un modelo.**
   - Carga única en `AppConfig.ready()` o en un servicio separado con FastAPI.
   - Entrada validada y por lotes; latencia p50 y p95.
   - Cuándo usar una cola de tareas.
4. **Docker.** Imágenes reproducibles, capas y tamaño, GPU con el NVIDIA Container Toolkit; imágenes de solo CPU para desplegar en una tienda.
5. **Pruebas e integración continua.** Pruebas de datos (esquema, rangos), de modelo (rendimiento mínimo en un conjunto fijo, invariancias) y de API; GitHub Actions.
6. **Monitorización.** Registros, deriva de las variables (prueba de Kolmogorov-Smirnov, PSI) y de las predicciones, métricas con retraso cuando llega la verdad, y política de reentrenamiento.
7. **Demos y documentación.** Gradio, Hugging Face Spaces (accesible desde Cuba según tu diagnóstico), tarjetas de modelo (datos, métricas con intervalos, límites, usos no previstos) y el README como carta de presentación.
8. **Despliegue con restricciones.** Sin conexión permanente, solo CPU; exportar a ONNX y cuantizar; actualizar modelos por lotes; desplegar en el servidor local de una mipyme y qué hacer cuando se va la corriente.

## Clases prácticas

- **P1 (conf. 1-3):** el modelo de ML II servido desde Django, con una prueba de carga sencilla y la medida de la latencia.
- **P2 (conf. 4-5):** el mismo servicio en Docker con integración continua: cada *push* ejecuta las pruebas.
- **P3 (conf. 6-8):** es parte del Proyecto 2 (demanda desplegada): monitorización de la deriva y empaquetado para funcionar sin conexión.

## Demostraciones para valientes

- Simula una deriva gradual en los datos de entrada y compara qué tan pronto la detectan el PSI y la prueba KS en función del tamaño de la ventana.

## Evaluación

- **Revisión de las prácticas (100 %):** un repositorio que cualquiera pueda clonar y ejecutar con dos comandos (`make train` y `make serve`, o equivalentes), con pruebas en verde.

## Bibliografía principal

- **Google, *Curso intensivo de aprendizaje automático*** (en español), módulo «AA en el mundo real» (sistemas de producción, AutoML, equidad).
- **Documentación de Django** (en español en docs.djangoproject.com/es/) para `AppConfig.ready()` y despliegue.
- **Amat Rodrigo, J.**, cienciadedatos.net: los tutoriales de skforecast incluyen cómo guardar y cargar pronosticadores.

> **Aviso:** MLflow, DVC, Docker y GitHub Actions solo tienen documentación en inglés. El material de las conferencias será autosuficiente en español.

## Referencias

- Google. *Curso intensivo de aprendizaje automático*, módulo «AA en el mundo real». https://developers.google.com/machine-learning/crash-course?hl=es-419
- Documentación de Django (en español). https://docs.djangoproject.com/es/
- Sculley, D. et al. (2015). Hidden technical debt in machine learning systems. *NeurIPS*.
- Mitchell, M. et al. (2019). Model cards for model reporting. *FAT\**.
- Breck, E. et al. (2017). The ML test score: a rubric for ML production readiness and technical debt reduction. *IEEE Big Data*.
