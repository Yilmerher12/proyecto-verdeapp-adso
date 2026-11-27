# El frontend: pantallas, navegación y diseño

<!-- resumen: Todas las pantallas de VerdeApp, cómo se navega entre ellas según el rol, cómo está armado el menú, qué piezas se reutilizan y qué principios de diseño y de experiencia de usuario se siguen. -->

## Cómo leer este documento

El documento 2 explicó **cómo está organizado** el frontend por dentro (carpetas, React, rutas). Este documento explica lo que **ve y usa la persona**: qué pantallas existen, cuáles puede abrir cada rol, cómo se mueve de una a otra, qué piezas se repiten en todas y por qué se diseñó así.

Es el documento de apoyo para el criterio de la revisión sobre el frontend: pantallas, enrutamiento, navegación, manejo de colores, experiencia de usuario (**UX**) e interfaz de usuario (**UI**). No supone que sepas diseño: cada término se explica al aparecer y al final hay un glosario.

Dos términos que conviene aclarar desde ya:

- **UI (*User Interface*, interfaz de usuario):** lo que se ve y se toca: botones, colores, tipografías, formularios.
- **UX (*User Experience*, experiencia de usuario):** cómo se siente usarlo: si es fácil encontrar algo, si se entiende qué pasó, si no hay que pensar demasiado.

Orden del documento:

1. El mapa de pantallas.
2. Las pantallas públicas.
3. Cómo se navega: guardas, rutas y menú.
4. Las pantallas de cada rol.
5. Las piezas que se repiten en toda la aplicación.
6. Cómo se manejan los estados: carga, vacío y error.
7. Colores, temas, idioma y tamaños de pantalla.
8. Principios de experiencia de usuario.

## 1. El mapa de pantallas

VerdeApp tiene **29 archivos de pantalla** en `fe/src/pages/` (algunas pantallas legales tienen dos archivos: la página y su ventana), más 4 paneles principales (uno por rol) en `pages/dashboards/`. Se agrupan así:

| Grupo | Pantallas |
|---|---|
| **Públicas** (sin sesión) | Portada (Landing), iniciar sesión, registrarse, olvidé mi contraseña, restablecer contraseña, verificar correo, aceptar invitación |
| **Legales** (se abren como ventana sobre la portada) | Términos de uso, política de privacidad, política de cookies, contacto |
| **De cuenta** (todos los roles con sesión) | Mi perfil, cambiar contraseña |
| **Del Residente** | Panel principal, comunicados, soporte técnico, «Aprende a reciclar» (catálogo, categoría y lección), directorio general |
| **Del Reciclador** | Panel principal, comunicados, soporte técnico, puntos de acopio |
| **Del Administrador de Conjunto** | Panel principal, comunicados, agenda, desempeño, soporte técnico |
| **Del Administrador del Sistema** | Panel principal, solicitudes, novedades, contenido educativo, puntos de acopio |

Hay una **única aplicación** para los cuatro roles: la misma estructura, los mismos componentes y el mismo diseño. Lo que cambia por rol es qué pantallas puede abrir y qué contenido ve en cada una.

## 2. Las pantallas públicas

### 2.1 La portada (Landing)

Es lo primero que ve alguien que llega a VerdeApp sin sesión. Tiene cuatro partes:

1. **Encabezado** con el logo y dos botones: «Iniciar sesión» y «Registrarse».
2. **Presentación (*hero*):** el título («Gestión de residuos para conjuntos residenciales en Bogotá»), una descripción corta y dos botones: «Ya tengo cuenta» y «Unirse a VerdeApp».
3. **«¿Cómo funciona?»:** tres pasos que cuentan el ciclo en pocas palabras: *el conjunto se afilia* (el administrador pide su cuenta, comparte el código de acceso e invita al reciclador), *los residentes participan* (aprenden a reciclar y avisan cuando el SHUT está lleno) y *el reciclador actúa* (avisa su llegada y el sistema genera una auditoría).
4. **«Nuestros pilares»:** tres ejes: separación en la fuente, conexión con recicladores y educación ambiental.

Al final hay un pie de página con los enlaces legales (términos, privacidad, cookies y contacto) y un botón «Volver arriba». Las secciones aparecen con una animación suave al hacer scroll (hook `useScrollReveal`).

