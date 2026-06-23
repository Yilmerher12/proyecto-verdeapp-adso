"""
Módulo: schemas/conjunto_panel.py
Descripción: Schemas para el panel propio del Administrador de Conjunto.
¿Para qué? Permitir que un Administrador de Conjunto vea y edite SOLO los
          datos de los conjuntos que tiene asignados (nunca de otros).
"""

from typing import Optional
from pydantic import BaseModel, field_validator


class ConjuntoAdministradoResponse(BaseModel):
    """¿Qué? Un conjunto que el Administrador de Conjunto en sesión administra."""
    id_conjunto_residencial: int
    nombre_conjunto: str
    nit: Optional[str] = None
    direccion: str
    nombre_localidad: str


class EditarConjuntoRequest(BaseModel):
    """
    ¿Qué? Datos editables de un conjunto por su propio administrador.
    ¿Para qué? Permitir corregir nombre, NIT o dirección sin tocar el
              id_localidad (eso requeriría mover el conjunto de localidad,
              una operación más delicada que dejamos fuera por ahora).
    """
    nombre_conjunto: str
    nit: Optional[str] = None
    direccion: str

    @field_validator("nombre_conjunto", "direccion")
    @classmethod
    def validar_no_vacio(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Este campo es obligatorio.")
        return v