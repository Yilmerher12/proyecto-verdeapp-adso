from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
import app.models  # noqa: F401 — registra todos los modelos antes del create_all
from app.routers import auth, users, geography, admin
from app.routers import admin_conjunto
from app.routers import conjunto_panel
from app.routers import reciclador_conjunto
from app.routers import directorio
from app.routers import notificaciones

app = FastAPI(title="VerdeApp API")

# Crea las tablas que falten en la BD sin tocar las existentes.
# Esto permite agregar nuevos modelos sin reiniciar el volumen de Docker.
Base.metadata.create_all(bind=engine)

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


@app.get("/api/v1/health")
def health():
    return {"status": "ok", "message": "Servidor VerdeApp operando"}