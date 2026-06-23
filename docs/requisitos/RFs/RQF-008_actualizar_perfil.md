# RQF-008 — Actualizar Perfil

<!--
  ¿Qué? Requisito funcional que permite la gestión de los datos básicos del usuario.
  ¿Para qué? Mantener la información de contacto actualizada para el directorio y notificaciones.
  ¿Impacto? Asegura la precisión de la información sin comprometer llaves de seguridad o relaciones.
-->

---

## Identificación

| Campo         | Valor               |
| ------------- | ------------------- |
| **ID** | RQF-008             |
| **Nombre** | Actualizar Perfil   |
| **Módulo** | Usuarios / Perfil   |
| **Prioridad** | Media               |
| **Estado** | Por implementar     |
| **Usuarios** | reciclador, residente|

---

## Descripción

El sistema debe permitir a los usuarios con rol 'Reciclador' o 'Residente' modificar exclusivamente las filas de su información personal básica (nombre, apellidos, asociación y/o número telefónico). El sistema debe bloquear cualquier intento de modificación sobre las llaves foráneas (ID de unidad/conjunto) y las credenciales de acceso desde este módulo.

---

## Entradas

| Campo               | Tipo   | Obligatorio | Validaciones                                                                 |
| ------------------- | ------ | ----------- | ---------------------------------------------------------------------------- |
| `nombre`            | Texto  | No          | Máximo 255 caracteres                                                        |
| `apellidos`         | Texto  | No          | Máximo 255 caracteres                                                        |
| `asociacion`        | Texto  | No          | Máximo 255 caracteres                                                        |
| `numero_telefonico` | Texto  | No          | Solo números, longitud válida según formato local                            |

---

## Proceso

1. El usuario accede a la vista de "Mi Perfil" y modifica sus datos.
2. El frontend (React) previene la edición de campos restringidos (ID, correo, conjunto) deshabilitando sus inputs.
3. El usuario envía el formulario.
4. El backend (Spring Boot) recibe la petición `PATCH` o `PUT`.
5. El backend ignora de forma estricta (mediante DTOs) cualquier campo en el payload que corresponda a llaves foráneas (`conjunto_id`) o credenciales.
6. El backend actualiza los campos permitidos en la base de datos MySQL.
7. El backend retorna el objeto del perfil actualizado.

---

## Salidas

| Escenario           | Código HTTP | Respuesta                                                                                                    |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| Actualización OK    | 200         | JSON con los datos actualizados del usuario: `{"nombre": "...", "apellidos": "..."}`                         |
| Datos inválidos     | 400         | `{"detail": "El número telefónico tiene un formato inválido."}`                                              |

---

## Endpoints asociados

| Método | Ruta                     | Auth requerida | Descripción                                      |
| ------ | ------------------------ | -------------- | ------------------------------------------------ |
| PATCH  | `/api/v1/usuarios/me`    | Sí             | Actualiza parcialmente los datos del perfil      |

---

## Reglas de negocio

- RN-001: La actualización de contraseña o correo electrónico debe ser manejada por endpoints separados.
- RN-002: El cambio de un usuario a un conjunto residencial distinto (`conjunto_id`) está estrictamente prohibido en esta vista.
