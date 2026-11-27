# Estado actual y mejoras pendientes

<!-- resumen: En qué punto está VerdeApp hoy, cómo se publicaría, qué deuda técnica tiene y qué haríamos con más tiempo, dicho con honestidad y con la razón de cada decisión. -->

## Cómo leer este documento

Los documentos anteriores explicaron qué hace VerdeApp, cómo está construida, cómo se protege y se prueba, y cómo trabajamos. Este cierra con una pregunta que cualquier cliente hace: **¿en qué punto está, qué le falta y qué harían con más tiempo?**

Reconocer un límite **con su razón** se ve mejor que esquivarlo. Por eso este documento no esconde nada: cada pendiente tiene su explicación en palabras simples, por qué importa y cómo se resolvería. Igual que antes, cada término se explica al aparecer y hay un glosario al final.

Orden del documento:

1. El estado actual: qué está terminado y qué es parcial.
2. El despliegue: qué es, qué está listo y qué falta.
3. La deuda técnica: la lista priorizada.
4. La funcionalidad pendiente y las decisiones sin aprobar.
5. Las decisiones importantes del proyecto y su razón.
6. Los límites que debes poder reconocer.
7. Qué haríamos con más tiempo.
8. Lo que falta definir con los profesores.

## 1. El estado actual

### 1.1 Lo que está terminado

- Las **53 historias de usuario** y los **21 requisitos funcionales** están implementados (documento 1).
- El sistema funciona completo en los computadores del equipo: los cuatro roles, los avisos, las auditorías, el catálogo de 33 lecciones, los comunicados, la agenda y la administración.
- Tiene un conjunto grande de **pruebas automáticas** y una integración continua que las corre en cada cambio (documento 3).

### 1.2 Los requisitos no funcionales

Un **requisito funcional** dice *qué hace* el sistema («el residente puede reportar el SHUT lleno»). Un **requisito no funcional** dice *qué tan bien* lo hace («responde en menos de 2 segundos»). VerdeApp tiene seis, guardados en `docs/requisitos/RNFs/`:

| Requisito | Qué exige | Estado |
|---|---|---|
| RNF-001 Seguridad de la información | Proteger datos y cuentas | Implementado |
| RNF-002 Disponibilidad | Estar activo el 99,9 % del tiempo, desplegado en la nube, con copias de seguridad automáticas y manejo de fallas de red | **Parcial** |
| RNF-003 Usabilidad y adaptabilidad | Verse y usarse bien en computador, tableta y celular | Implementado |
| RNF-004 Tiempo de respuesta | Responder en menos de 2 segundos | **Parcial** |
| RNF-005 Accesibilidad | Poder usarse con teclado y con contraste suficiente | Implementado |
| RNF-006 Mantenibilidad y calidad | Código ordenado, probado y fácil de cambiar | Implementado |

**Por qué dos son «parciales»:** la disponibilidad y el tiempo de respuesta **solo se pueden medir en un servidor real**, y VerdeApp todavía no está publicada. Además, el requisito de disponibilidad pide **copias de seguridad automáticas** de la base de datos, y hoy **no hay ninguna configurada** en el repositorio.

## 2. El despliegue

### 2.1 Qué es desplegar

**Desplegar** es publicar la aplicación en un **servidor** (un computador que está siempre encendido y conectado a internet) con una **dirección** (un dominio, como `verdeapp.com`), para que cualquiera pueda usarla desde su navegador. Hoy VerdeApp corre solo en los computadores del equipo.

### 2.2 Estado: todavía no está desplegada

Dicho sin rodeos: **VerdeApp no está desplegada en un servidor.** No hay servidor, ni dominio, ni proceso de entrega, ni etiquetas de versión. Esto está registrado como deuda técnica de máxima prioridad (DT-03, sección 3).

**Lo que sí existe** es la preparación para desplegarla, que se comprobó el 20 de noviembre: toda la configuración sale de variables de entorno validadas al arrancar, y el **modo producción** se probó en un entorno local. Esa prueba **no es** un despliegue real.

### 2.3 Variables de entorno: qué son y cuáles hay

Una **variable de entorno** es un valor de configuración que vive **fuera del código**, en un archivo llamado `.env` (que nunca se sube al repositorio). **Qué problema resuelve:** el mismo código debe funcionar en el computador de un integrante, en las pruebas y en un servidor real, pero cada uno necesita valores distintos (otra base de datos, otra clave secreta). Si esos valores estuvieran escritos en el código, habría que cambiarlo en cada lugar, y las contraseñas quedarían a la vista de todos.

