# HU-022 — Admin Conjunto solicita desvinculación

<!--
  ¿Qué? Historia de usuario para que el Admin de Conjunto pida dejar de administrar un conjunto.
  ¿Para qué? Cubrir el caso real de alguien que deja de ejercer ese rol en un conjunto.
  ¿Impacto? Sin esto, no hay forma ordenada de "salir" del rol para un conjunto específico.
-->

---

## Identificación

| Campo             | Valor                                    |
| ------------------ | ---------------------------------------------|
| **ID**             | HU-022                                         |
| **Título**         | Admin Conjunto solicita desvinculación             |
| **Módulo**         | Administración / Conjuntos                          |
| **Prioridad**      | Media                                                |
| **Estado**         | Implementada                                          |
| **RF asociados**   | RQF-016                                              |

---

## Historia

**Como** Admin de Conjunto,
**quiero** solicitar mi desvinculación de un conjunto que ya no administro,
**para** que quede formalmente registrado que ya no soy responsable de él.

---

## Criterios de aceptación

### CA-022.1 — Ver mis conjuntos y solicitar desvinculación

- **Dado que** estoy en mi perfil,
- **cuando** veo la lista de conjuntos que administro,
- **entonces** debo poder seleccionar uno y enviar una solicitud de desvinculación, con un motivo opcional.

### CA-022.2 — No duplicar solicitudes

- **Dado que** ya tengo una solicitud de desvinculación pendiente para un conjunto,
- **cuando** intento enviar otra para el mismo conjunto,
- **entonces** el sistema no debe permitirlo.

### CA-022.3 — Notificación al procesarse

- **Dado que** mi solicitud fue aprobada o rechazada,
- **cuando** el Admin Sistema la procesa,
- **entonces** debo recibir una notificación con el resultado.
