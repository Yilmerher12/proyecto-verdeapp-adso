# HU-048 — Admin Sistema revisa la bandeja unificada de solicitudes pendientes

<!--
  ¿Qué? Historia de usuario de la bandeja "Solicitudes pendientes" del
        Administrador del Sistema (RQF-021), que junta desvinculaciones
        (RQF-016) y novedades enviadas. Ya existía en código (commit
        513c76d) sin documentarse.
  ¿Para qué? Dejar escrito qué ve el Admin Sistema y qué puede hacer con
             cada tipo de solicitud.
  ¿Impacto? Issue #368.
-->

---

## Identificación

| Campo             | Valor                                                    |
| ------------------ | --------------------------------------------------------- |
| **ID**             | HU-048                                                      |
| **Título**         | Admin Sistema revisa la bandeja unificada de solicitudes pendientes |
| **Módulo**         | Administración                                               |
| **Prioridad**      | Media                                                         |
| **Estado**         | Implementada                                                  |
| **RF asociados**   | RQF-021, RQF-016                                             |

---

## Historia

**Como** Administrador del Sistema,
**quiero** ver en un solo lugar todo lo que me piden o me cuentan los usuarios (desvinculaciones y novedades),
**para** atenderlo sin tener que revisar varias pantallas.

---

## Criterios de aceptación

### CA-048.1 — Resumen en el panel principal

- **Dado que** inicié sesión como Administrador del Sistema,
- **cuando** abro mi panel principal,
- **entonces** veo cuántas solicitudes pendientes hay y puedo abrir la bandeja "Solicitudes pendientes".

### CA-048.2 — Una sola lista, filtrable

- **Dado que** abrí la bandeja,
- **cuando** reviso la lista,
- **entonces** veo juntas las desvinculaciones sin resolver y las novedades nuevas, de la más reciente a la más antigua, y puedo filtrar por "Todas", "Desvinculación" o "Novedad".
- **y** si no hay nada, veo "No hay solicitudes pendientes." (o "Ninguna solicitud de este tipo por ahora." si hay un filtro activo).

### CA-048.3 — Datos del autor de una novedad

- **Dado que** en la bandeja hay una novedad,
- **cuando** la reviso,
- **entonces** veo el rol y nombre de quien la envió (si es Residente, también su torre y apartamento), el conjunto si aplica, el texto y, si trae imagen, un enlace "Ver foto".

### CA-048.4 — Marcar una novedad como vista

- **Dado que** leí una novedad,
- **cuando** presiono "Marcar como vista",
- **entonces** sale de la bandeja y su autor la ve como "Vista por el Admin del Sistema" en "Mis envíos". Una novedad no se aprueba ni se rechaza.

### CA-048.5 — Resolver una desvinculación

- **Dado que** en la bandeja hay una solicitud de desvinculación,
- **cuando** la apruebo o la rechazo,
- **entonces** se aplica el mismo flujo de siempre de RQF-016 (HU-023) y la solicitud sale de la bandeja.

### CA-048.6 — Solo el Administrador del Sistema

- **Dado que** no soy Administrador del Sistema,
- **cuando** intento ver o resolver la bandeja (por ejemplo, llamando la API directamente),
- **entonces** el sistema responde 403.
