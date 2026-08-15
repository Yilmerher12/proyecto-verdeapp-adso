# HU-020 — Admin de Conjunto invita a un reciclador a su conjunto

<!--
  ¿Qué? Historia de usuario para que el Admin de Conjunto autorice a un reciclador.
  ¿Para qué? Que solo recicladores autorizados puedan operar en un conjunto específico.
  ¿Impacto? Controla quién puede reportar llegadas y ver el estado del SHUT de ese conjunto.
-->

---

## Identificación

| Campo             | Valor                                                      |
| ------------------ | ---------------------------------------------------------------|
| **ID**             | HU-020                                                            |
| **Título**         | Admin de Conjunto invita a un reciclador a su conjunto               |
| **Módulo**         | Administración / Conjuntos                                          |
| **Prioridad**      | Alta                                                                  |
| **Estado**         | Implementada                                                          |
| **RF asociados**   | RQF-012                                                              |

---

## Historia

**Como** Admin de Conjunto,
**quiero** invitar a un reciclador ya registrado en la plataforma a mi conjunto,
**para** que quede autorizado a operar ahí (reportar llegadas, ver el estado del SHUT).

---

## Criterios de aceptación

### CA-020.1 — Invitar por correo

- **Dado que** estoy en el panel de mi conjunto,
- **cuando** invito a un reciclador,
- **entonces** debo poder ingresar el correo de un reciclador ya registrado.

### CA-020.2 — Solo mis propios conjuntos

- **Dado que** administro más de un conjunto,
- **cuando** invito a un reciclador,
- **entonces** debo poder elegir a cuál de mis conjuntos lo estoy invitando, y no debo poder invitarlo a un conjunto que no administro.

### CA-020.3 — Invitación queda pendiente

- **Dado que** envié la invitación,
- **cuando** el sistema la procesa,
- **entonces** debe quedar en estado pendiente hasta que el reciclador responda.

### CA-020.4 — Ver invitaciones enviadas

- **Dado que** ya invité a uno o más recicladores a mi conjunto,
- **cuando** consulto la lista de invitaciones de mi conjunto,
- **entonces** debo poder ver su estado (pendiente, aceptada o rechazada).