### 2.2 Iniciar sesión

Una tarjeta con correo, contraseña y el enlace «¿Olvidaste tu contraseña?». Si la persona no tiene cuenta, un enlace lleva al registro. Reglas de experiencia:

- **El botón de iniciar sesión está desactivado** hasta que se completen el correo y la contraseña (y el texto del botón dice «Completa tu correo y contraseña»).
- **Cada campo se valida al salir de él**, no solo al enviar: si el correo no tiene formato válido, el mensaje aparece pegado a ese campo.
- **Si las credenciales fallan**, aparece un único mensaje («Credenciales incorrectas. Verifica tu correo y contraseña.») que no revela cuál de los dos datos falló (seguridad, documento 3).
- **Si la sesión expiró**, la pantalla lo avisa con un mensaje propio («Tu sesión expiró. Vuelve a iniciar sesión.»).

### 2.3 Registrarse

El registro **se adapta al rol**:

1. **Primero se elige el rol** en tres tarjetas: *Residente* («vivo en un conjunto y quiero separar mejor mis residuos»), *Reciclador* («recojo material y quiero unirme a un conjunto») y *«¿Administras un conjunto?»* («administro un conjunto y quiero pedir mi cuenta»). Esta tercera no abre un formulario: explica cómo pedir la cuenta (documento 8, sección 2.4).
2. **Luego aparecen los campos de ese rol.** Un Residente elige localidad, conjunto (con un buscador, porque hay miles), torre y apartamento, y escribe el código de acceso de su conjunto (obligatorio); un Reciclador, su localidad y su asociación opcional.
3. **La contraseña** muestra un indicador de fortaleza y una lista de requisitos que se van marcando al cumplirlos (mínimo 8 caracteres, mayúscula, minúscula y número).
4. **Se aceptan por separado tres textos:** los términos de uso, la política de privacidad y la política de cookies. El botón de registrar solo se activa cuando están aceptados.
5. **Al terminar**, una pantalla confirma «¡Cuenta creada con éxito!» y pide revisar el correo, porque la cuenta no se puede usar hasta verificarlo.

### 2.4 Las demás pantallas públicas

- **Olvidé mi contraseña / Restablecer contraseña:** pide el correo y manda un enlace; el enlace abre la pantalla donde se escribe la contraseña nueva.
- **Verificar correo:** la pantalla a la que llega la persona al abrir el enlace del correo de verificación; dice si se verificó o si el enlace es inválido o venció.
- **Aceptar invitación:** la pantalla a la que llega quien recibió una invitación (de Administrador de Conjunto o de Reciclador a un conjunto).
- **Pantallas legales:** cada una (términos, privacidad, cookies, contacto) abre una **ventana sobre la portada**, con su propia dirección. Así se puede enlazar directamente a la política de privacidad.

## 3. Cómo se navega: guardas, rutas y menú

### 3.1 Las rutas y las guardas

Una **ruta** es una dirección del navegador (`/comunicados`) asociada a una pantalla. Dos componentes, llamados **guardas**, protegen las rutas privadas (documento 2, sección 4):

1. **`ProtectedRoute` — ¿hay sesión?** Cuando la aplicación se abre, tiene que averiguar si la persona ya tenía una sesión (consulta al backend `GET /me`). Mientras averigua, muestra un indicador de carga con aviso para lectores de pantalla («Verificando sesión»); sin esto, la aplicación mandaría a la persona al inicio de sesión por un instante antes de saber que sí estaba conectada. Si no hay sesión, redirige a `/login`.
2. **`RoleGuard` — ¿es el rol correcto?** Cada ruta exclusiva de uno o más roles lo declara. Si un rol no tiene permiso, **vuelve a su propio panel**, no a una pantalla de error. Así, si un Residente escribe a mano la dirección de una pantalla de administrador, termina en su panel.

La ruta `/dashboard` es un **redireccionador**: según el rol de quien inició sesión, lo manda a su panel (`/dashboard/residente`, `/dashboard/reciclador`, `/dashboard/admin` o `/dashboard/admin-conjunto`). Cualquier dirección que no exista lleva al inicio de sesión.

**Recuerda:** estas guardas protegen la *navegación*, no los datos. Como el frontend se puede modificar, el backend vuelve a comprobar el rol en cada petición y respondería `403` (documento 3).

