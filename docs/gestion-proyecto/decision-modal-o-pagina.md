# Decisión: cuándo usar un modal y cuándo una página

<!--
  ¿Qué? Registro de la regla para elegir entre abrir una ventana (modal) o llevar a una página propia, con los
        ejemplos que ya hay en VerdeApp.
  ¿Para qué? Que quien agregue una pantalla nueva no tenga que adivinar ni volver a discutirlo, y que las
             pantallas parecidas se comporten igual.
  ¿Impacto? Es solo documentación: no cambia código. La regla se aplicó en el rediseño del panel del
            Administrador del Sistema (issues #596, #615, #619 y #620).
-->

**Fecha:** 2026-11-09
**Rama:** `docs/decisiones-rediseno-panel-admin-sistema`
**Relacionado:** `docs/requisitos/restricciones.md` (diseño visual), `docs/gestion-proyecto/decision-ancho-de-paginas.md` (el ancho de las páginas) e issue #621.

## 1. El problema

Durante la revisión del panel del Administrador del Sistema, las solicitudes de soporte y de desvinculación se abrían en un **modal más alto que la pantalla**, dentro del panel principal. Una lista que se recorre y se responde una por una se atendía mal ahí: había que mover la ventana, no se podía volver a ella con un enlace y el número de pendientes no se veía en ningún lado. Y en la página de Contenido educativo, el detalle de una calificación y el de un módulo se abrían en **paneles laterales** angostos, que el profesor pidió quitar.

Faltaba una regla escrita: cada pantalla nueva volvía a abrir la misma discusión ("¿esto va en una ventana o en una página?").

## 2. La regla

> **Modal** para una tarea corta que se hace sin salir de donde se estaba y que se cierra al terminar.
> **Página** para una lista que se recorre, para un trabajo largo, o para algo a lo que hay que poder volver.

Cuatro preguntas para decidir, en este orden:

| Pregunta | Si la respuesta es sí |
| --- | --- |
| ¿Es una **lista que puede crecer** y que se recorre, se filtra o se pagina? | **Página** |
| ¿Hay que poder **volver a ella o enlazarla**, o mostrar un **contador en el menú**? | **Página** |
| ¿Es un trabajo **largo**, de varios pasos con idas y vueltas, que se hace en más de una sesión? | **Página** |
| ¿Es **mirar algo puntual** o **hacer una acción corta** y volver a la pantalla de donde se vino? | **Modal** |

Si dos preguntas dan resultados distintos, gana la primera de la lista.

## 3. Ejemplos del proyecto

| Pantalla | Es | Por qué |
| --- | --- | --- |
| **Solicitudes** (soporte técnico y desvinculaciones) | Página (`/admin/solicitudes`) | Es una lista que crece, se atiende una por una, tiene contador en el menú y franja de aviso en el panel. Antes era un modal y no cabía. |
| **Asignar conjunto** a un administrador | Modal | Tres pasos cortos (buscar al administrador, elegir localidad y conjunto, confirmar) y se vuelve al panel. |
| **Invitar administrador** de conjunto | Modal | Un formulario corto. |
| **Detalle de una calificación** | Modal (`AuditoriaResultadoModal`) | Se mira una ficha puntual y se vuelve a la tabla. Es el mismo modal que ven los otros roles. |
| **Ver un módulo** (vista previa y "Recomendado a") | Modal | Mirar algo puntual. Las acciones (enviar, editar, eliminar) están en el menú de tres puntos de la fila. |
| **Enviar a conjuntos** | Modal | Una acción corta: elegir conjuntos y enviar. |
| **Crear o editar un módulo** | Modal ancho, con la vista previa al lado | Es un solo formulario que se hace de una vez y vuelve a la lista. Si algún día se vuelve un editor largo (ver `idea-editor-por-tarjetas.md`), se vuelve a evaluar. |
| **Confirmar una eliminación** | Modal (`ConfirmModal`) | Una pregunta de sí o no. |
| **Usuarios registrados**, **Calificaciones por conjunto**, **Novedades** | Página o pestaña de una página | Son listas con filtros y paginación. |

## 4. Reglas técnicas que acompañan a la regla

- **Un modal nunca es más alto que la pantalla.** `fe/src/components/ui/Modal.tsx` limita su altura y el contenido tiene scroll interno; la X de cerrar queda fija a la vista (issue #615). Si un modal "no cabe", casi siempre es la señal de que debía ser una página.
- **Un modal sobre otro es excepcional.** Se usa solo para algo muy corto que depende del modal de abajo: ampliar una foto, una confirmación o una ventana hija. Se marca con `layer="stacked"`. Nunca más de dos capas.
- **No hay paneles laterales.** Se eliminó `PanelLateral` (issue #619): lo que se abría ahí ahora es un modal. Una pantalla nueva no debe volver a crear uno.
- **Una página elige uno de los tres anchos** (`normal`, `lectura` o `formulario`) y no escribe su propio `max-w-*`; ver `decision-ancho-de-paginas.md`. Los modales quedan fuera de ese estándar y tienen su propio diseño.

## 5. Argumentos

- **Por qué una lista va en página y no en modal.** Una lista que crece necesita su propio espacio, su paginación y un lugar en el menú. En un modal compite por el alto de la ventana y esconde lo que hay detrás.
- **Por qué mirar un detalle va en modal.** Quien consulta una ficha casi siempre quiere volver a la lista en el mismo punto donde estaba. Un modal lo deja ahí; una página nueva lo saca y lo obliga a volver.
- **Por qué el formulario de módulos sigue en modal pese a ser largo.** Se llena de una vez y no se recorre ni se vuelve a él con un enlace. Lo que lo hace pesado (la vista previa) se resolvió mostrándola al lado y, en celular, alternando con el formulario.
- **Por qué se prohíbe el panel lateral.** Era un tercer tipo de ventana, angosto, con mucho contenido apilado y distinto a los otros dos. Con modal y página alcanza.

## 6. Cómo se cuida

No hay una prueba automática: la elección de modal o página es de diseño y se revisa en cada Pull Request. Quien agregue una pantalla nueva debe poder decir cuál de las cuatro preguntas de la sección 2 la ubicó. La regla está resumida en `docs/requisitos/restricciones.md` (diseño visual).

## 7. Límites

- Los ejemplos de la sección 3 son los del panel del Administrador del Sistema y de lo que se tocó en esta revisión; no se revisaron una por una las pantallas de los otros tres roles.
- La regla no define cuánto debe medir un modal (hoy hay un ancho normal, uno más ancho y uno extra ancho); eso se decide en cada caso con `Modal.tsx`.
- "Trabajo largo" y "tarea corta" son juicios, no medidas. Ante una duda real, se prefiere el modal si se vuelve a la misma pantalla y la página si hay que poder volver con un enlace.
