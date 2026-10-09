"""
Módulo: schemas/puntos_acopio.py
Descripción: Schemas de la gestión de puntos de acopio por el Admin Sistema (RQF-011).
¿Para qué? Separados de schemas/directorio.py, que es la vista de solo
          lectura que consultan Residentes/Recicladores — este archivo es
          para crear/editar/dar de baja, exclusivo del Admin Sistema.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# ¿Qué? Issue #352 — tamaño de cada columna en models/punto_acopio.py.
# ¿Impacto? Deben coincidir con PUNTO_ACOPIO_* de fe/src/lib/validacion.ts.
NOMBRE_MAX_LENGTH = 200
DIRECCION_MAX_LENGTH = 255
ENCARGADO_MAX_LENGTH = 100
TELEFONO_MAX_LENGTH = 15


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


class _PuntoAcopioEntrada(PuntoAcopioBase):
    """¿Qué? Máximos solo en lo que entra (crear/editar), no en la respuesta:
    PuntoAcopioAdminResponse también hereda de PuntoAcopioBase."""
    nombre: str = Field(max_length=NOMBRE_MAX_LENGTH)
    direccion: str = Field(max_length=DIRECCION_MAX_LENGTH)
    nombre_encargado: Optional[str] = Field(default=None, max_length=ENCARGADO_MAX_LENGTH)
    telefono_contacto: Optional[str] = Field(default=None, max_length=TELEFONO_MAX_LENGTH)


class PuntoAcopioCreate(_PuntoAcopioEntrada):
    pass


class PuntoAcopioUpdate(_PuntoAcopioEntrada):
    # ¿Qué? Por qué se hace este cambio (ej. "nuevo encargado desde el lunes").
    # ¿Impacto? No se guarda en el punto: si viene con texto, queda como un
    #           comentario más en su historial.
    motivo_cambio: Optional[str] = Field(default=None, max_length=1000)


class PuntoAcopioAdminResponse(PuntoAcopioBase):
    """¿Qué? Vista de administración — incluye `activo`, a diferencia de la
    respuesta pública de directorio.py, que ya viene pre-filtrada."""
    id_punto_acopio: UUID
    nombre_localidad: str
    activo: bool

    model_config = {"from_attributes": True}


class ComentarioCreate(BaseModel):
    texto: str = Field(max_length=1000)

    @field_validator("texto")
    @classmethod
    def validar_no_vacio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El comentario no puede estar vacío.")
        return v


class ComentarioResponse(BaseModel):
    id_comentario: UUID
    texto: str
    created_at: datetime
    # ¿Qué? Correo de quien lo escribió; None si esa cuenta ya no existe.
    autor: Optional[str] = None
