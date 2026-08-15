# HU-010 — Reciclador califica la gestión de residuos (semáforo)

<!--
  ¿Qué? Historia de usuario para que el reciclador califique cómo un conjunto separó sus residuos.
  ¿Para qué? Dar retroalimentación que ayude al conjunto a mejorar su separación.
  ¿Impacto? Genera un historial de auditoría cualitativa por conjunto.
-->

---

## Identificación

| Campo             | Valor                                              |
| ------------------ | ---------------------------------------------------- |
| **ID**             | HU-010                                                |
| **Título**         | Reciclador califica la gestión de residuos (semáforo)  |
| **Módulo**         | Auditoría / Calificaciones                             |
| **Prioridad**      | Baja (opcional)                                         |
| **Estado**         | En discusión                                            |
| **RF asociados**   | RQF-009                                               |

---

## Historia

**Como** reciclador,
**quiero** calificar con un color (rojo, amarillo o verde) qué tan bien separó sus residuos un conjunto,
**para** fomentar la mejora continua en la separación desde la fuente.

---

## Criterios de aceptación

### CA-010.1 — Elegir calificación

- **Dado que** terminé de recoger en un conjunto,
- **cuando** entro al panel de auditoría,
- **entonces** debo poder elegir una calificación entre Rojo (malo), Amarillo (regular) o Verde (excelente) para ese conjunto.

### CA-010.2 — Observación opcional

- **Dado que** estoy calificando un conjunto,
- **cuando** completo el formulario,
- **entonces** debo poder agregar una observación de texto opcional (máximo 255 caracteres).

### CA-010.3 — Un registro por conjunto cada 24 horas

- **Dado que** ya califiqué un conjunto en las últimas 24 horas,
- **cuando** intento calificarlo de nuevo,
- **entonces** el sistema no debe permitir un segundo registro tan seguido.

### CA-010.4 — Solo el reciclador puede calificar

- **Dado que** soy residente,
- **cuando** intento acceder a la acción de calificar,
- **entonces** el sistema debe impedírmelo — esta acción es exclusiva del rol reciclador.
