# HU-024 — Admin Sistema asigna un conjunto adicional a un Admin de Conjunto existente

<!--
  ¿Qué? Historia de usuario para asignar un conjunto extra a alguien que ya es Admin de Conjunto.
  ¿Para qué? Evitar tener que invitar de nuevo a alguien que ya tiene cuenta en la plataforma.
  ¿Impacto? Hace más ágil crecer la cantidad de conjuntos que administra una misma persona.
-->

---

## Identificación

| Campo             | Valor                                                                          |
| ------------------ | -----------------------------------------------------------------------------------|
| **ID**             | HU-024                                                                               |
| **Título**         | Admin Sistema asigna un conjunto adicional a un Admin de Conjunto existente               |
| **Módulo**         | Administración / Conjuntos                                                              |
| **Prioridad**      | Media                                                                                     |
| **Estado**         | Implementada                                                                              |
| **RF asociados**   | RQF-016                                                                                   |

---

## Historia

**Como** Admin Sistema,
**quiero** asignar un conjunto adicional a un Admin de Conjunto que ya existe en la plataforma,
**para** vincularlo a un nuevo conjunto sin tener que invitarlo de nuevo por correo.

---

## Criterios de aceptación

### CA-024.1 — Buscar un Admin de Conjunto existente

- **Dado que** estoy en el panel de asignación de conjuntos,
- **cuando** busco un Admin de Conjunto,
- **entonces** debo poder encontrarlo entre los que ya tienen cuenta en la plataforma.

### CA-024.2 — Elegir un conjunto sin administrador

- **Dado que** seleccioné un Admin de Conjunto,
- **cuando** elijo el conjunto a asignarle,
- **entonces** solo debo poder elegir conjuntos que no tengan ya otro administrador activo.
- **y** si de todos modos el conjunto tiene un administrador activo, o una invitación pendiente para otra persona (HU-018), el sistema rechaza la asignación con un error 409 y un mensaje claro (issue #409). Con una invitación pendiente hay que esperar a que se acepte o venza (48 horas): así la persona invitada no pierde su invitación por una asignación hecha en el medio.

### CA-024.3 — Asignación exitosa

- **Dado que** confirmé la asignación,
- **cuando** el sistema la procesa,
- **entonces** el Admin de Conjunto debe quedar vinculado al nuevo conjunto y recibir una notificación.
