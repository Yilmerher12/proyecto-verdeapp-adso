# Decisión: el ancho de las páginas de VerdeApp

<!--
  ¿Qué? Registro de por qué las páginas de VerdeApp tienen tres anchos fijos (normal, lectura y
        formulario) en vez de uno distinto por página, y cómo se usan.
  ¿Para qué? Que quien toque una página después sepa qué ancho elegir y por qué, sin volver a
             discutirlo ni agregar un `max-w-*` suelto.
  ¿Impacto? Es solo documentación: el código vive en `fe/src/config/anchoPagina.ts` y en cada página.
-->

**Fecha:** 2026-11-03
**Rama:** `feat/ancho-estandar-paginas`
**Relacionado:** `docs/requisitos/restricciones.md` (diseño visual, pantallas grandes) y RNF-003 (Usabilidad y Adaptabilidad).

## 1. El problema

Al revisar el panel del Reciclador y el del Residente se notó que las páginas no tenían el mismo ancho: unas llegaban hasta el borde del área de contenido y a otras les sobraba espacio a los lados. Se midió página por página (en una pantalla grande o un televisor, donde el área disponible es de 80 rem):

| Página | Ancho que tenía | Ocupaba del área |
| --- | --- | --- |
| Cambiar contraseña | 28 rem | 35 % |
| Comunicados y Novedades (pocos avisos) | 48 rem | 60 % |
| Panel del Residente | 56 rem (72 rem desde `2xl`) | 70 % (90 %) |
| Panel del Reciclador, Panel del Admin de Conjunto, Perfil, Directorio y las páginas de administración | 64 rem (72 rem desde `2xl`) | 80 % (90 %) |
| Panel del Admin del Sistema, Aprende a reciclar, Admin de contenido | 72 rem (80 rem desde `2xl`) | 90 % (100 %) |

## 2. Por qué pasaba

1. **Cada página decidía su ancho por su cuenta.** No había una regla por tipo de página: `restricciones.md` solo decía "los topes de ancho suben un paso desde `2xl`". Con el tiempo (y con los ajustes de la feria para los televisores 4K) cada cambio tocó una página sin mirar las demás.
2. **Los cuatro paneles sumaban relleno propio.** El área principal ya da 16 px de margen lateral en celular y 24 px desde `sm`. Los paneles agregaban otros 24 px (`sm:p-6`), y las demás páginas no. Por eso los paneles se veían más angostos que el resto, aun con el mismo tope.

## 3. Un dato que simplifica todo: la letra crece con la pantalla

Desde la feria, el tamaño base de la letra (`html` en `fe/src/index.css`) crece con el ancho de la pantalla: 16 px hasta 1536 px, y desde ahí 1,0417 % del ancho (20 px a 1920 px, 40 px a 3840 px). Todo se mide en **rem** (1 rem = ese tamaño base).

La consecuencia: **desde 1536 px de ancho en adelante, la pantalla siempre mide 96 rem**, sea un computador de 1536 px o un televisor 4K. Por eso las páginas solo hay que diseñarlas para 96 rem como máximo, y todo escala solo. El menú lateral ocupa unos 16 rem y el área principal del `AppShell` tiene un tope de **80 rem** (`max-w-7xl`): ese es el espacio real disponible para una página.

## 4. La decisión

Hay **tres anchos**, definidos en `fe/src/config/anchoPagina.ts`, y toda página elige uno:

| Ancho | Valor | Para qué se usa |
| --- | --- | --- |
| `normal` | Todo el área disponible (80 rem) | Los cuatro paneles, listas, catálogos, Perfil, Directorio y las páginas de administración |
| `lectura` | 48 rem (`max-w-3xl`) | Listas de avisos de texto: Comunicados del Residente y del Reciclador, y Soporte técnico para esos dos roles (en el Admin de Conjunto, Soporte técnico usa `normal`; ver sección 6) |
| `formulario` | 32 rem (`max-w-lg`) | Formularios cortos: Cambiar contraseña |

Cómo se usa en una página:

```tsx
import { ANCHO_PAGINA } from "@/config/anchoPagina";

<div className={`${ANCHO_PAGINA.normal} space-y-6 pt-6`}>…</div>
```

Reglas:

- Una página **no escribe su propio `max-w-*`** en el contenedor principal: elige uno de los tres.
- Una página **no agrega relleno lateral propio** (`px-*`, `sm:p-*`) en su contenedor: el margen lo pone solo el `AppShell`. Así se evitan los 24 px de más de los paneles.
- El ancho `normal` no tiene tope propio a propósito: lo da el `AppShell`, que es el único lugar donde se define el máximo.

