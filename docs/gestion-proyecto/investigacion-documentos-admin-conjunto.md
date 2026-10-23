# Investigación — Documentos para acreditar a un Administrador de Conjunto

<!--
  ¿Qué? Investigación del Issue #439: qué documentos pide VerdeApp a quien dice
        administrar un conjunto, si esa lista es la correcta, cómo se verifica y
        qué se le responde a quien escribe.
  ¿Para qué? Que la pantalla de registro y la de "Solicitar otro conjunto" digan
             a personas reales qué papeles preparar con una lista decidida y con
             fuente, no con la suposición con la que se escribió al principio.
  ¿Impacto? La lista baja de cinco documentos a dos, y la forma de pedir el
            acceso cambia de "botón al formulario de contacto" a "correo directo".
            Lo que no se pudo confirmar en una fuente está marcado como tal, y lo
            que decidió el equipo se dice como decisión del equipo, no como hecho
            externo.
-->

**Issue:** [#439](https://github.com/Yilmerher12/proyecto-verdeapp-adso/issues/439)
**Implementación que nace de esto:** [#457](https://github.com/Yilmerher12/proyecto-verdeapp-adso/issues/457)
**Fecha de consulta de las fuentes:** 2026-10-22
**Rama:** `docs/investigacion-documentos-admin-conjunto`

---

## Resumen en cinco líneas

1. La lista que hoy muestra la app tiene **cinco documentos** y se escribió **suponiendo** cuáles eran los que acreditan el cargo; nunca se verificó.
2. La decisión del equipo es pedir **dos**: el **certificado de representación legal de la propiedad horizontal** (expedido por la Alcaldía Local, vigente) y la **cédula ampliada al 150 %**.
3. Esos dos bastan porque el certificado ya lo emite la Alcaldía después de revisar el acta de nombramiento y la aceptación del cargo (Ley 675 de 2001, art. 8), y porque Bogotá tiene un **registro público y gratuito de administradores (RUA)** donde se comprueba por cédula quién es el representante legal activo.
4. El acceso se pide por **correo directo** a `administradorverdeapp@gmail.com` (ya no por el formulario de contacto, que no puede llevar adjuntos); los correos le llegan al Admin del Sistema, que verifica y usa el botón "Habilitar Admin de Conjunto".
5. Los documentos **no se suben a VerdeApp y se eliminan al terminar la revisión**: el equipo lo conversó y decidió mantener esa regla, que ya está en la Política de Privacidad.

---

## Qué se investigó y con qué límites

| Pregunta del issue | Qué se usó | Límite |
| --- | --- | --- |
| 1 a 2 (documentos, quién los expide, costo, vigencia) | Ley 675 de 2001 (arts. 8 y 50) y dos notas oficiales de Bogotá | No se encontró una fuente oficial con la **vigencia** del certificado |
| 3 (datos para cruzar) | El RUA de la Secretaría Distrital de Gobierno y los datos de conjuntos que ya tiene VerdeApp | La herramienta se describió desde la nota oficial; **no se probó** una consulta real |
| 4 (guion) | Redactado a partir de la decisión del equipo | No se probó con un caso real |
| 5 (privacidad) | Política de Privacidad vigente y decisión del equipo | — |

**No realizado:** hablar con administradores reales de conjuntos para confirmar que esos son los papeles que ellos manejan. Es una tarea humana y queda **pendiente** (ver "Lo que falta confirmar").

---

## Respuestas a las cinco preguntas

### 1. ¿Los cinco documentos de la lista son los correctos?

**No.** Se pasa de cinco a dos. La tabla dice qué pasa con cada uno y por qué:

| Documento que pide la app hoy | Decisión | Por qué |
| --- | --- | --- |
| Certificado de existencia y representación legal de la propiedad horizontal (Alcaldía Local, máximo 30 días) | **Se queda**, ahora "vigente" (sin los 30 días) | Es el documento que acredita quién es el representante legal. La Ley 675 (art. 8) dice que lo certifica la alcaldía local. El "máximo 30 días" era una suposición del equipo sin fuente |
| Copia de la cédula por ambos lados | **Se queda**, ahora "ampliada al 150 %" | Identifica a la persona y sirve para buscarla en el RUA (por cédula) |
| Acta de la asamblea o del consejo donde lo nombraron | **Sale** | Para inscribir al administrador, la alcaldía ya exige el acta de nombramiento y la aceptación del cargo (Ley 675, art. 8; [nota de Bogotá, 23-feb-2026](https://bogota.gov.co/mi-ciudad/gobierno/como-inscribir-una-propiedad-horizontal-en-bogota)). Lo que verifica el certificado ya la incluye. *Esto es una inferencia: se confirma al hablar con administradores reales.* |
| Contrato firmado con el conjunto, si lo hay | **Sale** | No es lo que acredita la representación legal; el art. 50 dice que la representación y la administración corresponden al administrador designado, y eso lo prueba el certificado |
| Si administra a nombre de una empresa: certificado de Cámara de Comercio y cédula del representante legal | **Sale** | El RUA permite consultar también por NIT. El caso de una empresa administradora **no queda cubierto por la nueva lista**: ver "Lo que falta confirmar" |

### 2. Para cada documento: quién lo expide, costo y vigencia

| Documento | Quién lo expide | Costo y tiempo | Vigencia |
| --- | --- | --- | --- |
| Certificado de representación legal de la propiedad horizontal | El alcalde local del lugar del conjunto, o quien delegue (Ley 675, art. 8) | El trámite de inscripción es **virtual y sin costo**, en el Sistema Virtual de Trámites y Servicios de la Secretaría Distrital de Gobierno ([nota, 23-feb-2026](https://bogota.gov.co/mi-ciudad/gobierno/como-inscribir-una-propiedad-horizontal-en-bogota)). La nota **no** dice cuánto cuesta ni cuánto tarda sacar la copia del certificado | **No confirmada.** La app dirá solo "vigente" |
| Cédula de ciudadanía | Registraduría Nacional | No investigado (es un documento personal) | La de la persona. "Ampliada al 150 %" es una práctica para que se lea bien, **no** una norma citada |

**Un caso no cubierto:** el art. 8 tiene un parágrafo (agregado por el art. 42 de la Ley 2079 de 2021): los proyectos de vivienda de interés social y prioritario de **cinco unidades o menos** no hacen el trámite de inscripción. Un administrador de un conjunto así **no tendrá** el certificado. Fuente: [Ley 675 de 2001, SISJUR](https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?i=4162).

### 3. ¿Qué datos del correo alcanzan para cruzarlos con los conjuntos oficiales?

El correo pide cuatro datos: **nombre y apellido, correo electrónico, número de contacto y nombre del conjunto**, más los dos adjuntos. Con eso se hacen tres cruces:

1. **La persona contra el registro público.** El **Registro Único de Administradores (RUA)** de la Secretaría Distrital de Gobierno es público y gratuito. Muestra quién administra una propiedad horizontal y **solo los representantes legales en estado activo**, y se busca por cédula, NIT o matrícula inmobiliaria ([nota, 7-mar-2026](https://bogota.gov.co/mi-ciudad/gobierno/herramienta-para-consultar-administradores-propiedad-horizontal-bogota)). Por eso la cédula sirve doble: identifica y permite buscar.
2. **El certificado contra la persona.** El nombre del representante que dice el certificado debe ser el de la cédula.
3. **El conjunto contra los conjuntos de VerdeApp.** Los conjuntos reales ya están cargados (ver [`fuente-datos-conjuntos-reales.md`](fuente-datos-conjuntos-reales.md)).

**Problema del nombre solo.** En los datos de VerdeApp hay **varios conjuntos con exactamente el mismo nombre** (por ejemplo, "ARANJUEZ" se repite muchas veces). El nombre del conjunto **no alcanza** para saber cuál es. **Recomendación:** agregar al correo la **dirección del conjunto** (el formulario de contacto de hoy ya la pedía), y comparar con la dirección que trae el certificado. Esto se decide al implementar #457.

### 4. ¿Qué respondemos, paso a paso, cuando alguien escribe?

Guion para el Admin del Sistema, que recibe los correos con asunto **"Administrador Conjunto"**:

1. **Revisar que el correo esté completo:** los cuatro datos y los dos adjuntos legibles (PDF o foto nítida). Si falta algo, responder pidiendo **solo lo que falta** y no seguir.
2. **Buscar la cédula en el RUA** y comprobar que la persona figura como representante legal activo.
3. **Abrir el certificado** y comprobar que está vigente, que el nombre coincide con la cédula y que el conjunto es el que dice el correo.
4. **Cruzar el conjunto** con los de VerdeApp (nombre y dirección).
5. **Si todo coincide:** usar el botón **"Habilitar Admin de Conjunto"** del panel (invitación de un solo uso por correo, HU-018) y responder avisando que le llegará la invitación.
6. **Si algo no coincide:** responder diciendo **qué dato** no coincidió, sin dar información de otras personas ni de otros conjuntos.
7. **Al terminar, aprobada o rechazada:** borrar el correo con sus adjuntos (ver pregunta 5).

Modelos de respuesta (se ajustan al caso):

- **Falta algo:** "Hola, recibimos tu solicitud. Para continuar nos falta: [lo que falta]. Respóndenos a este correo con eso adjunto."
- **Aprobada:** "Verificamos tus datos. En unos minutos te llegará una invitación para terminar de crear tu cuenta de Administrador de Conjunto."
- **No coincide:** "No pudimos verificar [el dato]. Revisa que el certificado esté vigente y que los datos coincidan con el registro, y vuelve a escribirnos."

### 5. Privacidad: ¿quién elimina los documentos, cuándo y cómo se deja escrito?

- **Quién:** el Admin del Sistema, que es quien recibe los correos.
- **Cuándo:** apenas termina la verificación, sea aprobada o rechazada. **Sin plazo en días**: no hay base para fijar uno.
- **Cómo:** borrar el correo con sus adjuntos y **vaciar también la Papelera** (en Gmail, un correo borrado queda en la Papelera hasta que se elimina de allí).
- **Cómo queda escrito:** ya está en la pantalla de registro ("se eliminan después de la revisión") y en la [Política de Privacidad](../../fe/src/pages/PoliticaPrivacidadPage.tsx), sección 2. Con esta investigación quedan **iguales**, no se cambian.

**Alternativa descartada.** Se propuso guardar los documentos fuera de VerdeApp (por ejemplo en el mismo correo archivado) por si una autoridad los pide, con la regla de la sección 6 de la política (mientras la persona sea administradora y 5 años más). El equipo lo conversó el 2026-10-23 y **decidió mantener la eliminación**. Si el tema vuelve, habría que reescribir esos dos textos y que un asesor legal los revise.

---

## Textos propuestos para la pantalla

Quedan **sin botón**: el correo es un enlace que abre la bandeja de correo con el asunto ya escrito, y al lado va un ícono para copiar la dirección (quien usa el correo en el navegador, y no en una aplicación, no siempre recibe nada al presionar el enlace). Los emojis del borrador se cambian por los íconos de `lucide-react` (`FileText` para el certificado e `IdCard` para la cédula), porque el proyecto solo usa íconos de esa librería.

### Registro del Administrador de Conjunto (`auth.register.adminRequest.*`)

**Español**

- **Título:** Las cuentas de administrador se crean por invitación
- **Introducción:** Las cuentas de administrador se activan bajo estricta verificación. Así garantizamos que nadie pueda tomar el control de tu conjunto sin autorización. Para habilitar tu ingreso, sigue estos pasos:
- **Paso 1. Envía tus documentos por correo:** Antes de registrarte en la app, envíanos un correo a **administradorverdeapp@gmail.com** con el asunto "Administrador Conjunto". En el cuerpo del mensaje escribe tu nombre y apellido, tu correo electrónico, tu número de contacto y el nombre del conjunto que administras. Adjunta únicamente dos documentos, en PDF o en foto nítida:
  - *(ícono `FileText`)* Certificado de Representación Legal de la Propiedad Horizontal (expedido por la Alcaldía Local, vigente).
  - *(ícono `IdCard`)* Copia de tu cédula de ciudadanía (ampliada al 150 %).
- **Paso 2. Recibe tu autorización de ingreso:** Nuestro equipo verificará que tus datos coincidan con el registro oficial de la Alcaldía. Si todo está en orden, te enviaremos una autorización de registro a tu correo electrónico.
- **Aviso de privacidad (no cambia):** Tus documentos nunca se suben a VerdeApp: viajan solo por correo, se usan únicamente para verificar tu identidad y tu cargo, y se eliminan después de la revisión.

**Inglés (propuesta)**

- **Title:** Administrator accounts are created by invitation
- **Intro:** Administrator accounts are activated under strict verification. This way we make sure nobody can take control of your complex without authorization. To enable your access, follow these steps:
- **Step 1. Send your documents by email:** Before signing up in the app, send us an email at **administradorverdeapp@gmail.com** with the subject "Administrador Conjunto". In the body, write your first and last name, your email address, your contact number and the name of the complex you manage. Attach only two documents, as a PDF or a clear photo:
  - Certificate of Legal Representation of the Horizontal Property (issued by the Local Mayor's Office, current).
  - Copy of your national ID (*cédula de ciudadanía*), enlarged to 150 %.
- **Step 2. Receive your access authorization:** Our team will check that your details match the official registry of the Mayor's Office. If everything is in order, we will send a registration authorization to your email.

### "Solicitar otro conjunto" (los mismos cambios, en gemelo)

Misma lista de dos documentos y mismo aviso de privacidad (ya comparten las claves). Se propone, para que el Admin del Sistema distinga la solicitud de una cuenta nueva: **asunto "Otro conjunto"** y, en el cuerpo, además de los cuatro datos, **"Mi correo en VerdeApp"** (la persona ya tiene cuenta). El tercer paso sigue diciendo que el conjunto se asigna a su cuenta y aparece en el panel. *El asunto y ese dato extra son una propuesta, no una decisión del equipo.*

---

## Qué cambia en la aplicación (tarjeta #457)

El issue #457 dice que el botón "Solicitar acceso" **sigue llevando a `/contacto?motivo=admin-conjunto`**. Con esta decisión **eso cambia**: no hay botón y el correo es el canal. Hay que editar #457 antes de implementarlo. Lo que cambia al implementarlo:

- **Pantalla de registro y de "Solicitar otro conjunto"** (`SolicitudAdminConjuntoInfo.tsx`): sin botón; correo como enlace `mailto:` con asunto y cuerpo precargados, y botón de copiar con ícono; dos documentos con íconos `FileText` e `IdCard`.
- **Textos** `auth.register.adminRequest.*` y `dashboards.adminConjunto.otroConjunto.*` en español e inglés; las claves de documentos 3 a 5 se eliminan.
- **El formulario de contacto** deja de recibir los motivos `admin-conjunto` y `otro-conjunto`: sus plantillas (`contactoModal.adminRequest.*` y `contactoModal.otroConjunto.*`) quedan sin uso y se retiran, junto con la validación de plantilla sin llenar.
- **Pruebas:** `RegisterPage.test.tsx`, `AdminConjuntoDashboard.test.tsx` y `ContactoModalPage.test.tsx`.
- **Documentación que describe el comportamiento de hoy y se actualiza entonces, no antes:** [HU-002](../requisitos/HUs/HU-002_registro_de_cuenta.md) (CA-002.7), [HU-018](../requisitos/HUs/HU-018_admin_sistema_invita_admin_conjunto.md) (CA-018.5), [HU-051](../requisitos/HUs/HU-051_admin_conjunto_solicita_otro_conjunto.md) (CA-051.2 y CA-051.3), [RQF-012](../requisitos/RFs/RQF-012_gestion_vinculacion_conjuntos.md) y [`casos-de-uso.md`](../referencia-proyecto/diagramas-UML/casos-de-uso.md).

---

## Lo que falta confirmar

1. **Hablar con administradores reales** para confirmar que el certificado y la cédula bastan, y que no sobra ni falta el acta de nombramiento. Es la tarea humana que el issue pedía y que no se hizo en esta investigación.
2. **Vigencia del certificado.** No hay fuente oficial en lo consultado; la app dice solo "vigente".
3. **Administradores que son una empresa**: la lista de dos documentos no los contempla. Hay que ver qué certifica la alcaldía en ese caso y si basta.
4. **Conjuntos exentos del trámite** (vivienda de interés social o prioritario de cinco unidades o menos): no tienen certificado.
5. **Probar una consulta real en el RUA** con una cédula y con una matrícula, y anotar el resultado.
6. **Dirección del conjunto en el correo.** Decidir si se pide (recomendado, por los nombres repetidos).
7. **Asunto y dato extra de "Otro conjunto".**
8. **Texto en inglés.** Revisarlo antes de publicarlo.

---

## Fuentes

| Fuente | Qué se tomó de ella | Fecha |
| --- | --- | --- |
| [Ley 675 de 2001, arts. 8 y 50 (SISJUR, Alcaldía de Bogotá)](https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?i=4162) | Quién inscribe y certifica la existencia y representación legal; el administrador es el representante legal; parágrafo de la Ley 2079 de 2021 | Consulta 2026-10-22 |
| [Conoce la herramienta para consultar administradores de propiedad horizontal en Bogotá (bogota.gov.co)](https://bogota.gov.co/mi-ciudad/gobierno/herramienta-para-consultar-administradores-propiedad-horizontal-bogota) | RUA: público, gratuito, búsqueda por cédula, NIT o matrícula, solo representantes legales activos | Nota del 2026-03-07 |
| [¿Sabes cómo formalizar una propiedad horizontal en Bogotá? (bogota.gov.co)](https://bogota.gov.co/mi-ciudad/gobierno/como-inscribir-una-propiedad-horizontal-en-bogota) | Quién registra, documentos de la inscripción, trámite virtual y sin costo | Nota del 2026-02-23 |
| Decisión del equipo (2026-10-22 y 2026-10-23) | Lista de dos documentos, correo directo, los correos llegan al Admin del Sistema, eliminar los documentos al terminar la revisión | — |

---

## Documentación actualizada en esta rama

- Este documento.
- Ningún otro. HU-002, HU-018, HU-051, RQF-012 y `casos-de-uso.md` **no se tocaron**: describen el comportamiento actual (cinco documentos, botón al formulario de contacto) y siguen siendo ciertos hasta que se implemente #457.
