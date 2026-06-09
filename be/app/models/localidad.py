from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base

class Localidad(Base):
    __tablename__ = "localidades"

    id_localidad = Column(Integer, primary_key=True, index=True)
    nombre_localidad = Column(String(100), nullable=False)

    # Puentes: Una localidad tiene muchos conjuntos y puntos de acopio
    conjuntos = relationship("ConjuntoResidencial", back_populates="localidad")
    puntos_acopio = relationship("PuntoAcopio", back_populates="localidad")