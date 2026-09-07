"""
Módulo: schemas/puntos_acopio.py
Descripción: Schemas de la gestión de puntos de acopio por el Admin Sistema (RQF-011).
¿Para qué? Separados de schemas/directorio.py, que es la vista de solo
          lectura que consultan Residentes/Recicladores — este archivo es
          para crear/editar/dar de baja, exclusivo del Admin Sistema.
"""

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, field_validator


class PuntoAcopioBase(BaseModel):
    nombre: str
    direccion: str
    id_localidad: int
    nombre_encargado: Optional[str] = None
    telefono_contacto: Optional[str] = None

    @field_validator("nombre", "direccion")
    @classmethod
    def validar_no_vacio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Este campo es obligatorio.")
        return v


class PuntoAcopioCreate(PuntoAcopioBase):
    pass


class PuntoAcopioUpdate(PuntoAcopioBase):
    pass


class PuntoAcopioAdminResponse(PuntoAcopioBase):
    """¿Qué? Vista de administración — incluye `activo`, a diferencia de la
    respuesta pública de directorio.py, que ya viene pre-filtrada."""
    id_punto_acopio: UUID
    nombre_localidad: str
    activo: bool

    model_config = {"from_attributes": True}