## 5. Argumentos

- **Por qué tres anchos y no uno por página.** Las páginas se parecen por tipo de contenido (un panel con tarjetas, una lista de avisos, un formulario), no por página. Tres anchos cubren los casos y hacen que dos páginas del mismo tipo se vean igual.
- **Por qué `normal` es todo el área (80 rem).** Ya es el tope que tiene la aplicación en su área principal; usar un valor menor, como 72 rem, deja 8 rem vacíos a los lados en pantallas grandes, que es justo lo que se quería corregir. Además, 80 rem equivalen a 1280 px en un computador normal, dentro del rango de 1200 a 1440 px que suelen usar los paneles de administración.
- **Por qué lectura y formulario son más angostos.** Una línea de texto muy larga se lee mal, y un formulario de tres campos no necesita ocupar todo el ancho. En un listado corto de avisos, una sola tarjeta estirada a 80 rem se veía vacía.
- **Por qué sirve para televisores 4K.** Como todo está en rem y la letra crece con la pantalla, los tres anchos escalan solos: no hace falta un ancho distinto para el televisor de la feria (ver sección 3).
- **Por qué se quitó el relleno de los paneles.** Con un único responsable del margen lateral (el `AppShell`), todas las páginas quedan a la misma distancia del menú y del borde, en celular, tableta y escritorio.

## 6. Qué páginas usan cada ancho

- **`normal`:** Panel del Residente, Panel del Reciclador, Panel del Admin de Conjunto, Panel del Admin del Sistema, Perfil, Directorio y Puntos de acopio, Aprende a reciclar y su categoría, y las páginas de administración (Agenda, Comunicados, Desempeño, Contenido educativo, Novedades y Puntos de acopio).
- **`lectura`:** Comunicados del Residente y del Reciclador, y Soporte técnico (el feed de Novedades, con sus pestañas Avisos del sistema, Escribir novedad e Historial de novedades; lo ven el Residente, el Reciclador y el Admin de Conjunto). Soporte técnico se movió de `normal` a `lectura` el 2026-11-03: era una lista corta de textos y un formulario de un solo campo, y a 80 rem quedaba muy alargada y distinta de Comunicados, que está a su lado en el menú.
  - **Ajuste del 2026-11-10 (issue #632): Soporte técnico depende del rol.** Para el Admin de Conjunto usa `normal` (80 rem); para el Residente y el Reciclador sigue en `lectura` (48 rem). Motivo: Soporte técnico es una sola página para los tres roles, pero cada rol la tiene junto a una pantalla distinta en su menú. Al Residente y al Reciclador les queda junto a Comunicados (48 rem). Al Admin de Conjunto le queda junto a su Comunicados de administración y su Agenda (80 rem): con 48 rem para todos, sobraba espacio a los lados y parecía una pantalla de otro tipo. Cada rol ve así pantallas vecinas del mismo ancho.
  - **Decisión del 2026-11-03 (issue #603):** Comunicados ya no pasa a `normal` con 4 o más avisos. Antes la pantalla se ensanchaba sola cuando se publicaba el cuarto aviso (para dar lugar a los filtros y a los grupos "Esta semana" y "Anteriores") y quedaba distinta de Soporte técnico, que no cambia. Los filtros se envuelven y los grupos son listas de tarjetas, así que caben bien en 48 rem. Resultado: las dos pantallas hermanas miden siempre lo mismo.
- **`formulario`:** Cambiar contraseña.

Quedan fuera del estándar las páginas públicas (Landing, Login, Registro, recuperación de contraseña y verificación de correo) y los modales, que tienen su propio diseño.

## 7. Qué no cambia

- El estilo propio de Aprende a reciclar (esquinas más redondeadas y más espacio interior) no se toca: solo cambia su ancho. Dónde van sus títulos se discute aparte.
- No se agrega un ancho distinto para pantallas grandes: no hace falta (sección 3).

## 8. Cómo se cuida el estándar

`fe/src/__tests__/lib/anchoPaginas.test.ts` revisa que cada página de la lista use `ANCHO_PAGINA` y que ninguna vuelva a escribir un `max-w-*` suelto ni el relleno propio en su contenedor. Si alguien agrega una página nueva, debe sumarla a la lista de la prueba.

## 9. Límites

- La comparación de la sección 1 sale de leer el código de cada página (clases de Tailwind), no de medir las pantallas con un navegador en cada tamaño.
- Qué tan estirado se ve un panel de una sola columna a 80 rem es una decisión de diseño que se revisa viendo la pantalla; si se ve demasiado ancho, se puede ajustar dentro de la página sin cambiar el estándar.
