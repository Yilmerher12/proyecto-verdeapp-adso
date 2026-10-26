# Barrido de elementos clicables (issue #501)

Fecha: 2026-10-22. Rama: `feat/elementos-clicables-reconocibles`.

> Pregunta del issue: ¿una persona que no conoce la app puede señalar qué se toca en cada pantalla, sin pasar el mouse y sin dudar? Este documento es la lista del barrido: qué se revisó, qué no cumplía y qué se hizo. La regla que sale de aquí está en [`restricciones.md`](../requisitos/restricciones.md) (viñeta "Elementos clicables" de Diseño Visual).

## Cómo se hizo

1. **Lista automática.** Un script con el compilador de TypeScript recorrió los 87 archivos `.tsx` (sin pruebas) y sacó **260 elementos clicables**: 159 `<button>`, 48 enlaces (`<a>` y `<Link>`) y 53 `<label>`. Por cada uno se guardó la ruta, la línea, las clases, si tiene `aria-label` o `title` y si muestra texto.
2. **Revisión de cada caso dudoso.** Se abrió el código de cada elemento marcado y se decidió si se corrige o se deja.
3. **Revisión en pantalla** con las cuentas de prueba, en modo claro y oscuro (ver "Qué se comprobó en pantalla" al final).
4. **Para que no vuelva a pasar:** la prueba `fe/src/__tests__/lib/elementosClicables.test.ts` hace la misma revisión sobre todo el código y falla si aparece un botón de solo ícono sin `title`, un enlace de texto sin subrayado o una imagen clicable sin insignia.

## Hallazgos y qué se hizo

### Elementos compartidos

| Elemento | Qué pasaba | Qué se hizo |
| --- | --- | --- |
| `Button` (23 usos) | El foco con teclado era `focus:ring-accent-500/20`: un anillo al 20% de opacidad, casi invisible, y con `focus:` (también aparecía al hacer clic con el mouse) | Usa `focus-ring` (anillo sólido, solo con `:focus-visible`) |
| Enlaces de texto (27 en 18 archivos) | Solo cambiaban de color; el verde no se distingue del texto vecino sin pasar el mouse | Clase nueva `link-text` en `index.css`: verde, negrita, subrayado siempre |
| Botones y enlaces de solo ícono o logo (39) | Tenían `aria-label` (lo lee el lector de pantalla) pero ninguna pista visible al enfocar o pasar el mouse | `title` con el mismo texto del `aria-label` |
| Imágenes clicables (5 lugares) | Solo cambiaban de opacidad al pasar el mouse (en celular no hay mouse); una tenía el ícono visible solo en `hover` | Componente nuevo `InsigniaAccionImagen`, siempre visible (`Maximize2` para ampliar, `ExternalLink` para abrir en otra pestaña) |
| Botones que parecían etiquetas (7) | Fondo suave sin borde (`bg-accent-50`, `bg-red-50`, `bg-gray-100`), igual que los chips de estado | Borde visible del mismo tono, más `focus-ring` |

### Páginas públicas

| Pantalla | Elementos | Resultado |
| --- | --- | --- |
| Landing | Enlaces del pie (5), enlaces de la barra y botones del hero | Pie: subrayado. Barra y botones del hero: ya tenían forma de botón y foco propio, sin cambios |
| Inicio de sesión | "¿Olvidaste tu contraseña?", "Regístrate aquí" | `link-text` |
| Registro | "Términos de uso" y "Política de privacidad" (eran `<button>` en verde, sin subrayado) | `link-text` |
| Recuperar y restablecer contraseña | "Volver al inicio de sesión", "Solicitar un enlace nuevo" | `link-text` |
| Pie de `AuthLayout` (4 enlaces) | Gris, sin subrayado | Subrayado y `focus-ring` |
| Términos, Privacidad y Cookies (9 enlaces) | `text-accent-400` sin subrayado: además de no verse como enlace, el verde claro sobre blanco tiene 2.6 de contraste | `link-text` (verde oscuro en modo claro) |
| Verificar correo | Botones ya con forma de botón | Sin cambios |

### Residente

| Pantalla | Elementos | Resultado |
| --- | --- | --- |
| Directorio | "Ver fuente" (ya subrayado y con ícono), "Copiar dirección" (ya con `title`), Llamar y WhatsApp (ya con forma de botón) | Sin cambios |
| Comunicados y Novedades | "Ver adjunto" | `link-text` |
| Panel principal (avisos) | "Marcar todas como leídas" y "Limpiar leídas" (texto suelto) | `link-text` y subrayado |
| Cambiar contraseña | "Recupérala aquí" (ya subrayado) | Pasa a `link-text` para que sea igual que los demás |

