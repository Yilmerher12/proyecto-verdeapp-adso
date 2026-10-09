from datetime import datetime, timezone
from enum import StrEnum

from sqlalchemy import Column, ForeignKey, String, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.utils.ids import generar_uuid4


class EstadoAgenda(StrEnum):
    PENDIENTE = "PENDIENTE"
    EN_ESPERA = "EN_ESPERA"


class AgendaConjunto(Base):
    """
    ¿Qué? Un tema de la agenda interna del Admin de Conjunto, por conjunto
          (ej. "pintar el pasillo", "arreglar la puerta del sótano"), con
          foto de soporte opcional.
    ¿Para qué? Que el Admin de Conjunto no olvide lo que le piden y lo lleve
              al comité: ahí se discuten los temas, se borran los resueltos
              y se dejan "en espera" los que se aplazan.
    ¿Impacto? Es privada del Admin de Conjunto — nunca llega al Admin
              Sistema ni a nadie más. Sin fecha de caducidad a propósito: el
              comité no tiene fecha fija que la app pueda saber. Se borra
              con el conjunto (CASCADE); si se borra el autor, el tema se
              conserva sin autor (SET NULL).
    """
    __tablename__ = "agenda_conjunto"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=generar_uuid4)
    id_conjunto_residencial = Column(
        UUID(as_uuid=True),
        ForeignKey("conjuntos_residenciales.id_conjunto_residencial", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    autor_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id_usuario", ondelete="SET NULL"), nullable=True)
    texto = Column(Text, nullable=False)
    # ¿Qué? URL ya subida por el endpoint genérico de adjuntos (ver
    #       lib/uploadsApi.ts / ImagenAdjuntaField), mismo patrón que
    #       url_adjunto en comunicados/novedades.
    url_evidencia = Column(String(500), nullable=True)
    estado = Column(String(20), nullable=False, default=EstadoAgenda.PENDIENTE.value)
    # ¿Qué? La hora la pone Python al crear (no solo now() de Postgres) —
    #       mismo motivo que PuntoAcopioComentario.
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    autor = relationship("Usuario", lazy="joined")
