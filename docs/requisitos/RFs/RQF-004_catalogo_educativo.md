# RQF-004 — Catálogo Educativo

<!--
  ¿Qué? Requisito funcional que define la visualización de material educativo sobre reciclaje.
  ¿Para qué? Fomentar la correcta separación de residuos desde la fuente.
  ¿Impacto? Mejora la calidad del material entregado a los recicladores, facilitando su labor.
-->

---

## Identificación

| Campo         | Valor               |
| ------------- | ------------------- |
| **ID** | RQF-004             |
| **Nombre** | Catálogo Educativo  |
| **Módulo** | Educación           |
| **Prioridad** | Media               |
| **Estado** | Por implementar     |
| **Usuarios** | sistema (Residente) |

---

## Descripción

El sistema debe mostrar al rol 'Residente' una interfaz de solo lectura con el contenido educativo sobre clasificación de residuos organizado por módulos.

---

## Entradas

| Campo        | Tipo   | Obligatorio | Validaciones                                                                 |
| ------------ | ------ | ----------- | ---------------------------------------------------------------------------- |
| `modulo_id`  | Número | No          | Para filtrar por un módulo específico. Debe existir en la base de datos.     |

---

## Proceso

1. El usuario con rol **Residente** navega a la sección "Educación".
2. El frontend realiza una petición `GET` al backend para obtener los módulos educativos disponibles.
3. El backend consulta la base de datos (`modulos_educativos`).
4. El backend formatea la respuesta devolviendo los datos organizados jerárquicamente.
5. El frontend renderiza el contenido.
6. Si el usuario selecciona un módulo específico, se hace una petición para cargar los detalles puntuales.

---

## Salidas

| Escenario           | Código HTTP | Respuesta                                                                                                    |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| Consulta exitosa    | 200         | JSON con la lista de módulos: `[{"id": 1, "titulo": "Plásticos", "contenido": "..."}]`                       |
| Sin contenido       | 200         | Array vacío `[]`                                                                                             |

---

## Endpoints asociados

| Método | Ruta                     | Auth requerida | Descripción                                      |
| ------ | ------------------------ | -------------- | ------------------------------------------------ |
| GET    | `/api/v1/educacion`      | Sí (Residente) | Lista todos los módulos educativos disponibles   |

---

## Reglas de negocio

- RN-001: El catálogo educativo es de acceso exclusivo de lectura para los usuarios finales. No pueden crear, editar ni eliminar contenido.
