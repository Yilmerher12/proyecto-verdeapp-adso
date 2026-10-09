"""
Módulo: schemas/solicitud_unificada.py
Descripción: Schemas de la bandeja unificada "Solicitudes pendientes" del
             Admin Sistema, que junta desvinculaciones y novedades enviadas.
"""

from datetime import datetime
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.schemas.desvinculacion import MOTIVO_MAX_LENGTH

# ¿Qué? Los únicos 2 tipos que existen en la bandeja.
# ¿Para qué? Issue #372 (CN-045): usarlo como tipo del parámetro hace que
#           FastAPI responda 422 a un `tipo` inventado, en vez de que el
#           servicio lo trate en silencio como NOVEDAD.
TipoSolicitud = Literal["DESVINCULACION", "NOVEDAD"]


class SolicitudUnificadaResponse(BaseModel):
    """
    ¿Qué? Una fila de la bandeja — misma forma sin importar si por dentro es
          una SolicitudDesvinculacion o una NovedadEnviada.
    ¿Para qué? El frontend pinta una sola lista, filtrable por `tipo`.
    """
    id: UUID
    tipo: str
    titulo: str
    origen: str
    nombre_conjunto: str
    detalle: str
    url_evidencia: Optional[str] = None
    estado: str
    created_at: datetime


class ResolverSolicitudUnificadaRequest(BaseModel):
    """¿Qué? Lo que envía el Admin Sistema al resolver — para NOVEDAD basta aprobar=True (queda vista)."""
    aprobar: bool
    motivo_rechazo: Optional[str] = Field(default=None, max_length=MOTIVO_MAX_LENGTH)

    @model_validator(mode="after")
    def validar_motivo_si_rechaza(self) -> "ResolverSolicitudUnificadaRequest":
        if self.aprobar is False and (not self.motivo_rechazo or not self.motivo_rechazo.strip()):
            raise ValueError("Debes indicar un motivo para rechazar la solicitud.")
        return self


class PaginaDeSolicitudesResponse(BaseModel):
    """¿Qué? Issue #372 (CN-042): una página de la bandeja + cuántas hay en total, para que el frontend pinte la paginación."""
    items: List[SolicitudUnificadaResponse]
    total: int
