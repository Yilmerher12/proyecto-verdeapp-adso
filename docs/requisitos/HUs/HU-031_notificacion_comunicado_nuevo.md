# HU-031 — Residente/Reciclador recibe notificación de comunicado nuevo

<!--
  ¿Qué? Historia de usuario para avisar de inmediato cuando se publica un comunicado.
  ¿Para qué? Que la gente se entere sin tener que revisar el feed manualmente todo el tiempo.
  ¿Impacto? Aumenta la efectividad real de los comunicados urgentes.
-->

---

## Identificación

| Campo             | Valor                                                                   |
| ------------------ | ---------------------------------------------------------------------------|
| **ID**             | HU-031                                                                       |
| **Título**         | Residente/Reciclador recibe notificación de comunicado nuevo                    |
| **Módulo**         | Comunicación / Conjuntos                                                        |
| **Prioridad**      | Media                                                                             |
| **Estado**         | Implementada                                                                      |
| **RF asociados**   | RQF-014                                                                          |

---

## Historia

**Como** residente o reciclador,
**quiero** recibir una notificación cuando mi conjunto publica un comunicado nuevo,
**para** enterarme sin tener que revisar el feed manualmente cada rato.

---

## Criterios de aceptación

### CA-031.1 — Notificación al publicar

- **Dado que** el Admin de Conjunto publica un comunicado nuevo dirigido a mi rol,
- **cuando** se publica,
- **entonces** debo recibir una notificación.

### CA-031.2 — Solo destinatarios elegidos

- **Dado que** un comunicado se publicó solo para residentes,
- **cuando** se envían las notificaciones,
- **entonces** los recicladores del conjunto no deben recibir ninguna.

### CA-031.3 — La notificación lleva al comunicado

- **Dado que** recibo la notificación de un comunicado nuevo,
- **cuando** la abro,
- **entonces** debo llegar directamente al comunicado correspondiente en el feed.
