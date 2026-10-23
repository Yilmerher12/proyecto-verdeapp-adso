# HU-048 — Admin Sistema atiende el soporte técnico y las desvinculaciones

<!--
  ¿Qué? Historia de usuario de la bandeja del Administrador del Sistema (RQF-021),
        que tiene dos pestañas: "Soporte técnico" (consultas que envían los
        usuarios) y "Desvinculaciones" (RQF-016). Nació como una sola lista
        unificada (commit 513c76d) y el issue #512 la separó.
  ¿Para qué? Dejar escrito qué ve el Admin Sistema y qué puede hacer con cada
             tipo de solicitud: prioridad, estado, respuesta al autor y filtros.
  ¿Impacto? Issues #368 y #512. El nombre del archivo no cambia para no romper
            los enlaces que ya apuntan a él.
-->

---

## Identificación

| Campo             | Valor                                                    |
| ------------------ | --------------------------------------------------------- |
| **ID**             | HU-048                                                      |
| **Título**         | Admin Sistema atiende el soporte técnico y las desvinculaciones |
| **Módulo**         | Administración                                               |
| **Prioridad**      | Media                                                         |
| **Estado**         | Implementada                                                  |
| **RF asociados**   | RQF-021, RQF-016                                             |

---

## Historia

**Como** Administrador del Sistema,
**quiero** ver por separado las consultas de soporte de los usuarios y las desvinculaciones, y saber de cada consulta qué tan urgente es y en qué paso va,
**para** atender primero lo más importante y responderle a quien escribió.

---

## Criterios de aceptación

### CA-048.1 — Resumen en el panel principal

- **Dado que** inicié sesión como Administrador del Sistema,
- **cuando** abro mi panel principal,
- **entonces** veo cuántas solicitudes pendientes hay (consultas de soporte sin resolver más desvinculaciones) y puedo abrir la bandeja.

### CA-048.2 — Dos pestañas

- **Dado que** abrí la bandeja,
- **cuando** la reviso,
- **entonces** veo dos pestañas: **"Soporte técnico"** y **"Desvinculaciones"**, cada una con su número de pendientes.

### CA-048.3 — Prioridad y estado de cada consulta

- **Dado que** estoy en "Soporte técnico",
- **cuando** reviso la lista,
- **entonces** cada consulta muestra su **prioridad** (Alta, Media o Baja) y su **estado** (Nueva, En revisión o Resuelta), y las de prioridad Alta salen primero; dentro de la misma prioridad, la más reciente primero.
- **y** la prioridad la calculó el sistema según el motivo que eligió el autor; el autor no la escoge.

### CA-048.4 — Filtros

- **Dado que** estoy en "Soporte técnico",
- **cuando** elijo un estado (Pendientes, Nuevas, En revisión o Resueltas) y/o una prioridad,
- **entonces** la lista muestra solo lo que coincide. Por defecto veo **Pendientes** (Nuevas y En revisión); **Resueltas** muestra el historial de lo ya atendido.
- **y** si no hay nada, veo "Todavía no hay consultas de soporte pendientes." (o "Ninguna consulta coincide con estos filtros por ahora." si hay un filtro activo).

### CA-048.5 — Datos del autor

- **Dado que** en la bandeja hay una consulta,
- **cuando** la reviso,
- **entonces** veo el rol y nombre de quien la envió (si es Residente, también su torre y apartamento), el conjunto si aplica, el texto y, si trae imagen, un enlace "Ver foto".

### CA-048.6 — Cambiar estado y prioridad

- **Dado que** estoy revisando una consulta,
- **cuando** presiono "Marcar en revisión", "Marcar como resuelta" o "Reabrir", o elijo otra prioridad en el selector,
- **entonces** el cambio se guarda y la lista se actualiza. Una consulta resuelta sale de "Pendientes" y se ve en "Resueltas".

### CA-048.7 — Responderle al autor

- **Dado que** estoy revisando una consulta,
- **cuando** escribo una respuesta (máximo 1000 caracteres) y presiono "Enviar respuesta",
- **entonces** la consulta queda **Resuelta** (salvo que indique otro estado), el autor recibe una notificación y ve la respuesta en su "Historial de novedades". Puedo cambiarla después con "Cambiar respuesta".

### CA-048.8 — Resolver una desvinculación

- **Dado que** estoy en "Desvinculaciones",
- **cuando** apruebo o rechazo una solicitud (el rechazo exige motivo),
- **entonces** se aplica el mismo flujo de siempre de RQF-016 (HU-023) y la solicitud sale de la lista. Las desvinculaciones no tienen prioridad ni respuesta.

### CA-048.9 — Solo el Administrador del Sistema

- **Dado que** no soy Administrador del Sistema,
- **cuando** intento ver o atender el soporte técnico (por ejemplo, llamando la API directamente),
- **entonces** el sistema responde 403.
