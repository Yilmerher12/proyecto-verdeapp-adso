# Guía para correr y mostrar VerdeApp

<!-- resumen: Cómo instalar, encender, comprobar, probar y presentar VerdeApp en tu computador, paso a paso, con qué hace cada comando y qué hacer cuando algo falla. -->

## Cómo leer este documento

Esta es una guía **práctica**. Los documentos anteriores explican qué es VerdeApp; este te lleva de la mano para **ponerla a funcionar en tu computador**, comprobar que funciona, correr las pruebas y presentarla.

Está pensada para los cuatro integrantes, incluso si nunca has usado Docker o la terminal. Por eso cada comando va **solo en su propio bloque**, con una explicación de qué hace y qué deberías ver. Si algo falla, la sección 9 trae los errores más comunes con su solución.

Una regla de oro, también un acuerdo del equipo (documento 4): **comprueba el primer día que todo te corre.** Quien descubre al final de la semana que el backend no le arranca ya perdió la semana. La sección 2 tiene una lista de comprobación para eso.

Orden del documento:

1. Qué es lo que se enciende.
2. Lo que necesitas instalar, y la lista de comprobación del primer día.
3. Primer arranque, Método B (desarrollo): el que usa el equipo a diario.
4. Primer arranque, Método A (todo con Docker): el de la demostración.
5. Las cuentas de prueba y cómo comprobar que funciona.
6. Correr las pruebas.
7. Preparar y hacer la demostración.
8. El día a día: actualizar, mirar la base de datos y reiniciar desde cero.
9. Cuando algo falla.

## 1. Qué es lo que se enciende

VerdeApp está formada por **cuatro programas** que tienen que estar encendidos a la vez (documento 2):

| Programa | Qué es | Dirección en tu computador |
|---|---|---|
| **Base de datos** (`verde_db`) | PostgreSQL, donde queda todo guardado | `localhost`, puerto `5433` |
| **Backend** (`verde_be`) | La API, que aplica las reglas | `http://localhost:8000` (y `/docs` para ver la API) |
| **Frontend** (`verde_fe`) | Las pantallas que ves | `http://localhost:3000` con Docker, o `http://localhost:5173` en desarrollo |
| **Correo de prueba** (`verde_mailpit`) | Un servidor de correo falso: recibe los correos que manda la app y los muestra | `http://localhost:8025` |

Hay además una **segunda base de datos, solo para las pruebas** (`verde_db_test`, puerto `5434`), que se enciende aparte (sección 6).

**Qué es un puerto:** el «número de puerta» por donde un programa recibe conexiones en tu computador. Por eso puedes tener cuatro programas encendidos a la vez sin que se estorben: cada uno usa un puerto distinto. Si un puerto ya lo usa otro programa, el nuevo no arranca (sección 9).

**Todos estos puertos solo aceptan conexiones de tu propio computador** (Docker los publica en `127.0.0.1`): nadie más en tu red wifi puede entrar a tu base de datos.

### 1.1 Dos formas de correr el proyecto

| | **Método A: todo con Docker** | **Método B: desarrollo** |
|---|---|---|
| Qué corre en Docker | Los cuatro programas | Solo la base de datos y el correo |
| Qué corre directo en tu computador | Nada | El backend y el frontend |
| Qué necesitas instalar | Docker Desktop | Docker Desktop, `uv`, Node.js y `pnpm` |
| Cuándo usarlo | **Probar rápido** que todo levanta con un solo comando, o mostrar el sistema con los datos básicos | **Programar** (los cambios se ven al instante) y **presentar con los datos de demostración** |
| Dirección de la aplicación | `http://localhost:3000` | `http://localhost:5173` |

**No mezcles los dos al mismo tiempo.** El backend de Docker y el que corres a mano compiten por el puerto 8000: uno de los dos no arrancaría.

## 2. Lo que necesitas instalar

**Qué es cada herramienta, en una frase:**

- **Docker Desktop:** el programa que corre los *contenedores*. Un **contenedor** es un programa empaquetado con todo lo que necesita, aislado del resto del computador. Gracias a Docker, los cuatro integrantes usamos **la misma versión de PostgreSQL** sin instalarla.
- **Git:** guarda el historial del proyecto (documento 4). En Windows se usa **Git Bash**, una terminal que acepta los mismos comandos que Linux.
- **`uv`:** instala las dependencias del backend (Python) y corre sus comandos. **Nunca uses `pip` directamente.**
- **Node.js y `pnpm`:** Node.js ejecuta JavaScript fuera del navegador, y `pnpm` instala las dependencias del frontend. **Nunca uses `npm` ni `yarn`.**
- **Una terminal:** la ventana donde escribes los comandos (PowerShell o Git Bash). Cada comando se escribe y se ejecuta con Enter.

