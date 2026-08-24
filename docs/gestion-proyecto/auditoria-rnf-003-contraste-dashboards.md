# Auditoría RNF-003 — Contraste (parte 2: dashboards)

<!--
  ¿Qué? Continuación de docs/gestion-proyecto/auditoria-rnf-003-contraste-responsive.md
        (parte 1) — esta parte cubre los 3 dashboards que quedaron pendientes
        (Reciclador, Admin del Sistema, Admin de Conjunto), ejecutada el 2026-08-24.
  ¿Para qué? Registrar qué se encontró y corrigió en esta segunda tanda, incluyendo
             un problema real en la propia herramienta de auditoría que hubo que
             corregir dos veces antes de confiar en sus resultados.
  ¿Impacto? Sin esto, no queda constancia de por qué el contraste de estos 3
            dashboards se dio por bueno — los números respaldan la revisión.
-->

**Fecha:** 2026-08-24
**Alcance:** Dashboard del Reciclador, Admin del Sistema y Admin de Conjunto — modo claro y oscuro, con todos los formularios/acordeones desplegados, en móvil (375px).

---

## Corrección importante a la herramienta de auditoría

Los 3 dashboards viven dentro de un `<main>` con **su propio scroll interno** (`overflow-y-auto`), no el de la ventana — un patrón distinto a las páginas públicas de la parte 1. Esto rompió el script de auditoría de dos formas distintas, ambas corregidas antes de confiar en ningún resultado:

1. Calcular "¿está este texto dentro de la ventana visible?" no basta cuando el contenido vive en un contenedor con su propio scroll: un elemento puede tener una posición que cae dentro de los límites de la ventana por pura coincidencia, mientras en realidad está recortado (invisible) por el `overflow` de su contenedor — mostrando entonces el color de fondo de OTRO elemento que sí está ahí de verdad (en este caso, el menú lateral), dando lecturas de contraste completamente inventadas.
2. La corrección: en vez de solo mirar la posición, se verifica que el propio elemento de texto aparezca en la lista de `document.elementsFromPoint(...)` en ese punto — si no aparece, es que está recortado/tapado, y se descarta en vez de evaluarlo.

Con esa corrección, todo footer/hallazgo raro anterior se explicó — no se encontró ningún caso adicional de "el texto no se ve pese a tener el color correcto" en esta ronda.

---

## Hallazgos y correcciones

### 1. Insignia y botón rojo del menú superior (`AppShell.tsx`) — impacto alto, en TODA la app
La campanita de notificaciones (`bg-red-500`) y el botón "Confirmar" de cerrar sesión (`bg-red-500`) — ambos con texto blanco — solo llegaban a **3.82:1** de contraste (falla el mínimo 4.5:1). Como `AppShell` envuelve las 4 áreas autenticadas de la app, esto afectaba a **todas las pantallas con sesión iniciada**, no solo los dashboards. Corregido a `red-600`/`red-700`.

### 2. `InvitarAdminConjuntoForm.tsx` — el componente entero sin modo oscuro
A diferencia de sus componentes hermanos (`SolicitudesDesvinculacion`, `AsignarConjuntoAdicionalForm`), este formulario nunca tuvo `dark:` en ninguna de sus clases — ni el fondo de la tarjeta (`bg-white` sin `dark:bg-...`) ni ninguno de sus textos. En modo oscuro, esto se traducía en texto gris clarito (pensado para fondo oscuro, correcto en otras partes de la app) cayendo sobre una tarjeta que se quedaba blanca — contraste de **1.47:1**. Se agregó `dark:` a los 7 elementos de este componente (fondo, borde, título, descripción, labels, checkboxes).

### 3. Patrón sistémico: `text-gray-400` sin su pareja `dark:text-gray-400`
El mismo bug que ya se había encontrado y corregido en el pie de página de `AuthLayout` (parte 1) resultó ser **mucho más extendido**: en más de 25 lugares del proyecto, un texto secundario (mensajes de "cargando...", estados vacíos, metadatos pequeños) usa `text-gray-400` como único color, sin distinguir modo claro/oscuro. `gray-400` da buen contraste sobre fondo oscuro (7.3:1) pero **falla sobre fondo blanco** (2.49:1) — exactamente al revés de lo que se necesita si es el color por defecto (modo claro).

Corregido en esta ronda (todo lo que aparece en los 3 dashboards de hoy y sus componentes hijos): `NotificationFeed.tsx` (compartido por 3 dashboards), `SolicitudesDesvinculacion.tsx`, `InvitarAdminConjuntoForm.tsx`, `AsignarConjuntoAdicionalForm.tsx`, `AdminDashboard.tsx` (celdas vacías de las 2 tablas), `RecicladorDashboard.tsx` (6 casos), `AdminConjuntoDashboard.tsx` (6 casos), `ResidenteDashboard.tsx`. Patrón de corrección: `text-gray-400` → `text-gray-500 dark:text-gray-400`.

**Pendiente (fuera del alcance de hoy):** el mismo patrón exacto sigue sin tocar en páginas que no forman parte de los dashboards — `AdminConjuntoComunicadosPage`, `AdminContenidoEducativoPage`, `AdminNovedadesPage`, `CategoriaEducativaPage`, `CatalogoEducativoPage`, `ComunicadosFeedPage`, `NovedadesFeedPage`, `DirectorioPage`, `ProfilePage` — todas con el mismo `text-gray-400` suelto en mensajes de carga/vacío. Es un cambio mecánico (mismo find-and-replace en cada archivo), pero son ~9 archivos más que no se tocaron hoy por estar fuera del alcance declarado ("los dashboards restantes").

### 4. Correo del admin en `AdminConjuntoDashboard` (modo claro)
`text-green-600` sin `dark:` en el correo mostrado bajo el nombre — 3.22:1 en modo claro (mismo patrón del botón verde de la parte 1, aquí como texto). Corregido a `text-green-700 dark:text-green-400`.

### 5. Botón "Solicitar desvinculación" — borderline
`text-red-600` sobre `bg-red-50` daba 4.36:1 (a 0.14 del mínimo). Subido a `text-red-700` por margen de seguridad (6.4:1 aprox).

---

## Resultado final

Los 3 dashboards (Reciclador, Admin del Sistema, Admin de Conjunto) quedaron en **0 problemas de contraste** en ambos temas, verificado con scroll completo del contenedor interno y todos los acordeones/formularios desplegados (invitar administrador, invitar reciclador, editar conjunto, solicitar desvinculación, asignar conjunto adicional).

`tsc`, `eslint` y los 153 tests del frontend pasan.

## Pendiente para la próxima sesión (sin cambios respecto a la parte 1, más lo nuevo de hoy)
- El patrón `text-gray-400` suelto en los ~9 archivos listados arriba.
- Perfil, Cambiar contraseña, Directorio, Catálogo educativo — sin auditar todavía.
- Vista de escritorio (1280px).
- RNF-003.1 (responsive real) y RNF-003.2 (compatibilidad de navegadores).
- El caso sin explicar del pie de página de `AuthLayout` (parte 1) — confirmar visualmente en un navegador real.
