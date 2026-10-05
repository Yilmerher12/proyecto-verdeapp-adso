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

El sistema debe permitir que el Administrador de Conjunto lleve, por cada conjunto que administra, una lista privada de temas pendientes para llevar al comité del conjunto (ej. "arreglar la puerta del sótano", "pintar el pasillo"), con una foto de soporte opcional. En el comité se discuten los temas: los resueltos se borran y los que se aplazan se dejan "en espera".

La agenda es **privada**: solo la ve el Admin de Conjunto que administra ese conjunto. No genera notificaciones, no la ven residentes ni recicladores, y no llega al Administrador del Sistema. No confundir con los Comunicados (RQF-014), que sí se publican a residentes y recicladores.

---

## Flujos

### Flujo A — Agregar un tema

1. El Admin de Conjunto abre su panel principal y, dentro del acordeón de uno de sus conjuntos, abre "Agenda del conjunto".
2. Escribe el tema y, si quiere, sube una foto de soporte (usa el mismo campo de imagen adjunta que los comunicados).
3. Al guardar, el tema queda en estado **Pendiente**, arriba en la lista.

### Flujo B — Dejar un tema en espera o volverlo a pendiente

1. Desde la lista, el Admin de Conjunto presiona "Dejar en espera" en un tema pendiente (o "Volver a pendiente" en uno en espera).
2. El tema cambia de estado y de lugar: primero se listan los pendientes y después los que están en espera.

### Flujo C — Eliminar un tema resuelto

1. El Admin de Conjunto presiona "Eliminar tema".
2. El sistema pide confirmación (`ConfirmModal`): el tema se borra para siempre.

---

## Entradas

| Campo           | Tipo   | Obligatorio | Validaciones                                                         |
| --------------- | ------ | ----------- | --------------------------------------------------------------------- |
| `texto`         | Texto  | Sí          | Mínimo 1 carácter, máximo 1000 (mismo tope que el motivo de desvinculación) |
| `url_evidencia` | Texto  | No          | Máximo 500 caracteres. Archivo subido a VerdeApp (`/uploads/...`) o `https://` (RN-006) |
| `estado`        | Texto  | Sí (Flujo B)| Solo `PENDIENTE` o `EN_ESPERA`                                        |

---

## Salidas

| Escenario                           | Código HTTP | Respuesta                                        |
| ------------------------------------ | ----------- | ------------------------------------------------- |
| Listar temas                         | 200         | Lista de temas (`id`, `texto`, `url_evidencia`, `estado`, `created_at`) |
| Tema creado                          | 201         | El tema creado                                    |
| Estado cambiado                      | 200         | El tema actualizado                               |
| Tema eliminado                       | 200         | `{"message": "Tema eliminado de la agenda."}`     |
| Conjunto que no administra           | 403         | `{"detail": "No tienes permiso sobre este conjunto."}` |
| Tema que no existe o es de otro conjunto | 404     | `{"detail": "El tema no existe."}`                |

---

## Endpoints asociados

| Método | Ruta                                                                 | Auth requerida            | Descripción                       |
| ------ | --------------------------------------------------------------------- | -------------------------- | ---------------------------------- |
| GET    | `/api/v1/conjunto-panel/mis-conjuntos/{id_conjunto}/agenda`           | Sí (Admin de Conjunto)     | Lista los temas del conjunto       |
| POST   | `/api/v1/conjunto-panel/mis-conjuntos/{id_conjunto}/agenda`           | Sí (Admin de Conjunto)     | Agrega un tema                     |
| PATCH  | `/api/v1/conjunto-panel/mis-conjuntos/{id_conjunto}/agenda/{id_item}` | Sí (Admin de Conjunto)     | Cambia el estado del tema          |
| DELETE | `/api/v1/conjunto-panel/mis-conjuntos/{id_conjunto}/agenda/{id_item}` | Sí (Admin de Conjunto)     | Elimina el tema                    |

Código: `be/app/routers/conjunto_panel.py`, `be/app/services/agenda_conjunto_service.py`, `be/app/models/agenda_conjunto.py`; interfaz en `SeccionAgenda` de `fe/src/pages/dashboards/AdminConjuntoDashboard.tsx`.

---

## Reglas de negocio

- RN-001: Solo el Admin de Conjunto que administra el conjunto puede ver o modificar su agenda. Cada endpoint verifica el conjunto contra los conjuntos del administrador en sesión (403 si no es suyo), y cada tema se verifica contra su conjunto (404 si el tema es de otro conjunto).
- RN-002: La agenda es privada: no genera notificaciones y no la ven residentes, recicladores ni el Administrador del Sistema.
- RN-003: Un tema solo tiene dos estados: `PENDIENTE` (al crearlo) y `EN_ESPERA`. La lista muestra primero los pendientes y, dentro de cada grupo, del más reciente al más antiguo.
- RN-004: Los temas no caducan solos: el comité no tiene una fecha fija que la app pueda conocer. Se eliminan a mano cuando se resuelven.
- RN-005: Si se borra el conjunto, se borran sus temas (`ON DELETE CASCADE`). Si se borra la cuenta del autor, el tema se conserva sin autor (`ON DELETE SET NULL`).
- RN-006: `url_evidencia` se valida con `EnlaceAdjunto`, igual que los comunicados: solo archivo subido a VerdeApp (`/uploads/...`) o `https://`; otro formato responde 422 — issue #369 (hallazgo CN-041 de Cyber Neo).

---

## Historias de usuario derivadas

| HU      | Descripción                                                    |
| ------- | ----------------------------------------------------------------|
| [HU-046](../HUs/HU-046_admin_conjunto_lleva_agenda_comite.md) | Admin de Conjunto lleva la agenda de temas para el comité |