### 3.2 Qué rol puede abrir qué

| Ruta | Pantalla | Roles |
|---|---|---|
| `/dashboard/residente` | Panel del Residente | Residente |
| `/dashboard/reciclador` | Panel del Reciclador | Reciclador |
| `/dashboard/admin-conjunto` | Panel del Administrador de Conjunto | Administrador de Conjunto |
| `/dashboard/admin` | Panel del Administrador del Sistema | Administrador del Sistema |
| `/comunicados` | Comunicados | Residente, Reciclador |
| `/novedades` | Soporte técnico | Residente, Reciclador, Administrador de Conjunto |
| `/catalogo-educativo` (y `/:categoria`, `/leccion/:id`) | Aprende a reciclar | Residente |
| `/directorio` | Directorio general | Residente |
| `/puntos-acopio` | Puntos de acopio | Reciclador |
| `/admin-conjunto/comunicados`, `/agenda`, `/desempeno` | Gestión del conjunto | Administrador de Conjunto |
| `/admin/solicitudes`, `/novedades`, `/contenido-educativo`, `/puntos-acopio` | Administración | Administrador del Sistema |
| `/profile`, `/change-password` | Mi perfil, cambiar contraseña | Cualquier rol con sesión |

### 3.3 El menú lateral

Todas las pantallas con sesión comparten una estructura llamada **AppShell** («cascarón de la aplicación»): un **menú lateral** a la izquierda, un **encabezado** arriba y el **contenido** de la pantalla en el centro. El menú cambia según el rol:

| Rol | Opciones del menú |
|---|---|
| **Residente** | Panel principal · Comunicados · Soporte técnico · Aprende a reciclar · Directorio general · Mi perfil · Seguridad |
| **Reciclador** | Panel principal · Comunicados · Soporte técnico · Puntos de acopio · Mi perfil · Seguridad |
| **Administrador de Conjunto** | Panel principal · Comunicados · Agenda · Desempeño · Soporte técnico · Mi perfil · Seguridad |
| **Administrador del Sistema** | Panel principal · Solicitudes · Novedades · Contenido educativo · Puntos de acopio · Seguridad |

**Cómo está armado el menú:**
- Las opciones se organizan en **grupos**: la zona principal, la de comunidad, «Recursos» y «Cuenta» (los dos últimos con rótulo). Cada opción lleva un **ícono** que es siempre el mismo para el mismo concepto en toda la aplicación (documento 7).
- La opción **«Solicitudes»** del Administrador del Sistema lleva un **número** con la cantidad de solicitudes pendientes, para que no tenga que entrar a ver si hay algo.
- La opción activa se resalta, y el menú se puede **colapsar** a una columna de íconos (con un botón que dice «Colapsar menú» o «Expandir menú»).
- **En celular** el menú empieza colapsado, para que el contenido se vea de inmediato.
- Al final está **«Cerrar sesión»**, que cierra la sesión también en el backend aunque haya un problema de red.
- El nombre del rol se ve en el menú con su ícono (una persona, un casco, una persona con engranaje, un escudo). **Los cuatro roles comparten el mismo color de acento**: el rol se distingue por su ícono y su nombre, no por color.

### 3.4 El encabezado

El encabezado tiene tres controles, iguales para todos los roles:

1. **La campanita de notificaciones** con el número de avisos sin leer. Al tocarla, **se despliega la lista ahí mismo**, sin salir de la pantalla en que se está. Cada aviso lleva a la pantalla que corresponde (por ejemplo, el aviso de contenido recomendado lleva a la lección).
2. **El selector de idioma** (español o inglés).
3. **El botón de tema** (claro u oscuro).

## 4. Las pantallas de cada rol

### 4.1 El Residente

