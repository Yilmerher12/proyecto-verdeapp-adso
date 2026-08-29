from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils.ids import generar_uuid7

class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    # UUID nativo de Postgres (antes era String(36) con uuid.uuid4())
    id = Column(UUID(as_uuid=True), primary_key=True, default=generar_uuid7)

    # Apunta a usuarios.id_usuario (ahora UUID)
    id_usuario = Column(UUID(as_uuid=True), ForeignKey("usuarios.id_usuario", ondelete="CASCADE"), nullable=False)
    
    token = Column(String(255), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # El puente usando backref ahorra tener que ir a editar el archivo usuario.py
    usuario = relationship("Usuario", backref="email_verification_tokens")