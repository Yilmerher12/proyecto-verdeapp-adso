# RQF-020 — Agenda Interna del Conjunto

<!--
  ¿Qué? Requisito funcional de la agenda interna del Admin de Conjunto,
        que se agregó en código en el commit 513c76d (tabla
        agenda_conjunto) sin documentarse.
  ¿Para qué? Dejar escrito qué es, quién la ve y qué reglas sigue, para
             que nadie la confunda con los Comunicados (RQF-014), que sí
             llegan a residentes y recicladores.
  ¿Impacto? Sin esto, la tabla y los 4 endpoints existían sin ninguna HU
            ni regla de negocio que dijera cómo deben comportarse
            (issue #368).
-->

---

## Identificación

| Campo         | Valor                                    |
| ------------- | ------------------------------------------ |
| **ID**        | RQF-020                                    |
| **Nombre**    | Agenda Interna del Conjunto                |
| **Módulo**    | Administración / Conjuntos                 |
| **Prioridad** | Baja                                       |
| **Estado**    | Implementado                               |
| **Usuarios**  | admin_conjunto                             |

---

## Descripción

El sistema debe permitir que el Administrador de Conjunto lleve, por cada conjunto que administra, una lista privada de temas pendientes para llevar al comité del conjunto (ej. "arreglar la puerta del sótano", "pintar el pasillo"), con una foto de soporte opcional. En el comité se discuten los temas: los que se resuelven se **archivan** (salen de "Por tratar" pero quedan guardados como historial) y, si se archivó uno por error, se puede devolver a "Por tratar".

La agenda es **privada**: solo la ve el Admin de Conjunto que administra ese conjunto. No genera notificaciones, no la ven residentes ni recicladores, y no llega al Administrador del Sistema. No confundir con los Comunicados (RQF-014), que sí se publican a residentes y recicladores.

---

## Flujos

### Flujo A — Agregar un tema

1. El Admin de Conjunto abre la opción **Agenda** del menú lateral (`/admin-conjunto/agenda`). Si administra más de un conjunto, elige el conjunto en las pestañas de arriba.
2. Presiona "Agregar tema", escribe el tema y, si quiere, sube una foto de soporte (usa el mismo campo de imagen adjunta que los comunicados).
3. Al guardar, el tema queda en estado **Pendiente** y aparece como una nota en la vista "Por tratar".

### Flujo B — Archivar un tema resuelto o devolverlo a Por tratar

1. Desde la nota, el Admin de Conjunto presiona "Archivar". El tema sale de "Por tratar", se guarda con su fecha de archivado y la pantalla ofrece "Deshacer".
2. En la vista "Archivadas" (historial, paginado de a 10) puede presionar "Volver a por tratar" en un tema archivado: vuelve a estado **Pendiente** y pierde la fecha de archivado.

### Flujo C — Eliminar un tema

1. El Admin de Conjunto presiona "Eliminar tema", en "Por tratar" o en "Archivadas".
2. El sistema pide confirmación (`ConfirmModal`): el tema se borra para siempre y no queda en el historial. Lo normal al resolver un tema es archivarlo, no eliminarlo.

### Flujo D — Descargar el historial en CSV (HU-049, issue #479)

1. En la Agenda, el Admin de Conjunto presiona "Descargar historial" (junto a "Agregar tema") y elige el estado (todos, por tratar o archivados) y, si quiere, un rango de fechas.
2. Presiona "Descargar CSV": el navegador baja `historial-agenda-<conjunto>-<desde>_<hasta>.csv`, que se abre en Excel con una fila por tema (tema, estado, creado, archivado, autor y foto).
3. Si el rango trae más de 500 temas, el sistema lo avisa en la misma ventana y pide acotar las fechas.

---

## Entradas

| Campo           | Tipo   | Obligatorio | Validaciones                                                         |
| --------------- | ------ | ----------- | --------------------------------------------------------------------- |
| `texto`         | Texto  | Sí          | Mínimo 1 carácter, máximo 1000 (mismo tope que el motivo de desvinculación) |
| `url_evidencia` | Texto  | No          | Máximo 500 caracteres. Archivo subido a VerdeApp (`/uploads/...`) o `https://` (RN-006) |
| `estado`        | Texto  | Sí (Flujo B)| Solo `PENDIENTE` o `ARCHIVADA`                                        |
| `limit`, `offset` | Número | No (historial) | `limit` de 1 a 100 (por defecto 10) y `offset` mínimo 0 en la lista de archivadas |
| `estado`, `desde`, `hasta` | Texto y fechas | No (descarga CSV) | `estado`: `PENDIENTE`, `ARCHIVADA` o `TODOS` (por defecto `TODOS`). `desde` y `hasta`: `AAAA-MM-DD` en hora de Bogotá, ambas opcionales; `desde` no puede ser posterior a `hasta` (RN-007) |

---

## Salidas

| Escenario                           | Código HTTP | Respuesta                                        |
| ------------------------------------ | ----------- | ------------------------------------------------- |
| Listar temas por tratar              | 200         | Lista de temas pendientes (`id`, `texto`, `url_evidencia`, `estado`, `created_at`, `archivado_en`) |
| Listar archivadas                    | 200         | `{"items": [...], "total": N}`: una página del historial, el último archivado primero |
| Tema creado                          | 201         | El tema creado                                    |
| Estado cambiado                      | 200         | El tema actualizado (`archivado_en` con fecha al archivar, `null` al restaurar) |
| Tema eliminado                       | 200         | `{"message": "Tema eliminado de la agenda."}`     |
| Descargar historial (CSV)            | 200         | Archivo `text/csv` como descarga (`Content-Disposition: attachment`); sin temas en el rango trae solo los encabezados |
| Rango con más de 500 temas o `desde` posterior a `hasta` | 400 | `{"detail": "El rango tiene N temas y el máximo por descarga es 500. Acota las fechas."}` (o el aviso del rango al revés) |
| Conjunto que no administra           | 403         | `{"detail": "No tienes permiso sobre este conjunto."}` |
| Tema que no existe o es de otro conjunto | 404     | `{"detail": "El tema no existe."}`                |

---

## Endpoints asociados

| Método | Ruta                                                                 | Auth requerida            | Descripción                       |
| ------ | --------------------------------------------------------------------- | -------------------------- | ---------------------------------- |
| GET    | `/api/v1/conjunto-panel/mis-conjuntos/{id_conjunto}/agenda`           | Sí (Admin de Conjunto)     | Lista los temas por tratar del conjunto |
| GET    | `/api/v1/conjunto-panel/mis-conjuntos/{id_conjunto}/agenda/archivadas?limit=&offset=` | Sí (Admin de Conjunto) | Lista paginada del historial (temas archivados) |
| POST   | `/api/v1/conjunto-panel/mis-conjuntos/{id_conjunto}/agenda`           | Sí (Admin de Conjunto)     | Agrega un tema                     |
| PATCH  | `/api/v1/conjunto-panel/mis-conjuntos/{id_conjunto}/agenda/{id_item}` | Sí (Admin de Conjunto)     | Archiva el tema o lo vuelve a pendiente |
| DELETE | `/api/v1/conjunto-panel/mis-conjuntos/{id_conjunto}/agenda/{id_item}` | Sí (Admin de Conjunto)     | Elimina el tema                    |
| GET    | `/api/v1/conjunto-panel/mis-conjuntos/{id_conjunto}/agenda/historial/csv?estado=&desde=&hasta=` | Sí (Admin de Conjunto) | Descarga el historial en CSV (máximo 500 temas) |

Código: `be/app/routers/conjunto_panel.py`, `be/app/services/agenda_conjunto_service.py`, `be/app/models/agenda_conjunto.py`; interfaz en `fe/src/pages/AdminConjuntoAgendaPage.tsx` (ruta `/admin-conjunto/agenda`, opción "Agenda" del menú del Admin de Conjunto).

---

## Reglas de negocio

- RN-001: Solo el Admin de Conjunto que administra el conjunto puede ver o modificar su agenda. Cada endpoint verifica el conjunto contra los conjuntos del administrador en sesión (403 si no es suyo), y cada tema se verifica contra su conjunto (404 si el tema es de otro conjunto).
- RN-002: La agenda es privada: no genera notificaciones y no la ven residentes, recicladores ni el Administrador del Sistema.
- RN-003: Un tema solo tiene dos estados: `PENDIENTE` (al crearlo) y `ARCHIVADA`. "Por tratar" lista los pendientes, del más reciente al más antiguo; "Archivadas" lista el historial, el último archivado primero. El estado `EN_ESPERA` ya no existe: la migración `a7b8c9d0e1f2` pasó a `PENDIENTE` los temas que lo tenían (issue #435).
- RN-004: Los temas no caducan solos, ni pendientes ni archivados: el comité no tiene una fecha fija que la app pueda conocer. Al resolverlos se archivan; solo se eliminan a mano si ya no se quieren ni como historial.
- RN-005: Si se borra el conjunto, se borran sus temas (`ON DELETE CASCADE`). Si se borra la cuenta del autor, el tema se conserva sin autor (`ON DELETE SET NULL`).
- RN-006: `url_evidencia` se valida con `EnlaceAdjunto`, igual que los comunicados: solo archivo subido a VerdeApp (`/uploads/...`) o `https://`; otro formato responde 422 — issue #369 (hallazgo CN-041 de Cyber Neo).
- RN-007: La descarga del historial (HU-049, issue #479) cumple las reglas del conjunto propio (RN-001: 403 si el conjunto no es del administrador) y además: tope de **500 temas** por archivo (400 si el rango trae más); `desde` no puede ser posterior a `hasta` (400); un archivado entra por su fecha de archivado y uno por tratar por su fecha de creación; las fechas se leen en hora de Bogotá (UTC-5, sin horario de verano); el autor sale como nombre y apellidos, no el correo; la foto sale como enlace completo; el CSV usa `;` y UTF-8 con BOM (para Excel en español); un texto que empieza con `=`, `+`, `-` o `@` lleva una comilla simple delante. No se registra quién descarga.

---

## Historias de usuario derivadas

| HU      | Descripción                                                    |
| ------- | ----------------------------------------------------------------|
| [HU-046](../HUs/HU-046_admin_conjunto_lleva_agenda_comite.md) | Admin de Conjunto lleva la agenda de temas para el comité |
| [HU-049](../HUs/HU-049_admin_conjunto_descarga_historial_agenda.md) | Admin de Conjunto descarga el historial de la agenda (CSV implementado; PDF por implementar) |
