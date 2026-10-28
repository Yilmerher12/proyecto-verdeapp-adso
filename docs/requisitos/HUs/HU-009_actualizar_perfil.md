# HU-009 — Actualizar datos personales del perfil

<!--
  ¿Qué? Historia de usuario para editar datos básicos del perfil propio.
  ¿Para qué? Mantener la información de contacto al día.
  ¿Impacto? Mejora la precisión del directorio y las notificaciones.
-->

---

## Identificación

| Campo             | Valor                                     |
| ------------------ | ------------------------------------------ |
| **ID**             | HU-009                                      |
| **Título**         | Actualizar datos personales del perfil      |
| **Módulo**         | Usuarios / Perfil                            |
| **Prioridad**      | Media                                        |
| **Estado**         | Implementada                                  |
| **RF asociados**   | RQF-008                                      |

> **Organización de la página (2026-10-28)**: "Mi perfil" ya no tiene una columna izquierda más corta que la derecha. Arriba va una tarjeta con la foto, el nombre y el rol; debajo, dos bloques de la misma altura: "Información personal" (nombre completo en una sola casilla al leer, teléfono, correo y, en el Reciclador, la visibilidad del teléfono) y los datos propios del rol (conjunto y unidad del Residente; localidad base y asociación del Reciclador; un conjunto por casilla del Admin de Conjunto). Los criterios de aceptación no cambian: lo editable sigue siendo lo mismo y la edición sigue en "Información personal".

---

## Historia

**Como** residente o reciclador,
**quiero** editar mi nombre, apellidos, asociación o número telefónico desde mi perfil,
**para** mantener mis datos de contacto actualizados.

---

## Criterios de aceptación

### CA-009.1 — Campos editables

- **Dado que** entro a "Mi perfil" y presiono "Editar",
- **cuando** veo el formulario,
- **entonces** solo debo poder modificar nombre, apellidos, asociación y número telefónico.

### CA-009.2 — Campos bloqueados

- **Dado que** estoy editando mi perfil,
- **cuando** reviso el formulario,
- **entonces** los campos de correo, contraseña, rol y conjunto/unidad deben estar deshabilitados, sin opción de editarlos ahí.

### CA-009.3 — Guardar cambios exitosamente

- **Dado que** modifiqué uno o más campos permitidos,
- **cuando** guardo,
- **entonces** debo ver un mensaje de éxito y los nuevos datos reflejados de inmediato en mi perfil.

### CA-009.4 — Validación de teléfono

- **Dado que** ingreso un número telefónico con un formato inválido,
- **cuando** intento guardar,
- **entonces** debo ver un mensaje de error indicando el problema.
