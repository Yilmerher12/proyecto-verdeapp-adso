# RQF-021 — Novedades Enviadas al Administrador del Sistema y Bandeja de Solicitudes Pendientes

<!--
  ¿Qué? Requisito funcional del canal "de abajo hacia arriba": Residente,
        Reciclador o Admin de Conjunto le escriben una consulta de soporte
        al Administrador del Sistema, que la atiende en la pestaña "Soporte
        técnico" de su bandeja (las solicitudes de desvinculación de
        RQF-016 van en la otra pestaña). Se agregó en código en el commit
        513c76d (tabla novedades_enviadas) sin documentarse.
  ¿Para qué? Dejar claro qué es, a quién llega y qué reglas sigue — y
             separarlo de las Novedades de RQF-015, que van en la dirección
             contraria (el Admin Sistema publica hacia todos).
  ¿Impacto? Issues #368 y #512 (prioridad, estado y respuesta; la lista
            unificada se separó en dos pestañas).
-->

---

## Identificación

| Campo         | Valor                                    |
| ------------- | ------------------------------------------ |
| **ID**        | RQF-021                                    |
| **Nombre**    | Novedades Enviadas al Administrador del Sistema y Bandeja de Soporte Técnico |
| **Módulo**    | Comunicación / Administración              |
| **Prioridad** | Media                                      |
| **Estado**    | Implementado                               |
| **Usuarios**  | residente, reciclador, admin_conjunto, admin_sistema |

---

## Descripción

El sistema debe permitir que un Residente, un Reciclador o un Admin de Conjunto le **envíe** una novedad al Administrador del Sistema (texto y, de forma opcional, una imagen), por ejemplo para reportar un problema o contar algo que pasó en su conjunto. El autor no escribe sus datos: el sistema los toma de su cuenta (nombre, rol, conjunto y unidad).

El Administrador del Sistema recibe esas novedades en la pestaña **"Soporte técnico"** de la bandeja de su panel. La otra pestaña, **"Desvinculaciones"**, trae las solicitudes de los Admins de Conjunto (RQF-016); son cosas de distinta naturaleza (una decisión de sí o no, sin prioridad ni respuesta) y por eso tienen cada una su lugar. Cada consulta de soporte tiene una **prioridad** (Alta, Media o Baja), que el sistema calcula según el motivo que eligió el autor, y un **estado** (Nueva, En revisión o Resuelta). El Administrador del Sistema puede corregir la prioridad, cambiar el estado y **responderle al autor**, que ve la respuesta en su historial.

**No confundir** con las Novedades de RQF-015: esas las publica el Administrador del Sistema hacia los usuarios. Las de este RF van en la dirección contraria.

