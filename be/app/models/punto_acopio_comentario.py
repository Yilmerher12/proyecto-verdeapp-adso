from datetime import datetime, timezone

from sqlalchemy import Column, ForeignKey, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.utils.ids import generar_uuid4


class PuntoAcopioComentario(Base):
    """
    ¿Qué? Un comentario interno del Admin Sistema sobre un punto de acopio (RQF-011).
    ¿Para qué? Dejar constancia de por qué cambió algo (ej. nuevo encargado o
              dueño) o de cualquier nota útil, con autor y fecha. También
              guarda el "motivo del cambio" que se escribe al editar el punto.
    ¿Impacto? Solo lo ve el Admin Sistema — Residentes y Recicladores nunca
              lo reciben. Se borra junto con el punto (ON DELETE CASCADE);
              si se borra el autor, el comentario se conserva sin autor
              (ON DELETE SET NULL).
    """
    __tablename__ = "puntos_acopio_comentarios"

    id_comentario = Column(UUID(as_uuid=True), primary_key=True, default=generar_uuid4)
    id_punto_acopio = Column(
        UUID(as_uuid=True),
        ForeignKey("puntos_acopios.id_punto_acopio", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    id_autor = Column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id_usuario", ondelete="SET NULL"),
        nullable=True,
    )
    texto = Column(Text, nullable=False)
    # ¿Qué? La hora la pone Python al crear (no solo now() de Postgres).
    # ¿Para qué? now() devuelve la hora de INICIO de la transacción: dos
    #            comentarios creados dentro de una misma transacción quedarían
    #            con la misma hora y su orden sería impredecible.
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    autor = relationship("Usuario", lazy="joined")
