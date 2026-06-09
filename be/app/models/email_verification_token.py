import uuid
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base

class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    # Usamos String(36) para guardar el UUID generado
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # IMPORTANTE: Ahora apunta correctamente a usuarios.id_usuario que es un Integer
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario", ondelete="CASCADE"), nullable=False)
    
    token = Column(String(255), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # El puente usando backref ahorra tener que ir a editar el archivo usuario.py
    usuario = relationship("Usuario", backref="email_verification_tokens")