# Investigación — Paleta de colores y reglas de los temas claro y oscuro

<!--
  ¿Qué? Investigación de la paleta de colores de VerdeApp: qué falla hoy en el
        tema oscuro (y algo en el claro), qué dicen las guías de la industria y
        qué se decidió, rol por rol, con valores medidos.
  ¿Para qué? Dejar por escrito las decisiones y su motivo antes de tocar el
             código, para que las tarjetas de implementación no tengan que
             volver a discutir lo mismo y para tener una tabla de valores que
             también sirva a la app móvil.
  ¿Impacto? Sin esto, cada pantalla seguiría eligiendo sus colores a ojo y el
            razonamiento de cada decisión (por qué el campo lleva borde, por
            qué hay una capa flotante, por qué el rojo no es sólido) viviría
            solo en una conversación.
-->

**Issue:** ninguno por ahora. Es una exploración: se abrirán issues solo si el equipo decide aplicar la paleta
**Fecha:** 2026-11-25
**Rama:** `docs/investigacion-paleta-colores`

---

## Contexto

El profesor del programa sugirió revisar la paleta con la herramienta **Adobe Color** (color.adobe.com), porque una app toda en tonos de verde no es lo mejor. Además, al revisar la app en el tema oscuro, el equipo encontró estos problemas:

1. **Landing en oscuro.** Las tarjetas de "Nuestros pilares" casi se pierden en el fondo, el contenido de esa sección crece al cambiar de tema, y el footer queda pegado debajo.
2. **Formularios.** El campo y la tarjeta del formulario son del mismo color; solo los separa un borde verde luminoso.
3. **Contenido gris con blanco** en el tema claro (tarjetas blancas sobre fondo gris).
4. **Páginas de acceso** (recuperar contraseña, verificar cuenta): fondo casi negro y tarjeta igual al campo.
5. **Dashboards.** Tarjetas, secciones y botones del mismo verde oscuro; solo el borde luminoso evita que se pierdan.
6. **Botones secundarios** que se confunden con el menú lateral y con el fondo; la barra de progreso apenas se ve.
7. **Encabezado** (campana, idioma y tema) que no se distingue del fondo.
8. **Botones y avisos rojos** que se pierden en oscuro.
9. **Decisiones por función.** Antes de arreglar los temas hay que escoger bien cómo se ve un botón según lo que hace, una tarjeta, un aviso y una etiqueta.

## Preguntas a responder

1. ¿Qué falla hoy, medido con números, y por qué?
2. ¿Qué reglas de la industria y de accesibilidad aplican?
3. ¿Qué se decide para cada rol de color (zonas, campos, capas, botones, avisos, color de apoyo, páginas de acceso, Landing, fondo del tema claro)?
4. ¿Qué issues de implementación nacen de esto, y en qué orden?

## Qué se investigó

- El código actual: `fe/src/index.css`, `Button.tsx`, `Alert.tsx`, `AuthLayout.tsx`, `LandingPage.tsx`, `AppShell.tsx` y las reglas de [`restricciones.md`](../requisitos/restricciones.md).
- Contrastes de los pares de colores reales, calculados con la fórmula de contraste de WCAG.
- Guías públicas: Radix Colors, Material Design (tema oscuro) y WCAG 1.4.3 y 1.4.11.
- La app en el navegador en tema oscuro (Landing, recuperar contraseña, panel del Admin de Conjunto).
- **Pruebas de paleta en la app real.** Se probó un selector flotante con 7 paletas globales (grises, superficies del oscuro y azul remapeado). Se descartó (ver "Lo que no funcionó").
- Maquetas por rol, comparadas lado a lado en claro y oscuro (ver "Bocetos").

---

## Hallazgos sobre el estado actual

### 1. Lo medido en el tema oscuro

