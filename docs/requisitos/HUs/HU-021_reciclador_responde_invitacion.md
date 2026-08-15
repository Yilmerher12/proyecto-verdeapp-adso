# HU-021 — Reciclador acepta o rechaza la invitación a un conjunto

<!--
  ¿Qué? Historia de usuario para que el reciclador responda a una invitación.
  ¿Para qué? Completar el flujo de autorización iniciado en HU-020.
  ¿Impacto? Nadie queda autorizado en un conjunto sin haberlo confirmado explícitamente.
-->

---

## Identificación

| Campo             | Valor                                                     |
| ------------------ | --------------------------------------------------------------|
| **ID**             | HU-021                                                           |
| **Título**         | Reciclador acepta o rechaza la invitación a un conjunto             |
| **Módulo**         | Administración / Conjuntos                                         |
| **Prioridad**      | Alta                                                                 |
| **Estado**         | Implementada                                                         |
| **RF asociados**   | RQF-012                                                             |

---

## Historia

**Como** reciclador,
**quiero** ver las invitaciones que me han enviado y aceptarlas o rechazarlas,
**para** decidir en qué conjuntos quiero quedar autorizado a operar.

---

## Criterios de aceptación

### CA-021.1 — Ver invitaciones pendientes

- **Dado que** tengo invitaciones pendientes,
- **cuando** entro a mi lista de invitaciones,
- **entonces** debo poder verlas todas, con el conjunto correspondiente a cada una.

### CA-021.2 — Aceptar una invitación

- **Dado que** tengo una invitación pendiente,
- **cuando** la acepto,
- **entonces** quedo autorizado de inmediato para operar en ese conjunto.

### CA-021.3 — Rechazar una invitación

- **Dado que** tengo una invitación pendiente,
- **cuando** la rechazo,
- **entonces** la invitación se cierra y no quedo autorizado en ese conjunto.

### CA-021.4 — Ver mis conjuntos autorizados

- **Dado que** ya acepté una o más invitaciones,
- **cuando** consulto mis conjuntos autorizados,
- **entonces** debo ver la lista completa de conjuntos donde puedo operar.
