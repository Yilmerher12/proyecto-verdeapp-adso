# HU-026 — Residente ve el contenido educativo recomendado

<!--
  ¿Qué? Historia de usuario para que el residente vea las recomendaciones activas de su conjunto.
  ¿Para qué? Que sepa exactamente qué leer para mejorar en lo que el conjunto falló.
  ¿Impacto? Convierte una auditoría negativa en una oportunidad de aprendizaje concreta.
-->

---

## Identificación

| Campo             | Valor                                              |
| ------------------ | ------------------------------------------------------|
| **ID**             | HU-026                                                  |
| **Título**         | Residente ve el contenido educativo recomendado            |
| **Módulo**         | Contenido Educativo / Auditoría                            |
| **Prioridad**      | Media                                                        |
| **Estado**         | Por implementar                                              |
| **RF asociados**   | RQF-013                                                     |

---

## Historia

**Como** residente,
**quiero** ver una sección "Te recomendamos leer" cuando mi conjunto tiene contenido recomendado activo,
**para** aprender justo en las áreas donde estamos fallando según la última auditoría.

---

## Criterios de aceptación

### CA-026.1 — Sección visible solo si hay recomendaciones

- **Dado que** mi conjunto tiene contenido recomendado activo,
- **cuando** abro la aplicación,
- **entonces** debo ver la sección "Te recomendamos leer" en el inicio.

### CA-026.2 — Sin recomendaciones activas

- **Dado que** mi conjunto no tiene ninguna recomendación activa,
- **cuando** abro la aplicación,
- **entonces** la sección "Te recomendamos leer" no debe mostrarse.

### CA-026.3 — Abrir un módulo recomendado

- **Dado que** veo un módulo en mis recomendaciones,
- **cuando** lo selecciono,
- **entonces** debo poder leer su contenido completo, igual que en el catálogo educativo normal (HU-005).

### CA-026.4 — Marcar como leído

- **Dado que** ya leí un módulo recomendado,
- **cuando** lo marco como leído,
- **entonces** debe dejar de aparecer en mi sección de recomendaciones.
