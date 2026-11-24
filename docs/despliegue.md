# Arranque y despliegue de VerdeApp

<!--
  ¿Qué? Cómo arranca el backend, qué variables de entorno necesita cada parte (backend,
        frontend y E2E), qué errores de arranque da cuando una está mal y cómo se desplegaría
        el proyecto.
  ¿Para qué? Es la evidencia de los criterios 3 y 4 de la revisión (arranque del backend sin
            errores y manejo de variables de entorno para el despliegue).
  ¿Impacto? Todo lo que dice se comprobó el 20 de noviembre de 2026 contra el código real
            (`be/app/config.py`, `be/app/main.py`, `be/Dockerfile`, `docker-compose.yml`).
            Si una variable o el arranque cambian, este documento se actualiza en la misma rama.
-->

| Campo | Valor |
|---|---|
| **Fecha** | 20 de noviembre de 2026 |
| **Estado del despliegue** | **VerdeApp todavía no está desplegado en un servidor.** El proyecto está en desarrollo y corre en local, con Docker o con `uv run uvicorn` y `pnpm dev`. |
| **Qué cubre este documento** | Que el sistema está preparado para desplegarse: toda la configuración sale de variables de entorno validadas al arrancar, y el modo `production` se probó en local (sección 5). Esa prueba **no es** un despliegue en un servidor. |

## 1. Cómo arranca el backend

El `CMD` de `be/Dockerfile` ejecuta, en este orden y cortando en el primer fallo (`&&`):

1. `alembic upgrade head`: crea o actualiza las tablas. El esquema nunca se crea desde el código de la aplicación.
2. `python -m app.seed`: siembra las cuentas de prueba, **solo si `ENVIRONMENT=development`**. En producción se omite.
3. `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

Antes de todo eso, `app/config.py` lee y valida todas las variables. Si alguna falta o está mal, el proceso termina con un error que dice cuál es (sección 4), y no queda un backend a medio arrancar.

El contenedor además:

- corre con un usuario sin privilegios (`appuser`), no como root;
- tiene un `HEALTHCHECK` que consulta `GET /api/v1/health` cada 30 segundos;
- en `docker-compose.yml` solo arranca cuando la base `verde_db` está `healthy` (`depends_on: condition: service_healthy`).

## 2. Variables de entorno del backend (`be/.env`)

Se copian desde `be/.env.example`. El archivo `.env` real nunca se sube al repositorio.

| Variable | ¿Obligatoria? | Valor por defecto | Para qué sirve |
|---|---|---|---|
| `DATABASE_URL` | Sí | — | Conexión a PostgreSQL. Una URL `postgresql://` sin driver se convierte en `postgresql+psycopg2://`. |
| `SECRET_KEY` | Sí | — | Firma de los tokens JWT. Mínimo 32 caracteres, y se rechaza el valor de ejemplo del `.env.example`. Se genera con `openssl rand -hex 32`. |
| `ENVIRONMENT` | Sí | — | `development` o `production`, y nada más. Decide si `/docs` está abierto, si se siembran cuentas de prueba, si las cookies llevan `Secure` y qué orígenes acepta CORS. |
| `ALGORITHM` | No | `HS256` | Es el único valor aceptado. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `15` | Vida del token de acceso. |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | `7` | Vida del token de renovación. |
| `FRONTEND_URL` | No | `http://localhost:5173` | Dirección del frontend. Se usa en los enlaces de los correos y como **origen permitido por CORS**. |
| `API_PUBLIC_URL` | No | vacía | Dirección pública del backend, para armar los enlaces de las fotos en las descargas de la agenda. Detrás de un proxy hay que definirla. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD` | No | vacío, `1025`, vacío, vacío | Servidor de correo. Si `SMTP_HOST` tiene valor, se usa. En desarrollo apunta a Mailpit. |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME` | No | vacía, `onboarding@resend.dev`, `VerdeApp` | Alternativa a SMTP. Solo se usa si `SMTP_HOST` está vacío. |
| `CONTACT_EMAIL` | No | `contacto@verdeapp.local` | Buzón que recibe el formulario de contacto. |

Si `SMTP_HOST` y `RESEND_API_KEY` están vacías, los correos no se envían: solo quedan registrados en los logs del servidor.

## 3. Variables del frontend y de E2E

| Dónde | Variable | Para qué sirve |
|---|---|---|
| `fe/.env` | `VITE_API_URL` | Dirección del backend. Vite la escribe dentro del JavaScript **al compilar**, no al arrancar. Por eso, con Docker se pasa al construir la imagen (ver la sección 6) y cambiar `fe/.env` después no cambia nada. |
| `e2e/.env` | `E2E_RESIDENT_EMAIL`, `E2E_RESIDENT_PASSWORD` | Cuenta del Residente que usan las pruebas E2E. Son las cuentas de prueba públicas del seed. |

