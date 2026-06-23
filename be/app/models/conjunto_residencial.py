from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class ConjuntoResidencial(Base):
    __tablename__ = "conjuntos_residenciales"

    id_conjunto_residencial = Column(Integer, primary_key=True, index=True)
    id_localidad = Column(Integer, ForeignKey("localidades.id_localidad"), nullable=False)
    nombre_conjunto = Column(String(255), nullable=False)
    nit = Column(String(50), nullable=True)
    direccion = Column(String(255), nullable=False)

    verificado = Column(Boolean, nullable=False, default=False)

    verificado_por_id = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=True)

    # Puentes
    localidad = relationship("Localidad", back_populates="conjuntos")
    unidades = relationship("Unidad", back_populates="conjunto")
    verificado_por = relationship("Usuario", foreign_keys=[verificado_por_id])

    # Puente de Muchos a Muchos con la tabla intermedia de recicladores
    recicladores = relationship("Reciclador", secondary="recicladores_conjuntos", back_populates="conjuntos")
    administradores = relationship(
        "AdministradorConjunto",
        secondary="administradores_conjuntos",
        back_populates="conjuntos",
    )