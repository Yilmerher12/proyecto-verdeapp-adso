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

El sistema debe permitir que el Administrador de Conjunto publique comunicados dirigidos a los residentes y/o recicladores de su conjunto. Estos comunicados pueden incluir texto y, de forma opcional, un enlace (URL) a un archivo adjunto alojado externamente (imagen, video, PDF, documento de office), y tienen una fecha de expiración para que no permanezcan en el feed de forma indefinida.

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
3. Puede adjuntar un enlace (URL) a un archivo alojado externamente: imagen, video, PDF, Word, Excel.
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
- RN-002: El texto del comunicado es obligatorio; los adjuntos son opcionales.
- RN-003: El sistema sugiere la fecha de expiración según el tipo de comunicado, pero es editable.
- RN-004: Los comunicados se eliminan automáticamente del feed al vencer su fecha de expiración.
- RN-005: El Admin Conjunto solo puede gestionar comunicados de los conjuntos que administra.

---

## Historias de usuario derivadas

| HU      | Descripción                                          |
| ------- | ---------------------------------------------------- |
| [HU-027](../HUs/HU-027_admin_conjunto_crea_comunicado.md) | Admin Conjunto crea un comunicado del conjunto       |
| [HU-028](../HUs/HU-028_ver_feed_comunicados.md) | Residente/Reciclador ve el feed de comunicados       |
| [HU-029](../HUs/HU-029_admin_conjunto_edita_comunicado.md) | Admin Conjunto edita un comunicado                   |
| [HU-030](../HUs/HU-030_admin_conjunto_elimina_comunicado.md) | Admin Conjunto elimina un comunicado                 |
| [HU-031](../HUs/HU-031_notificacion_comunicado_nuevo.md) | Residente/Reciclador recibe notificación de comunicado nuevo |
