# HU-034 — Admin Sistema edita una novedad general

<!--
  ¿Qué? Historia de usuario para corregir una novedad ya publicada.
  ¿Para qué? Actualizar información sin tener que crear una novedad duplicada.
  ¿Impacto? Mantiene la sección de novedades correcta y confiable.
-->

---

## Identificación

| Campo             | Valor                                    |
| ------------------ | -----------------------------------------------|
| **ID**             | HU-034                                           |
| **Título**         | Admin Sistema edita una novedad general              |
| **Módulo**         | Comunicación / Sistema                                |
| **Prioridad**      | Media                                                  |
| **Estado**         | Por implementar                                        |
| **RF asociados**   | RQF-015                                               |

---

## Historia

**Como** Admin Sistema,
**quiero** editar el texto, los adjuntos o la fecha de expiración de una novedad ya publicada,
**para** corregirla o mantenerla actualizada.

---

## Criterios de aceptación

### CA-034.1 — Campos editables

- **Dado que** selecciono una novedad publicada y elijo "Editar",
- **cuando** veo el formulario,
- **entonces** debo poder modificar el texto, los adjuntos y la fecha de expiración.

### CA-034.2 — Alcance no editable

- **Dado que** estoy editando una novedad,
- **cuando** reviso el formulario,
- **entonces** no debo poder cambiar a quién va dirigida (eso solo se define al publicarla).

### CA-034.3 — Cambios reflejados de inmediato

- **Dado que** guardé cambios en una novedad,
- **cuando** un usuario del alcance correspondiente la consulta,
- **entonces** debe ver la versión más reciente.