### Reciclador

| Pantalla | Elementos | Resultado |
| --- | --- | --- |
| Reportar auditoría | Lista de temas (`<select>` sin `cursor-pointer`), botón de quitar foto | `cursor-pointer` y `title` |
| Resultado de la auditoría | Fotos de evidencia (3) | `InsigniaAccionImagen` y `title` |
| Videos de YouTube | "Ver en YouTube" (gris, sin subrayado), botón de reproducir | `link-text` con `ExternalLink`; `title` |

### Administrador de Conjunto

| Pantalla | Elementos | Resultado |
| --- | --- | --- |
| Panel principal | "Editar", "Regenerar", "+ Invitar reciclador", "Solicitar desvinculación", "Cancelar" (2) | Borde visible y `focus-ring` |
| Panel principal | Copiar código, revocar reciclador | `title` |
| Panel principal | Flecha del acordeón en `text-gray-400` (2.6 de contraste) | `text-gray-500` |
| Comunicados | Editar, eliminar, "Ver adjunto" | `title`; `link-text` |
| Agenda | Fotos de evidencia (2), borrar y cerrar | `InsigniaAccionImagen` y `title` |
| Desempeño | Semanas de la tabla (subrayado solo al pasar el mouse) | Subrayado visible |

### Administrador del Sistema

| Pantalla | Elementos | Resultado |
| --- | --- | --- |
| Panel principal | "Ver solicitudes" (sin borde), nombre de cada usuario (subrayado `gray-200`, casi invisible), paginación, flecha del acordeón | Borde; `decoration-gray-500`; `title`; `text-gray-500` |
| Puntos de acopio | "Ver en el mapa", nombre del punto (subrayado solo al pasar el mouse), editar, dar de baja, reactivar, eliminar, flecha del acordeón | `link-text` con `ExternalLink`; subrayado visible; `title`; `text-gray-500` |
| Crear novedades | "Ver adjunto", "Ver video", editar, archivar | `link-text`; `title` |
| Contenido educativo | Nombre del conjunto en las calificaciones (subrayado casi invisible), editar, eliminar, semana anterior y siguiente, ampliar foto (2) | `decoration-gray-500`; `title`; `InsigniaAccionImagen` |
| Solicitudes pendientes | "Ver imagen" | `link-text` |

### Menú y barra superior (todos los roles)

| Elemento | Qué pasaba | Qué se hizo |
| --- | --- | --- |
| Campanita | Tenía `aria-label` pero ninguna pista visible | `title`. A dónde lleva no se cambió (es otro issue) |
| Botón del menú (celular) y colapsar menú | Igual | `title` |
| Cerrar de las ventanas, paneles y avisos | Igual | `title` |
| Mostrar contraseña, volver al inicio, subir al inicio, paginación | Igual | `title` |

## Revisado y sin cambios

- **Pestañas y filtros** (Agenda, Puntos de acopio, Guía de apoyo): son botones con estado visible (`aria-pressed`) y forma de botón.
- **Acordeones** (Puntos de acopio, Novedades, Panel del Admin del Sistema): todos tienen una flecha que gira.
- **Interruptor "Ver archivadas"** (Novedades): ya tiene `role="switch"` y un texto asociado (`aria-labelledby`).
- **Etiquetas `<label>`** que envuelven un campo: todas tienen `cursor-pointer`.
- **`<select>`**: 21 de 22 tenían `cursor-pointer`; el que faltaba (temas de la auditoría) se corrigió.

## Lo que el barrido no cambió, a propósito

- A dónde lleva la campanita y el rediseño de las tarjetas de los paneles (#111): fuera de alcance del issue.
- La paleta de colores y las animaciones: otros issues. Aquí solo se usaron los tokens `accent-*` y `night-*` que ya existían.
- Los botones hechos a mano que no usan el componente `Button` (unos 140) se dejaron como estaban salvo los hallazgos de arriba: pasarlos todos a `Button` es un rediseño aparte, y sus variantes actuales ya cumplen la regla (forma de botón, `cursor-pointer`, foco visible).
- Dos cifras de la primera lista del barrido resultaron ser falsos positivos y no se corrigieron: 7 botones "sin `cursor-pointer`" (sí lo tienen, en una constante de clases que el script no resolvió) y un interruptor "sin nombre" (tiene `aria-labelledby`).

## Qué se comprobó en pantalla

Ver la sección de verificación en la descripción del PR: cuentas de los cuatro roles, modo claro y oscuro, celular y recorrido con la tecla Tab.
