from datetime import datetime, timezone
from enum import StrEnum

from sqlalchemy import Column, ForeignKey, String, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.utils.ids import generar_uuid4


class EstadoNovedadEnviada(StrEnum):
    NUEVA = "NUEVA"
    VISTA = "VISTA"


class NovedadEnviada(Base):
    """
    ¿Qué? Novedad que un Residente, Reciclador o Admin de Conjunto le
          ENVÍA al Admin Sistema (texto + imagen opcional).
    ¿Para qué? Canal de abajo hacia arriba: contarle algo a VerdeApp.
              No confundir con `novedades` (RQF-015), que son los avisos
              que el Admin Sistema publica hacia todos.
    ¿Impacto? Aparece en "Solicitudes pendientes" del Admin Sistema como
              tipo NOVEDAD; él la marca como vista (no se aprueba ni se
              rechaza). El conjunto se guarda solo cuando aplica (Residente:
              el de su unidad; Admin de Conjunto: el que eligió).
    """
    __tablename__ = "novedades_enviadas"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=generar_uuid4)
    autor_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id_usuario", ondelete="SET NULL"), nullable=True)
    id_conjunto_residencial = Column(
        UUID(as_uuid=True),
        ForeignKey("conjuntos_residenciales.id_conjunto_residencial", ondelete="SET NULL"),
        nullable=True,
    )
    texto = Column(Text, nullable=False)
    url_imagen = Column(String(500), nullable=True)
    estado = Column(String(20), nullable=False, default=EstadoNovedadEnviada.NUEVA.value)
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
    resuelta_at = Column(TIMESTAMP(timezone=True), nullable=True)

    autor = relationship("Usuario", lazy="joined")
    conjunto = relationship("ConjuntoResidencial")
