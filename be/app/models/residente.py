from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Residente(Base):
    __tablename__ = "residentes"

    id_residente = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), unique=True, nullable=False)
    id_unidad = Column(Integer, ForeignKey("unidades.id_unidad"), nullable=False)

    nombre = Column(String(100), nullable=False)
    apellidos = Column(String(150), nullable=False)
    numero_telefonico = Column(String(15), nullable=True)

    # Puentes del Residente
    usuario = relationship("Usuario", back_populates="residente")
    unidad = relationship("Unidad", back_populates="residentes")