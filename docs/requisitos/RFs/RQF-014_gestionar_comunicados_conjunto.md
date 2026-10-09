# RQF-014 — Gestionar Comunicados del Conjunto

## Identificación

| Campo         | Valor                                   |
| ------------- | --------------------------------------- |
| **ID**        | RQF-014                                 |
| **Nombre**    | Gestionar Comunicados del Conjunto      |
| **Módulo**    | Comunicación / Conjuntos                |
| **Prioridad** | Media                                   |
| **Estado**    | Implementada                            |
| **Usuarios**  | admin_conjunto, residente, reciclador   |

---

## Descripción

El sistema debe permitir que el Administrador de Conjunto publique comunicados dirigidos a los residentes y/o recicladores de su conjunto. Estos comunicados pueden incluir texto y, de forma opcional, un archivo adjunto real (imagen, PDF, Word o Excel) subido y alojado por VerdeApp mismo (issue #194 — antes era un enlace a un archivo alojado externamente), y tienen una fecha de expiración para que no permanezcan en el feed de forma indefinida.

Los usuarios destinatarios ven los comunicados en un feed dentro de la app y reciben una notificación cuando se publica uno nuevo.

---

## Tipos de comunicado

| Tipo          | Descripción                                              | Expiración sugerida |
| ------------- | -------------------------------------------------------- | ------------------- |
| Informativo   | Avisos generales del conjunto                            | 30 días             |
| Urgente       | Comunicados de emergencia o situaciones críticas         | 48 horas            |
| Convocatoria  | Reuniones o eventos (expira al día siguiente del evento) | Día del evento + 1d |
| Mantenimiento | Cortes de servicios o trabajos en el conjunto            | 7 días              |
| Reciclaje     | Recordatorios o cambios del calendario de reciclaje      | 14 días             |

---

## Flujos

### Flujo A — Publicar comunicado (Admin Conjunto)
1. El Admin Conjunto selecciona el conjunto y los destinatarios: solo residentes, solo recicladores o ambos.
2. Elige el tipo de comunicado y escribe el contenido (texto obligatorio).
3. Puede adjuntar un archivo real: imagen (JPG/PNG/WEBP), PDF, Word (.docx) o Excel (.xlsx) — validado por contenido real, no solo por su nombre (ver `be/app/utils/imagenes.py`).
4. El sistema sugiere la fecha de expiración según el tipo, pero el admin puede cambiarla.
5. Al publicar, los destinatarios reciben una notificación y el comunicado aparece en su feed.

### Flujo B — Ver feed de comunicados (Residente / Reciclador)
1. El usuario abre la sección de comunicados de su conjunto.
2. Ve los comunicados activos ordenados del más reciente al más antiguo.
3. Los comunicados urgentes aparecen primero con una etiqueta visual diferente.
4. Al expirar un comunicado, desaparece del feed automáticamente.

### Flujo C — Editar comunicado (Admin Conjunto)
1. El admin selecciona un comunicado publicado y lo edita.
2. Puede cambiar el texto, adjuntos, tipo y fecha de expiración.
3. No puede cambiar el conjunto ni los destinatarios después de publicar.
4. Los cambios aparecen de inmediato en el feed con la etiqueta "Editado".

### Flujo D — Eliminar comunicado (Admin Conjunto)
1. El admin selecciona un comunicado y lo elimina.
2. El sistema pide confirmación antes de eliminar.
3. El comunicado y sus adjuntos desaparecen del feed y del almacenamiento.

---

## Reglas de negocio

- RN-001: Solo el Admin Conjunto puede publicar, editar o eliminar comunicados de su conjunto.
- RN-002: El texto del comunicado es obligatorio (máximo 2000 caracteres, issue #352); los adjuntos son opcionales (enlace de máximo 500 caracteres).
- RN-003: El sistema sugiere la fecha de expiración según el tipo de comunicado, pero es editable.
- RN-004: Los comunicados se eliminan automáticamente del feed al vencer su fecha de expiración.
- RN-005: El Admin Conjunto solo puede gestionar comunicados de los conjuntos que administra.
- RN-006: El adjunto (`url_adjunto`) solo puede ser un archivo subido a VerdeApp (`/uploads/...`) o un enlace `https://`; cualquier otro valor se rechaza con 422 (issue #314, hallazgo CN-015 del informe de seguridad). Una ruta `/uploads/...` tampoco puede contener `..`, `%2e` ni `%2f` (la forma codificada de `..` y `/`, issue #400, hallazgo CN-052). El frontend revisa lo mismo antes de pintar el enlace con `enlaceAdjuntoSeguro` (`fe/src/lib/enlaceSeguro.ts`) y, si no es seguro, no lo muestra, así un dato viejo no llega a un `href` (issue #400, hallazgo CN-048). El archivo subido no puede pasar de 5 MB, y el servidor deja de leerlo en cuanto supera ese tope. Desde el issue #395 (hallazgos CN-046 y CN-059): una imagen de más de 25 millones de píxeles responde 400 ("La imagen es demasiado grande en píxeles"); cada usuario tiene una cuota de subidas (Admin de Conjunto: 30 por minuto y 30 por día; Residente y Reciclador: 3 por minuto y 5 por día) y al pasarla recibe 429 con el motivo; y cada archivo queda registrado con su dueño en la tabla `archivos_subidos`. Los archivos que nadie usa se pueden borrar con el comando manual `uv run python -m app.limpiar_adjuntos` (ver `be/README.md`). Desde el issue #403 (hallazgo CN-063), los PDF, Word y Excel se **descargan** al pulsar el adjunto en vez de abrirse en la pestaña (`Content-Disposition: attachment`), y todo lo de `/uploads` lleva `Content-Security-Policy: default-src 'none'; sandbox`; las imágenes se siguen viendo igual dentro de las pantallas.
- RN-007: La fecha de expiración elegida a mano debe estar entre hoy y un año desde hoy (`DIAS_MAX_EXPIRACION` en `be/app/utils/fechas.py`), al crear y al editar; la fecha del evento de una Convocatoria sigue el mismo rango. Antes se aceptaba una fecha pasada: el comunicado nacía vencido, el feed lo ocultaba (RN-004) pero la notificación sí llegaba, y el destinatario no podía leerlo. Se valida en el backend (422) y en el formulario, con el error debajo del campo (issue #367). **Implementada.**

---

## Historias de usuario derivadas

| HU      | Descripción                                          |
| ------- | ---------------------------------------------------- |
| [HU-027](../HUs/HU-027_admin_conjunto_crea_comunicado.md) | Admin Conjunto crea un comunicado del conjunto       |
| [HU-028](../HUs/HU-028_ver_feed_comunicados.md) | Residente/Reciclador ve el feed de comunicados       |
| [HU-029](../HUs/HU-029_admin_conjunto_edita_comunicado.md) | Admin Conjunto edita un comunicado                   |
| [HU-030](../HUs/HU-030_admin_conjunto_elimina_comunicado.md) | Admin Conjunto elimina un comunicado                 |
| [HU-031](../HUs/HU-031_notificacion_comunicado_nuevo.md) | Residente/Reciclador recibe notificación de comunicado nuevo |
