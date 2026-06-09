"""
Módulo: models/__init__.py
Descripción: Paquete de modelos ORM — exporta todos los modelos para facilitar imports.
¿Para qué? Permitir importar todos los modelos desde un solo lugar (from app.models import Usuario)
           y asegurar que Alembic los detecte al generar migraciones.
¿Impacto? Sin este archivo, Alembic no detectaría los modelos automáticamente y las migraciones
          generadas estarían vacías (uno de los errores más comunes al configurar Alembic).
"""

# ¿Qué? Importaciones explícitas de todos los modelos ORM del proyecto.
from app.database import Base

# Tablas Base
from app.models.rol import Role
from app.models.localidad import Localidad
from app.models.contenido_educativo import ContenidoEducativo

# Tablas Nivel 1
from app.models.usuario import Usuario
from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.punto_acopio import PuntoAcopio

# Tablas Nivel 2 y 3
from app.models.unidad import Unidad
from app.models.residente import Residente
from app.models.reciclador import Reciclador
from app.models.reciclador_conjunto import RecicladorConjunto

# 🔐 Tokens de Seguridad (¡Esenciales para que Alembic no falle!)
from app.models.password_reset_token import PasswordResetToken
from app.models.email_verification_token import EmailVerificationToken