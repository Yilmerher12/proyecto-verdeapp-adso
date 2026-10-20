# Investigación — Reporte descargable del historial de la agenda

<!--
  ¿Qué? Investigación del Issue #438: cómo permitir que el Admin de
        Conjunto descargue el historial de la agenda del comité (notas
        pendientes y archivadas) para anexarlo al acta.
  ¿Para qué? Responder las 7 preguntas del issue con una recomendación
             concreta antes de abrir cualquier tarjeta de implementación,
             y dejar registrado que la funcionalidad de la que depende
             (archivar en vez de borrar) todavía no existe.
  ¿Impacto? Sin esto, la primera tarjeta de implementación tendría que
            volver a investigar lo mismo, y se corre el riesgo de repetir
            el caso de jspdf: una librería agregada sin justificación
            clara que termina sin usarse (ver "Alternativas comparadas").
-->

**Issue:** [#438](https://github.com/Yilmerher12/proyecto-verdeapp-adso/issues/438)
**Fecha:** 2026-10-19
**Rama:** `docs/investigacion-reporte-historial-agenda`

---

## Contexto

Cuando el comité del conjunto revisa un tema de la agenda y lo resuelve, hoy se borra para siempre ([RQF-020](../requisitos/RFs/RQF-020_agenda_interna_conjunto.md), RN-004). El equipo quiere cambiar eso: en vez de borrar, archivar el tema con su fecha de archivado (una tarjeta aparte, referida en el issue como "Issue B"). Una vez eso exista, el Admin de Conjunto necesita poder descargar ese historial (pendientes + archivados) para anexarlo al acta del comité.

Esta investigación responde **cómo** se debería construir esa descarga. No programa nada ni instala ninguna dependencia — eso queda para las tarjetas de implementación que se listan al final.

### Hallazgo que cambia el orden de las tarjetas

**El "Issue B" todavía no existe en el código ni, hasta donde pude confirmar, como issue abierto en el tablero.** Hoy:

- [`AgendaConjunto`](../../be/app/models/agenda_conjunto.py) no tiene ninguna columna de fecha de archivado — solo `id`, `id_conjunto_residencial`, `autor_id`, `texto`, `url_evidencia`, `estado` (`PENDIENTE`/`EN_ESPERA`) y `created_at`.
- `eliminar()` en [`agenda_conjunto_service.py`](../../be/app/services/agenda_conjunto_service.py) hace `db.delete(...)` + `db.commit()` — borrado físico real, no soft-delete.

Esto significa que **la tarjeta #438 no se puede implementar todavía**: no hay nada que "archivar" en la base de datos. La primera tarjeta que debe nacer de esta investigación es la que agrega el archivado (ver [Issues de implementación](#issues-de-implementación-que-nacerían-de-esto)).

La buena noticia es que no hay que diseñar ese archivado desde cero: **ya existe el mismo patrón, implementado y probado, en otro módulo.**

| | `Novedad` (ya implementado) | `AgendaConjunto` (a replicar) |
| --- | --- | --- |
| Columna | `fecha_archivado` (TIMESTAMP, nullable) — [`novedad.py:27`](../../be/app/models/novedad.py) | Agregar `fecha_archivado` igual |
| Regla | "activa → archivada, sin vuelta atrás" | Mismo criterio: un tema resuelto no se reabre |
| Servicio | `archivar_novedad()` pone `fecha_archivado = datetime.now(timezone.utc)`, 400 si ya estaba archivada — [`novedad_service.py:239`](../../be/app/services/novedad_service.py) | Reemplazar `eliminar()` por un `archivar()` equivalente |
| Endpoint | `POST /{id_novedad}/archivar` — [`novedades.py:86`](../../be/app/routers/novedades.py) | `POST .../agenda/{id_item}/archivar` en vez de `DELETE` |

---

## Qué se investigó

- Cómo se descargan archivos hoy en VerdeApp (backend y frontend).
- Librerías disponibles para generar PDF, CSV y Excel desde Python, con versión exacta, licencia y mantenimiento (`restricciones.md` exige versión fijada en toda dependencia nueva).
- El precedente de `jspdf`/`jspdf-autotable`, agregadas al frontend y luego eliminadas por no usarse ([PR #124](https://github.com/Yilmerher12/proyecto-verdeapp-adso/pull/124)) — para no repetir el mismo error con la librería que se recomiende aquí.
- Un ejemplo de hoja con 5 notas reales de agenda, para ver cómo se vería el reporte.

### Cómo se descargan archivos hoy en VerdeApp

No existe generación de PDF/CSV/Excel hoy, ni en backend ni en frontend. Lo único que existe es **servir un archivo ya subido** desde `/uploads/` ([`be/app/main.py:122-149`](../../be/app/main.py)):

- `_DOCUMENTOS_DESCARGABLES = (".pdf", ".docx", ".xlsx")` activa un middleware que agrega `Content-Disposition: attachment` a esas extensiones, para forzar la descarga en vez de abrir el archivo en una pestaña nueva (issue #403).
- El frontend solo renderiza un `<a href="{API_BASE_URL}/uploads/adjuntos/archivo.pdf">` — no genera nada en el navegador (ver por ejemplo `AdminConjuntoComunicadosPage.test.tsx:114`).

Esto responde directamente la pregunta 2 del issue: el precedente de la aplicación es servir el archivo con esas cabeceras, pero siempre de algo que ya existe en disco. Para un reporte **generado al momento** (no subido por un usuario), el patrón equivalente es un endpoint que arme el archivo en memoria y lo devuelva con esas mismas cabeceras — ningún router del backend usa hoy `StreamingResponse` ni `FileResponse` generado dinámicamente, así que esto sería la primera vez.

---

## Alternativas comparadas

### Para PDF

| Librería | Versión (oct. 2026) | Licencia | Dependencias de sistema | Complejidad de la API |
| --- | --- | --- | --- | --- |
| **fpdf2** | 2.8.9 | LGPL-3.0 | Ninguna (puro Python; solo depende de Pillow, defusedxml y fontTools, todas también puro Python) | Baja — `cell()`/`multi_cell()` y una clase `Table` para tablas simples |
| **ReportLab** | 4.5.1 | BSD | Ninguna | Alta — dibujo por coordenadas tipo canvas, pensado para layouts complejos |
| **WeasyPrint** | 70.0 | BSD | **Pango, Cairo, GDK-Pixbuf** (GTK) | Media (HTML/CSS a PDF) pero la instalación en Windows es el problema |

**WeasyPrint queda descartado** para este proyecto: necesita librerías de sistema (Pango/GTK) que en Windows requieren instalar MSYS2 o copiar DLLs a mano — justo el tipo de fricción que un integrante del equipo ya reportó en este chat para correr el proyecto en su máquina. El equipo desarrolla en Windows (ver `README.md`, comandos en PowerShell); agregar una dependencia así de frágil para generar un reporte no se justifica.

Entre `fpdf2` y ReportLab, **`fpdf2` es la recomendación**: el reporte que pide el issue es una tabla simple (texto, fechas, autor, estado, enlace a foto) — no necesita el control de bajo nivel de ReportLab, que es una API más grande y más difícil de mantener para el equipo. `fpdf2` no tiene dependencias de sistema (relevante otra vez en Windows) y su API de tablas es directa de aprender.

### Para CSV

El módulo `csv` de la librería estándar de Python cubre esto por completo — **no hace falta ninguna dependencia nueva**. Cero costo de mantenimiento, cero versión que fijar en `pyproject.toml`.

### Para Excel

**openpyxl** 3.1.5 (MIT) sería la opción si se necesitara un `.xlsx` real (con fórmulas o formato de celda). Se descarta como formato propio en esta investigación: un CSV se abre en Excel igual de bien para el caso de uso descrito ("anexar al acta"), y agregar una librería más solo para que el archivo tenga la extensión `.xlsx` no se justifica — mismo principio que descartó WeasyPrint: no sumar una dependencia que no resuelve algo que las otras dos opciones no resuelvan ya.

---

## Ejemplo de hoja (5 notas reales, formato propuesto)

Mockup de cómo se vería el contenido (no es código, es la maqueta de datos):

| Tema | Estado | Creado | Archivado | Autor | Evidencia |
| --- | --- | --- | --- | --- | --- |
| Arreglar la puerta del sótano, no cierra bien desde la mudanza del torre 3 | Archivado | 03/09/2026 | 17/09/2026 | admin.conjunto.prueba@verdeapp.com | [ver foto](/uploads/adjuntos/puerta-sotano.jpg) |
| Pintar el pasillo del tercer piso, hay humedad visible | Pendiente | 20/09/2026 | — | admin.conjunto.prueba@verdeapp.com | — |
| Revisar la fuga de agua cerca del parqueadero de visitantes | Archivado | 25/09/2026 | 28/09/2026 | admin.conjunto.prueba@verdeapp.com | [ver foto](/uploads/adjuntos/fuga-parqueadero.jpg) |
| Cambiar la cerradura de la puerta peatonal | En espera | 01/10/2026 | — | admin.conjunto.prueba@verdeapp.com | — |
| Coordinar fumigación de zonas comunes con la empresa del conjunto | Pendiente | 10/10/2026 | — | admin.conjunto.prueba@verdeapp.com | — |

Esto responde la pregunta 3 del issue (contenido): texto, estado, fecha de creación, fecha de archivado (solo si aplica), autor, y la foto **solo como enlace**, no incrustada — ver razón en Privacidad más abajo.

---

## Respuesta a las 7 preguntas del issue

### 1. Formato

**CSV primero, PDF después**, en dos tarjetas separadas:

- **CSV** (stdlib, sin dependencia nueva) como primera entrega: resuelve el caso de uso con el menor riesgo posible y sirve también para quien quiera analizar los datos, no solo imprimirlos.
- **PDF** (con `fpdf2`) como segunda entrega, para el caso formal de "anexar al acta" que menciona el issue — un documento presentable, no una hoja de datos cruda.

No se recomienda Excel como formato propio (ver Alternativas comparadas).

### 2. Generación: backend o navegador

**Backend**, con `fpdf2` (PDF) y el módulo `csv` (CSV), devueltos con `Content-Disposition: attachment` igual que los adjuntos ya subidos. Razones:

- Todo el filtrado (por conjunto, rango de fechas, estado) ya se valida en el backend contra el Admin de Conjunto en sesión — generar el archivo ahí evita exponer datos de otros conjuntos si el filtrado se hiciera en el cliente.
- Coherente con la arquitectura en capas del proyecto (`routers/ → services/ → models/`): sería una función nueva en un servicio, no lógica en el componente de React.
- Evita repetir el caso de `jspdf`: una librería en el frontend que termina sin usarse. Generar en el backend mantiene el bundle del frontend sin cambios.

### 3. Contenido

Texto del tema, estado (`PENDIENTE`/`EN_ESPERA`/archivado), fecha de creación, fecha de archivado (cuando exista, una vez se construya el "Issue B"), autor (correo, vía `autor_id` → `usuarios`), y la foto de evidencia **solo como enlace** (no incrustada en el PDF) — ver ejemplo arriba.

### 4. Criterio para elegir el rango

Filtros por **fecha** (desde/hasta, sobre `created_at` o `fecha_archivado` según convenga) y por **estado**. El conjunto nunca es un filtro que elija el usuario: cada endpoint de agenda ya está restringido al conjunto del Admin en sesión (RN-001 de RQF-020) y el reporte debe seguir esa misma regla, no agregar una forma nueva de pedir datos de un conjunto ajeno.

### 5. Privacidad

- **Nombre del archivo**: `historial-agenda-<slug-del-conjunto>-<desde>_<hasta>.pdf` (o `.csv`) — sin datos personales, solo el nombre del conjunto y el rango de fechas.
- **Fotos**: solo enlace, nunca incrustadas. Incrustar imágenes en el PDF obligaría a decidir qué pasa si la foto ya no existe (adjunto borrado, ver `limpiar_adjuntos`), aumentaría mucho el peso del archivo, y expondría directamente el contenido de la foto a quien reciba el PDF fuera de la app (ej. en una reunión impresa) sin que la app pueda controlar ese acceso después.
- **Registro de descargas**: no se recomienda agregar un log nuevo para esto. Hoy ningún endpoint de descarga de adjuntos en VerdeApp registra quién descargó qué — agregar esa auditoría solo para este reporte sería inconsistente con el resto de la app. Si en el futuro se decide que sí hace falta, debería ser una decisión de auditoría general (RNF de seguridad), no algo que nazca de esta tarjeta puntual.

### 6. Idioma y formato de fechas

Usar el campo `locale` que ya existe en `usuarios` (común a los 4 roles) para decidir el idioma del reporte y el formato de fecha, igual que ya se hace en el frontend con `lib/dateFormat.ts`. El backend necesitaría una función equivalente (no reinventar el formato fecha a fecha dentro del generador de PDF/CSV).

### 7. Límites

Se recomienda un tope duro, por ejemplo 500 notas por reporte: si el rango de fechas pedido supera ese número, el endpoint responde 400 pidiendo acotar el rango, en vez de generar un archivo arbitrariamente grande. El número exacto queda para decidirse en la tarjeta de implementación (no hay un precedente de límite similar en el proyecto del que partir).

---

## Recomendación

1. No implementar el reporte todavía — primero construir el archivado (el "Issue B" referido en el issue #438), replicando el patrón ya probado de `Novedad.fecha_archivado`.
2. Implementar primero la descarga en **CSV** (stdlib, sin dependencia nueva, menor riesgo).
3. Implementar después la descarga en **PDF** con **`fpdf2==2.8.9`**, generada en el backend.
4. No agregar Excel como formato propio ni usar WeasyPrint — ninguna de las dos se justifica frente a las opciones de arriba, y WeasyPrint además es frágil de instalar en Windows.
5. Fotos siempre como enlace, nunca incrustadas. Sin registro de descargas nuevo.

---

## Issues de implementación que nacerían de esto

| # | Título propuesto | Depende de |
| --- | --- | --- |
| 1 | Archivar temas de la agenda en vez de borrarlos (el "Issue B" del issue #438) — agregar `fecha_archivado` a `AgendaConjunto`, replicando el patrón de `Novedad` | Ninguna |
| 2 | Admin de Conjunto descarga el historial de la agenda en CSV | Issue 1 de esta lista |
| 3 | Admin de Conjunto descarga el historial de la agenda en PDF | Issue 1 y 2 de esta lista |

---

## Documentación actualizada en esta rama

- Este documento.
- [RQF-020](../requisitos/RFs/RQF-020_agenda_interna_conjunto.md) — se agregó una nota señalando que el borrado permanente (RN-004) está pendiente de cambiar por archivado, con referencia a esta investigación.
- [HU-049](../requisitos/HUs/HU-049_admin_conjunto_descarga_historial_agenda.md) — historia de usuario nueva propuesta para la descarga (Estado: Por implementar, bloqueada por el archivado).
- Índice [`historias-de-usuario.md`](../requisitos/HUs/historias-de-usuario.md) — fila nueva para HU-049.
- `restricciones.md` **no se tocó todavía**: `fpdf2` se agrega ahí solo cuando la tarjeta de implementación del PDF (issue 3 de la tabla de arriba) realmente instale la dependencia, no antes — para no repetir el caso de `jspdf`, que quedó fijado en la documentación de dependencias sin usarse nunca en código real.
