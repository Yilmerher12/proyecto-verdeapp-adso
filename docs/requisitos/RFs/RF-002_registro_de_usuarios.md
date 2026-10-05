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
| `nombre`    | Texto         | Sí          | Mínimo 2 y máximo 100 caracteres. Solo letras (con tildes y ñ), con espacio, apóstrofe, punto o guion como separadores; empieza con letra |
| `apellidos` | Texto         | Sí          | Igual que `nombre`, máximo 150 caracteres                                    |
| `numero_telefonico` | Texto | No          | Solo números, entre 7 y 10 caracteres (si se indica)                         |
| `correo`    | Texto (email) | Sí          | Formato válido, máximo 255 caracteres, único en BD                           |
| `contraseña`| Texto         | Sí          | Mínimo 8 caracteres (máximo 72 bytes), 1 mayúscula, 1 minúscula, 1 número. El carácter especial no es obligatorio: solo sube el indicador de fortaleza |
| `rol`       | Enum          | Sí          | Valores permitidos: `residente`, `reciclador`                                |
| `torre` / `apto` | Texto    | Sí, solo si `rol = residente` | Letras y números con un espacio o guion como separador (issue #255), máximo 10 caracteres |
| `codigo_acceso` | Texto     | Sí, solo si `rol = residente` | Exactamente 6 caracteres del alfabeto `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (sin 0, O, 1, I, L); se normaliza a mayúscula. Debe coincidir con el código vigente del conjunto indicado |
| `asociacion`| Texto         | No (reciclador) | Máximo 100 caracteres                                                    |

> **Nota (2026-09-27)**: los máximos coinciden con el tamaño de las columnas en la base de datos. El frontend no deja escribir de más (`maxLength`) y el backend responde 422 si llega un texto más largo o con formato inválido. Las reglas viven en `fe/src/lib/validacion.ts` y `be/app/schemas/user.py`, y las usan también editar perfil (RQF-008) y aceptar invitación de Admin de Conjunto.

---

## Proceso

1. El usuario selecciona su rol deseado y completa el formulario de registro con nombre, correo y contraseña.
2. El frontend valida los formatos y envía la petición al backend.
3. Si el rol es Residente, el backend valida el conjunto, el código de acceso y la unidad.
4. Se aplica la función de hash (bcrypt) a la contraseña.
5. El backend revisa si el correo ya está en uso. Si lo está, no crea nada, programa un correo de aviso al dueño y salta al paso 9.
6. Se inserta el nuevo usuario en la base de datos con estado inactivo o pendiente de verificación.
7. El sistema genera un token de verificación único y guarda en la BD solo su hash `sha256`.
8. Se programa el correo con el enlace de activación (con el token original), que sale después de responder (`BackgroundTasks`).
9. El sistema responde lo mismo en los dos casos, y el frontend informa que debe revisar su bandeja de entrada.

---

## Salidas

| Escenario           | Código HTTP | Respuesta                                                                                                    |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| Registro exitoso    | 201         | Mensaje de confirmación: `{"message": "Registro recibido. Revisa tu correo para activar tu cuenta."}`         |
| Email duplicado     | 201         | La misma respuesta del registro exitoso; no se crea nada y al dueño del correo le llega un aviso (issue #373) |
| Conjunto, código o unidad inválidos (Residente) | 400 | Mensaje que explica qué dato falló                                                            |
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
- RN-005: El registro no debe revelar si un correo ya tiene cuenta (issue #373, CN-026): misma respuesta, mismo tiempo de respuesta y mismas validaciones en los dos casos.
