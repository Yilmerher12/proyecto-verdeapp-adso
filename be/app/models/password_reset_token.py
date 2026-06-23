"""
Módulo: models/password_reset_token.py
Descripción: Modelo ORM que representa la tabla `password_reset_tokens` en PostgreSQL.
¿Para qué? Almacenar tokens temporales de un solo uso que permiten restablecer
           la contraseña de un usuario que olvidó sus credenciales.
¿Impacto? Sin esta tabla, el flujo de "forgot password" no puede funcionar,
          ya que no habría forma de verificar que el enlace de reset es legítimo y vigente.
"""

import uuid
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base
class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Apunta a usuarios.id_usuario (Integer)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario", ondelete="CASCADE"), nullable=False)
    
    token = Column(String(255), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relación con el modelo Usuario
    usuario = relationship("Usuario", backref="password_reset_tokens")