# RQF-021 — Novedades Enviadas al Administrador del Sistema y Bandeja de Solicitudes Pendientes

<!--
  ¿Qué? Requisito funcional del canal "de abajo hacia arriba": Residente,
        Reciclador o Admin de Conjunto le escriben una novedad al
        Administrador del Sistema, que la recibe en una bandeja unificada
        junto con las solicitudes de desvinculación (RQF-016). Se agregó en
        código en el commit 513c76d (tabla novedades_enviadas) sin
        documentarse.
  ¿Para qué? Dejar claro qué es, a quién llega y qué reglas sigue — y
             separarlo de las Novedades de RQF-015, que van en la dirección
             contraria (el Admin Sistema publica hacia todos).
  ¿Impacto? Issue #368.
-->

---

## Identificación

| Campo         | Valor                                    |
| ------------- | ------------------------------------------ |
| **ID**        | RQF-021                                    |
| **Nombre**    | Novedades Enviadas al Administrador del Sistema y Bandeja de Solicitudes Pendientes |
| **Módulo**    | Comunicación / Administración              |
| **Prioridad** | Media                                      |
| **Estado**    | Parcial                                    |
| **Usuarios**  | residente, reciclador, admin_conjunto, admin_sistema |

---

## Descripción

El sistema debe permitir que un Residente, un Reciclador o un Admin de Conjunto le **envíe** una novedad al Administrador del Sistema (texto y, de forma opcional, una imagen), por ejemplo para reportar un problema o contar algo que pasó en su conjunto. El autor no escribe sus datos: el sistema los toma de su cuenta (nombre, rol, conjunto y unidad).

El Administrador del Sistema recibe esas novedades en la bandeja **"Solicitudes pendientes"** de su panel, que junta en una sola lista dos cosas que por dentro son tablas distintas: las solicitudes de desvinculación de los Admins de Conjunto (RQF-016) y estas novedades enviadas. La bandeja se puede filtrar por tipo.

**No confundir** con las Novedades de RQF-015: esas las publica el Administrador del Sistema hacia los usuarios. Las de este RF van en la dirección contraria.

**Estado Parcial:** el formulario muestra el campo "Imagen adjunta" a los 3 roles, pero el endpoint de subida (`be/app/routers/uploads.py`) solo deja subir archivos a los dos roles de administrador. Un Residente o Reciclador que intenta adjuntar una imagen recibe 403 ("No tienes permiso para subir archivos adjuntos."); sí puede enviar la novedad solo con texto. Se resuelve en el issue #369.

---

## Flujos

### Flujo A — Enviar una novedad (Residente, Reciclador o Admin de Conjunto)

1. El usuario abre la pestaña **Novedades** del menú lateral y elige la sub-pestaña **"Escribir novedad"**.
2. Escribe la novedad y, de forma opcional, adjunta una imagen.
3. Si es un Admin de Conjunto con más de un conjunto, elige de cuál conjunto habla (o "Ninguno en particular").
4. Al enviarla, el sistema guarda la novedad en estado **NUEVA**, con el conjunto que corresponde (RN-003), y muestra "Novedad enviada. El Administrador del Sistema la revisará."

### Flujo B — Ver mis envíos

1. En la sub-pestaña **"Mis envíos"**, el autor ve sus novedades, de la más reciente a la más antigua, con su estado: "Enviada" (NUEVA) o "Vista por el Admin del Sistema" (VISTA).

### Flujo C — Revisar la bandeja (Administrador del Sistema)

1. En su panel principal, el Administrador del Sistema ve el resumen "Solicitudes pendientes" con el número de pendientes y abre la bandeja.
2. La bandeja lista, de la más reciente a la más antigua, las desvinculaciones pendientes y las novedades en estado NUEVA. Se puede filtrar por **Todas**, **Desvinculación** o **Novedad**.
3. Cada novedad muestra el rol y nombre del autor (y, si es Residente, su torre y apartamento), el conjunto, el texto y, si tiene, un enlace "Ver foto".
4. Una **novedad** solo se puede **marcar como vista**: pasa a VISTA y sale de la bandeja. Una **desvinculación** se aprueba o se rechaza con su flujo de siempre (RQF-016).

---

## Entradas

| Campo                     | Tipo   | Obligatorio | Validaciones                                                        |
| -------------------------- | ------ | ----------- | -------------------------------------------------------------------- |
| `texto`                   | Texto  | Sí          | Mínimo 1 carácter, máximo 1000                                       |
| `url_imagen`              | Texto  | No          | Máximo 500 caracteres (sin validar el formato todavía, ver RN-007)   |
| `id_conjunto_residencial` | UUID   | No          | Solo lo usa el Admin de Conjunto; debe ser uno de sus conjuntos      |
| `tipo` (al resolver)      | Texto  | Sí          | `DESVINCULACION` o `NOVEDAD`                                          |
| `aprobar` (al resolver)   | Booleano | Sí        | Una novedad solo admite `true` (marcar como vista)                    |

