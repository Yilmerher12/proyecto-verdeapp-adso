# Auditoría de coherencia entre tema claro y oscuro (issue #503)

Fecha: 2026-10-22. Rama: `fix/coherencia-temas-claro-oscuro`.

> Pregunta del issue: ¿cada color cumple el mismo papel en los dos temas, nada se pierde con el fondo y el contraste cumple WCAG AA en ambos? Las auditorías anteriores (`auditoria-contraste-paleta-nueva.md` y las de RNF-003) midieron el contraste del **texto**; ninguna comparó los dos temas lado a lado ni midió los **bordes y superficies**. Aquí se midieron las dos cosas.

## Cómo se midió

1. **Texto.** Un script en el navegador recorre cada texto visible, calcula el color real del texto y del fondo (componiendo las transparencias, leyendo los colores ya calculados por el navegador) y marca los que no llegan al mínimo de WCAG AA: 4.5:1, o 3:1 si el texto es grande. Se corrió con la app real, en los dos temas, con las transiciones apagadas (el panel oculto del navegador congela las transiciones y daba números a medio camino).
2. **Bordes de los campos de formulario.** El mismo script mide el borde de cada campo visible contra lo que lo rodea (WCAG 1.4.11 pide 3:1 para el borde que delimita un control).
3. **Superficies y bordes decorativos.** Se calcularon a partir de los valores de los tokens de `fe/src/index.css`.
4. **Código.** Un script con el compilador de TypeScript buscó colores escritos a mano, clases claras sin pareja oscura y `text-gray-400`.
5. **Capturas** de las pantallas en los dos temas, antes y después de los cambios.

### Pantallas medidas

| Rol | Rutas (cada una en claro y en oscuro) |
| --- | --- |
| Públicas | `/`, `/login`, `/register`, `/forgot-password`, `/terminos-de-uso`, `/privacidad`, `/politica-cookies`, `/contacto` (antes); `/`, `/login`, `/forgot-password`, `/politica-cookies`, `/contacto` (después) |
| Residente | `/dashboard/residente`, `/comunicados`, `/novedades`, `/catalogo-educativo`, `/directorio`, `/profile` |
| Reciclador | `/dashboard/reciclador`, `/comunicados`, `/novedades`, `/profile` (el catálogo y el directorio no son de este rol) |
| Admin de Conjunto | `/dashboard/admin-conjunto`, `/admin-conjunto/comunicados`, `/admin-conjunto/agenda`, `/admin-conjunto/desempeno`, `/profile`, `/change-password` |
| Admin del Sistema | `/dashboard/admin`, `/admin/puntos-acopio`, `/admin/novedades`, `/admin/contenido-educativo`, `/profile` |

## Qué se encontró y qué se hizo

### Texto por debajo de AA

| Dónde | Antes | Qué se hizo | Después |
| --- | --- | --- | --- |
| Selector de idioma, "EN" inactivo en claro | 4.19:1 | `text-gray-600` | 6.5:1 |
| Selector de idioma, "ES" activo en oscuro | 3.7:1 | `accent-300` | 5.5:1 |
| Aviso del Directorio, texto pequeño de fuente | 4.1:1 claro, 3.92:1 oscuro (`accent-700/80`, con transparencia) | `accent-800` claro, `accent-300` oscuro | pasa |
| Política de cookies, título "Cookies Funcionales de Autenticación" | 2.4:1 claro (`accent-400` sobre gris claro) | `accent-700` claro, `accent-400` oscuro | pasa |
| Botón peligroso ("Desactivar") en oscuro | 3.81:1 (`red-500` con texto blanco) | `red-600`, igual que en claro | pasa |
| Fecha de las solicitudes pendientes | `text-gray-400` sin pareja (2.5:1 en claro; hallazgo del código, no del script) | `text-gray-500 dark:text-gray-400` | pasa |
| 12 íconos (lupas, pin, teléfono, etc.) | `text-gray-400` sin pareja (2.5:1 en claro) | `text-gray-500 dark:text-gray-400` | pasa |
| Botón de tema en la barra del Landing (modo claro) | `gray-600` sobre el verde oscuro de la barra (casi invisible) | `ThemeToggle onDark` con texto claro | visible |

### Bordes y superficies