Las variables del backend (se copian desde el archivo de ejemplo `be/.env.example`):

| Variable | ¿Obligatoria? | Para qué sirve |
|---|---|---|
| `DATABASE_URL` | Sí | La dirección de conexión a PostgreSQL |
| `SECRET_KEY` | Sí | La clave con la que se firman los tokens. Mínimo 32 caracteres, y se rechaza el valor de ejemplo. Se genera con `openssl rand -hex 32` |
| `ENVIRONMENT` | Sí | `development` o `production`, y nada más. Decide si `/docs` está abierto, si se crean las cuentas de prueba, si las cookies llevan `Secure` y qué direcciones acepta CORS |
| `FRONTEND_URL` | No | La dirección del frontend; se usa en los enlaces de los correos y como origen permitido por CORS |
| `API_PUBLIC_URL` | No | La dirección pública del backend, para armar los enlaces de las fotos |
| `ACCESS_TOKEN_EXPIRE_MINUTES` y `REFRESH_TOKEN_EXPIRE_DAYS` | No | Cuánto duran los tokens (por defecto 15 minutos y 7 días) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD` | No | El servidor de correo. En desarrollo apunta a Mailpit |
| `RESEND_API_KEY` y relacionadas | No | Una alternativa a SMTP para producción |
| `CONTACT_EMAIL` | No | El buzón que recibe el formulario de contacto |

El frontend usa `VITE_API_URL` (la dirección del backend). Esta es especial: Vite la **escribe dentro del código al compilar**, no al arrancar, así que con Docker se pasa al construir la imagen, y cambiar el archivo después no cambia nada.

### 2.4 Cómo arranca el backend

El contenedor del backend ejecuta, en este orden y **cortando en el primer fallo**:

1. **Lee y valida las variables.** Si falta alguna o está mal, el proceso termina con un mensaje que dice cuál es. No queda un backend a medio arrancar.
2. **`alembic upgrade head`:** crea o actualiza las tablas aplicando las migraciones.
3. **`python -m app.seed`:** crea las cuentas de prueba y los datos base, **solo si `ENVIRONMENT=development`**. En producción se omite.
4. **`uvicorn app.main:app`:** arranca el servidor en el puerto 8000.

El contenedor además corre con un usuario sin privilegios (no como administrador del sistema), tiene un chequeo de salud (`healthcheck`) y solo arranca cuando la base de datos está lista.

### 2.5 Los errores de arranque se probaron a propósito

Se construyó la configuración con cada variable mal, para comprobar que el sistema **se niega a arrancar y dice por qué**:

| Qué se hizo | Resultado | Mensaje |
|---|---|---|
| Todo correcto con `ENVIRONMENT=production` | Arranca | — |
| Falta `SECRET_KEY` | No arranca | `SECRET_KEY: Field required` |
| `SECRET_KEY` de 5 caracteres | No arranca | «debe tener al menos 32 caracteres. Genera una con: openssl rand -hex 32» |
| `SECRET_KEY` igual a la del `.env.example` | No arranca | «sigue siendo el valor de ejemplo» |
| Falta `ENVIRONMENT` | No arranca | `ENVIRONMENT: Field required` |
| `ENVIRONMENT=prod` | No arranca | «Input should be 'development' or 'production'» |
| Falta `DATABASE_URL` | No arranca | `DATABASE_URL: Field required` |

Estas reglas tienen sus pruebas automáticas (`be/app/tests/test_config.py`).

### 2.6 Desarrollo frente a producción

Con `ENVIRONMENT=production`, el comportamiento cambia así:

| Qué se consultó | `development` | `production` |
|---|---|---|
| `/docs`, `/redoc`, `/openapi.json` (documentación de la API) | Abiertos | **Cerrados** (404) |
| CORS desde el dominio del frontend | Permitido | Permitido |
| CORS desde `http://localhost:5173` | Permitido | **Rechazado** |
| Cuentas de prueba (`seed`) | Se crean | **No se crean** |
| Cookie del token de renovación | Sin `Secure` | **Con `Secure`** |

Como los orígenes de CORS salen de `FRONTEND_URL`, desplegar en otro dominio **no exige cambiar código**.

