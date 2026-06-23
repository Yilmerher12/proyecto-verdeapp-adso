from sqlalchemy import Column, Integer, String, Text, Date
from app.database import Base

class ContenidoEducativo(Base):
    __tablename__ = "contenido_educativo"

    id_contenido = Column(Integer, primary_key=True, index=True)
    modulo_categoria = Column(String(255), nullable=False)
    titulo_tema = Column(String(255), nullable=False)
    cuerpo_texto = Column(Text, nullable=False)
    fecha_publicacion = Column(Date, nullable=False)