| Dónde | Antes | Qué se hizo | Después |
| --- | --- | --- | --- |
| Escala de grises del modo claro | `gray-200` (#edf2f1) **más clara** que `gray-100` (#e9f0ef): escala invertida | `gray-200` = #dbe5e2 | borde sobre blanco 1.29:1 (antes 1.13:1) |
| Borde de los campos, modo claro | 1.13:1 (`gray-200`, buscadores) y 1.47:1 (`gray-300`, resto): dos grises distintos para lo mismo | token nuevo `edge` (#7f8f8a) en los 65 lugares con borde de control | 3.39:1 |
| Borde de los campos, modo oscuro | 1.32:1 a 1.36:1 (`night-line`) | token nuevo `night-edge` (#548a6b) | 4.08:1 a 4.21:1 sobre la tarjeta (3.39:1 sobre el relleno del campo) |
| Borde decorativo, modo oscuro | `night-line` #23392b, 1.32:1 sobre la tarjeta | #2e4a3a | 1.68:1 |
| Fondo del área de contenido, modo claro | `gray-200` #edf2f1 (la inversión de arriba lo hacía más claro de lo debido) | sigue siendo `gray-200`, ahora #dbe5e2 | tarjeta blanca contra el fondo 1.29:1 (antes 1.13:1) |

### Resultado de la medición, antes y después

| | Antes | Después |
| --- | --- | --- |
| Textos bajo AA en los 4 roles | 3 (selector de idioma, aviso del Directorio, botón "Desactivar") | 0 |
| Textos bajo AA en páginas públicas | selector de idioma y título de cookies | 0 (ver "Lo que el script no puede medir") |
| Borde de campos, claro | 1.13:1 a 1.47:1 | 3.39:1 |
| Borde de campos, oscuro | 1.32:1 a 1.36:1 | 4.08:1 a 4.21:1 |

## Colores de categoría y estados

- Los niveles Bueno/Regular/Malo ya no dependían solo del color: cada uno lleva carita (`Smile`/`Meh`/`Frown`) y texto (`config/nivelesDesempeno.ts`). Éxito, aviso y error llevan ícono y texto en `Alert`.
- `purple`, `indigo` y `teal` se usan como colores de categoría (tipo de comunicado y de aviso, auditoría) en 16 archivos. Todos tienen su pareja clara y oscura completa (`-700` sobre `-50` / `-400` sobre `-900/20`), así que son coherentes entre los dos temas. No se centralizaron: queda documentada la excepción en `docs/requisitos/restricciones.md`.
- No había ningún color hexadecimal escrito a mano en los componentes.
- El script del código marcó 4 clases claras sin pareja oscura; las 4 son falsos positivos (el punto blanco de un radio, una insignia de respaldo y fondos de superposición `white/10`).

## Tabla de equivalencias

Quedó escrita en `docs/requisitos/restricciones.md` (viñeta "Equivalencias entre el modo claro y el oscuro") y es la única fuente. La prueba `fe/src/__tests__/lib/coloresTemas.test.ts` falla si aparece un color escrito a mano, un `text-gray-400` sin pareja oscura o un `border-gray-300` suelto.

## Lo que el script no puede medir, y lo que sigue sin resolver

- **El hero del Landing en modo claro.** El texto blanco va sobre una foto con una capa oscura; el script no lee la foto y marca falsos errores de contraste (1:1). Se revisó a ojo en la captura: se lee bien.
- **Modales y formularios que no estaban abiertos** al medir: el de reportar auditoría del Reciclador, los formularios de crear y editar del Admin del Sistema y del Admin de Conjunto. Sus campos usan el mismo token nuevo (`border-edge`, comprobado por la prueba), pero no se midieron en pantalla.
- **Tarjeta contra fondo en modo oscuro**: sigue siendo baja (1.14:1 entre `night-page` y `night-card`; `night-panel`, el de los modales, es casi igual a la tarjeta: 1.03:1). Es una decisión de diseño de la paleta "Bosque Andino"; aquí solo se subió el borde (de 1.32:1 a 1.68:1) para que las tarjetas se distingan. Cambiar los fondos es tocar la identidad visual, que el issue deja fuera.
- **Efecto visible de los cambios:** el fondo del área de contenido en modo claro es ahora un verde grisáceo un poco más oscuro (antes casi blanco), y los campos y las tarjetas en modo oscuro tienen un borde más marcado. Es lo que corrige la queja de que las superficies "se pierden", pero cambia el aspecto de toda la app y conviene que el equipo lo confirme.
- **Sin prueba en un celular real ni con lector de pantalla**, solo el navegador de escritorio y su emulación.
