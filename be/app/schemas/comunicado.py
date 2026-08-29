"""
Módulo: schemas/comunicado.py
Descripción: Schemas de comunicados del conjunto (RQF-014).
¿Para qué? Validar los 3 flujos del Admin de Conjunto (crear, editar,
          eliminar) y la respuesta que ven tanto el admin (su panel de
          gestión) como residentes/recicladores (su feed).
"""

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, field_validator

from app.models.comunicado import DestinatariosComunicado, TipoComunicado


class CrearComunicadoRequest(BaseModel):
    """¿Qué? Lo que envía el Admin Conjunto al publicar un comunicado nuevo (HU-027)."""
    id_conjunto_residencial: UUID
    destinatarios: DestinatariosComunicado
    tipo: TipoComunicado
    texto: str
    url_adjunto: Optional[str] = None
    # ¿Qué? Obligatoria solo cuando tipo=CONVOCATORIA (RF: "expira al día
    #       siguiente del evento") — se valida en el service, no aquí,
    #       porque depende del valor de otro campo.
    fecha_evento: Optional[date] = None
    # ¿Qué? Si no se manda, el service calcula la expiración sugerida según
    #       el tipo (CA-027.3). Si se manda, se respeta tal cual — el RF
    #       permite que el admin la cambie.
    fecha_expiracion: Optional[datetime] = None

    @field_validator("texto")
    @classmethod
    def validar_texto_no_vacio(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("El texto del comunicado es obligatorio.")
        return v.strip()


class EditarComunicadoRequest(BaseModel):
    """
    ¿Qué? Lo que envía el Admin Conjunto al editar un comunicado (HU-029).
    ¿Para qué? A propósito NO incluye id_conjunto_residencial ni
              destinatarios — el RF (CA-029.2) dice explícitamente que
              esos dos no se pueden cambiar después de publicar.
    """
    tipo: TipoComunicado
    texto: str
    url_adjunto: Optional[str] = None
    fecha_evento: Optional[date] = None
    fecha_expiracion: Optional[datetime] = None

    @field_validator("texto")
    @classmethod
    def validar_texto_no_vacio(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("El texto del comunicado es obligatorio.")
        return v.strip()


class ComunicadoResponse(BaseModel):
    """¿Qué? Un comunicado, tal como lo ve el Admin Conjunto en su panel o un destinatario en su feed."""
    id_comunicado: UUID
    id_conjunto_residencial: UUID
    nombre_conjunto: str
    destinatarios: str
    tipo: str
    texto: str
    url_adjunto: Optional[str] = None
    fecha_evento: Optional[date] = None
    fecha_expiracion: datetime
    created_at: datetime
    editado: bool
