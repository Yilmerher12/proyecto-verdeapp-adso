from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Reciclador(Base):
    __tablename__ = "recicladores"

    id_reciclador = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), unique=True, nullable=False)

    localidad_id = Column(Integer, ForeignKey("localidades.id_localidad"), nullable=True)

    nombre = Column(String(100), nullable=False)
    
    apellidos = Column(String(150), nullable=False)
    asociacion = Column(String(255), nullable=True)

    numero_telefonico = Column(String(15), nullable=True)

    # Puentes del Reciclador
    usuario = relationship("Usuario", back_populates="reciclador")
    localidad = relationship("Localidad")
    conjuntos = relationship("ConjuntoResidencial", secondary="recicladores_conjuntos", back_populates="recicladores")