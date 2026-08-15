# HU-004 — Reciclador reporta SHUT vaciado

<!--
  ¿Qué? Historia de usuario para que el reciclador avise que ya vació el SHUT.
  ¿Para qué? Que los residentes sepan que ya pueden volver a usarlo con confianza.
  ¿Impacto? Cierra el ciclo de la alerta bidireccional del SHUT (HU-003 es la otra mitad).
-->

---

## Identificación

| Campo             | Valor                            |
| ------------------ | --------------------------------- |
| **ID**             | HU-004                             |
| **Título**         | Reciclador reporta SHUT vaciado    |
| **Módulo**         | Notificaciones                     |
| **Prioridad**      | Alta                                |
| **Estado**         | Implementada                        |
| **RF asociados**   | RQF-003                            |

---

## Historia

**Como** reciclador,
**quiero** reportar que ya vacié el SHUT de un conjunto,
**para** que los residentes de ese conjunto sepan que ya está libre y pueden volver a bajar material.

---

## Criterios de aceptación

### CA-004.1 — Botón visible de reporte

- **Dado que** estoy en mi panel de Reciclador,
- **cuando** lo veo,
- **entonces** debe haber una acción clara para reportar "SHUT vaciado" en un conjunto donde estoy autorizado.

### CA-004.2 — Solo conjuntos autorizados

- **Dado que** intento reportar el vaciado de un SHUT,
- **cuando** el conjunto no es uno donde estoy autorizado como reciclador,
- **entonces** el sistema debe rechazar la acción.

### CA-004.3 — Notificación a los residentes del conjunto

- **Dado que** reporté el SHUT vaciado,
- **cuando** el reporte se procesa,
- **entonces** solo los residentes de ese mismo conjunto deben recibir la notificación de que ya está libre.

### CA-004.4 — Confirmación visual al reciclador

- **Dado que** reporté el vaciado exitosamente,
- **cuando** el sistema procesa mi reporte,
- **entonces** debo ver una confirmación en pantalla.
