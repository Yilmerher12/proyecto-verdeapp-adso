"""
Módulo: schemas/geography.py
Descripción: Modelos de validación Pydantic para datos geográficos.
"""

from pydantic import BaseModel
from typing import Optional

class LocalidadResponse(BaseModel):
    id_localidad: int
    nombre_localidad: str

    class Config:
        from_attributes = True

class ConjuntoResponse(BaseModel):
    id_conjunto_residencial: int
    id_localidad: int
    nombre_conjunto: str
    nit: Optional[str] = None
    direccion: str

    class Config:
        from_attributes = True
        
class UnidadResponse(BaseModel):
    id_unidad: int
    id_conjunto_residencial: int
    torre: str
    apto: str

    class Config:
        from_attributes = True