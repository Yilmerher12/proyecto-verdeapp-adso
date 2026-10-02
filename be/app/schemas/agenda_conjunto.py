"""
Módulo: schemas/agenda_conjunto.py
Descripción: Schemas de la agenda interna del Admin de Conjunto — temas por
             conjunto (texto + foto opcional) que lleva al comité.
¿Para qué? Es privada: nunca llega al Admin Sistema.
"""

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.desvinculacion import MOTIVO_MAX_LENGTH

# ¿Qué? Mismo tope que el resto de campos libres de este tipo.
TEXTO_MAX_LENGTH = MOTIVO_MAX_LENGTH


class CrearAgendaItemRequest(BaseModel):
    texto: str = Field(min_length=1, max_length=TEXTO_MAX_LENGTH)
    # ¿Qué? URL ya subida por el endpoint genérico de adjuntos — este
    #       endpoint solo guarda la URL, no recibe el archivo.
    url_evidencia: Optional[str] = Field(default=None, max_length=500)


class CambiarEstadoAgendaRequest(BaseModel):
    estado: Literal["PENDIENTE", "EN_ESPERA"]


class AgendaItemResponse(BaseModel):
    id: UUID
    texto: str
    url_evidencia: Optional[str] = None
    estado: str
    created_at: datetime
