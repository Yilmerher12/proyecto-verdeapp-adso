from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.routers import auth, users, geography, admin
from app.routers import admin_conjunto
from app.routers import conjunto_panel
from app.routers import reciclador_conjunto
from app.routers import directorio
from app.routers import notificaciones
from app.routers import contenido_educativo
from app.routers import comunicados
from app.routers import novedades
from app.routers import auditoria_conjunto

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
#           development/testing (el valor por defecto) siguen disponibles
#           igual que antes.
_es_produccion = settings.ENVIRONMENT == "production"
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
# ¿Impacto? Mientras el proyecto siga corriendo 100% local, basta con los
#           puertos que usa Vite en modo desarrollo. CUANDO SE DESPLIEGUE
#           A UN SERVIDOR REAL, agrega aquí la URL real del frontend.
ALLOWED_ORIGINS = [
    "http://localhost:5173",   # Vite — modo desarrollo (el que usan ahora)
    "http://127.0.0.1:5173",   # Mismo puerto, accedido por IP en vez de "localhost"
    "http://localhost:3000",   # Por si se usa algún otro modo de arranque
    "http://127.0.0.1:3000",
    # "https://TU-DOMINIO-DE-PRODUCCION-AQUI",  # <- agregar cuando se despliegue
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

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
app.include_router(auditoria_conjunto.router)

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