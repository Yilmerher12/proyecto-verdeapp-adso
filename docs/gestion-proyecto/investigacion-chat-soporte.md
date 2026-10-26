# Investigación: ¿es viable un chat o un asistente de ayuda para el soporte técnico?

<!--
  ¿Qué? Investigación del issue #521: comparar qué se puede agregar al soporte
        técnico de VerdeApp para que los usuarios resuelvan dudas simples sin
        que el equipo tenga que contestar cada una.
  ¿Para qué? El equipo pensó en un "chatbox" que ayude a los usuarios solo.
             El issue original preguntaba por un chat entre personas; esta
             investigación aclara esa diferencia y compara las opciones reales
             con lo que el proyecto ya tiene.
  ¿Impacto? Esta tarjeta solo investiga: no cambia código de la aplicación ni
            instala nada. Lo que concluye se abre como tarjetas aparte
            (sección 9).
-->

**Fecha:** 2026-10-23
**Rama:** `docs/investigacion-chat-soporte`
**Cómo se investigó:** leyendo el código y la documentación del proyecto, y una búsqueda sobre la Ley 1581 de 2012. No se midió tráfico real ni se cotizó ningún servicio externo (ver sección 10).

## 1. La pregunta, y cómo cambió

El issue #521 preguntaba si es viable un **chat entre quien pide ayuda y el Administrador del Sistema** (o el Administrador de Conjunto): dos personas escribiéndose. Al conversarlo con el equipo apareció que lo que se quería era otra cosa: **un asistente que resuelva las dudas simples de forma automática**, para no tener que contestar cada una a mano.

Por eso este documento responde dos preguntas:

1. ¿Conviene un chat entre personas? (la pregunta original)
2. ¿Conviene un asistente que responda con textos escritos de antemano? (lo que el equipo quería)

Un chatbot con inteligencia artificial se descarta desde el principio por decisión del equipo (costo, seguridad y calidad de las respuestas). La sección 5 deja escritas las razones.

## 2. Qué existe hoy

El soporte técnico ya funciona así (RQF-021, `docs/requisitos/RFs/RQF-021_novedades_enviadas_admin_sistema.md`):

- El Residente, el Reciclador o el Administrador de Conjunto abre **Soporte técnico → Escribir novedad** (página `/novedades`, `fe/src/pages/NovedadesFeedPage.tsx`) y elige **un motivo** de una lista fija.
- La lista tiene **14 motivos**: 13 con tema concreto y "Otros". Cada rol ve los suyos más 6 comunes: 8 el Residente, 8 el Reciclador y 9 el Administrador de Conjunto, más "Otros" (`fe/src/components/NovedadesEnviadas.tsx`).
- La novedad llega a la bandeja del Administrador del Sistema con una **prioridad** que el sistema calcula según el motivo (Alta, Media o Baja) y un **estado** (Nueva, En revisión o Resuelta).
- El Administrador del Sistema escribe **una respuesta**. El autor la ve en su historial y recibe una notificación.
- Un autor puede tener como máximo 10 novedades sin resolver a la vez y enviar 10 por minuto (RN-008 y RN-009 de RQF-021).

**Lo que no existe:**

- Ninguna ayuda para el usuario *antes* de enviar la consulta. Una búsqueda de "preguntas frecuentes" y "FAQ" en el proyecto no encontró nada.
- Conversación: la respuesta es una sola; el autor no puede replicar sobre la misma consulta.
- Que el Administrador de Conjunto atienda las consultas de su conjunto. Está documentado como pendiente (RN-011 de RQF-021).

**Nota sobre el issue:** el issue dice "ver #512 para saber qué falta". #512 ya está cerrado y lo que pedía (prioridad, estado y respuesta) ya está en el código y en RQF-021.

## 3. Qué ha decidido ya el proyecto sobre chat y tiempo real