| Par de colores | Contraste | Qué significa |
| --- | --- | --- |
| Campo (`night-field`) sobre modal o tarjeta de login (`night-panel`) | 1.07:1 | Son prácticamente el mismo color; solo el borde los separa |
| Campo sobre tarjeta (`night-card`) | 1.21:1 | Igual |
| Tarjeta sobre fondo del contenido | 1.20:1 | Capas casi iguales |
| Fondo del contenido sobre menú lateral (`night-base`) | 1.12:1 | Idem |
| Encabezado sobre contenido | 1.00:1 | Ambos son `night-page`; los separa solo una línea |
| Botón secundario (`night-inset`) sobre menú lateral | 1.18:1 | Se pierde |
| Barra de apartamentos (`CoberturaConjunto.tsx`): relleno `accent-700` sobre pista `night-line` | 1.18:1 | El relleno casi no se distingue de la pista, y es lo que la hace ver apagada. Ese relleno no tiene variante para oscuro; `ProgressBar.tsx` sí usa `accent-400` (3.40:1) |
| Borde por defecto en oscuro (`gray-700`) sobre tarjeta | 1.44:1 | Más débil y de otro tono que `night-line` |
| Borde del botón de peligro (`red-400` al 30 %) sobre tarjeta | 1.60:1 | No llega a 3:1 |

Lo que sí cumple hoy: el borde del campo (`night-edge`) llega a 3.28:1 sobre el campo y 3.97:1 sobre la tarjeta. **El campo actual no incumple WCAG**: lo que molesta es la jerarquía visual y que el borde sea un verde que se siente neón.

### 2. Lo medido en el tema claro

- `text-gray-500` (el texto secundario que manda `restricciones.md`) sobre el fondo del contenido (`gray-200`) da **3.76:1**; sobre blanco da 4.83:1. Hay 284 usos de `text-gray-500` en 77 archivos, y no se midió cuántos caen sobre el fondo gris.
- La tarjeta blanca sobre el fondo gris está a 1.29:1.
- El menú lateral es verde de marca en claro (`accent-900`) pero casi negro en oscuro (`night-base`): es una incoherencia entre temas.

### 3. Uso de colores en el código (fuera de pruebas)

| Escala | Usos | Papel |
| --- | --- | --- |
| `red` | 245 | Error y peligro |
| `amber` | 209 | Avisos y pendientes |
| `teal` | 40 | Varios |
| `blue` | 28 | Información |
| `purple`, `indigo` | 26 y 24 | Varios |
| `yellow`, `orange` | 8 y 3 | Pocos |
| `gray-300` a `gray-900` | 698 | Textos y bordes; son los grises azulados de Tailwind, mientras `gray-50` a `200` están redefinidos en verdoso |

El color de marca (`accent`) cubre todo lo demás. Es una decisión del issue #503 ("un solo acento"), y por eso cambiar los grises o las superficies de forma global casi no se nota (ver "Lo que no funcionó").

### 4. Landing en oscuro (`LandingPage.tsx`)

- Las tarjetas de "Nuestros pilares" solo existen en oscuro (`dark:p-6`, `dark:border`, `dark:bg-night-card`); en claro es texto directo sobre el verde. **Por eso la sección crece al cambiar de tema.**
- Tarjeta (`#1a2b22`) sobre su fondo (`night-inset`, `#131f19`): 1.14:1.
- "Cómo funciona" usa la foto del encabezado fija (`background-attachment: fixed`) con un velo del 90 % de `night-page`; las tarjetas de los pasos son translúcidas.
- El footer es `night-base` (casi negro) justo debajo de un verde oscuro. Un comentario del código dice que es a propósito, para que se noten distintos, pero en oscuro se lee como un corte seco.

### 5. Páginas de acceso (`AuthLayout.tsx`)

Fondo `night-base`, tarjeta `night-panel`, campo del mismo color que la tarjeta con borde verde, y botón desactivado resuelto con `opacity-50` del verde principal. Login y registro **no** son páginas: son modales sobre la Landing.

### 6. Botones y avisos (`Button.tsx`, `Alert.tsx`)

- En oscuro el botón principal ya es menta (`accent-300`, con texto `accent-950`), igual que "Unirse a VerdeApp". Lo que se pierde es el **secundario**.
- El peligro tiene dos formas: `danger` (rojo sólido) y `dangerOutline`. Las reglas dicen "rojo sólido o con borde rojo" sin dar el motivo de elegir una u otra.
- Los avisos en oscuro usan relleno al 10 % y borde al 30–40 %: casi no se despegan de la tarjeta; el color lo lleva solo el texto.

---

## Reglas de la industria que se usaron

