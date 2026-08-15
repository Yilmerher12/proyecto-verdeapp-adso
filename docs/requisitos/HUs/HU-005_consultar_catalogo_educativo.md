# HU-005 — Residente consulta el catálogo educativo

<!--
  ¿Qué? Historia de usuario para que el residente lea contenido educativo sobre reciclaje.
  ¿Para qué? Ayudarlo a separar mejor los residuos desde la fuente.
  ¿Impacto? Mejora la calidad de la separación, lo que beneficia a todo el ciclo de reciclaje.
-->

---

## Identificación

| Campo             | Valor                                |
| ------------------ | ------------------------------------ |
| **ID**             | HU-005                                |
| **Título**         | Residente consulta el catálogo educativo |
| **Módulo**         | Educación                             |
| **Prioridad**      | Media                                  |
| **Estado**         | Por implementar                        |
| **RF asociados**   | RQF-004                               |

---

## Historia

**Como** residente,
**quiero** ver una lista de módulos educativos sobre cómo separar los residuos,
**para** aprender a reciclar correctamente.

---

## Criterios de aceptación

### CA-005.1 — Lista de módulos

- **Dado que** entro a la sección "Educación",
- **cuando** la página carga,
- **entonces** debo ver la lista de módulos educativos disponibles, cada uno con un título.

### CA-005.2 — Abrir un módulo

- **Dado que** estoy viendo la lista de módulos,
- **cuando** selecciono uno,
- **entonces** debo ver su contenido completo (texto e imágenes).

### CA-005.3 — Solo lectura

- **Dado que** soy residente,
- **cuando** navego por el catálogo educativo,
- **entonces** no debo ver ninguna opción para crear, editar o eliminar contenido — solo para leerlo.

### CA-005.4 — Catálogo vacío

- **Dado que** todavía no hay módulos educativos publicados,
- **cuando** entro a la sección "Educación",
- **entonces** debo ver un mensaje indicando que aún no hay contenido disponible, en vez de una lista vacía sin explicación.