| Herramienta | Versión | Cómo instalarla |
|---|---|---|
| Docker Desktop | Una reciente | Desde docker.com; debe estar **abierto y corriendo** antes de cualquier comando `docker` |
| Git (con Git Bash en Windows) | Reciente | Desde git-scm.com |
| `uv` | 0.12 o superior | Sigue la guía oficial de `uv`; instala Python 3.12 si hace falta |
| Node.js | 22 o superior (el CI y el frontend usan 22) | Desde nodejs.org |
| `pnpm` | 11 | Con `corepack enable` (viene con Node.js) |

### 2.1 Lista de comprobación del primer día

Antes de tocar el proyecto, comprueba que cada herramienta responde. Cada comando debe imprimir una versión y no un error:

```bash
docker --version
```

```bash
git --version
```

```bash
uv --version
```

```bash
node -v
```

```bash
pnpm -v
```

Si alguno dice que «no se reconoce como comando», esa herramienta no está instalada o no está en el `PATH` (la lista de lugares donde la terminal busca programas): instálala o cierra y abre la terminal.

## 3. Primer arranque, Método B (desarrollo)

Es el método que usamos para programar. Todos los comandos se corren **desde la carpeta raíz del proyecto**, salvo los que dicen `cd`.

### 3.1 Traer el proyecto

```bash
git clone https://github.com/Yilmerher12/proyecto-verdeapp-adso.git
```

```bash
cd proyecto-verdeapp-adso
```

El primero descarga el proyecto completo; el segundo entra a su carpeta.

### 3.2 Crear tus archivos de configuración

Los archivos `.env` guardan los valores de configuración que **no se suben al repositorio** (documento 5, sección 2.3). El proyecto trae un archivo de ejemplo para cada parte; tú haces tu propia copia:

```bash
cp be/.env.example be/.env
```

```bash
cp fe/.env.example fe/.env
```

El segundo (`fe/.env`) ya queda bien: solo dice dónde está el backend (`VITE_API_URL=http://localhost:8000`).

**El primero (`be/.env`) necesita dos ajustes.** Ábrelo con tu editor y haz lo siguiente:

**Ajuste 1 — Escribir tu propia `SECRET_KEY` (obligatorio).** Es la clave con la que se firman los tokens de sesión (documento 3). El archivo de ejemplo trae un valor falso, y **el backend se niega a arrancar si lo dejas** (o si tiene menos de 32 caracteres). Genera una clave propia con este comando y pega el resultado después de `SECRET_KEY=`:

```bash
openssl rand -hex 32
```

Si no tienes `openssl`, este hace lo mismo con Python:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

**Ajuste 2 — Apuntar a tu computador y no al nombre interno de Docker.** El archivo de ejemplo trae la base de datos escrita como lo ve un programa **dentro** de Docker (`verde_db`, puerto 5432). Como en el Método B el backend corre en tu computador, cambia estas dos líneas:

```dotenv
DATABASE_URL=postgresql://verde_user:verde_password@localhost:5433/verdeapp_db
SMTP_HOST=localhost
```

*Qué problema resuelve:* desde tu computador, a la base de datos se llega por `localhost` y el puerto 5433 (el que Docker publica); el nombre `verde_db` y el puerto 5432 solo existen dentro de la red de Docker. **Con estos valores también funciona el Método A**, porque `docker-compose.yml` los reemplaza solo dentro del contenedor del backend. La dirección del frontend (`FRONTEND_URL`) se puede dejar como viene: en desarrollo el backend acepta tanto el puerto 5173 como el 3000.

> **Nunca subas tu `.env` a Git.** `.gitignore` ya lo protege. Cada persona tiene el suyo.

**El archivo también trae `ENVIRONMENT=development`**, que es lo correcto para trabajar: activa la documentación de la API (`/docs`) y la siembra de las cuentas de prueba.

### 3.3 Encender la base de datos y el correo

Con Docker Desktop abierto:

```bash
docker compose up -d verde_db verde_mailpit
```

