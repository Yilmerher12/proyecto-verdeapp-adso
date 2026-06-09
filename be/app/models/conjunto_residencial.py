from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class ConjuntoResidencial(Base):
    __tablename__ = "conjuntos_residenciales"

    id_conjunto_residencial = Column(Integer, primary_key=True, index=True)
    id_localidad = Column(Integer, ForeignKey("localidades.id_localidad"), nullable=False)
    nombre_conjunto = Column(String(255), nullable=False)
    nit = Column(String(50), nullable=True)
    direccion = Column(String(255), nullable=False)

    # Puentes
    localidad = relationship("Localidad", back_populates="conjuntos")
    unidades = relationship("Unidad", back_populates="conjunto")
    
    # Puente de Muchos a Muchos con la tabla intermedia
    recicladores = relationship("Reciclador", secondary="recicladores_conjuntos", back_populates="conjuntos")