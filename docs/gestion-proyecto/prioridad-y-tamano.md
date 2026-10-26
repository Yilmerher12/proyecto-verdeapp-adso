# Prioridad y tamaño de las tarjetas

Este documento explica cómo se decide qué tan importante, compleja y grande es una tarjeta del tablero, y cómo eso se escribe en cada issue y en los campos `Priority` y `Size` del tablero "VerdeApp - Tablero de desarrollo".

Es el método vigente. Los documentos [`matriz-prioridad.md`](matriz-prioridad.md) y [`calculo-horas.md`](calculo-horas.md) son el análisis original del proyecto y se conservan como referencia histórica: este documento retoma sus criterios y los conecta con el tablero.

## Qué se escribe en cada tarjeta

Cada issue lleva, en su sección "Importancia, complejidad y tamaño", cuatro datos:

| Dato | Valores | Qué responde |
|---|---|---|
| **Importancia** | Alta, Media, Baja | ¿Qué pasa si esto no se hace? |
| **Complejidad** | Alta, Media, Baja | ¿Qué tan difícil es hacerlo bien? |
| **Prioridad** | Must, Should, Could | ¿Qué se hace primero? Sale de la importancia |
| **Tamaño** | XS, S, M, L, XL | ¿Cuántas horas de trabajo son? |

## Importancia

| Nivel | Cuándo se usa |
|---|---|
| **Alta** | Sin esto el sistema no cumple su propósito, o hay un error que afecta el uso real o da información incorrecta al usuario. |
| **Media** | Completa un flujo o mejora de forma clara la experiencia, pero el sistema funciona sin ello. |
| **Baja** | Pulido, soporte o comodidad. |

## Complejidad

Son los criterios de la matriz original:

| Nivel | Cuándo se usa |
|---|---|
| **Alta** | Lógica de negocio pesada, notificaciones en tiempo real, concurrencia o integridad referencial estricta. |
| **Media** | Operaciones CRUD estándar con validaciones de formulario. |
| **Baja** | Lecturas simples o formularios de actualización directa. |

La complejidad no es lo mismo que el tamaño: una tarjeta puede ser de complejidad Baja y aun así de tamaño M porque toca muchos archivos (por ejemplo, mover una pantalla de lugar).

## Prioridad

En la matriz original, la prioridad de cada historia sigue a su importancia: Alta es Must, Media es Should y Baja es Could. La regla de la matriz agrega que **una importancia Alta con complejidad Baja o Media se programa primero**. En la práctica, entre dos tarjetas de la misma prioridad, se empieza por la menos compleja.

| Importancia | Prioridad | Campo `Priority` del tablero |
|---|---|---|
| Alta | Must | **P0** |
| Media | Should | **P1** |
| Baja | Could | **P2** |

## Tamaño

La capacidad mínima del equipo es de **2 horas por día de lunes a viernes, es decir 10 horas por semana por integrante**. Cada integrante recibe un issue por semana. La escala usa esa capacidad:

| Tamaño | Horas de trabajo | Frente a una semana de 10 horas |
|---|---|---|
| **XS** | hasta 2 h | Sobra tiempo |
| **S** | 3 a 5 h | Cabe |
| **M** | 6 a 10 h | Ocupa toda la semana |
| **L** | 11 a 20 h | Puede pasar de una semana |
| **XL** | más de 20 h | Pasa de una semana |

Una tarjeta L o XL se asigna entera a una persona. Si al cerrar la semana no se terminó, se aplica la regla de traspaso de [`informes-scrum/`](informes-scrum/_cierre-de-issue.md): se deja el comentario de cierre en el issue y el Scrum Master de la semana siguiente decide con el grupo quién la continúa.

Las estimaciones son a ojo. Después de cada semana se comparan con las horas que de verdad se usaron (el comentario de cierre pide ese dato) y se corrige la escala si hace falta.

## Ejemplos (octubre de 2026)

Son los valores que se propusieron para las primeras tarjetas del plan de mejoras. El equipo puede cambiarlos al crear cada issue.

| Tarjeta | Importancia | Complejidad | Prioridad | Tamaño | Por qué |
|---|---|---|---|---|---|
| Mover la agenda del conjunto a una página propia | Media | Media | Should (P1) | M | Mejora el uso, sin romper nada si no se hace; no toca el backend |
| Archivar notas de la agenda y quitar "En espera" | Media | Media | Should (P1) | L | Estados nuevos, migración de datos y paginación, además de la pantalla |
| Notificaciones por conjunto | Media | Media | Should (P1) | L | Toca la API y el panel, con pruebas de varios conjuntos |
| Investigación de gráficas de auditorías | Baja | Media | Could (P2) | M | Es una decisión de diseño que puede esperar |
| Investigación del reporte de la agenda | Baja | Media | Could (P2) | M | Depende de que las notas ya se puedan archivar |
| Investigación de documentos del Administrador de Conjunto | Alta | Baja | Must (P0) | S a M | La pantalla de registro da hoy información que puede ser incorrecta |
| Corrección del menú móvil que se abre en cada página | Alta | Baja | Must (P0) | XS | Afecta el uso diario en celular |
| Corrección del aviso de auditoría antes de la llegada | Alta | Baja | Must (P0) | S | La pantalla dice algo que el backend rechaza |
| Fechas según el idioma de la aplicación | Media | Baja | Should (P1) | S | Puede llevar a leer mal una fecha |
