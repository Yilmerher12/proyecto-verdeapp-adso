# HU-016 — Admin Sistema actualiza un punto de acopio existente

<!--
  ¿Qué? Historia de usuario para corregir los datos de un punto de acopio ya registrado.
  ¿Para qué? Mantener la información del directorio correcta (dirección, contacto, etc.).
  ¿Impacto? Evita que los residentes lleguen a un punto de acopio con datos desactualizados.
-->

---

## Identificación

| Campo             | Valor                                                  |
| ------------------ | ---------------------------------------------------------|
| **ID**             | HU-016                                                      |
| **Título**         | Admin Sistema actualiza un punto de acopio existente          |
| **Módulo**         | Directorio / Administración                                  |
| **Prioridad**      | Alta                                                          |
| **Estado**         | Por implementar                                               |
| **RF asociados**   | RQF-011                                                      |

---

## Historia

**Como** Admin Sistema,
**quiero** actualizar los datos de un punto de acopio ya registrado,
**para** mantener su información correcta en el directorio.

---

## Criterios de aceptación

### CA-016.1 — Editar un punto existente

- **Dado que** estoy en el panel de gestión del directorio,
- **cuando** selecciono un punto de acopio y elijo "Editar",
- **entonces** debo poder modificar nombre, dirección, contacto o localidad.

### CA-016.2 — Localidad debe seguir siendo válida

- **Dado que** cambio la localidad de un punto de acopio,
- **cuando** guardo,
- **entonces** el sistema debe validar que la nueva localidad exista, igual que en el registro inicial.

### CA-016.3 — Cambios reflejados de inmediato

- **Dado que** guardé los cambios,
- **cuando** un residente consulta ese punto en el directorio,
- **entonces** debe ver la información actualizada.
