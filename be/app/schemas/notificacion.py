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
    nombre_conjunto: str
    leida: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class EstadoShutResponse(BaseModel):
    lleno: bool
    created_at: Optional[datetime] = None


class ContadorNoLeidasResponse(BaseModel):
    count: int