- **Material Design (tema oscuro).** Recomienda una base gris oscura (`#121212`) y no negro puro; las capas más altas se ven más claras; no conviene llenar superficies grandes con colores brillantes. Fuente: [Material, Dark theme](https://m2.material.io/design/color/dark-theme).
- **Radix Colors.** Piensa los colores por **rol** (fondo de la app, fondo de componente, bordes, color sólido, texto de bajo y alto contraste) en una escala de 12 pasos. De la documentación oficial salen los pasos 1, 9, 10, 11 y 12; las asignaciones de bordes y de fondo de componente son convención de la comunidad. Fuente: [Radix Colors, Understanding the scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale).
- **WCAG 1.4.11, contraste de elementos no textuales.** Un componente de interfaz, como el borde de un campo, necesita 3:1 contra los colores adyacentes. No se exige cuando el control se identifica de otra forma (por ejemplo, un botón con texto). **No pide contraste entre fondos.** Fuente: [W3C, Understanding Non-text Contrast](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast).
- **WCAG 1.4.3, contraste mínimo del texto:** 4.5:1 para texto normal. Fuente: [W3C, Understanding Contrast (Minimum)](https://w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

Idea que se tomó de ahí: **decidir por rol y no por tono**. Y una conclusión práctica: en oscuro las capas nunca se separan mucho (1.2 a 1.3:1) y no hace falta; lo que sí debe verse es el borde de los controles.

---

## Decisiones

### 1. Zonas de la pantalla: menú de marca

- El menú lateral es **verde de marca en los dos temas** (hoy en oscuro es casi negro).
- El **encabezado** (barra superior con campana, idioma y tema) es del **color de las tarjetas**.
- Alternativas descartadas: marco único (menú y encabezado del mismo color neutro) y todo plano (todo del mismo color, separado por líneas).
- Por qué: conserva la identidad verde y quita la incoherencia entre claro y oscuro.

### 2. Campos: mismo color que su contenedor, con borde estándar

- El campo es del color de la tarjeta o del modal donde está, con un borde de **3:1 o más** (WCAG 1.4.11).
- Alternativas descartadas: campo hundido (más oscuro que lo que lo rodea) y campo elevado (más claro).
- Por qué: es lo que ya hace el tema claro (campo blanco sobre tarjeta blanca con borde `edge`); modo claro y oscuro siguen la misma regla. El problema actual es el tono neón del borde, no la norma.

### 3. Capa flotante: un paso más clara que la tarjeta

- Modales, menús de acciones y listas de combobox son de una capa **más clara** que la tarjeta (`#2f3c37` contra `#242e2a`, 1.22:1).
- Por qué: un menú se abre **encima** de una tarjeta; con el mismo color se funde con ella (1.00:1) y las sombras casi no se ven en oscuro. En claro la separa la sombra, porque no hay nada más claro que el blanco.

### 4. Modo oscuro: nivel 1, "profundo"

Se compararon cuatro niveles de claridad contra el actual. Se eligió el **nivel 1**: las capas de hoy un poco más claras, con el menú en verde de marca. Los niveles más claros bajan el contraste del texto de acento: el menta sobre la tarjeta pasa de 8.1:1 (nivel 1) a 6.7, 5.4 y **4.3** (nivel 4, que ya no cumple 4.5:1 para texto pequeño).

### 5. Botones según lo que hacen

- **Principal:** uno por vista. Menta (oscuro) o verde (claro), como hoy.
- **Secundario:** como un campo: color de la tarjeta, borde a 3:1 o más.
- **Texto:** verde subrayado.
- **Peligro:** con **borde rojo visible** (en oscuro `#f87171`, 5.06:1 sobre la tarjeta; hoy es el mismo rojo al 30 %, a 1.60:1). El **rojo sólido queda para el botón de confirmar dentro del modal**.
- Alternativas descartadas: secundario tonal (relleno suave) y secundario verde con peligro siempre sólido.
- Por qué no todos los botones en menta: si todo es luminoso, nada destaca. Lo que había que arreglar es que el secundario se vea.
- El patrón "peligro con borde en la página y sólido en la confirmación" es común, pero **no se respaldó con una fuente**. Es un criterio de diseño.

### 6. Avisos y etiquetas: tonal reforzado

- Relleno translúcido al **18 %**, borde al **60 %** y **ícono en el color pleno** del tipo. Hoy: 10 % y 30 a 40 %.
- Alternativas descartadas: barra de acento a la izquierda y relleno sólido oscuro.
- El borde de un aviso no es el único indicador (lo son el texto y el ícono), por eso no se le exige 3:1. En oscuro, el borde del error queda a 2.68:1 y el ícono del error a 3.9:1.

### 7. Color de apoyo: turquesa

- Se usa en **cifras de los dashboards, etiquetas de categoría y el aviso de información** (el azul actual se fusiona con él). **No** se usa en botones: el principal sigue siendo verde, uno por vista.
- Se descartaron el rojo, el naranja y el ámbar, porque ya significan error y aviso (regla del issue #633). Entre los fríos se compararon turquesa (armonía análoga del verde), azul y violeta (tríada).
- Por qué turquesa: suma variedad sin romper la identidad ecológica. El azul cambiaba poco y era lo que el profesor criticaba; el violeta es el que más contrasta pero se aleja de la marca.

### 8. Páginas de acceso: fondo y tarjeta del sistema

- Fondo del contenido, tarjeta, campo igual a la tarjeta con borde a 3:1.
- El botón desactivado es **neutro** (fondo `#2f3c37`, texto `#97aaa3`, 4.7:1) y no el verde al 50 %.
- Cambia poco a la vista: el fondo deja de ser casi negro, el campo se distingue y el botón desactivado se entiende. Se dejaron como opciones futuras el fondo verde de marca y el diseño de dos paneles.

### 9. Landing en oscuro: foto fija con tarjetas sólidas

- Se **conserva** la foto fija en "Cómo funciona", con un velo más suave (80 %) y tarjetas **opacas** del color del sistema.
- "Nuestros pilares": verde de marca (`#143428`) con **texto directo, sin tarjetas**, igual que en claro. Con eso desaparece el salto de altura al cambiar de tema.
- Footer: fondo del sistema (`#161d1a`), a 1.27:1 del verde de arriba.
- El tema claro de la Landing no cambia.

### 10. Tema claro: fondo menta suave

- El fondo del contenido pasa del gris verdoso actual (`gray-200`, `#dbe5e2`) a una **menta suave** (`#e3f1ea`). Las tarjetas y el encabezado siguen blancos.
- El borde decorativo pasa a `#c3d9cd` y el **texto secundario** a `#4f655c`, que llega a 5.39:1 sobre ese fondo. Con eso se resuelve el hallazgo del texto secundario (3.76:1 con `gray-500` sobre `gray-200`).
- Alternativas descartadas: dejar el gris actual (obligaba a oscurecer el texto a `gray-600`), casi blanco (`#f1f5f4`, las tarjetas se despegan solo 1.10:1) y arena (`#efece5`, neutro cálido que rompe con el menú verde).
- Por qué: quita el gris apagado sin perder el despegue de las tarjetas (1.16:1, más que casi blanco), y mantiene la identidad verde de forma sutil.

### 11. Barra de progreso: relleno menta sobre pista hundida

- **Oscuro:** relleno menta `#86d6a6` sobre una pista `#121715`, más oscura que la tarjeta (10.5:1 entre relleno y pista, 1.29:1 la pista sobre la tarjeta).
- **Claro:** relleno `#126749` sobre una pista `#c3d9cd`, el color del borde decorativo (4.61:1).
- Aplica a la barra de apartamentos (`CoberturaConjunto.tsx`, que hoy no tiene variante para oscuro) y a `ProgressBar.tsx`.
- Alternativas descartadas: relleno medio sobre pista del borde (más sobrio, pero el relleno se ve menos fuerte: 4.3:1 en oscuro y 3.2:1 en claro) y pista con borde de control (se parece a un campo vacío).
- Por qué: el menta es el mismo color del botón principal, así que "avance" y "acción" hablan el mismo idioma, y es la que mejor se ve de lejos.

### 12. Modales: capa flotante y tarjetas de rol como campos

- El modal (`Modal.tsx`, hoy `bg-night-panel`) usa la **capa flotante** (`#2f3c37` en oscuro, blanco en claro). Sobre el fondo oscurecido que lleva detrás (negro al 50 % con desenfoque) da 1.68:1 en oscuro y 4.46:1 en claro, así que no necesita borde.
- Las **tarjetas seleccionables** de dentro (por ejemplo las de rol del registro: Residente, Reciclador, ¿Administras un conjunto?) siguen la regla del campo: mismo color que el modal y borde de control (`#698c7f`, 3.10:1 sobre el modal). Hoy llevan un borde verde de 1.70:1.
- No requiere una decisión nueva: sale de las decisiones 2 y 3.

### 13. Estados de los botones

| Variante | Al pasar el mouse | Desactivado |
| --- | --- | --- |
| Principal | un paso de claridad (oscuro: menta `#b0e6c5`; claro: verde más profundo, `#0f5238`) | fondo de capa y texto secundario (oscuro: `#2f3c37` y `#97aaa3`, 4.7:1; claro: `#e3f1ea` y `#4f655c`, 5.4:1) |
| Secundario | relleno suave (oscuro: `#2f3c37`; claro: `#e3f1ea`) | borde decorativo y texto secundario, sin relleno |
| Peligro | relleno rojo tenue (oscuro: rojo al 14 %; claro: `#fee2e2`) | igual que el secundario desactivado |
| Texto | color un paso más claro, subrayado | texto secundario, sin subrayado |

- **Foco de teclado** (todas las variantes): anillo de 2 px con separación, del color de acento: menta `#86d6a6` en oscuro (8.13:1 sobre la tarjeta) y verde `#16825d` en claro (4.79:1 sobre blanco). Es lo que ya hace la clase `focus-ring`.
- **Desactivado** es siempre **neutro**: nunca el color de la variante atenuado, para que no parezca un botón pálido sino uno inactivo. WCAG no exige contraste a los controles desactivados.

---

## Tabla de valores acordados

### Tema oscuro (nivel 1)

| Rol | Valor | Contraste medido |
| --- | --- | --- |
| Fondo del contenido | `#161d1a` | tarjeta sobre fondo 1.22:1 |
| Tarjeta y encabezado | `#242e2a` | |
| Capa flotante | `#2f3c37` | sobre tarjeta 1.22:1 |
| Borde decorativo | `#384742` | sobre tarjeta 1.43:1 |
| Borde de campos y botones secundarios | `#698c7f` | 3.8:1 sobre tarjeta, 3.1:1 sobre capa flotante |
| Menú lateral | `#143428` | sobre fondo 1.27:1 |
| Texto | `#eaf0ed` | |
| Texto secundario | `#97aaa3` | 5.7:1 sobre tarjeta |
| Texto del menú | `#bfe3d0` | 9.7:1 sobre el menú |
| Botón principal | menta `#86d6a6`, texto `#0a2018` | 8.1:1 sobre tarjeta |
| Barra de progreso | pista `#121715`, relleno menta `#86d6a6` | 10.5:1 entre relleno y pista |
| Turquesa: ícono | `#67e8f9` | 9.7:1 sobre tarjeta |
| Turquesa: etiqueta | relleno 18 % de `#22d3ee`, texto `#a5f3fc` | 7.6:1 |
| Peligro (borde) | `#f87171` | 5.06:1 sobre tarjeta |

Avisos en oscuro (relleno 18 %, borde 60 % del color pleno, sobre la tarjeta):

| Tipo | Color pleno (ícono) | Texto | Texto sobre relleno |
| --- | --- | --- | --- |
| Éxito | `#86d6a6` | `#b0e6c5` | 6.6:1 |
| Aviso | `#fbbf24` | `#fef3c7` | 8.4:1 |
| Error | `#f87171` | `#fecaca` | 7.4:1 |
| Información | `#22d3ee` | `#a5f3fc` | 7.6:1 |

### Tema claro

Los colores base casi se quedan. Los cambios son:

- Fondo del contenido `#e3f1ea` (menta suave), borde decorativo `#c3d9cd` y texto secundario `#4f655c` (5.39:1 sobre el fondo y 6.3:1 sobre la tarjeta). Tarjeta blanca sobre fondo: 1.16:1.
- Barra de progreso: pista `#c3d9cd` y relleno `#126749` (4.61:1).
- Borde de campos y botones secundarios: `edge` (`#7f8f8a`, 3.4:1 sobre blanco), que ya existe.
- Peligro: borde `#dc2626` y texto `#b91c1c` (4.83:1 sobre blanco).
- Turquesa: ícono `#0e7490` (5.4:1 sobre blanco); etiqueta con relleno `#cffafe` y texto `#164e63` (8.1:1).
- Avisos con relleno de la escala -100 (éxito `#c9ebda`, aviso `#fef9c3`, error `#fee2e2`, información `#cffafe`), borde medio y texto de la escala -900.

---

## Lo que no funcionó

Se probó en la app real un selector de 7 paletas globales (cambiando grises, superficies del oscuro y el azul). **Casi no se notaba**:

- El menú lateral y los botones usan `accent`, que es verde por diseño.
- Los grises de tonos neutros cambian poco a la vista.
- Solo cambiaba el azul de unos 28 usos.

Lección: comparar paletas completas no ayuda aquí; hay que decidir **por rol** y mostrar cada rol en claro y oscuro. La rama de esa prueba se descartó.

## Lo que no se verificó

- Las maquetas son colores calculados en un entorno aparte, **no la app real**. Un monitor distinto puede cambiar la impresión; antes de dar por cerrado un rol hay que mirarlo en la app.
- No se midió cuántos de los 284 usos de `text-gray-500` caen sobre el fondo gris.
- No se revisaron el modo oscuro con estos valores en los otros 3 roles, ni las tablas, gráficas e ilustraciones (`IlustracionCategoria.tsx` tiene 45 colores hex fijos, y `nivelesDesempeno.ts` define colores de los niveles).
- Alto contraste del sistema (`prefers-contrast`, `forced-colors`): una búsqueda en `fe/` no encontró ningún uso, y no se estudió aquí.
- Daltonismo: no se revisó si el color es la única señal de un estado en cada pantalla (los avisos ya llevan ícono).

## Pendientes de decidir al aplicar

1. **Colores de las gráficas** y de los niveles de desempeño (`nivelesDesempeno.ts`) frente al turquesa: conviene decidirlo con la pantalla real delante.
2. Verificar en la app real cada decisión de este documento antes de dar por cerrado su issue (las maquetas son colores calculados, no la app).

(La barra de progreso quedó decidida: ver la decisión 11. Una versión anterior de este documento la medía mal, suponiendo una pista más oscura; se corrigió al leer `CoberturaConjunto.tsx`.)

---

## Recomendación

Aplicar las 13 decisiones en este orden, empezando por la base: primero los tokens y las capas, y sobre eso los botones, los avisos y las pantallas.

## Qué issues de implementación nacerían

Cada uno es una tarjeta propia (una rama por tarjeta, desde `develop`):

1. **Tokens y capas.** Convertir `night-*` y `edge` en variables, definir fondo, tarjeta, capa flotante y bordes, menú verde de marca y encabezado del color de la tarjeta (`index.css`, `AppShell.tsx`), y la barra de progreso (`CoberturaConjunto.tsx`, `ProgressBar.tsx`). Es la base de todas las demás.
2. **Botones.** Secundario con borde estándar, peligro con borde rojo visible, rojo sólido solo en la confirmación, y los estados de hover, foco y desactivado (`Button.tsx`, `ConfirmModal.tsx`).
3. **Avisos y etiquetas.** Tonal reforzado (`Alert.tsx` y las etiquetas sueltas).
4. **Color de apoyo turquesa.** Tokens nuevos y reemplazo de `blue`, `indigo`, `purple` y `teal` según el papel de cada uso.
5. **Páginas de acceso y modales.** `AuthLayout.tsx`, el botón desactivado neutro, la capa flotante de `Modal.tsx` y las tarjetas de rol del registro como campos.
6. **Landing en oscuro.** "Cómo funciona", "Nuestros pilares" y el footer.
7. **Ajustes del tema claro.** Texto secundario, bordes y peligro.
8. **Documentación.** Actualizar `restricciones.md` (tablas de superficies y equivalencias entre claro y oscuro) y `auditoria-coherencia-temas.md`. Se hace al implementar y no en esta rama, porque esos documentos describen el código actual.
9. **Paleta para móvil.** Exportar la tabla de valores como tokens reutilizables para la app móvil (React Native no lee `index.css`).

El issue 1 bloquea al resto. Los demás pueden ir en paralelo cuando el 1 esté integrado.

## Documentación que puede cambiar

- [`docs/requisitos/restricciones.md`](../requisitos/restricciones.md): tabla de superficies del modo oscuro, equivalencias claro y oscuro, reglas de botones y de avisos. **Se actualiza en cada issue de implementación.**
- [`auditoria-coherencia-temas.md`](auditoria-coherencia-temas.md) y [`auditoria-contraste-paleta-nueva.md`](auditoria-contraste-paleta-nueva.md): se rehacen las mediciones al aplicar.
- Ninguna HU ni RF cambia: la conclusión no modifica requisitos funcionales.

## Bocetos

Las maquetas se hicieron como piezas interactivas durante la conversación y no se guardaron como archivos. Todo lo necesario para reproducirlas está en la tabla de valores de arriba.
