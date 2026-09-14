# HU-025 — Sistema recomienda contenido según la auditoría

<!--
  ¿Qué? Historia de usuario para que el sistema recomiende contenido educativo automáticamente.
  ¿Para qué? Ayudar a los residentes a mejorar justo en el tema donde la auditoría salió mal.
  ¿Impacto? Cierra el ciclo entre auditoría (RQF-009) y educación (RQF-004).
-->

---

## Identificación

| Campo             | Valor                                                |
| ------------------ | --------------------------------------------------------|
| **ID**             | HU-025                                                    |
| **Título**         | Sistema recomienda contenido según la auditoría              |
| **Módulo**         | Contenido Educativo / Auditoría                             |
| **Prioridad**      | Media                                                        |
| **Estado**         | Implementado                                                 |
| **RF asociados**   | RQF-013                                                     |

---

## Historia

**Como** sistema,
**quiero** detectar automáticamente cuándo una auditoría se calificó como Regular o Malo,
**para** notificar a los Residentes del conjunto el contenido educativo relacionado con ese tema.

---

## Criterios de aceptación

### CA-025.1 — Detección de nivel negativo

- **Dado que** se guarda una auditoría con `nivel_desempeno` Regular o Malo,
- **cuando** el sistema procesa el guardado,
- **entonces** debe crear una notificación de tipo `CONTENIDO_RECOMENDADO` para los Residentes del conjunto, apuntando a esa auditoría.

### CA-025.2 — Nivel Bueno no genera recomendación

- **Dado que** una auditoría se calificó como Bueno,
- **cuando** el sistema procesa el guardado,
- **entonces** no debe crear ninguna notificación de contenido recomendado.

### CA-025.3 — El contenido relacionado se identifica por coincidencia directa

- **Dado que** se calificó un tema de auditoría (ej. "Separación en la fuente y código de colores"),
- **cuando** el Residente abre la recomendación,
- **entonces** el sistema debe llevarlo al contenido educativo cuya categoría coincide exactamente con ese tema — sin necesitar ningún algoritmo de clasificación.

### CA-025.4 — El Administrador de Conjunto no recibe esta notificación

- **Dado que** se genera una recomendación de contenido para un conjunto,
- **cuando** el sistema decide a quién notificar,
- **entonces** solo debe avisar a los Residentes de ese conjunto, nunca al Administrador de Conjunto.
