# HU-013 — Admin Sistema edita un módulo de contenido educativo

<!--
  ¿Qué? Historia de usuario para que el Admin Sistema corrija o actualice un módulo existente.
  ¿Para qué? Mantener el contenido educativo correcto y al día.
  ¿Impacto? Evita que quede información desactualizada visible para los residentes.
-->

---

## Identificación

| Campo             | Valor                                                 |
| ------------------ | -------------------------------------------------------|
| **ID**             | HU-013                                                   |
| **Título**         | Admin Sistema edita un módulo de contenido educativo        |
| **Módulo**         | Educación / Administración                                |
| **Prioridad**      | Media                                                       |
| **Estado**         | Implementada                                                |
| **RF asociados**   | RQF-010                                                    |

---

## Historia

**Como** Admin Sistema,
**quiero** editar el título o el cuerpo de un módulo educativo ya publicado,
**para** corregirlo o mantenerlo actualizado.

---

## Criterios de aceptación

### CA-013.1 — Editar un módulo existente

- **Dado que** estoy en el panel de administración de contenido educativo,
- **cuando** selecciono un módulo y elijo "Editar",
- **entonces** debo poder modificar su título y/o cuerpo de texto.

### CA-013.2 — Cambios reflejados de inmediato

- **Dado que** guardé los cambios de un módulo,
- **cuando** un residente lo consulta,
- **entonces** debe ver la versión más reciente, no la anterior.

### CA-013.3 — Validación de campos

- **Dado que** dejo el título o el cuerpo por debajo de la longitud mínima al editar,
- **cuando** intento guardar,
- **entonces** debo ver un mensaje de error.

> **Nota (2026-08-29)**: implementado — mismo schema compartido con HU-012, ya valida el mínimo también al editar.

### CA-013.4 — Acceso exclusivo de administrador

- **Dado que** no tengo el rol admin_sistema,
- **cuando** intento editar un módulo,
- **entonces** el sistema debe negarme el acceso.
