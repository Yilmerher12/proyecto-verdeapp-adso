# Estándares y convenciones de VerdeApp

<!-- resumen: Las reglas que VerdeApp sigue y por qué: identificadores UUID, fechas, accesibilidad, seguridad, diseño visual, código y proceso, con el estándar externo de cada una y cómo se hace cumplir. -->

## Cómo leer este documento

Un proyecto de software lo construyen varias personas durante meses. Si cada una decide por su cuenta cómo nombrar las cosas, qué color usar o cómo escribir una fecha, el resultado es un producto desordenado, difícil de mantener y, a veces, inseguro. Para evitarlo, el equipo adoptó **estándares y convenciones**, y este documento explica cuáles son, de dónde salen y **qué problema resuelve cada una**.

No supone que conozcas estos temas. Cada término se explica al aparecer y al final hay un glosario.

### Estándar frente a convención

- Un **estándar** es una regla definida por una organización externa y reconocida (por ejemplo, el W3C define las pautas de accesibilidad web). Seguirlo significa que nuestro trabajo es compatible con lo que el resto del mundo espera.
- Una **convención** es una regla que el propio equipo acordó (por ejemplo, «los botones tienen la esquina de 8 píxeles»). No la define nadie de afuera, pero se aplica con la misma disciplina.

VerdeApp tiene de las dos. Las convenciones del equipo están escritas en `docs/requisitos/restricciones.md`, un documento con una regla clara: **lo que está ahí no se negocia tarea por tarea**. Si algo debe cambiar, se discute y se actualiza ese documento primero, no se decide sobre la marcha en una sola solicitud de cambio.

Orden del documento:

1. Los identificadores: UUID.
2. Las fechas y las zonas horarias.
3. La API: versionado, JSON, códigos y paginación.
4. Seguridad: los estándares que se siguen.
5. Accesibilidad: WCAG y ARIA.
6. Diseño visual: las convenciones de la interfaz.
7. Código y proceso: idioma, comentarios, versiones y commits.
8. Las leyes y las licencias.
9. Cómo se hacen cumplir.

## 1. Los identificadores: UUID

### 1.1 Qué es un UUID

Todo registro de la base de datos necesita un **identificador**: un valor que lo distinga de los demás. La forma más simple es numerar: el usuario 1, el usuario 2, el usuario 3. Un **UUID** (*Universally Unique Identifier*, «identificador único universal») es otra forma: un valor largo, como `3f2b8c1e-9d4a-4e7b-a1c5-0b6d2f8e4a17`, que se genera de manera que **es prácticamente imposible que dos coincidan**, sin necesidad de que una base de datos central lo reparta.

Existen **versiones** de UUID, que se diferencian por cómo se generan. Las dos que importan aquí:

- **UUID versión 4 (v4):** se genera con **números aleatorios**. No lleva ningún dato adentro: ni fecha, ni orden.
- **UUID versión 7 (v7):** los primeros bits guardan **la fecha y hora de creación**, y el resto es aleatorio. Esto hace que los identificadores se puedan ordenar por el momento en que se crearon.

### 1.2 Qué problema resuelven los UUID frente a los números

Con identificadores numéricos consecutivos (1, 2, 3...), cualquiera puede **adivinar** el identificador de otro registro: si mi perfil es el usuario 57, pruebo con el 58 y el 59. Si el sistema tuviera algún error de permisos, un atacante recorrería todos los números. Con UUID **no se puede adivinar**: hay una cantidad astronómica de valores posibles.

### 1.3 La historia: de v7 a v4 (issue #167)

El proyecto empezó con identificadores numéricos y los cambió a UUID versión 7 en 20 de sus 22 tablas de entonces. Después, el profesor evaluador pidió reemplazar el v7 por el **v4**, y se hizo en el issue #167.

**La razón:** el v7 guarda la fecha y hora de creación **dentro del propio identificador**. Aunque nadie pueda adivinarlo, cualquiera que vea un identificador puede deducir *cuándo se creó* ese registro (por ejemplo, cuándo se registró un usuario), y eso es información que el identificador no tiene por qué revelar. El v4 es 100 % aleatorio y **no filtra nada**.

