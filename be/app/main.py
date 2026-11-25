import logging
import sys
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.config import settings
from app.utils.limiter import limiter
from app.utils.audit_log import ip_de_origen
from app.routers import auth, users, geography, admin
from app.routers import admin_conjunto
from app.routers import conjunto_panel
from app.routers import reciclador_conjunto
from app.routers import directorio
from app.routers import notificaciones
from app.routers import contenido_educativo
from app.routers import comunicados
from app.routers import novedades
from app.routers import novedades_enviadas
from app.routers import auditoria_conjunto
from app.routers import uploads
from app.routers import puntos_acopio
from app.routers import contact

# ¿Qué? El esquema de la base de datos ya NO se crea aquí en tiempo de ejecución.
# ¿Para qué? Antes esta sección llamaba a Base.metadata.create_all(bind=engine), que
#           solo puede AGREGAR tablas nuevas — nunca modifica ni elimina columnas de
#           tablas que ya existen. Ahora el esquema se gestiona con Alembic
#           (be/alembic/versions/), que sí sabe aplicar cambios incrementales.
# ¿Impacto? El Dockerfile del backend ya ejecuta "alembic upgrade head" antes de
#           levantar Uvicorn (ver be/Dockerfile), así que el esquema se actualiza
#           solo al iniciar el contenedor. En desarrollo local (sin Docker), hay que
#           correr "alembic upgrade head" manualmente después de cada cambio en los
#           modelos — ver docs/setup o preguntar antes de generar una migración nueva.
# ¿Qué? Antes esta línea era "FastAPI(title=...)" sin más — /docs y /redoc
#       quedaban siempre encendidos sin importar el entorno, pese a que el
#       comentario de settings.ENVIRONMENT (app/config.py) ya decía que
#       debían apagarse en producción.
# ¿Para qué? OWASP A05 (Security Misconfiguration): la documentación
#           interactiva expone todos los endpoints y schemas sin auth —
#           útil en desarrollo, un riesgo real si queda pública en producción.
# ¿Impacto? Con ENVIRONMENT=production, /docs y /redoc devuelven 404. En
#           development siguen disponibles. ENVIRONMENT es obligatoria: sin
#           ella el backend no arranca (ver app/config.py).
_es_produccion = settings.ENVIRONMENT == "production"

# ¿Qué? Issue #309 (CN-012): configura el logging raíz de Python en nivel INFO.
# ¿Para qué? Sin esto, el logger raíz queda en WARNING y todo logger.info() de
#           la app se descartaba en silencio — incluidos los eventos de
#           seguridad de utils/audit_log.py (login_success, login_failed,
#           password_changed, access_denied), que nunca llegaban a ningún lado.
# ¿Impacto? Uvicorn configura sus propios loggers aparte (sin propagar al
#           raíz), así que no se duplican sus líneas de acceso.
logging.basicConfig(
    level=logging.INFO,
    stream=sys.stdout,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

app = FastAPI(
    title="VerdeApp API",
    docs_url=None if _es_produccion else "/docs",
    redoc_url=None if _es_produccion else "/redoc",
    openapi_url=None if _es_produccion else "/openapi.json",
)

# ¿Qué? Lista explícita de orígenes permitidos para hablarle al backend.
# ¿Para qué? Antes se usaba allow_origins=["*"] ("cualquier sitio web del
#           mundo puede llamar a este backend"), lo cual es un riesgo real.
#           Ahora solo los orígenes de esta lista pueden hacerlo.
# ¿Impacto? El origen del frontend sale de la variable FRONTEND_URL, la misma que
#           usan los enlaces de los correos, así que desplegar en otro dominio
#           no exige editar este archivo. En desarrollo se suman los puertos de
#           Vite (5173) y del frontend en Docker (3000); con
#           ENVIRONMENT=production solo queda FRONTEND_URL.
_ORIGENES_DE_DESARROLLO = [
    "http://localhost:5173",   # Vite — modo desarrollo
    "http://127.0.0.1:5173",   # Mismo puerto, accedido por IP en vez de "localhost"
    "http://localhost:3000",   # Frontend en Docker (nginx)
    "http://127.0.0.1:3000",
]


def origenes_permitidos(frontend_url: str, es_produccion: bool) -> list[str]:
    """Orígenes que pueden llamar al backend desde un navegador (CORS)."""
    # rstrip: un "/" final no coincidiría con el origen que manda el navegador.
    frontend = frontend_url.rstrip("/")
    base = [] if es_produccion else _ORIGENES_DE_DESARROLLO
    return list(dict.fromkeys([*base, frontend]))


ALLOWED_ORIGINS = origenes_permitidos(settings.FRONTEND_URL, _es_produccion)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# ¿Qué? Conecta la instancia de Limiter (app/utils/limiter.py) con esta app.
# ¿Para qué? Los decoradores @limiter.limit(...) en auth.py ya lanzaban
#           RateLimitExceeded al superar el límite, pero sin estas dos líneas
#           FastAPI nunca la registraba como una excepción manejada — nadie
#           la convertía en la respuesta 429 limpia que se espera, se
#           propagaba como un error 500 sin manejar.
# ¿Impacto? OWASP A04 (Insecure Design): ahora superar el límite responde
#           siempre con 429 y un mensaje claro, en vez de un error genérico.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ¿Qué? Respuesta 500 en JSON para cualquier error inesperado que ningún endpoint haya manejado.
# ¿Para qué? Hallazgo de las pruebas transversales de la semana 4 (issue #655): sin este manejador,
#           un error inesperado respondía 500 con el texto plano "Internal Server Error", mientras
#           todo el resto del API responde JSON con la clave "detail". El frontend lee ese formato
#           (ver fe/src/api/axios.ts) y con texto plano no tenía qué mostrar.
# ¿Impacto? El cuerpo es siempre el mismo mensaje fijo: nunca lleva el texto del error, ni SQL, ni
#           rutas de archivos. El detalle no se pierde: la excepción sigue subiendo hasta Uvicorn,
#           que la registra con su traza en el log del servidor. Los errores que ya se manejan
#           (HTTPException, 422 de validación, 429 del límite de peticiones) no pasan por aquí.
#           Una respuesta 500 sigue sin llevar las cabeceras CORS (las agrega un middleware que
#           este error se salta), así que en el navegador puede seguir viéndose como error de CORS.
@app.exception_handler(Exception)
async def _error_interno_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=500, content={"detail": "Error interno del servidor."})

