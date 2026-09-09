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
| **Estado** | Implementado        |
| **Usuarios** | residente           |

---

## Descripción

El sistema debe mostrar un catálogo de puntos de acopio y un directorio de recicladores inscritos, ambos filtrables por localidad, permitiendo al 'Residente' contactar directamente a un reciclador (vía llamada/chat) para la entrega presencial de materiales.

Son dos listados independientes, cada uno con su propia pestaña y su propio endpoint — no un único catálogo combinado.

---

## Entradas

| Campo             | Tipo   | Obligatorio | Validaciones                                                                 |
| ----------------- | ------ | ----------- | ---------------------------------------------------------------------------- |
| `localidad_id`    | Número | No          | Si se provee, debe coincidir con un ID de localidad válido en la base de datos. En la pestaña de Recicladores, un Residente no puede cambiarlo — ver RN-002. |

---

## Proceso

1. El usuario con rol **Residente** ingresa al módulo de Directorio.
2. El frontend realiza una petición `GET` (una por pestaña) al backend para obtener los puntos de acopio activos o los recicladores registrados.
3. El usuario puede aplicar un filtro por localidad — libre en Puntos de Acopio, fijo en la propia para Recicladores (RN-002).
4. El backend recibe el parámetro de búsqueda, ejecuta la consulta filtrada en la tabla correspondiente y retorna la información.
5. El frontend renderiza los resultados mostrando datos de contacto (teléfono, botón de enlace a chat/WhatsApp) para los recicladores.
6. El residente selecciona la opción de contacto deseada, la cual redirige a la aplicación externa o muestra el número telefónico.

---

## Salidas

| Escenario                        | Código HTTP | Respuesta                                                                                                    |
| --------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| Consulta exitosa (recicladores)   | 200         | `[{"id_reciclador": "...", "nombre": "...", "apellidos": "...", "numero_telefonico": "...", "asociacion": "...", "nombre_localidad": "..."}]` |
| Consulta exitosa (puntos acopio)  | 200         | `[{"id_punto_acopio": "...", "nombre": "...", "direccion": "...", "telefono_contacto": "...", "nombre_encargado": "...", "nombre_localidad": "..."}]` |
| Sin resultados                    | 200         | Array vacío `[]` — el frontend muestra su propio mensaje ("No hay recicladores/puntos de acopio registrados en esta localidad."), el backend no manda ningún texto. |

---

## Endpoints asociados

| Método | Ruta                                | Auth requerida    | Descripción                                    |
| ------ | ----------------------------------- | ----------------- | ----------------------------------------------- |
| GET    | `/api/v1/directorio/recicladores`   | Sí (cualquier rol autenticado) | Lista recicladores, filtrable por localidad — para un Residente, siempre la propia (RN-002) |
| GET    | `/api/v1/directorio/puntos-acopio`  | Sí (cualquier rol autenticado) | Lista puntos de acopio activos, filtrable libremente por localidad |

---

## Reglas de negocio

- RN-001: El teléfono de un reciclador solo se muestra si él mismo activó "mostrar mi contacto en el directorio" desde su Perfil — no existe un filtro por "estado de cuenta activo", se listan todos los recicladores registrados.
- RN-002: En la pestaña de Recicladores, el filtro de localidad queda fijo en la localidad del conjunto donde vive el Residente que consulta — el backend lo fuerza sin importar qué `localidad_id` llegue por parámetro (HU-006/CA-006.5). En Puntos de Acopio el filtro es libre, cualquier localidad (HU-006/CA-006.6).
