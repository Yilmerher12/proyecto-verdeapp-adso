# Política de retención de las fotos de evidencia de las auditorías

<!--
  ¿Qué? Decisión escrita sobre cuánto tiempo se guardan las fotos de evidencia que sube el Reciclador en
        una auditoría, qué se borra y qué se conserva (issue #587).
  ¿Para qué? Las fotos eran lo único que crecía sin límite: cada auditoría guarda hasta 3 fotos de máximo 5 MB
             y nada las borraba. Además son fotos reales de los cuartos de basuras (SHUT) de los conjuntos.
  ¿Impacto? Fija el plazo en un solo lugar (`PLAZO_RETENCION` en `be/app/limpiar_evidencias.py`) y explica por
            qué se borra la foto y no la auditoría.
-->

**Fecha:** 2026-11-03
**Rama:** `feat/retencion-fotos-evidencia-auditorias`
**Estado:** **propuesta, pendiente de aprobación** (ver "Aprobación").
**Relacionado:** `docs/gestion-proyecto/investigacion-graficas-auditorias.md` (tarjeta G7), RQF-009.

## 1. El problema

1. Cuando un Reciclador audita un conjunto sube de 1 a 3 fotos de evidencia. Se guardan como archivos en `be/app/uploads/evidencias-auditoria/` y la base de datos guarda la ruta de cada una en `auditorias_conjunto` (`ruta_evidencia`, `ruta_evidencia_2` y `ruta_evidencia_3`).
2. Hasta ahora nada las borraba. Una auditoría puede ocupar hasta 15 MB (3 fotos de 5 MB) y el espacio en disco crece con cada una.
3. Son fotos de espacios de uso de los residentes. Guardarlas para siempre no hace falta para nada de lo que muestra la aplicación, y puede chocar con el principio de temporalidad de la Ley 1581 de 2012 (protección de datos personales: los datos se conservan solo el tiempo necesario para su finalidad). **No se verificó con un abogado ni con el profesor**; ver "Aprobación".

## 2. La decisión propuesta

| Tema | Decisión |
| --- | --- |
| Plazo | **6 meses** (180 días), contados desde la fecha de la auditoría. |
| Qué se borra | Solo las **fotos** (los archivos del disco). Las tres rutas de la auditoría quedan vacías (`NULL`). |
| Qué se conserva | La **auditoría completa**: nivel (Bueno, Regular o Malo), tema, observaciones, fecha, conjunto y reciclador. |
| Cómo se borra | Con un comando manual, `app/limpiar_evidencias.py`, que nadie corre solo. Con `--simular` solo lista lo que borraría. |
| Qué ve la persona | Al abrir una auditoría sin fotos: "La foto ya no está disponible. Las fotos de evidencia se guardan 6 meses. La calificación y su detalle se conservan." |

## 3. Por qué se borra la foto y no la auditoría

- El historial de auditorías, la gráfica de desempeño semanal, el ranking de temas y las recomendaciones de contenido educativo salen de nivel, tema y fecha (RQF-009, RQF-013 y HU-052/053). Ninguno usa la foto.
- Una fila de auditoría es diminuta; lo que pesa son las fotos (ver `investigacion-graficas-auditorias.md`).
- Borrar la auditoría completa haría perder el historial del conjunto sin ganar espacio de verdad.

## 4. Cómo funciona

1. `uv run python -m app.limpiar_evidencias --simular` lista las fotos de auditorías con más de 180 días y no cambia nada.
2. `uv run python -m app.limpiar_evidencias` borra esos archivos y deja las rutas en `NULL`.
3. Una misma foto puede estar en más de una auditoría (el seed de demostración reutiliza archivos). Un archivo solo se borra del disco si **ninguna auditoría que se conserva** lo sigue usando.
4. Si un archivo ya no está en el disco, no pasa nada: igual se limpian las rutas.
5. Correr el comando dos veces no hace nada la segunda vez.

La foto sigue siendo **obligatoria al crear** una auditoría: lo exige el servicio. La columna `ruta_evidencia` pasó a aceptar `NULL` (migración `b1c2d3e4f5a6`) solo para poder dejarla vacía después.

## 5. Límites y lo que falta

- **El comando trabaja sobre la carpeta de la máquina donde se ejecuta.** Hoy las fotos viven en el mismo servidor que el backend (en Docker, en el volumen `be_uploads`). Si cuando la aplicación salga a producción las fotos se guardan en otro servidor o en un servicio de archivos en la nube, hay que cambiar **una sola función**, `borrar_archivo`, en `be/app/limpiar_evidencias.py`. El plazo, la consulta a la base de datos y la pantalla no cambian. Todavía no hay una decisión escrita sobre dónde vivirán las fotos en producción.
- **Programarlo en producción no se hizo.** El comando es manual. Para que corra solo hay que agendarlo en el servidor (por ejemplo, una tarea programada una vez al mes que corra `python -m app.limpiar_evidencias` dentro del contenedor del backend). Esto va con la tarjeta #317, igual que `limpiar_adjuntos` y `purgar_tokens`.
- **Borrar no se deshace.** Primero siempre `--simular`. No correr el comando sin `--simular` en una base de datos con datos que importen.
- **No hay copia de las fotos borradas.** Si hace falta conservar alguna como evidencia, debe copiarse antes.
- **La migración no se puede revertir** una vez que se borraron fotos: volver a poner la columna como obligatoria falla si ya hay auditorías sin foto.

## 6. Aprobación

El plazo de 6 meses es la propuesta inicial del issue #587. Debe aprobarlo el grupo y el profesor antes de darlo por definitivo.

| Quién | Aprobó el plazo | Fecha | Observación |
| --- | --- | --- | --- |
| Grupo VerdeApp | pendiente | | |
| Profesor | pendiente | | |

Si ellos eligen otro plazo, se cambia `PLAZO_RETENCION` en `be/app/limpiar_evidencias.py` y el texto "6 meses" de los textos de la pantalla (`auditoriaResultado.evidenciaNoDisponibleAyuda` y `adminContenidoEducativo.ratingPanel.evidenceGone`, en español e inglés), y se actualiza este documento.
