# HU-029 — Admin Conjunto edita un comunicado

<!--
  ¿Qué? Historia de usuario para corregir un comunicado ya publicado.
  ¿Para qué? Arreglar errores o actualizar información sin tener que crear uno nuevo.
  ¿Impacto? Evita duplicados y mantiene el feed limpio.
-->

---

## Identificación

| Campo             | Valor                                |
| ------------------ | -----------------------------------------|
| **ID**             | HU-029                                     |
| **Título**         | Admin Conjunto edita un comunicado             |
| **Módulo**         | Comunicación / Conjuntos                        |
| **Prioridad**      | Media                                             |
| **Estado**         | Implementada                                       |
| **RF asociados**   | RQF-014                                          |

---

## Historia

**Como** Admin de Conjunto,
**quiero** editar el texto, los adjuntos, el tipo o la fecha de expiración de un comunicado que ya publiqué,
**para** corregirlo o mantenerlo actualizado.

---

## Criterios de aceptación

### CA-029.1 — Campos editables

- **Dado que** selecciono un comunicado propio y elijo "Editar",
- **cuando** veo el formulario,
- **entonces** debo poder modificar el texto, los adjuntos, el tipo y la fecha de expiración.

### CA-029.2 — Destinatarios no editables

- **Dado que** estoy editando un comunicado,
- **cuando** reviso el formulario,
- **entonces** no debo poder cambiar a quién va dirigido (eso solo se define al crearlo).

### CA-029.3 — Etiqueta "Editado"

- **Dado que** guardé cambios en un comunicado,
- **cuando** los destinatarios lo ven en el feed,
- **entonces** debe mostrarse con una etiqueta "Editado".

### CA-029.4 — Solo mis propios conjuntos

- **Dado que** intento editar un comunicado de un conjunto que no administro,
- **cuando** el sistema procesa la solicitud,
- **entonces** debe rechazarla.
