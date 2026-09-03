"""
Módulo: schemas/conjunto_panel.py
Descripción: Schemas para el panel propio del Administrador de Conjunto.
¿Para qué? Permitir que un Administrador de Conjunto vea y edite SOLO los
          datos de los conjuntos que tiene asignados (nunca de otros).
"""

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, field_validator


class ConjuntoAdministradoResponse(BaseModel):
    """¿Qué? Un conjunto que el Administrador de Conjunto en sesión administra."""
    id_conjunto_residencial: UUID
    nombre_conjunto: str
    nit: Optional[str] = None
    direccion: str
    nombre_localidad: str
    # ¿Qué? RQF-016: si ya hay una solicitud de desvinculación pendiente
    #       para este conjunto, para que el frontend oculte el botón de
    #       "solicitar desvinculación" en vez de dejar que el usuario
    #       choque con el error de solicitud duplicada (RN-002).
    tiene_solicitud_pendiente: bool = False
    # ¿Qué? Issue #168 — el código que el admin reparte fuera de la app
    #       para que un Residente demuestre que vive en este conjunto al
    #       registrarse. Todo conjunto ya tiene uno desde que se creó
    #       (ver default en el modelo), nunca es None.
    codigo_acceso: str


class CodigoAccesoResponse(BaseModel):
    """¿Qué? Respuesta al (re)generar el código de acceso de un conjunto."""
    codigo_acceso: str


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