# HU-046 — Admin de Conjunto lleva la agenda de temas para el comité

<!--
  ¿Qué? Historia de usuario de la agenda interna del conjunto (RQF-020),
        que ya existía en código (commit 513c76d) sin documentarse.
  ¿Para qué? Escribir desde el punto de vista del Admin de Conjunto qué
             debe poder hacer y qué debe pasar en cada caso.
  ¿Impacto? Issue #368.
-->

---

## Identificación

| Campo             | Valor                                                    |
| ------------------ | --------------------------------------------------------- |
| **ID**             | HU-046                                                      |
| **Título**         | Admin de Conjunto lleva la agenda de temas para el comité   |
| **Módulo**         | Administración / Conjuntos                                   |
| **Prioridad**      | Baja                                                          |
| **Estado**         | Implementada                                                  |
| **RF asociados**   | RQF-020                                                      |

---

## Historia

**Como** Administrador de Conjunto,
**quiero** anotar los temas que me piden en el conjunto (con una foto si hace falta) y marcarlos como pendientes o en espera,
**para** no olvidar nada y llevarlos organizados a la reunión del comité.

---

## Criterios de aceptación

### CA-046.1 — Agregar un tema

- **Dado que** administro un conjunto,
- **cuando** abro "Agenda del conjunto" en el acordeón de ese conjunto, escribo un tema (máximo 1000 caracteres) y lo guardo,
- **entonces** el tema aparece en la lista como **Pendiente**. La foto de soporte es opcional.

### CA-046.2 — La agenda es privada

- **Dado que** agregué temas a la agenda de mi conjunto,
- **cuando** otro usuario usa la app (residente, reciclador, otro Admin de Conjunto o el Administrador del Sistema),
- **entonces** nadie más ve esos temas ni recibe notificaciones por ellos.

### CA-046.3 — Dejar en espera o volver a pendiente

- **Dado que** un tema se aplazó en el comité,
- **cuando** presiono "Dejar en espera",
- **entonces** el tema queda **En espera** y pasa después de los pendientes; con "Volver a pendiente" regresa al grupo de arriba.

### CA-046.4 — Eliminar un tema resuelto

- **Dado que** un tema ya se resolvió,
- **cuando** presiono "Eliminar tema",
- **entonces** el sistema me pide confirmar y, si confirmo, el tema se borra para siempre.

### CA-046.5 — Solo mis conjuntos

- **Dado que** no administro un conjunto,
- **cuando** intento ver o modificar su agenda (por ejemplo, llamando la API directamente),
- **entonces** el sistema responde 403 y no muestra ni cambia nada.

### CA-046.6 — Agenda vacía

- **Dado que** el conjunto todavía no tiene temas,
- **cuando** abro la agenda,
- **entonces** veo el mensaje "Todavía no hay temas en la agenda de este conjunto."
