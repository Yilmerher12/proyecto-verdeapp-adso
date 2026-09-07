# RQF-011 — Gestionar Directorio de Acopio

---

## Identificación

| Campo         | Valor                          |
| ------------- | ------------------------------ |
| **ID** | RQF-011                        |
| **Nombre** | Gestionar Directorio de Acopio |
| **Módulo** | Directorio / Administración    |
| **Prioridad** | Alta                           |
| **Estado** | Implementado                   |
| **Usuarios** | admin_sistema                  |

---

## Descripción

El sistema debe permitir al usuario con rol 'Admin_sistema' registrar, actualizar y dar de baja los puntos de acopio oficiales, asignándolos a una localidad específica para su posterior filtrado por parte de los Residentes.

---

## Entradas

| Campo            | Tipo   | Obligatorio | Validaciones                                                                 |
| ---------------- | ------ | ----------- | ---------------------------------------------------------------------------- |
| `nombre`             | Texto  | Sí          | Máximo 200 caracteres                                                    |
| `direccion`          | Texto  | Sí          | Máximo 255 caracteres                                                    |
| `nombre_encargado`   | Texto  | No          | Máximo 100 caracteres                                                    |
| `telefono_contacto`  | Texto  | No          | Máximo 15 caracteres                                                     |
| `id_localidad`       | Número | Sí          | Debe coincidir obligatoriamente con un ID existente en la tabla `localidades`|

<!-- ¿Qué? Los nombres de campo y su obligatoriedad se corrigieron para
     coincidir con el modelo real (be/app/models/punto_acopio.py) —
     la versión original de este documento tenía un único campo
     "datos_contacto" que nunca se implementó así; el contacto quedó
     separado en nombre_encargado + telefono_contacto, ambos opcionales. -->

---

## Proceso

1. El `admin_sistema` ingresa al panel de gestión del directorio.
2. Selecciona la opción de registrar un nuevo punto de acopio.
3. Llena el formulario ingresando nombre, dirección, datos de contacto y selecciona la localidad desde un menú desplegable.
4. El frontend envía la petición `POST` o `PUT` al backend.
5. El backend valida los permisos de administrador del usuario.
6. El backend verifica la integridad referencial (asegurando que `localidad_id` exista en PostgreSQL).
7. Se inserta o actualiza el registro en la tabla `Puntos_Acopio`.
8. El sistema notifica el éxito de la operación.

---

## Salidas

| Escenario           | Código HTTP | Respuesta                                                                                                    |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| Registro exitoso    | 201         | JSON con los datos del punto creado y mensaje de éxito.                                                      |
| Baja exitosa (HU-017) | 204       | Sin contenido — el punto queda `activo=false`.                                                               |
| Punto no encontrado | 404         | `{"detail": "No se encontró ese punto de acopio."}`                                                          |
| Error de Foránea    | 400         | `{"detail": "La localidad seleccionada no es válida o no existe."}`                                          |
| Acceso denegado     | 403         | `{"detail": "Acceso denegado. Privilegios insuficientes."}`                                                  |

---

## Endpoints asociados

| Método | Ruta                                | Auth requerida  | Descripción                                          |
| ------ | ----------------------------------- | --------------- | ----------------------------------------------------- |
| GET    | `/api/v1/admin/puntos-acopio`       | Sí (Admin)      | Lista todos los puntos, incluidos los dados de baja   |
| POST   | `/api/v1/admin/puntos-acopio`       | Sí (Admin)      | Registra un nuevo punto de acopio (HU-015)            |
| PUT    | `/api/v1/admin/puntos-acopio/{id}`  | Sí (Admin)      | Modifica los datos de un punto existente (HU-016)     |
| DELETE | `/api/v1/admin/puntos-acopio/{id}`  | Sí (Admin)      | Da de baja un punto — soft-delete (HU-017)            |
| POST   | `/api/v1/admin/puntos-acopio/{id}/reactivar` | Sí (Admin) | Contrapeso de HU-017 — vuelve a marcar el punto como activo |
| DELETE | `/api/v1/admin/puntos-acopio/{id}/definitivo` | Sí (Admin) | Borra el registro por completo — solo si ya está dado de baja |
| GET    | `/api/v1/directorio/puntos-acopio`  | Sí (cualquiera) | Lista solo los puntos activos — vista pública         |

---

## Reglas de negocio

- RN-001: Un punto de acopio no puede guardarse en la base de datos si no está estrictamente vinculado a una `localidad_id`. Esto garantiza que el RQF-005 (Filtro por localidad) no falle.
- RN-002: Exclusividad de escritura. La tabla `Puntos_Acopio` solo puede ser modificada por el `admin_sistema`.