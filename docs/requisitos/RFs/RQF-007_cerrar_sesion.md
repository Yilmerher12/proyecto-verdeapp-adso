# RQF-007 — Cerrar sesión

<!--
  ¿Qué? Requisito funcional que define el proceso de cierre de sesión seguro.
  ¿Para qué? Garantizar que los tokens de acceso queden invalidados y proteger la cuenta del usuario.
  ¿Impacto? Esencial para la seguridad de la información y la gestión del ciclo de vida de la sesión.
-->

---

## Identificación

| Campo         | Valor               |
| ------------- | ------------------- |
| **ID** | RQF-007             |
| **Nombre** | Cerrar sesión       |
| **Módulo** | Autenticación       |
| **Prioridad** | Alta                |
| **Estado** | Implementado        |
| **Usuarios** | reciclador, residente, administrador, admin_conjunto |

---

## Descripción

El sistema debe mostrar un modal de confirmación antes de cerrar la sesión. Al confirmar, invalida los tokens en el servidor, los elimina del almacenamiento de sesión del navegador, y redirige al usuario.

---

## Entradas

| Campo           | Tipo   | Obligatorio | Validaciones                                                                 |
| --------------- | ------ | ----------- | ---------------------------------------------------------------------------- |
| `Authorization` | Header | Sí          | Debe contener el Bearer token JWT válido de la sesión actual.                |
| `refresh_token` | Texto (body) | Sí    | El refresh token de la misma sesión, para revocarlo también.                 |

---

## Proceso

1. El usuario hace clic en "Cerrar sesión" en el sidebar de la aplicación.
2. El frontend muestra un modal de confirmación ("¿Cerrar sesión? Sí / Cancelar").
3. Si el usuario cancela, el modal se cierra y la sesión continúa.
4. Si el usuario confirma, el frontend llama a `POST /api/v1/auth/logout` (access token en el header, refresh token en el body).
5. El backend guarda el "jti" (identificador único) de ambos tokens en la tabla `tokens_revocados` — una lista negra que cualquier request futuro revisa antes de aceptar un token.
6. El frontend elimina `access_token` y `refresh_token` del `sessionStorage` y redirige al usuario fuera de las rutas protegidas.

> **Nota (2026-08-28)**: el paso 4 está envuelto en un `try/catch` a propósito en el frontend (`AppShell.tsx`) — si el servidor no responde (sin red, caído), el usuario igual puede cerrar sesión localmente. La invalidación en el servidor es una capa adicional de seguridad, no un bloqueo del flujo normal.

---

## Salidas

| Escenario                          | Código HTTP | Respuesta                                              |
| ----------------------------------- | ----------- | ------------------------------------------------------- |
| Logout exitoso                      | 200         | `{"message": "Sesión cerrada correctamente"}`            |
| Sin token de acceso válido          | 401         | `{"detail": "No se pudieron validar las credenciales"}`  |

---

## Endpoints asociados

| Método | Ruta                    | Auth requerida | Descripción                                              |
| ------ | ----------------------- | -------------- | --------------------------------------------------------- |
| POST   | `/api/v1/auth/logout`   | Sí             | Revoca el access token y el refresh token de la sesión.    |

> **Nota (2026-08-28)**: implementado. Antes esta tabla describía un endpoint planeado que nunca se había construido — ahora existe de verdad (`be/app/routers/auth.py`).

---

## Reglas de negocio

- RN-001: Una vez cerrada la sesión, cualquier intento de usar el mismo token JWT debe ser rechazado con error 401. **Implementado y verificado**: `get_current_user` (backend) revisa el "jti" del token contra la tabla `tokens_revocados` en cada request; `refresh_access_token` hace lo mismo con el refresh token. Se comprobó con curl contra el servidor real, reutilizando el token exacto de una sesión recién cerrada — ambos casos devuelven 401. Solo se invalida el token de ESA sesión puntual, no todas las sesiones del usuario en otros dispositivos (verificado con test dedicado).
- RN-002: El frontend debe asegurar la eliminación de los datos de la sesión local incluso si el backend falla en responder. **Implementado**: la llamada a `/auth/logout` está envuelta en `try/catch` — un fallo de red no impide que se borren los tokens del navegador.
