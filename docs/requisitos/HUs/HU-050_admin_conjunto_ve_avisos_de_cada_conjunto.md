# HU-050 — Administrador de Conjunto ve los avisos de cada uno de sus conjuntos

<!--
  ¿Qué? Historia de usuario del issue #436: el Admin de Conjunto ve y gestiona
        los avisos conjunto por conjunto, dentro de la pestaña de cada uno.
  ¿Para qué? Antes los avisos de todos sus conjuntos (y los de la plataforma)
             vivían mezclados en una lista general arriba del panel, y con más
             de un conjunto no se sabía de un vistazo qué pasó en cuál. Además
             el panel los repartía por nombre del conjunto, así que dos
             conjuntos con el mismo nombre mezclaban sus avisos y contadores.
  ¿Impacto? Hasta ahora ninguna historia documentaba cómo el Admin de Conjunto
            ve sus avisos. No cambia lo que ven el Residente ni el Reciclador.
-->

---

## Identificación

| Campo              | Valor                                                    |
| ------------------ | ---------------------------------------------------------- |
| **ID**             | HU-050                                                      |
| **Título**         | Administrador de Conjunto ve los avisos de cada uno de sus conjuntos |
| **Módulo**         | Notificaciones                                              |
| **Prioridad**      | Media                                                        |
| **Estado**         | Implementada                                                |
| **RF asociados**   | RQF-003, RQF-006                                            |

---

## Historia

**Como** Administrador de Conjunto,
**quiero** ver y gestionar los avisos de cada uno de mis conjuntos dentro de ese conjunto, con un contador de los que no he leído,
**para** saber de un vistazo qué pasó en cuál conjunto, sin que se mezclen los avisos de uno con los de otro.

---

## Criterios de aceptación

### CA-050.1 — Campana con contador en cada conjunto

- **Dado que** administro varios conjuntos y uno tiene avisos sin leer,
- **cuando** miro la lista "Mis conjuntos",
- **entonces** la cabecera de ese conjunto muestra una campana con el número de avisos sin leer de ese conjunto; si no tiene ninguno sin leer, no muestra contador.

### CA-050.2 — Cada conjunto muestra solo sus avisos

- **Dado que** un aviso pertenece a un conjunto,
- **cuando** despliego otro conjunto,
- **entonces** no veo ese aviso en el otro, ni siquiera si los dos conjuntos tienen exactamente el mismo nombre (los avisos se relacionan con su conjunto por identificador, no por nombre).

### CA-050.3 — Acciones solo sobre ese conjunto

- **Dado que** tengo avisos leídos y sin leer en dos conjuntos,
- **cuando** en uno de ellos marco un aviso como leído, uso "Marcar leídas" o uso "Limpiar leídas",
- **entonces** la acción afecta solo a los avisos de ese conjunto; los de los otros conjuntos quedan como estaban.

### CA-050.4 — Sin lista general arriba

- **Dado que** entro a mi panel,
- **cuando** lo miro de arriba hacia abajo,
- **entonces** no hay una lista general de avisos: los de cada conjunto solo aparecen dentro de su pestaña. Arriba solo quedan los avisos que piden una acción (resultado de auditoría, RQF-009) y la desvinculación aprobada (ver CA-050.5).

### CA-050.5 — Desvinculación aprobada

- **Dado que** el Administrador del Sistema aprobó mi desvinculación de un conjunto (RQF-016),
- **cuando** entro a mi panel,
- **entonces** veo ese aviso en un banner arriba (porque ya no administro ese conjunto y no tengo pestaña donde mostrarlo) y desaparece al presionar "Entendido".

### CA-050.6 — Avisos de la plataforma

- **Dado que** el equipo de VerdeApp publicó una novedad general (RQF-015),
- **cuando** quiero leerla,
- **entonces** la encuentro en Soporte técnico → "Avisos del sistema", que no cambia con esta historia.

### CA-050.7 — Todas las notificaciones, en la campanita

- **Dado que** tengo notificaciones (las de un conjunto y las de toda la plataforma, como una novedad o la respuesta a una consulta de soporte),
- **cuando** toco la campanita del encabezado,
- **entonces** se abre un menú con todas, cada una con su ícono, el conjunto (o "VerdeApp" si es de la plataforma), cuándo ocurrió y si es nueva o leída; desde ahí puedo marcarlas como leídas, marcar todas y limpiar las leídas (issue #516).
- **y** el número rojo de la campanita cuenta todas las no leídas, también las que no pertenecen a ninguno de mis conjuntos.
