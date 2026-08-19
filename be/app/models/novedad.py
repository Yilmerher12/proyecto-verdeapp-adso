from enum import StrEnum

from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class AlcanceNovedad(StrEnum):
    """¿Qué? A quién va dirigida una novedad de plataforma (CA-032.1)."""
    TODOS = "TODOS"
    RESIDENTES = "RESIDENTES"
    RECICLADORES = "RECICLADORES"
    ADMIN_CONJUNTO = "ADMIN_CONJUNTO"


class Novedad(Base):
    """
    ¿Qué? Un aviso publicado por el Admin del Sistema para toda la
          plataforma (RQF-015) — a diferencia de un Comunicado (RQF-014),
          no pertenece a ningún conjunto residencial.
    ¿Para qué? Informar cambios de la app, temas ambientales o avisos
              generales a todos los usuarios o a un rol específico.
    ¿Impacto? A diferencia de Comunicado (que solo se "elimina"), aquí el
              ciclo de vida es "activa → archivada, sin vuelta atrás"
              (RN-005) — por eso existe fecha_archivado en vez de un
              DELETE: el Admin Sistema necesita poder ver el historial
              completo, incluyendo lo ya archivado (CA-035.4).
    """
    __tablename__ = "novedades"

    id_novedad = Column(Integer, primary_key=True, index=True)

    id_admin_sistema = Column(
        Integer,
        ForeignKey("usuarios.id_usuario", ondelete="CASCADE"),
        nullable=False,
    )

    alcance = Column(String(20), nullable=False)
    texto = Column(Text, nullable=False)

    # ¿Qué? Un solo link opcional (imagen, PDF, Word, Excel, link externo,
    #       etc.) — mismo patrón ya usado en Contenido Educativo y
    #       Comunicados, en vez de subida real de archivos.
    url_adjunto = Column(String(500), nullable=True)

    fecha_expiracion = Column(TIMESTAMP(timezone=True), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    # ¿Qué? NULL mientras nunca se ha editado; se llena con la fecha de la
    #       última edición (mismo patrón que Comunicado.fecha_edicion).
    fecha_edicion = Column(TIMESTAMP(timezone=True), nullable=True)

    # ¿Qué? NULL mientras está activa. Se llena cuando el Admin Sistema la
    #       archiva manualmente (HU-035, CA-035.1). El archivado AUTOMÁTICO
    #       al expirar (CA-035.2) no necesita escribir esta columna — se
    #       calcula igual que "expirado" en Comunicado: comparando
    #       fecha_expiracion contra la hora actual al leer, sin un job en
    #       segundo plano. "Archivada" (para el feed y el historial) es
    #       entonces: fecha_archivado IS NOT NULL O fecha_expiracion ya pasó.
    fecha_archivado = Column(TIMESTAMP(timezone=True), nullable=True)

    admin_sistema = relationship("Usuario")
