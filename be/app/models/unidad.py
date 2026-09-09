from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils.ids import generar_uuid4

class Unidad(Base):
    __tablename__ = "unidades"

    id_unidad = Column(UUID(as_uuid=True), primary_key=True, index=True, default=generar_uuid4)
    id_conjunto_residencial = Column(UUID(as_uuid=True), ForeignKey("conjuntos_residenciales.id_conjunto_residencial"), nullable=False)
    torre = Column(String(50), nullable=False)
    apto = Column(String(50), nullable=False)

    # Puentes
    conjunto = relationship("ConjuntoResidencial", back_populates="unidades")
    residentes = relationship("Residente", back_populates="unidad")