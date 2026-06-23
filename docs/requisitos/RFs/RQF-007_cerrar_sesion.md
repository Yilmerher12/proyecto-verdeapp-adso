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

El sistema debe mostrar un modal de confirmación antes de cerrar la sesión. Al confirmar, elimina los tokens del almacenamiento de sesión del navegador y redirige al usuario.

---

## Entradas

| Campo           | Tipo   | Obligatorio | Validaciones                                                                 |
| --------------- | ------ | ----------- | ---------------------------------------------------------------------------- |
| `Authorization` | Header | Sí          | Debe contener el Bearer token JWT válido de la sesión actual.                |

---

## Proceso

1. El usuario hace clic en "Cerrar sesión" en el sidebar de la aplicación.
2. El frontend muestra un modal de confirmación ("¿Cerrar sesión? Sí / Cancelar").
3. Si el usuario cancela, el modal se cierra y la sesión continúa.
4. Si el usuario confirma, el frontend elimina `access_token` y `refresh_token` del `sessionStorage` y limpia el estado global de autenticación (React Context).
5. El frontend redirige al usuario fuera de las rutas protegidas.

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