**Cómo está hecho:** todas las llaves primarias y foráneas se generan con una sola función, `generar_uuid4()` (`be/app/utils/ids.py`), que usa la librería estándar de Python. Un detalle: el proyecto conserva una dependencia llamada `uuid_utils` solo porque una migración antigua la importa, y las migraciones deben poder leerse todas para reconstruir el historial; ningún código nuevo la usa.

**Una excepción intencional:** las tablas `roles` y `localidades` conservan números enteros, porque son **catálogos fijos y públicos** (las 20 localidades de Bogotá, los 4 roles): no hay nada que «adivinar» ahí.

**El cambio se hizo sin perder datos.** Cambiar el tipo de las llaves de tablas con datos reales de golpe habría perdido información, así que se hizo por etapas (la técnica se llama *expand/contract*): se agrega la columna nueva, se llena, se reapuntan las referencias y recién al final se quita la vieja.

## 2. Las fechas y las zonas horarias

Las fechas parecen simples, pero son una fuente clásica de errores. VerdeApp aplica cuatro reglas.

### 2.1 Regla 1: se guardan en UTC

**UTC** es la hora universal, la misma en todo el mundo. Bogotá está en **UTC-5** y no tiene horario de verano, es decir, siempre está cinco horas atrás de UTC. **La base de datos guarda todas las fechas con hora en UTC.** *Qué problema resuelve:* si cada computador guardara su hora local, las fechas se compararían mal y cambiarían según dónde esté quien las mira.

### 2.2 Regla 2: se muestran según el idioma de la app, no del navegador

El mismo día se escribe distinto en cada país: en Colombia, el 29 de octubre de 2026 es `29/10/2026` (día, mes, año); en Estados Unidos es `10/29/2026` (mes, día, año). VerdeApp usa el formato del **idioma que la persona eligió en la aplicación**: español usa el formato de Colombia (`es-CO`) e inglés el de Estados Unidos (`en-US`).

