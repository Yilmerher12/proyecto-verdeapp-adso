from sqlalchemy import Column, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils.ids import generar_uuid4


class ContenidoEducativoEnvio(Base):
    """
    ¿Qué? Un módulo del catálogo enviado A MANO por el Admin del Sistema a un
          conjunto puntual, sin que haya pasado por una auditoría del
          Reciclador (RQF-013 solo recomienda automáticamente si la
          calificación fue Regular o Malo).
    ¿Para qué? Aprovechar un módulo ya calificado bien, o cualquier otro,
              para darle variedad al conjunto — RQF-018.
    ¿Impacto? No se borra ni se reemplaza: cada envío queda como su propia
              fila, igual que el historial de auditorías. Puede haber varios
              envíos del mismo módulo al mismo conjunto en fechas distintas.
    """
    __tablename__ = "contenido_educativo_envios"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=generar_uuid4)
    id_contenido = Column(
        UUID(as_uuid=True),
        ForeignKey("contenido_educativo.id_contenido", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    id_conjunto_residencial = Column(
        UUID(as_uuid=True),
        ForeignKey("conjuntos_residenciales.id_conjunto_residencial", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # ¿Qué? Quién lo envió — nullable porque si la cuenta del admin se
    #       borrara algún día, el envío en sí no debe desaparecer.
    enviado_por_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id_usuario", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    contenido = relationship("ContenidoEducativo")
    conjunto = relationship("ConjuntoResidencial")
    enviado_por = relationship("Usuario")