Enciende solo esos dos contenedores, en segundo plano (`-d`). Luego comprueba su estado:

```bash
docker ps
```

Espera a que `verde_db` diga **`healthy`** («lista para recibir conexiones»). Con una base nueva tarda unos segundos; si sigues antes, el paso siguiente falla con `connection to server ... failed`.

> **Este paso debe estar hecho antes de encender el backend.** Si el backend arranca sin la base de datos, falla con «conexión rechazada» en el puerto 5433.

### 3.4 Preparar y encender el backend (terminal 1)

Entra a la carpeta del backend:

```bash
cd be
```

**Solo la primera vez**, instala las dependencias exactas del proyecto (`uv` crea solo el entorno virtual; no hace falta crearlo ni activarlo):

```bash
uv sync
```

Crea las tablas de la base de datos aplicando las **migraciones** (documento 2, sección 5.5):

```bash
uv run alembic upgrade head
```

Carga los datos iniciales («sembrar»): roles, localidades, las 14.515 conjuntos, las 799 ECA, las cuentas de prueba y las lecciones educativas (documento 6). Es seguro correrlo varias veces:

```bash
uv run python -m app.seed
```

*(Opcional, para presentar)* Agrega los datos de demostración: 3 conjuntos con 8 semanas de auditorías, comunicados, novedades y solicitudes. Córrelo **justo antes de presentar**, porque las fechas salen relativas al día en que lo corres:

```bash
uv run python -m app.seed_demo
```

Enciende el servidor y **déjalo abierto** (si cierras la terminal, se apaga):

```bash
uv run uvicorn app.main:app --reload --port 8000
```

La opción `--reload` reinicia el backend solo cada vez que guardas un archivo. Si todo salió bien, ves líneas como `Uvicorn running on http://127.0.0.1:8000` y `Application startup complete`. **Las próximas veces solo necesitas este último comando** (y tener la base de datos encendida).

### 3.5 Encender el frontend (terminal 2)

Abre **otra terminal** (el backend sigue corriendo en la primera), desde la raíz del proyecto:

```bash
cd fe
```

**Solo la primera vez:**

```bash
pnpm install
```

```bash
pnpm dev
```

Abre `http://localhost:5173` en el navegador: debes ver la portada de VerdeApp.

## 4. Primer arranque, Método A (todo con Docker)

Es el método más corto: **un solo comando levanta todo**, sin instalar Python ni Node.js. Sirve para comprobar rápido que el sistema funciona o mostrarlo con los datos básicos. (Para presentar con los datos de demostración, mira la nota al final de esta sección.)

Desde la raíz del proyecto, crea los dos archivos de configuración:

```bash
cp be/.env.example be/.env
```

```bash
cp fe/.env.example fe/.env
```

**Escribe tu `SECRET_KEY` propia en `be/.env`** (con el comando `openssl rand -hex 32` de la sección 3.2). Con Docker **no hace falta** cambiar nada más: `docker-compose.yml` ya reemplaza `DATABASE_URL` y `SMTP_HOST` dentro del contenedor, así que sirven tanto los valores del archivo de ejemplo como los del Método B.

Construye y enciende los cuatro servicios:

```bash
docker compose up -d --build
```

La primera vez tarda varios minutos, porque construye las imágenes. Comprueba que todo quedó encendido:

```bash
docker compose ps
```

Deben aparecer 4 servicios activos (`Up` o `healthy`): `verde_db`, `verde_be`, `verde_fe` y `verde_mailpit`. Abre `http://localhost:3000`.

**Qué pasa por dentro al arrancar el backend** (documento 5, sección 2.4): corre las migraciones, siembra los datos **solo si `ENVIRONMENT=development`**, y enciende el servidor. No hay que correr nada más.

Para apagar todo al terminar:

```bash
docker compose down
```

**Los datos de demostración y el Método A.** El contenedor siembra solo los datos básicos. Los datos de demostración incluyen **fotos**, que `app.seed_demo` guarda en la carpeta `be/app/uploads/` de tu computador, mientras que el backend de Docker lee las fotos de su propio volumen (`be_uploads`). Por eso, **para presentar con los datos de demostración usa el Método B**.

**Un atajo opcional:** el script `scripts/start.sh` (en Git Bash) levanta todos los servicios, espera a que estén sanos y muestra un resumen con las direcciones. Se detiene con `scripts/stop.sh`.

## 5. Las cuentas de prueba y cómo comprobar que funciona

