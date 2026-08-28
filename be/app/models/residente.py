from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils.ids import generar_uuid7


class Residente(Base):
    __tablename__ = "residentes"

    id_residente = Column(UUID(as_uuid=True), primary_key=True, index=True, default=generar_uuid7)
    id_usuario = Column(UUID(as_uuid=True), ForeignKey("usuarios.id_usuario"), unique=True, nullable=False)
    id_unidad = Column(UUID(as_uuid=True), ForeignKey("unidades.id_unidad"), nullable=False)

    nombre = Column(String(100), nullable=False)
    apellidos = Column(String(150), nullable=False)
    numero_telefonico = Column(String(15), nullable=True)

    # Puentes del Residente
    usuario = relationship("Usuario", back_populates="residente")
    unidad = relationship("Unidad", back_populates="residentes")