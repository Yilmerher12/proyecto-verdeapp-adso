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
| **Estado** | Por implementar                                |
| **Usuarios** | reciclador, residente                          |

---

## Descripción

El sistema debe enviar una notificación de 'Llegada al conjunto' a los Residentes vinculados al mismo ID de conjunto del Reciclador que detone la acción.

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

---

## Salidas

| Escenario           | Código HTTP | Respuesta                                                                                                    |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| Notificación exitosa| 200         | `{"message": "Notificación de llegada enviada a los residentes."}`                                           |
| Error de permisos   | 403         | `{"detail": "El reciclador no tiene permisos en este conjunto."}`                                            |

---

## Endpoints asociados

| Método | Ruta                              | Auth requerida | Descripción                                      |
| ------ | --------------------------------- | -------------- | ------------------------------------------------ |
| POST   | `/api/v1/notificaciones/llegada`  | Sí (Reciclador)| Dispara la notificación de llegada               |

---

## Reglas de negocio

- RN-001: La acción de 'Llegada al conjunto' está restringida exclusivamente a usuarios con el rol `reciclador`.
- RN-002: Las notificaciones solo se envían a los residentes que pertenecen exactamente al mismo `conjunto_id` desde donde el reciclador detona la alerta.
- RN-003: Debe existir un bloqueo temporal (cooldown) para evitar que un reciclador envíe múltiples notificaciones de llegada repetidas en un lapso corto (ej. máximo 1 notificación por conjunto cada 2 horas).