---

## Salidas

| Escenario                                      | Código HTTP | Respuesta                                                          |
| ----------------------------------------------- | ----------- | -------------------------------------------------------------------- |
| Novedad enviada                                 | 201         | `{"message": "Novedad enviada. El Administrador del Sistema la revisará."}` |
| Mis envíos                                      | 200         | Lista (`id`, `texto`, `url_imagen`, `estado`, `nombre_conjunto`, `created_at`) |
| El Admin Sistema intenta enviar una novedad     | 403         | `{"detail": "Tu rol no puede enviar novedades."}`                    |
| Admin de Conjunto elige un conjunto que no es suyo | 403      | `{"detail": "No tienes permiso sobre este conjunto."}`               |
| Bandeja                                         | 200         | Lista unificada (`id`, `tipo`, `titulo`, `origen`, `nombre_conjunto`, `detalle`, `url_evidencia`, `estado`, `created_at`) |
| Novedad marcada como vista                      | 200         | `{"message": "Solicitud aprobada."}`                                 |
| Intentar "rechazar" una novedad                 | 400         | `{"detail": "Una novedad solo se marca como vista."}`                |
| Novedad ya vista                                | 400         | `{"detail": "Esta novedad ya fue vista."}`                           |

---

## Endpoints asociados

| Método | Ruta                                                           | Auth requerida                                  | Descripción                          |
| ------ | ---------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------- |
| POST   | `/api/v1/novedades-enviadas`                                    | Sí (Residente, Reciclador, Admin de Conjunto)     | Envía una novedad                     |
| GET    | `/api/v1/novedades-enviadas/mias`                               | Sí                                                | Novedades que yo envié                |
| GET    | `/api/v1/admin-conjunto/solicitudes?tipo=`                      | Sí (Admin Sistema)                                | Bandeja unificada, filtrable por tipo |
| POST   | `/api/v1/admin-conjunto/solicitudes/{tipo}/{id_solicitud}/resolver` | Sí (Admin Sistema)                            | Resuelve una solicitud de la bandeja  |

Código: `be/app/routers/novedades_enviadas.py`, `be/app/routers/admin_conjunto.py`, `be/app/services/novedad_enviada_service.py`, `be/app/models/novedad_enviada.py`; interfaz en `fe/src/components/NovedadesEnviadas.tsx` (pestañas de `NovedadesFeedPage.tsx`) y `fe/src/components/SolicitudesPendientes.tsx` (panel del Admin Sistema).

---

## Reglas de negocio

- RN-001: Solo pueden enviar novedades el Residente, el Reciclador y el Admin de Conjunto. El Administrador del Sistema no (403): él es quien las recibe.
- RN-002: El autor sale siempre de la sesión: nadie escribe su nombre, rol ni unidad a mano.
- RN-003: El conjunto de la novedad se toma así: **Residente**, el de su unidad; **Admin de Conjunto**, el que eligió (debe ser uno de los suyos; si tiene uno solo, ese); **Reciclador**, ninguno (puede trabajar en varios conjuntos).
- RN-004: Una novedad no se aprueba ni se rechaza: el Administrador del Sistema solo la marca como **vista**. Una vez vista no se puede volver a marcar.
- RN-005: La bandeja muestra solo lo pendiente: desvinculaciones sin resolver y novedades en estado NUEVA, de la más reciente a la más antigua.
- RN-006: Si se borra la cuenta del autor o el conjunto, la novedad se conserva sin ese dato (`ON DELETE SET NULL`); en la bandeja aparece como "Usuario eliminado".
- RN-007: Pendiente de corregir (issue #369, hallazgo CN-041): el Residente y el Reciclador no pueden subir la imagen (ver Estado Parcial arriba), y `url_imagen` no valida el formato del enlace.
- RN-008: Pendiente de endurecer (issue #372, hallazgos CN-042/044/045): el envío no tiene límite de peticiones, la bandeja no está paginada y un `tipo` desconocido al resolver se trata como novedad.

---

## Historias de usuario derivadas

| HU      | Descripción                                                    |
| ------- | ----------------------------------------------------------------|
| [HU-047](../HUs/HU-047_usuario_envia_novedad_admin_sistema.md) | Residente, Reciclador o Admin de Conjunto envía una novedad al Admin Sistema |
| [HU-048](../HUs/HU-048_admin_sistema_revisa_bandeja_solicitudes.md) | Admin Sistema revisa la bandeja unificada de solicitudes pendientes |
