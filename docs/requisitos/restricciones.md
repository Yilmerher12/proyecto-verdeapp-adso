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

### Backend

| Tecnología   | Versión fijada  |
| ------------ | ---------------- |
| Python       | 3.12              |
| FastAPI      | 0.142.2           |
| SQLAlchemy   | 2.1.3 (ORM 2.0, no el estilo 1.x)|
| Alembic      | 1.20.0 (migraciones versionadas — nunca `Base.metadata.create_all()`)|
| Pydantic     | 2.13.5             |
| fpdf2        | 2.8.9 (genera el PDF del historial de la agenda, issue #480; licencia LGPL-3.0, se usa como librería sin modificarla; puro Python, no necesita programas de sistema en Windows) |
| pypdf        | 6.21.1 (solo en las pruebas: lee el PDF generado para comprobar su contenido; licencia BSD-3-Clause) |

No se permiten versiones sin fijar (`>=`, `~=`, sin versión) en `pyproject.toml` — toda dependencia va con `==`, reforzado además por `uv.lock`, que fija también las dependencias transitivas.

### Frontend

| Tecnología      | Versión fijada |
| ---------------- | --------------- |
| React            | 19.3.0           |
| TypeScript       | 5.9.3 (modo estricto)|
| Vite             | 7.3.6             |
| TailwindCSS      | 4.3.3             |
| React Router     | 7.18.4            |
| react-markdown   | 10.1.0            |
| recharts         | 3.10.1 (solo la gráfica de desempeño semanal; se carga bajo demanda con `React.lazy`, nunca en la primera carga; licencia MIT) |

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
  | Ampliar una imagen / abrir algo en otra pestaña | `Maximize2` / `ExternalLink` (siempre dentro de `InsigniaAccionImagen` o junto al texto del enlace) |

- Tamaño de íconos: solo 5, con una clase por uso definida en `fe/src/index.css` — nunca `h-*`/`w-*` sueltos en un ícono:

  | Clase | Tamaño | Uso |
  | --- | --- | --- |
  | `icon-sm` | 14 px | Dentro de texto pequeño: chips, flechas de tabla, requisitos de contraseña |
  | `icon-md` | 16 px | Botones, campos, junto al título de una sección |
  | `icon-lg` | 20 px | Navegación (sidebar), campana, mensajes, caritas del semáforo, modales |
  | `icon-xl` | 32 px | Destacado: encabezado del dashboard, estado vacío, tarjetas de rol del registro |
  | `icon-deco` | 80 px | Decorativo: marca de agua del dashboard |

- Animación de íconos: solo en lo que se puede tocar (sidebar, botones, selector del semáforo) o en lo que aparece para avisar (mensajes). Se usan las clases `icon-draw`, `icon-hop`, `icon-shake`, `icon-ring`, `icon-nudge` y `icon-appear` de `fe/src/index.css`, que ya respetan `prefers-reduced-motion`. No se agregan librerías de animación.
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
- Texto secundario y metadatos (fechas, contadores, ayudas): siempre `text-gray-500 dark:text-gray-400`. Nunca `text-gray-400` en modo claro (2.60 de contraste) ni la pareja invertida `text-gray-400 dark:text-gray-500`, que falla en los dos modos. Verde de marca como texto pequeño sobre fondo verde oscuro: `accent-300` (ver `docs/gestion-proyecto/auditoria-contraste-paleta-nueva.md`).
- Ningún color escrito a mano en componentes (`bg-[#12231a]`, `border-[#23392b]`…): todo color sale de un token de `fe/src/index.css`. Las superficies del modo oscuro tienen su propio token (siempre con `dark:`):

  | Token | Uso |
  | --- | --- |
  | `night-base` | Fondo raíz (auth, legales, shell, footer) |
  | `night-page` | Fondo del área de contenido de los paneles |
  | `night-card` | Tarjetas |
  | `night-panel` | Modales, tarjeta de login, barras fijas |
  | `night-inset` | Zonas hundidas: filas en hover, botón secundario |
  | `night-field` | Campos de formulario |
  | `night-line` | Bordes decorativos (tarjetas, divisiones) |
  | `night-edge` | Borde de los controles: campos y botones secundarios (3.4:1 sobre el campo) |
  | `night-hover` | Fondo al pasar el mouse |

- Equivalencias entre el modo claro y el oscuro (issue #503). **Esta tabla es la única fuente**: cada papel tiene el mismo trabajo en los dos modos, y un componente nuevo copia la pareja de aquí en vez de inventar la suya. Los contrastes están medidos (ver `docs/gestion-proyecto/auditoria-coherencia-temas.md`):

  | Papel | Modo claro | Modo oscuro |
  | --- | --- | --- |
  | Fondo raíz (auth, legales, footer) | `bg-gray-50` | `night-base` |
  | Fondo del área de contenido | `bg-gray-200` | `night-page` |
  | Tarjeta | `bg-white` | `night-card` |
  | Modal, panel lateral, barra fija | `bg-white` | `night-panel` |
  | Zona hundida, botón secundario | `bg-white` / `bg-gray-100` | `night-inset` |
  | Campo de formulario | `bg-white` | `night-field` |
  | Fondo al pasar el mouse | `hover:bg-gray-50` | `night-hover` |
  | Borde decorativo | `border-gray-100` o `border-gray-200` | `night-line` |
  | **Borde de un control** (campo, botón secundario) | `border-edge` | `dark:border-night-edge` |
  | Texto principal | `text-gray-900` | `dark:text-white` o `dark:text-gray-100` |
  | Texto secundario | `text-gray-500` | `dark:text-gray-400` |
  | Acción principal | `bg-accent-700` con texto blanco | igual (la escala `accent-*` cambia sola en `.dark`) |
  | Enlace de texto | `accent-700` (`link-text`) | `accent-400` (`link-text`) |
  | Éxito, aviso, error | texto `-700` sobre fondo `-50` (`green`, `amber`, `red`) | texto `-400` sobre fondo `-900/20` |
  | Colores de categoría (tipo de comunicado, de aviso, auditoría: `purple`, `indigo`, `teal`) | texto `-700` sobre fondo `-50` | texto `-400` sobre fondo `-900/20` |

  Los colores de categoría son los únicos de Tailwind concretos permitidos fuera de los estados de éxito, aviso y error: cada categoría usa siempre su pareja de arriba y nunca el color solo (siempre lleva texto o ícono). Una prueba (`fe/src/__tests__/lib/coloresTemas.test.ts`) falla si aparece un color escrito a mano (`bg-[#…]`), un `text-gray-400` sin su pareja oscura, o un `border-gray-300` suelto en lugar de `border-edge`.
- Logo: solo en SVG, en `fe/public/logos/` (`logo`, `logo-white`, `logo-mark`, `logo-mark-white` y `favicon`). Ninguna página pone un `<img>` del logo a mano: siempre se usa el componente `BrandLogo` (`fe/src/components/ui/BrandLogo.tsx`), que elige la versión según el fondo y el modo oscuro. No se usan PNG ni íconos de `lucide-react` (como `Leaf`) en lugar del logo.
- El color de marca (`accent-*`) es el único acento de color permitido en componentes reutilizables; los colores por rol (sidebar, badges) viven centralizados en `fe/src/config/roleTheme.ts`, no repetidos por archivo.
- Todo componente nuevo debe soportar modo claro y modo oscuro (`dark:`) desde el primer commit — no se agrega como una tarea aparte después.

---

## Idioma

- **Código** (variables, funciones, nombres de archivo, rutas de API): en **inglés**.
- **Comentarios y documentación** (este documento incluido, los RFs, las HUs, los mensajes de commit descriptivos): en **español**.
- Los mensajes de error mostrados al usuario final: en español, sin importar el idioma del código que los genera.

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
- Ningún endpoint que modifique o consulte datos sensibles queda sin autenticación — cualquier excepción debe justificarse explícitamente en el código, como ya se documentó en el incidente de `admin.py` corregido en este proyecto.
