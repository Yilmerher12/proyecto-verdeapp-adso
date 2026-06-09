from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class Usuario(Base):
    __tablename__ = "usuarios"

    id_usuario = Column(Integer, primary_key=True, index=True)
    id_rol = Column(Integer, ForeignKey("roles.id_rol"), nullable=False)
    correo_electronico = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    
    # Mantener este campo por control de estado en la aplicación
    is_active = Column(Boolean, default=True)
    
    # Puentes del Usuario
    rol = relationship("Role", back_populates="usuarios")
    residente = relationship("Residente", back_populates="usuario", uselist=False)
    reciclador = relationship("Reciclador", back_populates="usuario", uselist=False)