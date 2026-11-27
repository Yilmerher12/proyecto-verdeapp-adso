# Seguridad y calidad

<!-- resumen: Cómo protege VerdeApp los datos y las cuentas de las personas, y cómo comprobamos que el sistema funciona: pruebas automáticas, cobertura, integración continua y defectos. -->

## Cómo leer este documento

Este documento tiene dos mitades:

- **La seguridad (parte 1):** qué ataques o riesgos existen, qué hace VerdeApp para evitarlos y dónde está cada defensa en el código.
- **La calidad (parte 2):** cómo comprobamos que VerdeApp funciona bien y sigue funcionando después de cada cambio: pruebas automáticas, cobertura, integración continua y registro de defectos.

Igual que en los documentos anteriores, cada término técnico se explica la primera vez que aparece, y al final hay un glosario. No supone que sepas de seguridad ni de pruebas.

# Parte 1. Seguridad

## 1. Cuatro ideas antes de empezar

- **Autenticación:** comprobar **quién eres**. Por ejemplo, con tu correo y contraseña, o con el token de tu sesión.
- **Autorización:** comprobar **qué puedes hacer** una vez que se sabe quién eres. Por ejemplo, un residente puede reportar el SHUT lleno, pero no puede publicar una novedad. La autorización depende del **rol** (documento 1).
- **Vulnerabilidad:** un defecto del sistema que alguien podría aprovechar para hacer algo que no debería (ver datos ajenos, entrar a una cuenta que no es suya).
- **OWASP:** una fundación internacional que publica la lista de las **10 vulnerabilidades más frecuentes y graves** en aplicaciones web (el «OWASP Top 10»). Es el estándar que más se usa para revisar la seguridad de un sistema. La sección 2.10 compara VerdeApp con esa lista.

VerdeApp maneja información delicada: los correos y contraseñas de las personas, la ubicación de conjuntos residenciales y fotos de evidencia de auditorías. Por eso la seguridad no se dejó para el final: se revisó el sistema entero contra el OWASP Top 10, se corrigieron los huecos que aparecieron y se escribieron pruebas automáticas para que no vuelvan.

Para cada defensa explico cuatro cosas: **qué riesgo hay**, **qué hacemos**, **dónde está en el código** y **cómo se puede demostrar**.

## 2. Las defensas, una por una

### 2.1 Contraseñas

**El riesgo:** que alguien consiga una copia de la base de datos (por un descuido, un respaldo filtrado) y pueda leer las contraseñas de todos. Como muchas personas usan la misma contraseña en varios sitios, eso las expondría más allá de VerdeApp.

**Qué hacemos:** **nunca guardamos la contraseña**. Guardamos su *hash*.

- Un **hash** es una huella de texto que se calcula a partir de la contraseña, y de la que **no se puede recuperar la contraseña original**. Para comprobar un inicio de sesión, VerdeApp calcula la huella de lo que la persona escribió y la compara con la guardada. Si coinciden, la contraseña era correcta.
- Usamos un algoritmo llamado **bcrypt**, hecho **a propósito lento**. Calcular una huella tarda unas decenas de milisegundos: para una persona es imperceptible, pero para alguien que quiere probar millones de contraseñas, es una barrera enorme.
- bcrypt agrega a cada contraseña una **sal**: un dato aleatorio distinto para cada una. Gracias a eso, dos personas con la misma contraseña tienen huellas distintas, y no se pueden usar tablas ya calculadas con huellas de contraseñas comunes.
- Las huellas de VerdeApp empiezan con `$2b$12$`: el `12` es el **costo**, que determina cuánto tarda cada cálculo.

**Las reglas de contraseña** (en `be/app/schemas/user.py`): mínimo 8 caracteres, con al menos una mayúscula, una minúscula y un número. También hay un máximo: bcrypt solo usa los primeros 72 bytes de una contraseña, así que una más larga se rechaza en lugar de cortarse en silencio. Se cuentan *bytes* y no caracteres, porque una tilde o una ñ ocupan 2 bytes.

**Dónde está:** `be/app/utils/security.py` (el hash y la comprobación) y `be/app/schemas/user.py` (las reglas).

**Cómo se demuestra:** registrarse con la contraseña `abc` y ver que el sistema la rechaza con un mensaje que explica qué falta.

### 2.2 La sesión: tokens y cookies

**El problema que se resuelve:** cuando una persona inicia sesión, ¿cómo sabe el backend, en las peticiones siguientes, que sigue siendo ella, sin pedirle la contraseña cada vez?

**Qué es un token (JWT):** un texto con tres partes: un encabezado, un contenido y una **firma**. El contenido dice quién es el usuario y cuándo vence. La firma se calcula con una **clave secreta que solo conoce el servidor** y permite comprobar que **nadie modificó el contenido**. Si alguien cambia una letra, la firma ya no coincide y el token se rechaza. El nombre es JWT (*JSON Web Token*).

**Una ventaja importante:** el servidor no necesita guardar una «sesión» por cada usuario. Le basta verificar la firma. A esto se le llama sesión **sin estado** (*stateless*).

**VerdeApp usa dos tokens**, cada uno con un propósito:

| Token | Cuánto dura | Para qué sirve |
|---|---|---|
| `access_token` (de acceso) | 15 minutos | Se manda en cada petición para probar quién eres |
| `refresh_token` (de renovación) | 7 días | Se usa solo para pedir un token de acceso nuevo sin volver a escribir la contraseña |

El de acceso dura poco a propósito: si alguien llegara a robarlo, el daño se acaba en 15 minutos. Y el servidor **rechaza usar un token de renovación como si fuera de acceso**, y viceversa.

**Dónde viaja el token: en cookies con tres protecciones.** Una **cookie** es un dato pequeño que el navegador guarda y manda solo con cada petición. Las de VerdeApp llevan estas marcas:

- **`httpOnly`:** ningún JavaScript puede leer la cookie, ni siquiera el de VerdeApp. Si alguien lograra meter código malicioso en la página (un ataque llamado **XSS**, ver 2.4), no podría robar el token.
- **`SameSite=Strict`:** el navegador **no manda** la cookie en peticiones que se originan en otro sitio web. Es la defensa contra **CSRF**: que un sitio malicioso haga peticiones a VerdeApp usando tu sesión.
- **`Secure`:** en producción, la cookie solo viaja cifrada (por HTTPS). En desarrollo se apaga, porque corre sobre `http://`.

Además, la cookie de renovación **solo se manda a la dirección de renovación**, no a toda la API.

**Cerrar sesión de verdad.** Un token firmado no se puede «des-firmar»: sigue pareciendo válido hasta que vence. Para que cerrar sesión funcione, cada token lleva un identificador único (`jti`) y, al cerrar sesión, ese identificador se anota en la tabla `tokens_revocados`. El backend la consulta en cada petición. Es **la única parte con estado** del sistema: una decisión consciente que sacrifica algo de «pureza» para que cerrar sesión realmente cierre.

**Tokens de renovación de un solo uso.** Cada vez que se usa un token de renovación para pedir uno nuevo, el anterior queda invalidado. Si alguien copió uno viejo, ya no sirve. Y si dos pestañas lo piden a la vez, solo una gana (la operación es atómica: ocurre completa o no ocurre).

**Versión de sesión.** Cada usuario tiene un número, `version_sesion`, y cada token lo lleva. Cuando la persona **cambia o restablece su contraseña**, ese número sube y **todos sus tokens anteriores dejan de servir al instante**. Así, si alguien le robó la sesión, cambiar la contraseña lo saca.

**Dónde está:** `be/app/utils/security.py`, `be/app/routers/auth.py` y `be/app/dependencies.py`.

**Cómo se demuestra:** iniciar sesión, copiar un token de renovación, usarlo una vez, y comprobar que la segunda vez el backend lo rechaza. Hay una prueba automática de esto (`test_refresh_token_solo_sirve_una_vez`).

### 2.3 Control de acceso: que cada quien vea solo lo suyo

**El riesgo:** que alguien vea o haga lo que no le corresponde. Por ejemplo, que un residente consulte las auditorías de otro conjunto, o que un reciclador revoque a otro. Es la vulnerabilidad más frecuente en aplicaciones web y el número 1 de la lista OWASP.

**Qué hacemos, en tres capas:**

1. **El usuario se identifica siempre por su token firmado**, nunca por un identificador que llegue en la dirección o en los datos de la petición. Si el identificador viniera de la petición, cualquiera lo cambiaría a mano.
2. **Cada endpoint exige un rol** (con `require_role`, documento 2).
3. **Además se comprueba la pertenencia:** un residente solo ve su propio conjunto; un administrador de conjunto solo tiene acceso mientras su asignación esté activa (sin fecha de desvinculación); un reciclador solo ve el detalle de las auditorías que él mismo envió.

**Cómo se demuestra:** iniciar sesión como residente y pedir a mano los datos de otro conjunto: el backend responde `403` o `404`.

### 2.4 Validación de entrada, inyección SQL, XSS y enlaces

**Validación.** Nada entra al sistema sin pasar por un esquema (documento 2). Los textos tienen **el mismo máximo que su columna** en la base de datos: así, un texto demasiado largo se rechaza con `422` y no rompe la base con un error `500`. Los nombres solo admiten letras, espacio, apóstrofe, punto y guion.

**Inyección SQL.**
- *El riesgo:* que un texto escrito por el usuario se mezcle con la consulta a la base de datos y esta lo ejecute como una orden. Por ejemplo, alguien escribe `'; DROP TABLE usuarios; --` en un campo.
- *Qué hacemos:* usamos el ORM SQLAlchemy, que manda los valores **separados** del texto de la consulta. Así, ese texto se guarda como cualquier otro texto y no se ejecuta.

**XSS (inyección de scripts).**
- *El riesgo:* que la página muestre un texto escrito por un usuario como si fuera código y lo ejecute. Un atacante podría escribir un comentario con código que se ejecuta en el navegador de quien lo lee.
- *Qué hacemos:* React **escapa** el texto por defecto (lo muestra como texto, no como código).