### 2.7 Cómo se desplegaría, en pasos

**Backend:**
1. Preparar `be/.env` con valores reales: `ENVIRONMENT=production`, una `SECRET_KEY` nueva, la `DATABASE_URL` de producción, `FRONTEND_URL`, `API_PUBLIC_URL` y un servicio de correo.
2. Construir y levantar la imagen: `docker compose up -d --build verde_be`. Al arrancar corre las migraciones y no crea cuentas de prueba.

**Frontend:**
1. Construir la imagen con la dirección real del backend: `VITE_API_URL=https://api.ejemplo.com docker compose build verde_fe`.
2. Levantar `verde_fe`. Nginx sirve los archivos y devuelve `index.html` en cualquier ruta, para que funcione el enrutador de React.

### 2.8 Lo que falta para un despliegue real

Son límites conocidos de hoy, no errores ocultos:

- **No hay servidor ni dominio.** Todo se probó en local.
- **El `docker-compose.yml` es de desarrollo.** Trae las credenciales de la base de datos escritas (`verde_password`) y publica Mailpit. Para un servidor real habría que usar otras credenciales, una base propia y quitar Mailpit.
- **No hay HTTPS.** Nginx escucha solo en el puerto 80 (HTTP). **HTTPS** es la versión cifrada de HTTP: protege lo que viaja entre el navegador y el servidor. Lo pondría un proxy o el proveedor de alojamiento con un certificado.
- **El frontend no manda cabeceras de seguridad** (como `Content-Security-Policy` o `HSTS`) desde Nginx.
- **Las imágenes de Docker no están fijadas por su huella (digest)**, solo por versión.
- **No hay copias de seguridad automáticas** de la base de datos.
- **El chequeo de salud no revisa la base de datos** (sección 3).

## 3. La deuda técnica

### 3.1 Qué es

La **deuda técnica** son las cosas que hoy funcionan, o que se dejaron así a propósito, pero que habría que mejorar antes de que el sistema crezca o se publique. **No son errores nuevos:** cada una tiene un motivo y una forma de resolverla. Se llama «deuda» porque, igual que una deuda de dinero, si no se paga a tiempo cuesta más después.

Cada punto está documentado en `docs/gestion-proyecto/deuda-tecnica.md` y se priorizó con el método del proyecto (documento 4): importancia, complejidad, prioridad (Must, Should, Could) y tamaño. El estado de la tabla se comprobó contra el código el 26 de noviembre de 2026.

**Resumen:** 13 puntos abiertos: **2 Must (P0)**, **8 Should (P1)** y **3 Could (P2)**.

### 3.2 Must (P0): hay que resolverlas antes de entregar o desplegar

