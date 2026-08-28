# HU-012 — Admin Sistema crea un módulo de contenido educativo

<!--
  ¿Qué? Historia de usuario para que el Admin Sistema publique nuevo contenido educativo.
  ¿Para qué? Alimentar el catálogo que consultan los residentes (HU-005).
  ¿Impacto? Sin esto, el catálogo educativo nunca tendría contenido nuevo.
-->

---

## Identificación

| Campo             | Valor                                                  |
| ------------------ | --------------------------------------------------------|
| **ID**             | HU-012                                                    |
| **Título**         | Admin Sistema crea un módulo de contenido educativo         |
| **Módulo**         | Educación / Administración                                 |
| **Prioridad**      | Media                                                        |
| **Estado**         | Implementada                                                 |
| **RF asociados**   | RQF-010                                                     |

---

## Historia

**Como** Admin Sistema,
**quiero** crear un nuevo módulo de contenido educativo con título y cuerpo de texto,
**para** que los residentes tengan material actualizado sobre cómo reciclar.

---

## Criterios de aceptación

### CA-012.1 — Formulario de creación

- **Dado que** estoy en el panel de administración de contenido educativo,
- **cuando** elijo "Crear módulo",
- **entonces** debo poder ingresar un título (mínimo 5 caracteres) y un cuerpo de texto (mínimo 20 caracteres).

### CA-012.2 — Publicación exitosa

- **Dado que** completé el formulario correctamente,
- **cuando** guardo,
- **entonces** el módulo debe quedar disponible de inmediato para los residentes en el catálogo educativo (HU-005).

### CA-012.3 — Validación de campos

- **Dado que** el título o el cuerpo de texto no cumplen la longitud mínima,
- **cuando** intento guardar,
- **entonces** debo ver un mensaje de error indicando el problema.

> **Nota (2026-08-29)**: implementado y verificado — `ContenidoEducativoBase` valida ahora el mínimo de 5/20 caracteres (backend), con el mismo chequeo replicado en el formulario del frontend antes de enviar. Probado en navegador con título corto, contenido corto, y guardado exitoso.

### CA-012.4 — Acceso exclusivo de administrador

- **Dado que** no tengo el rol admin_sistema,
- **cuando** intento acceder a esta función,
- **entonces** el sistema debe negarme el acceso.