**Enlaces e imágenes.** Algunas partes de VerdeApp muestran enlaces o imágenes que vienen de los datos (el enlace de un video de una lección, la imagen de un comunicado). Una dirección maliciosa podría llevar a un sitio de estafa o intentar leer archivos del servidor. Por eso solo se muestran enlaces que sean **archivos propios de VerdeApp** (`/uploads/...`) o direcciones `https://` de sitios permitidos. El frontend lo comprueba (`fe/src/lib/enlaceSeguro.ts`) y **el backend aplica las mismas reglas** (`be/app/utils/enlaces.py`), porque el frontend se puede saltar. Se bloquean casos engañosos, como `//sitio-malo.com` o la ruta disfrazada `/uploads/%2e%2e/api/...` (`%2e%2e` es `..` escrito en código, que intentaría salir de la carpeta). También se bloquea `youtube.com.sitio-malo.com`, que parece YouTube pero es otro dominio.

### 2.5 Fuerza bruta, bloqueo de cuentas y enumeración de usuarios

**Fuerza bruta:** probar muchísimas contraseñas hasta acertar una. VerdeApp tiene **dos defensas que se complementan**:

1. **Límite de peticiones por dirección IP** (con la librería `slowapi`). Una *IP* es la dirección de red del computador que hace la petición. Los límites actuales son:

| Endpoint | Límite |
|---|---|
| Iniciar sesión (`/login`) | 10 por minuto |
| Registro, cambio de contraseña, recuperar contraseña, restablecerla y verificar correo | 5 por minuto cada uno |
| Renovar sesión (`/refresh`) | 30 por minuto |
| Formulario de contacto | 3 por minuto |
| Subir archivos | 30 por minuto |
| Invitar recicladores a un conjunto | 20 por hora |

Al pasarse, el backend responde `429`.

2. **Bloqueo por cuenta.** **5 intentos fallidos seguidos** contra el mismo correo bloquean esa cuenta **15 minutos**, vengan de una o de mil direcciones IP distintas. Cuando el bloqueo vence, el contador se reinicia.

**Enumeración de usuarios:** descubrir qué correos están registrados en el sistema. Si al fallar el inicio de sesión VerdeApp dijera «ese correo no existe», un atacante podría probar listas de correos y saber cuáles tienen cuenta. Por eso:

- El mensaje al fallar es **siempre el mismo** («Credenciales incorrectas»), sin importar si falla el correo o la contraseña. Incluso una cuenta bloqueada responde igual.
- Registrarse con un correo que ya existe **responde igual que un registro nuevo**, y al dueño real del correo se le avisa por correo (como máximo una vez por hora).

**Ataque de temporización.** Aun con el mismo mensaje, si el sistema tardara menos cuando el correo no existe, se podría deducir cuáles existen midiendo el tiempo de respuesta: calcular un bcrypt tarda decenas de milisegundos, y no calcularlo es instantáneo. Por eso el código **siempre calcula la comparación de bcrypt**, aunque el usuario no exista (contra una huella de relleno). Así, los dos casos tardan lo mismo. Este fue un hueco real que se encontró en una auditoría propia y se corrigió.

### 2.6 Fotos y archivos subidos

**El riesgo:** que alguien suba un archivo peligroso con extensión de imagen, o que llene el almacenamiento del servidor.

**Qué hacemos:**

- **Se comprueba el contenido real del archivo.** La librería Pillow abre el archivo para verificar que de verdad es una imagen. No basta con confiar en el nombre (`foto.jpg`) ni en el tipo que el navegador declara.
- **Límites:** máximo 5 MB y 25 millones de píxeles (para evitar «bombas de descompresión»: imágenes pequeñas en peso que al abrirse ocupan muchísima memoria), y solo formatos JPG, PNG o WEBP. Un archivo dañado responde `400`, no tumba el servidor.
- **Cuota por usuario:** un límite de archivos por minuto y por día, contado en la tabla `archivos_subidos`. Por ejemplo, un residente no puede subir más de 3 archivos por minuto.
- **Los documentos se sirven como descarga** (cabecera `Content-Disposition: attachment`) y con una política (`Content-Security-Policy: default-src 'none'; sandbox`) que les prohíbe ejecutar nada.
- **Limpieza:** una herramienta manual borra las fotos que ninguna fila de la base de datos usa, y otra puede borrar las fotos de evidencia con más de 6 meses conservando la auditoría.

**Dónde está:** `be/app/utils/imagenes.py` y `be/app/services/cuota_subidas_service.py`.

### 2.7 Cabeceras de seguridad, CORS y configuración

**Cabeceras de seguridad.** Una **cabecera** es una línea de información que acompaña a cada respuesta del backend. El backend agrega a todas estas:

| Cabecera | Qué evita |
|---|---|
| `X-Content-Type-Options: nosniff` | Que el navegador «adivine» que un archivo subido es de otro tipo (por ejemplo, tratar una imagen como un programa) |
| `X-Frame-Options: DENY` | *Clickjacking*: que otro sitio muestre VerdeApp dentro de un marco invisible y engañe a la persona para que pulse botones sin saberlo |
| `Referrer-Policy` | Que se filtren direcciones completas (que podrían contener datos) hacia otros sitios |
| `Permissions-Policy` | Acceso a la cámara, el micrófono o la ubicación, que VerdeApp no usa |