*Qué problema resuelve:* antes (issue #633) las fechas se escribían con una función que usaba el idioma del **navegador**. Con la app en español y Chrome en inglés, se leía `10/29/2026`, y eso confunde. Ahora una función única (`fe/src/lib/dateFormat.ts`) decide el formato, y **nunca se escribe una fecha con `toLocaleDateString()` suelto**.

### 2.3 Regla 3: dos tipos de fecha, dos funciones

- **Un instante real**, como el `created_at` («creado el...»), se muestra en la zona horaria de quien lo mira: `formatearFechaCreacion`.
- **Una fecha elegida a mano**, como la de expiración de un comunicado, se muestra tal como se eligió, en UTC: `formatearFechaUTC`.

*Qué problema resuelve:* para una Convocatoria, el backend calcula la expiración como «medianoche UTC del día siguiente al evento». Si se mostrara en hora de Bogotá, esa medianoche caería la noche anterior y la fecha mostrada **retrocedería un día** respecto a la que el administrador eligió.

### 2.4 Regla 4: la fecha elegida con el calendario se escribe también con palabras

El campo `<input type="date">` lo dibuja cada navegador con su propio idioma. Para que no haya duda entre día y mes, debajo de cada campo de fecha un componente (`FechaEnPalabras`) escribe la fecha con el mes en letras: «Expira el 20 de noviembre de 2026».

### 2.5 Otras reglas de fechas

- **Las fechas de expiración se validan** (`be/app/utils/fechas.py`): no pueden estar en el pasado (un comunicado «nacería vencido») ni superar **365 días** desde hoy (un aviso con fecha en 2099 quedaría para siempre). Esa misma regla existe en el frontend y debe coincidir.
- **Las semanas se cortan en hora de Bogotá.** Un defecto real (D-34) hacía que las semanas del Administrador del Sistema se cortaran en UTC y no en hora de Bogotá; se corrigió.

## 3. La API: versionado, JSON, códigos y paginación

La API (la lista de endpoints del backend, documento 2) sigue estas convenciones:

- **Versionado en la dirección:** todos los endpoints empiezan por `/api/v1/`. *Qué problema resuelve:* si algún día cambia la forma de una respuesta, se puede publicar una `v2` sin romper a quien usa la `v1`.
- **REST con JSON:** cada dirección más su verbo (`GET`, `POST`, `PUT`, `DELETE`) equivale a una acción, y los datos viajan como JSON.
- **Códigos de respuesta HTTP con su significado** (`200`, `400`, `401`, `403`, `404`, `422`, `429`; tabla en el documento 2).
- **Dos formatos de error.** Cuando falla la validación del esquema, el campo `detail` es una *lista* de errores (`422`); cuando falla una regla de negocio, es un *texto* (`400`). Las pruebas fijan los dos formatos. Además, un error inesperado responde `500` con un JSON estándar (`{"detail": "Error interno del servidor."}`) y no con texto plano.
- **Paginación uniforme:** los listados que pueden crecer reciben `limit` y `offset`, y responden `{"items": [...], "total": N}`.
- **Las respuestas no exponen datos internos:** pasan por un esquema de salida (documento 2).

## 4. Seguridad: los estándares que se siguen

La seguridad se explicó en el documento 3. Aquí solo se listan los estándares y convenciones que la gobiernan:

| Estándar o convención | Qué exige | Dónde se ve |
|---|---|---|
| **OWASP Top 10** | Revisar el sistema contra las 10 vulnerabilidades web más frecuentes | `docs/conceptos/owasp-top-10.md` |
| **JWT** (RFC 7519) | Tokens firmados para la sesión, sin estado | `be/app/utils/security.py` |
| **bcrypt** | Guardar contraseñas como hash lento con sal, nunca en texto plano | `be/app/utils/security.py` |
| **Regla de las credenciales** | Toda credencial vive en `.env`, nunca en el código ni en el repositorio; `.env.example` con valores de ejemplo es obligatorio | `.gitignore`, `be/.env.example` |
| **Regla del backend** | Toda regla de un formulario se repite en el backend; el frontend solo guía | Esquemas de Pydantic |
| **Límite de texto = columna de la base** | Cada campo tiene el mismo máximo en el frontend y en el esquema, igual al tamaño de su columna, para que un texto largo dé `422` y no un error `500` | `fe/src/lib/validacion.ts` y `be/app/schemas/` |
| **Ningún correo visible** | Ningún enlace muestra un correo electrónico: llevan al formulario de contacto (por pedido del profesor, por seguridad). **Única excepción** documentada: la pantalla para pedir la cuenta de Administrador de Conjunto, porque pide dos documentos adjuntos | `restricciones.md`, issue #457 |
| **Ningún endpoint sensible sin autenticación** | Cualquier excepción debe justificarse en el código | Routers de FastAPI |

## 5. Accesibilidad: WCAG y ARIA

### 5.1 Qué es

La **accesibilidad web** busca que **todas las personas** puedan usar la aplicación, sin importar sus capacidades: alguien con baja visión, alguien que solo usa el teclado, alguien con daltonismo o un lector de pantalla (un programa que lee en voz alta lo que hay en la pantalla).

- **WCAG** (*Web Content Accessibility Guidelines*): las pautas internacionales del W3C. Tienen niveles de conformidad A, AA y AAA. **El objetivo de VerdeApp es WCAG 2.1 nivel AA.**
- **ARIA:** atributos que se agregan al HTML para describir comportamientos que el HTML normal no puede expresar (por ejemplo, un grupo de botones del que solo se puede elegir uno).

WCAG se organiza en cuatro principios, conocidos como **POUR**:

| Principio | Qué pide | Ejemplo en VerdeApp |
|---|---|---|
| **P**erceptible | La información se puede percibir | Los niveles de la auditoría usan **color, ícono y texto**, nunca solo color |
| **O**perable | Todo se puede manejar | Las ventanas atrapan el foco con la tecla Tab y se cierran con Esc |
| **U**nderstandable (comprensible) | Se entiende cómo funciona | Cada campo tiene su etiqueta; los errores se anuncian con `role="alert"` |
| **R**obust (robusto) | Lo interpretan las tecnologías de apoyo | HTML semántico: `<main>`, `<nav>`, `<button>` |

### 5.2 Las reglas que VerdeApp aplica

- **Primero HTML semántico, y ARIA solo cuando el HTML no alcanza.** Se usa `<button>` (nunca un `<div>` con clic), `<label>` y `<main>`/`<nav>`. ARIA entra, por ejemplo, en el selector de nivel de la auditoría (`role="radiogroup"`).
- **El color nunca es la única señal** (WCAG 1.4.1). Una barra de semáforo que solo tenía colores se retiró y se reemplazó por una gráfica donde cada tramo lleva su número, un ícono y un nombre.
- **Contraste suficiente** en modo claro y oscuro. WCAG pide, como mínimo, un contraste de **4,5 a 1** para el texto normal y de **3 a 1** para los controles (bordes de campos y botones). VerdeApp midió los contrastes con una herramienta y corrigió los que no cumplían. Por ejemplo, el borde de los campos del modo claro tenía un contraste de apenas 1,13 a 1 y ahora tiene 3,4 a 1.
- **Todo se puede usar con teclado,** y el foco se ve: todo control tiene un anillo de foco visible (la clase `focus-ring`). Nunca se quita el contorno sin ese reemplazo.
- **Lo que se toca se reconoce a simple vista,** sin pasar el mouse (en el celular no hay mouse): los enlaces llevan subrayado siempre visible, los botones secundarios llevan borde, y los botones de solo ícono llevan nombre accesible (`aria-label`) y una pista visible (`title`).
- **Áreas táctiles de 44 píxeles** en celular, para evitar toques equivocados.
- **El tamaño de la letra no baja de 11 px** y se escribe en `rem` (una unidad que escala), y en pantallas grandes (como el televisor 4K de la feria) la letra crece sola: 16 px hasta 1536 px de ancho, 20 px a 1920 px y 40 px a 3840 px.
- **Respetar «reducir movimiento».** Si el sistema de la persona pide menos animaciones, ninguna se mueve.

### 5.3 Qué se auditó y qué se encontró

Se auditó todo el frontend contra estos criterios, más de una vez (agosto, septiembre y octubre de 2026), porque después de cada auditoría se agregaron pantallas nuevas. Se encontraron y corrigieron **10 huecos reales**, entre ellos: filas de notificación que solo respondían al clic del mouse y no al teclado, columnas ordenables sin `aria-sort`, y botones de expandir sin `aria-expanded`. Se revisaron además los **260 elementos clicables** del frontend. Todo está en `docs/conceptos/accesibilidad-aria-wcag.md` y en las auditorías `docs/gestion-proyecto/auditoria-rnf-003-*.md`.

**Un límite honesto:** las pruebas de celular y tableta se hicieron con emulación, no en dispositivos reales (salvo el televisor 4K de la feria, que sí se probó en uno real).

## 6. Diseño visual: las convenciones de la interfaz

Estas son convenciones propias del equipo, escritas en `docs/requisitos/restricciones.md`. Cada una resuelve un problema concreto: que las cuatro vistas de VerdeApp (una por rol) se vean y se comporten como una sola aplicación.

### 6.1 La regla general

> **Todo valor de diseño sale de un lugar definido una sola vez.** Ningún componente escribe un color, un tamaño o una duración «a mano».

*Qué problema resuelve:* si cada pantalla escribe su propio color, cambiar la paleta exige tocar cientos de archivos, y es fácil que dos pantallas se vean distintas.

### 6.2 Las convenciones, una por una

| Tema | La convención | Por qué |
|---|---|---|
| **Letra** | Solo sans-serif. **Outfit** para títulos (`h1` a `h3`) e **Inter** para todo lo demás. Pesos: títulos en negrita, botones y etiquetas en semigrueso, nombres de campo en medio | Legibilidad y coherencia |
| **Escala tipográfica** | Título de página 24 px, de tarjeta 18 px, de ítem 16 px, texto normal 14 px, texto de ayuda 12 px, pastillas desde 11 px. Los niveles de encabezado no saltan y cada página tiene un solo `h1` | Jerarquía clara, y accesibilidad para lectores de pantalla |
| **Sin degradados** | Solo colores sólidos | Identidad visual simple y consistente |
| **Íconos** | Solo `lucide-react`, un ícono por concepto en toda la app, y solo 5 tamaños (`icon-sm`, `icon-md`, `icon-lg`, `icon-xl`, `icon-deco`). Sin emojis como íconos | El mismo concepto se reconoce siempre igual |
| **Colores** | Un solo color de marca (`accent-*`, verde) y las superficies del modo oscuro con nombres (`night-base`, `night-page`, `night-card`, `night-panel`, `night-inset`, `night-field`...). **Rojo** solo para peligro y error; **ámbar** para lo que pide atención sin ser error | Significado consistente del color |
| **Modo claro y oscuro** | Todo componente nuevo debe soportar los dos desde el primer commit | No se «agrega después» |
| **Botones** | Toda acción usa el componente `Button` (variantes `primary`, `secondary`, `danger`, `dangerOutline` y `warning`), esquina de 8 px, nunca un `<button>` con clases a mano | Todos los botones iguales |
| **Dimensiones** | Tarjeta de página con relleno de 24 px; separación entre bloques de 24 px; campos con esquina de 8 px; ventanas con tres anchos | Orden visual |
| **Ancho de páginas** | Solo tres anchos: `normal`, `lectura` y `formulario` | Páginas que se sienten parte del mismo sistema |
| **Movimiento** | Un solo efecto: desvanecimiento. Dos duraciones: rápida (150 ms) y normal (200 ms) | Sensación consistente, sin distraer |
| **Estados de carga** | Una **silueta gris** con la forma de lo que va a llegar (componente `Esqueleto`), nunca un círculo «Cargando…». Aparece a los 100 ms para no parpadear en cargas rápidas | La pantalla no «salta» al llegar los datos |
| **Elementos clicables** | Se reconocen a simple vista (sección 5.2) | Accesibilidad |
| **Logo** | Solo en SVG y siempre con el componente `BrandLogo` | Un único lugar para cambiarlo |
| **Alineación** | Formularios y listas a la izquierda; mensajes de resultado (ícono, frase y botón) centrados | Lectura cómoda |
| **Modal o página** | Un **modal** (ventana) para una tarea corta sin salir de donde se estaba; una **página** para una lista que se recorre o un trabajo largo | Una regla clara para decidir |
| **Acciones por fila** | Una o dos acciones como íconos visibles; tres o más en un menú de tres puntos | Filas ordenadas |
| **Listas** | Un contenedor con filas separadas por una línea, y la paginación siempre visible; se piden al servidor de 10 en 10 | Todas las listas se usan igual |
| **Pantallas grandes** | Todo en `rem`, para que escale | El televisor 4K de la feria se ve bien |
| **Idioma** | Español por defecto e inglés; ningún texto escrito dentro del componente | Internacionalización |

### 6.3 La paleta de marca

La paleta se llama **«Páramo Fresco»** en modo claro y **«Bosque Andino»** en modo oscuro. En el modo oscuro, las superficies son verdes casi neutros, cada capa un paso más clara que la de abajo, con un solo acento (un menta claro). **Los cuatro roles comparten ese acento:** el rol se distingue por su ícono y su nombre, no por color.

*Una nota de estado:* la paleta está en **revisión**. El 25 de noviembre de 2026 se tomaron decisiones nuevas, rol por rol (por ejemplo, otros tonos para el modo oscuro y un color de apoyo), que se están aplicando en una rama de trabajo aparte. **Este documento describe la paleta que está hoy en `develop`.** Cuando la rama se integre, `restricciones.md` se actualiza.

## 7. Código y proceso

### 7.1 Idioma

- **Código** (variables, funciones, nombres de archivo y rutas de la API): en **inglés**.
- **Comentarios y documentación:** en **español**.
- **Mensajes para el usuario final:** en español o inglés según el idioma elegido en la app.

*Qué problema resuelve:* el inglés es el idioma de las herramientas y de casi toda la documentación técnica, así que el código se parece a lo que el aprendiz va a encontrar en cualquier empresa; y la documentación en español la entiende todo el equipo.

### 7.2 Los comentarios explican el porqué

Cada comentario significativo responde tres preguntas:

- **¿Qué?** Qué hace esa pieza.
- **¿Para qué?** Por qué existe.
- **¿Impacto?** Qué pasaría si se quita o se cambia.

Un comentario no describe lo que el código ya dice (el nombre de la función lo hace); explica **la razón que no se ve**. Esto es el requisito RNF-006.1.

### 7.3 Versiones exactas

Toda dependencia lleva una **versión exacta** (`==` en el backend, sin `^` ni `~` en el frontend), y los archivos de bloqueo (`uv.lock` y `pnpm-lock.yaml`) fijan además las dependencias transitivas. *Qué problema resuelve:* que cualquier persona, o el servidor de integración continua, instale exactamente lo mismo. La versión *mayor y menor* de cada tecnología está en `restricciones.md`; la exacta, en `pyproject.toml` y `package.json`.

### 7.4 Herramientas únicas

- **Backend:** `uv` como único gestor (nunca `pip`), `ruff` para estilo y errores comunes, `pytest` para pruebas.
- **Frontend:** `pnpm` como único gestor (nunca `npm` ni `yarn`), `eslint` y `prettier` para estilo, `vitest` para pruebas.
- **Base de datos:** todo cambio del esquema pasa por una migración de Alembic; nunca `create_all()`.
- **Pruebas:** toda funcionalidad nueva lleva sus pruebas antes de darse por terminada.

### 7.5 Git: ramas, commits y pull requests

(Se explicó en el documento 4.) **Conventional Commits** (`feat:`, `fix:`, `docs:`, `test:`...), una rama por tarjeta desde `develop`, y solicitud de cambio con **título en inglés y descripción en español**.

### 7.6 Los documentos de requisitos

Los requisitos se numeran con un código y cada uno tiene un campo **Estado**:

- **HU-001...HU-053:** historias de usuario.
- **RQF-003...RQF-021 (y RF-001, RF-002):** requisitos funcionales.
- **RNF-001...RNF-006:** requisitos no funcionales.

Ese campo **Estado** es la fuente de verdad más confiable sobre qué tan avanzado está algo: es más confiable que un README, porque cada requisito se actualiza cuando cambia su implementación.

## 8. Las leyes y las licencias

Algunos estándares no los eligió el equipo, sino que son obligatorios:

| Norma | Qué regula | Cómo la cumple VerdeApp |
|---|---|---|
| **Ley 1581 de 2012** | Protección de datos personales | Política de Privacidad, documentos del administrador que se eliminan al terminar la revisión, correos de organizaciones fuera del repositorio, el nombre de contacto de los conjuntos no se guarda |
| **Ley 1712 de 2014** | Transparencia y acceso a la información pública | Se cita a la UAESP como fuente y se respetan las condiciones de uso |
| **Licencias Creative Commons** (CC BY y CC BY-NC) | Condiciones para usar datos abiertos | Citar la fuente y no usar comercialmente (documento 6) |
| **Licencias de las librerías** | Cada librería tiene su licencia (por ejemplo, `fpdf2` es LGPL-3.0, y se usa como librería sin modificarla) | Se documentan en `restricciones.md` cuando importan |

## 9. Cómo se hacen cumplir

Una regla que depende de que todos se acuerden **termina rompiéndose**. Por eso la mayoría de los estándares de VerdeApp **los vigila una prueba automática** que falla si alguien los rompe:

| Qué vigila | Qué hace la prueba |
|---|---|
| `estandaresVisuales.test.ts` | Recorre **todos** los archivos del frontend y cuenta los botones escritos a mano, los íconos con medida suelta, los títulos fuera de escala, las tarjetas con relleno propio, los campos con esquina grande, los anillos de foco escritos a mano, los colores fuera de la lista, los paneles de pestañas a mano y las duraciones distintas. **El conteo permitido es 0** |
| `tamanoTexto.test.ts` | Falla si reaparece texto de menos de 11 px |
| `elementosClicables.test.ts` | Falla si hay un botón de solo ícono sin nombre, o un enlace de texto sin subrayado |
| `coloresTemas.test.ts` | Falla si aparece un color escrito a mano o un gris sin su pareja del modo oscuro |
| `animacionesIconos.test.ts` | Falla si un ícono se anima de una forma no permitida |
| `anchoPaginas.test.ts` | Cuida que las páginas usen solo los tres anchos |
| `test_migraciones.py` | Falla si una migración repite el identificador de otra |
| `test_config.py` | Falla si el backend arranca con una configuración insegura |
| Integración continua | Corre `ruff`, `eslint`, `tsc` y las pruebas en cada cambio |

### El «trinquete»

Para introducir un estándar en una aplicación que ya existe, la prueba de estándares visuales usa una técnica llamada **trinquete** (como el mecanismo que solo gira en un sentido). Se mide **cuántos casos incumplen hoy** (la cifra de partida) y se fija ese número. La prueba falla si el número **sube** (alguien rompió la regla en algo nuevo) y también falla si **baja** hasta que se actualiza la cifra (para que el avance quede fijo). Cuando se terminó de aplicar el estándar, la cifra llegó a 0. Es la misma idea que el umbral de cobertura del documento 3, que solo sube.

Además, hay una **lista de verificación** pantalla por pantalla (`docs/gestion-proyecto/lista-verificacion-estandares-visuales.md`, 117 archivos) que registró el avance del trabajo.

## Lo que debes saber explicar

Después de leer este documento, deberías poder responder **sin mirar**:

1. ¿Qué es un UUID, por qué se usa en lugar de números y por qué se cambió de la versión 7 a la 4?
2. ¿En qué zona horaria se guardan las fechas y en qué formato se muestran?
3. ¿Qué es WCAG, qué nivel busca VerdeApp y qué tres reglas de accesibilidad aplica?
4. ¿Por qué ningún componente escribe un color «a mano»?
5. ¿Cuál es la diferencia entre un estándar y una convención?
6. ¿Cómo se asegura el equipo de que los estándares se cumplan?

### Preguntas que te pueden hacer

**¿Por qué UUID versión 4 y no versión 7?**
Porque el v7 guarda la fecha y hora de creación dentro del propio identificador, y eso revela información que no tiene por qué revelarse. El v4 es 100 % aleatorio. El profesor evaluador pidió el cambio y se hizo sin perder datos, por etapas.

**¿Por qué las fechas se guardan en UTC?**
Para que se comparen y se ordenen bien sin importar dónde esté quien las mira. Al mostrarlas se aplica el formato del idioma que eligió la persona en la app, no el del navegador.

**¿Qué nivel de accesibilidad buscan?**
WCAG 2.1 nivel AA. Aplicamos HTML semántico primero, color nunca como única señal, contraste mínimo de 4,5 a 1 en texto y 3 a 1 en controles, uso completo con teclado y áreas táctiles de 44 píxeles. Auditamos todo el frontend y corrigimos 10 huecos.

**¿Por qué todos los botones se ven iguales?**
Porque hay un único componente `Button` con cinco variantes, y una prueba automática falla si alguien escribe un botón a mano. Así cambiar el diseño de los botones es tocar un solo archivo.

**¿Cómo evitan que alguien rompa el diseño sin darse cuenta?**
Con pruebas automáticas que recorren todo el frontend y cuentan los casos que incumplen. El conteo permitido es cero, y la integración continua las corre en cada cambio.

**¿Qué leyes aplican a su proyecto?**
La Ley 1581 de 2012 de protección de datos personales y la Ley 1712 de 2014 de transparencia, además de las licencias Creative Commons de los datos abiertos que usamos.

**¿Por qué el código está en inglés y los comentarios en español?**
El inglés es el idioma de las herramientas y de casi toda la documentación técnica, así que el código se parece a lo que se encuentra en cualquier empresa. Los comentarios y la documentación están en español para que todo el equipo los entienda.

## Glosario

- **ARIA:** atributos de HTML que describen comportamientos para las tecnologías de apoyo.
- **Contraste:** diferencia de luminosidad entre dos colores, medida como una razón (por ejemplo, 4,5 a 1).
- **Convención:** regla que el propio equipo acordó.
- **Estándar:** regla definida por una organización externa y reconocida.
- **Expand/contract:** técnica para cambiar la estructura de una base con datos, por etapas, sin perder información.
- **Lector de pantalla:** programa que lee en voz alta lo que hay en la pantalla.
- **Paginación:** mostrar resultados por partes.
- **POUR:** los cuatro principios de WCAG: perceptible, operable, comprensible y robusto.
- **rem:** unidad de tamaño que escala con la letra base de la página.
- **Token de diseño:** nombre que se le da a un valor de diseño (un color, un tamaño) para definirlo una sola vez.
- **Trinquete:** técnica donde un conteo solo puede avanzar en un sentido.
- **UTC:** hora universal; Bogotá está en UTC-5.
- **UUID (v4, v7):** identificador único universal; el v4 es aleatorio, el v7 lleva la fecha dentro.
- **WCAG:** pautas internacionales de accesibilidad web, del W3C.
