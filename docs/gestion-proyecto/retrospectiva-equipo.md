# Retrospectiva y reparto del trabajo en equipo

<!--
  ¿Qué? Cómo se organizó y se repartió el trabajo entre los cuatro integrantes, con las cifras
        reales del tablero y de GitHub, qué funcionó, qué no y qué acuerdos se proponen.
  ¿Para qué? Es la evidencia del criterio 13 de la revisión (feedback de equipo, trabajo
            dividido y asignación de tareas). No agrega hechos nuevos: ordena lo que ya está
            en los informes semanales y en el tablero.
  ¿Impacto? Lo que dice cada integrante sobre sus dificultades es lo que le comentó al Scrum
            Master (ver los informes semanales); no son textos escritos por ellos. Las cifras
            salen de `gh` el 21 de noviembre de 2026 y cambian con cada tarjeta.
-->

| Campo | Valor |
|---|---|
| **Fecha** | 21 de noviembre de 2026 |
| **Equipo** | Yilmer Hernández Camargo (@Yilmerher12), Yordan Castro Guerrero (@yordancastrog7-pixel), Juan Carlos Barajas (@Juanbarajas90) y José Guerrero (@josperaes-dotcom) |
| **Documentos hermanos** | [Cómo trabaja VerdeApp con Scrum](scrum-resumen.md) · [Informes semanales](informes-scrum/README.md) · [Prioridad y tamaño](prioridad-y-tamano.md) · [Matriz de rotación del bootcamp](../matriz-rotacion.md) |

## 1. Cómo se organizó el trabajo

- **Scrum Master rotativo.** Cada semana uno de los cuatro hace de Scrum Master: asigna un issue a cada integrante, sigue el avance y escribe el informe semanal.
- **Una tarjeta por persona y semana**, medida con importancia, complejidad, prioridad y tamaño. La capacidad mínima es de 2 horas por día, o sea 10 horas por semana por integrante ([método](prioridad-y-tamano.md)).
- **Tablero** "VerdeApp - Tablero de desarrollo". Los cuatro pueden editarlo, y el acuerdo es que cada quien mueve solo sus tarjetas.
- **Traspaso.** Quien no termina deja un comentario de cierre en su issue y sube su rama; el Scrum Master de la semana siguiente decide con el grupo quién continúa la tarjeta.
- **Bootcamp de testing en paralelo.** Cada semana cada integrante prueba una capa distinta (Front, API, BD o E2E), y quien revisa el PR trabajó en otra capa.
- **Informes semanales** con lo que hizo cada uno, sus bloqueos y cómo se sintió ([semana 1](informes-scrum/semana-01_yilmer.md), [semana 2](informes-scrum/semana-02_sin-scrum-master.md) y [semana 3](informes-scrum/semana-03_yordan.md)).

## 2. Cómo se repartió el trabajo

### 2.1 Tarjetas

La asignación de un issue por persona empezó el 12 de octubre de 2026. Antes de esa fecha, los 165 issues del proyecto se crearon sin responsable. Desde entonces:

| Integrante | Tarjetas asignadas | Cerradas |
|---|---|---|
| Yilmer Hernández Camargo | 72 | 67 |
| Yordan Castro Guerrero | 15 | 12 |
| Juan Carlos Barajas | 6 | 3 |
| José Guerrero | 3 | 1 |

### 2.2 Pull Requests fusionados (todo el proyecto)

| Quién | PR fusionados |
|---|---|
| Yilmer Hernández Camargo | 341 |
| Yordan Castro Guerrero | 24 |
| Juan Carlos Barajas | 9 |
| José Guerrero | 0 |
| Dependabot (actualizaciones automáticas) | 20 |

### 2.3 Bootcamp de testing: una tarjeta por persona y semana

En las semanas 3, 4 y 5 las tarjetas del bootcamp se repartieron por igual: cada integrante recibió una por semana.

| Semana | Yilmer | Yordan | Juan Carlos | José |
|---|---|---|---|---|
| 3 | #611 | #610 | #612 | #613 |
| 4 | #654 | #655 | #656 | #657 |
| 5 | #659 | #660 | #661 | #662 |

