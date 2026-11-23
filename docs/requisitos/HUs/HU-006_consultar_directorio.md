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

> **Actualización (2026-11-03, issue #593)**: los recicladores se ven como una lista (una fila por reciclador, en la segunda tarjeta de la página) con su nombre, su asociación y los botones "Llamar" y "WhatsApp" siempre a la vista, sin desplegar nada. La localidad no se repite en cada fila (ya está fija arriba). Si el reciclador no comparte su teléfono, la fila dice "No comparte su teléfono" (antes "Sin teléfono registrado"). El aviso "¿Qué es este directorio?" va como franja arriba de la lista y se puede cerrar.

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

### CA-006.7 — Los puntos de acopio se ven en una tabla con fila desplegable

- **Dado que** veo los puntos de acopio (el Residente en la pestaña Puntos de Acopio, el Reciclador en su página "Puntos de acopio"),
- **cuando** la lista carga,
- **entonces** los veo en una tabla con las columnas Punto (nombre, dirección y, si la tiene, la organización que opera la ECA) y Localidad, ordenada por localidad y luego por nombre. Puedo buscar por nombre, dirección u organización sin importar tildes ni mayúsculas.
- Al tocar la fila (o la flecha del final) se despliega la ficha del punto, de a una a la vez: **Ubicación** (dirección con botón para copiarla y el botón "Cómo llegar", que abre Google Maps) y **Contacto** (teléfono, correo, organización y encargado; el correo y la organización solo salen si el punto los tiene).
- Si el punto no tiene teléfono, veo "Sin teléfono publicado" y la línea general de la UAESP, aclarando que no es la del punto. No veo kebab, comentarios ni botones de edición: son solo del Admin del Sistema.


### CA-006.9 — Los puntos de acopio se ven por páginas (issue #664)

- **Dado que** el directorio tiene cientos de puntos (el inventario de la UAESP trae 799 ECA),
- **cuando** veo la tabla de puntos de acopio,
- **entonces** el servidor me entrega de a 20, con la barra "Mostrando X–Y de Z" y las flechas de página anterior y siguiente al pie de la tabla. La búsqueda y el filtro de localidad se aplican en el servidor sobre todos los puntos, no solo sobre los 20 que veo, y la búsqueda espera unos 350 ms después de la última tecla antes de pedirse.
- Al cambiar de página, de búsqueda o de localidad se pliega la fila abierta y se vuelve a la primera página.
- El orden es estable entre páginas: ningún punto se repite ni se salta, aunque varios se llamen igual.

> **Cambio de formato (#664):** `GET /api/v1/directorio/puntos-acopio` ya no devuelve una lista, sino `{"items": [...], "total": N}`, y acepta `localidad_id`, `q` (texto), `limit` (1 a 100, por defecto 20) y `offset`. Cada punto trae `organizacion` y `correo_contacto`, que son `null` en los creados a mano.

### CA-006.8 — El aviso "¿Qué es una ECA?" se puede cerrar y la nota de la fuente no

- **Dado que** entro a los puntos de acopio,
- **cuando** la página carga,
- **entonces** veo el aviso "¿Qué es una ECA?", con un texto para el Residente ("aquí puedes ver las ECA de tu localidad", y que cualquier persona puede llevar residuos aprovechables a una ECA según el horario y las condiciones de su organización) y otro para el Reciclador ("aquí puedes ubicar la más cercana a tu ruta"). Lo puedo cerrar con la X y, al cerrarlo, queda un enlace con el mismo título para volver a abrirlo. Solo se recuerda mientras dure mi sesión: en cada inicio de sesión vuelve a mostrarse.
- Debajo del aviso, siempre veo (sin poder cerrarla) la nota de la fuente: "Fuente: UAESP, inventario vigente de ECA (Resolución 698 de 2023, entregado en noviembre de 2026). Estar en la lista no garantiza que una ECA esté abierta hoy: su horario lo define cada organización." No lleva enlace (ver la nota de abajo).
- La página son dos tarjetas: la primera con el título, el subtítulo, las pestañas y los filtros; la segunda con la lista. El aviso y la nota van como una franja arriba de la tabla, dentro de la segunda tarjeta, y se ven igual cuando la lista está cargando, falla o no tiene resultados.

> **Actualización (2026-11-16, issue #665):** la UAESP respondió (oficio 20265000341921, 2026-11-10) y confirmó que cualquier ciudadano puede llevar residuos aprovechables a una ECA, atendiendo los horarios y las condiciones de la organización que la opera; por eso la frase volvió al texto del Residente (el del Reciclador no la lleva). La nota de la fuente reemplaza a la advertencia "Lista oficial de 2020" y cita a la UAESP, como exige su licencia (nombrarla, no enlazarla).
>
> **Por qué la nota no lleva enlace:** la página de ECA de la UAESP responde 403 (acceso denegado), el PDF del inventario inicial es de diciembre de 2022 y contradice lo que se muestra, el dataset de Datos Abiertos responde 404, la Resolución 698 de 2023 no está publicada en un lugar que pudimos encontrar, y el Excel que entregó la UAESP trae correos de contacto. Más detalle en `docs/gestion-proyecto/fuente-datos-puntos-acopio-eca.md`.
