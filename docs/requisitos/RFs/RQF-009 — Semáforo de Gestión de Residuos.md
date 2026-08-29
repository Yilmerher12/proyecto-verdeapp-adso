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

| Campo           | Tipo   | Obligatorio | Validaciones                                                                 |
| --------------- | ------ | ----------- | ---------------------------------------------------------------------------- |
| `conjunto_id`   | Número | Sí          | Debe ser un ID de conjunto válido en la base de datos.                       |
| `calificacion`  | Enum   | Sí          | Valores permitidos: `ROJO`, `AMARILLO`, `VERDE`                              |
| `observaciones` | Texto  | No          | Máximo 255 caracteres.                                                       |

---

## Proceso

1. El usuario con rol **Reciclador**, tras realizar la recolección, ingresa al panel de auditoría en la aplicación.
2. Selecciona el `conjunto_id` y asigna un color del semáforo basado en la calidad de separación de los residuos. Opcionalmente, añade una observación.
3. El frontend (React) envía una petición `POST` al backend con estos datos.
4. El backend (FastAPI) valida que el reciclador tenga permisos sobre ese conjunto y guarda el registro en la base de datos PostgreSQL (tabla `historial_semaforo`) con la fecha y hora actual.
5. El usuario con rol **Residente** ingresa a su panel y realiza una petición `GET` para consultar el historial de su conjunto.
6. El backend retorna la lista de calificaciones históricas.
7. El frontend renderiza el historial utilizando indicadores visuales (Rojo, Amarillo, Verde).

---

## Salidas

| Escenario           | Código HTTP | Respuesta                                                                                                    |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| Registro exitoso    | 201         | `{"message": "Calificación registrada exitosamente."}`                                                       |
| Consulta exitosa    | 200         | JSON con historial: `[{"fecha": "...", "calificacion": "VERDE", "observaciones": "..."}]`                    |

---

## Endpoints asociados

> **Nota (2026-08-28)**: los endpoints y el nombre de la calificación cambiaron durante la implementación real — se documentan aquí actualizados. La tabla ya no se llama `historial_semaforo`, es `auditorias_conjunto`; la calificación no es un enum `ROJO/AMARILLO/VERDE` sino `EXCELENTE/BUENA/REGULAR/DEFICIENTE` en la base de datos (el reciclador solo puede elegir entre 3 al calificar: Bueno/Regular/Malo — ver `docs/conceptos/patrones-arquitectonicos.md` y `fe/src/config/nivelesDesempeno.ts`).

| Método | Ruta                                      | Auth requerida | Descripción                                      |
| ------ | ----------------------------------------- | -------------- | ------------------------------------------------ |
| POST   | `/api/v1/auditorias-conjunto`             | Sí (Reciclador)| Registra una nueva auditoría para el conjunto, con 1 a 3 fotos de evidencia |
| GET    | `/api/v1/auditorias-conjunto/historial`   | Sí (Residente, Admin de Conjunto) | Obtiene el historial de auditorías del conjunto |
| GET    | `/api/v1/auditorias-conjunto/mias`        | Sí (Reciclador) | Historial de las auditorías que el reciclador mismo envió |
| GET    | `/api/v1/auditorias-conjunto/{id}`        | Sí (Residente, Admin de Conjunto, o el Reciclador que la envió) | Detalle de una auditoría puntual |

---

## Reglas de negocio

- RN-001: Exclusividad de escritura. Solo el rol `reciclador` tiene permisos para crear una auditoría. El rol `residente` (y el Admin de Conjunto) tienen acceso estricto de solo lectura. **Implementado y verificado.**
- RN-002: Límite de frecuencia. Para evitar spam, un reciclador solo puede emitir una calificación por conjunto cada 24 horas. **Implementado (2026-08-29)** — `crear_auditoria` rechaza con 400 una segunda auditoría del mismo reciclador al mismo conjunto antes de que pasen 24 horas. El recordatorio visual de 7 días sigue existiendo aparte, como sugerencia de cuándo conviene volver.