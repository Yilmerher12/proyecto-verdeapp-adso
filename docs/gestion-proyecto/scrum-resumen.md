# Cómo trabaja VerdeApp con Scrum

<!--
  ¿Qué? Resumen de cómo el equipo aplica Scrum: backlog, sprints, puntuación de las historias,
        asignación de tareas e informes semanales, con el enlace al documento o al lugar donde
        está la evidencia de cada parte.
  ¿Para qué? Es el punto de entrada del criterio 2 de la revisión (informes de Scrum como pilar
            de la metodología ágil). Los detalles viven en los documentos que enlaza.
  ¿Impacto? No define reglas nuevas: resume las que ya están en `prioridad-y-tamano.md`,
            `informes-scrum/` y `docs/matriz-rotacion.md`. Si una de esas reglas cambia, se
            corrige aquí en la misma rama.
-->

| Campo | Valor |
|---|---|
| **Equipo** | 4 integrantes |
| **Fecha del documento** | 20 de noviembre de 2026 |
| **Documentos hermanos** | [Prioridad y tamaño](prioridad-y-tamano.md) · [Informes semanales](informes-scrum/README.md) · [Matriz de rotación del bootcamp](../matriz-rotacion.md) |

## 1. De Scrum a VerdeApp

| Elemento de Scrum | Cómo se aplica en VerdeApp | Dónde se ve |
|---|---|---|
| **Backlog** | Los issues de GitHub y el tablero "VerdeApp - Tablero de desarrollo". Cada tarjeta es un issue con plantilla. | Pestaña *Issues* del repositorio y el tablero |
| **Historias de usuario** | 53 historias (HU-001 a HU-053), cada una en su archivo con su prioridad y sus criterios de aceptación. | `docs/requisitos/HUs/` |
| **Sprint** | Una semana de trabajo. Cada integrante recibe un issue por semana. | `informes-scrum/` (un informe por semana) |
| **Scrum Master** | Rota cada semana entre los cuatro integrantes. | Campo "Scrum Master" de cada informe |
| **Puntuación de las historias** | Importancia, complejidad, prioridad (Must, Should, Could) y tamaño (XS a XL, en horas). | [`prioridad-y-tamano.md`](prioridad-y-tamano.md) |
| **Tareas asignadas** | El Scrum Master asigna un issue a cada integrante al empezar la semana. | Campo *Assignees* de cada issue |
| **Cierre del sprint** | Cada integrante deja un comentario de cierre en su issue. Con esos comentarios se escribe el informe. | [`informes-scrum/_cierre-de-issue.md`](informes-scrum/_cierre-de-issue.md) |

## 2. Backlog

- **Dónde vive:** en GitHub. Cada tarjeta es un issue creado con la plantilla de `.github/ISSUE_TEMPLATE/`, en español y con contexto, alcance, criterios de aceptación, archivos relacionados, cómo probarlo, importancia, complejidad y tamaño.
- **Tipos de tarjeta:** se distinguen con las etiquetas `funcionalidad`, `error`, `documentación` e `investigación`.
- **Estado al 20 de noviembre de 2026:** 263 issues en total, 244 cerrados y 19 abiertos.
- **Tablero:** "VerdeApp - Tablero de desarrollo", con los campos `Priority` (P0, P1, P2) y `Size` (XS a XL). Los cuatro integrantes pueden editarlo, y el acuerdo es que cada quien mueve solo sus tarjetas.

## 3. Historias de usuario puntuadas

La puntuación se hizo en dos momentos:

1. **Planificación inicial.** Las historias del plan original se puntuaron y se repartieron en 4 sprints: autenticación y perfil, contenido y directorios, lógica operativa (alertas) y auditoría y cierre. Está en [`calculo-horas.md`](calculo-horas.md) (puntaje, capacidad y velocidad de cada historia) y en [`matriz-prioridad.md`](matriz-prioridad.md) (importancia, complejidad y prioridad). Ambos se conservan como referencia histórica.
2. **Método actual por tarjeta.** Cada issue lleva importancia, complejidad, prioridad y tamaño según [`prioridad-y-tamano.md`](prioridad-y-tamano.md):

| Prioridad | Campo del tablero | Se decide por |
|---|---|---|
| Must | P0 | Importancia alta |
| Should | P1 | Importancia media |
| Could | P2 | Importancia baja |

| Tamaño | Horas |
|---|---|
| XS | hasta 2 |
| S | 3 a 5 |
| M | 6 a 10 |
| L | 11 a 20 |
| XL | más de 20 |

La capacidad mínima del equipo es de 2 horas por día de lunes a viernes: 10 horas por semana por integrante. Una tarjeta L o XL puede pasar de una semana y se traspasa con la regla de cierre. Las estimaciones se hacen a ojo y, después de cada semana, se comparan con las horas que de verdad se usaron para corregir la escala.

## 4. Tareas asignadas y traspaso

- Al empezar la semana, el Scrum Master asigna un issue a cada integrante.
- Si alguien no termina, deja el comentario de cierre en su issue y hace `git push` de su rama. El Scrum Master de la semana siguiente decide con el grupo quién continúa la tarjeta y la reasigna en el tablero; quien la continúa sigue en la misma rama.
- Una tarjeta que espera algo de otra persona se anota como **bloqueada** en el informe, con el motivo y qué la desbloquea.
- En paralelo corre la rotación de capas del bootcamp de testing (Front, API, BD y E2E), que no reemplaza al issue de la semana. Está en [`matriz-rotacion.md`](../matriz-rotacion.md).

## 5. Informes semanales

Cada informe sigue la plantilla [`_plantilla.md`](informes-scrum/_plantilla.md): resumen, trabajo por integrante (tarjeta, rama y PR, resultado, exploración, desarrollo, testing, archivos, dificultades y cómo se sintió), tarjetas bloqueadas y plan de la semana siguiente. Los datos de ramas y PR salen del repositorio; las dificultades y el ánimo, de lo que cada integrante le comenta al Scrum Master.

| Semana | Scrum Master | Informe |
|---|---|---|
| 1 | Yilmer Hernández Camargo | [`semana-01_yilmer.md`](informes-scrum/semana-01_yilmer.md) |
| 2 | Sin Scrum Master (la feria hizo olvidar la rotación) | [`semana-02_sin-scrum-master.md`](informes-scrum/semana-02_sin-scrum-master.md), escrito después con el historial de GitHub |
| 3 | Yordan Castro Guerrero | [`semana-03_yordan.md`](informes-scrum/semana-03_yordan.md) |
