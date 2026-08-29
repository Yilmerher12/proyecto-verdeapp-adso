# Patrones Arquitectónicos — VerdeApp

<!--
  ¿Qué? Documentación pedagógica de los patrones de arquitectura y diseño de
        software aplicados en VerdeApp, con evidencia real (archivo y línea)
        de cada uno — no es teoría genérica, es lo que de verdad hay en el
        código de este proyecto.
  ¿Para qué? Tarjeta #16 del backlog pide auditar y documentar estos temas.
             Sirve como referencia de estudio y para defender decisiones
             técnicas ante el profesor o en una presentación.
  ¿Impacto? Entender por qué el código está organizado así facilita
            mantenerlo, extenderlo, y explicar decisiones que de otra forma
            parecerían arbitrarias.
-->

> **Proyecto:** VerdeApp — gestión de residuos para conjuntos residenciales de Bogotá
> **Stack:** FastAPI + React + PostgreSQL + Docker

---

## Resumen ejecutivo

VerdeApp aplica **14 patrones** de arquitectura y diseño de uso profesional. Los primeros 10 son patrones estándar de cualquier app FastAPI + React con autenticación; los últimos 4 son decisiones propias de este proyecto, nacidas de problemas reales que se presentaron durante el desarrollo (no de un tutorial).

| # | Patrón | Dónde vive | Qué resuelve |
| --- | --- | --- | --- |
| 1 | Arquitectura en Capas | `be/app/` | Separación de responsabilidades en el backend |
| 2 | DTO — Data Transfer Object | `be/app/schemas/` | Nunca exponer datos internos de la BD (ej. el hash de la contraseña) |
| 3 | Inyección de Dependencias | `be/app/dependencies.py` | Desacoplar servicios transversales (BD, autenticación) |
| 4 | JWT Stateless | `be/app/utils/security.py` | Autenticación sin guardar sesión en el servidor |
| 5 | Context / Provider | `fe/src/context/AuthContext.tsx` | Estado de sesión global en toda la app React |
| 6 | Custom Hook | `fe/src/hooks/` | Encapsular y reutilizar lógica (sesión, búsqueda con debounce) |
| 7 | Interceptor | `fe/src/api/axios.ts` | Adjuntar el token JWT y manejar sesión vencida automáticamente |
| 8 | SPA + Route Guard (+ Guard de rol) | `ProtectedRoute.tsx` + `RoleGuard.tsx` | Proteger rutas por sesión Y por rol, sin repetir lógica en cada página |
| 9 | Monorepo | `be/` + `fe/` + `docker-compose.yml` | Backend, frontend e infraestructura en un solo repositorio |
| 10 | REST API | `be/app/routers/` | Interfaz estándar HTTP entre frontend y backend |
| 11 | Service Layer por dominio | `be/app/services/` | Un archivo de lógica de negocio por tema (auditorías, comunicados, desvinculación...) |
| 12 | Migración Expand/Contract | `be/alembic/versions/*uuid_migracion*` | Cambiar el tipo de las llaves primarias de 20 tablas sin perder datos reales |
| 13 | Siembra de datos con guardas independientes | `be/app/seed.py` | Que sembrar datos de prueba sea repetible sin duplicar ni saltarse secciones nuevas |
| 14 | Internacionalización (i18n) | `fe/src/i18n.ts` + `fe/src/locales/` | Toda la app en español/inglés, con la preferencia guardada por usuario |

---

## Vista general del sistema

VerdeApp sigue una **arquitectura Cliente–Servidor** de tres capas lógicas:

1. **Frontend (React)** — interfaz de usuario, no guarda ningún estado en el servidor.
2. **Backend (FastAPI)** — lógica de negocio, expone una API REST bajo `/api/v1/`.
3. **Base de datos (PostgreSQL)** — persistencia, solo accedida desde el backend.

La comunicación es exclusivamente **HTTP + JSON**. Los tokens JWT viajan en el header `Authorization: Bearer <token>`. No hay sesiones guardadas en el servidor.