### 5.1 Las cuatro cuentas

Al sembrar la base, quedan creadas estas cuentas. **Todas comparten la misma contraseña, que está en la tabla de «Usuarios de Prueba» del `README.md`:**

| Rol | Correo |
|---|---|
| Administrador del Sistema | `admin@verdeapp.com` |
| Administrador de Conjunto | `admin.conjunto.prueba@verdeapp.com` |
| Reciclador | `reciclador.prueba@verdeapp.com` |
| Residente | `residente.prueba@verdeapp.com` |

**Dos cosas que debes saber:**
- El Administrador del Sistema y el Administrador de Conjunto **no tienen registro público**: solo existen estas cuentas sembradas. Si no recuerdas la contraseña, hay que volver a esa tabla.
- El Residente y el Reciclador sí se pueden registrar desde la pantalla de registro. Pero el **registro exige verificar el correo**, y en desarrollo el correo no sale a internet: llega a **Mailpit** (`http://localhost:8025`). Ábrelo, busca el correo de verificación y pulsa el enlace.

### 5.2 Comprobar que todo funciona

Marca cada punto:

1. **La portada abre** en `http://localhost:5173` (o `3000`).
2. **El backend responde:** abre `http://localhost:8000/docs`. Debes ver la lista de endpoints. (Solo aparece con `ENVIRONMENT=development`).
3. **El chequeo de salud:** abre `http://localhost:8000/api/v1/health`. Debe mostrar `"status": "ok"`.
4. **Puedes iniciar sesión** con una cuenta de prueba y llegas a su panel.
5. **Los correos llegan a Mailpit:** pide recuperar una contraseña y comprueba que el correo aparece en `http://localhost:8025`.

Si el paso 4 falla con un error que el navegador llama **«CORS»**, **no suele ser CORS**: casi siempre el backend o la base de datos están apagados o con un error, y la respuesta sale sin las cabeceras que el navegador espera. Revisa `docker ps` (¿`verde_db` está `healthy`?) y la terminal del backend.

## 6. Correr las pruebas

Las pruebas del backend usan **su propia base de datos** (`verde_db_test`), para no tocar tus datos (documento 3, sección 4.1).

### 6.1 Backend

Desde la raíz del proyecto, enciende la base de pruebas y espera a que esté lista (`--wait`):

```bash
docker compose up -d --wait verde_db_test
```

Comprueba que tu `be/.env` tiene esta línea (viene en el archivo de ejemplo); sin ella, `pytest` se detiene con «Falta TEST_DATABASE_URL»:

```dotenv
TEST_DATABASE_URL=postgresql+psycopg2://verde_user:verde_password@localhost:5434/verdeapp_test_db
```

Desde `be/`, corre toda la suite (tarda más de 10 minutos y **mide la cobertura**):

```bash
uv run pytest -q
```

Para correr **un solo archivo**, rápido y sin medir cobertura (con `--no-cov`; si no, falla por el umbral):

```bash
uv run pytest app/tests/test_auth.py -q --no-cov
```

**No corras dos veces `pytest` al mismo tiempo:** comparten la misma base de datos y chocan (`DeadlockDetected`).

Revisión de estilo y errores comunes:

```bash
uv run ruff check .
```

Para apagar la base de pruebas y borrar todo rastro:

```bash
docker compose down -v verde_db_test
```

### 6.2 Frontend

Desde `fe/`:

```bash
pnpm test
```

Corre todas las pruebas y mide la cobertura. Para el chequeo de tipos y el estilo:

```bash
npx tsc -b --noEmit
```

```bash
pnpm lint
```

### 6.3 E2E (navegador real)

Desde `e2e/`. **La primera vez:**

```bash
pnpm install
```

```bash
pnpm exec playwright install chromium
```

Copia `e2e/.env.example` como `e2e/.env` (trae las cuentas de prueba públicas). El backend y la base de datos deben estar encendidos (Método B); Playwright levanta el frontend solo. Luego:

```bash
pnpm test
```

Si falla con *«Executable doesn't exist»*, el navegador que pide Playwright no está instalado: repite el comando `playwright install chromium`.

## 7. Preparar y hacer la demostración

El recorrido minuto a minuto está en el documento 1 (sección 7). Esta sección es la **preparación técnica**.

### 7.1 La noche anterior o la mañana de la demostración

