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
| **Usuarios** | reciclador, residente, admin de conjunto   |

---

## Descripción

El sistema debe implementar un panel de auditoría cualitativa donde el 'Reciclador' pueda calificar la gestión de residuos del conjunto (Rojo: Malo, Amarillo: Regular, Verde: Bueno), permitiendo al 'Residente' visualizar este historial para fomentar la mejora continua.

---

## Entradas

> **Corrección (2026-09-24, issue #284)**: la nota de Endpoints (más abajo) ya se había actualizado, pero las tablas de Entradas, Proceso y Salidas seguían con el diseño original (campos `conjunto_id`/`calificacion`/`observaciones`, tabla `historial_semaforo`, respuesta con mensaje). Se actualizaron a lo que hace el código real: `crear_auditoria` en `be/app/routers/auditoria_conjunto.py` y `be/app/services/auditoria_conjunto_service.py`.

La petición es un formulario (`multipart/form-data`), porque lleva fotos.

| Campo                     | Tipo     | Obligatorio | Validaciones                                                                 |
| ------------------------- | -------- | ----------- | ---------------------------------------------------------------------------- |
| `id_conjunto_residencial` | UUID     | Sí          | El reciclador debe estar autorizado en ese conjunto y haber avisado su llegada (RQF-006). |
| `nivel_desempeno`         | Texto    | Sí          | `BUENA`, `REGULAR` o `DEFICIENTE` (en pantalla: Bueno / Regular / Malo). El nivel `EXCELENTE` se retiró (2026-10-21); la migración `b1c2d3e4f5a6` convirtió las filas viejas a `BUENA`. |
| `tema_educativo`          | Texto    | Sí          | Categoría del contenido educativo relacionada con lo observado. No puede ir vacío. Máximo 255 caracteres. |
| `descripcion`             | Texto    | No          | Observaciones libres. Máximo 255 caracteres (HU-010, issue #352).         |
| `evidencias`              | Archivos | Sí          | Entre 1 y 3 fotos (JPG, PNG o WEBP, máximo 5 MB cada una, validadas por contenido real). |

---

## Proceso

1. El **Reciclador**, con su llegada avisada en el conjunto, presiona "Auditar ahora" en su panel.
2. Elige el nivel (Bueno / Regular / Malo), el tema, una descripción opcional y de 1 a 3 fotos.
3. El frontend envía `POST /api/v1/auditorias-conjunto` como formulario.
4. El backend valida que el reciclador esté autorizado y presente, que no haya auditado ese conjunto en las últimas 24 horas (RN-002) y que las fotos sean imágenes reales. Guarda las fotos en `be/app/uploads/evidencias-auditoria/` y el registro en la tabla `auditorias_conjunto`.
5. Si el nivel es Regular o Malo, se recomienda contenido educativo a los residentes (RQF-013).
6. El **Residente** (o el Admin de Conjunto) consulta `GET /api/v1/auditorias-conjunto/historial` y ve el historial de su conjunto, de la más reciente a la más antigua y de a páginas de 10 (`limit` y `offset`; la respuesta trae también el `total`, y la lista muestra "Mostrando 1–10 de N" con flechas). El Reciclador ve de la misma forma las que él envió, con `GET /api/v1/auditorias-conjunto/mias`.
7. El frontend muestra cada auditoría con su color de semáforo (`fe/src/config/nivelesDesempeno.ts`).
8. El **Admin de Conjunto** ve el desempeño semanal de su conjunto en la página "Desempeño" del menú (`/admin-conjunto/desempeno`, HU-052, issue #487): tarjetas de resumen, una gráfica de barras apiladas con una barra por semana (lunes a domingo, hora de Bogotá), la lista de auditorías de la semana que se toca, el ranking "Temas del período" y un botón "Ver como tabla". Pide los datos a `GET /auditorias-conjunto/desempeno` y `/desempeno/semana` (issue #486); con menos de 4 auditorías en el período avisa en vez de dibujar la gráfica. La gráfica usa `recharts`, cargada bajo demanda (`fe/src/pages/AdminConjuntoDesempenoPage.tsx` y `fe/src/components/desempeno/`). La barra semanal que vivía dentro del acordeón de cada conjunto (`HistorialAuditoriasSemanal.tsx`, semanas en UTC) se retiró. El Residente sigue viendo la lista simple del paso 6.
9. El **Residente** ve el mismo desempeño semanal en la sección "Desempeño de mi conjunto" de su panel principal (HU-053, issue #488), arriba de la lista del paso 6. Usa el mismo componente que el paso 8 (`PanelDesempeno`) pero sin selector de conjunto ni de período: pide `GET /auditorias-conjunto/desempeno` sin `id_conjunto` y con 8 semanas, y el servidor usa su único conjunto (pedir otro responde 403). El aviso de pocos datos y el mínimo de 4 auditorías son los mismos.

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

> **Nota (2026-08-28)**: los endpoints y el nombre de la calificación cambiaron durante la implementación real — se documentan aquí actualizados. La tabla ya no se llama `historial_semaforo`, es `auditorias_conjunto`; la calificación no es un enum `ROJO/AMARILLO/VERDE` sino `BUENA/REGULAR/DEFICIENTE` en la base de datos (en pantalla: Bueno/Regular/Malo; el cuarto nivel `EXCELENTE` que existía al inicio se retiró el 2026-10-21 — ver `docs/conceptos/patrones-arquitectonicos.md` y `fe/src/config/nivelesDesempeno.ts`).

| Método | Ruta                                      | Auth requerida | Descripción                                      |
| ------ | ----------------------------------------- | -------------- | ------------------------------------------------ |
| POST   | `/api/v1/auditorias-conjunto`             | Sí (Reciclador)| Registra una nueva auditoría para el conjunto, con 1 a 3 fotos de evidencia |
| GET    | `/api/v1/auditorias-conjunto/historial`   | Sí (Residente, Admin de Conjunto) | Obtiene, de a páginas, el historial de auditorías del conjunto. Parámetros: `limit` (1 a 100; 20 por defecto) y `offset`. Responde `{"items": [...], "total": N}`; fuera de rango responde 422 |
| GET    | `/api/v1/auditorias-conjunto/mias`        | Sí (Reciclador) | Historial, de a páginas, de las auditorías que el reciclador mismo envió. Mismos parámetros y misma respuesta `{items, total}` que `/historial` |
| GET    | `/api/v1/auditorias-conjunto/mias/ultimas` | Sí (Reciclador) | Por cada conjunto que el reciclador ya auditó, la fecha de su última auditoría: `[{"id_conjunto_residencial": "...", "ultima_auditoria": "..."}]`. Un conjunto nunca auditado no aparece |
| GET    | `/api/v1/auditorias-conjunto/desempeno`   | Sí (Residente, Admin de Conjunto) | Conteo de auditorías de UN conjunto por semana (Bueno/Regular/Malo) y por tema. Parámetros: `id_conjunto` (opcional si el usuario tiene un solo conjunto; con varios responde 422) y `semanas` (4, 8 o 12; por defecto 8; otro valor responde 422). Incluye la semana en curso, las semanas sin auditorías salen en cero y la más antigua va primero. Responde `id_conjunto_residencial`, `total`, `semanas` y `temas` |
| GET    | `/api/v1/auditorias-conjunto/desempeno/semana` | Sí (Residente, Admin de Conjunto) | Auditorías de una semana concreta de un conjunto, más recientes primero, con el mismo formato que `/historial`. Parámetros: `lunes` (`YYYY-MM-DD`, debe ser lunes; si no, 422) e `id_conjunto` (misma regla de arriba) |
| GET    | `/api/v1/auditorias-conjunto/{id}`        | Sí (Residente, Admin de Conjunto, o el Reciclador que la envió) | Detalle de una auditoría puntual |
| GET    | `/api/v1/auditorias-conjunto/admin`       | Sí (Admin Sistema) | Lista todas las auditorías de todos los conjuntos, filtrables por la semana (parámetro `lunes`, formato `YYYY-MM-DD` — devuelve `[lunes, lunes+7)` en hora de Bogotá); cada ítem incluye `avisados` (cuántos Residentes recibieron la recomendación automática de RQF-013 por esa auditoría), `id_localidad` y `nombre_localidad` (la localidad del conjunto auditado) |

<!-- ¿Qué? `GET /admin` se agregó junto con el rediseño de RQF-010 (pestaña
     "Calificaciones por conjunto" del panel de Contenido educativo) — el
     Admin Sistema necesitaba ver, semana a semana, el semáforo de TODOS los
     conjuntos en un solo lugar, no conjunto por conjunto como ya permitía
     `/historial`. ¿Para qué? Decidir a qué conjuntos conviene enviarles
     contenido educativo a mano (RQF-013, Flujo C) cuando su calificación fue
     Regular o Malo. ¿Impacto? Nuevo — no reemplaza ningún endpoint existente. -->

<!-- ¿Qué? Filtros de la pestaña "Calificaciones por conjunto" (issue #518): conjunto,
     rango de fechas "desde / hasta" dentro de la semana, nivel, búsqueda por texto y
     orden (peor calificación primero por defecto, más recientes o conjunto A–Z), más el botón "Limpiar filtros". Siempre visibles: búsqueda, localidad, conjunto y nivel;
     fechas y orden van plegados en "Más filtros" (el botón muestra cuántos hay activos), y
     sin calificaciones esa semana los controles se desactivan. ¿Para qué? Con muchos conjuntos el Admin
     Sistema necesita llegar a las calificaciones de uno solo o de unos días. ¿Impacto?
     También se filtra por localidad (primero la localidad, luego solo sus conjuntos en
     el selector de conjunto), por eso `GET /admin` ahora devuelve `id_localidad` y
     `nombre_localidad` de cada auditoría (sin migración: el dato ya está en el conjunto).
     Los filtros se aplican en el frontend; el filtro por fecha usa el día de Bogotá
     (igual que la semana). Como el endpoint entrega como máximo 200 por
     página, el frontend pide página tras página (`offset`) hasta traer las `total` de la
     semana: antes una semana con más de 100 auditorías se veía incompleta, sin aviso. -->

<!-- ¿Qué? Paginación de `/historial` y `/mias`, y semana de Bogotá en `/admin`.
     ¿Para qué? `/historial` entregaba como máximo las 50 auditorías más recientes
     y `/mias` todas, sin tope: con muchas auditorías, la primera cortaba el resto
     sin avisar y la segunda podía crecer sin límite. `/admin?lunes=` cortaba la
     semana en UTC: una auditoría del domingo a las 9 p. m. en Bogotá ya es lunes
     en UTC y caía en la semana siguiente (igual que corrigió #486 para el
     desempeño). ¿Impacto? Las dos listas cambian de forma: de un arreglo a
     `{items, total}`. Como `/mias` ya no trae la última auditoría de cada
     conjunto, el aviso "ya puedes calificar" del Reciclador (cada 7 días) usa
     `/mias/ultimas`, una fila por conjunto calculada en SQL. -->

<!-- ¿Qué? `GET /desempeno` y `GET /desempeno/semana` (issue #486). Cuentan
     en la base de datos (GROUP BY), así que pasadas las 50 auditorías que
     corta `/historial` no se pierde ninguna. ¿Para qué? Alimentar la gráfica
     semanal del Admin de Conjunto y del Residente (investigación #437).
     ¿Impacto? Las semanas se cortan en hora de Bogotá (UTC-5), de lunes a
     domingo: una auditoría del domingo 9 p. m. cuenta en esa semana y no en
     la siguiente, a diferencia de la barra del acordeón (UTC) que
     reemplazó la página "Desempeño" (#487, paso 8). Permisos: el Residente
     solo su conjunto y el Admin de Conjunto solo los de asignación activa;
     conjunto ajeno, Reciclador y Admin del Sistema responden 403. -->

---

## Reglas de negocio

- RN-001: Exclusividad de escritura. Solo el rol `reciclador` tiene permisos para crear una auditoría. El rol `residente` (y el Admin de Conjunto) tienen acceso estricto de solo lectura. **Implementado y verificado.**
- RN-002: Límite de frecuencia. Para evitar spam, un reciclador solo puede emitir una calificación por conjunto cada 24 horas. **Implementado (2026-08-29)** — `crear_auditoria` rechaza con 400 una segunda auditoría del mismo reciclador al mismo conjunto antes de que pasen 24 horas. El recordatorio visual de 7 días sigue existiendo aparte, como sugerencia de cuándo conviene volver.