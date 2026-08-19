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

### CA-024.3 — Asignación exitosa

- **Dado que** confirmé la asignación,
- **cuando** el sistema la procesa,
- **entonces** el Admin de Conjunto debe quedar vinculado al nuevo conjunto y recibir una notificación.