1. **Docker Desktop abierto** y los cuatro servicios en `healthy` (`docker compose ps`).
2. **Datos de demostración recién cargados, con el Método B.** Como las fechas son relativas al día en que se corre `seed_demo`, ejecútalo el mismo día. Para dejar todo limpio, reinicia desde cero (sección 8.3) y luego corre `app.seed` y `app.seed_demo`.
3. **Cuatro ventanas, una por rol.** La sesión vive en cookies del navegador: dos roles en la misma ventana se pisan la sesión. Usa perfiles distintos o ventanas de incógnito (por ejemplo: Chrome normal, Chrome en incógnito, Edge y Edge en InPrivate). Deja cada una **ya iniciada** en su panel y rotulada.
4. **Las fotos para la auditoría en vivo:** `be/app/data/demo/fotos/regular-1.jpg` y `regular-2.jpg`.
5. **Idioma y modo oscuro probados.** Comprueba que el cambio de idioma y de tema funciona.
6. **Mailpit abierto** en `http://localhost:8025`, por si preguntan por los correos.

### 7.2 Lo que necesita internet

VerdeApp corre en tu computador, pero **dos cosas sí necesitan conexión a internet**:
- **Las tipografías** (Inter y Outfit) se piden a Google Fonts. Sin internet, la letra se ve distinta (cae a una tipografía de respaldo).
- **Los videos de las lecciones** son de YouTube: sin internet no se reproducen.

Si el lugar de la presentación puede no tener buena conexión, **prueba antes** cómo se ve sin ella.

### 7.3 Las tres reglas que pueden estorbar si ya ensayaste

1. **Llegada del reciclador:** solo una cada 2 horas por conjunto. Alterna entre conjuntos o reinicia los datos.
2. **SHUT:** si ya está «lleno», no deja reportarlo otra vez; si ya está «libre», no deja marcarlo libre.
3. **Auditoría pendiente:** el botón «Auditar ahora» solo aparece en un conjunto sin auditoría en los últimos 7 días. La demostración está pensada para que el conjunto «Quintas de Aranjuez» lo tenga pendiente.

### 7.4 Si algo falla durante la demostración

- **El backend no responde:** mira la terminal del backend (o `docker compose logs verde_be`). Si es un error de la base de datos, comprueba `docker ps`.
- **No aparece el aviso del reciclador:** las notificaciones se actualizan **cada 20 segundos**; espera hasta 20 segundos.
- **Un dato quedó raro:** reinicia desde cero (sección 8.3). Tarda unos minutos, así que **ten el comando a la mano** y úsalo solo si de verdad hace falta.

## 8. El día a día

### 8.1 Poner el proyecto al día

Cuando traes cambios con `git pull`, o cambias de rama, alguien pudo haber agregado una migración (una tabla o una columna nueva). Tu base de datos **no se borra**: solo se le aplican los cambios pendientes. Desde `be/`:

```bash
uv run alembic upgrade head
```

Es seguro correrlo aunque no haya nada nuevo. Para ver en qué migración está tu base de datos, o ver el historial completo:

```bash
uv run alembic current
```

```bash
uv run alembic history
```

**Importante:** esos comandos se corren **desde `be/`**; desde la raíz, `uv` no encuentra `alembic`.

### 8.2 Mirar la base de datos

Los datos de conexión (para cualquier programa): host `localhost`, puerto `5433`, base `verdeapp_db`, usuario `verde_user`, SSL `disable`. La contraseña de desarrollo está en el `README.md`. Tres formas:

- **pgAdmin:** un programa gráfico. Registra un servidor con esos datos.
- **La extensión SQLTools de VS Code:** el repositorio ya trae la conexión preconfigurada en `.vscode/settings.json`; solo haces clic en «Connect».
- **La terminal, sin instalar nada:**

```bash
docker exec -it verde_db psql -U verde_user -d verdeapp_db
```

Dentro de la consola de PostgreSQL, por ejemplo: `\dt` (ver todas las tablas), `SELECT * FROM roles;` (ver los roles) y `\q` (salir).

### 8.3 Reiniciar todo desde cero

> **Esto borra TODOS los datos:** los usuarios que creaste, comunicados, auditorías y fotos. No se pueden recuperar. Al terminar solo quedan los datos del `seed`.

Úsalo antes de una demostración, o cuando la base quedó en un estado raro después de pruebas manuales.

**Si usas el Método A (todo con Docker)**, desde la raíz:

```bash
docker compose down -v
```

```bash
docker compose up -d --build
```

El primero apaga todo y, con `-v`, borra los volúmenes (la base de datos y las fotos subidas). El segundo lo vuelve a levantar; el backend aplica las migraciones y siembra solo.

**Si usas el Método B:**

1. Apaga el backend (`Ctrl + C` en su terminal). El frontend puede seguir.
2. Borra la base y vuelve a crearla vacía, desde la raíz:

```bash
docker compose down verde_db
```

```bash
docker volume rm proyecto-verdeapp-adso_db_data
```

```bash
docker compose up -d verde_db
```

3. Espera a que `verde_db` esté `healthy` (`docker ps`). *(El nombre del volumen depende de la carpeta donde clonaste el proyecto; si dice «no such volume», mira el real con `docker volume ls`.)*
4. Borra las fotos viejas (en el Método B viven en `be/app/uploads/`). En PowerShell, desde la raíz:

```powershell
Remove-Item -Recurse -Force be/app/uploads/adjuntos
```

```powershell
Remove-Item -Recurse -Force be/app/uploads/evidencias-auditoria
```

```powershell
Remove-Item -Recurse -Force be/app/uploads/perfiles
```

*(Si una carpeta no existe, PowerShell muestra un error que puedes ignorar. No borres el archivo `.gitkeep`.)*

5. Desde `be/`, aplica las migraciones y siembra:

```bash
uv run alembic upgrade head
```

```bash
uv run python -m app.seed
```

6. Vuelve a encender el backend con `uv run uvicorn app.main:app --reload --port 8000`.

**La base de datos de pruebas no necesita nada:** `pytest` la arma sola cada vez.

## 9. Cuando algo falla

Cada fila dice **qué ves**, **por qué pasa** y **qué hacer**.

| Qué ves | Por qué pasa | Qué hacer |
|---|---|---|
| **Un puerto ya está en uso** (3000, 5173, 8000, 5433 u 8025) | Dejaste corriendo una instancia anterior, u otro programa usa ese puerto (por ejemplo, un PostgreSQL instalado en tu computador compite por el 5432; por eso VerdeApp usa el 5433) | Cierra lo que ocupa el puerto, o apaga los contenedores anteriores con `docker compose down` |
| **`pnpm dev` dice `Port 5173 is already in use`** | Otro `pnpm dev` anterior sigue abierto. Vite ya no pasa al 5174, porque el backend solo acepta los orígenes `:5173` y `:3000` y el inicio de sesión fallaría con un error que parece de CORS | En PowerShell: `netstat -ano \| findstr :5173` muestra el número de proceso (PID) al final de la línea; ciérralo con `taskkill /PID 1234 /F` (cambia `1234` por ese número) |
| **`uv` o `pnpm` «no se reconocen como comando»** | No están instalados, están en otra versión, o la terminal no se reinició | Instálalos (sección 2) y cierra y abre la terminal |
| **El backend falla con «conexión rechazada» o `connection to server ... failed`** | La base de datos no está encendida o no está `healthy` todavía | `docker compose up -d verde_db`, y espera a `healthy` en `docker ps` |
| **El backend termina con `SECRET_KEY: Field required`, `SECRET_KEY debe tener al menos 32 caracteres` o `SECRET_KEY sigue siendo el valor de ejemplo`** | Falta tu `be/.env`, o dejaste la clave de ejemplo | Crea el `.env` (sección 3.2) y escribe una clave propia generada con `openssl rand -hex 32` |
| **`ENVIRONMENT: Field required`** o `Input should be 'development' or 'production'` | Falta la variable o está mal escrita | El valor debe ser exactamente `development` en tu computador |
| **El inicio de sesión muestra un error de «CORS»** | Casi siempre el backend o la base de datos están caídos, y la respuesta sale sin las cabeceras de CORS | Revisa `docker ps` y la terminal del backend |
| **`uv run alembic ...` dice que no encuentra `alembic`** | Lo corriste desde la raíz del proyecto | Hazlo desde `be/` |
| **Docker no arranca, o un contenedor se reinicia en bucle** | Docker Desktop no está corriendo, o falta una variable | Abre Docker Desktop. Mira los registros con `docker compose logs verde_be` (o el servicio que falle) |
| **`pytest` dice «Falta TEST_DATABASE_URL»** | Falta esa línea en `be/.env` | Agrégala (sección 6.1) |
| **`pytest` falla con `connection refused` en el puerto 5434** | La base de pruebas está apagada | `docker compose up -d --wait verde_db_test` |
| **`pytest` falla con `DeadlockDetected`** | Dos corridas de `pytest` al mismo tiempo, en la misma base | Detén las dos y corre una sola |
| **E2E: `Executable doesn't exist`** | Falta el navegador de Playwright | `pnpm exec playwright install chromium` desde `e2e/` |
| **El backend no arranca después de cambiar de rama** | La rama tiene una migración que tu base no tiene | `uv run alembic upgrade head` desde `be/` |
| **Dos migraciones con el mismo identificador** | Un error que ya se corrigió (defecto D-35) | `git pull` y, si tu base quedó en un estado raro, reiníciala (sección 8.3) |

