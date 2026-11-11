# VerdeApp — Restricciones del Proyecto

<!--
  ¿Qué? Documento que establece los límites técnicos y de proceso, no negociables,
        para el desarrollo de VerdeApp.
  ¿Para qué? Que cualquier persona del equipo (o que se sume después) sepa qué
             decisiones ya están tomadas y no debe cuestionar en cada tarea nueva —
             qué versión de cada tecnología usar, cómo se ve la interfaz, en qué
             idioma se escribe cada cosa, y qué reglas de seguridad son obligatorias.
  ¿Impacto? Sin este documento, cada integrante nuevo (o cada sesión con IA) tendría
            que adivinar estas reglas, con el riesgo real de que alguien instale una
            versión distinta de una librería, mezcle inglés y español sin criterio,
            o rompa una convención de diseño ya acordada.
-->

---

## Resumen

Este documento fija seis categorías de restricciones para VerdeApp: tecnología obligatoria, herramientas de desarrollo, diseño visual, idioma, contexto educativo y seguridad. A diferencia de una guía de estilo opcional, lo que está aquí **no se negocia tarea por tarea** — si algo necesita cambiar, se discute y se actualiza este documento primero, no se decide sobre la marcha en una sola PR.

---

## Tecnología Obligatoria

> **Cómo leer las versiones (2026-11-03):** las tablas de abajo dan la versión **mayor y menor** (por ejemplo, React 19.3). La versión **exacta**, hasta el último número, está fijada en `be/pyproject.toml` y `fe/package.json`, que son la fuente real. Dependabot las sube el día 1 y el 15 de cada mes y solo edita esos archivos; si este documento copiara el número exacto, se desactualizaría en cada subida. Se actualiza esta tabla solo cuando cambia la versión mayor o menor.

### Backend

