"""
Módulo: schemas/novedad.py
Descripción: Schemas de novedades generales de la plataforma (RQF-015).
¿Para qué? Cubrir los 4 flujos del Admin Sistema (publicar, ver todas
          incl. archivadas, editar, archivar) y el feed que ven
          Residente/Reciclador/Admin Conjunto según su rol.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, field_validator

from app.models.novedad import AlcanceNovedad


class CrearNovedadRequest(BaseModel):
    """¿Qué? Lo que envía el Admin Sistema al publicar una novedad nueva (HU-032)."""
    alcance: AlcanceNovedad
    texto: str
    url_adjunto: Optional[str] = None
    url_video: Optional[str] = None
    # ¿Qué? Lista vacía (o sin mandar) = la novedad llega a todos los
    #       conjuntos del alcance elegido, igual que siempre. Con uno o
    #       varios ids, solo a esos conjuntos.
    conjuntos: List[UUID] = []
    # ¿Qué? Si no se manda, el service usa una expiración sugerida por
    #       defecto (CA-032.3) — el RF no define tipos con plazos
    #       distintos como en Comunicados, solo "el sistema sugiere una
    #       fecha, editable".
    fecha_expiracion: Optional[datetime] = None

    @field_validator("texto")
    @classmethod
    def validar_texto_no_vacio(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("El texto de la novedad es obligatorio.")
        return v.strip()


class EditarNovedadRequest(BaseModel):
    """
    ¿Qué? Lo que envía el Admin Sistema al editar una novedad (HU-034).
    ¿Para qué? A propósito NO incluye alcance ni conjuntos — igual que el
              RF (CA-034.2) dice para alcance, a quién llega una novedad se
              decide al publicarla, no después.
    """
    texto: str
    url_adjunto: Optional[str] = None
    url_video: Optional[str] = None
    fecha_expiracion: Optional[datetime] = None

    @field_validator("texto")
    @classmethod
    def validar_texto_no_vacio(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("El texto de la novedad es obligatorio.")
        return v.strip()


class ConjuntoDestino(BaseModel):
    """¿Qué? Un conjunto al que va dirigida una novedad, con su nombre ya resuelto."""
    id_conjunto_residencial: UUID
    nombre_conjunto: str


class NovedadResponse(BaseModel):
    """¿Qué? Una novedad, tal como la ve el Admin Sistema en su panel o un destinatario en su feed."""
    id_novedad: UUID
    alcance: str
    texto: str
    url_adjunto: Optional[str] = None
    url_video: Optional[str] = None
    # ¿Qué? Vacía = llega a todos los conjuntos del alcance. Trae el nombre
    #       para no obligar al frontend a pedirlo aparte.
    conjuntos: List[ConjuntoDestino] = []
    fecha_expiracion: datetime
    created_at: datetime
    editado: bool
    archivada: bool
