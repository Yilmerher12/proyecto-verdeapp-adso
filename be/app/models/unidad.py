from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Unidad(Base):
    __tablename__ = "unidades"

    id_unidad = Column(Integer, primary_key=True, index=True)
    id_conjunto_residencial = Column(Integer, ForeignKey("conjuntos_residenciales.id_conjunto_residencial"), nullable=False)
    torre = Column(String(50), nullable=False)
    apto = Column(String(50), nullable=False)

    # Puentes
    conjunto = relationship("ConjuntoResidencial", back_populates="unidades")
    residentes = relationship("Residente", back_populates="unidad")