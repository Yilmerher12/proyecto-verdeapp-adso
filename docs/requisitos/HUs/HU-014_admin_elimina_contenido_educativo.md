# HU-014 — Admin Sistema elimina un módulo de contenido educativo

<!--
  ¿Qué? Historia de usuario para que el Admin Sistema retire un módulo que ya no aplica.
  ¿Para qué? Mantener el catálogo educativo limpio y relevante.
  ¿Impacto? Evita mostrar contenido obsoleto o incorrecto a los residentes.
-->

---

## Identificación

| Campo             | Valor                                                    |
| ------------------ | ------------------------------------------------------------|
| **ID**             | HU-014                                                        |
| **Título**         | Admin Sistema elimina un módulo de contenido educativo           |
| **Módulo**         | Educación / Administración                                      |
| **Prioridad**      | Media                                                             |
| **Estado**         | Implementada                                                      |
| **RF asociados**   | RQF-010                                                          |

---

## Historia

**Como** Admin Sistema,
**quiero** eliminar un módulo de contenido educativo que ya no debe estar disponible,
**para** mantener el catálogo limpio y sin información obsoleta.

---

## Criterios de aceptación

### CA-014.1 — Confirmación antes de eliminar

- **Dado que** selecciono "Eliminar" sobre un módulo,
- **cuando** el sistema responde,
- **entonces** debe pedirme confirmación antes de eliminarlo de forma definitiva.

### CA-014.2 — El módulo deja de ser visible

- **Dado que** confirmé la eliminación de un módulo,
- **cuando** un residente consulta el catálogo educativo,
- **entonces** ese módulo ya no debe aparecer en la lista.

### CA-014.3 — Acceso exclusivo de administrador

- **Dado que** no tengo el rol admin_sistema,
- **cuando** intento eliminar un módulo,
- **entonces** el sistema debe negarme el acceso.
