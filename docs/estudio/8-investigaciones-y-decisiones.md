# Las investigaciones y decisiones del proyecto

<!-- resumen: Qué preguntas se hizo el equipo antes de construir, qué averiguó, qué decidió y por qué: chat de soporte, conectividad, contenido educativo, documentos del administrador, gráficas, reportes, y las decisiones de diseño y de seguridad. -->

## Cómo leer este documento

VerdeApp no se construyó solo programando. Antes de hacer varias funciones, el equipo **investigó**: leyó normas, midió, comparó opciones y escribió una recomendación. Y cuando una discusión se repetía («¿esto va en una ventana o en una página?»), la **decidió y la dejó por escrito**.

Este documento resume cada una de esas investigaciones y decisiones: **qué se preguntó, qué se encontró, qué se decidió y por qué**. Sirve para dos cosas: para poder explicar con razones por qué VerdeApp es como es, y para ver que las decisiones no fueron caprichos.

No supone que conozcas los temas. Cada término se explica al aparecer y al final hay un glosario.

Orden del documento:

1. Cómo se hace una investigación en VerdeApp.
2. Las siete investigaciones.
3. Las ocho decisiones.
4. Las tres ideas abiertas.
5. Lo que aprendimos del proceso.

## 1. Cómo se hace una investigación en VerdeApp

### 1.1 Qué es una tarjeta de investigación

En el tablero (documento 4) hay un tipo de tarjeta distinto: la **tarjeta de investigación**. Es un issue informativo que **no construye nada**. Su entregable es un documento de la carpeta `docs/gestion-proyecto/` llamado `investigacion-<tema>.md`, que se trabaja en una rama `docs/...`. Si la conclusión cambia un requisito o una historia de usuario, se actualiza en la misma rama; y si concluye que hay que **construir** algo, eso se abre como **un issue aparte**.

