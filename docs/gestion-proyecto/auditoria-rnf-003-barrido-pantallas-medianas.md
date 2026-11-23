# Auditoría RNF-003.1 — Barrido de pantallas medianas (noviembre 2026)

<!--
  ¿Qué? Revisión de cómo se ve VerdeApp con la ventana entre 640 y 1100 px (y 375 y 1280 px de referencia), en
        los 4 roles y en las páginas públicas, y las correcciones que salieron de ella (issue #602).
  ¿Para qué? Las auditorías anteriores midieron 375, 768, 1024 y 1280 px, antes de los rediseños de los paneles
             del Reciclador y del Residente (issues #593 y #594). En ese rango el menú lateral ya ocupa 16 rem y
             el contenido queda angosto, y ahí aparecieron fallas reales (directorio, pestañas de "Mi conjunto"
             y lista de la campanita).
  ¿Impacto? Deja escrito qué se midió, qué se encontró y qué se corrigió, para que RNF-003 no diga "verificado"
            por anchos que nadie volvió a abrir.
-->

**Fecha:** 2026-11-03
**Rama:** `fix/barrido-pantallas-medianas`
**Cuentas usadas:** las 4 de prueba del README, solo en el entorno local.

## Método

- Un script cargaba cada página en un `iframe` del ancho a medir (375, 640, 768, 900, 1024, 1100 y 1280 px; el `iframe` tiene su propio ancho de ventana, así que los puntos de quiebre y las unidades `rem` responden como en un navegador de ese tamaño).
- En cada página medía: si la página o el área principal (`main`) tiene scroll horizontal, qué elementos quedan fuera del área principal sin estar recortados por un contenedor con scroll, qué íconos miden menos de 10 px (encogidos) y qué botones, enlaces o pestañas se parten en 3 o más líneas.
- Los hallazgos se localizaron ocultando ramas del HTML de a una hasta ver cuál bajaba el scroll horizontal.
- Se repitió en español y en inglés (los 4 roles), y después de las correcciones.
- Anchos medidos como emulación del navegador del panel de Claude; sin dispositivos reales.

## Páginas revisadas

| Rol | Páginas |
| --- | --- |
| Público | `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/terminos-de-uso`, `/privacidad`, `/politica-cookies`, `/contacto` (solo en español) |
| Reciclador | panel, `/puntos-acopio`, `/comunicados`, `/novedades`, `/profile`, `/change-password` |
| Residente | panel, `/comunicados`, `/novedades`, `/directorio`, `/catalogo-educativo`, detalle de categoría, `/profile`, `/change-password` |
| Admin. de Conjunto | panel, `/admin-conjunto/comunicados`, `/admin-conjunto/agenda`, `/admin-conjunto/desempeno`, `/comunicados`, `/novedades`, `/profile` |
| Admin. del Sistema | panel, `/admin/contenido-educativo`, `/admin/puntos-acopio`, `/admin/novedades`, `/profile` |

## Hallazgos y cómo se corrigieron

| # | Hallazgo | Anchos | Corrección | Archivos |
| --- | --- | --- | --- | --- |
| 1 | En el panel del Admin del Sistema toda la página tenía scroll horizontal (hasta 377 px). El texto oculto (`sr-only`, `position: absolute`) de la última columna de la tabla de usuarios ("Acciones") buscaba su "padre posicionado" fuera de la tabla; el contenedor con scroll no lo era, así que el texto escapaba del recorte y ensanchaba la página. | 375 a 900 | Regla global `th, td { position: relative }` en `@layer base`: el texto queda dentro de su celda y el contenedor con scroll lo recorta. Arregla las 6 tablas de la app (y las que se agreguen). | `index.css` |
| 2 | El mismo defecto, de 6 a 7 px, en Directorio (tabla de puntos) a 375 px y en Puntos de acopio del Admin del Sistema a 640 px. | 375 y 640 | La misma regla del hallazgo 1. | `index.css` |
| 3 | En Puntos de acopio del Admin del Sistema el botón "Nuevo punto de acopio" se partía en 3 líneas y su ícono se encogía. | 375 a 768 | Cabecera con `flex-wrap`; el botón con `shrink-0` y `whitespace-nowrap`, y su ícono con `shrink-0`. | `AdminPuntosAcopioPage.tsx` |
| 4 | En el panel del Reciclador, los 4 botones de aviso quedaban en 2 columnas de unos 170 px y su texto de motivo se partía en 3 líneas. | 640 | Pasan a 2 columnas según el ancho de su propia tarjeta (`@md`, 28 rem) y no el de la ventana. | `RecicladorDashboard.tsx` |
| 5 | En "Avisos de este conjunto" (panel del Admin de Conjunto) el ícono del reloj se encogía a 9 px porque los botones "Marcar leídas / Limpiar leídas" apretaban el título. | 640 | Cabecera con `flex-wrap` y el ícono con `shrink-0`. Es el componente compartido de las notificaciones. | `NotificationFeed.tsx` |
| 6 | En el Directorio las dos pestañas (Recicladores y Puntos de Acopio) medían 326 px dentro de una tarjeta de 278 px y se salían de ella. | 375 | En celular se reparten el ancho en partes iguales (el texto largo baja a una segunda línea); desde `sm` van juntas, cada una del tamaño de su texto. | `DirectorioPage.tsx` |

Los hallazgos del Directorio, las pestañas de "Mi conjunto" y la lista de la campanita, que se corrigieron antes en el PR del issue #593, se confirmaron con el mismo script y no volvieron a aparecer.

## Falsos positivos descartados

- Pestañas de "Mi conjunto" a 640 px: el script las marca porque miden más de 3 veces el alto de línea, pero son dos líneas de texto con su relleno, ordenadas y del mismo ancho.
- Tarjetas de categoría de Aprende a reciclar: el script marcó un enlace sin texto (una tarjeta de imagen); no es un botón partido.

## Verificación después de las correcciones

- Script en español, 17 páginas con sesión en 7 anchos: sin scroll horizontal, sin elementos fuera de su tarjeta y sin íconos encogidos. Solo queda el falso positivo de las pestañas de "Mi conjunto" a 640 px.
- Las 10 páginas públicas salieron sin hallazgos desde la primera medición.
- Pruebas: `pantallasMedianas.test.ts` comprueba que `th, td` sean posicionados en `index.css` y que toda tabla esté dentro de un contenedor con `overflow-x-auto`.

## Límites

- Es emulación del navegador, sin dispositivos reales.
- El modo oscuro no se midió aparte: el script mide tamaños y posiciones, no colores (la coherencia de temas está en `auditoria-coherencia-temas.md`).
- Las ventanas (`Modal` y `ConfirmModal`) se revisaron por código (ancho completo con tope y margen de 1 rem), no abriendo cada una con datos reales.
- Las páginas públicas solo se midieron en español.
