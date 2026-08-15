# ========================
# VerdeApp — Dockerfile del Backend
# ========================
# ¿Qué? Imagen Docker multi-stage para el backend FastAPI.
# ¿Para qué? Separar la instalación de dependencias (builder) del runtime final,
#            generando una imagen más pequeña y segura para producción/desarrollo.
# ¿Impacto? Sin Dockerfile, el backend sólo puede ejecutarse en entornos con Python
#           configurado manualmente. Con él, corre en cualquier máquina que tenga Docker.

# ────────────────────────────
# Stage 1: builder
# ¿Qué? Instala todas las dependencias Python con uv, usando pyproject.toml + uv.lock.
# ¿Para qué? uv resuelve e instala mucho más rápido que pip, y uv.lock congela las
#            versiones EXACTAS de cada dependencia (directa y transitiva) — algo que
#            requirements.txt con pines manuales no garantizaba por sí solo.
# ¿Impacto? Sin este stage, cada rebuild reinstalaría todas las dependencias desde cero.
#           La imagen oficial de uv ya trae el binario listo, sin que nosotros lo instalemos.
# ────────────────────────────
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS builder

WORKDIR /app

# ¿Qué? Copia SOLO los archivos de dependencias antes que el resto del código.
# ¿Para qué? Optimizar el caché de Docker — si el código cambia pero pyproject.toml/
#            uv.lock no, Docker reutiliza la capa de instalación de paquetes.
# ¿Impacto? Build hasta 10x más rápido en iteraciones del día a día.
COPY pyproject.toml uv.lock ./

# ¿Qué? Instala las dependencias exactas del lockfile, sin las de desarrollo
#       (pytest, ruff), en un entorno virtual dentro de la imagen.
# ¿Para qué? --frozen falla si uv.lock no está sincronizado con pyproject.toml, en vez
#            de resolver versiones nuevas silenciosamente. --no-dev evita instalar
#            herramientas de testing/lint en la imagen que corre en producción.
# ¿Impacto? Garantiza que la imagen Docker use EXACTAMENTE lo mismo que cualquier
#           desarrollador con `uv sync` en su máquina.
RUN uv sync --frozen --no-dev


# ────────────────────────────
# Stage 2: runtime
# ¿Qué? Imagen final que se ejecuta en producción/desarrollo.
# ¿Para qué? Contiene solo lo necesario para correr la app — no las herramientas de build.
# ¿Impacto? Imagen más pequeña (~200MB vs ~500MB+), menor superficie de ataque.
# ────────────────────────────
FROM python:3.12-slim AS runtime

WORKDIR /app

# ¿Qué? Variables de entorno que mejoran el comportamiento de Python en contenedores.
# ¿Para qué?
#   PYTHONDONTWRITEBYTECODE=1 → No genera archivos .pyc (innecesarios en contenedor).
#   PYTHONUNBUFFERED=1        → Los logs aparecen en tiempo real (sin buffer).
# ¿Impacto? Sin PYTHONUNBUFFERED, los logs del servidor podrían aparecer con retraso
#           o no aparecer si el contenedor falla antes de vaciar el buffer.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

# ¿Qué? Copia el entorno virtual (.venv) que uv creó y llenó en el stage builder.
# ¿Para qué? Evitar reinstalar paquetes en el stage runtime — el builder ya lo hizo.
# ¿Impacto? El stage runtime no necesita el binario de uv ni compiladores C, lo que
#           reduce el tamaño de la imagen final.
COPY --from=builder /app/.venv /app/.venv

# ¿Qué? Copia el código fuente completo del backend al contenedor.
# ¿Para qué? Proveer al servidor uvicorn todos los módulos de la aplicación.
# ¿Impacto? Los archivos en .dockerignore NO se copian (ej: .env, .venv local, __pycache__).
COPY . .

# ¿Qué? Documenta que el contenedor escucha en el puerto 8000.
# ¿Para qué? Convención Docker que informa a herramientas y operadores qué puerto usar.
# ¿Impacto? No abre el puerto por sí solo — docker-compose.yml define el mapeo real.
EXPOSE 8000

# ¿Qué? Comando de inicio del contenedor.
# ¿Para qué? Primero ejecuta las migraciones pendientes de Alembic, luego arranca
#            Uvicorn escuchando en todas las interfaces (0.0.0.0) en el puerto 8000.
# ¿Impacto? Sin `alembic upgrade head`, el backend podría arrancar con un esquema de
#           BD desactualizado, causando errores en las primeras operaciones.
#           Sin `--host 0.0.0.0`, Uvicorn escucharía solo en localhost y el contenedor
#           no sería accesible desde fuera.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
