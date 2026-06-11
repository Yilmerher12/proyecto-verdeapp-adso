# RQF-010 — Gestionar Contenido Educativo

---

## Identificación

| Campo         | Valor                          |
| ------------- | ------------------------------ |
| **ID** | RQF-010                        |
| **Nombre** | Gestionar Contenido Educativo  |
| **Módulo** | Educación / Administración     |
| **Prioridad** | Media                          |
| **Estado** | Por implementar                |
| **Usuarios** | admin_sistema                  |

---

## Descripción

El sistema debe permitir al usuario con rol 'Admin_sistema' crear, modificar y eliminar artículos o módulos del catálogo educativo en la base de datos, garantizando que los Residentes siempre visualicen la información más reciente.

---

## Entradas

| Campo          | Tipo   | Obligatorio | Validaciones                                                                 |
| -------------- | ------ | ----------- | ---------------------------------------------------------------------------- |
| `titulo`       | Texto  | Sí          | Mínimo 5 caracteres, máximo 255                                              |
| `cuerpo_texto` | Texto  | Sí          | Mínimo 20 caracteres                                                         |
| `accion`       | Enum   | Sí          | Valores permitidos: `crear`, `editar`, `eliminar`                            |
| `contenido_id` | Número | Condicional | Obligatorio solo si la acción es editar o eliminar. Debe existir en la BD.   |

---

## Proceso

1. El usuario con rol `admin_sistema` inicia sesión y accede al panel de administración de contenido.
2. Selecciona la opción para agregar un nuevo artículo o editar uno existente.
3. El usuario completa el formulario con el título y el cuerpo del texto.
4. El frontend envía la petición respectiva (`POST`, `PUT` o `DELETE`) al backend.
5. El backend (Spring Boot) valida el token JWT para confirmar que el usuario tiene el rol de administrador.
6. El backend ejecuta la instrucción en MySQL insertando, actualizando o borrando el registro en la tabla `Contenido_Educativo`.
7. El sistema retorna un mensaje de confirmación y actualiza la vista del catálogo para los residentes.

---

## Salidas

| Escenario           | Código HTTP | Respuesta                                                                                                    |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| Operación exitosa   | 200 / 201   | JSON de confirmación: `{"message": "Contenido educativo guardado/actualizado correctamente."}`               |
| Error de permisos   | 403         | Mensaje de error: `{"detail": "Acceso denegado. Se requiere rol de Administrador."}`                         |
| Datos inválidos     | 422         | Detalle de errores (ej. "El título es demasiado corto").                                                     |

---

## Endpoints asociados

| Método | Ruta                     | Auth requerida | Descripción                                  |
| ------ | ------------------------ | -------------- | -------------------------------------------- |
| POST   | `/api/v1/educacion`      | Sí (Admin)     | Crea un nuevo módulo educativo               |
| PUT    | `/api/v1/educacion/{id}` | Sí (Admin)     | Actualiza un módulo existente                |
| DELETE | `/api/v1/educacion/{id}` | Sí (Admin)     | Elimina un módulo del catálogo               |

---

## Reglas de negocio

- RN-001: Control de Acceso Estricto. Ningún usuario con rol residente o reciclador puede ejecutar estos endpoints bajo ninguna circunstancia.
- RN-002: Las eliminaciones deben ser lógicas (cambiar un estado a inactivo) o físicas dependiendo de las políticas de auditoría del proyecto, asegurando que no se rompa la vista del frontend.