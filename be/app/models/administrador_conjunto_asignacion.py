from sqlalchemy import Column, Integer, ForeignKey, TIMESTAMP
from sqlalchemy.sql import func
from app.database import Base


class AdministradorConjuntoAsignacion(Base):
    """
    ¿Qué? Tabla de "parejas": qué Administrador de Conjunto maneja qué
          Conjunto Residencial.
    ¿Para qué? Un administrador puede manejar varios conjuntos (por
              contrato), y un conjunto puede tener más de un administrador
              asignado. Esta tabla es la lista de esas combinaciones.
    ¿Impacto? Para saber "qué conjuntos administra Juan", se consulta esta
              tabla filtrando por id_administrador. Para saber "quién
              administra el Conjunto X", se filtra por id_conjunto_residencial.
    """
    __tablename__ = "administradores_conjuntos"

    id_administrador_conjunto = Column(Integer, primary_key=True, index=True)
    id_administrador = Column(
        Integer,
        ForeignKey("administradores_conjunto.id_administrador", ondelete="CASCADE"),
        nullable=False,
    )
    id_conjunto_residencial = Column(
        Integer,
        ForeignKey("conjuntos_residenciales.id_conjunto_residencial", ondelete="CASCADE"),
        nullable=False,
    )
    fecha_asignacion = Column(TIMESTAMP, server_default=func.now(), nullable=False)