- **Panel principal:** lo nuevo primero: el resultado de la última auditoría de su conjunto (con su nivel y fotos), los avisos y los comunicados recientes, y el botón **«Reportar SHUT lleno»**. Incluye el bloque **«Mi conjunto»**, organizado en pestañas, con la gráfica de desempeño de 8 semanas, el porcentaje calificado Bueno y el tema a reforzar.
- **Comunicados:** los avisos de su administración, de los más recientes a los más antiguos.
- **Soporte técnico:** las novedades de la plataforma y el formulario para escribir una consulta (pestañas). Al elegir el motivo, aparece primero una **ayuda escrita** (documento 8).
- **Aprende a reciclar:** tres niveles de navegación: el **catálogo** (las 8 categorías, con avance por categoría y el bloque «Tu semana», que dice qué lección conviene repasar según la última auditoría), la **categoría** (una lista de sus lecciones con cabecera, barra de avance y botón «Empezar» o «Continuar») y la **lección** (una página propia, con ruta de migas, texto en tarjetas, video si lo tiene, fuente y botones «Anterior» y «Siguiente»).
- **Directorio general:** dos pestañas: **recicladores** y **puntos de acopio** (con buscador, filtro por localidad y paginación).

### 4.2 El Reciclador

- **Panel principal:** su panel está organizado alrededor del trabajo de una visita: los botones **«Llegué al conjunto»**, **«SHUT ya está libre»**, **«SHUT está lleno»** y **«Finalicé separación»**; el aviso **«Auditoría semanal pendiente»** con el botón **«Auditar ahora»**; las notificaciones recibidas; y el historial de las auditorías que él mismo envió.
- **El formulario de auditoría:** elegir el nivel (con tres opciones que llevan carita, color y texto), el tema, una descripción opcional y de 1 a 3 fotos, con vista previa de cada una. Antes de enviar pide **confirmar**, porque la auditoría no se puede editar.
- **Comunicados**, **Soporte técnico** y **Puntos de acopio** (la tabla de ECA con su ficha, su organización y su dirección).

### 4.3 El Administrador de Conjunto

- **Panel principal:** cada conjunto que administra aparece como una **tarjeta con pestañas**: *Resumen* (NIT, apartamentos, cobertura de registro y **código de acceso**), *Avisos* (los avisos de ese conjunto) y *Recicladores* (los autorizados, con invitar y revocar). Arriba pueden aparecer avisos (el resultado de una auditoría, o la aprobación de una desvinculación).
- **Comunicados:** crear, editar y eliminar comunicados, con tipo, destinatarios, fecha de expiración y adjunto; una lista de vigentes y vencidos.
- **Agenda:** un tablero de notas del comité con dos vistas, *Por tratar* y *Archivadas*, y descarga del historial.
- **Desempeño:** la gráfica de barras apiladas por semana, el ranking de temas, una tabla equivalente para quien no puede leer la gráfica, y la descarga en PDF. Si el administrador tiene más de un conjunto, unas pestañas permiten elegir cuál mirar.
- **Soporte técnico.**

### 4.4 El Administrador del Sistema

- **Panel principal:** una **tabla de usuarios registrados** con orden por columnas, filtros, paginación y un menú de acciones por fila (ver perfil, activar o desactivar); desde aquí también se **invita a administradores** de conjunto y se **les asigna un conjunto adicional**.
- **Solicitudes:** la bandeja, con dos pestañas: *Soporte técnico* (con prioridad, estado y respuesta) y *Desvinculaciones* (aprobar o rechazar).
- **Novedades:** publicar, editar y archivar avisos para toda la plataforma o para un rol.
- **Contenido educativo:** crear, editar y eliminar lecciones, con vista previa al lado, portada e imágenes dentro de la lección; enviar una lección a conjuntos; y la tabla de calificaciones por conjunto.
- **Puntos de acopio:** el directorio de las 799 ECA, con búsqueda, filtros y ficha de cada punto.

### 4.5 Mi perfil y Seguridad

- **Mi perfil** muestra los datos de la cuenta (nombre, teléfono, foto, y los datos del rol: conjunto, torre y apartamento para el Residente; asociación y si se muestra en el directorio, para el Reciclador). El **correo no se puede editar** (es el identificador de la cuenta). La foto se valida (tipo, máximo 5 MB).
- **Seguridad** (cambiar contraseña) pide la contraseña actual y la nueva, con el mismo indicador de fortaleza del registro. Al cambiarla se cierran las demás sesiones (documento 3).

## 5. Las piezas que se repiten en toda la aplicación

Todas las pantallas se arman con las mismas piezas. Esto es lo que hace que VerdeApp se sienta una sola aplicación en lugar de cuatro. Las más importantes están en `fe/src/components/ui/`:

