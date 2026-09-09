from enum import StrEnum

from sqlalchemy import Column, String, Text, Date, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils.ids import generar_uuid4


class TipoComunicado(StrEnum):
    """
    ¿Qué? Los 5 tipos de comunicado que define el RF (RQF-014), cada uno con
          su propia expiración sugerida por defecto.
    ¿Para qué? El tipo no es solo una etiqueta visual — determina cuánto
              tiempo sugiere el sistema que el comunicado se quede activo
              en el feed (ver comunicado_service._calcular_expiracion_sugerida).
    """
    INFORMATIVO = "INFORMATIVO"
    URGENTE = "URGENTE"
    CONVOCATORIA = "CONVOCATORIA"
    MANTENIMIENTO = "MANTENIMIENTO"
    RECICLAJE = "RECICLAJE"


class DestinatariosComunicado(StrEnum):
    """¿Qué? A quién va dirigido un comunicado dentro del conjunto (CA-027.1)."""
    RESIDENTES = "RESIDENTES"
    RECICLADORES = "RECICLADORES"
    AMBOS = "AMBOS"


class Comunicado(Base):
    """
    ¿Qué? Un aviso publicado por un Administrador de Conjunto para los
          residentes y/o recicladores de UN conjunto específico (RQF-014).
    ¿Para qué? Es el canal oficial de comunicación entre la administración
              y la comunidad — cortes de servicio, reuniones, avisos de
              reciclaje, emergencias, etc.
    ¿Impacto? "Expirar" un comunicado (RN-004) NO lo borra de la base de
              datos — el feed simplemente deja de mostrarlo cuando
              fecha_expiracion ya pasó. Así el Admin Conjunto conserva su
              propio historial de comunicados publicados, y solo se pierde
              de verdad si lo elimina explícitamente (HU-030).
    """
    __tablename__ = "comunicados"

    id_comunicado = Column(UUID(as_uuid=True), primary_key=True, index=True, default=generar_uuid4)

    id_conjunto_residencial = Column(
        UUID(as_uuid=True),
        ForeignKey("conjuntos_residenciales.id_conjunto_residencial", ondelete="CASCADE"),
        nullable=False,
    )
    id_administrador = Column(
        UUID(as_uuid=True),
        ForeignKey("administradores_conjunto.id_administrador", ondelete="CASCADE"),
        nullable=False,
    )

    destinatarios = Column(String(20), nullable=False)
    tipo = Column(String(20), nullable=False)
    texto = Column(Text, nullable=False)

    # ¿Qué? Un solo link opcional (imagen, video, PDF, Drive, etc.) en vez de
    #       subida real de archivos — mismo patrón ya usado en
    #       Contenido Educativo (url_video/url_guia), para no construir
    #       almacenamiento de archivos propio en un proyecto de este tamaño.
    url_adjunto = Column(String(500), nullable=True)

    # ¿Qué? Solo se usa (y se exige) cuando tipo=CONVOCATORIA — la expiración
    #       sugerida de ese tipo es "el día después del evento".
    fecha_evento = Column(Date, nullable=True)

    fecha_expiracion = Column(TIMESTAMP(timezone=True), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    # ¿Qué? NULL mientras nunca se ha editado; se llena con la fecha de la
    #       última edición. Si no es NULL, el feed muestra la etiqueta
    #       "Editado" (CA-029.3) — así no hace falta una columna booleana
    #       aparte que se pueda desincronizar de la fecha real de edición.
    fecha_edicion = Column(TIMESTAMP(timezone=True), nullable=True)

    conjunto = relationship("ConjuntoResidencial")
    administrador = relationship("AdministradorConjunto")