En la semana 3, dos tarjetas se reasignaron y las hicieron otros: la de Juan Carlos (#612) la hizo Yilmer (PR #638) y la de José (#613) la hizo Yordan (PR #631 y #639). Las de las semanas 4 y 5 siguen abiertas el día de este documento.

### 2.4 Lo que dicen las cifras

El trabajo **no se repartió por igual**: la mayoría de las tarjetas y de los PR son de una sola persona. Lo que ayuda a leerlo:

- La asignación por persona empezó tarde, a mitad del trimestre.
- Las tarjetas del bootcamp sí se repartieron por igual, pero algunas las terminó otra persona.
- El número de tarjetas y de commits no mide el esfuerzo de cada uno: las tarjetas varían mucho de tamaño, y lo que cada quien dice de sus dificultades está en la sección 3.

## 3. Lo que comentó cada integrante

Según lo que cada uno le comentó al Scrum Master, y que consta en los informes semanales:

- **Yilmer:** se sintió agobiado por ser responsable de organizar el repositorio, aclarar todo a sus compañeros y, además, asumir la tarjeta de otro compañero en la semana 3; eso le quitó tiempo de su propio aprendizaje.
- **Yordan:** al principio no tenía clara la forma de trabajo nueva (rol de Scrum Master, asignaciones y discusiones dentro del repositorio) y sentía cansancio. En la semana 3 asumió una tarjeta que no era suya, lo que le dio más carga, y se sintió bien con lo que logró comprender y explicar al grupo.
- **Juan Carlos:** tenía mucho trabajo y poco tiempo, no tenía un equipo adecuado para las actividades y no entendía qué le tocaba hacer, por lo que se sentía perdido. En la semana 3, el backend no le corría en su equipo. Aun así participa en las discusiones del proyecto y aporta ideas.
- **José:** no tiene un equipo adecuado y su trabajo le deja poco tiempo; tampoco tenía claro qué le tocaba hacer. Participa y opina en las reuniones, pero no ha podido involucrarse en lo práctico.

## 4. Qué funcionó

- **El método de prioridad y tamaño y la tarjeta semanal por persona** dieron un lenguaje común para repartir el trabajo.
- **Los informes semanales sacaron a la luz los bloqueos.** El de la semana 3 mostró a tiempo que dos tarjetas no avanzaban y permitió reasignarlas para cerrar la semana con las pruebas hechas y los umbrales de cobertura más altos.
- **El bootcamp se repartió por igual** y la regla de que otra persona revise el PR se cumplió: en la semana 3, Yordan corrió y rompió a propósito el código de los PR de Yilmer para comprobar que las pruebas detectaban los errores.
- **Todos participan en las discusiones.** Quienes no han podido tomar tarjetas prácticas aportan ideas y opinan en las reuniones.

## 5. Qué no funcionó

- **La semana 2 se quedó sin Scrum Master.** Por la feria, el equipo olvidó la rotación y esa semana no hubo asignación, seguimiento ni informe en su momento (se reconstruyó después con el historial de GitHub).
- **El reparto fue desigual.** Pocas personas concentraron casi todas las tarjetas.
- **Las tarjetas se reasignaron tarde**, al final de la semana, cuando ya no había tiempo de que la nueva persona las trabajara con calma.
- **No se avisaba a tiempo cuando alguien no podía con su tarjeta.** El informe de la semana 3 lo dejó como pendiente.
- **Acceso al entorno.** A quien no le corre el backend o no tiene un equipo adecuado, no puede probar nada, y eso se descubrió recién al cerrar la semana.
- **Pocas revisiones registradas en GitHub:** solo 7 de los 394 PR fusionados tienen una revisión registrada, aunque hubo revisiones hechas corriendo el código.

## 6. Acuerdos propuestos

Los dos primeros ya estaban en los informes de las semanas 3 y 2; los otros dos se proponen en este documento. El equipo los confirma al revisarlo.

1. **Avisar a tiempo.** Quien no pueda con su tarjeta lo dice el segundo día de la semana, no al cierre, para que se reasigne con tiempo.
2. **Anotar la rotación del Scrum Master en un lugar visible**, para que una semana especial (como la feria) no la haga olvidar.
3. **Comprobar el entorno el primer día.** Cada integrante verifica que el backend y las pruebas le corren; si no, se resuelve esa semana con ayuda de otro y no se descubre al final.
4. **Registrar la revisión en el PR** (aprobar o comentar en GitHub), no solo hacerla por fuera.

## 7. Cómo repetir las cifras

Desde la raíz del repositorio, con GitHub CLI (`gh`):

```bash
gh issue list --state all --limit 1000 --json assignees,createdAt,state
gh pr list --state merged --limit 1000 --json author
```
