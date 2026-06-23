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
| **Estado** | Por implementar     |
| **Usuarios** | reciclador, residente|

---

## Descripción

El sistema debe invalidar el token de sesión activo del usuario y redirigirlo automáticamente a la vista de inicio de sesión.

---

## Entradas

| Campo           | Tipo   | Obligatorio | Validaciones                                                                 |
| --------------- | ------ | ----------- | ---------------------------------------------------------------------------- |
| `Authorization` | Header | Sí          | Debe contener el Bearer token JWT válido de la sesión actual.                |

---

## Proceso

1. El usuario hace clic en la opción "Cerrar sesión" en la interfaz.
2. El frontend (React) envía una petición `POST` al backend incluyendo el token JWT actual en los headers.
3. El backend (Spring Boot) recibe la petición, extrae el token y lo añade a una lista negra (blacklist) para evitar que sea re-utilizado hasta su expiración.
4. El backend responde con un código de éxito 200 OK.
5. El frontend elimina el token del almacenamiento local (Local Storage/Session Storage) y limpia el estado global.
6. El frontend redirige al usuario a la vista de login.

---

## Salidas

| Escenario           | Código HTTP | Respuesta                                                                                                    |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| Cierre exitoso      | 200         | `{"message": "Sesión cerrada correctamente."}`                                                               |
| Token inválido      | 401         | `{"detail": "Token no provisto o expirado."}`                                                                |

---

## Endpoints asociados

| Método | Ruta                  | Auth requerida | Descripción                                  |
| ------ | --------------------- | -------------- | -------------------------------------------- |
| POST   | `/api/v1/auth/logout` | Sí             | Invalida el token JWT activo                 |

---

## Reglas de negocio

- RN-001: Una vez cerrada la sesión, cualquier intento de usar el mismo token JWT debe ser rechazado con error 401.
- RN-002: El frontend debe asegurar la eliminación de los datos de la sesión local incluso si el backend falla en responder.