| Pieza | Para qué sirve |
|---|---|
| **`Button`** | Todos los botones. Cinco variantes: principal (verde), secundario (con borde), peligro (rojo), peligro con borde y advertencia (ámbar). Tiene un estado «cargando» que muestra un círculo dentro del botón |
| **`InputField`** | Los campos de texto, con su etiqueta, su ayuda y su mensaje de error pegados al campo |
| **`Modal` y `ConfirmModal`** | Las ventanas. El `ConfirmModal` es la pregunta de sí o no antes de una acción destructiva |
| **`Alert`** | Avisos de éxito, error o información, con ícono y texto |
| **`Pestanas` y `PanelPestana`** | Cambiar entre vistas de un mismo contenido. Tres formas: subrayadas (una línea bajo la activa), subrayadas repartidas (para elegir un conjunto) y burbujas (para filtros) |
| **`Paginacion`** | Los listados largos se piden de 10 en 10, con «Mostrando 1–10 de N» y flechas, siempre visible |
| **`MenuAcciones`** | El menú de tres puntos de una fila, cuando hay tres o más acciones |
| **`EmptyState`** | Lo que se muestra cuando una lista está vacía |
| **`Esqueleto`** | La silueta gris mientras cargan los datos |
| **`ContenidoRecargable`** | Una lista que, al filtrarla, atenúa sus filas y muestra una barra de progreso, en vez de borrarlas |
| **`ConjuntoCombobox`** | Un buscador con lista para elegir entre miles de conjuntos |
| **`TextoRecortable`** | Un texto largo recortado con «Ver más» |
| **`FechaEnPalabras`** | Escribe con palabras la fecha elegida con el calendario |
| **`BrandLogo`** | El logo, que elige solo su versión según el fondo y el modo oscuro |
| **`ThemeToggle` y `LanguageSwitcher`** | El botón de tema y el selector de idioma |
| **`BackToTopButton`** | «Volver arriba» |
| **`YoutubeEmbed`** | El video de una lección, que solo acepta enlaces de YouTube válidos |

Piezas más específicas están en carpetas por tema: `dashboard/` (los avisos y el historial de auditorías), `adminConjunto/` (la tarjeta del conjunto y sus pestañas), `desempeno/` (la gráfica, la leyenda, el ranking y la tabla) y `educativo/` (la lección, «Tu semana», la vista previa).

**Por qué importa esto:** si cada pantalla escribiera su propio botón, cambiar su aspecto exigiría tocar decenas de archivos, y sería fácil que dos botones se vieran distintos. Con una pieza única, se cambia en un lugar, y una prueba automática impide que alguien escriba un botón a mano (documento 7).

## 6. Cómo se manejan los estados: carga, vacío y error

Una pantalla no siempre está «llena y funcionando». Tiene cuatro estados que hay que diseñar, y VerdeApp tiene una respuesta para cada uno.

### 6.1 Cargando

- **Primera carga de una pantalla o lista:** una **silueta gris** con la forma de lo que va a llegar (componente `Esqueleto`). Aparece a los 100 ms para no parpadear si los datos llegan rápido.
- **Recarga con filas ya visibles** (un filtro, una pestaña): las filas se atenúan y una barra de progreso delgada aparece arriba (documento 8, sección 3.5).
- **Una acción corta** (guardar, enviar): un pequeño círculo dentro del botón.
- **Verificar la sesión al abrir la aplicación:** un indicador con aviso para lectores de pantalla.
- **Subida de fotos:** una barra de progreso con porcentaje.

### 6.2 Vacío

Cuando una lista no tiene elementos, el componente `EmptyState` lo dice con una fórmula uniforme: «Todavía no hay X...» o «Todavía no tienes X...», con un ícono y, si corresponde, una acción. Un vacío nunca es una pantalla en blanco.

### 6.3 Error

Hay tres niveles de error, de lo más puntual a lo más grande:

