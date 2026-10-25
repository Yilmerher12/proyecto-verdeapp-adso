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
4. El frontend agrupa los módulos por `modulo_categoria` y dibuja una tarjeta por categoría, con la portada de su módulo (`url_imagen`) o, si no tiene, un dibujo fijo propio de cada categoría, el título de su lección más reciente y un "Video destacado".
5. Arriba muestra "Tu semana": con la misma consulta del historial de auditorías del conjunto (`listarHistorial`) toma la última auditoría y, si salió Regular o Malo, recomienda la lección cuya categoría tiene el nombre del tema de esa auditoría. No hay endpoint nuevo.
6. Si el usuario entra a una categoría específica, el frontend filtra la lista ya cargada — no hace una segunda petición de contenido al backend — y dibuja cada módulo como un muro: video, "De qué trata" y una tarjeta por párrafo (regla en `fe/src/lib/muroLeccion.ts`).
7. Lecciones vistas: al cargar el catálogo el frontend hace `GET /api/v1/contenido-educativo/vistos` para saber cuáles módulos ya abrió el Residente (cada categoría dice "Visto" si todos los suyos lo están, y una barra muestra "N de M lecciones vistas"). Al abrir una categoría hace `POST /api/v1/contenido-educativo/vistos` con los ids de sus módulos. Si alguna de las dos llamadas falla, las páginas se ven igual, sin la marca.

---

## Salidas

| Escenario           | Código HTTP | Respuesta                                                                                                    |
| ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ |
| Consulta exitosa    | 200         | JSON con la lista de módulos: `[{"id_contenido": "...", "modulo_categoria": "...", "titulo_tema": "...", "cuerpo_texto": "...", "url_video": "...", "url_guia": "...", "url_imagen": "...", "fecha_publicacion": "..."}]` |
| Sin contenido       | 200         | Array vacío `[]`                                                                                             |

---

## Endpoints asociados

<!-- ¿Qué? La ruta original de esta tabla (/api/v1/educacion) nunca existió
     así en código — se corrigió a la real, igual que ya se había hecho en
     RQF-010 (documento hermano) para los endpoints de escritura. -->

| Método | Ruta                             | Auth requerida        | Descripción                     |
| ------ | --------------------------------- | ---------------------- | -------------------------------- |
| GET    | `/api/v1/contenido-educativo`     | Sí (cualquier usuario) | Lista todo el catálogo educativo |
| GET    | `/api/v1/contenido-educativo/vistos` | Sí (solo Residente) | Ids de los módulos que el Residente ya abrió. Cualquier otro rol recibe 403 |
| POST   | `/api/v1/contenido-educativo/vistos` | Sí (solo Residente) | Recibe `{"ids": [...]}` (máximo 100) y los marca como vistos. Es idempotente: repetir un id no duplica nada, y un id que no existe se ignora. Devuelve todos los ids vistos |

---

## Reglas de negocio

- RN-001: El catálogo educativo es de acceso exclusivo de lectura para los usuarios finales. No pueden crear, editar ni eliminar contenido.
- RN-002: Ninguna imagen escrita dentro del texto de un módulo se muestra al Residente. Solo se pinta el video y, para el enlace de la guía, lo que permite `enlaceAdjuntoSeguro`.
- RN-003: Las lecciones vistas se guardan una vez por Residente y módulo (tabla `contenido_educativo_vistos`). "Visto" significa que el Residente abrió la lección, no que reprodujo el video completo. Si el módulo se elimina, sus marcas se eliminan con él; si se edita, se mantienen.
- RN-004: Solo se muestran imágenes subidas a VerdeApp (`/uploads/adjuntos/...`), tanto la portada como las que van dentro del texto, que el muro pega a la tarjeta que sigue. El frontend las revisa con `imagenPropiaSegura` y una imagen de otro sitio no se pinta (RQF-010, RN-005).
