# RNF-003 — Usabilidad y Adaptabilidad

---

## Identificación

| Campo             | Valor                                                  |
| ----------------- | ------------------------------------------------------ |
| **ID** | RNF-003                                                |
| **Nombre** | Usabilidad y Adaptabilidad                             |
| **Categoría** | UX / UI (Experiencia e Interfaz de Usuario)            |
| **Prioridad** | Alta                                                   |
| **Estado** | Implementado                                           |

---

## Requisitos

### RNF-003.1 — Diseño Responsivo (Mobile-First)
El sistema debe contar con un diseño responsivo que garantice la correcta visualización y operatividad en dispositivos móviles (smartphones, tablets) y de escritorio (laptops, PCs). Dada la naturaleza del rol 'Reciclador', la interfaz debe priorizar la experiencia en pantallas pequeñas.

### RNF-003.2 — Compatibilidad de Navegadores
El frontend debe ejecutarse sin errores de renderizado o funcionalidad en las versiones recientes de los navegadores web modernos, soportando explícitamente:
- Google Chrome
- Mozilla Firefox
- Microsoft Edge

### RNF-003.3 — Accesibilidad Básica
La interfaz (construida en React) debe utilizar un contraste de colores adecuado, tamaños de letra legibles en móviles y botones de acción con áreas táctiles suficientemente grandes para evitar toques accidentales.

> **Estado real (2026-08-28)**: **Implementado y verificado**, con auditoría propia documentada en `docs/gestion-proyecto/auditoria-rnf-003-*.md` (6 archivos, 2026-08-24/25): contraste corregido en dashboards y páginas restantes (003.3), responsive verificado en tablet sin problemas de overflow (003.1), y verificado en escritorio (1280px) + cross-browser (Chrome/Edge/Firefox) sin problemas (003.2). El propio cierre de esa auditoría dice textualmente: *"Con esto, RNF-003 queda completamente verificado (contraste + responsive + cross-browser)."* Solo queda un detalle cosmético menor sin confirmar en el footer de `AuthLayout`, no bloqueante.

> **Re-auditoría de adaptación a celular y tableta (2026-10-19)**: la verificación de agosto no había revisado el celular en las pantallas con sesión (solo las públicas y el panel del Administrador del Sistema), y después se agregaron pantallas. Se revisaron los 4 roles y las páginas públicas en 375x812, 768x1024 y 1024x768 (`docs/gestion-proyecto/auditoria-rnf-003-adaptacion-octubre-2026.md`). Se encontraron y corrigieron: el menú lateral abierto en celular (ocupaba hasta el 75% de la pantalla y no se cerraba al navegar), etiquetas partidas y una pestaña y un buscador cortados en el panel del Administrador del Sistema, el título cortado del panel del Administrador de Conjunto, nombres cortados con "…", el doble margen lateral en celular y los controles de menos de 36 px (ahora con un área táctil de 44 px en celular, 003.3). 003.1 y 003.3 quedan **verificados en esos tamaños**, salvo los modales del Reciclador con datos reales, que quedan pendientes, y sin prueba en un celular real (se usó emulación).

> **Elementos clicables (2026-10-22, issue #501)**: la auditoría de accesibilidad no había revisado si lo que se puede tocar se reconoce sin pasar el mouse (en celular no hay mouse). Se revisaron los 260 elementos clicables del frontend (lista en `docs/gestion-proyecto/barrido-elementos-clicables.md`) y se corrigieron los que no cumplían: enlaces de texto que solo cambiaban de color (ahora llevan subrayado siempre, clase `link-text`), botones de acción con fondo suave y sin borde que se leían como etiquetas, botones de solo ícono sin pista visible (ahora `title`), fotos clicables sin indicio (insignia siempre visible) y un foco con teclado casi invisible en el componente `Button` (anillo al 20% de opacidad). La regla quedó escrita en `docs/requisitos/restricciones.md` y la comprueba una prueba automática (`elementosClicables.test.ts`). Refuerza 003.3 (accesibilidad básica) y RNF-005.

> **Coherencia entre tema claro y oscuro (2026-10-22, issue #503)**: las auditorías de contraste anteriores midieron el texto, pero no compararon los dos temas ni midieron los bordes. Se midió el contraste real (script en el navegador) en los 4 roles y las páginas públicas, en los dos temas (`docs/gestion-proyecto/auditoria-coherencia-temas.md`). Se corrigieron: el selector de idioma (4.19:1 y 3.7:1), un aviso del Directorio, un título de cookies (2.4:1), el botón peligroso en oscuro (3.81:1), trece `text-gray-400` sin pareja, el botón de tema de la barra del Landing, la escala de grises del modo claro (`gray-200` estaba más clara que `gray-100`) y el borde de los campos de formulario (1.13–1.47:1 en claro y 1.32–1.36:1 en oscuro, ahora 3.4:1 y 4.1:1, WCAG 1.4.11) con los tokens nuevos `edge` y `night-edge`. La tabla de equivalencias claro/oscuro quedó en `docs/requisitos/restricciones.md` y la protege una prueba automática (`coloresTemas.test.ts`). Refuerza 003.3. Tras revisar esa primera versión con el equipo se rediseñó el tema oscuro (capas casi neutras con borde visible, el menta como único acento, avisos translúcidos y los 4 roles con el mismo acento; segunda parte de la auditoría). La tarjeta contra la página sigue en 1.20:1, porque separar más las capas cambiaría la identidad visual.

> **Re-auditoría de contraste (2026-09-27)**: la identidad visual cambió después de esa auditoría (paleta "Páramo Fresco" / "Bosque Andino", tokens `night-*` del modo oscuro, colores por rol), así que el contraste se volvió a medir: `docs/gestion-proyecto/auditoria-contraste-paleta-nueva.md`. La paleta nueva pasa WCAG AA en todos sus pares (texto, enlaces, botones, mensajes, badges de rol, sidebar y hero). Los grises de Tailwind que aparecieron con bajo contraste (`text-gray-400` en texto, la pareja invertida `text-gray-400 dark:text-gray-500`, y el antetítulo y los números de "Nuestros pilares") **se corrigieron el mismo día** (sección "Corrección" de esa auditoría). 003.3 queda **implementado y verificado** con la paleta nueva.