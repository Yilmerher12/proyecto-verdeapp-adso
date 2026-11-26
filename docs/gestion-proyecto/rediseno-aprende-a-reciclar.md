# Rediseño de «Aprende a reciclar»: decisiones de la fase 1

<!--
  ¿Qué? Resultado de la fase 1 del issue #705: las decisiones de diseño de la navegación
        y de las pantallas de «Aprende a reciclar», con el porqué de cada una y las fuentes
        que se consultaron.
  ¿Para qué? Que el grupo pueda leer qué se decidió y por qué antes de que se programe la
             fase 2, y que quien implemente no tenga que volver a decidir nada a solas.
  ¿Impacto? Este documento no cambia código. La implementación (fase 2) sigue lo que dice
            aquí; si algo se quiere cambiar, se cambia primero aquí.
-->

| Campo | Valor |
|---|---|
| **Fecha** | 26 de noviembre de 2026 |
| **Issue** | #705 |
| **Estado** | Decisiones tomadas e implementadas en la rama `feat/rediseno-aprende-a-reciclar` (fase 2); pendiente de revisión del grupo |

## 1. De dónde partimos

El catálogo tiene 28 módulos (issue #519) repartidos de forma desigual: de 2 a 6 por categoría. Hoy:

- Abrir una categoría muestra **todas sus lecciones apiladas en una sola página** (Residuos peligrosos del hogar tiene 6, unas 24 tarjetas).
- Esa página marca **como vistos todos los módulos de la categoría** al cargar (`CategoriaEducativaPage.tsx`), así que el avance «X de N lecciones vistas» cuenta lecciones que nadie abrió.
- Una lección no tiene dirección propia: solo existen `/catalogo-educativo` y `/catalogo-educativo/:categoria`.
- La página del catálogo tiene 5 tarjetas que solo llevan un título, separadas de lo que titulan.
- Dentro de una lección, las tarjetas de texto se estiran a la misma altura y dejan huecos, el ícono de triángulo se repite sin decir nada, y «Fuente» ocupa una tarjeta entera.

## 2. Las decisiones

### 2.1 Tres niveles de navegación

Catálogo (las 8 categorías) → categoría (la lista de sus módulos) → lección (un solo módulo).

### 2.2 Lista de módulos de una categoría: «lista tipo temario mejorada»

Se compararon tres opciones con el contenido real, en escritorio y en celular, con una categoría de 6 módulos y una de 2: lista, cuadrícula de tarjetas y ruta con pasos.

Se eligió la lista, con estos elementos:

- Una **cabecera** con el ícono de la categoría, «N lecciones · M vistas», la barra de avance y un botón «Empezar» o «Continuar: [lección que sigue]».
- Una **fila por módulo**: número (o marca de visto), título completo, una línea de resumen (la primera frase de la lección) y, si lo tiene, el chip «Con video».
- La marca discreta **«Sigue por aquí»** en la primera lección sin ver.
- Al final, **«Sigue aprendiendo»** con otras categorías.

Por qué:

- Los módulos son textos parecidos entre sí y NN/g recomienda la lista vertical para elementos homogéneos; las tarjetas son menos escaneables y ocupan más espacio.
- Los títulos son preguntas largas, y solo la lista los muestra enteros, también en celular.
- Con 2 módulos las tres opciones simples quedan cortas; la cabecera, el botón «Continuar» y «Sigue aprendiendo» llenan la pantalla sin inventar contenido.
- No depende de las portadas (#706): si después hay portadas propias, entran como miniatura en cada fila.

### 2.3 La lección: página propia

Se descartó abrirla en una ventana encima de la lista y se descartó el diseño de dos paneles.

- **Una página por lección**, con la ruta arriba: «Aprende a reciclar › Categoría › Lección» en escritorio y solo «‹ Categoría» en celular.
- **«Anterior / Siguiente»** al final, con los módulos de la categoría en su orden de aprendizaje.
- **Dirección:** `/catalogo-educativo/leccion/<identificador>`, con el identificador interno de la lección. No cambia aunque se edite el título o se mueva de categoría, y los enlaces de las notificaciones no se rompen.

Por qué:

- NN/g dice que una ventana modal se justifica para advertencias críticas o datos imprescindibles, no para actividades que no son críticas, y que si el contenido es largo o de varios pasos conviene una página.
- Una página tiene dirección propia: el botón Atrás del navegador y los enlaces de las notificaciones funcionan sin trucos.
- Las migas ayudan a quien llega por un enlace directo, que es el caso de las notificaciones; en celular NN/g recomienda mostrar solo el nivel padre.
- Dos paneles es lo más costoso, quita ancho justo donde el contenido ya es ancho, y en la mitad de las categorías la lista tendría 2 o 3 ítems. Se puede agregar después sin rehacer nada.

### 2.4 Cómo se ve una lección por dentro: una sola tarjeta

Una sola columna dentro de una sola tarjeta, de arriba abajo:

1. Título.
2. Video (si lo tiene).
3. «De qué trata».
4. Las secciones, cada una con su subtítulo y su lista, separadas por una línea.
5. Al pie, el botón «Abrir la guía oficial» y la fuente como una línea de texto pequeña.

Desaparece el ícono repetido y «Fuente» deja de ser una tarjeta. La ruta (migas de pan) va **dentro** de la tarjeta, arriba del título, y no suelta sobre el fondo. La página usa el ancho `lectura`, igual que la lista de lecciones de la categoría; el catálogo usa `normal` (ver [decisión de anchos](decision-ancho-de-paginas.md)).

Se compararon también tarjetas ordenadas en dos columnas y texto con ficha lateral. La ficha lateral (guía, fuente y la lista «En esta categoría») se implementó a prueba a ancho completo y **se descartó** al verla: repetía la lista de la categoría y «Anterior / Siguiente».

Los textos de un módulo pueden llevar enlaces. Uno que empieza con `/` es de la aplicación y abre en la misma pestaña (por ejemplo, a una categoría); cualquier otro abre en una pestaña nueva. Un enlace a una lección concreta no es portable (su identificador cambia en cada base de datos); a una categoría sí, porque se identifica por su nombre.

Por qué: es lo que se pidió («cada cosa junta»), respeta la advertencia de NN/g de no llenar de cajas, se lee de arriba abajo como la gente escanea según NN/g, mantiene un ancho de línea cómodo, funciona igual en celular y no se desbalancea con módulos que no tienen video.

### 2.5 Avance

- Una lección **cuenta como vista cuando se abre**, por módulo (regla «ver la actividad» de Moodle). Se descartó llegar al final porque en escritorio una lección corta se ve entera al abrirla, y el botón «Marcar como leída» porque casi nadie lo pulsa.
- Se muestra en **fracciones** («2 de 6»), no en porcentaje: los módulos no tienen un orden obligatorio y los diseñadores de cursos reportan que el porcentaje engaña cuando se navega sin orden.
- La cabecera de una categoría tiene **tres estados**: «Empezar» (sin lecciones vistas), «Continuar: [lección]» y «Categoría completa».
- El catálogo muestra el avance total («Tu avance») y el «2 de 6» de cada categoría.
- «Visto» es una marca, no un candado: se puede volver a abrir cualquier lección, y la marca no se borra.
- **No** hay botón «Repasar desde el principio» ni reinicio del avance. La lista ya permite abrir cualquier lección y un reinicio pediría una función nueva en el servidor.

### 2.6 A dónde lleva cada enlace

| Desde dónde | Lleva a |
|---|---|
| Tarjeta de categoría del catálogo | La lista de la categoría |
| «Sigue aprendiendo» | La lista de la categoría |
| Video destacado | La lección que tiene ese video |
| Aviso manual del Administrador del Sistema | La lección que él envió |
| «Ver lección» de «Tu semana» | La primera lección sin ver de la categoría auditada |
| Aviso automático después de una auditoría | La misma lección que «Tu semana» |
| Botón «Empezar» o «Continuar» de una categoría | La primera lección sin ver |

Casos de respaldo:

- Si la persona ya vio todas las lecciones de la categoría, el enlace de «Tu semana» y el del aviso llevan a la lista, que dice «Categoría completa».
- Si la lección ya no existe (la eliminó el Administrador), se muestra una pantalla clara con un botón hacia el catálogo (como la lección no existe, ya no se sabe cuál era su categoría).
- Si la categoría no tiene módulos, se usa el mensaje de lista vacía que ya existe.

Limitación: la auditoría solo guarda la categoría que salió mal, no cuál lección sirve más. Por eso se usa «la primera sin ver», que sigue el orden de aprendizaje de la categoría. La ruta de cada aviso se calcula al tocarlo, así que los avisos que ya existen funcionan igual que los nuevos.

### 2.7 La página del catálogo: tres tarjetas agrupadas

Cada título va dentro de la tarjeta de lo que titula (principio de región común de NN/g), igual que en el panel de Desempeño:

1. **«Aprende a reciclar»**, con «Tu semana» y «Tu avance» adentro.
2. **«Categorías de aprendizaje»**, con las categorías adentro.
3. **«Video destacado»**, con el video adentro.

La **tarjeta de categoría** muestra: nombre, una frase de qué trata, la barra y el estado («N de M lecciones vistas», «Sin empezar» o «Categoría completa»). Se descartaron la versión solo con nombre y avance y la versión con «la lección que sigue».

Frases aprobadas (cada una sale de lo que de verdad contienen los módulos). Van en los archivos de textos `es` y `en`; una categoría nueva que cree el Administrador del Sistema no tendrá frase y su tarjeta se ve igual sin esa línea:

| Categoría | Frase |
|---|---|
| Separación en la fuente y código de colores | Qué va en cada bolsa y a qué hora sacarla |
| Tipos de residuos y su preparación | Cómo dejar el papel, el plástico y el vidrio para que se reciclen |
| Puntos limpios y Ecopuntos | Dónde llevar muebles, colchones y escombros |
| Economía circular y aprovechamiento | Qué pasa con tu bolsa blanca y quién la recoge |
| Residuos de construcción y demolición | Qué hacer con los escombros de una obra o remodelación |
| Marco distrital y consumo responsable | Menos basura en casa y los 10 mandamientos de cero desechos |
| Residuos peligrosos del hogar | Pilas, bombillas, medicamentos, aceite y más |
| Aparatos, llantas y baterías | Qué hacer con computadores, neveras, baterías y llantas |

## 3. Qué cambia en la base de datos y qué no

- **Una columna nueva: `orden`** en `contenido_educativo` (migración `7cd0f55e4060`). Hasta ahora el orden de los módulos de una categoría salía de `fecha_publicacion` (el más reciente primero), que significa «cuándo se publicó» y no «en qué orden se lee». «Anterior / Siguiente», «la primera lección sin ver» y la lista dependen de un orden de lectura estable, así que se guarda de forma explícita:
  - La migración numera los módulos que ya existen (1, 2, 3... por categoría) en el mismo orden en que se veían, así que la pantalla no cambia.
  - Un módulo nuevo (o uno que cambia de categoría) queda **al final** de su categoría: el servidor le pone el siguiente número. El formulario del Administrador no envía el orden.
  - El seed trae el orden escrito en `contenido_educativo.json` y deja de depender de fechas inventadas.
  - **No hay todavía una pantalla para reordenar a mano** (subir y bajar lecciones). Es una función aparte; la base ya queda lista para ella.
  - `GET /api/v1/contenido-educativo` devuelve el catálogo agrupado por categoría y, dentro de cada una, ordenado por `orden`. El orden de las categorías en el catálogo lo define el frontend.
- **El avance.** Sigue en `contenido_educativo_vistos` (una fila por residente y lección). Marcar vistos por módulo usa las mismas llamadas del servidor que ya existen (`POST /vistos` con los ids). El «2 de 6» se calcula, no se guarda.
- **Las marcas que ya existen.** Quien entró antes a una categoría ya tiene todas sus lecciones marcadas, y no hay forma de saber cuáles leyó de verdad.
- **Cómo se recomienda el contenido** tras una auditoría (RQF-013): solo cambia a dónde lleva el enlace.
- **Las portadas** siguen siendo las genéricas de cada categoría: son del issue #706. El texto de los módulos y los módulos nuevos son del issue #707.

## 4. Fuentes consultadas y sus límites

- NN/g, [Cards: UI-Component Definition](https://www.nngroup.com/articles/cards-component/) (2016): las tarjetas sirven para explorar; las listas son más escaneables y caben más por pantalla. Leído completo.
- NN/g, [Modal & Nonmodal Dialogs](https://www.nngroup.com/articles/modal-nonmodal-dialog/) (2017): cuándo se justifica una ventana modal. Leído completo.
- NN/g, [Breadcrumbs: 11 Design Guidelines](https://www.nngroup.com/articles/breadcrumbs/) (2018, revisado en 2026): migas de pan, enlaces directos y celular. Leído completo.
- NN/g, [Common Region](https://www.nngroup.com/articles/common-region/) y [How Users Read on the Web](https://www.nngroup.com/alertbox/9710a.html) (1997): solo se leyeron los resúmenes de la búsqueda, no el texto completo. La advertencia de «demasiadas cajas ensucian» es un título de sección cuyo texto no se pudo leer.
- Moodle, [Activity completion settings](https://docs.moodle.org/402/en/activity_completion_settings): las tres formas de dar una actividad por completa. Solo resumen de la búsqueda.
- Adobe eLearning, [progreso en cursos no lineales](https://elearning.adobe.com/2020/03/progress-indicator-for-a-non-linear-project-solution-1): relato de la práctica, no un estudio.
- Android, [Start an Activity from a Notification](https://developer.android.com/develop/ui/views/notifications/navigation): una notificación debe dejar una jerarquía a la que se pueda volver. Solo resumen de la búsqueda.
- WCAG 1.4.8 (máximo de 80 caracteres por línea, nivel AAA) y las cifras de 45 a 75 caracteres, que vienen de blogs y no de una norma.

**No se pudo leer** la página de listas de Material Design (se carga con JavaScript), y no se encontró documentación de Coursera ni de Duolingo, así que no se citan.

**Sin fuente:** «Anterior / Siguiente» entre lecciones es criterio propio del equipo; es fácil de quitar.

**No se hizo:** probar con personas reales. Los prototipos se hicieron en la conversación (no se guardan en el repositorio), con colores neutros y verdes genéricos y no con la paleta real; el modo oscuro, la barra lateral de escritorio y el ancho real de la lección se revisan al implementar.

## 5. Fase 2: qué se programó

*Todo lo de esta lista está hecho. Dos cosas se afinaron al programar: el desplegable de temas de la auditoría del Reciclador usa el mismo orden de categorías que el catálogo, y la lista de módulos del panel del Administrador sale ahora agrupada por categoría y en orden de lectura (antes salía del más reciente al más antiguo).*

0. **Servidor:** la columna `orden` (sección 3), con su migración, el servicio, el seed y las pruebas. *Hecho.*
1. Ruta y página de lección nuevas (`LeccionEducativaPage`), con migas, «Anterior / Siguiente», la tarjeta única y marcar «visto» al abrirla.
2. `CategoriaEducativaPage` pasa de mostrar todas las lecciones a la lista tipo temario con su cabecera.
3. `CatalogoEducativoPage` con las 3 tarjetas agrupadas y la tarjeta de categoría con frase y avance.
4. `TuSemana`, el video destacado y la ruta de las notificaciones (`contenidoRecomendado.ts`) apuntan a donde dice la tabla de la sección 2.6.
5. `MuroLeccion` se convierte en la tarjeta única de la lección, y se actualiza la vista previa del Administrador del Sistema, que lo usa.
6. Las 8 frases y los textos nuevos en `es` y `en`, modo claro y oscuro, celular.
7. Pruebas del frontend actualizadas y nuevas, y documentación: RQF-004, HU-005, RQF-013 y RQF-010.
