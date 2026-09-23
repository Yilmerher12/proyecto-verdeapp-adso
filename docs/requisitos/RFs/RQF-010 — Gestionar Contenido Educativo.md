# RQF-010 — Gestionar Contenido Educativo

---

## Identificación

| Campo         | Valor                          |
| ------------- | ------------------------------ |
| **ID** | RQF-010                        |
| **Nombre** | Gestionar Contenido Educativo  |
| **Módulo** | Educación / Administración     |
| **Prioridad** | Media                          |
| **Estado** | Implementado                   |
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
| `contenido_id` | UUID   | Condicional | Obligatorio solo si la acción es editar o eliminar. Debe existir en la BD.   |

---

## Proceso

1. El usuario con rol `admin_sistema` inicia sesión y accede al panel de administración de contenido.
2. Selecciona la opción para agregar un nuevo artículo o editar uno existente.
3. El usuario completa el formulario con el título y el cuerpo del texto.
4. El frontend envía la petición respectiva (`POST`, `PUT` o `DELETE`) al backend.
5. El backend (FastAPI) valida el token JWT para confirmar que el usuario tiene el rol de administrador.
6. El backend ejecuta la instrucción en PostgreSQL insertando, actualizando o borrando el registro en la tabla `Contenido_Educativo`.
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

| Método | Ruta                                | Auth requerida | Descripción                                          |
| ------ | ------------------------------------ | -------------- | ----------------------------------------------------- |
| GET    | `/api/v1/contenido-educativo`        | Sí (cualquiera)| Lista todo el catálogo                                |
| POST   | `/api/v1/contenido-educativo`        | Sí (Admin)     | Crea un nuevo módulo educativo                        |
| PUT    | `/api/v1/contenido-educativo/{id}`   | Sí (Admin)     | Actualiza un módulo existente                         |
| DELETE | `/api/v1/contenido-educativo/{id}`   | Sí (Admin)     | Elimina un módulo del catálogo                        |
| POST   | `/api/v1/uploads/adjunto?permitir_pdf=true` | Sí (Admin) | Sube el archivo real de la guía de apoyo (imagen o PDF) |
| GET    | `/api/v1/contenido-educativo/{id}`          | Sí (cualquiera) | Detalle de un módulo puntual |
| GET    | `/api/v1/contenido-educativo/{id}/envios`   | Sí (Admin) | Lista los conjuntos a los que se envió ese módulo a mano, con fecha |
| POST   | `/api/v1/contenido-educativo/{id}/enviar`   | Sí (Admin) | Envía un módulo a uno o varios conjuntos a la vez (`{"conjuntos": ["<uuid>", ...]}`) |

<!-- ¿Qué? La ruta original de esta tabla (/api/v1/educacion) nunca existió
     así en código — se corrigió a la real. Además, `cuerpo_texto` ahora
     admite sintaxis Markdown simple (##, listas, negrita) para que el
     admin pueda estructurar el contenido, y `url_guia` puede venir de un
     archivo subido (vía el endpoint de uploads) o de un link externo
     escrito a mano — ambos casos se guardan igual, como texto.

     Los 3 endpoints agregados al final son del "envío manual": el Admin
     Sistema, desde la pestaña "Módulos" del panel rediseñado, puede
     recomendar un módulo a mano a uno o varios conjuntos — no solo esperar
     a que una auditoría Regular/Mala lo dispare automáticamente (RQF-013).
     Cada envío queda registrado en la tabla `contenido_educativo_envios` y
     genera una notificación `CONTENIDO_RECOMENDADO_MANUAL` a los Residentes
     de ese conjunto (mismo tipo de notificación que RQF-013, pero con
     `id_referencia` apuntando al módulo en vez de a una auditoría). Ver
     RQF-013 (Flujo C) para el detalle de negocio de este envío. -->

---

## Reglas de negocio

- RN-001: Control de Acceso Estricto. Ningún usuario con rol residente o reciclador puede ejecutar estos endpoints bajo ninguna circunstancia.
- RN-002: Las eliminaciones deben ser lógicas (cambiar un estado a inactivo) o físicas dependiendo de las políticas de auditoría del proyecto, asegurando que no se rompa la vista del frontend.
- RN-003: El envío manual no reemplaza ni bloquea la recomendación automática de RQF-013 — si un conjunto ya recibió el módulo automáticamente por una auditoría Regular/Mala, ese origen ("automático") tiene prioridad visual sobre un envío manual duplicado al mismo conjunto. **Implementado.**
- RN-004: `url_video` solo acepta enlaces `https://` de YouTube (`youtube.com`, `youtu.be`, `youtube-nocookie.com`), y `url_guia` solo acepta enlaces `https://` o un archivo subido a VerdeApp (`/uploads/...`). Se valida en el backend (`be/app/utils/enlaces.py`, 422 si no cumple) y en el formulario, con el error debajo del campo. Evita que se publiquen enlaces a sitios de suplantación (issue #314, hallazgo CN-015 del informe de seguridad). **Implementado.**