---

## Patrón 1 — Arquitectura en Capas

### ¿Qué es?

Organizar el código en capas horizontales donde cada capa solo se comunica con la capa directamente inferior.

### ¿Cómo se aplica aquí?

```
HTTP Request
      ↓
┌─────────────────────────────────────────┐
│  routers/          → Capa HTTP           │  Recibe y devuelve HTTP
├─────────────────────────────────────────┤
│  services/         → Capa de Negocio     │  Reglas y decisiones
├─────────────────────────────────────────┤
│  models/ + schemas → Capa de Datos       │  ORM + Validación
├─────────────────────────────────────────┤
│  utils/            → Capa Transversal    │  seguridad · ids · email
└─────────────────────────────────────────┘
      ↓
PostgreSQL
```

### Ejemplo real: crear una auditoría (RQF-009)

```python
# be/app/routers/auditoria_conjunto.py — solo recibe el request y delega
@router.post("", response_model=AuditoriaConjuntoResponse, status_code=201)
async def crear_auditoria(
    id_conjunto_residencial: UUID = Form(...),
    evidencias: list[UploadFile] = File(...),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AuditoriaConjuntoResponse:
    _verificar_es_reciclador(current_user)
    auditoria = await service.crear_auditoria(db=db, ...)   # ← delega al service
    return _a_response(auditoria)

# be/app/services/auditoria_conjunto_service.py — contiene la lógica real
async def crear_auditoria(db, id_usuario_reciclador, ..., evidencias) -> AuditoriaConjunto:
    reciclador = _obtener_reciclador(db, id_usuario_reciclador)
    _verificar_autorizado(db, reciclador.id_reciclador, id_conjunto_residencial)
    rutas = [await _guardar_evidencia(archivo) for archivo in evidencias]  # llama a utils
    ...
```

### Ventaja

Un cambio en cómo se guarda una auditoría en la base de datos no afecta al router. Un cambio en el formato del request no afecta la lógica de negocio. Cada capa se puede probar por separado (por eso el backend tiene 245 tests sin necesitar un servidor HTTP real corriendo).

---

## Patrón 2 — DTO (Data Transfer Object)

### ¿Qué es?

Un objeto pensado solo para transportar datos entre capas, distinto del modelo de base de datos.

### ¿Por qué es crítico aquí?

El modelo ORM `Usuario` tiene una columna `password` con el hash bcrypt. Si se devolviera el objeto ORM directamente en una respuesta HTTP, **el hash quedaría expuesto**. El schema de Pydantic actúa como filtro.

```python
# be/app/models/usuario.py — modelo ORM (lo que hay en la BD)
class Usuario(Base):
    id_usuario = Column(UUID(as_uuid=True), primary_key=True, ...)
    correo_electronico = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)   # ← el hash bcrypt, NUNCA debe salir
    id_rol = Column(Integer, ForeignKey("roles.id_rol"), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)

# be/app/schemas/user.py — lo que de verdad se devuelve al cliente
class UserResponse(BaseModel):
    id: UUID
    email: str
    role_id: int
    is_active: bool
    first_name: str
    last_name: str
    locale: str
    # password: ← OMITIDO A PROPÓSITO, ni siquiera aparece en el schema
```

FastAPI convierte el modelo ORM al schema automáticamente vía `response_model=UserResponse` — cualquier campo que no esté declarado en el schema se descarta, así el router jamás lo mande sin querer.

### Ventaja

El contrato de la API (el schema) puede cambiar sin tocar la tabla de la base de datos, y viceversa — son dos cosas independientes a propósito.

---

## Patrón 3 — Inyección de Dependencias (DI)

### ¿Qué es?

En vez de que cada función cree sus propias dependencias (una conexión a la BD, el usuario autenticado), las recibe ya resueltas desde afuera. FastAPI lo implementa con `Depends()`.

### Ejemplo real

