# Idea: un editor de módulos por tarjetas

<!--
  ¿Qué? Nota de una idea que quedó pendiente en la revisión del panel del Administrador del Sistema: que el editor
        de módulos educativos trabaje con tarjetas (bloques) en vez de un solo cuadro de texto.
  ¿Para qué? Dejar por escrito cómo funcionaría, qué riesgos tiene y qué haría necesario hacerlo, para decidirlo
             con calma y no por impulso.
  ¿Impacto? Es solo documentación. No se construye nada y NO es una decisión tomada: es una idea con su análisis.
-->

**Fecha:** 2026-11-09
**Rama:** `docs/decisiones-rediseno-panel-admin-sistema`
**Estado:** idea abierta, sin decisión.
**Relacionado:** issues #620 (el editor de hoy), #621 (esta nota), `fe/src/lib/muroLeccion.ts` y `fe/src/components/educativo/`.

## 1. Cómo funciona el editor hoy

El Administrador del Sistema escribe cada módulo en **un solo cuadro de texto**. El backend guarda un único texto (`cuerpo_texto`, hasta 10 000 caracteres) y es la pantalla la que lo parte en tarjetas cuando el Residente lo ve ("Aprende a reciclar"). La partición la hace `partirEnTarjetas` (`fe/src/lib/muroLeccion.ts`) con estas reglas:

1. Cada párrafo, separado del siguiente por una línea en blanco, es una tarjeta.
2. El título de la tarjeta es lo que va antes de los dos puntos ("Bolsa blanca: material limpio"), un texto en negrita al inicio, o un `## Título` en su propia línea.
3. Una imagen sola en su línea se pega a la tarjeta que viene justo después.
4. El primer párrafo sin título es la introducción ("De qué trata"), y el último sin título es el cierre.

En la rama del issue #620 se agregó ayuda para no tener que conocer esas reglas: el botón "Tarjeta" (agrega un párrafo con su título listo para escribir), un recuadro en vivo "Así se dividirá tu texto en el muro" y una vista previa fiel al Residente. Esa ayuda es la parte que **sí** se hizo.

## 2. La idea

Cambiar el cuadro de texto por una **lista de tarjetas**: una Introducción, tarjetas numeradas y un Cierre, cada una con su campo de título, su texto y, si quiere, su imagen. Botones para agregar, quitar y reordenar tarjetas. Ya no habría reglas que recordar: lo que se ve en pantalla son las tarjetas.

Hay dos maneras de hacerlo, con costos muy distintos:

| | **B1. Solo la pantalla** | **B2. Guardar la estructura** |
| --- | --- | --- |
| **Qué cambia** | El editor trabaja con tarjetas, pero al guardar las junta en el **mismo texto de hoy** (con la misma regla "Título: texto"). | El backend guarda las tarjetas como datos (lista de tarjetas) y el muro del Residente las lee tal cual. |
| **Backend y base de datos** | No cambian. | Cambian: columna o tabla nueva y una migración que convierta los módulos existentes. |
| **Muro del Residente** | No cambia. | Cambia: deja de partir texto. |
| **Riesgo** | Medio: hay que convertir textos viejos a tarjetas y volver (sección 4). | Alto: toca datos guardados y tres capas a la vez. |

**Si se hace, la recomendación es B1**: da la mayor parte del beneficio sin tocar el backend ni lo que ya está guardado.

## 3. Alcance (B1)

- **Incluye:** lista de tarjetas en el editor con título, texto e imagen opcional; agregar, quitar y reordenar; la misma vista previa y el mismo recuadro en vivo; guardar en el formato de texto de siempre.
- **No incluye:** cambiar el backend, la base de datos o la vista del Residente; agregar una librería de edición; tipos nuevos de tarjeta (preguntas, video por tarjeta).

## 4. Riesgos de convertir los textos viejos

La parte difícil no es dibujar la lista, es **abrir un módulo ya escrito y partirlo en tarjetas sin cambiarlo**:

- **La partición actual usa una regla por heurística.** Una etiqueta corta antes de los dos puntos (de 3 a 40 caracteres, sin puntos ni signos de pregunta o exclamación) se toma como título. Un texto antiguo podría partirse distinto en el editor de lo que ve hoy el Residente.
- **Una tarjeta puede tener Markdown adentro:** listas con guiones, negritas, enlaces. Si el campo de texto de la tarjeta no lo admite, se pierde al guardar.
- **Guardar puede reescribir el texto sin avisar.** Al volver a juntar las tarjetas, espacios, saltos de línea o el estilo del título (`## Título` contra `Título:`) podrían cambiar aunque nadie tocó nada.
- **Las imágenes viajan como un enlace dentro del texto**, pegadas a la tarjeta de abajo: hay que conservar ese orden exacto.

Cómo se reduciría el riesgo:

- Un módulo viejo se abre primero en el **modo texto de hoy**, y la vista de tarjetas solo se ofrece si partir y volver a juntar da el mismo texto.
- Una prueba automática que tome los 6 módulos de `seed.py` y los de `seed_demo.py`, los parta, los junte y compare el resultado con el original.
- No tocar los módulos ya publicados hasta que la prueba pase con todos.

## 5. Qué lo haría necesario

Hoy no es urgente. Conviene hacerlo si pasa alguna de estas cosas:

1. **Alguien que nunca usó el editor no logra armar una lección con tarjetas en pocos minutos** con el botón "Tarjeta", el recuadro en vivo y la vista previa. Esa es la prueba que dejó el issue #620.
2. **Quienes redactan los módulos nuevos** (la tarjeta #519) **siguen equivocándose con el título de las tarjetas** pese a la ayuda.
3. **Hace falta reordenar tarjetas** con frecuencia: hoy se hace cortando y pegando texto.
4. **Aparecen tipos nuevos de tarjeta** (una pregunta, un video por tarjeta) que no caben en "Título: texto".

## 6. Escalabilidad

- **Cantidad de módulos:** el catálogo es pequeño (6 hoy; entre 6 y 20 en el uso previsto). Un editor por tarjetas no tiene problema de volumen.
- **Tamaño de un módulo:** hasta 10 000 caracteres. La partición se recalcula en cada tecla hoy (recuadro en vivo y vista previa) sin problema; con tarjetas sería igual o más liviano, porque ya vendrían partidas.
- **Mantenimiento:** una librería de edición agregaría una dependencia grande para un catálogo pequeño. La regla del proyecto (issue #620) es **no agregar una librería de edición**: se haría con los componentes que ya existen.
- **Idiomas:** el contenido educativo se escribe en español y no se traduce; este editor no cambia eso.

## 7. Propuesta

1. **No hacerlo ahora.** Primero, que alguien que nunca usó el editor lo pruebe con la ayuda que ya tiene (sección 5, punto 1).
2. Si esa prueba o la redacción de módulos nuevos (#519) muestra que la regla del título sigue confundiendo, **abrir un issue aparte** para el editor por tarjetas en la variante B1, con la prueba de ida y vuelta de la sección 4 como criterio de aceptación.
3. Descartar la variante B2 mientras el catálogo sea pequeño y el texto siga guardándose de una sola pieza.

## 8. Para conversar con el grupo

- ¿La ayuda del issue #620 (botón "Tarjeta", recuadro y vista previa) es suficiente, o hace falta probarla antes con alguien nuevo?
- ¿Quién escribirá los módulos nuevos, una persona técnica o alguien del equipo de contenido? Cambia cuánto pesa el criterio 2 de la sección 5.

## 9. Límites

- No se probó ninguna variante: es un análisis sobre el código actual.
- No se midió cuántos de los textos reales de módulos se podrían convertir sin cambios; hace falta la prueba de la sección 4.
- No se estimaron horas: depende de la variante y de cuántos tipos de tarjeta se quieran.