| Tecnología   | Versión (mayor.menor) |
| ------------ | ---------------- |
| Python       | 3.12              |
| FastAPI      | 0.x (exacta en `be/pyproject.toml`) |
| SQLAlchemy   | 2.1 (ORM 2.0, no el estilo 1.x) |
| Alembic      | 1.20 (migraciones versionadas — nunca `Base.metadata.create_all()`)|
| Pydantic     | 2.14 |
| fpdf2        | 2.8 (genera los PDF del historial de la agenda, issue #480, y del desempeño semanal, issue #558; licencia LGPL-3.0, se usa como librería sin modificarla; puro Python, no necesita programas de sistema en Windows) |
| pypdf        | 6.21 (solo en las pruebas: lee el PDF generado para comprobar su contenido; licencia BSD-3-Clause) |

No se permiten versiones sin fijar (`>=`, `~=`, sin versión) en `pyproject.toml` — toda dependencia va con `==`, reforzado además por `uv.lock`, que fija también las dependencias transitivas.

### Frontend

| Tecnología      | Versión (mayor.menor) |
| ---------------- | --------------- |
| React            | 19.3 |
| TypeScript       | 5.9 (modo estricto)|
| Vite             | 7.3 |
| TailwindCSS      | 4.3 |
| React Router     | 7.18 |
| react-markdown   | 10.1 |
| recharts         | 3.10 (solo la gráfica de desempeño semanal; se carga bajo demanda con `React.lazy`, nunca en la primera carga; licencia MIT) |

### Base de datos

PostgreSQL 17 (imagen `postgres:17-alpine`), corriendo en Docker. No se usa SQLite ni MySQL en ningún entorno, ni siquiera para pruebas locales.

---

## Herramientas de Desarrollo

- **Python**: entorno virtual (`.venv`), nunca instalar paquetes en el Python global de la máquina.
- **Node.js**: **pnpm** como único gestor de paquetes del frontend — no `npm install` ni `yarn add`. La versión de pnpm queda fijada en `packageManager` dentro de `package.json`.
- **Linting y formato backend**: `ruff` (lint + formato en una sola herramienta). Las reglas de lint están fijadas a mano en `be/pyproject.toml` (`[tool.ruff.lint]`), porque ruff cambia su lista por defecto entre versiones; para exigir reglas nuevas se agregan ahí en una tarjeta aparte.
- **Linting y formato frontend**: `eslint` + `prettier`.
- **Testing**: `pytest` en el backend, `vitest` en el frontend — toda funcionalidad nueva debe llevar sus pruebas correspondientes antes de considerarse terminada.

---

## Diseño Visual

- Prohibidos los degradados (`gradient`) en la interfaz — colores sólidos únicamente. Para oscurecer una foto de fondo y dar contraste al texto encima, se usa una capa de un solo color con opacidad (ej. `bg-accent-950/75`, como en el hero de la landing), nunca un degradado.
- Tipografía exclusivamente sans-serif. Dos fuentes, ambas de Google Fonts: **Outfit** para títulos (`h1`–`h3`, aplicada sola desde `fe/src/index.css`; en otro elemento, clase `font-display`) e **Inter** para todo lo demás (texto, formularios, tablas, botones). No se agregan más fuentes.
- Los botones de acción principal van alineados a la derecha en formularios y modales.
- Iconografía: únicamente `lucide-react` — no mezclar con otras librerías de íconos. Tampoco se usan emojis ni caracteres sueltos (📬, ↗, ✓…) como íconos en la interfaz, y se importa cada ícono con su nombre actual en lucide (ej. `LoaderCircle`, no el alias viejo `Loader2`).
- Imágenes en `fe/public/`: solo las que usa el código (una imagen sin referencias se borra; queda en el historial de git). Las fotos de fondo van a máximo 1920 px de ancho y comprimidas (JPEG calidad ~75): una pantalla Full HD no muestra más, y el resto solo alarga la carga.
- Ícono por concepto (un concepto = un ícono en toda la app; si aparece un concepto nuevo, se agrega a esta tabla):

  | Concepto | Ícono (`lucide-react`) |
  | --- | --- |
  | Roles | Residente `UserRound` · Reciclador `HardHat` · Admin. de Conjunto `UserCog` · Administrador `ShieldUser` (definidos solo en `fe/src/config/roleTheme.ts`) |
  | Conjunto residencial | `Building` |
  | Activar / desactivar | Usuario `UserCheck` / `UserX` · Punto de acopio `MapPin` / `MapPinOff` |
  | Mensajes | Éxito `BadgeCheck` · Error `OctagonX` · Aviso `TriangleAlert` · Info `Info` |
  | Comunicados / novedades | `Megaphone` / `Newspaper` |
  | Puntos de acopio / directorio / localidad | `Warehouse` / `MapPinned` / `Map` (una dirección concreta sigue con `MapPin`) |
  | Seguridad (cambiar contraseña) | `KeyRound` |
  | Semáforo de auditoría | Caritas `Smile` / `Meh` / `Frown` (definidas en `fe/src/config/nivelesDesempeno.ts`) |
  | Desempeño semanal (menú y gráfica) | `ChartColumn` · alternar gráfica/tabla `Table2` / lista `List` |
  | Archivar un tema / devolverlo a "Por tratar" (Agenda) | `Archive` / `Undo2` |
  | Ampliar una imagen / abrir algo en otra pestaña | `Maximize2` / `ExternalLink` (siempre dentro de `InsigniaAccionImagen` o junto al texto del enlace) |

- Tamaño de íconos: solo 5, con una clase por uso definida en `fe/src/index.css` — nunca `h-*`/`w-*` sueltos en un ícono:

  | Clase | Tamaño | Uso |
  | --- | --- | --- |
  | `icon-sm` | 14 px | Dentro de texto pequeño: chips, flechas de tabla, requisitos de contraseña |
  | `icon-md` | 16 px | Botones, campos, junto al título de una sección |
  | `icon-lg` | 20 px | Navegación (sidebar), campana, mensajes, caritas del semáforo, modales |
  | `icon-xl` | 32 px | Destacado: encabezado del dashboard, estado vacío, tarjetas de rol del registro |
  | `icon-deco` | 80 px | Decorativo: marca de agua del dashboard |

- Pantallas grandes (televisor 4K de la feria): el tamaño base de la letra (`html` en `fe/src/index.css`) crece con el ancho de la pantalla: 16 px hasta 1536 px, 20 px a 1920 px y 40 px a 3840 px. Por eso todo tamaño se escribe en `rem` (o con las clases de Tailwind, que ya lo son): un valor en px fijo (`text-[11px]`, `min-w-[820px]`) no crece y se ve diminuto en el televisor. Si un componente dibuja en px (por ejemplo un SVG de recharts), multiplica sus medidas por `parseFloat(getComputedStyle(document.documentElement).fontSize) / 16` (ver `GraficaDesempenoSemanal.tsx`). El ancho de las páginas ya no se decide página por página: hay **tres anchos fijos** en `fe/src/config/anchoPagina.ts` (`ANCHO_PAGINA`): `normal` (todo el área disponible, 80 rem; paneles, listas, catálogos y administración), `lectura` (48 rem; listas cortas de avisos) y `formulario` (32 rem; formularios cortos). Una página no escribe su propio `max-w-*` ni relleno lateral (`px-*`, `sm:p-*`) en su contenedor: el margen lo pone solo el `AppShell`. Los argumentos están en `docs/gestion-proyecto/decision-ancho-de-paginas.md` y una prueba (`anchoPaginas.test.ts`) cuida que se cumpla.
- Animación de íconos (estándar de **3**, issue #502): solo se anima lo que se puede tocar o lo que aparece para avisar; nunca un ícono de adorno. Clases de `fe/src/index.css`, todas dentro de `prefers-reduced-motion: no-preference`:

  | Caso | Clase | Cuándo se mueve |
  | --- | --- | --- |
  | Algo que se toca: ítem del menú, botón, enlace o etiqueta con ícono (incluidas las caritas del semáforo) | `icon-draw` (se redibuja el trazo) | al pasar el mouse **o enfocar con el teclado**; es la única que se usa en lo tocable |
  | Mensaje bueno o neutro que aparece (éxito, información) | `icon-appear icon-hop` (salta) | una vez, al aparecer |
  | Mensaje que pide atención (error, advertencia) | `icon-appear icon-shake` (sacude) | una vez, al aparecer |

  `icon-hop` e `icon-shake` siempre van junto a `icon-appear` (no reaccionan al mouse: un ícono dentro de un botón usa `icon-draw`). Antes también existían `icon-ring` e `icon-nudge`; se borraron. Con "reducir movimiento" ningún ícono se mueve y las flechas de los acordeones cambian de posición sin girar. **Excepción documentada:** el `Spinner` (`animate-spin`) sigue girando: no se cuenta como ícono animado sino como indicador de que algo está cargando, y sin el giro dejaría de significar "trabajando". Una prueba (`fe/src/__tests__/lib/animacionesIconos.test.ts`) falla si aparece `icon-ring` o `icon-nudge`, un `icon-hop` o `icon-shake` sin `icon-appear`, un `icon-draw` junto a `icon-appear`, o una animación de ícono fuera de `no-preference`. No se agregan librerías de animación.
- Elementos clicables (issue #501): lo que se puede tocar se reconoce **a simple vista, sin pasar el mouse** (en celular no hay mouse). El `cursor-pointer` solo ayuda a quien tiene mouse; esta regla es la que cuenta:

  | Elemento | Cómo se ve | Cómo se escribe |
  | --- | --- | --- |
  | Botón primario | Fondo verde sólido, texto blanco | `Button` (variante `primary`) |
  | Botón secundario / de acción | Borde visible, nunca solo un fondo suave: un fondo suave sin borde se lee como una etiqueta o chip | `Button` (variante `secondary`) o, en un botón hecho a mano, `border` del mismo tono (`border-accent-300`, `border-red-300` o, para el gris, `border-edge dark:border-night-edge`) |
  | Botón peligroso | Rojo (sólido o con borde rojo) | `Button` (variante `danger`) |
  | Enlace dentro de un texto, o suelto como texto | Verde de marca, negrita y **subrayado siempre visible** (el color solo no basta: no se distingue del texto vecino). Si abre otra pestaña lleva `ExternalLink` | clase `link-text` (definida en `fe/src/index.css`) |
  | Enlaces de pie de página | Gris con subrayado | `underline underline-offset-2` junto al gris del pie |
  | Nombre de una fila que abre su detalle | Subrayado visible (`decoration-gray-500`, no `gray-200`: casi no se ve) | clases a mano, con `focus-ring` |
  | Botón de solo ícono | Nombre accesible **y** pista visible: `aria-label` y `title` con el mismo texto. Si hay espacio, mejor con texto | `aria-label` + `title` |
  | Imagen que abre algo (ampliar, abrir en otra pestaña) | Insignia en la esquina, siempre visible (no solo al pasar el mouse) | `InsigniaAccionImagen` dentro de un control `relative` |
  | Lo que no se toca | No imita nada de lo anterior: sin subrayado, sin borde de botón, sin color de enlace | |

  Foco con teclado: todo control con foco propio usa la clase `focus-ring` (anillo verde sólido de 2 px, solo con `:focus-visible`). Nunca se quita el contorno (`outline-none`) sin ese reemplazo; un control sin clases de foco conserva el contorno por defecto del navegador, que sí se ve. Todo botón, `<select>` y `<label>` clicable lleva además `cursor-pointer`. Lo comprueba `fe/src/__tests__/lib/elementosClicables.test.ts` (botones de solo ícono sin `title`, enlaces de texto sin subrayado, imágenes clicables sin insignia).
- Paleta de marca: "Páramo Fresco" en modo claro y "Bosque Andino" en modo oscuro, definidas como escala `green-*` (y `accent-*` apuntando a ella) en `fe/src/index.css`. Los botones principales usan `accent-*`; no hay un color de acento distinto (ni azul ni amarillo) para botones. Los paneles no llevan imagen de fondo: el área de contenido es un color sólido.
- Tema oscuro (issue #503): las capas son verdes casi neutros, cada una un paso más clara que la de abajo (`night-base` < `night-page` < `night-inset` < `night-card` < `night-panel`), y la separación la da el borde `night-line`. El **único acento** es el menta (`accent-300`, el verde claro del botón "Unirse a VerdeApp"): botones principales, ítem activo del menú, enlaces, números destacados y foco. **Los 4 roles comparten ese acento**: el rol se distingue por su ícono y su nombre, no por color (`fe/src/config/roleTheme.ts`, los 4 apuntan a las mismas constantes). Nada de verde oscuro sobre verde oscuro: un botón sólido nuevo lleva siempre su pareja menta.
- Texto secundario y metadatos (fechas, contadores, ayudas): siempre `text-gray-500 dark:text-gray-400`. Nunca `text-gray-400` en modo claro (2.60 de contraste) ni la pareja invertida `text-gray-400 dark:text-gray-500`, que falla en los dos modos. Verde de marca como texto pequeño sobre fondo verde oscuro: `accent-300` (ver `docs/gestion-proyecto/auditoria-contraste-paleta-nueva.md`).
- Ningún color escrito a mano en componentes (`bg-[#12231a]`, `border-[#23392b]`…): todo color sale de un token de `fe/src/index.css`. Las superficies del modo oscuro tienen su propio token (siempre con `dark:`):

  | Token | Uso |
  | --- | --- |
  | `night-base` | Fondo raíz y sidebar (la capa más baja: auth, legales, shell, footer) |
  | `night-page` | Fondo del área de contenido de los paneles y del encabezado |
  | `night-card` | Tarjetas |
  | `night-panel` | Modales y tarjeta de login (encima de las tarjetas) |
  | `night-inset` | Zonas hundidas: filas en hover, botón secundario |
  | `night-field` | Campos de formulario |
  | `night-line` | Bordes decorativos (tarjetas, divisiones): 1.94:1 sobre la tarjeta |
  | `night-edge` | Borde de los controles: campos y botones secundarios (3.3:1 sobre el campo) |
  | `night-hover` | Fondo al pasar el mouse |

- Equivalencias entre el modo claro y el oscuro (issue #503). **Esta tabla es la única fuente**: cada papel tiene el mismo trabajo en los dos modos, y un componente nuevo copia la pareja de aquí en vez de inventar la suya. Los contrastes están medidos (ver `docs/gestion-proyecto/auditoria-coherencia-temas.md`):

  | Papel | Modo claro | Modo oscuro |
  | --- | --- | --- |
  | Fondo raíz (auth, legales, footer) y sidebar | `bg-gray-50`; el sidebar es `bg-accent-900` (verde de marca) | `night-base` (sidebar y raíz, la capa más baja) |
  | Fondo del área de contenido y encabezado | `bg-gray-200` (contenido), `bg-white` (encabezado) | `night-page` (los dos; los separa el borde `night-line`) |
  | Tarjeta | `bg-white` | `night-card` |
  | Modal, barra fija | `bg-white` | `night-panel` |
  | Zona hundida, botón secundario | `bg-white` / `bg-gray-100` | `night-inset` |
  | Campo de formulario | `bg-white` | `night-field` |
  | Fondo al pasar el mouse | `hover:bg-gray-50` | `night-hover` |
  | Borde decorativo | `border-gray-100` o `border-gray-200` | `night-line` |
  | Separador entre filas de una lista o tabla (`divide-y`) y línea sobre un pie (`border-t`) | `divide-gray-200` / `border-gray-200` | `dark:divide-night-line` / `dark:border-night-line`. No se usan `gray-50` (en claro casi no se ve) ni `gray-800` (en oscuro no se ve y no es un token `night-*`); issue #616 |
  | **Borde de un control** (campo, botón secundario) | `border-edge` | `dark:border-night-edge` |
  | Texto principal | `text-gray-900` | `dark:text-white` o `dark:text-gray-100` |
  | Texto secundario | `text-gray-500` | `dark:text-gray-400` |
  | Acción principal (botón sólido) | `bg-accent-700` con texto blanco | **menta**: `dark:bg-accent-300 dark:text-accent-950 dark:hover:bg-accent-200` (8.6:1 sobre la tarjeta; antes el botón era verde oscuro, 1.86:1 sobre la tarjeta) |
  | Ítem activo del menú, números destacados | `bg-white/15 text-white` en el sidebar verde | `dark:bg-accent-300/15 dark:text-accent-300` |
  | Enlace de texto | `accent-700` (`link-text`) | `accent-400` (`link-text`) |
  | Éxito, aviso, error | texto `-700` sobre fondo `-50` (`accent`, `amber`, `red`) | fondo translúcido `-400/10`, borde `-300/30` o `-400/30`, texto `amber-200` (aviso), `red-300` (error) o `accent-300` (éxito); nunca `-900` sólido (se ve marrón o sucio sobre el verde) |
  | Colores de categoría (tipo de comunicado, de aviso, auditoría: `purple`, `indigo`, `teal`) | texto `-700` sobre fondo `-50` | fondo translúcido `-400/10` y texto `-300` |

  Los colores de categoría son los únicos de Tailwind concretos permitidos fuera de los estados de éxito, aviso y error: cada categoría usa siempre su pareja de arriba y nunca el color solo (siempre lleva texto o ícono). Una prueba (`fe/src/__tests__/lib/coloresTemas.test.ts`) falla si aparece un color escrito a mano (`bg-[#…]`), un `text-gray-400` sin su pareja oscura, o un `border-gray-300` suelto en lugar de `border-edge`.
- Logo: solo en SVG, en `fe/public/logos/` (`logo`, `logo-white`, `logo-mark`, `logo-mark-white` y `favicon`). Ninguna página pone un `<img>` del logo a mano: siempre se usa el componente `BrandLogo` (`fe/src/components/ui/BrandLogo.tsx`), que elige la versión según el fondo y el modo oscuro. No se usan PNG ni íconos de `lucide-react` (como `Leaf`) en lugar del logo.
- El color de marca (`accent-*`) es el único acento de color permitido en componentes reutilizables; los colores por rol (sidebar, badges) viven centralizados en `fe/src/config/roleTheme.ts`, no repetidos por archivo.
- Todo componente nuevo debe soportar modo claro y modo oscuro (`dark:`) desde el primer commit — no se agrega como una tarea aparte después.
- Modal o página (issue #621, `docs/gestion-proyecto/decision-modal-o-pagina.md`): **modal** para una tarea corta que se hace sin salir de donde se estaba (mirar una ficha, un formulario corto, una confirmación); **página** para una lista que se recorre, para un trabajo largo o para algo a lo que hay que poder volver o enlazar. Un modal nunca es más alto que la pantalla (scroll interno y X fija en `Modal.tsx`), uno sobre otro es excepcional (`layer="stacked"`, máximo dos capas) y no se usan paneles laterales.

- **Escala tipográfica (issue #633).** Siempre en Inter, con el mismo peso por nivel; **Outfit** solo en `h1` a `h3` (los títulos de bloque no la usan). Los niveles de encabezado no saltan (no se pasa de `h2` a `h4`) y cada página tiene un solo `h1`. Todo en `rem`, como pide la regla de pantallas grandes:

  | Nivel | Tamaño | Cómo se escribe | Ejemplo |
  | --- | --- | --- | --- |
  | Título de página | 24 px | `h1` con `text-2xl font-bold` | "Comunicados" |
  | Título de tarjeta | 18 px | `h2` con `text-lg font-bold` | "Avisos de este conjunto" |
  | Nombre de un ítem | 16 px | `h3` con `text-base font-bold` | El nombre de un conjunto |
  | Título de un bloque | 14 px | `h3`/`h4` con `text-sm font-bold` (Inter) | "Cobertura" |
  | Texto normal | 14 px | `text-sm` | Un comunicado, una fila |
  | **Texto de ayuda** (descripciones, fechas, avisos, "Creado el…") | **12 px** | `text-xs` | La línea gris bajo un título |
  | Pastillas y contadores (etiquetas cortas de una o dos palabras, números) | **mínimo 11 px** | `text-[0.6875rem]` | "Urgente", el 3 de una pestaña |

  El **título de una ventana** (modal) o de una tarjeta mide 18 px (`h2` con `text-lg font-bold`), también en las ventanas de ingreso, registro e invitación. **Peso (grosor) de la letra, uno por función (issue #640):** títulos `font-bold`; botones y pastillas `font-semibold` (el componente `Button` ya es `font-semibold`, con esquina `rounded-lg` de 8 px, igual que `InputField`); nombres de campo (`label`) `font-medium`; texto corriente sin peso. No se usa `font-extrabold` fuera de la portada.
  Nada mide menos de 11 px: no existe `text-[0.625rem]` (10 px) en la app. Una frase que se lee es texto de ayuda y mide 12 px; solo una etiqueta corta o un número puede medir 11 px. Una prueba (`tamanoTexto.test.ts`) falla si reaparece texto de 10 px. Otra prueba (`estandaresVisuales.test.ts`, issue #640) recorre TODOS los archivos de `fe/src/` y cuenta los botones primarios, secundarios o de peligro escritos a mano (deben usar `Button`), los íconos con medida suelta, el texto de 3xl o más fuera de la portada y los textos legales, y los títulos con un tamaño que no es el de su nivel: su conteo permitido es 0 desde el cierre del issue #640: cualquier caso nuevo hace fallar la prueba. El avance por pantalla está en `docs/gestion-proyecto/lista-verificacion-estandares-visuales.md`.
- **Dimensiones (issue #641):** (1) Una **tarjeta de página** (caja con borde, fondo de tarjeta y esquina de 16 px, `rounded-2xl`) lleva **24 px de relleno** (`p-6`). Más compactos, a propósito: un **elemento de una lista** (por ejemplo, un módulo o una novedad dentro de una lista) lleva 16 px (`p-4`), y una **barra de filtros o de pestañas** 12 px (`p-3`); las cajas internas de una tarjeta usan `rounded-xl` (12 px). Un **contenedor de lista** (filas separadas por una línea, con su paginación al pie) no lleva relleno propio: cada fila lleva 20 px a los lados y 16 px arriba y abajo (`px-5 py-4`) y las pestañas del contenedor, 20 px de margen (`mx-5`). (2) Los **bloques de una página** (tarjetas y listas, una debajo de otra) se separan **24 px** (`space-y-6` en el contenedor de la página); Aprende a reciclar conserva su separación propia, con su estilo documentado. (3) Un **campo de formulario** lleva esquina de **8 px** (`rounded-lg`), igual que `InputField` y `Button`, y 10 px de relleno vertical (`py-2.5`); solo los filtros compactos usan menos. (4) Una **ventana** (`Modal`) tiene tres anchos: el normal (`max-w-md`, para confirmaciones y formularios cortos), `wide` (`max-w-xl`, para formularios con más campos, como el registro) y `extraWide` (`max-w-5xl`, solo para el editor de contenido educativo, con su vista previa al lado). La prueba `estandaresVisuales.test.ts` cuenta las tarjetas con 20 px de relleno, los campos con esquina de 12 px y las páginas con otra separación.
- **Botones (issue #640):** toda acción (guardar, cancelar, archivar, eliminar, descargar) usa el componente `Button` (`fe/src/components/ui/Button.tsx`), nunca un `<button>` con clases a mano. Variantes: `primary` (verde sólido), `secondary` (borde gris), `danger` (rojo sólido) y `dangerOutline` (borde rojo, para una acción destructiva de menos peso junto a otra principal); tamaños `sm` (letra de 12 px), `md` (14 px) y `lg`; esquina de 8 px y letra semigruesa en todos. `Button` acepta los atributos normales de un botón (`aria-*`, `title`, `onClick`, `disabled`, `id`…) pero **no** `className` ni `style`: el aspecto sale solo de `variant` y `size`, y un botón que ocupa todo el ancho usa `fullWidth`. Quedan fuera de la regla, porque no son acciones: las pestañas, los chips de filtro y las tarjetas que hacen de botón (su estilo cambia según estén elegidos) y los botones de solo ícono, que llevan `aria-label` o `title`. La prueba `estandaresVisuales.test.ts` cuenta los botones que no cumplen.
- **Alineación del contenido (issue #640):** tres reglas. (1) Un formulario o una lista **de la app** (nuevo comunicado, editar, filtros, listas) lleva el título, el subtítulo y los campos **a la izquierda**, con el nombre de cada campo arriba de él; los botones de acción van a la derecha, o a todo el ancho en una tarjeta angosta. (2) Un **mensaje de resultado** —un ícono, una frase y uno o dos botones: éxito, error, "enlace inválido", verificar correo, confirmar una eliminación— va **centrado** (`ConfirmModal`, `ErrorFallback`, los estados de `VerifyEmailPage` y `AceptarInvitacionPage`; en `AuthLayout` con la propiedad `centered`). (3) Las **ventanas de cuenta** (ingreso, registro y aceptar invitación) **conservan su encabezado centrado** —logo, título y subtítulo—, con la flecha de volver del registro en la esquina y los campos con su nombre a la izquierda. La alineación no cambia con el tamaño de la pantalla. Por qué: el texto de varias líneas se lee mejor alineado a la izquierda y lo breve que se ve de un vistazo se centra; es la práctica común (Material Design usa título e ícono a la izquierda y botones a la derecha por defecto). Las tres páginas "hermanas" (recuperar, restablecer y verificar correo) llevan el mismo título de 18 px.
- **Alineación de las ventanas de cuenta: pendiente de revisar (issue #640, 2026-11-11).** Se probó alinear a la izquierda el encabezado del registro, del ingreso y de la invitación, y se descartó: con el logo y la flecha de volver en la misma fila, el logo y el título quedaban desordenados y corridos, y no estaba bien; quitar el logo y poner la flecha junto al título dejó el título corrido respecto al subtítulo. Se volvió al encabezado centrado de siempre. Hoy hay una incoherencia a la vista: el resto de la app va alineado a la izquierda y estas ventanas van centradas. **Para el futuro:** se resuelve junto con el diseño y el uso del logo (completo o solo el símbolo, y dónde va) en un issue de diseño aparte, con más cuidado; cualquier cambio del encabezado de una ventana de cuenta debe revisar antes cómo se ve junto a la flecha de volver.
- **Fechas escritas (issue #633):** siguen el **idioma de la app**, no el del navegador. Español: día/mes/año (29/10/2026); inglés: mes/día/año (10/29/2026). Se escriben siempre con `lib/dateFormat.ts` (`formatearFechaUTC`, `formatearFechaCreacion`), nunca con `toLocaleDateString()` suelto. Debajo de cada campo de fecha (`<input type="date">`, que el navegador dibuja con su propio idioma) va el componente `FechaEnPalabras`, que escribe la fecha elegida con el mes en palabras ("Expira el 20 de noviembre de 2026"): así no hay duda entre día y mes en ningún navegador.
- **Color con significado (issue #633):** el **rojo** es solo para peligro y error (borrar, fallo, "Urgente"). Un contador de avisos sin leer va en **ámbar**, no en rojo, porque pide atención pero no es un error. Las notas de la Agenda son de una sola tinta neutra: un color que no significa nada no se usa (la idea de teñirlas según su antigüedad está en `docs/gestion-proyecto/idea-color-por-antiguedad-agenda.md`).
- **Listas de registros (issues #595 y #632):** una lista es **un contenedor** con las filas separadas por una línea y la **paginación al pie, siempre visible** (aunque solo haya una página: "Mostrando 1–2 de 2" con las flechas apagadas), igual que en todas las vistas. Las tarjetas sueltas se reservan para piezas grandes y distintas entre sí (el tablero de notas de la Agenda, los paneles). Las listas que pueden crecer se piden al servidor de 10 en 10 (`limit`/`offset`, respuesta `{items, total}`).
- **Botones (issue #633):** una acción para **agregar** algo va arriba, junto al título de la lista o de la página; lo **peligroso** va abajo y apartado, nunca pegado a una acción normal. En una tarjeta angosta (menos de 36 rem de ancho de la tarjeta, no de la ventana) el botón del encabezado baja debajo del texto, a todo el ancho; no se deja que parta su propio nombre en dos líneas.
- **Acciones por fila (issue #633):** una o dos acciones van como **íconos visibles**; tres o más, en un **menú de tres puntos** (`MenuAcciones`).
- **Pestañas (issues #595 y #632).** Tres usos, cada uno con su forma (componente `Pestanas`):
  - **Subrayadas** (una línea bajo la activa) para cambiar el contenido de UNA tarjeta: Vigentes / Vencidos, Resumen / Avisos / Recicladores, las pestañas de Soporte técnico. Miden lo que su texto (desde 640 px de ventana) y llevan 20 px de margen a cada lado.
  - **Subrayadas y repartidas** (`repartidas`: se reparten el ancho en partes iguales, también en ventana ancha) solo para elegir **conjunto** (Desempeño, Agenda): son nombres largos y de cantidad variable. Van al tope de la tarjeta, con 20 px de espacio arriba y a los lados. Con un solo conjunto no se muestran.
  - **Burbujas** (`compacta`) para filtrar o alternar vistas del mismo contenido (Por tratar / Archivadas, filtros de Solicitudes). Llevan espacio debajo para no quedar pegadas a lo que sigue.
  - Un conjunto no se elige con un `<select>` suelto dentro del contenedor: se probó y se descartó (corta el nombre y se ve mal en pantalla angosta).
- **Ancho por rol (issue #632):** Soporte técnico es una sola página, pero cada rol la tiene junto a una pantalla distinta del menú: para el Admin de Conjunto usa `normal` (80 rem, como su Comunicados y su Agenda) y para el Residente y el Reciclador `lectura` (48 rem, como su Comunicados). Ver `docs/gestion-proyecto/decision-ancho-de-paginas.md`.
- **El ancho no debe saltar:** el área principal reserva siempre el espacio de la barra de scroll (`scrollbar-gutter: stable` en `AppShell`), para que una pestaña más alta que la pantalla no achique la tarjeta solo en esa pestaña.

---

## Idioma

- **Código** (variables, funciones, nombres de archivo, rutas de API): en **inglés**.
- **Comentarios y documentación** (este documento incluido, los RFs, las HUs, los mensajes de commit descriptivos): en **español**.
- Los mensajes de error mostrados al usuario final: en español, sin importar el idioma del código que los genera.
- **La interfaz** está en español (por defecto) e inglés, y **todo lo que se escribe en pantalla sigue el idioma elegido en la app**, incluidas las fechas (ver "Fechas escritas" en Diseño Visual), no el idioma del navegador.

---

## Contexto Educativo

- VerdeApp es un proyecto de formación del programa ADSO del SENA — las decisiones técnicas priorizan que el equipo aprenda buenas prácticas reales, no solo que "funcione".
- Versionamiento de API bajo el prefijo `/api/v1/` en todos los endpoints nuevos.
- El proyecto corre pensado para desarrollo local y sustentación (Docker Compose) — no hay todavía un entorno de producción real desplegado, y ninguna decisión debe asumir que lo hay.
- Los commits siguen la convención de [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, etc.), y todo cambio nuevo se hace en su propia rama partiendo de `develop` — nunca directo sobre `develop` o `main`.

---

## Seguridad

- Autenticación JWT sin estado (*stateless*), contraseñas con `bcrypt` — nunca en texto plano, ni en la base de datos ni en logs.
- Toda credencial (contraseñas de base de datos, `SECRET_KEY`, credenciales de correo) vive en `.env`, nunca en el código ni en el repositorio. `.env.example` es obligatorio y debe mantenerse con valores de ejemplo funcionales (no reales).
- CORS restringido explícitamente al dominio del frontend — nunca `allow_origins=["*"]`.
- Límite de intentos de inicio de sesión (rate limiting) para mitigar fuerza bruta.
- Toda regla de un formulario se repite en el backend (schema de Pydantic): el frontend solo guía al usuario, el backend es el que protege, porque cualquiera puede llamar a la API sin pasar por el formulario. Todo campo de texto tiene un máximo igual al tamaño de su columna en la base de datos, en los dos lados (`maxLength` en el input, validación en el schema), para que un texto largo se rechace con 422 y nunca llegue a la base de datos como un error 500. Nombres y apellidos: solo letras con espacio, apóstrofe, punto o guion (`fe/src/lib/validacion.ts` / `be/app/schemas/user.py`).
- Ningún enlace de la aplicación muestra un correo electrónico — por pedido del profesor, por seguridad: los enlaces llevan al formulario de contacto (`/contacto`). **Única excepción:** la pantalla para pedir la cuenta de Administrador de Conjunto (registro y "Solicitar otro conjunto"), que muestra `administradorverdeapp@gmail.com` porque pide dos documentos adjuntos y el formulario no puede llevarlos (issue #457, `fe/src/config/solicitudAdminConjunto.ts`). Es una cuenta dedicada solo a ese trámite. *Pendiente: confirmar con el profesor y anotar aquí la fecha.*
- Ningún endpoint que modifique o consulte datos sensibles queda sin autenticación — cualquier excepción debe justificarse explícitamente en el código, como ya se documentó en el incidente de `admin.py` corregido en este proyecto.
