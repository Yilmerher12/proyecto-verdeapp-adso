from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# Limpiamos las importaciones para que no haya duplicados
from app.routers import auth, users, reportes, geography, admin 

app = FastAPI(title="VerdeApp API")

# 🛠️ CONFIGURACIÓN DE CORS REFORZADA
# Esto soluciona el error al cambiar contraseña desde el dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En desarrollo usamos "*" para evitar bloqueos de puerto
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Registro ordenado de rutas
app.include_router(auth.router)
app.include_router(geography.router)
app.include_router(users.router)
app.include_router(reportes.router)
app.include_router(admin.router)

@app.get("/api/v1/health")
def health():
    return {"status": "ok", "message": "Servidor VerdeApp operando"}