# RQF-009 — Semáforo de Gestión de Residuos

---

## Identificación

| Campo         | Valor                                      |
| ------------- | ------------------------------------------ |
| **ID** | RQF-009                                    |
| **Nombre** | Semáforo de Gestión de Residuos            |
| **Módulo** | Auditoría / Calificaciones                 |
| **Prioridad** | Baja (Opcional)                            |
| **Estado** | En discusión                               |
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
4. El backend (Spring Boot) valida que el reciclador tenga permisos sobre ese conjunto y guarda el registro en la base de datos MySQL (tabla `historial_semaforo`) con la fecha y hora actual.
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

| Método | Ruta                                      | Auth requerida | Descripción                                      |
| ------ | ----------------------------------------- | -------------- | ------------------------------------------------ |
| POST   | `/api/v1/auditorias/semaforo`             | Sí (Reciclador)| Registra una nueva calificación para el conjunto |
| GET    | `/api/v1/auditorias/semaforo/{id}`        | Sí (Residente) | Obtiene el historial del semáforo de un conjunto |

---

## Reglas de negocio

- RN-001: Exclusividad de escritura. Solo el rol `reciclador` tiene permisos para crear una calificación en el semáforo. El rol `residente` tiene acceso estricto de solo lectura.
- RN-002: Límite de frecuencia. Para evitar spam, un reciclador solo puede emitir una calificación por conjunto cada 24 horas.