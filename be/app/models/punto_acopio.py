from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils.ids import generar_uuid7

class PuntoAcopio(Base):
    __tablename__ = "puntos_acopios"

    id_punto_acopio = Column(UUID(as_uuid=True), primary_key=True, index=True, default=generar_uuid7)
    # id_localidad se queda como Integer — ver comentario en conjunto_residencial.py
    id_localidad = Column(Integer, ForeignKey("localidades.id_localidad"), nullable=False)
    nombre = Column(String(200), nullable=False)
    nombre_encargado = Column(String(100), nullable=True)
    direccion = Column(String(255), nullable=False)
    telefono_contacto = Column(String(15), nullable=True)

    # Puente
    localidad = relationship("Localidad", back_populates="puntos_acopio")