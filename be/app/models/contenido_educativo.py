from sqlalchemy import Column, String, Text, Date
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from app.utils.ids import generar_uuid4

class ContenidoEducativo(Base):
    __tablename__ = "contenido_educativo"

    id_contenido = Column(UUID(as_uuid=True), primary_key=True, index=True, default=generar_uuid4)
    modulo_categoria = Column(String(255), nullable=False)
    titulo_tema = Column(String(255), nullable=False)
    cuerpo_texto = Column(Text, nullable=False)
    fecha_publicacion = Column(Date, nullable=False)
    # ¿Qué? Link al video (YouTube) y a la guía de apoyo (PDF u otro documento).
    # ¿Para qué? Separados de cuerpo_texto para que el frontend pueda incrustar
    #           el reproductor de video y mostrar un botón de guía, en vez de
    #           tener que extraer un link de un bloque de texto libre.
    # ¿Impacto? Ambos son opcionales — un módulo puede tener solo texto, solo
    #           video, solo guía, o cualquier combinación.
    url_video = Column(String(500), nullable=True)
    url_guia = Column(String(500), nullable=True)