**CORS:** el backend solo acepta peticiones de **una lista explícita de direcciones**, nunca de «cualquiera» (`*`). En producción esa lista se toma de la variable `FRONTEND_URL`.

**Secretos:** las contraseñas, la `SECRET_KEY` (la clave con la que se firman los tokens) y las credenciales del correo viven en un archivo `.env` que **nunca se sube al repositorio**. La `SECRET_KEY` debe tener **al menos 32 caracteres** y no puede ser el valor de ejemplo, o el backend ni arranca.

**Otras decisiones de configuración:**
- `ENVIRONMENT` es **obligatoria** (`development` o `production`): sin ella, el backend no arranca. Antes era opcional y el sistema podía arrancar en modo desarrollo por accidente.
- Las **cuentas de prueba** solo se crean en `development`.
- La página de documentación automática de la API (`/docs`) está **apagada en producción**.

### 2.8 Registro de eventos de seguridad

**El riesgo:** que ocurra un ataque y nadie se entere.

**Qué hacemos:** el archivo `be/app/utils/audit_log.py` registra los eventos importantes: inicios de sesión exitosos y fallidos, cambios de contraseña, cierres de sesión, accesos denegados y acciones de los administradores. Cada evento se escribe en **JSON, una línea por evento**, con el correo **enmascarado** (por ejemplo `re***@correo.com`) y **nunca con tokens ni contraseñas**. Una prueba automática comprueba que en producción el registro no contenga tokens ni correos completos.

### 2.9 Tokens de un solo uso, dependencias y datos personales

**Tokens de un solo uso con hash.** Los enlaces que se mandan por correo (verificar la cuenta, recuperar la contraseña, aceptar una invitación) llevan un token. En la base de datos **no se guarda ese token, sino su hash** (sha256). Así, quien llegara a leer la base de datos no podría usar esos tokens para activar cuentas ajenas ni cambiar contraseñas.

**Dependencias.** Todas las librerías tienen versión exacta, y en cada cambio se corre una **auditoría automática** (`pip-audit` para el backend y `pnpm audit` para el frontend) que revisa si alguna tiene una vulnerabilidad conocida y publicada. **Dependabot** propone actualizaciones cada semana. Hay una sola alerta ignorada de forma temporal (de la librería `picomatch`, que solo afecta herramientas de desarrollo), registrada y comentada en `fe/pnpm-workspace.yaml`.

**Datos personales.** El contacto del Administrador de Conjunto se pide por correo con dos documentos (certificado de representación legal y cédula) que se **eliminan al terminar la revisión**. La Política de Privacidad describe este tratamiento, y una investigación del equipo analizó la **Ley 1581 de 2012** (protección de datos personales en Colombia). El aviso «SHUT lleno» es anónimo para quien lo recibe: no muestra quién lo envió.

### 2.10 Resumen frente al OWASP Top 10

| # | Categoría de OWASP | Qué significa | Cómo responde VerdeApp |
|---|---|---|---|
| A01 | Control de acceso roto | Que alguien haga lo que no le corresponde | Token firmado + rol + pertenencia en cada endpoint |
| A02 | Fallos criptográficos | Datos sensibles mal protegidos | bcrypt, tokens firmados, `SECRET_KEY` de 32+ caracteres |
| A03 | Inyección | Datos del usuario ejecutados como código | ORM con consultas parametrizadas + validación |
| A04 | Diseño inseguro | Faltan defensas por diseño | Límites de peticiones, bloqueo de cuenta |
| A05 | Mala configuración | Configuraciones inseguras por defecto | CORS explícito, `/docs` apagado en producción, cabeceras |
| A06 | Componentes vulnerables | Librerías con fallos conocidos | Versiones exactas, auditorías automáticas, Dependabot |
| A07 | Fallos de autenticación | Inicio de sesión débil | Bloqueo de cuenta, mismo mensaje y mismo tiempo de respuesta |
| A08 | Integridad de datos | Datos o código alterados sin control | Tokens firmados, migraciones versionadas |
| A09 | Falta de registro | Ataques que nadie nota | Registro de eventos en JSON, creado desde cero |
| A10 | SSRF | Que el servidor sea engañado para pedir direcciones internas | No aplica: el backend no pide direcciones elegidas por el usuario |

El detalle, con archivo y línea de cada defensa, está en `docs/conceptos/owasp-top-10.md`.

### 2.11 Lo que NO tenemos (honestidad)

Estas son las limitaciones que debes conocer y poder explicar:

- **No hay autenticación de dos factores** (pedir un segundo dato, como un código al celular, además de la contraseña).
- **No hay HTTPS propio.** Corremos en HTTP local. En un despliegue real habría que poner certificados; la cookie ya está preparada para exigir `Secure` fuera de desarrollo.
- **La firma de los tokens es simétrica (HS256):** una sola clave firma y verifica. Es suficiente para un backend único.
- **No hubo una prueba de penetración profesional.** Hicimos auditorías propias contra el OWASP Top 10 y las documentamos.
- **El límite de peticiones vive en la memoria del programa.** Si hubiera varias copias del backend, cada una contaría por separado (es la deuda técnica DT-05, documento 5).
- **CORS acepta cualquier método y cabecera,** aunque el origen sí es una lista explícita (DT-14).

