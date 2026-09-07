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
**quiero** ver un directorio de puntos de acopio y recicladores disponibles, filtrable por mi localidad,
**para** encontrar dónde y con quién entregar material reciclable directamente.

---

## Criterios de aceptación

### CA-006.1 — Lista de puntos de acopio y recicladores

- **Dado que** entro a la sección "Directorio",
- **cuando** la página carga,
- **entonces** debo ver los puntos de acopio y los recicladores activos.

### CA-006.2 — Filtro por localidad

- **Dado que** estoy en el directorio,
- **cuando** aplico un filtro por localidad,
- **entonces** la lista debe mostrar solo los resultados que coinciden con ese filtro.

### CA-006.3 — Datos de contacto visibles

- **Dado que** veo un reciclador en el directorio,
- **cuando** reviso su información,
- **entonces** debo poder ver su teléfono o un enlace de contacto (ej. chat/WhatsApp), solo si el reciclador autorizó compartirlo.

### CA-006.4 — Sin resultados

- **Dado que** aplico un filtro que no coincide con ningún registro,
- **cuando** la búsqueda termina,
- **entonces** debo ver un mensaje explicando que no hay resultados para esa localidad, en vez de una lista vacía sin explicación.

### CA-006.5 — En Recicladores, el filtro queda fijo a mi localidad

- **Dado que** entro a la pestaña de Recicladores,
- **cuando** el sistema detecta mi localidad (a partir del conjunto donde vivo),
- **entonces** el filtro queda fijo en esa localidad — no puedo cambiarlo a otra, ni siquiera pidiéndola directamente por parámetro en la petición al backend.

### CA-006.6 — En Puntos de Acopio, el filtro sigue siendo libre

- **Dado que** entro a la pestaña de Puntos de Acopio,
- **cuando** reviso el filtro de localidad,
- **entonces** viene preseleccionado en la mía por conveniencia, pero puedo cambiarlo a cualquier otra localidad sin restricción.