```python
# be/app/dependencies.py
def get_db() -> Generator[Session, None, None]:
    """Una sesión de BD por request; se cierra sola al terminar."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(http_bearer),  # DI: extrae el token del header
    db: Session = Depends(get_db),                                     # DI: inyecta la sesión de BD
) -> Usuario:
    """Valida el JWT (debe ser type=access, y no estar revocado) y devuelve el usuario autenticado."""
    ...
```

```python
# be/app/routers/auditoria_conjunto.py — se consume de forma declarativa
async def crear_auditoria(
    current_user: Usuario = Depends(get_current_user),  # DI automática
    db: Session = Depends(get_db),                       # DI automática
    ...
):
```

### Ventaja

Para los 245 tests del backend, `get_db` se reemplaza por una base de datos de prueba sin tocar ni un router — FastAPI resuelve el cambio automáticamente vía `app.dependency_overrides`.

---

## Patrón 4 — JWT Stateless

### ¿Qué es?

El servidor no guarda ninguna sesión. En su lugar, firma un token que el cliente presenta en cada request; el servidor solo verifica la firma.

### Tokens del sistema

| Token | Duración | Propósito |
| --- | --- | --- |
| `access_token` | ~15 minutos (`ACCESS_TOKEN_EXPIRE_MINUTES`) | Autenticar cada request a un endpoint protegido |
| `refresh_token` | 7 días (`REFRESH_TOKEN_EXPIRE_DAYS`) | Pedir un `access_token` nuevo sin volver a hacer login |

```python
# be/app/utils/security.py
def create_access_token(data: dict) -> str:
    payload = {**data, "exp": ..., "type": "access"}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except JWTError:
        return None
```

`get_current_user` en `dependencies.py` además rechaza explícitamente un `refresh_token` usado como si fuera de acceso (`payload.get("type") != "access"`) — sin este chequeo, un token pensado solo para renovar sesión serviría para autenticar cualquier request.

### Ventaja

El backend puede escalar a varias instancias sin compartir ninguna tabla de sesiones — toda la información necesaria viaja dentro del propio token.

### La excepción honesta: logout (HU-008/RQF-007)

"Stateless de verdad" significaría que el servidor no puede invalidar un token antes de su expiración natural — y ese era justo el problema: cerrar sesión no revocaba nada en el servidor. Se agregó la única pieza de estado que rompe la pureza del patrón a propósito: la tabla `tokens_revocados` (`jti` + fecha de expiración). Cada token lleva un `jti` único desde que se crea; al cerrar sesión, su `jti` se guarda ahí, y `get_current_user`/`refresh_access_token` lo consultan en cada request. Es un compromiso deliberado: se sacrifica un poco de "pureza stateless" (una tabla más para consultar) a cambio de que "cerrar sesión" invalide el token de verdad, no solo en el navegador.

---

## Patrones 5, 6, 7 y 8 — Frontend React

---

## Patrón 5 — Context / Provider

### ¿Qué es?

React comparte estado global (la sesión del usuario) sin pasar props manualmente por cada nivel del árbol de componentes.

```tsx
// fe/src/context/AuthContext.tsx
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  // ...login/register/logout/changePassword...
  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
```

```tsx
// fe/src/App.tsx
<BrowserRouter>
  <AuthProvider>
    <ServerErrorBanner />
    <Routes>...</Routes>
  </AuthProvider>
</BrowserRouter>
```

### Ventaja

Cualquier dashboard, cualquier formulario, accede a la misma sesión sin recibirla por props.

---

## Patrón 6 — Custom Hook

### ¿Qué es?

Una función de React que encapsula lógica reutilizable, puede usar otros hooks por dentro.

```typescript
// fe/src/hooks/useAuth.ts
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth() debe usarse dentro de <AuthProvider>");
  return context;
}
```

Otro ejemplo, más específico de VerdeApp — `fe/src/hooks/useConjuntoBusqueda.ts`: encapsula la búsqueda con debounce (300ms) que usa el buscador de conjuntos residenciales (necesario porque el catálogo real tiene más de 14.500 registros, no se puede cargar completo en un `<select>`).

