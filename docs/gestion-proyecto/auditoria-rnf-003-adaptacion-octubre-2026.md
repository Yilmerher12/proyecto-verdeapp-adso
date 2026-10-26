# Auditoría RNF-003.1 y 003.3 — Adaptación a celular y tableta (octubre 2026)

<!--
  ¿Qué? Revisión de cómo se ve y se usa VerdeApp en celular (375x812), tableta
        (768x1024) y escritorio pequeño (1024x768), en los 4 roles, y las
        correcciones que salieron de ella (issue #454).
  ¿Para qué? La verificación de agosto de 2026 (auditoria-rnf-003-tablet.md y
             las anteriores) midió tableta, escritorio de 1280 px y, en celular,
             solo páginas públicas y de autenticación. Después cambió la
             identidad visual y se agregaron pantallas (agenda, Soporte
             técnico, registro por rol), y en celular solo se había mirado el
             panel del Administrador del Sistema.
  ¿Impacto? Deja escrito qué se revisó de verdad, qué se encontró, qué se
            corrigió y qué queda pendiente, para que RNF-003 no diga
            "verificado" por pantallas que nadie volvió a abrir.
-->

**Fecha:** 2026-10-19
**Rama:** `fix/adaptacion-celular-tableta`
**Cuentas usadas:** las 4 de prueba del README (Reciclador, Residente, Administrador del Sistema, Administrador de Conjunto).

## Método

- Navegador del panel de Claude, con el tamaño emulado en 375x812, 768x1024 y 1024x768.
- Un script medía en cada pantalla: si la página se desborda en horizontal, qué elementos quedan fuera del ancho, qué texto se corta con puntos suspensivos, qué botones, enlaces o campos miden menos de 36 px, y qué texto mide menos de 12 px.
- Las capturas del panel salen recortadas a la derecha en algunos casos; por eso los hallazgos se confirmaron con las medidas del script y no solo a ojo.
- La revisión se repitió después de traer a `develop` los cambios de otro integrante (agenda, Soporte técnico, registro por rol), y otra vez después de las correcciones.

## Pantallas revisadas

| Rol | Pantallas | 375 | 768 | 1024 |
| --- | --- | --- | --- | --- |
| Público | `/login`, `/register` (elegir rol, Residente, Reciclador, Admin. de Conjunto), `/forgot-password`, `/reset-password`, `/verify-email`, `/aceptar-invitacion`, `/terminos-de-uso`, `/privacidad`, `/politica-cookies`, `/contacto` | revisada | revisada | revisada |
| Reciclador | panel, `/puntos-acopio`, `/comunicados`, `/novedades` (Soporte técnico), `/profile`, `/change-password` | revisada | revisada | revisada |
| Residente | panel, `/comunicados`, `/novedades`, `/catalogo-educativo`, detalle de categoría, `/directorio`, `/profile` | revisada | revisada | revisada |
| Admin. del Sistema | panel, `/admin/novedades`, `/admin/contenido-educativo`, `/admin/puntos-acopio`, `/profile` | revisada | revisada | revisada |
| Admin. de Conjunto | panel, `/admin-conjunto/comunicados`, `/admin-conjunto/agenda`, `/novedades`, `/profile` | revisada | revisada | revisada |

La landing no entra (tarjeta #453).

## Hallazgos y cómo se corrigieron

| # | Hallazgo | Tamaño | Corrección | Archivos |
| --- | --- | --- | --- | --- |
| 1 | El menú lateral arrancaba abierto en celular y ocupaba entre 525 y 609 px de 812; en el Reciclador el contenido empezaba en y=600. Al tocar una opción seguía abierto, y se reabría al pasar a `/profile` o `/change-password` (esas rutas no usan `RoleGuard`, y `AppShell` se vuelve a montar). | 375 | En celular el menú arranca colapsado y se cierra solo al cambiar de página. En escritorio no cambia. | `AppShell.tsx` |
| 2 | "Totales del sistema" partía las palabras: "Resident/es" a 1024 y letras apiladas a 768 (columnas de 23 px). | 768 y 1024 | Las 3 tarjetas del encabezado se apilan hasta `xl` (1280 px); desde ahí vuelven a ir en 3 columnas. | `AdminDashboard.tsx` |
| 3 | En "Usuarios registrados", la pestaña "Administradores de Conjunto" quedaba cortada y, a 768 px, el campo de búsqueda quedaba fuera de la tarjeta. | 375 y 768 | Las pestañas pasan a otra línea si no caben, y la barra de herramientas va en columna hasta `lg`. | `AdminDashboard.tsx`, `AdminContenidoEducativoPage.tsx` |
| 4 | En el panel del Admin. de Conjunto el título se leía "Administrador d…", y el correo se cortaba. | 375 | Columna con `min-w-0`, título de 20 px en celular y saltos de línea. | `AdminConjuntoDashboard.tsx` |
| 5 | El nombre en la tarjeta del menú ("ADMINISTRADOR DEL SISTEMA") salía con "…". | 768 y 1024 | Puede ocupar hasta 2 líneas. | `AppShell.tsx` |
| 6 | En el Directorio, el nombre del reciclador salía "RECICLADOR …" con espacio de sobra. | 768 | El nombre puede ocupar hasta 2 líneas. | `DirectorioPage.tsx` |
| 7 | Doble margen lateral en celular: 24 px del contenedor más 24 px de la página, así que las tarjetas usaban el 74% del ancho. | 375 | 16 px por lado en celular (24 desde `sm`); las 5 páginas con su propio `p-6` ya no lo suman. Las tarjetas pasan de 279 a 343 px. | `AppShell.tsx`, los 4 paneles y `AdminContenidoEducativoPage.tsx` |
| 8 | Controles de menos de 36 px (ojo de contraseña 19x19, idioma ES/EN 24 px de alto, "Auditar ahora" 32, "Copiar dirección" 22x22, "Editar", filtros de 26 px, paginación, campos de búsqueda de 30 px, etc.). | 375 | Nuevas utilidades `touch-target`, `touch-target-h` y `touch-area` en `index.css`: dan un área táctil de 44 px **solo por debajo de 640 px**, sin cambiar el tamaño en tableta y escritorio. Se aplicaron en el componente `Button` (`sm` y `md`) y en los controles de todas las pantallas revisadas. | `index.css` y unos 20 archivos de `components/` y `pages/` |

## Verificación después de las correcciones

- **375 px**, los 4 roles: sin desborde ni textos cortados; el menú arranca colapsado y queda colapsado al navegar (incluido `/profile` y `/change-password`); los tres botones del encabezado y el botón del menú miden 44x44; las tarjetas miden 343 px.
- **768 y 1024 px**: panel del Admin. del Sistema con las etiquetas de "Totales" en una línea, buscador dentro de la tarjeta y nombre del menú en 2 líneas; pantallas del Reciclador sin cortes.
- **Área táctil por `touch-area`:** en "Copiar dirección" el área invisible mide 46x46 (medido), aunque el ícono mida 22x22.
- Pruebas: `AppShell.test.tsx` suma 3 pruebas del menú en celular. Suite completa: 51 archivos y 499 pruebas pasan, con el umbral de cobertura. `tsc` y ESLint sin errores.

## Lo que no se cambió, y por qué

- **Enlaces dentro de una frase** (por ejemplo "Regístrate aquí", "Términos de uso" en la casilla del registro, "Ver fuente", "Recupérala por correo"): la norma WCAG 2.5.8 los exime del tamaño mínimo, y darles 44 px de alto rompería el párrafo.
- **Tablas con scroll horizontal interno** (usuarios del Admin. del Sistema, calificaciones por conjunto): ya viven dentro de un contenedor con `overflow-x-auto`; no desbordan la página.
- **Texto de 10 a 11 px en chips y rótulos** ("Usaquén", "INDEPENDIENTE", "lunes a domingo"): no son controles. Queda como candidato a otra tarjeta si se quiere un mínimo de 12 px.
- **Casilla de "mostrar mi teléfono" del perfil**: toda la fila es un `<label>` y es el área que se toca.

## Pendiente

- Revisar en 375 px los modales del Reciclador con datos reales (auditoría con fotos, avisar llegada, reportar SHUT) y la edición del perfil: no se alcanzaron a recorrer.
- Confirmar los cambios en un celular real: esta revisión usó la emulación del navegador.
