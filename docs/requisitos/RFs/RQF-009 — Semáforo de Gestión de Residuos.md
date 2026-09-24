# RQF-009 — Semáforo de Gestión de Residuos

---

## Identificación

| Campo         | Valor                                      |
| ------------- | ------------------------------------------ |
| **ID** | RQF-009                                    |
| **Nombre** | Semáforo de Gestión de Residuos            |
| **Módulo** | Auditoría / Calificaciones                 |
| **Prioridad** | Baja (Opcional)                            |
| **Estado** | Implementado                               |
| **Usuarios** | reciclador, residente                      |

---

## Descripción

El sistema debe implementar un panel de auditoría cualitativa donde el 'Reciclador' pueda calificar la gestión de residuos del conjunto (Rojo: Malo, Amarillo: Regular, Verde: Excelente), permitiendo al 'Residente' visualizar este historial para fomentar la mejora continua.

---

## Entradas

> **Corrección (2026-09-24, issue #284)**: la nota de Endpoints (más abajo) ya se había actualizado, pero las tablas de Entradas, Proceso y Salidas seguían con el diseño original (campos `conjunto_id`/`calificacion`/`observaciones`, tabla `historial_semaforo`, respuesta con mensaje). Se actualizaron a lo que hace el código real: `crear_auditoria` en `be/app/routers/auditoria_conjunto.py` y `be/app/services/auditoria_conjunto_service.py`.

La petición es un formulario (`multipart/form-data`), porque lleva fotos.

| Campo                     | Tipo     | Obligatorio | Validaciones                                                                 |
| ------------------------- | -------- | ----------- | ---------------------------------------------------------------------------- |
| `id_conjunto_residencial` | UUID     | Sí          | El reciclador debe estar autorizado en ese conjunto y haber avisado su llegada (RQF-006). |
| `nivel_desempeno`         | Texto    | Sí          | `BUENA`, `REGULAR` o `DEFICIENTE` (en pantalla: Bueno / Regular / Malo). La BD también admite `EXCELENTE`, que solo tienen auditorías viejas. |
| `tema_educativo`          | Texto    | Sí          | Categoría del contenido educativo relacionada con lo observado. No puede ir vacío. Máximo 255 caracteres. |
| `descripcion`             | Texto    | No          | Observaciones libres, sin límite de largo.                                   |
| `evidencias`              | Archivos | Sí          | Entre 1 y 3 fotos (JPG, PNG o WEBP, máximo 5 MB cada una, validadas por contenido real). |

---

## Proceso

1. El **Reciclador**, con su llegada avisada en el conjunto, presiona "Auditar ahora" en su panel.
2. Elige el nivel (Bueno / Regular / Malo), el tema, una descripción opcional y de 1 a 3 fotos.
3. El frontend envía `POST /api/v1/auditorias-conjunto` como formulario.
4. El backend valida que el reciclador esté autorizado y presente, que no haya auditado ese conjunto en las últimas 24 horas (RN-002) y que las fotos sean imágenes reales. Guarda las fotos en `be/app/uploads/evidencias-auditoria/` y el registro en la tabla `auditorias_conjunto`.
5. Si el nivel es Regular o Malo, se recomienda contenido educativo a los residentes (RQF-013).
6. El **Residente** (o el Admin de Conjunto) consulta `GET /api/v1/auditorias-conjunto/historial` y ve el historial de su conjunto, de la más reciente a la más antigua.
7. El frontend muestra cada auditoría con su color de semáforo (`fe/src/config/nivelesDesempeno.ts`).

---

## Salidas

| Escenario                                | Código HTTP | Respuesta                                                                                  |
| ---------------------------------------- | ----------- | ------------------------------------------------------------------------------------------ |
| Registro exitoso                         | 201         | La auditoría creada: `id_auditoria`, `id_conjunto_residencial`, `nombre_conjunto`, `nivel_desempeno`, `tema_educativo`, `descripcion`, `ruta_evidencia` (y `ruta_evidencia_2`/`_3` si hay), `created_at`, entre otros |
| Consulta de historial                    | 200         | Lista de auditorías con esos mismos campos                                                 |
| Otro rol intenta auditar                 | 403         | `{"detail": "Solo un Reciclador puede auditar un conjunto."}`                              |
| No autorizado en el conjunto             | 403         | `{"detail": "No estás autorizado en ese conjunto."}`                                       |
| Sin avisar su llegada                    | 400         | `{"detail": "Debes avisar tu llegada a este conjunto antes de poder auditarlo."}`          |
| Ya auditó hace menos de 24 h (RN-002)    | 400         | `{"detail": "Ya auditaste este conjunto hace menos de 24 horas."}`                         |
| Cantidad de fotos fuera de rango         | 400         | `{"detail": "Debes adjuntar entre 1 y 3 fotos de evidencia."}`                             |
| Tema vacío                               | 400         | `{"detail": "Selecciona un tema."}`                                                        |

---

## Endpoints asociados

> **Nota (2026-08-28)**: los endpoints y el nombre de la calificación cambiaron durante la implementación real — se documentan aquí actualizados. La tabla ya no se llama `historial_semaforo`, es `auditorias_conjunto`; la calificación no es un enum `ROJO/AMARILLO/VERDE` sino `EXCELENTE/BUENA/REGULAR/DEFICIENTE` en la base de datos (el reciclador solo puede elegir entre 3 al calificar: Bueno/Regular/Malo — ver `docs/conceptos/patrones-arquitectonicos.md` y `fe/src/config/nivelesDesempeno.ts`).

| Método | Ruta                                      | Auth requerida | Descripción                                      |
| ------ | ----------------------------------------- | -------------- | ------------------------------------------------ |
| POST   | `/api/v1/auditorias-conjunto`             | Sí (Reciclador)| Registra una nueva auditoría para el conjunto, con 1 a 3 fotos de evidencia |
| GET    | `/api/v1/auditorias-conjunto/historial`   | Sí (Residente, Admin de Conjunto) | Obtiene el historial de auditorías del conjunto |
| GET    | `/api/v1/auditorias-conjunto/mias`        | Sí (Reciclador) | Historial de las auditorías que el reciclador mismo envió |
| GET    | `/api/v1/auditorias-conjunto/{id}`        | Sí (Residente, Admin de Conjunto, o el Reciclador que la envió) | Detalle de una auditoría puntual |
| GET    | `/api/v1/auditorias-conjunto/admin`       | Sí (Admin Sistema) | Lista todas las auditorías de todos los conjuntos, filtrables por la semana (parámetro `lunes`, formato `YYYY-MM-DD` — devuelve `[lunes, lunes+7)`); cada ítem incluye `avisados` (cuántos Residentes recibieron la recomendación automática de RQF-013 por esa auditoría) |

<!-- ¿Qué? `GET /admin` se agregó junto con el rediseño de RQF-010 (pestaña
     "Calificaciones por conjunto" del panel de Contenido educativo) — el
     Admin Sistema necesitaba ver, semana a semana, el semáforo de TODOS los
     conjuntos en un solo lugar, no conjunto por conjunto como ya permitía
     `/historial`. ¿Para qué? Decidir a qué conjuntos conviene enviarles
     contenido educativo a mano (RQF-013, Flujo C) cuando su calificación fue
     Regular o Malo. ¿Impacto? Nuevo — no reemplaza ningún endpoint existente. -->

---

## Reglas de negocio

- RN-001: Exclusividad de escritura. Solo el rol `reciclador` tiene permisos para crear una auditoría. El rol `residente` (y el Admin de Conjunto) tienen acceso estricto de solo lectura. **Implementado y verificado.**
- RN-002: Límite de frecuencia. Para evitar spam, un reciclador solo puede emitir una calificación por conjunto cada 24 horas. **Implementado (2026-08-29)** — `crear_auditoria` rechaza con 400 una segunda auditoría del mismo reciclador al mismo conjunto antes de que pasen 24 horas. El recordatorio visual de 7 días sigue existiendo aparte, como sugerencia de cuándo conviene volver.