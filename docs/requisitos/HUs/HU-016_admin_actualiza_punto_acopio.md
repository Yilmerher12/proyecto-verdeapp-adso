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
| **Estado**         | Implementada                                                    |
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

### CA-016.4 — Editar desde el kebab de la tabla

- **Dado que** estoy viendo la tabla de puntos de acopio,
- **cuando** abro el kebab (tres puntos) de un punto y elijo "Editar",
- **entonces** se abre un modal centrado con el formulario de ese punto, el mismo de "Nuevo punto de acopio". Si guardo, el modal se cierra; si falla, se queda abierto con el aviso.
- Elegir "Ver ficha" en el mismo menú despliega la fila con sus datos, sin abrir ningún panel.

### CA-016.5 — Dejar constancia del motivo del cambio

- **Dado que** edito un punto (por ejemplo, cambia el encargado o el dueño),
- **cuando** escribo un "Motivo del cambio" y guardo,
- **entonces** el motivo queda como un comentario del punto, con mi correo y la fecha, y el campo es opcional.

### CA-016.6 — Comentarios internos del punto

- **Dado que** desplegué la ficha de un punto,
- **cuando** escribo un comentario y lo agrego,
- **entonces** aparece de primero en la lista de comentarios, con autor y fecha, y ningún Residente ni Reciclador puede verlo.

### CA-016.7 — Cambiar o quitar la foto del punto

- **Dado que** edito un punto de acopio,
- **cuando** subo otra imagen en "Foto del punto", o la quito, y guardo,
- **entonces** la ficha muestra la foto nueva, o deja de mostrar foto. La foto reemplazada o quitada ya no cuenta como en uso: la limpieza de adjuntos la borra después.
- Los Residentes y Recicladores ven la foto actualizada al abrir la ficha del punto, que se puede ampliar al tocarla.
