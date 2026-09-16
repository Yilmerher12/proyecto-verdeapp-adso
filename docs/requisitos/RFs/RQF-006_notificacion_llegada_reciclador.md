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

| Campo         | Tipo   | Obligatorio | Validaciones                                                                 |
| ------------- | ------ | ----------- | ---------------------------------------------------------------------------- |
| `conjunto_id` | Número | Sí          | Debe ser un ID válido, y el reciclador debe estar autorizado en ese conjunto.|

---

## Proceso

1. El usuario con rol **Reciclador** llega físicamente a un conjunto residencial.
2. Ingresa a la aplicación y presiona el botón "Llegada al conjunto".
3. El frontend envía una petición `POST` al backend con el `conjunto_id` correspondiente.
4. El backend valida el token JWT del reciclador para verificar su identidad y su vinculación con el conjunto.
5. El backend consulta la base de datos para obtener todos los usuarios con rol **Residente** asociados a ese `conjunto_id`.
6. El sistema despacha una notificación (ej. Firebase Cloud Messaging o WebSockets) a los dispositivos de los residentes encontrados.
7. El sistema registra el evento de llegada en la base de datos para fines de auditoría/historial.
8. Mientras el reciclador está marcado como presente en ese conjunto (ver RN-004), puede usar `SHUT_LLENO`/`SHUT_LIBRE` (RQF-003) y, al terminar, enviar `FINALIZACION_RECICLADOR` con el mismo botón "Enviar notificación" — el backend le avisa a los mismos residentes/administrador que el reciclador ya se retiró, y lo vuelve a marcar como "no presente" (puede avisar una nueva llegada).

---

## Salidas

| Escenario           | Código HTTP | Respuesta                                                                                                    |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| Notificación exitosa| 200         | `{"message": "Notificación de llegada enviada a los residentes."}`                                           |
| Error de permisos   | 403         | `{"detail": "El reciclador no tiene permisos en este conjunto."}`                                            |

---

## Endpoints asociados

> **Nota (2026-08-28)**: en la implementación real no hay una ruta dedicada a "llegada" — se reutiliza el endpoint genérico de notificaciones, con `tipo=LLEGADA_RECICLADOR` en el cuerpo del request. Lo mismo aplica a `FINALIZACION_RECICLADOR` (nota agregada 2026-09-16).

| Método | Ruta                              | Auth requerida | Descripción                                      |
| ------ | --------------------------------- | -------------- | ------------------------------------------------ |
| POST   | `/api/v1/notificaciones/enviar`   | Sí (Reciclador)| Dispara la notificación (`tipo=LLEGADA_RECICLADOR` o `tipo=FINALIZACION_RECICLADOR`) |

---

## Reglas de negocio

- RN-001: La acción de 'Llegada al conjunto' está restringida exclusivamente a usuarios con el rol `reciclador`. **Implementado.**
- RN-002: Las notificaciones solo se envían a los residentes que pertenecen exactamente al mismo `conjunto_id` desde donde el reciclador detona la alerta (y también al Administrador de Conjunto). **Implementado.**
- RN-003: Debe existir un bloqueo temporal (cooldown) para evitar que un reciclador envíe múltiples notificaciones de llegada repetidas en un lapso corto (ej. máximo 1 notificación por conjunto cada 2 horas). **Implementado (2026-08-29).**
- RN-004: Control de presencia — un reciclador no puede avisar `LLEGADA_RECICLADOR` si ya está marcado como presente en ese conjunto (debe avisar `FINALIZACION_RECICLADOR` primero); y no puede usar `SHUT_LLENO`, `SHUT_LIBRE` ni `FINALIZACION_RECICLADOR` sin haber avisado su llegada antes. Avisar la finalización vuelve a marcarlo como "no presente". **Implementado (2026-09-16, agregado a la documentación — la lógica ya existía en código).**
