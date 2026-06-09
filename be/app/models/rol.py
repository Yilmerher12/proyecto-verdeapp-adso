from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base

class Role(Base):
    __tablename__ = "roles"

    id_rol = Column(Integer, primary_key=True, index=True)
    tipo_rol = Column(String(50), unique=True, nullable=False)
    
    usuarios = relationship("Usuario", back_populates="rol")