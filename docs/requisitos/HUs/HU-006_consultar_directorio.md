# HU-006 — Residente consulta el directorio de acopio y recicladores

<!--
  ¿Qué? Historia de usuario para que el residente vea puntos de acopio y recicladores disponibles.
  ¿Para qué? Que pueda entregar material reciclable directamente, sin depender solo del SHUT.
  ¿Impacto? Da más opciones de reciclaje al residente.
-->

---

## Identificación

| Campo             | Valor                                                    |
| ------------------ | --------------------------------------------------------- |
| **ID**             | HU-006                                                      |
| **Título**         | Residente consulta el directorio de acopio y recicladores  |
| **Módulo**         | Directorio                                                  |
| **Prioridad**      | Media                                                        |
| **Estado**         | Implementada                                                 |
| **RF asociados**   | RQF-005                                                     |

---

## Historia

**Como** residente,
**quiero** ver un directorio de puntos de acopio y recicladores disponibles, filtrable por mi localidad o conjunto,
**para** encontrar dónde y con quién entregar material reciclable directamente.

---

## Criterios de aceptación

### CA-006.1 — Lista de puntos de acopio y recicladores

- **Dado que** entro a la sección "Directorio",
- **cuando** la página carga,
- **entonces** debo ver los puntos de acopio y los recicladores activos.

### CA-006.2 — Filtro por localidad o conjunto

- **Dado que** estoy en el directorio,
- **cuando** aplico un filtro por localidad o conjunto,
- **entonces** la lista debe mostrar solo los resultados que coinciden con ese filtro.

### CA-006.3 — Datos de contacto visibles

- **Dado que** veo un reciclador en el directorio,
- **cuando** reviso su información,
- **entonces** debo poder ver su teléfono o un enlace de contacto (ej. chat/WhatsApp), solo si el reciclador autorizó compartirlo.

### CA-006.4 — Sin resultados

- **Dado que** aplico un filtro que no coincide con ningún registro,
- **cuando** la búsqueda termina,
- **entonces** debo ver el mensaje "No se encontraron resultados para este filtro" en vez de una lista vacía sin explicación.

### CA-006.5 — Prioridad al conjunto propio

- **Dado que** consulto el directorio de recicladores,
- **cuando** veo los resultados,
- **entonces** los recicladores vinculados directamente a mi conjunto deben aparecer primero.