### Ventaja

En vez de repetir `useContext(AuthContext)` con su validación en cada componente, o repetir la lógica de debounce en cada buscador, se centraliza una sola vez.

---

## Patrón 7 — Interceptor

### ¿Qué es?

Middleware del lado del cliente HTTP que procesa toda petición o respuesta antes de que llegue al código de la aplicación.

```typescript
// fe/src/api/axios.ts
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && /* había sesión activa */) {
      sessionStorage.clear();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);
```

VerdeApp agrega un detalle propio: los mismos interceptores también se registran sobre el módulo `axios` "pelado" (sin la instancia `api`), porque varias pantallas más antiguas todavía importan `axios` directamente — así ninguna petición se queda sin el token o sin el manejo de sesión vencida por usar el import "equivocado".

### Ventaja

Ningún componente necesita acordarse de poner el header `Authorization`, ni de qué hacer si la sesión venció — está resuelto en un solo lugar.

---

## Patrón 8 — SPA + Route Guard (con guarda de rol)

### ¿Qué es?

En una SPA, el enrutamiento ocurre en el navegador sin recargar la página. VerdeApp usa DOS guardas encadenadas, no solo una:

```tsx
// fe/src/components/ProtectedRoute.tsx — ¿hay sesión?
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

// fe/src/components/RoleGuard.tsx — ¿es el rol correcto?
export function RoleGuard({ allowedRoles }: { allowedRoles: RoleId[] }) {
  const { user } = useAuth();
  if (!allowedRoles.includes(user.role_id)) return <Navigate to={/* su propio dashboard */} replace />;
  return <Outlet />;
}
```

```tsx
// fe/src/App.tsx — un ejemplo real de las 4 rutas de dashboard
<Route element={<ProtectedRoute />}>
  <Route element={<RoleGuard allowedRoles={[RoleId.ADMIN_CONJUNTO]} />}>
    <Route path="/dashboard/admin-conjunto" element={<AppShell><AdminConjuntoDashboard /></AppShell>} />
  </Route>
</Route>
```

### ¿Por qué hace falta el segundo guardia?

VerdeApp tiene 4 roles (Residente, Reciclador, Admin de Conjunto, Administrador del Sistema), cada uno con su propio dashboard. `ProtectedRoute` por sí solo evita que alguien sin sesión vea CUALQUIER dashboard — pero no evita que un Residente autenticado escriba a mano `/dashboard/admin-conjunto` en la barra de direcciones. `RoleGuard` es el que lo redirige de vuelta a SU dashboard si el rol no coincide.

### Ventaja

Ningún componente de dashboard necesita revisar el rol por su cuenta — para cuando `AdminConjuntoDashboard` se renderiza, ya está garantizado que quien lo ve tiene sesión Y es Admin de Conjunto.

---

## Patrón 9 — Monorepo

```
proyecto-verdeapp-adso/         ← un solo repositorio git
├── be/                         ← Backend (Python / FastAPI)
│   ├── app/
│   └── pyproject.toml
├── fe/                         ← Frontend (React / TypeScript)
│   ├── src/
│   └── package.json
├── docker-compose.yml          ← infraestructura compartida (Postgres, backend, mailpit)
└── docs/
```

### Ventaja

Un solo `git clone` trae todo. Un cambio que toca backend Y frontend a la vez (como la migración a UUID de esta misma semana, que tocó modelos, schemas, tipos de TypeScript y tests de ambos lados) viaja en el mismo PR, no en dos repos sincronizados a mano.

---

## Patrón 10 — REST API

Recursos HTTP con verbos y códigos de estado estándar, bajo `/api/v1/`:

