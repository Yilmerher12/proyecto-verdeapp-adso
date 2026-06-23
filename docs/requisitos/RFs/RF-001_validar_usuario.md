# RQF-001 — Validar Usuario

<!--
  ¿Qué? Requisito funcional que define la validación de credenciales durante el inicio de sesión.
  ¿Para qué? Controlar el acceso al sistema y prevenir ataques de enumeración de usuarios.
  ¿Impacto? Asegura que solo usuarios autorizados accedan, protegiendo la privacidad de residentes y recicladores.
-->

---

## Identificación

| Campo         | Valor               |
| ------------- | ------------------- |
| **ID** | RQF-001             |
| **Nombre** | Validar Usuario     |
| **Módulo** | Autenticación       |
| **Prioridad** | Alta                |
| **Estado** | Implementado        |
| **Usuarios** | residente, reciclador, administrador, admin_conjunto |

---

## Descripción

El sistema debe bloquear el acceso y mostrar un mensaje de error genérico ('Credenciales incorrectas') cuando el usuario ingrese una contraseña que no coincida con el correo registrado en la base de datos.

---

## Entradas

| Campo       | Tipo          | Obligatorio | Validaciones                                                                 |
| ----------- | ------------- | ----------- | ---------------------------------------------------------------------------- |
| `email`     | Texto (email) | Sí          | Formato de email válido, máximo 255 caracteres                               |
| `password`  | Texto         | Sí          | Mínimo 8 caracteres                                                          |

---

## Proceso

1. El usuario (residente o reciclador) ingresa su correo electrónico y contraseña en la vista de inicio de sesión.
2. El frontend realiza validaciones básicas de formato y envía los datos al backend.
3. El backend busca el `email` en la base de datos de usuarios.
4. Si el correo existe, el backend verifica la `password` ingresada contra el hash almacenado utilizando bcrypt.
5. Si el correo no existe o la contraseña no coincide, el sistema rechaza la solicitud.
6. El backend retorna un código de error 401 sin especificar cuál de los dos campos falló.
7. El frontend intercepta el error y muestra una alerta genérica: "Credenciales incorrectas".

---

## Salidas

| Escenario           | Código HTTP | Respuesta                                                                                                    |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| Login exitoso       | 200         | Token de acceso JWT y datos básicos del usuario (`id`, `rol`, `email`)                                       |
| Error de validación | 401         | Mensaje de error genérico: `{"detail": "Credenciales incorrectas"}`                                          |
| Datos incompletos   | 422         | Detalle de errores de validación de los campos                                                               |

---

## Endpoints asociados

| Método | Ruta                  | Auth requerida | Descripción                                  |
| ------ | --------------------- | -------------- | -------------------------------------------- |
| POST   | `/api/v1/auth/login`  | No             | Autentica al usuario y retorna el token JWT  |

---

## Reglas de negocio

- RN-001: Bajo ninguna circunstancia el sistema debe revelar si un correo electrónico está o no registrado durante un intento fallido.
- RN-002: El mensaje de error debe ser estrictamente "Credenciales incorrectas".
- RN-003: Tras 5 intentos fallidos consecutivos, el sistema debe bloquear temporalmente el inicio de sesión para ese correo durante 15 minutos (mitigación de fuerza bruta).
