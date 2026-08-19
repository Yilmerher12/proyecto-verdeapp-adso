from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, users, geography, admin
from app.routers import admin_conjunto
from app.routers import conjunto_panel
from app.routers import reciclador_conjunto
from app.routers import directorio
from app.routers import notificaciones
from app.routers import contenido_educativo

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
app = FastAPI(title="VerdeApp API")

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


@app.get("/api/v1/health")
def health():
    return {"status": "ok", "message": "Servidor VerdeApp operando"}