**Qué problema resuelve:** sin esto, la primera tarjeta de implementación tendría que volver a investigar lo mismo, o se tomaría una decisión por impulso. Un caso real lo muestra: el proyecto agregó una librería llamada `jspdf` sin una razón clara, y luego la eliminó porque nunca se usó (PR #124). Las investigaciones posteriores citan ese caso para **no repetir el error**.

### 1.2 La estructura de una investigación

Todas siguen más o menos la misma forma:

1. **La pregunta.** Qué se quiere saber, y a veces cómo cambió la pregunta al conversarla.
2. **Qué existe hoy.** Se lee el código y la documentación actuales, para no investigar lo que ya está resuelto.
3. **Las opciones, comparadas.** Una tabla con esfuerzo, costo, riesgo y mantenimiento de cada una.
4. **La recomendación**, con sus razones.
5. **Los límites.** Qué **no** se pudo comprobar, escrito de forma explícita. Esta es una regla del equipo: reconocer un límite se ve mejor que esquivarlo.
6. **Las tarjetas que nacerían.** Qué issues se abrirían si el equipo decide hacerlo (las crea el equipo en GitHub).
7. **Las fuentes**, con fecha de consulta.

### 1.3 Investigación, decisión e idea

Hay tres tipos de documento, con un nombre de archivo que los distingue:

| Tipo | Archivo | Qué es |
|---|---|---|
| **Investigación** | `investigacion-*.md` | Averigua algo que no se sabía y recomienda |
| **Decisión** | `decision-*.md` | Registra una regla ya acordada, para no volver a discutirla |
| **Idea** | `idea-*.md` | Una propuesta con su análisis, **sin** decisión tomada |

### 1.4 El mapa

| Tema | Tipo | Issue | Qué se decidió |
|---|---|---|---|
| Chat o asistente de soporte | Investigación | #521 | Ayuda escrita dentro del formulario; sin chat ni chatbot |
| Conectividad y consumo de datos | Investigación | #459 | Comprimir fotos y otras mejoras; no una app sin conexión |
| De dónde sale el contenido educativo | Investigación | #569 | Fuentes oficiales y videos solo como apoyo |
| Documentos del Administrador de Conjunto | Investigación | #439 | De cinco documentos a dos |
| Gráficas del desempeño | Investigación | #437 | Barras apiladas de 8 semanas con Recharts |
| Reporte del historial de la agenda | Investigación | #438 | CSV y PDF, generados en el backend |
| Tipos de punto de acopio | Investigación | #460 | Entran las ECA; ver el documento 6 |
| Calificación de residentes al reciclador | Decisión | #11 | No se implementa |
| Cuentas del Administrador del Sistema | Decisión | #621 | Una cuenta por persona en producción |
| Ancho de las páginas | Decisión | — | Tres anchos fijos |
| Modal o página | Decisión | #621 | Cuatro preguntas para decidir |
| Carga al filtrar listas | Decisión | #615 | Filas atenuadas con barra de progreso |
| Retención de fotos de evidencia | Decisión | #587 | Plazo propuesto de 6 meses |
| Rediseño de «Aprende a reciclar» | Decisión | #705 | Tres niveles y una página por lección |
| Auditoría de dependencias | Auditoría | — | Corregir lo explotable; documentar lo demás |
| Editor de módulos por tarjetas, color por antigüedad en la agenda | Idea | — | Abiertas, sin decisión |

## 2. Las siete investigaciones

### 2.1 ¿Es viable un chat o un asistente de ayuda? (issue #521)

**La pregunta, y cómo cambió.** El issue preguntaba por un **chat entre personas** (quien pide ayuda y el Administrador del Sistema). Al conversarlo con el equipo se vio que lo que se quería era **un asistente que resolviera las dudas simples solo**, para no tener que contestar cada una a mano. La investigación respondió las dos preguntas.

**Qué existe hoy.** El soporte ya funciona: la persona elige un *motivo* de una lista fija de 14 y escribe su consulta; llega a la bandeja del Administrador del Sistema con una prioridad y un estado, y la respuesta se ve en el historial. **Lo que no existe:** ayuda *antes* de enviar la consulta.

**Qué decisiones ya estaban tomadas.** La propuesta técnica excluye el «chat privado en tiempo real», y el requisito de notificaciones dejó escrito que no se usan WebSockets (conexiones permanentes): la app consulta cada 20 segundos.

**Las seis opciones.**

| | Qué es | Esfuerzo | Problema principal |
|---|---|---|---|
| A | Dejar solo el formulario | 0 h | Crece con los usuarios: cada consulta es trabajo humano |
| B | Página de preguntas frecuentes | 6–10 h | El usuario sale del formulario a buscar |
| **C** | **Ayuda escrita dentro del formulario, al elegir un motivo** | **4–8 h** | Los textos se pueden desactualizar |
| D | Ventana de asistente con botones | 10–14 h | Más código para mostrar el mismo texto que C |
| E | Chat entre personas | más de 20 h | Contradice el alcance; sin alguien respondiendo, es peor que el formulario |
| F | Chatbot con inteligencia artificial | más de 20 h | Respuestas incorrectas y datos enviados a un tercero |

**La decisión: la opción C.** La lista de motivos del formulario **ya es el menú de un asistente**: mostrar la respuesta en ese momento no necesita página, tabla ni dependencia nueva. No crece con los usuarios, no cuesta dinero y no contradice nada.

**Por qué se descartaron E y F:**
- **El chat** solo sirve si alguien contesta al momento, y el equipo son cuatro personas con 10 horas por semana cada una. Sin respuesta inmediata, el usuario ve que no le contestan.
- **El chatbot** lo descartó el equipo por costo, seguridad y calidad. Además, lo que escribe el usuario saldría hacia un servicio externo, y eso es tratamiento de datos personales según la **Ley 1581 de 2012**.

**No todo se puede resolver solo.** De los 13 motivos con tema concreto, la investigación estimó que solo 4 se pueden resolver con una ayuda escrita; otros 3 había que verificarlos. Para los demás, la ayuda dice que lo revisa una persona y lleva al formulario.

**Qué se construyó:** el componente `AyudaMotivo.tsx` muestra la ayuda de los motivos `login`, `notificaciones`, `cuenta`, `falla` y `recicladorAuditoria`, **verificadas contra el código** (por ejemplo, que tras 5 intentos fallidos la cuenta se bloquea 15 minutos). Los demás motivos avisan que los revisa una persona.

**Límites que dijo la investigación:** no se midió tráfico real (no se sabe cuántas consultas llegan), no se cotizó ningún servicio externo y la Ley 1581 se leyó solo en sus definiciones (no es asesoría legal).

### 2.2 ¿Cómo se comporta VerdeApp con mala conexión? (issue #459)

**La pregunta.** Los profesores pidieron pensar qué pasa si los usuarios (sobre todo los recicladores, que trabajan con el celular en un cuarto de basuras) no tienen buena conexión. En lugar de suponer, el equipo **midió**.

**Cómo se midió.** Con el navegador de pruebas (Playwright) emulando un celular, con la versión de producción del frontend, con la caché vacía y con tres redes simuladas: 3G rápida, 3G lenta y sin conexión.

**Qué se encontró.**

| Qué | Resultado medido |
|---|---|
| Primera visita a la aplicación | **1,4 MB**; de ellos, el 67 % son las dos fotos de fondo de la portada |
| Segunda visita | **1,4 KB**: casi nada, porque el servidor le dice al navegador que guarde los archivos un año |
| Iniciar sesión y abrir el panel | de 5 a 11 KB |
| Avisar «llegué» o «SHUT lleno» | unos 3 KB de bajada |
| **Auditoría con 3 fotos** | **8,8 MB de subida**: lo más pesado de toda la aplicación |
| Estar una hora con la app abierta | de 0,08 a 0,5 MB, por las consultas cada 20 segundos |
| **Consumo estimado de un reciclador al mes** | **unos 68 MB**, de los cuales unos 35 son las fotos |

**Qué ve el usuario sin conexión.**
- Si **nunca cargó** la aplicación, no abre: sale la pantalla de error del navegador.
- Si **pierde la conexión** con la app abierta, aparece un aviso claro («No se pudo conectar con el servidor... reintentaremos automáticamente») unos 15 segundos después. La pantalla no se congela y **no se pierde lo escrito**.
- **Lo que no funciona bien:** la auditoría tiene un tiempo máximo de 30 segundos. En 3G rápida, en ese tiempo solo caben unos 2,8 MB de los 8,8 MB; y **cada reintento empieza de cero**. Si una foto de celular pesa más de 2 MB, con esas redes la auditoría podría no enviarse nunca.

**Acceso a datos.** Según el DANE, el 82,7 % de los hogares de Bogotá tiene internet (dato de toda la población). **No se encontró ningún dato público** sobre cuántos recicladores de oficio tienen teléfono con datos, ni sobre la señal dentro de cuartos de basuras; la recomendación fue **preguntarles directamente** y medir la señal visitando un conjunto.

**Las soluciones comparadas** (algunas de las 10):

| Solución | Qué resuelve | Esfuerzo |
|---|---|---|
| **Comprimir las fotos antes de subirlas** | Las fotos son lo más pesado y la causa del fallo en 3G | 6–8 h |
| Aviso inmediato de «sin conexión» | Hoy tarda unos 15 s | 2–3 h |
| Pausar las consultas con la pestaña oculta | Evita gastar datos si el usuario guardó el celular | 3–8 h |
| Bloquear «Auditar ahora» sin llegada reportada | Evita subir 8,8 MB para recibir un error | 1–2 h |
| Imágenes de la portada en WebP | La primera visita baja de 972 KB a 266 KB | 1–2 h |
| App instalable (PWA) y cola de acciones sin conexión | **Se descartaron por ahora** | 16 a más de 24 h |

**Por qué se descartó la cola de acciones sin conexión.** Un aviso como «el SHUT está lleno» enviado **dos horas tarde engaña** a los residentes: es peor que un aviso que falla y se ve fallar, que es lo que pasa hoy con mensajes claros. Y el reintento automático de acciones que modifican datos (escrituras) podría duplicar avisos.

**Un hallazgo que resultó ser un error real.** Al medir se descubrió que en el formulario de auditoría **no se podían adjuntar fotos**: el código vaciaba el campo de archivos antes de que React leyera la lista, que en Chrome es una lista «viva». El equipo lo confirmó a mano y **se corrigió** (copiando los archivos a una lista antes de vaciar el campo), con una prueba que imita ese comportamiento de Chrome. Es un buen ejemplo de para qué sirve medir.

**Qué no verifiqué:** cuáles de las 9 tarjetas que propuso la investigación se construyeron después; las crea el equipo en GitHub y no las revisé una por una.

### 2.3 ¿De dónde sale el contenido educativo? (issue #569)

**La pregunta.** Antes de escribir lecciones nuevas, el equipo necesitaba saber de dónde sacar la información y con cuánta confianza, y si se podía apoyar en videos de creadores como «Marce La Recicladora».

**Qué se encontró.**
- Se identificó **quién rige qué**: el Ministerio de Ambiente (código de colores, residuos de posconsumo), el Ministerio de Vivienda (el servicio de aseo y el Decreto 1381 de 2024 sobre recicladores), la UAESP (aseo y Ecopuntos en Bogotá), la Secretaría de Ambiente (posconsumo en Bogotá), el Acueducto (aceite de cocina usado), la Superservicios y la CRA (vigilancia y regulación).
- Se **leyeron las normas** en su texto, no solo resúmenes.
- Se hallaron **contradicciones entre fuentes**, y se definió una regla para cada una: **cuando una página y una norma se contradicen, se sigue la norma.** Ejemplos: una página de la UAESP decía que la bolsa negra es para «orgánicos y no aprovechables» mientras la Resolución 2184 y la propia UAESP dicen que los orgánicos van en la verde; una página del Ministerio listaba programas que una resolución de 2022 ya derogó; una resolución de baterías de 2009 fue derogada por una de 2025.
- Se detectaron **errores en las seis lecciones de entonces:** decían que los Ecopuntos rotan «semana a semana» (la nota oficial dice cada cuatro semanas) y citaban un decreto de 2016 que el Decreto 1381 de 2024 cambió.

**Los videos.** De los videos de «Marce La Recicladora» solo se pudo leer el título. La postura decidida: **enlazarlos como apoyo, nunca como fuente**; la lección debe servir aunque el video se borre; y se contrastan con la fuente oficial antes de afirmar algo apoyado en ellos.

**Las tres maneras de armar el contenido:** (A) solo fuentes oficiales, (B) fuentes oficiales con videos de apoyo, (C) producir videos propios. **Se eligió la B**, porque es confiable y ameno, y el video se puede quitar sin perder la lección. La C se descartó por exceder el alcance.

**Qué se construyó después.** La investigación dejó cuatro tarjetas y las cuatro se hicieron: reorganizar las lecciones, crear las dos categorías que faltaban (residuos peligrosos del hogar, y aparatos, llantas y baterías), corregir lo que decían las lecciones y redactar los módulos. El catálogo pasó de **6 lecciones a 28 (issue #519) y luego a 33 (issue #707)**.

**Límites:** las normas se leyeron en normogramas (espejos), no en el Diario Oficial; varias normas y fuentes no se pudieron abrir (error 403 o documentos escaneados); y los videos faltan por ver completos.

### 2.4 ¿Qué documentos debe presentar un Administrador de Conjunto? (issue #439)

**La pregunta.** La pantalla de registro mostraba una lista de **cinco documentos** que debía enviar quien dice administrar un conjunto. Esa lista se había escrito **suponiendo** cuáles eran; nunca se verificó.

**Qué se encontró.**
- Según la **Ley 675 de 2001**, la Alcaldía Local certifica la existencia y la representación legal de la propiedad horizontal, **después de revisar** el acta de nombramiento y la aceptación del cargo. Es decir, el certificado ya incluye lo que pedían los documentos extra.
- Bogotá tiene un **registro público y gratuito de administradores (RUA)** donde se puede comprobar, por cédula, quién es el representante legal activo.

**La decisión:** pasar de **cinco documentos a dos**:
1. El **certificado de representación legal** de la propiedad horizontal (vigente).
2. La **cédula ampliada al 150 %**.

Se quitaron el acta, el contrato y el certificado de la Cámara de Comercio. También se quitó una suposición sin fuente («máximo 30 días de antigüedad»).

**Cómo se pide el acceso.** Por **correo directo** (porque el formulario de contacto no puede llevar archivos adjuntos), que le llega al Administrador del Sistema. Él verifica y usa el botón «Habilitar Admin de Conjunto». **Los documentos no se suben a VerdeApp y se eliminan al terminar la revisión**, y eso está escrito en la Política de Privacidad.

**Qué quedó sin confirmar:** hablar con administradores reales para confirmar que esos son los papeles que ellos manejan, y qué pasa cuando administra una empresa (no queda cubierto por la lista nueva). La investigación lo marcó como pendiente.

**Qué se construyó:** el issue #457 actualizó las pantallas de registro y de «Solicitar otro conjunto».

### 2.5 ¿Conviene mostrar las auditorías como gráficas? (issue #437)

**La pregunta.** Cada auditoría guarda nivel, tema, fecha y fotos, pero se veía solo como listas. ¿Se pueden mostrar como gráficas, para quién, cuáles y con qué herramienta?

**Dos datos del issue que ya no eran ciertos.** El código todavía aceptaba un cuarto nivel, «Excelente», que se había unificado con «Bueno»: se retiró para que las gráficas cuenten exactamente tres niveles. Y la regla de frecuencia era distinta a la del issue: el servidor impide auditar el mismo conjunto dos veces en 24 horas, y el panel del reciclador sugiere volver a auditar a los 7 días.

**Qué se encontró.**
- La barra semanal que ya existía **incumplía el requisito de accesibilidad** (RNF-005.2): usaba solo colores sin texto ni ícono. Se retiró.
- Las semanas se agrupaban en UTC pero se mostraban en hora local: un error que se corrigió (defecto D-34 del documento 3).

**Quién necesita las gráficas.** Sobre todo el **Administrador de Conjunto**, que hoy no ve si su conjunto mejora o empeora (cada semana está aislada). Con una gráfica de varias semanas puede decidir: «llevamos cinco semanas en Regular en separación por colores» → publicar un refuerzo. El Residente la ve como motivación. El reciclador no la necesita; el Administrador del Sistema ya tiene sus contadores.

**Qué métricas sirven con pocos datos.** Un conjunto recibe unas 1 a 3 auditorías por semana. Por eso:
- **Sí:** barras apiladas por semana (varias semanas seguidas) y un ranking de temas.
- **No:** una línea con el porcentaje de «Bueno» por semana, porque con 1 a 4 auditorías, **una sola calificación cambia el porcentaje de 100 % a 50 %** y mostraría una caída dramática donde casi nada cambió.
- **No:** el desglose por reciclador, por privacidad (la calificación es del conjunto, no de la persona).

**Decisiones concretas.** **8 semanas** por defecto (dos meses: una tendencia visible y etiquetas legibles), y un **mínimo de 4 auditorías**; con menos, se muestra un aviso en lugar de una gráfica que engañe. Los cálculos van en el backend, con semanas en hora de Bogotá. La librería elegida es **Recharts**, cargada solo cuando se abre la página, y cada gráfica tiene su **tabla equivalente** para lectores de pantalla.

**Qué se construyó:** la página «Desempeño» del Administrador de Conjunto, la sección equivalente del Residente, y después la descarga del desempeño en PDF con la gráfica (issue #558).

### 2.6 ¿Cómo descargar el historial de la agenda? (issue #438)

**La pregunta.** El Administrador de Conjunto lleva una agenda de temas del comité y necesita descargar el historial (pendientes y archivados) para anexarlo al acta.

**Qué se encontró.** En VerdeApp no existía ninguna generación de archivos: solo se *servían* archivos ya subidos. El archivado de temas (en lugar de borrarlos) ya se había construido (issue #435), así que la descarga ya no estaba bloqueada.

**Las decisiones:**
- **CSV primero, PDF después.** El CSV no necesita librería nueva y sirve para analizar datos; el PDF es el documento formal para el acta.
- **Se genera en el backend**, no en el navegador. *Por qué:* el backend ya valida que el administrador solo vea su propio conjunto; filtrar en el navegador podría exponer datos de otros conjuntos. Además mantiene liviano el frontend y evita repetir el caso de `jspdf`.
- **Librería:** `fpdf2` para el PDF (se descartaron WeasyPrint, por ser frágil de instalar en Windows, y Excel como formato propio).
- **Fotos solo como enlace**, nunca incrustadas: pesan mucho, y si el PDF se imprime o se reenvía, la app ya no controla quién ve la foto.
- **Un tope de 500 notas por reporte**, para no generar archivos gigantes.
- **El idioma y el formato de fecha** salen del idioma elegido por el usuario.
- **No se agrega un registro nuevo de descargas**, porque ninguna otra descarga lo tiene: sería inconsistente.

**Qué se construyó:** la descarga del historial en PDF o CSV (historia de usuario HU-049).

### 2.7 ¿Qué tipos de punto de acopio existen? (issue #460)

Esta investigación se explicó completa en el documento 6, sección 5. En resumen: distinguió ECA, bodega privada, Ecopunto, Centro de Cuidado al Reciclador y punto de residuos especiales; encontró que la afirmación de la pantalla («solo 6 de 20 localidades tienen ECA») era falsa para la ciudad; y recomendó que en el directorio entren las ECA, mientras los Ecopuntos y los puntos de posconsumo se muestran como información con enlace.

## 3. Las ocho decisiones

### 3.1 ¿Los residentes califican al reciclador? No (issue #11)

**La propuesta.** Una calificación en los dos sentidos, como en aplicaciones de transporte: el reciclador califica al conjunto, y los residentes también califican al reciclador. El issue ya advertía el riesgo: «calificaciones maliciosas sin motivo».

**Las opciones.**
- **A. Con salvaguardas** (mínimo de calificaciones, promedio, foto, límite de frecuencia). No alcanza.
- **B. No implementarla.**
- **C. Alternativas sin puntaje.**

**Por qué la opción A no alcanza, incluso con salvaguardas:**
1. **La evidencia no es posible.** La auditoría del reciclador lleva fotos porque él está en el cuarto de basuras. El residente casi nunca coincide con el reciclador: va a dejar su bolsa y se va.
2. **Responsabilidad invertida.** Lo que se ve en el cuarto (bolsas rotas, residuos mal separados) depende de cómo entregan *los residentes*. Calificar al reciclador por eso invierte la responsabilidad que VerdeApp intenta enseñar.
3. **Pocas calificaciones, sesgadas.** La mayoría de residentes no calificaría nunca. Las que sí llegarían vendrían, sobre todo, de quienes están molestos, y dos o tres bastan para bajar un promedio.
4. **Poder desbalanceado.** El residente calificaría sin rendir cuentas, mientras el reciclador ya depende del Administrador de Conjunto, que puede revocarlo.
5. **El impacto es real.** Una mala calificación visible puede llevar a que un conjunto revoque la autorización de un reciclador de oficio: una función que usan pocos podría costarle el trabajo a alguien.

**Por qué la comparación con las aplicaciones de transporte no aplica:** allí hay una transacción directa entre dos personas presentes durante todo el viaje, el pasajero paga por un servicio que recibe él mismo, y cada conductor acumula cientos de calificaciones que diluyen las injustas. En VerdeApp no se cumple ninguna de las tres.

**La decisión: no se implementa** (opción B), y se propone la opción C como trabajo futuro:
- **Indicadores objetivos** que la app ya guarda (cada cuánto avisa su llegada, cuánto tarda en liberar el SHUT, si cierra su visita, si audita con regularidad), visibles **solo para el Administrador de Conjunto**.
- **Reporte de incidentes concretos**, con foto obligatoria, que llega solo al Administrador de Conjunto, sin puntaje.
- Opcionalmente, un botón de «agradecer» (solo en positivo).

**Cuándo reabrirla:** si VerdeApp está en producción con suficientes residentes activos para que un promedio sea representativo, **y** aparece una necesidad real que los indicadores y los reportes no cubren.

**Estado:** propuesta pendiente de aprobación del equipo (deuda DT-11, documento 5).

### 3.2 Las cuentas del Administrador del Sistema (issue #621)

**El problema.** Hoy hay **una sola cuenta** de Administrador del Sistema, compartida por todo el equipo, creada por el `seed` con una contraseña que está escrita en el README. En el código no hay forma de crear otra. El issue #317 (preparar el despliegue) pide que el `seed` no corra en producción y que las cuentas de prueba no existan allá, y eso tiene una consecuencia que no estaba escrita: **producción quedaría sin ningún Administrador del Sistema**, y sin él nadie puede invitar administradores, publicar novedades, atender soporte ni crear contenido.

**Por qué una cuenta compartida no sirve en producción:**
1. **No se sabe quién hizo qué:** el registro de acciones de administrador anota el correo, y todo quedaría a nombre de la cuenta compartida.
2. **La contraseña es pública:** está en el historial de git; hay que darla por comprometida.
3. **Quien deja el equipo se lleva la contraseña.**

**Las opciones.**
- **A. Un comando de consola** (`uv run python -m app.crear_admin_sistema`, propuesto) que pide correo y contraseña por consola (para que no queden en el historial del terminal), aplica las reglas de contraseña y crea el usuario. No agrega ninguna pantalla ni ruta, así que no abre puertas de ataque; exige acceso al servidor.
- **B. Invitación desde el panel**, con el mismo mecanismo de las invitaciones de Administrador de Conjunto. Necesita ruta y pantalla nuevas, y **no resuelve el primer administrador**: alguien debe existir para invitar.
- **C. Mantener la cuenta compartida.**

**La decisión, por entorno:**

| Situación | Decisión |
|---|---|
| Desarrollo | Se mantiene la cuenta compartida (C) |
| Producción | **Una cuenta por persona.** La primera se crea con el comando (A) |
| Invitar a otro administrador desde el panel | Opción B, **futura**, cuando haya más de una persona administrando |

**Importante:** el comando **no existe todavía**; la decisión solo lo deja pensado para cuando se active el despliegue.

### 3.3 El ancho de las páginas

**El problema.** Al revisar los paneles se notó que las páginas no tenían el mismo ancho: unas llegaban al borde del área de contenido y a otras les sobraba espacio. Se midió: desde 28 rem hasta 80 rem según la página, y los cuatro paneles sumaban relleno propio de más.

**La causa.** Cada página decidía su ancho por su cuenta; no había una regla por tipo de página.

**Un dato que simplifica todo.** Como la letra base crece con la pantalla y todo está medido en `rem`, desde 1536 px de ancho la pantalla siempre mide 96 rem, sea un computador o el televisor 4K de la feria. Por eso las páginas se diseñan para un máximo de 96 rem y escalan solas.

**La decisión: tres anchos fijos** (`fe/src/config/anchoPagina.ts`):

| Ancho | Medida | Para qué |
|---|---|---|
| `normal` | Todo el área (80 rem) | Paneles, listas, catálogos, administración |
| `lectura` | 48 rem | Listas de avisos de texto y lecciones |
| `formulario` | 32 rem | Formularios cortos |

**Reglas:** una página no escribe su propio ancho máximo ni relleno lateral; el margen lo pone solo el `AppShell`. **Por qué tres:** las páginas se parecen por tipo de contenido, no por página; una línea de texto muy larga se lee mal, y un formulario corto no necesita todo el ancho. Una prueba automática vigila que se cumpla.

### 3.4 ¿Modal o página?

**El problema.** Las solicitudes de soporte del administrador se abrían en una **ventana (modal) más alta que la pantalla**: había que mover la ventana, no se podía volver a ella con un enlace y el número de pendientes no se veía. Además, otros detalles se abrían en paneles laterales angostos que el profesor pidió quitar. Cada pantalla nueva reabría la misma discusión.

**La regla.**

> **Modal** para una tarea corta que se hace sin salir de donde se estaba. **Página** para una lista que se recorre, un trabajo largo, o algo a lo que hay que poder volver.

**Cuatro preguntas, en este orden** (si dos dan resultados distintos, gana la primera):
1. ¿Es una **lista que puede crecer** y se recorre, se filtra o se pagina? → **Página.**
2. ¿Hay que poder **volver a ella o enlazarla**, o mostrar un contador en el menú? → **Página.**
3. ¿Es un trabajo **largo**, de varios pasos y varias sesiones? → **Página.**
4. ¿Es **mirar algo puntual** o una **acción corta**? → **Modal.**

**Reglas técnicas que la acompañan.** Un modal nunca es más alto que la pantalla (tiene scroll interno y la X de cerrar queda fija); un modal sobre otro es excepcional y nunca más de dos capas; **no hay paneles laterales** (se eliminaron).

**Ejemplos:** las solicitudes de soporte son una **página**; asignar un conjunto, invitar a un administrador y confirmar una eliminación son **modales**.

### 3.5 Qué se ve cuando una lista se vuelve a pedir (issue #615)

**El problema.** Al pulsar una pestaña o un filtro, la tabla **borraba todas sus filas** y ponía una línea «Cargando...»; lo de abajo subía y bajaba al llegar los datos, y si el servidor respondía rápido el aviso era un destello de medio segundo.

**La regla.**

| Situación | Qué se muestra |
|---|---|
| **Primera carga**, sin nada que mostrar | Una silueta gris con la forma de la lista (después de esta decisión, issue #644, reemplazó al círculo «Cargando...») |
| **Recarga con filas ya visibles** (filtro, pestaña, página) | Las filas anteriores se quedan **atenuadas y sin clic**, con una **barra de progreso delgada** arriba; al llegar lo nuevo recuperan su opacidad |

Esto cumple el requisito de que toda operación de más de 500 ms muestre un indicador de carga (RNF-004.3), y lo hace un solo componente, `ContenidoRecargable`, sin librerías nuevas. Con la opción «reducir movimiento» del sistema, la transición se desactiva.

### 3.6 Cuánto tiempo se guardan las fotos de evidencia (issue #587)

**El problema.** Cada auditoría guarda hasta 3 fotos de hasta 5 MB (hasta 15 MB), y **nada las borraba**: el almacenamiento crecía sin límite. Además son fotos reales de espacios de uso de los residentes, y la Ley 1581 de 2012 pide conservar los datos solo el tiempo necesario para su finalidad.

**La decisión propuesta.**
- **Plazo: 6 meses** (180 días) desde la fecha de la auditoría.
- **Se borra solo la foto**, no la auditoría. *Por qué:* el historial, la gráfica de desempeño, el ranking de temas y las recomendaciones salen del nivel, el tema y la fecha: ninguno usa la foto. Una fila de auditoría es diminuta; lo que pesa son las fotos.
- Quien abre una auditoría sin fotos ve: «La foto ya no está disponible. Las fotos de evidencia se guardan 6 meses. La calificación y su detalle se conservan».
- **Cómo:** con un comando manual, `app.limpiar_evidencias`; con `--simular` solo lista lo que borraría, sin tocar nada.

**Límites honestos:** el comando es manual y nadie lo corre solo (programarlo va con el despliegue, issue #317); **borrar no se deshace**; no hay copia de las fotos borradas; y **el plazo está pendiente de aprobación** del grupo y del profesor (no es todavía definitivo).

### 3.7 El rediseño de «Aprende a reciclar» (issue #705)

**De dónde se partía.** Abrir una categoría mostraba **todas sus lecciones apiladas en una sola página** (una categoría tenía unas 24 tarjetas) y marcaba como vistas todas las lecciones de la categoría **al cargar**, así que el avance «X de N vistas» contaba lecciones que nadie abrió. Una lección no tenía dirección propia.

**Las decisiones:**
1. **Tres niveles de navegación:** catálogo (las 8 categorías) → categoría (la lista de sus módulos) → lección (un solo módulo).
2. **La lista de módulos es una «lista tipo temario»,** elegida tras comparar tres opciones (lista, cuadrícula de tarjetas y ruta con pasos) con el contenido real en escritorio y celular. Cada fila muestra número o marca de visto, el título completo, una línea de resumen y, si lo tiene, «Con video»; la primera lección sin ver lleva «Sigue por aquí». *Por qué lista:* los módulos son textos parecidos, los títulos son preguntas largas que solo la lista muestra completas, y se lee bien en celular.
3. **Una página propia por lección,** con la ruta arriba («Aprende a reciclar › Categoría › Lección») y botones «Anterior / Siguiente». Se descartó abrirla en una ventana y el diseño de dos paneles.
4. **La dirección usa el identificador interno** de la lección (`/catalogo-educativo/leccion/<id>`), que no cambia aunque se edite el título o se mueva de categoría, así los enlaces de las notificaciones no se rompen.
5. **Una lección se marca como vista solo cuando se abre** (avance real, no al cargar la categoría).

### 3.8 La auditoría de dependencias (24 de agosto de 2026)

**Qué es.** Una **dependencia** es una librería de terceros que usa el proyecto. Una auditoría revisa si alguna tiene una vulnerabilidad conocida y publicada. Se corrió con `pip-audit` (backend) y `pnpm audit` (frontend).

**Qué se encontró.**

| | Antes | Después |
|---|---|---|
| Backend | 24 vulnerabilidades (en 4 paquetes) | 21 (en 1 paquete, sin corrección disponible) |
| Frontend | 92 (1 crítica, 36 altas, 45 moderadas, 10 bajas) | 44 (0 críticas, 16 altas, 20 moderadas, 8 bajas) |

**Qué se decidió.** Se corrigieron **todas las vulnerabilidades que afectaban paquetes que llegan al navegador o al servidor en producción** y tenían corrección. Lo que quedó era, sobre todo, herramientas de desarrollo que nunca se despliegan, o un caso sin corrección posible.

**Un caso explicado: `ecdsa`.** Tenía una vulnerabilidad sin versión corregida, pero llegaba como dependencia de la librería de tokens de entonces. Como **los tokens de VerdeApp se firman con HS256** (clave compartida), no con curvas elípticas, el código vulnerable **nunca se ejecutaba**. Se documentó como **riesgo aceptado**, con su razón. Más adelante, al cambiar de librería de tokens (issue #312), `ecdsa` dejó de estar instalada.

**Qué pasó después.** Lo que en agosto se hacía a mano, hoy lo hace el CI en cada cambio (documento 3), y Dependabot propone actualizaciones.

## 4. Las tres ideas abiertas

Una **idea** es una propuesta con su análisis, pero **sin decisión tomada**. Sirve para resolverla con calma y de forma igual en toda la app, no página por página.

| Idea | Qué propone | Estado |
|---|---|---|
| **Animación al cambiar de pestaña** | Que el contenido no cambie de golpe | **Decidida** el 11 de noviembre (issue #643): desvanecimiento de 150 y 200 ms; hoy es un estándar del documento 7 |
| **Color por antigüedad en la agenda** | Teñir de ámbar las notas que llevan mucho tiempo sin tratarse | **Abierta, sin decisión.** Hoy todas las notas son de una sola tinta neutra, porque un color que no significa nada no se usa |
| **Editor de módulos por tarjetas** | Que el editor de lecciones trabaje con bloques en vez de un solo cuadro de texto | **Abierta, sin decisión** |

## 5. Lo que aprendimos del proceso

1. **Medir y leer antes de decidir cambia las respuestas.** Varias investigaciones corrigieron lo que la aplicación ya afirmaba: «solo 6 de 20 localidades tienen ECA», las fechas de los Ecopuntos, un decreto citado con régimen distinto, y hasta un error que impedía adjuntar fotos.
2. **Descartar también es un resultado.** El chat, el chatbot, la calificación de residentes, la app sin conexión y los paneles laterales se descartaron **con razones escritas**, y la decisión puede reabrirse si cambian las condiciones.
3. **Escribir los límites.** Cada investigación dice qué no pudo confirmar. Eso evita que alguien dé por cierto algo que solo se supuso.
4. **Cuando dos fuentes se contradicen, se sigue la norma.**
5. **No agregar dependencias sin justificar** (el caso `jspdf`), y no repetir cifras que cambian (como la cantidad de puntos de recolección).
6. **Una regla escrita evita volver a discutir.** Las decisiones de modal o página, de ancho y de carga se convirtieron en reglas que una prueba automática o la revisión de cada Pull Request hacen cumplir (documento 7).
7. **Lo que no se hizo se dice.** Varias decisiones están marcadas «pendiente de aprobación» o «el comando no existe todavía».

## Lo que debes saber explicar

Después de leer este documento, deberías poder responder **sin mirar**:

1. ¿Qué es una tarjeta de investigación y qué debe tener un documento de investigación?
2. ¿Por qué se eligió una ayuda escrita dentro del formulario y no un chat?
3. ¿Qué se midió sobre la conectividad y qué se concluyó sobre las fotos de la auditoría?
4. ¿Qué regla se sigue cuando una página y una norma se contradicen?
5. ¿Por qué se decidió no permitir que los residentes califiquen al reciclador?
6. ¿Cuáles son las cuatro preguntas para decidir entre modal y página?
7. ¿Por qué solo se borra la foto de una auditoría y no la auditoría completa?

### Preguntas que te pueden hacer

**¿Por qué no hicieron un chat con inteligencia artificial?**
Por costo, seguridad y calidad de las respuestas; y porque lo que escribe el usuario saldría a un servicio externo, y eso es tratamiento de datos personales (Ley 1581 de 2012). En su lugar hay una ayuda escrita dentro del formulario de soporte.

**¿Cómo saben cuántos datos gasta un reciclador?**
Lo medimos con el navegador de pruebas emulando un celular y redes 3G. Un reciclador gastaría unos 68 MB al mes, la mitad en fotos de auditoría. Con esa medición se encontró que, en 3G, la subida de la auditoría se cortaba, y se propuso comprimir las fotos.

**¿Por qué la lista de documentos del administrador bajó de cinco a dos?**
Porque la Ley 675 de 2001 dice que el certificado de representación legal lo emite la Alcaldía Local después de revisar el acta de nombramiento y la aceptación del cargo, así que el certificado ya incluye lo que acreditaban los otros documentos. Y Bogotá tiene un registro público (RUA) para comprobar al administrador por cédula.

**¿Por qué las gráficas muestran 8 semanas y piden un mínimo de 4 auditorías?**
Ocho semanas son dos meses: una tendencia visible con etiquetas legibles. Con menos de 4 auditorías, cada barra sería una auditoría suelta y no habría patrón, así que se muestra un aviso en lugar de una gráfica engañosa.

**¿Qué hace el comando de limpieza de fotos?**
Borra las fotos de evidencia con más de 6 meses y conserva la auditoría. Con `--simular` solo muestra lo que borraría. Es manual y el plazo está pendiente de aprobación.

**¿Qué pasa con la cuenta del Administrador del Sistema en producción?**
En producción habrá una cuenta por persona, creada con un comando de consola que está propuesto pero todavía no existe. La cuenta compartida es solo para desarrollo, porque su contraseña es pública.

**¿Por qué las páginas tienen solo tres anchos?**
Porque las páginas se parecen por tipo de contenido, no por página: un panel, una lista de texto y un formulario. Tres anchos cubren los casos, y todo está en rem, así que escalan solos al televisor 4K.

## Glosario

- **Auditoría de dependencias:** revisión de las librerías de terceros para detectar vulnerabilidades conocidas.
- **CSV:** archivo de texto con filas y columnas, que se abre en Excel.
- **Decisión (documento):** registro de una regla acordada, para no volver a discutirla.
- **Dependencia:** librería de terceros que usa el proyecto.
- **Idea (documento):** propuesta con su análisis, sin decisión tomada.
- **Investigación (tarjeta):** issue informativo cuyo entregable es un documento; no construye nada.
- **Modal:** ventana que se abre encima de la pantalla.
- **PWA:** aplicación web instalable que puede funcionar sin conexión.
- **RUA:** registro público y gratuito de administradores de Bogotá, donde se comprueba por cédula quién es el representante legal activo.
- **Riesgo aceptado:** un riesgo conocido que se decide no corregir, con su razón escrita.
- **Rem:** unidad de tamaño que escala con la letra base de la página.
- **Tarjeta de implementación:** issue que construye algo que una investigación recomendó.
- **WebSocket:** conexión permanente entre el navegador y el servidor, para mensajes en tiempo real.
