from sqlalchemy import Column, String, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils.ids import generar_uuid7


class Notificacion(Base):
    __tablename__ = "notificaciones"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=generar_uuid7)
    tipo = Column(String(50), nullable=False)  # LLEGADA_RECICLADOR | SHUT_LLENO | SHUT_LIBRE | ...
    # ¿Qué? NULL para notificaciones de toda la plataforma (RQF-015,
    #       novedades del Admin del Sistema) — esas no pertenecen a un
    #       conjunto específico, a diferencia de SHUT/comunicados/
    #       desvinculación, que sí siempre tienen uno.
    id_conjunto_residencial = Column(
        UUID(as_uuid=True),
        ForeignKey("conjuntos_residenciales.id_conjunto_residencial", ondelete="CASCADE"),
        nullable=True,
    )
    id_emisor = Column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id_usuario", ondelete="SET NULL"),
        nullable=True,
    )
    mensaje = Column(Text, nullable=False)
    # ¿Qué? Puntero genérico opcional al registro relacionado (ej. el
    #       id_auditoria de una notificación AUDITORIA_PUBLICADA).
    # ¿Para qué? Sin esto, el frontend no tiene forma de saber QUÉ abrir
    #           cuando el usuario hace clic en "Ver" — solo tendría el
    #           texto del mensaje. No es una ForeignKey de verdad porque
    #           apunta a tablas distintas según el tipo de notificación.
    # ¿Impacto? Al migrar a UUID: como no tiene ForeignKey() real, esta
    #           columna NO aparece en ningún grep automático de FKs — hay
    #           que remapearla a mano en la migración de datos, contra
    #           auditorias_conjunto (hoy es la única tabla a la que apunta).
    id_referencia = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    destinatarios = relationship(
        "NotificacionDestinatario",
        back_populates="notificacion",
        cascade="all, delete-orphan",
    )


class NotificacionDestinatario(Base):
    __tablename__ = "notificaciones_destinatarios"

    id_notificacion = Column(
        UUID(as_uuid=True),
        ForeignKey("notificaciones.id", ondelete="CASCADE"),
        primary_key=True,
    )
    id_usuario = Column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id_usuario", ondelete="CASCADE"),
        primary_key=True,
    )
    leida = Column(Boolean, default=False, nullable=False)
    leida_at = Column(DateTime(timezone=True), nullable=True)

    notificacion = relationship("Notificacion", back_populates="destinatarios")
