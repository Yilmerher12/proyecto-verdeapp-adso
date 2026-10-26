from datetime import datetime, timezone
from enum import StrEnum

from sqlalchemy import Column, ForeignKey, String, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.utils.ids import generar_uuid4


class EstadoNovedadEnviada(StrEnum):
    NUEVA = "NUEVA"
    EN_REVISION = "EN_REVISION"
    RESUELTA = "RESUELTA"


class PrioridadNovedadEnviada(StrEnum):
    ALTA = "ALTA"
    MEDIA = "MEDIA"
    BAJA = "BAJA"


# ¿Qué? Los estados en que una novedad todavía espera al Admin Sistema.
# ¿Para qué? La bandeja de "Soporte técnico" muestra por defecto solo estas, y el
#           tope de novedades por autor (RN-009) también las cuenta.
ESTADOS_PENDIENTES = (EstadoNovedadEnviada.NUEVA.value, EstadoNovedadEnviada.EN_REVISION.value)

# ¿Qué? Prioridad que recibe una novedad según el motivo que el autor eligió en
#       el formulario (las claves son las de fe/src/components/NovedadesEnviadas.tsx).
# ¿Para qué? El autor nunca elige la prioridad (todos pondrían "alta"): la
#           decide la app al crear la novedad y el Admin Sistema la corrige si hace falta.
# ¿Impacto? Un motivo nuevo en el formulario debe sumarse aquí; sin motivo
#          (filas viejas) o con "otros" la prioridad es MEDIA.
PRIORIDAD_POR_MOTIVO: dict[str, PrioridadNovedadEnviada] = {
    "login": PrioridadNovedadEnviada.ALTA,
    "falla": PrioridadNovedadEnviada.ALTA,
    "recicladorConjunto": PrioridadNovedadEnviada.ALTA,
    "recicladorAuditoria": PrioridadNovedadEnviada.ALTA,
    "adminCodigo": PrioridadNovedadEnviada.ALTA,
    "notificaciones": PrioridadNovedadEnviada.MEDIA,
    "cuenta": PrioridadNovedadEnviada.MEDIA,
    "residenteUnidad": PrioridadNovedadEnviada.MEDIA,
    "residenteShut": PrioridadNovedadEnviada.MEDIA,
    "adminDatos": PrioridadNovedadEnviada.MEDIA,
    "adminApartamentos": PrioridadNovedadEnviada.MEDIA,
    "otros": PrioridadNovedadEnviada.MEDIA,
    "informacion": PrioridadNovedadEnviada.BAJA,
    "sugerencia": PrioridadNovedadEnviada.BAJA,
}


class NovedadEnviada(Base):
    """
    ¿Qué? Consulta de soporte que un Residente, Reciclador o Admin de
          Conjunto le ENVÍA al Admin Sistema (texto + imagen opcional).
    ¿Para qué? Canal de abajo hacia arriba: contarle algo a VerdeApp.
              No confundir con `novedades` (RQF-015), que son los avisos
              que el Admin Sistema publica hacia todos.
    ¿Impacto? Aparece en "Soporte técnico" del Admin Sistema con una
              prioridad (calculada por el motivo) y un estado; él la
              responde y el autor ve la respuesta en su historial. El
              conjunto se guarda solo cuando aplica (Residente: el de su
              unidad; Admin de Conjunto: el que eligió).
    """
    __tablename__ = "novedades_enviadas"

    id = Column(UUID(as_uuid=True), primary_key=True, index=True, default=generar_uuid4)
    autor_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id_usuario", ondelete="SET NULL"), nullable=True)
    id_conjunto_residencial = Column(
        UUID(as_uuid=True),
        ForeignKey("conjuntos_residenciales.id_conjunto_residencial", ondelete="SET NULL"),
        nullable=True,
    )
    texto = Column(Text, nullable=False)
    url_imagen = Column(String(500), nullable=True)
    # ¿Qué? Clave del motivo elegido (ver PRIORIDAD_POR_MOTIVO); NULL en las novedades anteriores a este campo.
    motivo = Column(String(40), nullable=True)
    prioridad = Column(String(10), nullable=False, default=PrioridadNovedadEnviada.MEDIA.value)
    estado = Column(String(20), nullable=False, default=EstadoNovedadEnviada.NUEVA.value)
    respuesta = Column(Text, nullable=True)
    respondida_at = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(
        TIMESTAMP(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
    resuelta_at = Column(TIMESTAMP(timezone=True), nullable=True)

    autor = relationship("Usuario", lazy="joined")
    conjunto = relationship("ConjuntoResidencial")
