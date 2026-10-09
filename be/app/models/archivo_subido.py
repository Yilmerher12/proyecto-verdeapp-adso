from datetime import datetime, timezone

from sqlalchemy import Column, ForeignKey, Index, String, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base
from app.utils.ids import generar_uuid4


class ArchivoSubido(Base):
    """
    ¿Qué? Un registro por cada archivo que alguien sube con POST /uploads/adjunto:
          quién lo subió, la ruta pública y cuándo.
    ¿Para qué? Dos cosas: la cuota de subidas por usuario (cuántas lleva en el
              último minuto y en el último día) y saber de quién es cada
              archivo si algún día el disco se llena.
    ¿Impacto? NO es una referencia al archivo: que esta tabla tenga la ruta no
              significa que el archivo se use (ver app/limpiar_adjuntos.py, que
              ignora esta tabla a propósito). Si se borra la cuenta, el registro
              se conserva sin dueño (SET NULL).
    """
    __tablename__ = "archivos_subidos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=generar_uuid4)
    id_usuario = Column(UUID(as_uuid=True), ForeignKey("usuarios.id_usuario", ondelete="SET NULL"), nullable=True)
    ruta = Column(String(500), nullable=False)
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    # ¿Qué? Índice de la consulta de la cuota ("subidas de este usuario desde tal fecha").
    __table_args__ = (Index("ix_archivos_subidos_usuario_fecha", "id_usuario", "created_at"),)
