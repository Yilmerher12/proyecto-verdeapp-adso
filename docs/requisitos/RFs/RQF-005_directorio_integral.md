# RQF-005 — Directorio Integral

<!--
  ¿Qué? Requisito funcional que define el catálogo y directorio de puntos de acopio y recicladores.
  ¿Para qué? Proveer a los residentes herramientas para ubicar puntos de entrega y contactar recicladores.
  ¿Impacto? Facilita la logística de entrega de material reciclable, mejorando la conexión entre generador y recolector.
-->

---

## Identificación

| Campo         | Valor               |
| ------------- | ------------------- |
| **ID** | RQF-005             |
| **Nombre** | Directorio Integral |
| **Módulo** | Directorio          |
| **Prioridad** | Media               |
| **Estado** | Por implementar     |
| **Usuarios** | residente           |

---

## Descripción

El sistema debe mostrar un catálogo de puntos de acopio y recicladores, permitiendo al 'Residente' filtrar los resultados según su localidad o conjunto asociado. Adicionalmente, debe mostrar un directorio de recicladores inscritos, permitiendo al 'Residente' contactar directamente (vía llamada/chat) para la entrega presencial de materiales.

---

## Entradas

| Campo             | Tipo   | Obligatorio | Validaciones                                                                 |
| ----------------- | ------ | ----------- | ---------------------------------------------------------------------------- |
| `localidad_id`    | Número | No          | Si se provee, debe coincidir con un ID de localidad válido en la base de datos. |
| `conjunto_id`     | Número | No          | Si se provee, debe coincidir con un ID de conjunto válido en la base de datos.  |

---

## Proceso

1. El usuario con rol **Residente** ingresa al módulo de Directorio.
2. El frontend realiza una petición `GET` al backend para obtener los registros de puntos de acopio y recicladores activos.
3. El usuario puede aplicar filtros en la interfaz (por localidad o conjunto).
4. El backend recibe los parámetros de búsqueda, ejecuta la consulta filtrada en las tablas correspondientes y retorna la información.
5. El frontend renderiza los resultados mostrando datos de contacto (teléfono, botón de enlace a chat/WhatsApp).
6. El residente selecciona la opción de contacto deseada, la cual redirige a la aplicación externa o muestra el número telefónico.

---

## Salidas

| Escenario           | Código HTTP | Respuesta                                                                                                    |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| Consulta exitosa    | 200         | JSON con lista de entidades: `[{"tipo": "reciclador", "nombre": "...", "telefono": "..."}]`                  |
| Sin resultados      | 200         | Array vacío `[]` con mensaje "No se encontraron resultados para este filtro".                                |

---

## Endpoints asociados

| Método | Ruta                     | Auth requerida | Descripción                                      |
| ------ | ------------------------ | -------------- | ------------------------------------------------ |
| GET    | `/api/v1/directorio`     | Sí (Residente) | Lista puntos de acopio y recicladores filtrables |

---

## Reglas de negocio

- RN-001: Solo se deben mostrar en el directorio aquellos recicladores que tengan su estado de cuenta "activo" y hayan autorizado compartir su número de contacto.
- RN-002: El filtrado por conjunto debe priorizar mostrar a los recicladores que están directamente vinculados al mismo `conjunto_id` del residente que consulta.
