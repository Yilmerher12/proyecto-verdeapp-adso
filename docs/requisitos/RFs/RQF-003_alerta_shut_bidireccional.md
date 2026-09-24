# RQF-003 — Alerta SHUT Bidireccional

<!--
  ¿Qué? Requisito funcional que define las notificaciones entre residentes y recicladores sobre el estado del depósito (SHUT).
  ¿Para qué? Coordinar la recolección de residuos de forma oportuna y evitar la acumulación excesiva.
  ¿Impacto? Optimiza el tiempo del reciclador y mantiene la limpieza del conjunto residencial.
-->

---

## Identificación

| Campo         | Valor                   |
| ------------- | ----------------------- |
| **ID** | RQF-003                 |
| **Nombre** | Alerta SHUT Bidireccional|
| **Módulo** | Notificaciones          |
| **Prioridad** | Alta                    |
| **Estado** | Implementado            |
| **Usuarios** | reciclador, residente   |

---

## Descripción

El sistema debe permitir al 'Residente' notificar que el SHUT está lleno y al 'Reciclador' notificar que el SHUT ha sido vaciado. Ambas acciones deben disparar notificaciones exclusivas a los usuarios del rol opuesto dentro del mismo conjunto.

---

## Entradas

> **Corrección (2026-09-24, issue #284)**: las tablas de Entradas, Proceso y Salidas describían el diseño original (campos `conjunto_id`/`accion`, una columna de "estado del SHUT", respuesta 200 con mensaje). Se actualizaron a lo que hace el código real: `NotificacionEnviarBody` en `be/app/schemas/notificacion.py` y `enviar_notificacion` en `be/app/services/notificaciones_service.py`.

| Campo                     | Tipo | Obligatorio | Validaciones                                                                 |
| ------------------------- | ---- | ----------- | ---------------------------------------------------------------------------- |
| `tipo`                    | Texto | Sí         | `SHUT_LLENO` o `SHUT_LIBRE` (el mismo endpoint acepta también los tipos de RQF-006). El Residente solo puede enviar `SHUT_LLENO`. |
| `id_conjunto_residencial` | UUID | Solo Reciclador | El Residente no lo envía: se toma de su propia unidad. El Reciclador debe estar autorizado (sin revocar) en ese conjunto. |

---

## Proceso

1. Un **Residente** presiona el botón "Reportar" (SHUT lleno) en su panel.
2. El frontend envía `POST /api/v1/notificaciones/enviar` con `tipo=SHUT_LLENO`.
3. El backend busca el conjunto del residente y revisa que el SHUT no esté ya reportado como lleno (RN-001).
4. Se crea una notificación para los **Recicladores** y el **Admin de Conjunto** de ese conjunto.
5. Posteriormente, un **Reciclador** con su llegada avisada (RQF-006) recoge los residuos y envía `tipo=SHUT_LIBRE` con el `id_conjunto_residencial`.
6. El backend revisa que esté autorizado y presente en el conjunto, y que el SHUT esté reportado como lleno.
7. Se crea una notificación para los **Residentes** y el **Admin de Conjunto** de ese conjunto.

El "estado del SHUT" no es una columna aparte: es el tipo del **último** aviso `SHUT_LLENO`/`SHUT_LIBRE` del conjunto. `GET /api/v1/notificaciones/estado-shut` lo consulta.

---

## Salidas

| Escenario                                   | Código HTTP | Respuesta                                                                           |
| ------------------------------------------- | ----------- | ----------------------------------------------------------------------------------- |
| Aviso enviado                               | 201         | `{"ok": true, "destinatarios": <cantidad de usuarios notificados>}`                 |
| Residente intenta enviar otro tipo          | 403         | `{"detail": "El residente solo puede enviar SHUT_LLENO."}`                          |
| Residente sin conjunto                      | 404         | `{"detail": "No se encontró el conjunto del residente."}`                           |
| SHUT ya reportado lleno (Residente)         | 400         | `{"detail": "El SHUT de tu conjunto ya está reportado como lleno."}`                |
| Reciclador sin `id_conjunto_residencial`    | 400         | `{"detail": "Se requiere id_conjunto_residencial."}`                                |
| Reciclador no autorizado en el conjunto     | 403         | `{"detail": "No estás autorizado en este conjunto."}`                               |
| Reciclador sin avisar su llegada            | 400         | `{"detail": "Debes avisar tu llegada a este conjunto antes de usar esta notificación."}` |
| SHUT ya lleno / ya libre (Reciclador)       | 400         | `{"detail": "El SHUT de este conjunto ya está reportado como lleno."}` / `"...como libre."` |

---

## Endpoints asociados

> **Nota (2026-08-28)**: la ruta real es genérica para todos los tipos de notificación, no una ruta dedicada `/alertas/shut`.

| Método | Ruta                              | Auth requerida | Descripción                                      |
| ------ | --------------------------------- | -------------- | ------------------------------------------------ |
| POST   | `/api/v1/notificaciones/enviar`   | Sí             | Emite la alerta (`tipo=SHUT_LLENO` o `SHUT_LIBRE`) |
| GET    | `/api/v1/notificaciones/estado-shut` | Sí (Residente) | Consulta si el SHUT de su conjunto está lleno o no |

---

## Reglas de negocio

- RN-001: Un residente no puede enviar la alerta "SHUT Lleno" si el estado actual del SHUT ya es "lleno". **Implementado (2026-08-29).**
- RN-002: Las notificaciones solo deben llegar a los usuarios del rol opuesto que pertenezcan estrictamente al mismo conjunto residencial, más el Admin de Conjunto de ese conjunto (corregido 2026-09-24: el código siempre incluyó al Admin de Conjunto, ver `admins_del_conjunto`). **Implementado.**
