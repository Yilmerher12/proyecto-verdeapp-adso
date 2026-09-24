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

> **Corrección (2026-09-24, issue #284)**: la tabla de Entradas describía un solo endpoint con un campo `accion` (crear/editar/eliminar) y un `contenido_id` en el cuerpo; faltaban la categoría y los enlaces, y las Salidas mostraban un mensaje que el backend no devuelve. Se actualizaron a lo que hace el código real: `be/app/schemas/contenido_educativo.py` y `be/app/routers/contenido_educativo.py`.

La acción no es un campo: la define el método HTTP (`POST` crea, `PUT /{id_contenido}` edita, `DELETE /{id_contenido}` elimina), y el id del módulo va en la URL. Crear y editar reciben el mismo cuerpo:

| Campo              | Tipo  | Obligatorio | Validaciones                                                                 |
| ------------------ | ----- | ----------- | ---------------------------------------------------------------------------- |
| `modulo_categoria` | Texto | Sí          | No puede quedar vacío. Máximo 255 caracteres. Puede ser una categoría existente o una nueva. |
| `titulo_tema`      | Texto | Sí          | Mínimo 5 caracteres, máximo 255.                                             |
| `cuerpo_texto`     | Texto | Sí          | Mínimo 20 caracteres. Admite Markdown simple (`##`, listas, negrita).        |
| `url_video`        | Texto | No          | Solo `https://` de YouTube (RN-004). Máximo 500 caracteres.                  |
| `url_guia`         | Texto | No          | Solo `https://` o un archivo subido a VerdeApp (`/uploads/...`) (RN-004). Máximo 500 caracteres. |

---

## Proceso

1. El usuario con rol `admin_sistema` entra al panel "Contenido educativo", pestaña "Módulos".
2. Elige "Nuevo módulo", o editar o eliminar uno existente.
3. Completa categoría, título, contenido y, si quiere, un video de YouTube y una guía de apoyo (enlace o archivo subido). La vista previa muestra en vivo cómo lo verá el Residente.
4. El frontend envía `POST`, `PUT` o `DELETE` a `/api/v1/contenido-educativo`.
5. El backend valida que el usuario sea Administrador del Sistema y los campos del cuerpo.
6. Inserta, actualiza o borra el registro en la tabla `contenido_educativo`.
7. El catálogo de los residentes (RQF-004) muestra el cambio en la siguiente consulta.

---

## Salidas

| Escenario           | Código HTTP | Respuesta                                                                                                    |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| Módulo creado       | 201         | El módulo creado: `id_contenido`, `modulo_categoria`, `titulo_tema`, `cuerpo_texto`, `url_video`, `url_guia`, `fecha_publicacion` |
| Módulo editado      | 200         | El módulo actualizado, con los mismos campos                                                                 |
| Módulo eliminado    | 204         | Sin cuerpo                                                                                                   |
| Otro rol            | 403         | `{"detail": "Solo un Administrador del Sistema puede gestionar el contenido educativo."}`                   |
| Módulo inexistente  | 404         | `{"detail": "No se encontró ese módulo de contenido educativo."}`                                            |
| Datos inválidos     | 422         | Detalle por campo (ej. "El título debe tener al menos 5 caracteres.", "El cuerpo de texto debe tener al menos 20 caracteres.") |

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