**Imagen adjunta (issue #369):** los 3 roles pueden subir la imagen con el endpoint de subida (`be/app/routers/uploads.py`). El Residente y el Reciclador solo pueden subir imagen (jpg/png/webp), nunca PDF/Word/Excel.

---

## Flujos

### Flujo A — Enviar una novedad (Residente, Reciclador o Admin de Conjunto)

1. El usuario abre la opción **Soporte técnico** del menú lateral y elige la sub-pestaña **"Escribir novedad"**.
2. Elige **un motivo** de la lista "¿Sobre qué es tu consulta?". La lista tiene motivos propios de su rol, motivos comunes a los tres roles y, al final, **Otros** (ver "Motivos de consulta" abajo).
3. Con **Otros** se activa el campo **Comentario**, que pasa a ser obligatorio; con cualquier otro motivo el comentario queda bloqueado. De forma opcional adjunta una imagen.
4. Si es un Admin de Conjunto con más de un conjunto, elige de cuál conjunto habla (o "Ninguno en particular").
5. Al presionar "Enviar consulta", el sistema guarda la novedad en estado **NUEVA**, con el conjunto que corresponde (RN-003), y muestra "Consulta enviada. El Administrador del Sistema la revisará."

**Motivos de consulta.** La pantalla arma el `texto` de la novedad con el motivo elegido (o `Otros: <comentario>` con Otros), así que la bandeja del Administrador del Sistema y "Historial de novedades" muestran el motivo dentro del texto. Además, desde el issue #512, la pantalla manda la **clave del motivo** (`motivo`), y el backend la usa para calcular la prioridad (ver "Prioridad" abajo). La lista está fija en la aplicación (`fe/src/components/NovedadesEnviadas.tsx` y las claves `novedadesEnviadas.motivos` de `es` y `en`); nadie la edita desde la app. Un motivo nuevo en la lista debe sumarse también a `PRIORIDAD_POR_MOTIVO` de `be/app/models/novedad_enviada.py`.

| Rol | Motivos propios |
| --- | --- |
| Residente | Mi conjunto, torre o apartamento no es el correcto · Mi reporte de SHUT lleno o libre no se registró bien |
| Reciclador | No veo un conjunto en el que me autorizaron o no me llegó la invitación · No puedo enviar una auditoría o mis fotos no se suben |
| Admin de Conjunto | Los datos de mi conjunto están mal (NIT, dirección o total de apartamentos) · Necesito ayuda con el código de acceso o con las invitaciones a recicladores · Los apartamentos registrados o el avance de mi conjunto no coinciden |

Motivos comunes a los tres: no puedo iniciar sesión o recuperar mi contraseña · no me llegan los correos o las notificaciones · un dato de mi cuenta está mal · algo no carga o la aplicación muestra un error · la información de un punto de acopio o del contenido educativo es incorrecta · tengo una sugerencia para mejorar VerdeApp.

**Prioridad.** El autor nunca la elige (todos pondrían "alta"). El backend la calcula al crear la novedad con `PRIORIDAD_POR_MOTIVO`:

| Prioridad | Motivos |
| --- | --- |
| **Alta** | no puedo iniciar sesión · algo no carga o muestra un error · el Reciclador no ve un conjunto o no puede enviar una auditoría · el Admin de Conjunto necesita ayuda con el código de acceso o las invitaciones |
| **Media** | no me llegan los correos o las notificaciones · un dato de mi cuenta está mal · conjunto, torre o apartamento del Residente · SHUT mal registrado · datos o apartamentos del conjunto del Admin de Conjunto · **Otros** · sin motivo (novedades anteriores a #512) |
| **Baja** | la información de un punto de acopio o del contenido educativo es incorrecta · una sugerencia para mejorar VerdeApp |

### Flujo B — Ver el historial de novedades

1. En la sub-pestaña **"Historial de novedades"**, el autor ve sus novedades, de la más reciente a la más antigua, con su estado: "Enviada" (NUEVA), "En revisión" (EN_REVISION) o "Resuelta" (RESUELTA), y su prioridad ("Prioridad alta", "media" o "baja", issue #520). Si el Administrador del Sistema le respondió, debajo del texto ve la respuesta con su fecha. Se muestra de a 10 por página.
2. Cuando llega una respuesta, el autor recibe además una notificación ("El Administrador del Sistema respondió tu consulta de soporte técnico."). Desde el issue #520 también recibe una cuando el estado cambia sin respuesta ("Tu consulta de soporte técnico pasó a: En revisión.").

### Flujo C — Atender el soporte técnico (Administrador del Sistema)

1. En su panel principal, el Administrador del Sistema ve el resumen "Solicitudes pendientes" con el número de pendientes (consultas de soporte sin resolver más desvinculaciones) y abre la bandeja, que tiene dos pestañas: **"Soporte técnico"** y **"Desvinculaciones"**.
2. "Soporte técnico" lista las consultas con su prioridad y su estado: primero las de prioridad Alta y, dentro de cada prioridad, la más reciente. Por defecto muestra lo **pendiente** (NUEVA y EN_REVISION); se puede filtrar por estado (**Pendientes**, **Nuevas**, **En revisión**, **Resueltas**) y por prioridad. **Resueltas** es el historial de lo ya atendido. Se muestra de a 5 filas por página.
3. Cada consulta muestra el rol y nombre del autor (y, si es Residente, su torre y apartamento), el conjunto, el texto y, si tiene, un enlace "Ver foto".
4. El Administrador del Sistema puede **marcar la consulta en revisión**, **marcarla como resuelta**, **reabrirla**, **corregir su prioridad** con un selector y **responderle al autor** (máximo 1000 caracteres). Escribir una respuesta sin indicar estado la deja RESUELTA.
5. La pestaña **"Desvinculaciones"** lista las desvinculaciones pendientes, que se aprueban o se rechazan (con motivo) con su flujo de siempre (RQF-016). No tienen prioridad ni respuesta.

---

## Entradas

| Campo                     | Tipo   | Obligatorio | Validaciones                                                        |
| -------------------------- | ------ | ----------- | -------------------------------------------------------------------- |
| `texto`                   | Texto  | Sí          | Mínimo 1 carácter, máximo 1000                                       |
| `url_imagen`              | Texto  | No          | Máximo 500 caracteres. Solo una imagen subida a VerdeApp: `/uploads/adjuntos/<uuid>.jpg`, `.png` o `.webp` (RN-007) |
| `id_conjunto_residencial` | UUID   | No          | Solo lo usa el Admin de Conjunto; debe ser uno de sus conjuntos      |
| `motivo`                  | Texto  | No          | Una de las claves de `PRIORIDAD_POR_MOTIVO`; otra responde 422. Sin motivo la prioridad es MEDIA |
| `estado` (al atender)     | Texto  | No          | `NUEVA`, `EN_REVISION` o `RESUELTA`                                   |
| `prioridad` (al atender)  | Texto  | No          | `ALTA`, `MEDIA` o `BAJA`                                              |
| `respuesta` (al atender)  | Texto  | No          | De 1 a 1000 caracteres. Al menos uno de los tres campos debe venir    |

---

## Salidas

| Escenario                                      | Código HTTP | Respuesta                                                          |
| ----------------------------------------------- | ----------- | -------------------------------------------------------------------- |
| Novedad enviada                                 | 201         | `{"message": "Novedad enviada. El Administrador del Sistema la revisará."}` (el servicio no cambió; la pantalla muestra "Consulta enviada. El Administrador del Sistema la revisará.") |
| Historial de novedades                          | 200         | `{items, total}`, con `items` = (`id`, `texto`, `url_imagen`, `estado`, `prioridad`, `nombre_conjunto`, `respuesta`, `respondida_at`, `created_at`) |
| Ya tengo 10 novedades sin resolver (RN-009)      | 409         | `{"detail": "Ya tienes 10 novedades sin revisar. Espera a que el Administrador del Sistema las revise para enviar más."}` |
| El Admin Sistema intenta enviar una novedad     | 403         | `{"detail": "Tu rol no puede enviar novedades."}`                    |
| Admin de Conjunto elige un conjunto que no es suyo | 403      | `{"detail": "No tienes permiso sobre este conjunto."}`               |
| Soporte técnico                                 | 200         | `{items, total}`, con `items` = (`id`, `origen`, `nombre_autor`, `nombre_conjunto`, `texto`, `url_imagen`, `estado`, `prioridad`, `respuesta`, `respondida_at`, `created_at`) |
| Consulta actualizada                            | 200         | `{"message": "Consulta actualizada."}`                               |
| Actualizar sin ningún cambio, o con un valor inválido | 422   | Error de validación                                                  |
| Actualizar una consulta que no existe           | 404         | `{"detail": "La consulta no existe."}`                               |
| Quien no es Admin Sistema consulta o actualiza el soporte | 403 | `{"detail": "Solo el Administrador del Sistema puede atender el soporte técnico."}` |

---

## Endpoints asociados

| Método | Ruta                                                           | Auth requerida                                  | Descripción                          |
| ------ | ---------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------- |
| POST   | `/api/v1/novedades-enviadas`                                    | Sí (Residente, Reciclador, Admin de Conjunto)     | Envía una novedad                     |
| GET    | `/api/v1/novedades-enviadas/mias?limit=&offset=`                | Sí                                                | Novedades que yo envié, paginadas (`{items, total}`) |
| GET    | `/api/v1/novedades-enviadas/soporte?estado=&prioridad=&limit=&offset=` | Sí (Admin Sistema)                       | Bandeja "Soporte técnico", paginada (`{items, total}`). Sin `estado` trae lo pendiente (NUEVA y EN_REVISION) |
| PATCH  | `/api/v1/novedades-enviadas/soporte/{id}`                       | Sí (Admin Sistema)                                | Cambia estado, prioridad y/o respuesta; con respuesta avisa al autor |

Las desvinculaciones usan los endpoints de RQF-016 (`GET /api/v1/admin-conjunto/solicitudes-desvinculacion` y `POST .../{id}/resolver`).

Código: `be/app/routers/novedades_enviadas.py`, `be/app/services/novedad_enviada_service.py`, `be/app/models/novedad_enviada.py`; interfaz en `fe/src/components/NovedadesEnviadas.tsx` (pestañas de `NovedadesFeedPage.tsx`) y, en el panel del Admin Sistema, `fe/src/components/BandejaAdminSistema.tsx` (las dos pestañas) con `SoporteTecnico.tsx` y `SolicitudesDesvinculacion.tsx`.

---

## Reglas de negocio

- RN-001: Solo pueden enviar novedades el Residente, el Reciclador y el Admin de Conjunto. El Administrador del Sistema no (403): él es quien las recibe.
- RN-002: El autor sale siempre de la sesión: nadie escribe su nombre, rol ni unidad a mano.
- RN-003: El conjunto de la novedad se toma así: **Residente**, el de su unidad; **Admin de Conjunto**, el que eligió (debe ser uno de los suyos; si tiene uno solo, ese); **Reciclador**, ninguno (puede trabajar en varios conjuntos).
- RN-004: Una novedad no se aprueba ni se rechaza: el Administrador del Sistema cambia su **estado** (NUEVA → EN_REVISION → RESUELTA) y puede reabrir una resuelta. Escribir una respuesta sin indicar estado la deja RESUELTA y le avisa al autor con una notificación (`RESPUESTA_SOPORTE`). Si cambia el estado sin respuesta, el aviso es `ESTADO_SOPORTE` (issue #520); con respuesta no se envían los dos, solo el de la respuesta, y cambiar solo la prioridad no avisa. La acción se anota en el registro de auditoría sin el texto de la respuesta (issue #376).
- RN-005: "Soporte técnico" muestra por defecto lo pendiente (NUEVA y EN_REVISION); con el filtro de estado se ve también lo resuelto. Se ordena por prioridad (Alta, Media, Baja) y, dentro de cada una, de la más reciente a la más antigua.
- RN-006: Si se borra la cuenta del autor o el conjunto, la novedad se conserva sin ese dato (`ON DELETE SET NULL`); en la bandeja aparece como "Usuario eliminado".
- RN-007: `url_imagen` solo acepta una imagen subida a VerdeApp, con el formato exacto que genera la subida (`/uploads/adjuntos/<uuid>.jpg|png|webp`); cualquier otro formato, incluido un enlace `https://` externo, responde 422 (issue #399, hallazgo CN-049: la pantalla solo sube archivos, pero la API se podía llamar a mano con un enlace externo que el Admin Sistema abre desde su bandeja). El frontend aplica la misma regla al mostrar el enlace (`fe/src/lib/enlaceSeguro.ts`), así un dato viejo con otro formato no se muestra. Corregido en el issue #369 (hallazgo CN-041): antes un enlace como `@sitio-malo.com` llevaba al Administrador del Sistema a otro sitio. Desde el issue #400 (hallazgo CN-052), una ruta `/uploads/...` tampoco puede contener `..`, `%2e` ni `%2f`, en el backend ni en el frontend.
- RN-008: Corregido en el issue #372 (hallazgos CN-042/044/045): el envío acepta máximo 10 novedades por minuto (la siguiente responde 429); la bandeja se entrega paginada (`limit` de 1 a 100, por defecto 10, y `offset`); un `estado` o una `prioridad` inválidos responden 422 al listar (issue #512: antes era un `tipo` de la bandeja unificada); y si la cuenta del autor no tiene su perfil de Residente o de Admin de Conjunto, el envío responde 404 con un mensaje claro en vez de un error 500.
- RN-009: Issue #399 (hallazgo CN-054): cada cuenta puede tener como máximo **10 novedades sin resolver (NUEVA o EN_REVISION)** a la vez (la 11.ª responde 409). No cuenta el tiempo: cuando el Administrador del Sistema resuelve alguna, el autor vuelve a poder enviar. "Soporte técnico" y "Historial de novedades" cortan la página en la base de datos (`LIMIT/OFFSET`) y cargan los datos del autor, la unidad y el conjunto en consultas fijas, así que el número de consultas no crece con la cantidad de novedades.
- RN-010: Issue #512: la prioridad la calcula el backend con el `motivo` (tabla del Flujo A) y el autor no puede elegirla; el Administrador del Sistema la corrige con el selector. Las novedades anteriores a este cambio quedaron en MEDIA y sin motivo, y las que estaban VISTA pasaron a RESUELTA.

- RN-011: Issue #520: por ahora **solo el Administrador del Sistema atiende** las consultas; el Admin de Conjunto no gestiona las de su conjunto. Queda pendiente decidir qué consultas le tocan (los Recicladores no tienen conjunto en la novedad, RN-003), cómo las escala al Admin Sistema y qué columna nueva hace falta; se hará en una tarjeta aparte.

---

## Historias de usuario derivadas

| HU      | Descripción                                                    |
| ------- | ----------------------------------------------------------------|
| [HU-047](../HUs/HU-047_usuario_envia_novedad_admin_sistema.md) | Residente, Reciclador o Admin de Conjunto envía una novedad al Admin Sistema |
| [HU-048](../HUs/HU-048_admin_sistema_revisa_bandeja_solicitudes.md) | Admin Sistema atiende el soporte técnico y las desvinculaciones |
