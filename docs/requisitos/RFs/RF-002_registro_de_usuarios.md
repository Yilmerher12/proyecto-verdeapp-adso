# RQF-002 — Registro de Usuarios

<!--
  ¿Qué? Requisito funcional que define el proceso de inscripción para residentes y recicladores.
  ¿Para qué? Documentar formalmente la funcionalidad de creación de cuentas asignando el rol correspondiente.
  ¿Impacto? Sin este requisito, el sistema no tendría usuarios diferenciados para operar la lógica de negocio.
-->

---

## Identificación

| Campo         | Valor               |
| ------------- | ------------------- |
| **ID** | RQF-002             |
| **Nombre** | Registro de Usuarios|
| **Módulo** | Autenticación       |
| **Prioridad** | Alta                |
| **Estado** | Implementado        |
| **Usuarios** | residente, reciclador |

> **Nota (2026-09-08)**: el campo "Usuarios" antes incluía `admin_conjunto` por error — ese rol **nunca** se crea por registro público (RN-001 de este mismo documento ya lo dejaba claro, sin que el campo de arriba fuera consistente con eso). Un Admin de Conjunto solo se origina por invitación del Admin Sistema, ver RQF-012.

---

## Descripción

El sistema debe registrar los datos del usuario (nombre, correo, contraseña, rol) y enviar un correo electrónico con un enlace de verificación para activar la cuenta en la base de datos. Adicionalmente, un Residente debe aportar el `código de acceso` real de su conjunto (issue #168) — sin eso, cualquiera podía declarar pertenecer a cualquier conjunto sin ninguna verificación.

---

## Entradas

| Campo       | Tipo          | Obligatorio | Validaciones                                                                 |
| ----------- | ------------- | ----------- | ---------------------------------------------------------------------------- |
| `nombre`    | Texto         | Sí          | Mínimo 2 caracteres, máximo 255                                              |
| `apellidos` | Texto         | Sí          | Mínimo 2 caracteres, máximo 255                                              |
| `numero_telefonico` | Texto | No          | Solo números, entre 7 y 10 caracteres (si se indica)                         |
| `correo`    | Texto (email) | Sí          | Formato válido, máximo 255 caracteres, único en BD                           |
| `contraseña`| Texto         | Sí          | Mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número, 1 carácter especial (`!@#$%^&*...`) |
| `rol`       | Enum          | Sí          | Valores permitidos: `residente`, `reciclador`                                |
| `codigo_acceso` | Texto     | Sí, solo si `rol = residente` | Debe coincidir con el código de acceso vigente del conjunto indicado |

---

## Proceso

1. El usuario selecciona su rol deseado y completa el formulario de registro con nombre, correo y contraseña.
2. El frontend valida los formatos y envía la petición al backend.
3. El backend verifica que el correo electrónico no esté en uso.
4. Se aplica la función de hash (bcrypt) a la contraseña.
5. Se inserta el nuevo usuario en la base de datos con estado inactivo o pendiente de verificación.
6. El sistema genera un token de verificación único asociado al correo.
7. Se dispara un servicio de envío de correos (ej. Resend, SMTP) enviando el enlace de activación.
8. El sistema informa al usuario en pantalla que debe revisar su bandeja de entrada.

---

## Salidas

| Escenario           | Código HTTP | Respuesta                                                                                                    |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| Registro exitoso    | 201         | Mensaje de confirmación: `{"message": "Usuario registrado. Verifique su correo."}`                           |
| Email duplicado     | 400         | Mensaje de error: `{"detail": "El correo ya está registrado."}`                                              |
| Datos inválidos     | 422         | Detalle de los errores en los campos (ej. contraseña débil)                                                  |

---

## Endpoints asociados

| Método | Ruta                     | Auth requerida | Descripción                                  |
| ------ | ------------------------ | -------------- | -------------------------------------------- |
| POST   | `/api/v1/auth/register`  | No             | Crea la cuenta y envía email de verificación |

---

## Reglas de negocio

- RN-001: Todo nuevo usuario debe ser asignado obligatoriamente a un rol válido (`residente` o `reciclador`).
- RN-002: La cuenta no podrá iniciar sesión (RQF-001) hasta que el enlace de verificación del correo sea visitado.
- RN-003: El token del correo de verificación tiene una validez de 24 horas.
- RN-004: Un Residente solo puede registrarse aportando el `código de acceso` real y vigente de su conjunto (issue #168) — el Admin de Conjunto lo reparte fuera de la app (cartelera, grupo del conjunto). Si el Admin de Conjunto lo regenera (RQF-012/HU-044), el código anterior deja de servir de inmediato.