# Parte 2. Calidad y pruebas

## 3. Qué es una prueba automática y por qué importa

Una **prueba automática** es un programa que ejecuta una parte de VerdeApp y **comprueba que el resultado sea el esperado**. Por ejemplo, una prueba intenta iniciar sesión cinco veces con una contraseña incorrecta y comprueba que la sexta vez la cuenta esté bloqueada.

**Qué problema resuelve:** cada vez que se cambia algo, existe el riesgo de romper algo que ya funcionaba (esto se llama **regresión**). Probar todo a mano después de cada cambio es imposible: VerdeApp tiene 104 endpoints y muchísimas pantallas. Las pruebas automáticas lo hacen en minutos y sin olvidarse de nada.

**Regla del equipo:** toda funcionalidad nueva lleva sus pruebas antes de darse por terminada, y un defecto corregido deja una prueba que lo habría detectado.

### 3.1 Los tres grandes tipos de prueba

- **Prueba unitaria:** comprueba una pieza pequeña y aislada (una función).
- **Prueba de integración:** comprueba que varias piezas funcionan **juntas** (por ejemplo, un endpoint con su servicio y la base de datos real).
- **Prueba de extremo a extremo (E2E):** simula a una persona usando la aplicación completa en un navegador real, desde la pantalla hasta la base de datos.

## 4. Los niveles de prueba de VerdeApp

El **plan de pruebas** (`docs/pruebas/plan-de-pruebas.md`) define seis niveles:

| Nivel | Qué verifica | Herramienta | Dónde vive |
|---|---|---|---|
| **1. API e integración (backend)** | Que cada endpoint responda lo correcto, respete los permisos, valide y aplique las reglas, **contra una base de datos PostgreSQL real** | `pytest` | `be/app/tests/` |
| **2. Componentes y lógica (frontend)** | Que cada pantalla y componente muestre lo esperado y reaccione a lo que hace el usuario, en un navegador simulado | `Vitest` + Testing Library | `fe/src/__tests__/` |
| **3. Extremo a extremo** | Flujos completos en un navegador real | `Playwright` | `e2e/tests/` |
| **4. Estáticas** | Errores de estilo, de tipos y comunes, **sin ejecutar** el código | `ruff`, `tsc`, `eslint` | `be/`, `fe/` |
| **5. Seguridad** | Límites de peticiones, enlaces, que los registros no guarden tokens, y auditoría de dependencias | `pytest`, `pip-audit`, `pnpm audit` | `be/app/tests/` y CI |
| **6. Calidad visual y accesibilidad** | Contraste de colores, pantallas medianas, tableta, celular y navegadores | Revisión manual + una prueba automática | `docs/gestion-proyecto/auditoria-*.md` |

**Qué tipos de caso se escriben:** camino feliz (todo sale bien), datos inválidos, valores límite (por ejemplo, 100 ids como máximo en una petición), permisos por rol (cada rol permitido y al menos uno prohibido) y seguridad (enlaces externos, rutas con `..`, reintentos).

### 4.1 El ambiente de pruebas está separado del de desarrollo

**El problema:** si las pruebas usaran la misma base de datos con la que trabajamos a mano, podrían borrar o ensuciar esos datos.

**Qué hacemos:**

| Aspecto | Desarrollo | Pruebas |
|---|---|---|
| Base de datos | `verdeapp_db` en el contenedor `verde_db` (puerto 5433) | `verdeapp_test_db` en **su propio contenedor** `verde_db_test` (puerto 5434, sin volumen: no guarda nada al apagarse) |
| Cómo se arma | Migraciones y `app.seed` | `pytest` vacía la base y corre **las mismas migraciones** de la base real al empezar; **cada prueba corre dentro de una transacción que se deshace al final** |
| Correo | Mailpit captura los correos | Igual, no salen a internet |
| En GitHub (CI) | No aplica | Una base PostgreSQL 17 temporal en cada ejecución |

Si la base de pruebas no existe, `pytest` se detiene con un mensaje claro en lugar de tocar otra base; el nombre de la base debe contener `_test`. Por eso, **las pruebas del backend no se pueden correr dos a la vez**: comparten esa base.

### 4.2 Cobertura

La **cobertura** es el **porcentaje de líneas de código que las pruebas ejecutan** al correr. Una cobertura de 97 % significa que de cada 100 líneas, las pruebas pasan por 97. No garantiza que no haya errores (una línea puede ejecutarse sin que se compruebe bien), pero una línea que ninguna prueba toca es un lugar donde un cambio puede romper algo sin que nadie lo note.

**Umbrales.** Un **umbral** es el mínimo exigido: si la cobertura baja de ahí, la suite falla. Hoy:

| Capa | Umbral |
|---|---|
| Backend | 97 % de líneas (`fail_under` en `be/pyproject.toml`) |
| Frontend | 89 % de líneas, 87 % de sentencias, 84 % de ramas y 83 % de funciones (`thresholds` en `fe/vite.config.ts`) |

**La regla del equipo:** los umbrales **solo suben, nunca bajan**. Al cerrar cada semana del bootcamp de testing (sección 8), se mide la cobertura real y el umbral de la semana siguiente es ese valor redondeado hacia abajo.