## 4. Errores de arranque (provocados a propósito)

Se probó construyendo la configuración (`Settings`) con cada variable mal. El backend no arranca y el mensaje dice qué corregir:

| Qué se hizo | Resultado | Mensaje |
|---|---|---|
| Todo correcto con `ENVIRONMENT=production` | Arranca | — |
| Falta `SECRET_KEY` | No arranca | `SECRET_KEY: Field required` |
| `SECRET_KEY` de 5 caracteres | No arranca | `SECRET_KEY debe tener al menos 32 caracteres. Genera una con: openssl rand -hex 32` |
| `SECRET_KEY` del `.env.example` | No arranca | `SECRET_KEY sigue siendo el valor de ejemplo de .env.example. Genera una propia con: openssl rand -hex 32` |
| Falta `ENVIRONMENT` | No arranca | `ENVIRONMENT: Field required` |
| `ENVIRONMENT=prod` | No arranca | `ENVIRONMENT: Input should be 'development' or 'production'` |
| Falta `DATABASE_URL` | No arranca | `DATABASE_URL: Field required` |
| `ALGORITHM=none` | No arranca | `ALGORITHM: Input should be 'HS256'` |
| `ACCESS_TOKEN_EXPIRE_MINUTES=abc` | No arranca | `ACCESS_TOKEN_EXPIRE_MINUTES: Input should be a valid integer, unable to parse string as an integer` |

Estas reglas tienen sus pruebas automáticas en `be/app/tests/test_config.py`.

## 5. Desarrollo y producción

Se arrancó la aplicación con `ENVIRONMENT=production` y `FRONTEND_URL=https://verdeapp.example.com` (un dominio de ejemplo), y se consultó con el cliente de pruebas de FastAPI:

| Qué se consultó | `development` | `production` |
|---|---|---|
| `GET /docs`, `/redoc`, `/openapi.json` | 200 | 404 |
| `GET /api/v1/health` | 200 | 200 |
| CORS desde el dominio del frontend | permitido | permitido |
| CORS desde `http://localhost:5173` | permitido | rechazado (400) |
| CORS desde un sitio cualquiera | rechazado (400) | rechazado (400) |
| Cuentas de prueba (seed) | se siembran | no se siembran |
| Cookie del token de renovación | sin `Secure` | con `Secure` |

Los orígenes de CORS salen de `FRONTEND_URL` (`origenes_permitidos` en `be/app/main.py`), así que desplegar en otro dominio no exige editar código. Sus pruebas están en `be/app/tests/test_cors_origenes.py`.

## 6. Cómo se desplegaría

**Backend**

1. Preparar `be/.env` con valores reales: `ENVIRONMENT=production`, una `SECRET_KEY` generada con `openssl rand -hex 32`, la `DATABASE_URL` de la base de producción, `FRONTEND_URL` con el dominio del frontend, `API_PUBLIC_URL` con el del backend y un servicio de correo (SMTP o Resend).
2. Construir y levantar la imagen: `docker compose up -d --build verde_be`. Al arrancar corre las migraciones y no siembra cuentas de prueba.

**Frontend**

1. Construir la imagen con la dirección real del backend, porque se escribe en el JavaScript al compilar:

```bash
VITE_API_URL=https://api.ejemplo.com docker compose build verde_fe
```

2. Levantar `verde_fe`. Nginx sirve los archivos estáticos y devuelve `index.html` en cualquier ruta para que funcione React Router (`fe/nginx.conf`).

## 7. Lo que falta para un despliegue real

Son límites conocidos de hoy, no errores ocultos:

- **No hay servidor ni dominio.** Todo lo anterior se probó en local.
- **El `docker-compose.yml` de la raíz es de desarrollo y demostración.** Trae las credenciales de la base de datos escritas (`verde_password`) y publica Mailpit. Para un servidor real habría que usar otras credenciales y una base de datos propia, y quitar Mailpit.
- **No hay HTTPS configurado.** Nginx escucha en el puerto 80; el certificado lo pondría un proxy o el proveedor de alojamiento.
- **`GET /api/v1/health` no revisa la base de datos:** responde 200 aunque PostgreSQL esté caída.

## 8. Cómo repetir la verificación

Desde `be/`, con la base de pruebas creada (ver el README):

```bash
uv run pytest app/tests/test_config.py app/tests/test_cors_origenes.py -q --no-cov
```

Para ver el modo producción en local, arrancar con las variables de la sección 5 y abrir `http://localhost:8000/docs`: debe responder 404.