1. **Error de un formulario o de una acción:** un mensaje (`Alert`) o el mensaje pegado al campo. Un error de validación va en el campo; el aviso general queda para fallos reales de guardado o de red, no para «falta un campo».
2. **El servidor no responde:** una **franja global** («No se pudo conectar con el servidor...»), visible en cualquier pantalla, que aparece cuando ninguna petición funciona y desaparece sola cuando vuelve la conexión. La pantalla no se congela ni queda en blanco. Cubre el requisito de manejo de fallas de red (RNF-002.4).
3. **Un error inesperado del programa:** dos **ErrorBoundary** («barreras de error»): uno alrededor de toda la aplicación y otro dentro del AppShell. Si un componente falla, se muestra una pantalla de error con una salida (por ejemplo, recargar), en lugar de dejar la aplicación en blanco.

Además, **la sesión que vence se renueva sola** (documento 2): la persona no ve un error ni pierde lo que escribía.

## 7. Colores, temas, idioma y tamaños de pantalla

### 7.1 Colores

- **Un solo color de marca:** el **verde**, definido como `accent` en un único archivo (`fe/src/index.css`). Ningún componente escribe un color suelto.
- **El color tiene significado:** el **rojo** es solo para peligro y error; el **ámbar** para lo que pide atención sin ser error (por ejemplo, un contador de avisos); los colores de categoría (morado, índigo, turquesa) solo identifican tipos de comunicado o de aviso, y siempre acompañados de texto o ícono.
- **Los cuatro roles comparten el mismo acento:** se distinguen por su ícono y su nombre.
- **La paleta de hoy en `develop`** se llama «Páramo Fresco» (claro) y «Bosque Andino» (oscuro). Está en revisión (documento 7, sección 6.3).

### 7.2 Modo claro y modo oscuro

- Un **botón de tema** en el encabezado cambia entre los dos.
- **La preferencia se recuerda:** se guarda en el navegador; si la persona nunca eligió, se usa la preferencia de su sistema operativo.
- **Todo componente nuevo debe soportar los dos modos desde el primer commit.** En el modo oscuro, las superficies son verdes casi neutros: cada capa (fondo, tarjeta, ventana) es un paso más clara que la de abajo, y un borde visible las separa.
- Los contrastes de ambos modos se **midieron** con herramientas y cumplen WCAG AA (documento 7).

### 7.3 Idioma

- **Español por defecto e inglés.** El selector está en el encabezado y también en la portada.
- **Cada texto es una clave** con su traducción en dos archivos (`locales/es` y `locales/en`); ninguna pantalla trae texto escrito dentro del componente.
- **El idioma se recuerda** en el navegador y, para las personas con sesión, también en su cuenta (se restaura al iniciar sesión).
- **Las fechas siguen el idioma de la aplicación**, no el del navegador (documento 7).

### 7.4 Tamaños de pantalla (diseño adaptable)

VerdeApp se diseña para **computador, tableta, celular y televisor 4K** con el mismo código. Esto se llama **diseño adaptable** (*responsive*).

- **Celular:** el menú empieza colapsado; los controles tienen un área táctil mínima de **44 píxeles**; las pestañas y los botones se reacomodan para no cortarse. El rol de Reciclador prioriza el celular, porque trabaja desde el cuarto de basuras.
- **Tableta y computador:** el contenido usa uno de **tres anchos fijos** (normal, lectura y formulario; documento 8).
- **Televisor 4K** (el de la feria): todo está en `rem`, una unidad que escala con la letra base, y la letra base **crece con el ancho de la pantalla** (16 px hasta 1536 px, 20 px a 1920 px y 40 px a 3840 px). Se probó en un televisor 4K real.
- **Se auditó** en 375, 640, 768, 900, 1024, 1100 y 1280 píxeles de ancho, en español y en inglés, y en Chrome, Edge y Firefox. **Un límite:** las pruebas de celular y tableta fueron con emulación, no con dispositivos reales.

## 8. Principios de experiencia de usuario

Estos principios resumen cómo se pensó el diseño. Cada uno se apoya en una decisión concreta ya explicada:

