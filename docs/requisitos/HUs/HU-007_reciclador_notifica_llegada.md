# HU-007 — Reciclador notifica su llegada al conjunto

<!--
  ¿Qué? Historia de usuario para que el reciclador avise que llegó físicamente al conjunto.
  ¿Para qué? Que los residentes puedan coordinar una entrega directa si lo necesitan.
  ¿Impacto? Reduce tiempos de espera y aumenta la recolección efectiva.
-->

---

## Identificación

| Campo             | Valor                                       |
| ------------------ | -------------------------------------------- |
| **ID**             | HU-007                                        |
| **Título**         | Reciclador notifica su llegada al conjunto    |
| **Módulo**         | Notificaciones / Operación                    |
| **Prioridad**      | Alta                                           |
| **Estado**         | Parcial                                        |
| **RF asociados**   | RQF-006                                       |

---

## Historia

**Como** reciclador,
**quiero** avisar con un botón que llegué a un conjunto,
**para** que los residentes se enteren y puedan bajar a entregarme material directamente si quieren.

---

## Criterios de aceptación

### CA-007.1 — Botón "Llegada al conjunto"

- **Dado que** estoy físicamente en un conjunto donde estoy autorizado,
- **cuando** abro mi panel,
- **entonces** debo encontrar un botón para reportar mi llegada a ese conjunto.

### CA-007.2 — Solo conjuntos autorizados

- **Dado que** intento reportar mi llegada,
- **cuando** el conjunto no es uno donde estoy autorizado,
- **entonces** el sistema debe rechazar la acción con un mensaje de permisos.

### CA-007.3 — Notificación a los residentes

- **Dado que** reporté mi llegada,
- **cuando** el reporte se procesa,
- **entonces** todos los residentes de ese conjunto deben recibir la notificación.

### CA-007.4 — Límite entre reportes (cooldown)

- **Dado que** ya reporté mi llegada a un conjunto hace menos de 2 horas,
- **cuando** intento reportarla de nuevo,
- **entonces** el sistema no debe permitir un segundo aviso tan seguido, para evitar notificaciones repetidas.

> **Nota (2026-08-28)**: este límite de 2 horas **no está implementado** — el backend acepta un aviso de "llegada" nuevo del mismo reciclador para el mismo conjunto sin ninguna restricción de tiempo. CA-007.1, CA-007.2 y CA-007.3 sí funcionan correctamente.
