# RQF-011 — Gestionar Directorio de Acopio

---

## Identificación

| Campo         | Valor                          |
| ------------- | ------------------------------ |
| **ID** | RQF-011                        |
| **Nombre** | Gestionar Directorio de Acopio |
| **Módulo** | Directorio / Administración    |
| **Prioridad** | Alta                           |
| **Estado** | Por implementar                |
| **Usuarios** | admin_sistema                  |

---

## Descripción

El sistema debe permitir al usuario con rol 'Admin_sistema' registrar, actualizar y dar de baja los puntos de acopio oficiales, asignándolos a una localidad específica para su posterior filtrado por parte de los Residentes.

---

## Entradas

| Campo            | Tipo   | Obligatorio | Validaciones                                                                 |
| ---------------- | ------ | ----------- | ---------------------------------------------------------------------------- |
| `nombre_acopio`  | Texto  | Sí          | Máximo 255 caracteres                                                        |
| `direccion`      | Texto  | Sí          | Máximo 255 caracteres                                                        |
| `datos_contacto` | Texto  | Sí          | Formato válido de teléfono o enlace                                          |
| `localidad_id`   | Número | Sí          | Debe coincidir obligatoriamente con un ID existente en la tabla `Localidades`|

---

## Proceso

1. El `admin_sistema` ingresa al panel de gestión del directorio.
2. Selecciona la opción de registrar un nuevo punto de acopio.
3. Llena el formulario ingresando nombre, dirección, datos de contacto y selecciona la localidad desde un menú desplegable.
4. El frontend envía la petición `POST` o `PUT` al backend.
5. El backend valida los permisos de administrador del usuario.
6. El backend verifica la integridad referencial (asegurando que `localidad_id` exista en MySQL).
7. Se inserta o actualiza el registro en la tabla `Puntos_Acopio`.
8. El sistema notifica el éxito de la operación.

---

## Salidas

| Escenario           | Código HTTP | Respuesta                                                                                                    |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| Registro exitoso    | 201         | JSON con los datos del punto creado y mensaje de éxito.                                                      |
| Error de Foránea    | 400         | `{"detail": "La localidad seleccionada no es válida o no existe."}`                                          |
| Acceso denegado     | 403         | `{"detail": "Acceso denegado. Privilegios insuficientes."}`                                                  |

---

## Endpoints asociados

| Método | Ruta                                | Auth requerida | Descripción                                  |
| ------ | ----------------------------------- | -------------- | -------------------------------------------- |
| POST   | `/api/v1/directorios/acopio`        | Sí (Admin)     | Registra un nuevo punto de acopio            |
| PUT    | `/api/v1/directorios/acopio/{id}`   | Sí (Admin)     | Modifica los datos de un punto existente     |

---

## Reglas de negocio

- RN-001: Un punto de acopio no puede guardarse en la base de datos si no está estrictamente vinculado a una `localidad_id`. Esto garantiza que el RQF-005 (Filtro por localidad) no falle.
- RN-002: Exclusividad de escritura. La tabla `Puntos_Acopio` solo puede ser modificada por el `admin_sistema`.