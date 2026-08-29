# OWASP Top 10 — Seguridad en VerdeApp

<!--
  ¿Qué? Documentación pedagógica de las 10 vulnerabilidades más críticas
        según OWASP (edición 2021) y cómo VerdeApp las mitiga — o no, con
        evidencia real de archivo y línea en ambos casos.
  ¿Para qué? Tarjeta #16 del backlog. VerdeApp maneja datos reales:
             ubicaciones de conjuntos residenciales, fotos de evidencia de
             auditorías, correos y contraseñas de sus usuarios.
  ¿Impacto? Esta auditoría encontró 3 vacíos de seguridad reales (no solo
            teóricos) y se corrigieron en el mismo momento, no se dejaron
            como pendientes documentados.
-->

> **Referencia oficial**: [OWASP Top 10 — 2021](https://owasp.org/Top10/)

---

## ¿Qué es OWASP?

Una fundación internacional sin fines de lucro dedicada a la seguridad del software. Su Top 10 es el listado de las vulnerabilidades más críticas y frecuentes en aplicaciones web, actualizado con datos reales de miles de organizaciones — es el estándar de facto de la industria.

---

## Resumen de Estado — VerdeApp

| # | Categoría | Estado | Implementación |
| --- | --- | --- | --- |
| A01 | Broken Access Control | ✅ Implementado | `get_current_user` + chequeos de rol y pertenencia por endpoint |
| A02 | Cryptographic Failures | ✅ Implementado | bcrypt + JWT HS256 + validación de `SECRET_KEY` |
| A03 | Injection | ✅ Implementado | SQLAlchemy ORM + validación Pydantic |
| A04 | Insecure Design | ✅ Corregido en esta auditoría | Rate limiting existía pero no estaba conectado — ver abajo |
| A05 | Security Misconfiguration | ✅ Corregido en esta auditoría | CORS + `/docs` ya estaban bien; faltaban cabeceras HTTP |
| A06 | Vulnerable Components | ✅ Monitoreado | Versiones fijadas + auditoría real con `pip-audit`/`pnpm audit` |
| A07 | Auth & Session Failures | ✅ Corregido en esta auditoría | Faltaba mitigar un ataque de temporización en el login |
| A08 | Software & Data Integrity | ✅ Implementado | Tokens JWT firmados (HMAC-SHA256) |
| A09 | Logging & Monitoring Failures | ✅ Corregido en esta auditoría | No existía NINGÚN registro de seguridad — se creó desde cero |
| A10 | Server-Side Request Forgery | ✅ N/A | El backend no hace peticiones a URLs controladas por el usuario |

---

## A01 — Broken Access Control

### ¿Qué es?

Un usuario accede a recursos o acciones para las que no tiene permiso. Es la vulnerabilidad #1 del Top 10 de OWASP.

### Cómo lo mitiga VerdeApp

`get_current_user` (`be/app/dependencies.py`) valida el JWT y **nunca** confía en ningún ID que venga del cliente — el usuario se identifica siempre por lo que dice su token firmado, no por un parámetro de la URL.

Encima de esa autenticación, cada router agrega su propio control de **autorización** (no basta con "estar logueado", hay que tener el rol/pertenencia correcta):

```python
# be/app/services/auditoria_conjunto_service.py — no es solo "eres residente",
# es "eres residente de ESTE conjunto específico"
def _pertenece_al_conjunto(db, current_user, id_conjunto) -> bool:
    if current_user.id_rol == RolId.RESIDENTE:
        # ...verifica que su unidad esté en id_conjunto...
    if current_user.id_rol == RolId.ADMIN_CONJUNTO:
        # ...verifica una asignación ACTIVA (fecha_desvinculacion IS NULL)...
        # un admin ya desvinculado NO puede seguir viendo las auditorías
        # del conjunto que dejó de administrar (RQF-016)
```

Otro ejemplo, en `auditoria_conjunto_service.py::obtener_por_id` (agregado en esta misma semana): un Reciclador solo puede ver el detalle de auditorías que **él mismo** envió, no las de otro reciclador autorizado en el mismo conjunto.

**Observación honesta**: cada router implementa su propio chequeo de rol a mano (`_verificar_es_reciclador`, `_verificar_es_admin_sistema`, etc.) en vez de un decorador o dependencia compartida. Funciona, pero es un patrón que depende de que cada desarrollador se acuerde de agregarlo — un candidato futuro de mejora sería centralizar esto en una dependencia parametrizada por rol.

---

## A02 — Cryptographic Failures

### Contraseñas — bcrypt

```python
# be/app/utils/security.py
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
```

bcrypt es deliberadamente **lento** — a diferencia de SHA-256 (rápido, pensado para hashes de integridad, no de contraseñas), un atacante con una GPU no puede probar miles de millones de combinaciones por segundo contra un hash bcrypt.

### `SECRET_KEY` con longitud mínima obligatoria

```python
# be/app/config.py
@field_validator("SECRET_KEY")
def validate_secret_key_strength(cls, v: str) -> str:
    if len(v) < 32:
        raise ValueError("SECRET_KEY debe tener al menos 32 caracteres...")
    return v
```

Una clave corta se puede romper por fuerza bruta — quien la rompe puede firmar tokens JWT válidos para cualquier usuario, incluido el Administrador del Sistema.

### JWT firmado con expiración corta

`access_token`: 15 minutos. `refresh_token`: 7 días. Cada token lleva su propio `"type"` (`access`/`refresh`) — un `refresh_token` robado no sirve para autenticar requests directamente, solo para pedir un `access_token` nuevo.

---

## A03 — Injection

### SQL — ORM en casi todo el proyecto

```python
# Consulta normal — SQLAlchemy parametriza automáticamente
db.execute(select(Usuario).where(Usuario.correo_electronico == correo))
```

Los pocos lugares con SQL "crudo" (`text(...)`) — `seed.py`, `reciclador_conjunto_service.py`, `admin.py` (búsqueda del directorio) — siempre pasan los valores reales por parámetros nombrados (`:search`, `:localidad_id`) nunca por concatenación directa de strings. `admin.py` en particular arma el SQL con f-strings, pero solo para insertar fragmentos de SQL fijos elegidos por el propio backend (por ejemplo, si agregar o no un filtro de localidad) — el valor que sí viene del usuario siempre entra como parámetro bindeado, nunca interpolado directamente.

### Validación de entrada — Pydantic

```python
class UserCreate(BaseModel):
    correo_electronico: EmailStr        # rechaza cualquier string que no sea un email real
    password: str                       # ver validate_password_strength abajo

    @field_validator("password")
    def validate_password_strength(cls, v):
        if len(v) < 8: raise ValueError(...)
        if not re.search(r"[A-Z]", v): raise ValueError(...)
        # ...mayúscula, minúscula y número obligatorios
```

Un request con datos mal formados nunca llega al service — FastAPI responde `422` automáticamente antes.

### XSS

El backend solo devuelve JSON, nunca HTML — no hay superficie de XSS del lado del servidor. El frontend usa React, que escapa automáticamente cualquier valor puesto en JSX (`{variable}`).

---

## A04 — Insecure Design (rate limiting)

### El bug real encontrado

VerdeApp ya tenía rate limiting con `slowapi` desde antes — `@limiter.limit("10/minute")` en `/login`, `5/minute` en `/register` y `/forgot-password`. **Pero nunca se había conectado del todo**: `main.py` nunca registraba `app.state.limiter` ni el manejador de la excepción `RateLimitExceeded`.

Efecto práctico: el límite SÍ bloqueaba la petición número 11 (el decorador revienta antes de ejecutar la vista), pero como no había un manejador registrado para esa excepción, en vez de una respuesta `429` limpia, probablemente se filtraba como un error sin manejar.

### La corrección (`be/app/main.py`)

```python
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

Con esto, superar el límite ahora responde siempre `429 {"error": "Rate limit exceeded: 10 per 1 minute"}` — se agregó una prueba (`test_supera_el_limite_de_intentos_devuelve_429_limpio`) que reactiva el limiter solo para esa prueba puntual y confirma la respuesta limpia.

### ¿Por qué 10/min para login y 5/min para register/forgot-password?

Un usuario real que se equivoca de contraseña necesita 2-3 intentos como mucho — 10/min es cómodo para uso normal pero inviable para probar miles de contraseñas. Registrar cuentas o pedir un reset de contraseña es algo que un humano hace 1-2 veces por minuto como mucho — 5/min evita creación masiva de cuentas falsas.

---

## A05 — Security Misconfiguration

### Lo que ya estaba bien

**CORS explícito** (`be/app/main.py`) — lista de orígenes permitidos (`localhost:5173`, `localhost:3000` y variantes), nunca `["*"]`.

**`/docs` y `/redoc` deshabilitados en producción**:

```python
_es_produccion = settings.ENVIRONMENT == "production"
app = FastAPI(docs_url=None if _es_produccion else "/docs", ...)
```

Swagger UI expone cada endpoint, parámetro y schema de la API sin necesitar autenticación — útil en desarrollo, pero facilita el reconocimiento previo a un ataque si queda pública en producción.

### El hueco real encontrado: sin cabeceras de seguridad HTTP

La auditoría no encontró **ninguna** cabecera de seguridad configurada — ni `X-Frame-Options`, ni `X-Content-Type-Options`, ni `Referrer-Policy`. Se agregó un middleware nuevo (`be/app/main.py`):

```python
@app.middleware("http")
async def agregar_cabeceras_seguridad(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response
```

| Cabecera | Protege contra |
| --- | --- |
| `X-Content-Type-Options: nosniff` | Que el navegador "adivine" el tipo real de un archivo — relevante porque VerdeApp ahora acepta fotos subidas por usuarios (evidencias de auditoría) |
| `X-Frame-Options: DENY` | Clickjacking — que otro sitio embeba la app en un `<iframe>` invisible |
| `Referrer-Policy` | Fuga de URLs completas (con posibles tokens) hacia sitios externos |
| `Permissions-Policy` | Acceso a cámara/micrófono/ubicación — VerdeApp no necesita ninguno |

Verificado en el servidor real corriendo (no solo en tests):

```
$ curl -sD - -o /dev/null http://localhost:8000/api/v1/health
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy: strict-origin-when-cross-origin
permissions-policy: camera=(), microphone=(), geolocation=()
```

---

## A06 — Vulnerable and Outdated Components

`be/pyproject.toml` fija **todas** las versiones exactas (`fastapi==0.135.1`, `sqlalchemy==2.0.48`, etc.) — no rangos abiertos, para que una actualización de una dependencia sea una decisión explícita, no algo que pase solo.

VerdeApp ya corrió y documentó una auditoría real de dependencias (`docs/gestion-proyecto/auditoria-dependencias.md`, 2026-08-24) con `pip-audit` (backend) y `pnpm audit` (frontend): de 24 vulnerabilidades de backend bajó a 21 en un solo paquete (`ecdsa`, sin corrección disponible, evaluado como no explotable porque VerdeApp firma sus JWT con HS256, no con el algoritmo afectado); de 92 vulnerabilidades de frontend (1 crítica) bajó a 44 (0 críticas).

```bash
# Repetible en cualquier momento:
uvx pip-audit --requirement <(uv export --no-hashes --no-dev) -s osv
```

---

## A07 — Authentication and Session Failures

### Lo que ya estaba bien

- Contraseñas: mínimo 8 caracteres, mayúscula, minúscula y número obligatorios.
- Tokens de un solo uso (`used: bool`) y con expiración, para reset de contraseña y verificación de email — una vez usados, se marcan y no vuelven a servir.
- Mensaje de error genérico en login (`"Credenciales incorrectas"`) sin importar si falla el correo o la contraseña — evita que alguien pueda usar el mensaje de error para averiguar qué correos están registrados.

### Agregado después (2026-08-29): bloqueo de cuenta tras intentos fallidos

El rate limit de `slowapi` (10 intentos/minuto) protege por **dirección IP** — no distingue si esos 10 intentos son contra la misma cuenta o contra 10 cuentas distintas. `usuarios.intentos_fallidos`/`bloqueado_hasta` agregan un segundo control, por **cuenta específica**: 5 fallos seguidos contra el mismo correo bloquean esa cuenta 15 minutos, sin importar desde cuántas IPs distintas vengan los intentos. Son controles complementarios, no redundantes — uno frena un ataque masivo desde una sola máquina, el otro frena un ataque dirigido a una cuenta específica desde varias.

### El hueco real encontrado: ataque de temporización

El mensaje genérico de arriba no es suficiente por sí solo. El código original solo llamaba a `verify_password()` (una comparación bcrypt, deliberadamente lenta) **cuando el usuario existía**:

```python
# ANTES — dos ramas con tiempos de respuesta MUY distintos
if not user or not verify_password(login_data.password, user.password):
```

Si `user` es `None`, Python nunca evalúa `verify_password` (short-circuit del `or`) — esa rama responde en microsegundos. Si el usuario existe pero la contraseña es incorrecta, bcrypt sí corre, tardando decenas de milisegundos. Un atacante puede medir esa diferencia (con una herramienta como Burp Repeater, probando el mismo request cientos de veces) y así descubrir qué correos SÍ están registrados en VerdeApp — aunque el mensaje de error visible sea idéntico en ambos casos.

### La corrección (`be/app/utils/security.py` + `auth_service.py`)

```python
# security.py — un hash bcrypt real de una contraseña que no le pertenece a nadie
DUMMY_PASSWORD_HASH = pwd_context.hash("no-corresponde-a-ninguna-cuenta-real")

# auth_service.py — AHORA siempre se corre verify_password, exista o no el usuario
password_hash = user.password if user else DUMMY_PASSWORD_HASH
if not user or not verify_password(login_data.password, password_hash):
    raise HTTPException(401, "Credenciales incorrectas")
```

Las dos ramas ahora tardan lo mismo — no queda ninguna señal de temporización que un atacante pueda medir.

### Agregado después (2026-08-28): logout que invalida el token de verdad (HU-008/RQF-007)

Otro hueco de sesión encontrado: "cerrar sesión" solo borraba el token del navegador (`sessionStorage`) — el servidor nunca se enteraba, así que ese mismo `access_token`, si alguien lo hubiera copiado antes, seguía siendo válido hasta expirar solo (15 minutos). Se agregó un `jti` único a cada token y una tabla `tokens_revocados`: al cerrar sesión (`POST /api/v1/auth/logout`), el `jti` del access y del refresh token se guarda ahí, y `get_current_user`/`refresh_access_token` los rechazan con 401 aunque no hayan expirado. Verificado con curl reutilizando el token exacto de una sesión recién cerrada.

---

## A08 — Software and Data Integrity Failures

Los tokens JWT están firmados con HMAC-SHA256 usando el `SECRET_KEY` del servidor. Cualquier modificación al contenido del token (por ejemplo, cambiar `"role_id": 2` por `"role_id": 1` para intentar pasar por Administrador del Sistema) invalida la firma, y `decode_token()` lo rechaza con un `JWTError`.

---

## A09 — Security Logging and Monitoring Failures

### El hueco real encontrado: no existía NADA

La auditoría buscó exhaustivamente (`logging`, `logger`, `audit`) en todo el backend. El único logging que existía era **operativo** — confirmaciones de envío de correo (`app/utils/email.py`) — cero registro de eventos de seguridad: ni logins fallidos, ni cambios de contraseña, ni accesos denegados por rol. Sin esos registros, un ataque en curso (alguien probando contraseñas contra una cuenta específica) no deja ningún rastro que revisar después.

> **Dato real**: el tiempo promedio que tarda una organización en detectar una brecha de seguridad es de **280 días** (IBM Cost of a Data Breach Report, 2023). Sin logs, ese número solo puede ser peor.

### La corrección: `be/app/utils/audit_log.py` (módulo nuevo)

```python
def log_login_exitoso(correo: str) -> None: ...
def log_login_fallido(correo: str, motivo: str) -> None: ...
def log_password_cambiada(correo: str) -> None: ...
def log_acceso_denegado(correo: str, endpoint: str, motivo: str) -> None: ...
```

Conectado en `login_user()` (éxito y las 2 razones de fallo: credenciales inválidas / cuenta sin verificar) y en `change_password()`. Cada evento se registra en JSON estructurado, una línea por evento:

```json
{"timestamp": "2026-08-28T05:12:00+00:00", "event": "login_failed", "email": "re***@correo.com", "reason": "credenciales_invalidas"}
```

**¿Por qué JSON y no texto plano?** Herramientas como Elasticsearch o Datadog pueden indexar estas líneas y armar alertas automáticas — por ejemplo, "avisar si hay más de 20 `login_failed` desde el mismo correo en 5 minutos".

**¿Por qué el correo redactado (`re***@correo.com`)?** Un archivo de logs es, en el fondo, un archivo de texto más. Si el servidor se compromete, los logs no deben revelar el correo completo de nadie — la redacción deja lo suficiente para diagnosticar sin exponer el dato completo.

> **Alcance de esta primera versión**: se conectó en login y cambio de contraseña, los dos eventos de mayor impacto de seguridad. Extenderlo a los `_verificar_es_*` de cada router (registrar cada acceso denegado por rol) es un buen siguiente paso, no incluido aún.

---

## A10 — Server-Side Request Forgery (SSRF)

**No aplica**: VerdeApp no tiene ningún endpoint que reciba una URL del usuario y la use para hacer una petición desde el servidor. Las únicas peticiones HTTP salientes son el envío de correo (Resend API o SMTP fijo, configurado por variables de entorno del servidor, nunca por el usuario). Si en el futuro se agregara alguna integración con URLs externas (por ejemplo, importar datos desde un link), habría que validar contra una lista blanca de dominios y bloquear rangos de IP privados antes de hacer la petición.

---

## Resumen Visual

```
┌────────────────────────────────────────────────────────────────────┐
│                      VerdeApp — flujo de login                     │
│                                                                     │
│  Cliente          FastAPI Backend                Base de Datos     │
│  ────────         ──────────────────             ──────────────    │
│                                                                     │
│  POST /login ──►  Rate Limiting (A04) — 10/min, con handler 429    │
│                    Cabeceras de seguridad (A05) en toda respuesta  │
│                         │                                          │
│                    Validación Pydantic (A03)                       │
│                         │                                          │
│                    verify_password() SIEMPRE (A07)                 │
│                    real o DUMMY_PASSWORD_HASH — sin fuga de tiempo │
│                         │                                          │
│                    audit_log.py (A09) ─────────►  logs JSON        │
│                    login_success / login_failed                    │
│                         │                                          │
│  JWT Token   ◄──   Firmado HS256 (A02/A08)                         │
│                     access: 15min · refresh: 7 días                │
│                                                                     │
│  Siguiente   ──►   get_current_user (A01)                          │
│  request            + chequeo de rol/pertenencia por endpoint      │
└────────────────────────────────────────────────────────────────────┘
```

---

## Recursos de Aprendizaje

| Recurso | URL |
| --- | --- |
| OWASP Top 10 oficial | https://owasp.org/Top10/ |
| OWASP Cheat Sheets | https://cheatsheetseries.owasp.org/ |
| JWT Debugger | https://jwt.io/ |
| Security Headers (verificador online) | https://securityheaders.com/ |

---

> **Conclusión pedagógica**: los 3 huecos reales que encontró esta auditoría (rate limiter mal conectado, sin cabeceras de seguridad, timing attack en login) tienen algo en común — ninguno era "no saber qué hacer". El rate limiter YA estaba escrito, solo le faltaban 2 líneas de conexión. La mitigación del timing attack es un patrón conocido (el "dummy hash") que simplemente nunca se había aplicado. La seguridad no falla solo por ignorancia — falla por piezas que se quedan a medio conectar. Por eso una auditoría real, revisando el código en vez de solo la lista de checkboxes, encuentra cosas que "en teoría ya estaba implementado" no detecta.