### 4.3 Resultados

Las cifras más recientes registradas:

| Capa | Pruebas | Resultado | Cobertura | Fuente y fecha |
|---|---|---|---|---|
| Backend (`pytest`) | 1046 | Todas pasan | 97,54 % de líneas | `docs/matriz-rotacion.md`, 24 de nov de 2026 |
| Frontend (`vitest`) | 1127 | Todas pasan | 89,42 % de líneas | `docs/pruebas/informe-pruebas-automatizadas.md`, 23 de nov de 2026 |
| E2E (`playwright`) | 2 | Pasan | — | informe del 20 de nov de 2026 |

Además, `ruff`, `tsc` y `eslint` (verificación estática) terminan sin errores.

> **Estas cifras cambian cada semana** porque el bootcamp agrega pruebas. Para citarlas, vuelve a correrlas (sección 11).

La ejecución completa del 20 de noviembre, con la tabla de **42 casos de prueba distintos** (cada uno con su archivo, qué verifica y a qué historia de usuario responde), está en `docs/pruebas/informe-pruebas-automatizadas.md`.

### 4.4 Ejemplos de pruebas reales, explicados

Cada uno de estos casos existe como una prueba automática en el repositorio:

1. **Bloqueo tras 5 intentos** (`test_bloqueo_tras_5_intentos_fallidos_responde_igual`): hace 5 intentos fallidos y comprueba que la cuenta se bloquea y que el servidor responde **igual** que ante una contraseña mala, sin revelar el bloqueo (para no ayudar a un atacante).
2. **Token de renovación de un solo uso** (`test_refresh_token_solo_sirve_una_vez`): usa un token de renovación y comprueba que reusarlo es rechazado.
3. **El backend no arranca sin configuración** (`test_rechaza_arrancar_sin_environment`): comprueba que, si falta la variable `ENVIRONMENT`, el backend se niega a arrancar.
4. **Enlaces engañosos** (`test_adjunto_invalido[//sitio-malo.com/phishing]`): comprueba que un enlace que apunta a otro sitio se rechaza.
5. **Una auditoría sin fotos** (`test_sin_fotos_de_evidencia_devuelve_422_y_no_guarda_nada`): comprueba que se rechaza con `422` **y que no queda nada guardado**, ni la auditoría ni los avisos.
6. **El reciclador no audita sin haber avisado su llegada** (`test_no_puede_auditar_sin_haber_avisado_llegada`): comprueba la regla de negocio que une los avisos con la auditoría.
7. **Una ruta protegida sin sesión** (frontend, `ProtectedRoute.test.tsx`): comprueba que entrar a una pantalla privada sin sesión redirige a `/login`.
8. **Ninguna cadena de migraciones rota** (`test_ningun_id_de_migracion_se_repite`): comprueba que ninguna migración repite el identificador de otra, porque eso rompería la instalación en una base nueva.

## 5. Integración continua (CI)

**Qué es:** la **integración continua** es un sistema que, cada vez que alguien sube un cambio, **corre automáticamente** las revisiones y las pruebas en un servidor temporal, y muestra el resultado (aprobado ✅ o fallido ❌) en la propia solicitud de cambio. En VerdeApp lo hace **GitHub Actions**, configurado en `.github/workflows/ci.yml`.

**Qué problema resuelve:** antes, dependía de que alguien se acordara de correr todas las pruebas a mano antes de aprobar un cambio. Con la integración continua, nadie tiene que acordarse.

**Qué corre, en cada Pull Request hacia `develop`, `stg` o `main`:**

- **Backend:** `ruff` (estilo y errores comunes), `pytest` (las pruebas, contra una base PostgreSQL temporal) y `pip-audit` (vulnerabilidades en las dependencias).
- **Frontend:** `tsc` (comprobación de tipos), `eslint` (estilo), `vitest` (las pruebas), `pnpm build` (que compile para producción) y `pnpm audit` (vulnerabilidades), también sobre la carpeta `e2e/`.

**Seguridad del propio CI:** el flujo usa el principio de **mínimo privilegio** (solo puede leer el código), no deja guardado el token de GitHub y usa versiones exactas de las herramientas.

**Un límite honesto:** hoy solo la rama `stg` exige una revisión antes de aceptar cambios. En `main` y `develop`, que el CI esté en verde es un acuerdo del equipo, no algo que GitHub imponga (deuda DT-08, documento 5).

## 6. Defectos: cómo se registran y se corrigen

Un **defecto** es un comportamiento del sistema que no cumple un requisito, o que daña la seguridad, la integridad de los datos o el uso. Se registra con su **severidad** (qué tan grave es) y su **estado**.

**Escala de severidad:**

| Severidad | Cuándo se usa | Prioridad en el tablero |
|---|---|---|
| Crítica | Compromete cuentas o datos, o deja el sistema sin poder usarse | P0 |
| Alta | Falla de seguridad que expone cuentas o datos, pérdida o daño de datos, o un flujo principal que se rompe | P0 |
| Media | Falla funcional o de uso que tiene una alternativa, o un refuerzo de seguridad sin riesgo directo | P1 |
| Baja | Detalle visual o de redacción sin efecto en el uso | P2 |

