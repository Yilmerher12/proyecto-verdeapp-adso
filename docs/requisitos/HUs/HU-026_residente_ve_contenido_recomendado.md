# HU-026 — Residente ve el contenido educativo recomendado

<!--
  ¿Qué? Historia de usuario para que el residente reciba y abra la recomendación de contenido de su conjunto.
  ¿Para qué? Que sepa exactamente qué leer para mejorar en lo que el conjunto falló, con el mínimo de clics posible.
  ¿Impacto? Convierte una auditoría con calificación negativa en una oportunidad de aprendizaje concreta.
-->

---

## Identificación

| Campo             | Valor                                              |
| ------------------ | ------------------------------------------------------|
| **ID**             | HU-026                                                  |
| **Título**         | Residente ve el contenido educativo recomendado            |
| **Módulo**         | Contenido Educativo / Auditoría                            |
| **Prioridad**      | Media                                                        |
| **Estado**         | Implementado                                                 |
| **RF asociados**   | RQF-013                                                     |

---

## Historia

**Como** residente,
**quiero** ver una notificación cuando mi conjunto recibió una calificación de auditoría Regular o Mala,
**para** llegar en un solo clic al contenido educativo que me ayuda a mejorar en ese tema.

---

## Criterios de aceptación

### CA-026.1 — Notificación visible en el panel

- **Dado que** el Reciclador calificó mi conjunto como Regular o Malo en algún tema,
- **cuando** entro a mi panel,
- **entonces** debo ver una notificación en "Actividad reciente" indicando el tema y la calificación recibida.

### CA-026.2 — Sin recomendaciones nuevas

- **Dado que** mi conjunto no tiene ninguna auditoría reciente con calificación Regular o Mala,
- **cuando** entro a mi panel,
- **entonces** no debo ver ninguna notificación de este tipo.

### CA-026.3 — Un solo clic lleva al contenido

- **Dado que** veo la notificación de contenido recomendado,
- **cuando** hago clic sobre ella,
- **entonces** debo llegar directo a la página del catálogo educativo con el contenido del tema calificado, sin pasos intermedios.

### CA-026.4 — El clic marca la notificación como leída

- **Dado que** hice clic en una notificación de contenido recomendado sin leer,
- **cuando** se completa la navegación,
- **entonces** la notificación debe quedar marcada como leída, igual que el resto de notificaciones del panel.
