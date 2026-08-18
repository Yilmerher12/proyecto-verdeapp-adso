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