**Estados:** *Abierto*, *En corrección* (con su rama y su solicitud de cambio en revisión) y *Cerrado* (corregido, con su prueba, e integrado a `develop`).

**El ciclo de un defecto:** (1) se **detecta**; (2) se abre una rama `fix/` de una sola tarjeta; (3) se **corrige** y se escribe una **prueba que lo habría detectado**; (4) el CI **verifica** que todo siga pasando; (5) se integra y queda **cerrado**.

### 6.1 El registro de defectos

El registro (`docs/pruebas/reporte-ejecucion-y-defectos.md`) tiene **36 defectos cerrados** y **0 abiertos** al 23 de noviembre de 2026. Son una selección de los 107 PR de ramas `fix/` integrados:

| Severidad | Cerrados |
|---|---|
| Crítica | 1 |
| Alta | 18 |
| Media | 14 |
| Baja | 3 |

Por tipo: 14 de seguridad, 11 funcionales, 4 de integridad de datos, 2 de accesibilidad, 2 de interfaz, 1 de infraestructura, 1 de configuración y 1 de prueba intermitente.

### 6.2 Dos ejemplos del ciclo completo

**Ejemplo 1: D-35 (severidad Alta, integridad de datos).**
- *Detectado:* una migración repetía el identificador de otra, y eso rompía `alembic upgrade head` al instalar en una base nueva (aunque en las bases ya migradas parecía funcionar).
- *Corregido:* en el PR #650.
- *Verificado:* se agregó una prueba de la cadena de migraciones (`test_migraciones.py`) que falla si algún identificador se repite o si hay más de una migración final.

**Ejemplo 2: D-36 (severidad Alta, funcional).**
- *Detectado:* el 1 de noviembre, al escribir las pruebas del formulario de auditoría: la prueba «vuelve a deshabilitarse si se quita la única foto» no pasaba. Al quitar una foto de evidencia, el formulario se rompía. La causa: las fotos y sus enlaces de vista previa estaban en dos listas que se actualizaban en momentos distintos, y por un instante el código leía el nombre de una foto que ya no existía.
- *Registrado:* en el issue #685, con la prueba marcada como omitida (`it.skip`) mientras tanto.
- *Corregido:* en el PR #693, guardando cada foto junto con su enlace en un solo par.
- *Verificado:* se quitó el `skip` y se agregaron 3 pruebas. El 23 de noviembre se volvió a correr el frontend: 1127 de 1127 pruebas pasaron.

**Un tercero, de seguridad:** D-10 (severidad **Crítica**): las cuentas de prueba se sembraban en cualquier entorno, incluido producción. Se corrigió para que solo se creen con `ENVIRONMENT=development`.

## 7. Cómo se registra y sigue el trabajo de defectos

El seguimiento se hace con **GitHub**: issues, Pull Requests y el tablero del proyecto. Un defecto abierto lleva la etiqueta `error`. Los 36 defectos del registro se armaron desde el historial de PR, y el D-36 se registró primero como issue.

## 8. El bootcamp de testing

Durante el trimestre seguimos el *Bootcamp Testing ADSO* del instructor (ficha 3228970): cada semana hay un reto de pruebas que se resuelve en una rama `test/semana-NN`.

**La rotación de capas:** cada integrante trabaja una capa distinta cada semana (**Front, API, BD o E2E**), hasta haber pasado por las cuatro, y **quien revisa un PR de pruebas debe haber trabajado en otra capa** esa semana. Esto se registra en `docs/matriz-rotacion.md`, junto con la cobertura de cada semana:

| Semana | Frontend (% líneas) | Backend (% líneas) |
|---|---|---|
| S1 (6 de octubre, línea base) | 78,2 | 96,69 |
| S2 (3 de noviembre) | 86,4 | 97,17 |
| S3 (10 de noviembre) | 89,36 | 97,24 |
| S4 (24 de noviembre) | 89,41 | 97,54 |

El bootcamp **no reemplaza** el trabajo de la semana: corre en paralelo.

## 9. Otras revisiones que se documentaron

Además de las pruebas, el equipo hizo y dejó por escrito auditorías propias en `docs/gestion-proyecto/`: coherencia entre modo claro y oscuro, contraste de colores, adaptación a tableta, escritorio y distintos navegadores, indicadores de carga, elementos clicables, dependencias, y seguridad frente al OWASP Top 10.

## 10. Límites honestos de la calidad

- **Solo hay 2 pruebas E2E** y **no corren en el CI.** Un fallo que solo aparece al juntar frontend, backend y base de datos puede pasar sin detectarse. Los flujos críticos se cubren a nivel de API y de componentes (deuda DT-06).
- **El frontend tiene menos cobertura que el backend** (89 % frente a 97 %): hay más lógica de pantalla sin probar (DT-07).
- **No hay pruebas de carga:** no se conoce cuántos usuarios simultáneos aguanta el sistema.
- **No hubo pruebas con usuarios reales.**
- **Una prueba intermitente** (la del candado de 2 horas del reciclador) fallaba a veces sin que el código estuviera mal; se corrigió como el defecto D-22.