| Verbo | Ruta | Código OK | Descripción |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/register` | `201` | Registrar nuevo usuario |
| `POST` | `/api/v1/auth/login` | `200` | Iniciar sesión, obtener tokens |
| `POST` | `/api/v1/auditorias-conjunto` | `201` | Reciclador audita un conjunto |
| `GET` | `/api/v1/auditorias-conjunto/mias` | `200` | Auditorías que YO ya envié (reciclador) |
| `PATCH` | `/api/v1/comunicados/{id_comunicado}` | `200` | Editar un comunicado |
| `DELETE` | `/api/v1/notificaciones/limpiar-leidas` | `200` | Borrar notificaciones ya leídas |

### Ventaja

Cualquier cliente (React, Postman, curl) puede consumir la API con HTTP estándar. La documentación es automática en `/docs` (Swagger UI) — deshabilitada en producción, ver `owasp-top-10.md`.

---

## Patrón 11 — Service Layer por dominio

### ¿Qué es?

En vez de un único archivo gigante de "lógica de negocio", cada tema del negocio tiene su propio archivo de servicio.

```
be/app/services/
├── admin_conjunto_service.py       ← invitaciones, solicitudes de desvinculación
├── auditoria_conjunto_service.py   ← auditorías del reciclador (RQF-009)
├── auth_service.py                 ← login, registro, reset de contraseña
├── comunicado_service.py           ← comunicados del Admin de Conjunto (RQF-014)
├── contenido_educativo_service.py  ← catálogo educativo (RQF-004/010)
├── desvinculacion_service.py       ← desvinculación de conjuntos (RQF-016)
├── notificaciones_helpers.py       ← quién debe recibir cada tipo de aviso
├── novedad_service.py              ← novedades del Admin del Sistema (RQF-015)
└── reciclador_conjunto_service.py  ← vínculo reciclador ↔ conjunto
```

### Ventaja

Encontrar la lógica de "cómo se resuelve una solicitud de desvinculación" es ir directo a `desvinculacion_service.py`, no buscar en un archivo de 3.000 líneas. Cada archivo se puede probar (y de hecho se prueba) de forma aislada.

---

## Patrón 12 — Migración Expand/Contract

### ¿Qué es?

Un patrón para cambiar el esquema de una base de datos **que ya tiene datos reales**, sin tumbar el sistema ni perder información, dividiendo el cambio en pasos reversibles seguidos de un paso final irreversible.

### Por qué hizo falta aquí

VerdeApp migró las llaves primarias de 20 tablas de enteros secuenciales a UUIDv7 (a pedido explícito del profesor: los IDs numéricos consecutivos son adivinables). La tabla `conjuntos_residenciales` ya tenía 14.515 filas reales importadas de datos abiertos de Bogotá — no se podía simplemente "cambiar el tipo de columna".

### Los 3 pasos reales (`be/alembic/versions/`)

1. **`..._paso_1_agregar_y_poblar_...`** — agrega una columna `id_uuid` nueva (sin tocar la vieja) a cada tabla, y la llena con un UUIDv7 recién generado por fila. No destructivo: la columna entera original sigue intacta.
2. **`..._paso_2_poblar_fks_nuevas...`** — agrega una columna `*_uuid` a cada llave foránea, y la llena cruzando contra el `id_uuid` que el padre ya tiene del paso 1. Sigue sin tocar nada viejo.
3. **`..._paso_3_eliminar_columnas_...`** — recién aquí se sueltan las columnas enteras viejas, se renombran las `*_uuid` a los nombres originales, y se recrean las llaves primarias/foráneas. Este paso está documentado en el propio código como **destructivo e irreversible**, y solo se corrió después de probar los 3 pasos completos contra una copia desechable de la base de datos real.

### Ventaja

Si algo salía mal en el paso 1 o 2, todavía existían las columnas originales para recuperarse sin perder nada. El riesgo real (borrar datos) queda concentrado en un único paso final, ya validado de antemano.

---

## Patrón 13 — Siembra de datos con guardas independientes

### ¿Qué es?

Un script de siembra (`be/app/seed.py`) que puede correr muchas veces sin duplicar datos, corrigiendo un problema real que ya ocurrió en este proyecto.

```python
def ya_esta_sembrada(connection) -> bool:
    return connection.execute(text("SELECT COUNT(*) FROM roles")).scalar() > 0