**Nada de esto resolvió el problema:** antes de perder mucho tiempo solo, **pregunta en el chat del grupo**. Es más probable de lo que parece que ya le haya pasado a alguien más. Y guarda el mensaje de error **exacto** que ves: casi siempre dice cuál es el problema.

### 9.1 Dos consejos para quien aprende la terminal

- **Lee el error de abajo hacia arriba.** La última línea suele decir la causa; las de arriba son el recorrido hasta llegar a ella.
- **Un comando a la vez.** Si un comando falla, no sigas con el siguiente: corrige primero ese.

## Lo que debes saber explicar

Después de leer este documento, deberías poder responder **sin mirar**:

1. ¿Cuáles son los cuatro programas de VerdeApp y en qué puerto escucha cada uno?
2. ¿En qué se diferencian el Método A y el Método B, y cuándo se usa cada uno?
3. ¿Por qué hay que escribir una `SECRET_KEY` propia en `be/.env`?
4. ¿Qué hacen `alembic upgrade head`, `app.seed` y `app.seed_demo`?
5. ¿Cómo se comprueba que todo funciona?
6. ¿Qué hace falta para correr las pruebas del backend?
7. ¿Qué pasa si se reinicia todo desde cero?

### Preguntas que te pueden hacer

**¿Cómo se instala y se corre el proyecto?**
Con Docker Desktop abierto, se copian los archivos de configuración, se escribe una clave secreta propia y se corre `docker compose up -d --build`. Para desarrollar se enciende solo la base de datos y el correo con Docker, y el backend y el frontend se corren en la consola (`uv run uvicorn` y `pnpm dev`).

**¿Por qué usan Docker?**
Para que los cuatro integrantes usemos exactamente la misma versión de PostgreSQL sin instalarla, y para poder levantar todo el sistema con un solo comando en la demostración.

**¿Qué pasa si falta una variable de configuración?**
El backend se niega a arrancar y dice cuál falta. Lo probamos a propósito, y hay pruebas automáticas de eso.

**¿Cómo cargan los datos de demostración?**
Con `app.seed` (los datos reales y las cuentas de prueba) y `app.seed_demo` (3 conjuntos con 8 semanas de auditorías, comunicados y solicitudes). Se corre el mismo día de la presentación, porque las fechas son relativas.

**¿Cómo corren las pruebas?**
Se enciende una base de datos aparte para las pruebas y se corre `uv run pytest` en el backend y `pnpm test` en el frontend. Las pruebas usan su propia base de datos para no tocar los datos de desarrollo.

**¿Funciona sin internet?**
La aplicación corre en el computador, pero las tipografías vienen de Google Fonts y los videos de las lecciones son de YouTube, así que sin conexión la letra cambia y los videos no se reproducen.

## Glosario

- **`.env`:** archivo con los valores de configuración de tu computador; nunca se sube a Git.
- **Contenedor:** programa empaquetado con todo lo que necesita, aislado del resto del computador.
- **Docker Compose:** herramienta que describe y levanta varios contenedores con un solo comando.
- **`healthy`:** estado de un contenedor que ya está listo para recibir conexiones.
- **Migración:** archivo que describe un cambio en la estructura de la base de datos.
- **PATH:** lista de lugares donde la terminal busca los programas.
- **Puerto:** «número de puerta» por donde un programa recibe conexiones.
- **Seed (sembrar):** cargar datos iniciales en una base de datos vacía.
- **Terminal:** ventana donde se escriben comandos.
- **Volumen (Docker):** espacio que sobrevive aunque se apague o se borre el contenedor; ahí viven la base de datos y las fotos.
