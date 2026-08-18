from enum import StrEnum

from sqlalchemy import Column, Integer, String, Text, ForeignKey, TIMESTAMP, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class EstadoSolicitudDesvinculacion(StrEnum):
    """
    ¿Qué? Los 3 estados posibles de una solicitud de desvinculación.
    ¿Para qué? Evitar comparar contra strings sueltos ("PENDIENTE") en
              cada archivo — si alguien escribe mal el nombre, Python
              avisa con un error en vez de fallar en silencio.
    """
    PENDIENTE = "PENDIENTE"
    APROBADA = "APROBADA"
    RECHAZADA = "RECHAZADA"


class SolicitudDesvinculacion(Base):
    """
    ¿Qué? El flujo de aprobación de una desvinculación (RQF-016): quién la
          pidió, de qué conjunto, por qué, y cómo la resolvió el Admin
          Sistema.
    ¿Para qué? Es un registro DISTINTO de "administradores_conjuntos" —
              esta tabla es el historial del FLUJO (incluye solicitudes
              rechazadas, que nunca terminan el vínculo real), mientras
              que "administradores_conjuntos.fecha_desvinculacion" es el
              historial del VÍNCULO en sí.
    ¿Impacto? Nunca se borra ninguna fila — es el historial completo de
              solicitudes, aprobadas, rechazadas o pendientes (RN-004).
    """
    __tablename__ = "solicitudes_desvinculacion"

    id = Column(Integer, primary_key=True, index=True)

    id_administrador = Column(
        Integer,
        ForeignKey("administradores_conjunto.id_administrador", ondelete="CASCADE"),
        nullable=False,
    )
    id_conjunto_residencial = Column(
        Integer,
        ForeignKey("conjuntos_residenciales.id_conjunto_residencial", ondelete="CASCADE"),
        nullable=False,
    )

    motivo = Column(Text, nullable=True)
    estado = Column(String(20), nullable=False, default=EstadoSolicitudDesvinculacion.PENDIENTE)
    motivo_rechazo = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)
    resuelta_at = Column(TIMESTAMP, nullable=True)
    resuelta_por_id = Column(
        Integer,
        ForeignKey("usuarios.id_usuario", ondelete="SET NULL"),
        nullable=True,
    )

    administrador = relationship("AdministradorConjunto")
    conjunto = relationship("ConjuntoResidencial")
    resuelta_por = relationship("Usuario", foreign_keys=[resuelta_por_id])

    __table_args__ = (
        # ¿Qué? No puede haber dos solicitudes PENDIENTES para el mismo
        #       par administrador+conjunto al mismo tiempo (RN-002).
        # ¿Para qué? Igual que con el vínculo activo, un índice único
        #           parcial deja que existan muchas solicitudes ya
        #           resueltas (historial) pero bloquea una segunda
        #           solicitud pendiente para la misma combinación.
        Index(
            "ux_solicitud_desvinculacion_pendiente",
            "id_administrador",
            "id_conjunto_residencial",
            unique=True,
            postgresql_where=(estado == EstadoSolicitudDesvinculacion.PENDIENTE.value),
        ),
    )
