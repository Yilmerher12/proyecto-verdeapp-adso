from sqlalchemy import Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class NovedadConjunto(Base):
    """
    ¿Qué? Un conjunto al que va dirigida una novedad (RQF-015).
    ¿Para qué? Una novedad puede ir a uno o varios conjuntos puntuales — o a
              todos, cuando no tiene ninguna fila aquí (ver Novedad.destinos).
    ¿Impacto? Llave primaria compuesta (novedad, conjunto): un mismo conjunto
              no puede repetirse dentro de una novedad. Se borra sola si se
              borra la novedad o el conjunto (ON DELETE CASCADE).
    """
    __tablename__ = "novedades_conjuntos"

    id_novedad = Column(
        UUID(as_uuid=True),
        ForeignKey("novedades.id_novedad", ondelete="CASCADE"),
        primary_key=True,
    )
    id_conjunto_residencial = Column(
        UUID(as_uuid=True),
        ForeignKey("conjuntos_residenciales.id_conjunto_residencial", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )

    conjunto = relationship("ConjuntoResidencial", lazy="joined")