## 11. Cómo comprobarlo en vivo

**Backend** (desde la carpeta `be/`, con la base de pruebas encendida):

```bash
uv run pytest -q
```

La suite completa tarda más de 10 minutos. Para mostrar algo rápido, corre un solo archivo, sin medir cobertura:

```bash
uv run pytest app/tests/test_auth.py -q --no-cov
```

**Frontend** (desde la carpeta `fe/`):

```bash
pnpm test
```

**Revisiones estáticas:**

```bash
uv run ruff check .
npx tsc -b --noEmit
pnpm lint
```

Si toda la suite del backend falla con `connection refused` en el puerto 5434, el contenedor de la base de pruebas está apagado: se enciende con `docker compose up -d --wait verde_db_test`.

## Lo que debes saber explicar

Después de leer este documento, deberías poder responder **sin mirar**:

1. ¿Qué es un hash y por qué se guarda el hash de la contraseña y no la contraseña?
2. ¿Para qué hay dos tokens (acceso y renovación) y por qué el de acceso dura solo 15 minutos?
3. ¿Qué hacen `httpOnly` y `SameSite=Strict` en la cookie?
4. ¿Cuáles son las dos defensas contra la fuerza bruta y en qué se diferencian?
5. ¿Qué es la cobertura y por qué el umbral solo sube?
6. ¿Qué hace la integración continua y qué pasa si una prueba falla?
7. ¿Cómo es el ciclo de un defecto, de la detección al cierre?

### Preguntas que te pueden hacer

**¿Cómo protegen las contraseñas?**
Nunca se guardan: se guarda un hash calculado con bcrypt, un algoritmo lento y con sal. Aunque alguien consiguiera la base de datos, no podría leer las contraseñas, y probar millones de ellas sería muy costoso.

**¿Por qué usan cookies `httpOnly` y no guardan el token en el navegador de otra forma?**
Con `httpOnly`, ningún JavaScript puede leer el token. Si alguien lograra inyectar código en la página (XSS), no podría robarlo.

**¿Cómo cierra sesión si un token firmado no se puede anular?**
Cada token lleva un identificador único. Al cerrar sesión, ese identificador se anota en una tabla de tokens revocados que el backend consulta en cada petición. Es la única parte con estado del sistema, a propósito.

**¿Qué pasa si alguien le roba la sesión a un usuario?**
El token de acceso dura 15 minutos y el de renovación solo sirve una vez. Y si la persona cambia su contraseña, la versión de sesión sube y todos los tokens anteriores dejan de servir al instante.

**¿Cómo evitan que se descubra qué correos están registrados?**
El mensaje de error al iniciar sesión es siempre el mismo, un registro con un correo existente responde igual que uno nuevo, y el código siempre calcula la comparación de bcrypt para que el tiempo de respuesta sea igual.

**¿Cómo sé que las pruebas realmente protegen el sistema?**
Cada defecto que se corrige deja una prueba que lo habría detectado, y la integración continua las corre en cada cambio: un cambio que rompa algo no se integra.

**¿Por qué solo hay 2 pruebas E2E?**
Porque son lentas y frágiles, y los flujos críticos ya se cubren a nivel de API (contra una base real) y de componentes. Está registrado como deuda técnica y el bootcamp contempla agregar más.

**¿Hicieron una prueba de penetración?**
No una profesional. Hicimos auditorías propias contra el OWASP Top 10, corregimos los huecos que aparecieron y los documentamos.

## Glosario

- **Autenticación:** comprobar quién eres.
- **Autorización:** comprobar qué puedes hacer.
- **bcrypt:** algoritmo de hash lento, hecho para guardar contraseñas.
- **Cabecera (HTTP):** línea de información que acompaña a una respuesta del backend.
- **CI (integración continua):** sistema que corre las pruebas automáticamente en cada cambio.
- **Cobertura:** porcentaje de líneas de código que las pruebas ejecutan.
- **CORS:** lista de direcciones desde las que el backend acepta peticiones del navegador.
- **CSRF:** ataque donde un sitio malicioso hace peticiones a otro usando la sesión de la víctima.
- **Defecto:** comportamiento que no cumple un requisito o daña la seguridad o los datos.
- **Fuerza bruta:** probar muchísimas contraseñas hasta acertar.
- **Hash:** huella de un texto de la que no se puede recuperar el original.
- **Inyección SQL:** ataque donde un texto del usuario se ejecuta como orden de la base de datos.
- **JWT / token:** texto firmado que prueba quién inició sesión.
- **OWASP Top 10:** lista de las 10 vulnerabilidades web más frecuentes.
- **Prueba E2E:** prueba que recorre la aplicación completa en un navegador real.
- **Regresión:** que un cambio rompa algo que ya funcionaba.
- **Sal:** dato aleatorio que se mezcla con cada contraseña antes de calcular su hash.
- **Severidad:** qué tan grave es un defecto.
- **Umbral:** mínimo exigido; si no se alcanza, la suite falla.
- **Vulnerabilidad:** defecto que alguien podría aprovechar para hacer lo que no debería.
- **XSS:** ataque donde un texto del usuario se ejecuta como código en el navegador de otra persona.
