# HU-025 — Sistema recomienda contenido según la auditoría

<!--
  ¿Qué? Historia de usuario para que el sistema recomiende contenido educativo automáticamente.
  ¿Para qué? Ayudar a los residentes a mejorar justo en las categorías donde fallaron.
  ¿Impacto? Cierra el ciclo entre auditoría (HU-010) y educación (HU-005).
-->

---

## Identificación

| Campo             | Valor                                                |
| ------------------ | --------------------------------------------------------|
| **ID**             | HU-025                                                    |
| **Título**         | Sistema recomienda contenido según la auditoría              |
| **Módulo**         | Contenido Educativo / Auditoría                             |
| **Prioridad**      | Media                                                        |
| **Estado**         | Por implementar                                              |
| **RF asociados**   | RQF-013                                                     |

---

## Historia

**Como** sistema,
**quiero** detectar automáticamente qué categorías de una auditoría recibieron calificación negativa,
**para** recomendar a los residentes del conjunto el contenido educativo relacionado con esas categorías.

---

## Criterios de aceptación

### CA-025.1 — Detección de categorías negativas

- **Dado que** se guarda una calificación de auditoría con al menos una categoría negativa,
- **cuando** el sistema procesa el guardado,
- **entonces** debe identificar automáticamente cuáles categorías (Separación, Preparación, Presentación o Contaminación) fallaron.

### CA-025.2 — Búsqueda de módulos relacionados

- **Dado que** se identificaron categorías negativas,
- **cuando** el sistema busca contenido relacionado,
- **entonces** debe buscar módulos educativos etiquetados con esas mismas categorías.

### CA-025.3 — Sin módulo disponible

- **Dado que** una categoría falló pero no hay ningún módulo educativo con esa etiqueta,
- **cuando** el sistema genera las recomendaciones,
- **entonces** no debe crear una recomendación vacía para esa categoría.

### CA-025.4 — Expiración de la recomendación

- **Dado que** una recomendación lleva activa 30 días, o se publica una nueva auditoría del mismo conjunto,
- **cuando** se cumple cualquiera de esas condiciones,
- **entonces** la recomendación anterior debe dejar de mostrarse.