def conjuntos_ya_importados(connection) -> bool:
    """Revisión INDEPENDIENTE — ver el bug que motivó esto abajo."""
    return connection.execute(text("SELECT COUNT(*) FROM conjuntos_residenciales")).scalar() > 0
```

### El bug real que esto arregla

Antes había un solo interruptor (`ya_esta_sembrada`, mirando la tabla `roles`). Cuando se agregó la importación del CSV real de conjuntos como un paso nuevo del mismo script, cualquiera que YA tuviera una base de datos local sembrada (de antes de ese cambio) hacía `git pull`, corría `seed.py` de nuevo, y el script se salía de inmediato en el primer chequeo — sin llegar nunca a importar los conjuntos reales nuevos, porque `roles` ya tenía filas de la siembra anterior.

### Ventaja

Cada sección de la siembra revisa su propia condición. Si en el futuro se agrega una sección nueva, una base de datos existente la recibe igual, en vez de quedar bloqueada por un flag que solo era cierto para lo que existía cuando se sembró por primera vez.

---

## Patrón 14 — Internacionalización (i18n)

### ¿Qué es?

Toda la interfaz vive en dos idiomas (español/inglés) sin duplicar componentes.

```typescript
// fe/src/i18n.ts
i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { es: { translation: esJSON }, en: { translation: enJSON } },
    fallbackLng: "es",
    detection: { order: ["localStorage", "navigator", "htmlTag"] },
  });
```

```tsx
// cualquier componente
const { t } = useTranslation();
<h1>{t("auth.login.title")}</h1>
```

**Detalle propio de VerdeApp**: el idioma no solo se guarda en `localStorage` del navegador — también vive en la columna `Usuario.locale` de la base de datos, y se sincroniza al iniciar sesión (`i18n.changeLanguage(userData.locale)` en `AuthContext.tsx`). Así, un Admin de Conjunto que configuró inglés desde su computador del trabajo ve la app en inglés también desde su celular, sin volver a configurarlo.

### Ventaja

Ningún texto queda escrito directamente en un componente — todo pasa por `t("clave.anidada")`, así que agregar un idioma nuevo es agregar un archivo JSON, no tocar componentes.

---

## Relación entre patrones

```
┌──────────────────────────────────────────────────────────────────────┐
│ Monorepo (#9)                                                        │
│                                                                      │
│  ┌─── REST API (#10) ─────────────────────────────────────────────┐  │
│  │                                                                │  │
│  │  Frontend (SPA #8)              Backend (Capas #1)             │  │
│  │  ┌──────────────────────┐       ┌───────────────────────────┐  │  │
│  │  │ Provider (#5)         │       │ routers/                  │  │  │
│  │  │  Hook (#6)            │←──────│ services/ por dominio (#11)│  │  │
│  │  │  RouteGuard+Rol (#8)  │──────→│  ← DI (#3)                │  │  │
│  │  │  Interceptor (#7)     │       │ models/schemas ← DTO (#2) │  │  │
│  │  │  i18n (#14)           │       │ utils/ ← JWT (#4)         │  │  │
│  │  └──────────────────────┘       └───────────────────────────┘  │  │
│  │                                          ↕                     │  │
│  │                                 PostgreSQL (SQLAlchemy)         │  │
│  │                                 ← migrado con Expand/Contract   │  │
│  │                                   (#12), sembrado con guardas   │  │
│  │                                   independientes (#13)          │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

Juntos, estos 14 patrones hacen que VerdeApp sea:

- **Seguro** — DTO + JWT + guardas de rol (ver `owasp-top-10.md`)
- **Mantenible** — Capas + Service Layer + DI + Custom Hooks
- **Escalable** — Stateless + REST + Monorepo
- **Testeable** — DI con overrides + 245 tests backend + 167 tests frontend
- **Evolutivo sin perder datos** — Expand/Contract + siembra con guardas independientes
