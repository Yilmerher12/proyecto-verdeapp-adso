from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Notificacion(Base):
    __tablename__ = "notificaciones"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String(50), nullable=False)  # LLEGADA_RECICLADOR | SHUT_LLENO | SHUT_LIBRE | ...
    # ¿Qué? NULL para notificaciones de toda la plataforma (RQF-015,
    #       novedades del Admin del Sistema) — esas no pertenecen a un
    #       conjunto específico, a diferencia de SHUT/comunicados/
    #       desvinculación, que sí siempre tienen uno.
    id_conjunto_residencial = Column(
        Integer,
        ForeignKey("conjuntos_residenciales.id_conjunto_residencial", ondelete="CASCADE"),
        nullable=True,
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
