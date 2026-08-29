"""
Módulo: schemas/geography.py
Descripción: Modelos de validación Pydantic para datos geográficos.
"""

from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID

class LocalidadResponse(BaseModel):
    id_localidad: int
    nombre_localidad: str

    model_config = ConfigDict(from_attributes=True)

class ConjuntoResponse(BaseModel):
    id_conjunto_residencial: UUID
    id_localidad: int
    nombre_conjunto: str
    nit: Optional[str] = None
    direccion: str

    model_config = ConfigDict(from_attributes=True)

class UnidadResponse(BaseModel):
    id_unidad: UUID
    id_conjunto_residencial: UUID
    torre: str
    apto: str

    model_config = ConfigDict(from_attributes=True)