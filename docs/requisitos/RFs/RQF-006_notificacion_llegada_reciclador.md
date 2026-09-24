# RQF-006 — Notificación llegada del reciclador al conjunto

<!--
  ¿Qué? Requisito funcional para notificar a los residentes sobre la llegada del reciclador.
  ¿Para qué? Permitir que los residentes estén informados en tiempo real para coordinar la entrega directa si es necesario.
  ¿Impacto? Reduce tiempos de espera del reciclador y aumenta la tasa de recolección efectiva en el conjunto.
-->

---

## Identificación

| Campo         | Valor                                          |
| ------------- | ---------------------------------------------- |
| **ID** | RQF-006                                        |
| **Nombre** | Notificación llegada del reciclador al conjunto|
| **Módulo** | Notificaciones / Operación                     |
| **Prioridad** | Alta                                           |
| **Estado** | Implementado                                   |
| **Usuarios** | reciclador, residente                          |

---

## Descripción

El sistema debe enviar una notificación de 'Llegada al conjunto' a los Residentes vinculados al mismo ID de conjunto del Reciclador que detone la acción. El mismo mecanismo cubre también el aviso simétrico de 'Finalización' (`FINALIZACION_RECICLADOR`) — cuando el reciclador termina de separar y se retira, avisando a los mismos destinatarios que ya se fue.

---

## Entradas

> **Corrección (2026-09-24, issue #284)**: las tablas de Entradas, Proceso y Salidas describían el diseño original (campo `conjunto_id`, envío por Firebase o WebSockets, respuesta 200 con mensaje). Se actualizaron a lo que hace el código real: `NotificacionEnviarBody` en `be/app/schemas/notificacion.py` y `enviar_notificacion` en `be/app/services/notificaciones_service.py`.

| Campo                     | Tipo  | Obligatorio | Validaciones                                                                 |
| ------------------------- | ----- | ----------- | ---------------------------------------------------------------------------- |
| `tipo`                    | Texto | Sí          | `LLEGADA_RECICLADOR` o `FINALIZACION_RECICLADOR` (el mismo endpoint acepta también `SHUT_LLENO`/`SHUT_LIBRE`, ver RQF-003). |
| `id_conjunto_residencial` | UUID  | Sí          | El reciclador debe estar autorizado (sin revocar) en ese conjunto.          |

---

## Proceso

1. El usuario con rol **Reciclador** llega físicamente a un conjunto residencial.
2. En su panel presiona "Llegué al conjunto".
3. El frontend envía `POST /api/v1/notificaciones/enviar` con `tipo=LLEGADA_RECICLADOR` y el `id_conjunto_residencial`.
4. El backend valida el token del reciclador, que esté autorizado en ese conjunto, que no esté ya marcado como presente (RN-004) y que no haya avisado otra llegada allí en las últimas 2 horas (RN-003).
5. El backend obtiene los **Residentes** y el **Admin de Conjunto** de ese conjunto.
6. Se guarda una notificación en la base de datos para cada uno de ellos (tabla de notificaciones). No hay envío por Firebase ni WebSockets: la app de cada usuario consulta sus notificaciones cada cierto tiempo (`fe/src/hooks/usePolling.ts`) y la muestra en la campana.
7. Esa misma notificación queda como registro de la llegada: el backend la usa para saber si el reciclador está presente.
8. Mientras el reciclador está marcado como presente en ese conjunto (ver RN-004), puede usar `SHUT_LLENO`/`SHUT_LIBRE` (RQF-003) y, al terminar, enviar `FINALIZACION_RECICLADOR` con el mismo botón "Enviar notificación" — el backend le avisa a los mismos residentes/administrador que el reciclador ya se retiró, y lo vuelve a marcar como "no presente" (puede avisar una nueva llegada).

---

## Salidas

| Escenario           | Código HTTP | Respuesta                                                                                                    |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| Notificación exitosa| 201         | `{"ok": true, "destinatarios": <cantidad de usuarios notificados>}`                                          |
| Sin `id_conjunto_residencial` | 400 | `{"detail": "Se requiere id_conjunto_residencial."}`                                                     |
| No autorizado en el conjunto | 403 | `{"detail": "No estás autorizado en este conjunto."}`                                                      |
| Ya está presente (RN-004) | 400    | `{"detail": "Ya avisaste tu llegada a este conjunto — avisa que ya te vas antes de volver a llegar."}`       |
| Llegada hace menos de 2 h (RN-003) | 400 | `{"detail": "Ya reportaste tu llegada a este conjunto hace menos de 2 horas."}`                      |
| Finalización sin llegada (RN-004) | 400 | `{"detail": "Debes avisar tu llegada a este conjunto antes de usar esta notificación."}`              |

---

## Endpoints asociados

> **Nota (2026-08-28)**: en la implementación real no hay una ruta dedicada a "llegada" — se reutiliza el endpoint genérico de notificaciones, con `tipo=LLEGADA_RECICLADOR` en el cuerpo del request. Lo mismo aplica a `FINALIZACION_RECICLADOR` (nota agregada 2026-09-16).

| Método | Ruta                              | Auth requerida | Descripción                                      |
| ------ | --------------------------------- | -------------- | ------------------------------------------------ |
| POST   | `/api/v1/notificaciones/enviar`   | Sí (Reciclador)| Dispara la notificación (`tipo=LLEGADA_RECICLADOR` o `tipo=FINALIZACION_RECICLADOR`) |

---

## Reglas de negocio

- RN-001: La acción de 'Llegada al conjunto' está restringida exclusivamente a usuarios con el rol `reciclador`. **Implementado.**
- RN-002: Las notificaciones solo se envían a los residentes que pertenecen exactamente al mismo conjunto (`id_conjunto_residencial`) desde donde el reciclador detona la alerta (y también al Administrador de Conjunto). **Implementado.**
- RN-003: Debe existir un bloqueo temporal (cooldown) para evitar que un reciclador envíe múltiples notificaciones de llegada repetidas en un lapso corto (ej. máximo 1 notificación por conjunto cada 2 horas). **Implementado (2026-08-29).**
- RN-004: Control de presencia — un reciclador no puede avisar `LLEGADA_RECICLADOR` si ya está marcado como presente en ese conjunto (debe avisar `FINALIZACION_RECICLADOR` primero); y no puede usar `SHUT_LLENO`, `SHUT_LIBRE` ni `FINALIZACION_RECICLADOR` sin haber avisado su llegada antes. Avisar la finalización vuelve a marcarlo como "no presente". **Implementado (2026-09-16, agregado a la documentación — la lógica ya existía en código).**