**DT-02. Seguridad de la infraestructura antes de desplegar** (tamaño L, issue #317)
*Qué falta:* el `docker-compose.yml` trae las credenciales escritas y publica Mailpit; `fe/nginx.conf` no tiene HTTPS ni cabeceras de seguridad; las imágenes no están fijadas por digest.
*Por qué importa:* mientras todo corre en local no es un riesgo, pero un despliegue real dejaría esas credenciales y configuraciones expuestas.
*Cómo se resolvería:* credenciales por variables de entorno, HTTPS con un certificado, cabeceras en Nginx e imágenes fijadas.

**DT-03. No hay despliegue real** (tamaño L)
*Qué falta:* servidor, dominio, proceso de entrega y etiquetas de versión (`git tag` sale vacío).
*Por qué importa:* sin esto, el proyecto no se puede usar fuera del equipo, y los requisitos de disponibilidad y tiempo de respuesta no se pueden medir.
*Cómo se resolvería:* elegir un proveedor, desplegar siguiendo la sección 2.7 y etiquetar la primera entrega.

### 3.3 Should (P1): mejoran la calidad, sin urgencia

**DT-04. El chequeo de salud no revisa la base de datos** (XS)
El endpoint `GET /api/v1/health` siempre responde «ok», aunque PostgreSQL esté caída. *Por qué importa:* el `HEALTHCHECK` de Docker diría que el backend está sano cuando no lo está. *Solución:* que `health` haga una consulta mínima a la base.

**DT-05. Los límites de peticiones viven en la memoria del programa** (M)
El limitador de peticiones guarda sus cuentas en la memoria de cada copia del backend, sin un almacén compartido. *Por qué importa:* con más de una copia del backend, cada una contaría por separado y el límite real se multiplicaría. *Solución:* guardar las cuentas en un almacén compartido (por ejemplo Redis).

**DT-06. Solo hay 2 pruebas E2E y no corren en el CI** (M)
*Por qué importa:* un fallo que solo aparece al juntar frontend, backend y base de datos puede pasar sin detectarse. *Solución:* más flujos E2E y correrlos en el CI (el bootcamp de testing ya contempla más).

**DT-07. La cobertura del frontend es menor que la del backend, y no hay pruebas de carga** (L)
Frontend 89 % frente a backend 97 %. *Por qué importa:* hay más lógica de pantalla sin probar, y no se conoce cuántos usuarios simultáneos aguanta el sistema.

**DT-08. Las protecciones de rama son flojas** (XS)
Consultado con `gh api` el 26 de noviembre: `stg` exige 1 revisión; `develop` y `main` exigen 0, y ninguna obliga a que el CI esté en verde. *Por qué importa:* que el CI deba pasar es un acuerdo del equipo y no algo que GitHub imponga. *Solución:* activar la regla en la configuración de GitHub.

**DT-09. Los diagramas se desactualizan sin que nadie lo note** (S)
Al revisarlos, faltaban columnas en 3 tablas y una relación, y las cifras de tablas estaban viejas. *Por qué importa:* la documentación deja de coincidir con la base de datos real. Se corrigieron el 20 de noviembre; el riesgo es que vuelva a pasar con cada migración.

**DT-10. Actualizaciones de versión mayor del frontend sin evaluar** (L, issues #330 y #331)
Vite 8, Vitest 5, ESLint 10 y TypeScript 7, más 15 avisos nuevos de un plugin de ESLint. *Por qué importa:* las versiones quedan atrás y las vulnerabilidades futuras serán más difíciles de actualizar.

**DT-11. Decisiones sin aprobar** (XS)
Hay dos decisiones que están como propuesta: el **plazo de 6 meses para borrar las fotos de evidencia** (el comando existe, pero no está programado ni aprobado) y **no permitir que el residente califique al reciclador**. Mientras no se aprueben, siguen como propuesta.

### 3.4 Could (P2): pulido y funcionalidad opcional

**DT-12. Una alerta de seguridad ignorada de forma temporal** (XS)
Una alerta de la librería `picomatch` en `pnpm audit` está ignorada en `fe/pnpm-workspace.yaml`, porque no tiene versión corregida disponible y solo afecta herramientas de desarrollo. Es temporal: se debe quitar en cuanto exista una versión corregida, o a más tardar el **2 de diciembre de 2026**.

**DT-13. Prettier no se aplica ni se revisa en el CI** (S, issue #332)
*Prettier* es una herramienta que da formato uniforme al código. Hoy el formato del frontend depende de cada persona.

**DT-14. CORS acepta cualquier método y cabecera** (XS)
El origen sí es una lista explícita, pero los métodos y cabeceras permitidos están en `*` (cualquiera). Es más permisivo de lo necesario.

### 3.5 Lo que ya se pagó

La deuda también se paga. De la lista original de seguridad de infraestructura (issue #317), ya está resuelto:

- **Las cuentas de prueba solo se crean en desarrollo.**
- **`ENVIRONMENT` es obligatoria** y `SECRET_KEY` se rechaza si es corta o es el valor de ejemplo.
- **El origen de CORS sale de `FRONTEND_URL`** y ya no está escrito en el código.
- **Los contenedores del backend corren sin privilegios de administrador** y con chequeo de salud.
- **Las cabeceras de seguridad** de la API y los límites de peticiones en los endpoints sensibles.
- **La política de retención de fotos de evidencia** tiene su comando de limpieza.
- **El formulario de auditoría ya no se rompe al quitar una foto** (defecto D-36, documento 3).
- **El catálogo educativo se amplió y se reorganizó:** pasó de 6 a 33 lecciones en 8 categorías, con avance real por módulo.

## 4. Funcionalidad pendiente y por revisar

Estos issues siguen **abiertos** en el tablero (26 de noviembre de 2026). No son deuda técnica en sentido estricto:

- **Mostrar las ECA en un mapa** dentro del directorio de puntos de acopio (#666). El directorio ya tiene las 799 ECA del inventario de la UAESP; falta dibujarlas en un mapa.
- **Notificaciones por conjunto** en el panel del Administrador de Conjunto (#450).
- **Mejorar el diseño visual de los 4 paneles** (#111). Se escribió **antes** de los rediseños de octubre y noviembre, así que antes de trabajarla hay que verificar en el código qué parte ya está resuelta.
- **Las tarjetas del bootcamp de testing** de las semanas 4 a 6 (#657, #660, #661, #662, #698 a #701) y pruebas del módulo de residuos (#555).
- **Mantenimiento del frontend:** Prettier (#332), versiones mayores (#331) y el plugin de hooks (#330).
- **Preparar el despliegue** (#317).

## 5. Las decisiones importantes y su razón

Estas son las decisiones que más preguntas generan. Cada una está documentada con su razón en `docs/gestion-proyecto/` o en la propuesta técnica.

| Decisión | Qué se decidió | Por qué |
|---|---|---|
| **Auditoría del conjunto, no del residente** | La calificación es global al conjunto | No hay forma de saber qué apartamento entregó qué bolsa; calificar a una persona sería injusto e inexacto |
| **No calificar al reciclador** (issue #11) | El residente no califica al reciclador | Riesgo de calificaciones malintencionadas; se prefiere medir cómo llega el material. **Puede reabrirse con salvaguardas** |
| **Chat y chatbot descartados por ahora** (issue #521) | Se ofrece soporte técnico con motivo, prioridad y respuesta | Un chat solo sirve si alguien responde al momento; la IA tiene costo, calidad y manejo de datos personales por resolver |
| **Llaves primarias UUID versión 4** (issue #167) | Identificadores aleatorios en vez de números consecutivos | Un número consecutivo se puede adivinar; el cambio se hizo sin perder datos reales |
| **Sesión en cookies `httpOnly`** | Los tokens no viajan donde el JavaScript pueda leerlos | Un ataque XSS no puede robarlos; se compensa con `SameSite=Strict` contra CSRF |
| **Avisos por consulta cada 20 segundos** | No se usa conexión permanente (WebSockets) | Es casi inmediato para este uso y mucho más simple de operar |
| **Quitar el nivel «Excelente»** (issue #437) | La calificación quedó en tres niveles | Ya no se ofrecía en la interfaz; una migración convirtió las filas viejas a «Bueno» |
| **Borrar solo las fotos de evidencia viejas, no la auditoría** | Plazo propuesto de 6 meses | Las fotos eran lo único que crecía sin límite, y son fotos reales de espacios de los residentes (Ley 1581 de 2012); la auditoría se conserva para el historial |

## 6. Los límites que debes poder reconocer

Si alguien pregunta «¿y esto qué limitaciones tiene?», estas son las respuestas honestas:

1. **No hay servidor público.** Corre en Docker en los equipos del equipo.
2. **La disponibilidad y el tiempo de respuesta no están medidos** en producción: son requisitos parciales.
3. **No hay copias de seguridad automáticas** de la base de datos.
4. **Los avisos no son instantáneos:** tardan hasta 20 segundos en aparecer.
5. **No hay autenticación de dos factores** ni prueba de penetración externa.
6. **No hay aplicación móvil nativa:** la web se adapta al celular.
7. **Hay pocas pruebas E2E** y no corren en el CI, y **no hay pruebas de carga**.
8. **Las protecciones de rama en GitHub son parciales:** que el CI esté en verde es un acuerdo del equipo.
9. **Los límites de peticiones viven en la memoria** de cada copia del backend.
10. **El reparto del trabajo entre integrantes fue desigual** (documento 4).

## 7. Qué haríamos con más tiempo

Ordenado por prioridad, y conectado con los puntos anteriores:

1. **Publicar VerdeApp:** resolver la infraestructura (DT-02) y desplegar (DT-03). Con eso se pueden medir la disponibilidad y el tiempo de respuesta y cerrar los dos requisitos parciales.
2. **Configurar copias de seguridad automáticas** de la base de datos.
3. **Reforzar las pruebas:** más flujos E2E en el CI (DT-06) y pruebas de carga (DT-07).
4. **Activar las protecciones de rama** en GitHub (DT-08), para que el CI en verde sea obligatorio.
5. **Mostrar las ECA en un mapa** (#666) y completar las fichas de los puntos de acopio (foto, coordenadas, teléfono).
6. **Seguimiento educativo:** confirmar que el conjunto leyó la lección recomendada y un cuestionario corto cuando la auditoría sale Regular o Mala.
7. **Soporte técnico con ayuda escrita** para resolver cada motivo, y que el Administrador de Conjunto atienda las consultas de su conjunto.
8. **Más desempeño:** descargar el desempeño semanal en PDF.
9. **Evaluar autenticación de dos factores** y una **aplicación móvil**.
10. **Aprobar las decisiones pendientes:** el plazo de retención de fotos y la decisión sobre calificar al reciclador.

## 8. Lo que falta definir con los profesores

Hay un punto de la revisión que todavía no tiene su documento, porque **no está claro qué se pide**: la **reflexión comparativa de los backends del programa** (comparar el backend de VerdeApp con los otros que el equipo haya construido durante la formación). Se va a consultar con los profesores para saber a qué backends se refieren. Mientras tanto, lo que sí existe para respaldar esa reflexión es: la arquitectura (documento 2), la deuda técnica (sección 3 de este documento) y el registro de defectos (documento 3).

## Lo que debes saber explicar

Después de leer este documento, deberías poder responder **sin mirar**:

1. ¿VerdeApp está en un servidor público? Si no, ¿qué falta?
2. ¿Qué es una variable de entorno y por qué existe?
3. ¿Qué pasa si falta la `SECRET_KEY` al arrancar el backend?
4. ¿Qué es la deuda técnica y cuáles son las dos de máxima prioridad?
5. ¿Por qué dos requisitos no funcionales figuran como «parciales»?
6. ¿Qué haría el equipo primero con más tiempo?

### Preguntas que te pueden hacer

**¿Por qué no está desplegada?**
Porque el proyecto se desarrolló durante el trimestre en los equipos del equipo, y publicarlo exige un servidor, un dominio, HTTPS y credenciales propias, que no se han contratado. Lo que sí está hecho es la preparación: la configuración sale de variables de entorno validadas y el modo producción se probó en local.

**¿Cómo se despliega entonces?**
Se prepara el archivo `.env` con valores reales, se construye la imagen del backend y la del frontend (pasando la dirección real del backend al compilar) y se levantan con Docker Compose. Al arrancar, el backend corre las migraciones y no crea cuentas de prueba.

**¿Qué pasa si alguien despliega con la configuración de ejemplo?**
El backend se niega a arrancar: rechaza la `SECRET_KEY` de ejemplo y la que tenga menos de 32 caracteres, y exige `ENVIRONMENT`. Hay pruebas automáticas de eso.

**¿Qué es la deuda técnica de su proyecto?**
Son 13 puntos priorizados. Los dos más importantes son preparar la infraestructura para un despliegue seguro y desplegar. Después vienen mejoras de calidad, como más pruebas E2E, protecciones de rama y revisar el chequeo de salud.

**¿Tienen copias de seguridad de la base de datos?**
Todavía no están automatizadas. El requisito de disponibilidad las pide y por eso figura como parcial. Es parte de los pasos previos al despliegue.

**¿Qué pasa si hay un error grave en producción?**
Hoy no hay producción. Cuando exista, un error se corregiría en una rama `fix/` desde `develop`, con una prueba que lo habría detectado, y pasaría por `develop`, `stg` y `main` con la integración continua en cada paso.

**¿Qué es lo primero que harían con más tiempo?**
Publicar el sistema, para poder medir la disponibilidad y el tiempo de respuesta, y configurar copias de seguridad automáticas.

## Glosario

- **CORS:** lista de direcciones desde las que el backend acepta peticiones del navegador.
- **Deuda técnica:** cosas que funcionan hoy pero que conviene mejorar antes de crecer o publicar.
- **Desplegar:** publicar la aplicación en un servidor para que se use por internet.
- **Dominio:** la dirección escrita de un sitio (por ejemplo `verdeapp.com`).
- **Healthcheck (chequeo de salud):** consulta que dice si el programa está funcionando.
- **HTTPS:** versión cifrada de HTTP; protege lo que viaja entre el navegador y el servidor.
- **P0, P1, P2:** prioridades en el tablero (Must, Should, Could).
- **Requisito funcional / no funcional:** qué hace el sistema / qué tan bien lo hace.
- **Servidor:** computador siempre encendido y conectado a internet que ejecuta la aplicación.
- **Variable de entorno:** valor de configuración que vive fuera del código, en un archivo `.env`.
