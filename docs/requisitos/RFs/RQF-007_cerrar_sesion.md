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
| **Estado** | Parcial             |
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

> **Nota (2026-08-28)**: no hay una llamada al backend en el cierre de sesión real — por eso no hay una fila de "salida HTTP" que documentar aquí. El cierre de sesión es 100% del lado del cliente (ver Proceso arriba, que ya describe esto correctamente).

---

## Endpoints asociados

**No existe ningún endpoint de logout en el backend** — confirmado revisando `be/app/routers/auth.py` completo. El cierre de sesión hoy es enteramente del lado del cliente (`AuthContext.tsx` borra `access_token`/`refresh_token` de `sessionStorage` y limpia el estado de React). La tabla original de este documento (`POST /api/v1/auth/logout`) describía un endpoint planeado que nunca se construyó.

---

## Reglas de negocio

- RN-001: Una vez cerrada la sesión, cualquier intento de usar el mismo token JWT debe ser rechazado con error 401. **No implementado** — sin un endpoint de logout que invalide el token en el servidor, un `access_token` sigue siendo válido hasta que expira naturalmente (15 minutos), aunque el usuario ya haya "cerrado sesión" en su navegador.
- RN-002: El frontend debe asegurar la eliminación de los datos de la sesión local incluso si el backend falla en responder. **Implementado** (y trivialmente cierto hoy, ya que no hay ninguna llamada al backend que pueda fallar).
