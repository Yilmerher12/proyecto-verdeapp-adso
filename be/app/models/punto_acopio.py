from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class PuntoAcopio(Base):
    __tablename__ = "puntos_acopios"

    id_punto_acopio = Column(Integer, primary_key=True, index=True)
    id_localidad = Column(Integer, ForeignKey("localidades.id_localidad"), nullable=False)
    nombre_encargado = Column(String(100), nullable=True)
    direccion = Column(String(255), nullable=False)
    telefono_contacto = Column(String(15), nullable=True)

    # Puente
    localidad = relationship("Localidad", back_populates="puntos_acopio")