# ¿Qué? Cabeceras HTTP de seguridad aplicadas a TODA respuesta del backend.
# ¿Para qué? OWASP A05 (Security Misconfiguration): sin esto, el navegador
#           no tiene ninguna instrucción explícita sobre cómo tratar la
#           respuesta de forma segura.
# ¿Impacto?
#   - X-Content-Type-Options: evita que el navegador "adivine" el tipo de
#     un archivo distinto al declarado (protege contra archivos subidos
#     maliciosos, como las evidencias de auditoría, siendo interpretados
#     como algo que no son).
#   - X-Frame-Options: evita que esta API se embeba en un <iframe> de otro
#     sitio (clickjacking) — aunque VerdeApp es una API JSON, el frontend
#     que la consume sí podría ser blanco de esto.
#   - Referrer-Policy: no envía la URL completa (que podría incluir tokens
#     en el futuro) a sitios externos al seguir un link.
#   - Permissions-Policy: esta API no necesita cámara, micrófono ni
#     ubicación — se le niega el acceso explícitamente al navegador.

# ¿Qué? Issue #403 (CN-063): extensiones de documento que se sirven siempre como descarga.
# ¿Para qué? De un PDF o un Word solo se revisa cómo empieza el archivo (la firma),
#           no todo su contenido. Abierto en una pestaña, su contenido correría con
#           la dirección de este backend, y desde ahí podría pedirle cosas a la API
#           con la sesión de quien lo abrió.
# ¿Impacto? Al pulsar un adjunto PDF, Word o Excel el navegador lo descarga en vez de
#           abrirlo en la pestaña. Las imágenes se siguen viendo igual en las pantallas.
_DOCUMENTOS_DESCARGABLES = (".pdf", ".docx", ".xlsx")


@app.middleware("http")
async def agregar_cabeceras_seguridad(request: Request, call_next):
    # ¿Qué? Issue #401: deja la IP de origen disponible para el log de
    #       auditoría (ver ip_de_origen en utils/audit_log.py).
    ip_de_origen.set(request.client.host if request.client else None)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    # ¿Qué? Issue #403 (CN-063): todo lo que sale de /uploads lleva una política que le
    #       prohíbe cargar o ejecutar nada ("sandbox" lo aísla de este sitio), y los
    #       documentos se descargan en vez de abrirse (ver _DOCUMENTOS_DESCARGABLES).
    if request.url.path.startswith("/uploads/"):
        response.headers["Content-Security-Policy"] = "default-src 'none'; sandbox"
        if request.url.path.lower().endswith(_DOCUMENTOS_DESCARGABLES):
            response.headers["Content-Disposition"] = "attachment"
    return response

# Registro ordenado de rutas
app.include_router(auth.router)
app.include_router(geography.router)
app.include_router(users.router)
app.include_router(admin.router)
app.include_router(admin_conjunto.router)
app.include_router(conjunto_panel.router)
app.include_router(reciclador_conjunto.router)
app.include_router(directorio.router)
app.include_router(notificaciones.router)
app.include_router(contenido_educativo.router)
app.include_router(comunicados.router)
app.include_router(novedades.router)
app.include_router(novedades_enviadas.router)
app.include_router(auditoria_conjunto.router)
app.include_router(uploads.router)
app.include_router(puntos_acopio.router)
app.include_router(contact.router)

# ¿Qué? Sirve las fotos de evidencia de las auditorías como archivos
#       estáticos, bajo /uploads — es la primera vez que el backend guarda
#       y sirve archivos subidos por un usuario (antes todo el contenido
#       educativo usaba solo links externos).
# ¿Para qué? El frontend necesita una URL real para poner en un <img src>.
# ¿Impacto? La carpeta se crea sola en el primer POST si no existe (ver
#           auditoria_conjunto_service.py); si nunca se ha subido nada,
#           StaticFiles la crea aquí para no fallar al arrancar.
_CARPETA_UPLOADS = Path(__file__).parent / "uploads"
_CARPETA_UPLOADS.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_CARPETA_UPLOADS), name="uploads")


@app.get("/api/v1/health")
def health():
    return {"status": "ok", "message": "Servidor VerdeApp operando"}