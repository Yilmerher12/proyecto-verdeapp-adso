# HU-023 — Admin Sistema gestiona solicitudes de desvinculación

<!--
  ¿Qué? Historia de usuario para que el Admin Sistema apruebe o rechace desvinculaciones.
  ¿Para qué? Evitar que un conjunto quede sin administrador sin control humano.
  ¿Impacto? Completa el flujo de salida iniciado en HU-022.
-->

---

## Identificación

| Campo             | Valor                                              |
| ------------------ | ---------------------------------------------------------|
| **ID**             | HU-023                                                     |
| **Título**         | Admin Sistema gestiona solicitudes de desvinculación           |
| **Módulo**         | Administración / Conjuntos                                      |
| **Prioridad**      | Media                                                             |
| **Estado**         | Por implementar                                                    |
| **RF asociados**   | RQF-016                                                            |

---

## Historia

**Como** Admin Sistema,
**quiero** ver y resolver las solicitudes de desvinculación pendientes,
**para** mantener control sobre qué conjuntos quedan sin administrador y por qué.

---

## Criterios de aceptación

### CA-023.1 — Ver solicitudes pendientes

- **Dado que** hay solicitudes de desvinculación pendientes,
- **cuando** entro a mi panel,
- **entonces** debo poder verlas todas, con el conjunto, el Admin de Conjunto solicitante y el motivo (si lo hay).

### CA-023.2 — Aprobar una solicitud

- **Dado que** apruebo una solicitud,
- **cuando** confirmo,
- **entonces** el conjunto debe desvincularse de ese Admin de Conjunto, y ambos deben recibir notificación.

### CA-023.3 — Rechazar una solicitud

- **Dado que** rechazo una solicitud,
- **cuando** confirmo,
- **entonces** el Admin de Conjunto debe ser notificado con el motivo del rechazo, y sigue administrando el conjunto.
