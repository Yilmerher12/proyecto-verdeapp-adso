# Informe semanal — Semana 02

| Campo | Valor |
|---|---|
| **Scrum Master** | No hubo esta semana (ver la nota) |
| **Fechas** | 17/10/2026 al 03/11/2026 |
| **Presentado al profesor** | No se presentó en su momento; este informe se escribió el 20/11/2026 |

> **Por qué no hubo Scrum Master:** según la rotación, esta semana le correspondía a Juan Carlos Barajas. Por la feria del proyecto, el equipo olvidó hacer el cambio y nadie ejerció el rol: no se asignaron tarjetas por semana, no se hizo seguimiento ni se escribió el informe. Cada integrante trabajó por su cuenta con las tarjetas que ya tenía.
>
> **Cómo se escribió este informe:** de forma retroactiva, solo con el historial de GitHub (issues, PR y fechas). No se agregan dificultades ni estados de ánimo que no se hayan dicho; donde falta información, se indica.

## Resumen de la semana

Fue la semana de la feria. El trabajo se concentró en Yilmer y en Yordan, que cerraron muchas tarjetas de funcionalidad y diseño (rediseño de los paneles por rol, desempeño semanal del conjunto, descarga de la agenda, «Aprende a reciclar» con lecciones vistas e imágenes, y la foto y la tabla de los puntos de acopio). Juan Carlos entregó una investigación y una prueba, y José no tuvo actividad registrada. Los retos del bootcamp de testing de la semana 2 de Juan Carlos, Yilmer y Yordan se cerraron con sus PR el 3, el 4 y el 6 de noviembre; el de José no tiene PR. Lo que no hubo fue seguimiento del equipo.

## Trabajo por integrante

### Yilmer Hernández Camargo (@Yilmerher12)

| Campo | Detalle |
|---|---|
| **Tarjeta o HU** | Unas 50 tarjetas creadas en el periodo, la mayoría cerradas el mismo día o al siguiente. Entre ellas: #486, #487 y #488 (desempeño semanal del conjunto), #479 y #480 (descargar el historial de la agenda en CSV y PDF), #512 a #524 (revisión de los paneles y de soporte técnico), #563 y #602 (pantallas grandes y medianas), #577, #578 y #581 (kebab, tabla y foto de puntos de acopio), #587 (retención de fotos de evidencia) y #588 (actualización final de la documentación). Investigaciones: #459, #521 y #569. Además, el reto del bootcamp de la semana 2 |
| **Rama y PR** | Muchos PR de ramas `feat/`, `fix/` y `docs/`. Del bootcamp: `test/validacion-fecha-evento-tu` — #586 (fusionado el 04/11) |
| **Resultado** | La mayoría terminadas. Quedaron abiertas #519 (ampliar el contenido educativo) y #597 (organizar los módulos educativos) |

- **Exploración y desarrollo:** el detalle de cada tarjeta está en su issue y en su PR. Los temas fueron los descritos arriba.
- **Testing:** #586 agrega pruebas unitarias de `validar_fecha_evento` con valores límite (sin fecha, ayer, hoy, mañana y 365 días).
- **Dificultades y cómo se sintió:** sin información registrada para esta semana.

### Yordan Castro Guerrero (@yordancastrog7-pixel)

| Campo | Detalle |
|---|---|
| **Tarjeta o HU** | #457 y #491 (registro del Administrador de Conjunto y «Solicitar otro conjunto»), #507 (renombrar pestañas de soporte), #539 («Copiar invitación» junto al código de acceso), #541, #542 y #543 («Aprende a reciclar»: «Tu semana», lecciones vistas, portada e imágenes). Además, el reto del bootcamp de la semana 2 (capa API) |
| **Rama y PR** | `feat/redisenar-aprende-a-reciclar` (#544), `feat/guardar-lecciones-vistas` (#545), `feat/portada-e-imagenes-de-leccion` (#546) y `test/semana-02` — #609 (fusionado el 06/11) |
| **Resultado** | Las 7 tarjetas cerradas entre el 23 y el 27/10. Bootcamp: terminado |

- **Testing:** #609 agrega pruebas unitarias de `_calcular_expiracion_sugerida`, la regla que decide cuándo vence un comunicado según su tipo (informativo, urgente, mantenimiento, reciclaje y convocatoria), con valores límite.
- **Dificultades y cómo se sintió:** sin información registrada para esta semana.

### Juan Carlos Barajas (@Juanbarajas90)

| Campo | Detalle |
|---|---|
| **Tarjeta o HU** | #460 — Investigación de los tipos de puntos de acopio en Bogotá y contactos de las ECA. #555 — Pruebas del módulo de residuos (bootcamp, capa BD) |
| **Rama y PR** | `docs/` — #494 (fusionado el 22/10) y `test/modulo-residuos` — #592 (fusionado el 03/11) |
| **Resultado** | #460: terminada (cerrada el 31/10). #555: PR fusionado; el issue sigue abierto |

- **Desarrollo:** el PR #494 dejó `investigacion-tipos-puntos-acopio.md` y `fuente-datos-puntos-acopio-eca.md`, que luego sirvieron para importar el inventario de ECA de la UAESP.
- **Testing:** #592 agrega pruebas del formulario de auditoría del Reciclador (campos vacíos, envío y errores de la API) y pruebas de API y base de datos (422 y 400 si falta un campo o se pasa de 255 caracteres, 201 con los datos completos y la fila guardada). Dejó registrado un hallazgo: quitar una foto de evidencia rompe el formulario, y esa prueba quedó en `it.skip`.
- **Dificultades y cómo se sintió:** sin información registrada para esta semana.

### José Guerrero (@josperaes-dotcom)

| Campo | Detalle |
|---|---|
| **Tarjeta o HU** | Sin tarjeta asignada en el tablero. Bootcamp: reto de la capa Front, sin enlace a PR en la matriz de rotación |
| **Rama y PR** | Sin rama ni PR registrados |
| **Resultado** | Sin actividad registrada |

- **Dificultades y cómo se sintió:** sin información registrada para esta semana.

## Tarjetas bloqueadas

Ninguna se registró como bloqueada. Quedó sin hacer el reto de la capa Front de José (bootcamp).

## Para la próxima semana

- Retomar la rotación del Scrum Master: la semana 3 la lleva Yordan Castro Guerrero.
- Anotar la rotación en un lugar visible para que una semana especial (como la feria) no la haga olvidar.
