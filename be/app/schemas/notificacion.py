from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NotificacionEnviarBody(BaseModel):
    tipo: str  # LLEGADA_RECICLADOR | SHUT_LLENO | SHUT_LIBRE
    id_conjunto_residencial: Optional[int] = None  # required for reciclador, inferred for residente


class NotificacionResponse(BaseModel):
    id: int
    tipo: str
    mensaje: str
    # ¿Qué? Opcional porque RQF-015 (novedades del Admin del Sistema) son
    #       de toda la plataforma, no de un conjunto — esas notificaciones
    #       no tienen id_conjunto_residencial.
    nombre_conjunto: Optional[str] = None
    leida: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class EstadoShutResponse(BaseModel):
    lleno: bool
    created_at: Optional[datetime] = None


class ContadorNoLeidasResponse(BaseModel):
    count: int
