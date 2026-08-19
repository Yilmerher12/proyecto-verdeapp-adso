from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Notificacion(Base):
    __tablename__ = "notificaciones"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String(50), nullable=False)  # LLEGADA_RECICLADOR | SHUT_LLENO | SHUT_LIBRE
    id_conjunto_residencial = Column(
        Integer,
        ForeignKey("conjuntos_residenciales.id_conjunto_residencial", ondelete="CASCADE"),
        nullable=False,
    )
    id_emisor = Column(
        Integer,
        ForeignKey("usuarios.id_usuario", ondelete="SET NULL"),
        nullable=True,
    )
    mensaje = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    destinatarios = relationship(
        "NotificacionDestinatario",
        back_populates="notificacion",
        cascade="all, delete-orphan",
    )


class NotificacionDestinatario(Base):
    __tablename__ = "notificaciones_destinatarios"

    id_notificacion = Column(
        Integer,
        ForeignKey("notificaciones.id", ondelete="CASCADE"),
        primary_key=True,
    )
    id_usuario = Column(
        Integer,
        ForeignKey("usuarios.id_usuario", ondelete="CASCADE"),
        primary_key=True,
    )
    leida = Column(Boolean, default=False, nullable=False)
    leida_at = Column(DateTime(timezone=True), nullable=True)

    notificacion = relationship("Notificacion", back_populates="destinatarios")