- La propuesta técnica (`docs/gestion-proyecto/propuesta-tecnica.md`, sección 3) lista entre las exclusiones: **"No incluye chat privado en tiempo real"**.
- RQF-006 (notificación de llegada del reciclador) dejó escrito que **no se usa Firebase ni WebSockets**: la app consulta sus notificaciones cada cierto tiempo (`fe/src/hooks/usePolling.ts`, 20 segundos).
- Infraestructura de hoy: el backend corre con un solo proceso de `uvicorn` (`be/Dockerfile`), el `nginx.conf` del frontend solo sirve archivos estáticos (no tiene proxy hacia el backend ni configuración de WebSocket), y todavía no hay despliegue a producción (issue #317).

## 4. Las opciones

| | Qué es | Quién contesta |
| --- | --- | --- |
| **A** | Dejar solo el formulario de hoy | Una persona, una consulta a la vez |
| **B** | Página de preguntas frecuentes | Nadie: son textos escritos |
| **C** | Ayuda dentro del formulario: al elegir un motivo se muestra, ahí mismo, una respuesta escrita con los pasos, y el formulario sigue disponible | Nadie en las dudas simples; una persona en el resto |
| **D** | Ventana de asistente aparte, con botones y pasos (como un chat) | Igual que C |
| **E** | Chat entre personas | Una persona, en el momento |
| **F** | Chatbot con inteligencia artificial | Un modelo de IA |

**Aclaración sobre B, C y D.** Las tres usan el mismo contenido: preguntas y respuestas que alguien escribe. Ninguna entiende lo que el usuario escribe con sus palabras; solo muestra el texto que corresponde al motivo elegido. Cambia dónde se muestra y cuánto trabajo cuesta.

### 4.1 Comparación

Las horas son estimaciones **a ojo**, con la escala de `docs/gestion-proyecto/prioridad-y-tamano.md`. No son mediciones.

| | A. Solo formulario | B. Preguntas frecuentes | C. Ayuda en el formulario | D. Ventana de asistente | E. Chat entre personas | F. Chatbot con IA |
| --- | --- | --- | --- | --- | --- | --- |
| **Esfuerzo** | 0 h | M (6 a 10 h) | S a M (4 a 8 h) | M a L (10 a 14 h) | XL (más de 20 h) | XL (más de 20 h) |
| **Costo en dinero** | Ninguno | Ninguno | Ninguno | Ninguno | Ninguno (si es propio) | Recurrente; no se cotizó |
| **Crece con el número de usuarios** | Sí: cada consulta es trabajo humano | No | No | No | Sí: alguien debe estar disponible | El costo crece con el uso |
| **Quién debe estar conectado** | Una persona, cuando pueda | Nadie | Nadie | Nadie | **Una persona, en el horario del chat** | Nadie, pero hay que revisar sus respuestas |
| **Mantenimiento** | El de hoy | Mantener los textos al día | Mantener los textos al día | Textos y flujo | Mensajes, moderación y conexiones | Revisar respuestas, claves y costos |
| **Riesgo principal** | Saturación si crece la base de usuarios | Textos que se desactualizan | Textos que se desactualizan | Más código para el mismo contenido que C | Contradice el alcance; sin atención, el usuario espera | Respuestas incorrectas; datos enviados a un tercero |
| **Contradice una decisión del proyecto** | No | No | No | No | **Sí** (propuesta técnica, exclusión 3) | No lo contradice, pero el equipo lo descartó |

### 4.2 Por qué C y no B ni D

El formulario ya tiene la lista de motivos, y esa lista **es** el menú de un asistente: el usuario ya elige "No puedo iniciar sesión" o "No me llegan las notificaciones". Mostrar la respuesta en ese mismo momento es el asistente, sin página nueva ni ventana nueva:

- **B** hace que el usuario salga del formulario a otra página a buscar su duda. Con C la ayuda aparece donde ya estaba.
- **D** agrega una ventana y un flujo propio para mostrar el mismo texto. Aporta una apariencia de chat, pero ninguna capacidad nueva: no entiende texto libre.
- Con C, el usuario que sí necesita al equipo sigue en el formulario, con el motivo ya elegido, y la consulta llega a la bandeja con su prioridad como hoy.

## 5. Por qué se descartan E y F

**E. Chat entre personas.**

- Contradice la propuesta técnica (exclusión 3) y las decisiones de RQF-006.
- Necesita conexión continua (WebSocket) o consultar cada pocos segundos; guardar cada mensaje; una tabla nueva con migración; notificaciones y pruebas. La infraestructura de hoy (un solo proceso, nginx sin configuración de WebSocket) no está preparada.
- Un chat solo sirve si alguien contesta al momento. El equipo es de cuatro personas con 10 horas por semana cada una (`prioridad-y-tamano.md`); no pueden garantizar un horario. Un chat sin nadie respondiendo es peor que el formulario actual, porque el usuario ve que no le contestan.
- No reduce el trabajo del equipo: lo aumenta.

**F. Chatbot con inteligencia artificial.**

- Lo descartó el equipo por costo, seguridad y calidad de las respuestas.
- Además, el texto que escribe el usuario saldría hacia un servicio externo. Eso es **tratamiento de datos personales** según la Ley 1581 de 2012 (sección 7) y exigiría autorización del titular y una política clara. No se evaluó ningún proveedor ni precio.

## 6. Escalabilidad

La pregunta es qué pasa si VerdeApp crece de unos pocos conjuntos a muchos.

- **Lo manual (A) crece con los usuarios.** Cada consulta necesita que una persona la lea y responda. La bandeja ya ordena por prioridad y pagina, pero eso solo ordena la fila; no reduce el trabajo. Con diez veces más usuarios hay, en general, más consultas para las mismas personas.
- **La ayuda con textos (B, C, D) no crece con los usuarios.** Un texto sirve igual para uno que para mil. Lo único que crece es el número de temas, y cada tema se escribe en español y en inglés, porque el proyecto exige los dos idiomas (`CLAUDE.md`, sección i18n).
- **El formulario no desaparece.** Con C, las dudas simples se resuelven solas y el formulario queda para lo que de verdad necesita a una persona; así llegan menos consultas a la bandeja.
- **Lo que no se sabe:** cuántas consultas llegan y de qué motivo. La base de desarrollo solo tiene datos de prueba. Con usuarios reales, el conteo de novedades por motivo diría cuáles respuestas conviene escribir primero.

## 7. Datos personales (Ley 1581 de 2012)

- La ley define **dato personal** como "cualquier información vinculada o que pueda asociarse a una o varias personas naturales determinadas o determinables", y **tratamiento** como cualquier operación sobre ellos, como la recolección, el almacenamiento, el uso, la circulación o la supresión. (Artículo 3, [texto en el normograma de la DIAN](https://normograma.dian.gov.co/dian/compilacion/docs/ley_1581_2012.htm).)
- **Las opciones B, C y D** muestran textos fijos y **no recogen ningún dato** del usuario: no agregan tratamiento nuevo de datos.
- **La opción E** guardaría cada mensaje: texto libre de personas identificadas. Habría que decidir cuánto tiempo se conservan y quién los ve.
- **La opción F** enviaría esos mensajes a un tercero.
- **El formulario de hoy** sí guarda datos (nombre, conjunto, unidad y el texto de la consulta). Ya existía antes de esta investigación y no cambia con la recomendación.
- Esta sección no es asesoría legal. Es una lectura de las definiciones; si el proyecto se publica de verdad, hay que revisar la política de tratamiento de datos con alguien que sepa.

## 8. Recomendación

**Hacer la opción C: mostrar una ayuda escrita al elegir un motivo, dentro de "Escribir novedad", y mantener el formulario manual como respaldo.** No hacer chat entre personas ni chatbot con IA.

Razones:

1. Es lo más barato (S a M) y no cuesta dinero.
2. Reutiliza lo que ya existe: la lista de motivos es el menú, y el formulario es el respaldo. No hay página, tabla ni dependencia nueva.
3. No crece con los usuarios, que es lo que el equipo pidió ("sin que nosotros nos preocupemos por eso").
4. No contradice ninguna decisión del proyecto y no agrega tratamiento de datos.
5. No cierra la puerta: si más adelante se quiere una ventana de asistente (D), reutiliza los mismos textos.

### 8.1 Qué motivos se pueden resolver solos

No todos. Según lo que se ve en el código y los requisitos hoy, esta es una lectura **inicial** que cada respuesta debe verificar contra la aplicación antes de escribirse:

| Motivo | ¿El usuario puede resolverlo solo? | Base |
| --- | --- | --- |
| `login` | Sí | Existe "¿Olvidaste tu contraseña?"; tras 5 intentos fallidos la cuenta se bloquea 15 minutos (`be/app/services/auth_service.py`) |
| `notificaciones` | En parte | La campanita se actualiza cada 20 segundos (`usePolling.ts`) |
| `cuenta` | En parte | Nombre, teléfono y foto se editan en Mi Perfil; el correo no (RQF-008, RN-001) |
| `falla` | En parte | Pasos generales (recargar, revisar la conexión) |
| `recicladorAuditoria` | En parte | Las fotos solo aceptan jpg, png o webp, hasta 5 MB (`be/app/utils/imagenes.py`) |
| `adminDatos` | Probable | Hay un botón para editar NIT y apartamentos de cada conjunto (issue #513); por verificar |
| `adminCodigo`, `adminApartamentos`, `recicladorConjunto` | Por verificar | Hay que revisar cada flujo en la app |
| `residenteUnidad` | Probablemente no | El conjunto es un campo restringido en el perfil (RQF-008) |
| `residenteShut`, `informacion`, `sugerencia` | No | Requieren que una persona revise o decida |

Para los que no se resuelven solos, la ayuda diría eso y llevaría directo al formulario. Son 4 de los 13 motivos, y otros 3 están por verificar, así que el formulario no se achica a cero.

## 9. Tarjetas que nacerían de esta investigación

No se abren desde Claude Code; el equipo las crea en GitHub si decide hacerlas.

1. **Mostrar una ayuda escrita al elegir un motivo en "Escribir novedad"** (tamaño S a M, prioridad Could o Should). Incluye escribir y verificar los textos en español e inglés, con los valores reales (límites, bloqueos) tomados del código. Ver la sección 8.1.
2. **(Después, solo si hay datos reales)** medir cuántas consultas llegan por motivo, para decidir qué respuestas escribir primero y cuáles ya no hacen falta.
3. **Ya existe, no es nueva:** que el Administrador de Conjunto atienda las consultas de su conjunto (RN-011 de RQF-021). Se relaciona con esta investigación porque reparte la carga de atención.

No se recomienda abrir tarjeta para un chat entre personas, un chatbot con IA ni un servicio externo.

## 10. Límites de esta investigación

- **No se midió tráfico real.** No se sabe cuántas consultas llegan hoy ni de qué motivos; la base solo tiene datos de prueba.
- **No se cotizó ningún servicio externo** (widgets de chat, plataformas de IA). Sus costos y condiciones de datos no se evaluaron. Se descartan por criterio (datos de personas hacia un tercero, dependencia), no por precio.
- **Las horas son estimaciones a ojo**, no mediciones.
- **La tabla de la sección 8.1 es una lectura inicial.** Cada respuesta debe comprobarse contra la aplicación al implementarla.
- **Suposición sobre quién atiende:** se supone que quienes atienden el soporte son los cuatro integrantes del equipo, con las horas que ya tienen. Si en la feria o después atendiera otra persona, cambiaría el peso de A, pero no la recomendación.
- **La Ley 1581** se leyó solo en sus definiciones; esto no es asesoría legal.

## 11. Fuentes

- Código y documentación del proyecto: `docs/requisitos/RFs/RQF-021_novedades_enviadas_admin_sistema.md`, `RQF-006_notificacion_llegada_reciclador.md`, `RQF-008_actualizar_perfil.md`, `docs/gestion-proyecto/propuesta-tecnica.md`, `docs/gestion-proyecto/prioridad-y-tamano.md`, `fe/src/components/NovedadesEnviadas.tsx`, `fe/src/hooks/usePolling.ts`, `be/app/models/novedad_enviada.py`, `be/app/services/auth_service.py`, `be/Dockerfile`, `fe/nginx.conf`.
- Ley 1581 de 2012, artículo 3 (definiciones): [normograma de la DIAN](https://normograma.dian.gov.co/dian/compilacion/docs/ley_1581_2012.htm).
