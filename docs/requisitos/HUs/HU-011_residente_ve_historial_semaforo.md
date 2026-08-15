# HU-011 — Residente consulta el historial del semáforo

<!--
  ¿Qué? Historia de usuario para que el residente vea las calificaciones históricas de su conjunto.
  ¿Para qué? Que la comunidad sepa cómo ha ido mejorando (o no) su separación de residuos.
  ¿Impacto? Da visibilidad y motiva la mejora continua.
-->

---

## Identificación

| Campo             | Valor                                            |
| ------------------ | --------------------------------------------------|
| **ID**             | HU-011                                              |
| **Título**         | Residente consulta el historial del semáforo         |
| **Módulo**         | Auditoría / Calificaciones                           |
| **Prioridad**      | Baja (opcional)                                       |
| **Estado**         | En discusión                                          |
| **RF asociados**   | RQF-009                                             |

---

## Historia

**Como** residente,
**quiero** ver el historial de calificaciones del semáforo de mi conjunto,
**para** saber qué tan bien estamos separando los residuos y en qué podemos mejorar.

---

## Criterios de aceptación

### CA-011.1 — Ver historial

- **Dado que** entro a la sección del semáforo de mi conjunto,
- **cuando** la página carga,
- **entonces** debo ver la lista de calificaciones históricas, con fecha, color y observación (si la hay).

### CA-011.2 — Solo lectura

- **Dado que** soy residente,
- **cuando** veo el historial del semáforo,
- **entonces** no debo tener ninguna opción para crear o modificar calificaciones — solo verlas.

### CA-011.3 — Sin historial todavía

- **Dado que** mi conjunto nunca ha sido calificado,
- **cuando** entro a la sección,
- **entonces** debo ver un mensaje indicando que todavía no hay calificaciones registradas.