1. **Consistencia.** El mismo concepto se ve y se comporta igual en todas partes: un ícono por concepto, un botón único, una forma de pestañas, una forma de lista. *Qué problema resuelve:* la persona aprende una vez y no tiene que reaprender en cada pantalla.
2. **Reconocer antes que recordar.** Lo que se puede tocar se reconoce a simple vista (subrayado, borde, ícono con nombre), y el rol se ve siempre en el menú.
3. **Mensajes que ayudan.** Los errores dicen qué pasó y qué hacer; los vacíos explican por qué está vacío; los formularios validan al salir de cada campo, en el momento en que ayuda.
4. **Nunca dejar a la persona sin saber qué pasa.** Siempre hay un indicador de carga, un mensaje de éxito o error, y un aviso global si el servidor no responde.
5. **No perder lo que la persona escribió.** Un fallo de red no borra el formulario ni las fotos.
6. **Confirmar lo irreversible.** Eliminar, o enviar una auditoría (que no se edita), pide confirmación.
7. **Dar prioridad a lo nuevo.** El panel principal de cada rol empieza por lo que cambió desde la última vez.
8. **Accesibilidad como parte del diseño.** Teclado, lectores de pantalla, contraste y no depender del color (documento 7).
9. **Simplicidad por rol.** Cada rol ve solo lo suyo en el menú: no hay opciones que no pueda usar.
10. **Rápido y liviano.** Las pantallas pesadas (la gráfica) se cargan solo cuando se abren, y las listas se piden de 10 en 10.

## Lo que debes saber explicar

Después de leer este documento, deberías poder responder **sin mirar**:

1. ¿Cuáles son las pantallas públicas y qué pasa en el registro según el rol?
2. ¿Qué hacen `ProtectedRoute` y `RoleGuard`, y por qué la protección real está en el backend?
3. ¿Qué opciones del menú ve cada uno de los cuatro roles?
4. ¿Qué es el AppShell y qué controles tiene el encabezado?
5. ¿Cómo se maneja una pantalla que está cargando, vacía o con error?
6. ¿Cómo se adapta VerdeApp al celular y al televisor 4K?
7. ¿Por qué todas las pantallas usan las mismas piezas?

### Preguntas que te pueden hacer

**¿Cómo se organiza la navegación?**
Con un menú lateral y un encabezado compartidos por todas las pantallas con sesión. El menú cambia según el rol, y dos guardas protegen las rutas: una exige sesión y otra exige el rol correcto. Si un rol no tiene permiso, vuelve a su panel.

**¿Qué pasa si un Residente escribe la dirección de una pantalla de administrador?**
La guarda lo devuelve a su propio panel. Y aunque se saltara la guarda, el backend respondería `403`, porque vuelve a comprobar el rol en cada petición.

**¿Por qué los cuatro roles tienen el mismo color?**
Para que toda la aplicación se vea como una sola, con un único acento verde. El rol se distingue por su ícono y su nombre, no por color, lo que además es mejor para accesibilidad.

**¿Cómo manejan los errores en la interfaz?**
En tres niveles: un mensaje pegado al campo o a la acción; una franja global si el servidor no responde, que desaparece sola; y barreras de error que evitan que un fallo del programa deje la aplicación en blanco.

**¿La aplicación funciona en celular?**
Sí. El menú empieza colapsado, los controles miden al menos 44 píxeles, y se auditó en varios anchos de pantalla y en tres navegadores. Un límite es que la prueba fue con emulación, no con dispositivos reales.

**¿Cómo cambian de idioma y de tema?**
Con dos botones del encabezado. Las dos preferencias se recuerdan en el navegador, y el idioma también en la cuenta. Todos los textos salen de archivos de traducción, y las fechas siguen el idioma de la aplicación.

**¿Por qué usan siempre los mismos componentes?**
Para que la aplicación sea consistente y para poder cambiar el diseño en un solo lugar. Una prueba automática impide, por ejemplo, escribir un botón a mano.

## Glosario

- **AppShell:** la estructura común de las pantallas con sesión: menú lateral, encabezado y contenido.
- **Colapsar (menú):** reducir el menú a una columna de íconos.
- **Diseño adaptable (responsive):** que la misma pantalla se acomode a distintos tamaños de pantalla.
- **ErrorBoundary:** componente que atrapa los errores del programa para mostrar una pantalla de error en lugar de dejar la aplicación en blanco.
- **Guarda de ruta:** componente que decide si una persona puede abrir una pantalla.
- **Hero:** la sección de presentación de la portada.
- **Ruta:** una dirección del navegador asociada a una pantalla.
- **Silueta (esqueleto):** forma gris que reserva el espacio mientras cargan los datos.
- **UI:** lo que se ve y se toca de una aplicación.
- **UX:** cómo se siente usar la aplicación.
