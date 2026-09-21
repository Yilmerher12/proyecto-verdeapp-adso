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
| **Estado** | Implementado        |
| **Usuarios** | sistema (Residente) |

---

## Descripción

El sistema debe mostrar al rol 'Residente' una interfaz de solo lectura con el contenido educativo sobre clasificación de residuos organizado por módulos.

---

## Entradas

Sin parámetros de entrada — la petición trae el catálogo completo, sin filtrar por categoría en el backend. El filtrado por categoría (por ejemplo, al entrar a `/catalogo-educativo/:categoria`) lo hace el frontend sobre la lista ya recibida.

---

## Proceso

1. El usuario navega a la sección "Aprende a Reciclar" (antes "Educación").
2. El frontend hace una petición `GET` a `/api/v1/contenido-educativo`.
3. El backend consulta la tabla `contenido_educativo` y devuelve todo el catálogo, ordenado del módulo más reciente al más antiguo.
4. El frontend agrupa los módulos por `modulo_categoria` y renderiza el contenido.
5. Si el usuario entra a una categoría específica, el frontend filtra la lista ya cargada — no hace una segunda petición al backend.

---

## Salidas

| Escenario           | Código HTTP | Respuesta                                                                                                    |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| Consulta exitosa    | 200         | JSON con la lista de módulos: `[{"id_contenido": "...", "modulo_categoria": "...", "titulo_tema": "...", "cuerpo_texto": "...", "url_video": "...", "url_guia": "...", "fecha_publicacion": "..."}]` |
| Sin contenido       | 200         | Array vacío `[]`                                                                                             |

---

## Endpoints asociados

<!-- ¿Qué? La ruta original de esta tabla (/api/v1/educacion) nunca existió
     así en código — se corrigió a la real, igual que ya se había hecho en
     RQF-010 (documento hermano) para los endpoints de escritura. -->

| Método | Ruta                             | Auth requerida        | Descripción                     |
| ------ | --------------------------------- | ---------------------- | -------------------------------- |
| GET    | `/api/v1/contenido-educativo`     | Sí (cualquier usuario) | Lista todo el catálogo educativo |

---

## Reglas de negocio

- RN-001: El catálogo educativo es de acceso exclusivo de lectura para los usuarios finales. No pueden crear, editar ni eliminar contenido.
