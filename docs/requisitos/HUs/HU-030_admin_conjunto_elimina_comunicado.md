# HU-030 — Admin Conjunto elimina un comunicado

<!--
  ¿Qué? Historia de usuario para retirar un comunicado publicado por error o ya sin vigencia.
  ¿Para qué? Mantener el feed limpio y relevante.
  ¿Impacto? Evita que quede información incorrecta o vieja visible.
-->

---

## Identificación

| Campo             | Valor                                |
| ------------------ | -----------------------------------------|
| **ID**             | HU-030                                     |
| **Título**         | Admin Conjunto elimina un comunicado           |
| **Módulo**         | Comunicación / Conjuntos                        |
| **Prioridad**      | Media                                             |
| **Estado**         | Implementada                                       |
| **RF asociados**   | RQF-014                                          |

---

## Historia

**Como** Admin de Conjunto,
**quiero** eliminar un comunicado que publiqué por error o que ya no debe estar visible,
**para** mantener el feed de mi conjunto limpio y confiable.

---

## Criterios de aceptación

### CA-030.1 — Confirmación antes de eliminar

- **Dado que** selecciono "Eliminar" sobre un comunicado propio,
- **cuando** el sistema responde,
- **entonces** debe pedirme confirmación antes de eliminarlo definitivamente.

### CA-030.2 — Eliminación de adjuntos

- **Dado que** confirmé la eliminación de un comunicado con archivos adjuntos,
- **cuando** se procesa,
- **entonces** los adjuntos también deben eliminarse del almacenamiento.

### CA-030.3 — Deja de verse en el feed

- **Dado que** eliminé un comunicado,
- **cuando** un residente o reciclador consulta el feed,
- **entonces** ese comunicado ya no debe aparecer.

### CA-030.4 — Solo mis propios conjuntos

- **Dado que** intento eliminar un comunicado de un conjunto que no administro,
- **cuando** el sistema procesa la solicitud,
- **entonces** debe rechazarla.
