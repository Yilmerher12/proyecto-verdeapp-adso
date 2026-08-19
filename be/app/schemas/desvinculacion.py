"""
Módulo: schemas/desvinculacion.py
Descripción: Schemas del flujo de desvinculación y reasignación de conjuntos (RQF-016).
¿Para qué? Cubrir los 3 flujos: el Admin Conjunto solicita desvincularse
          (HU-022), el Admin Sistema aprueba/rechaza (HU-023), y el Admin
          Sistema asigna un conjunto adicional a un admin existente (HU-024).
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, model_validator


class SolicitarDesvinculacionRequest(BaseModel):
    """¿Qué? Lo que envía el Admin Conjunto al pedir desvincularse — el motivo es opcional (RF)."""
    motivo: Optional[str] = None


class SolicitudDesvinculacionResponse(BaseModel):
    """¿Qué? Una solicitud de desvinculación, con los datos que el Admin Sistema necesita para resolverla (CA-023.1)."""
    id: int
    id_conjunto_residencial: int
    nombre_conjunto: str
    id_administrador: int
    nombre_administrador: str
    apellidos_administrador: str
    motivo: Optional[str] = None
    estado: str
    created_at: datetime


class ResolverSolicitudDesvinculacionRequest(BaseModel):
    """
    ¿Qué? Lo que envía el Admin Sistema al aprobar o rechazar una solicitud.
    ¿Para qué? Si rechaza, el motivo es obligatorio — el Admin Conjunto
              debe saber por qué su solicitud no procedió (CA-023.3).
    """
    aprobar: bool
    motivo_rechazo: Optional[str] = None

    # ¿Qué? Se usa un validador de MODELO (no de campo) porque un
    #       @field_validator normal no se ejecuta cuando el campo usa su
    #       valor por defecto (motivo_rechazo=None, cuando ni siquiera se
    #       envía en el JSON) — y ese es justo el caso que hay que
    #       rechazar: "aprobar: false" sin ningún motivo_rechazo.
    @model_validator(mode="after")
    def validar_motivo_si_rechaza(self) -> "ResolverSolicitudDesvinculacionRequest":
        if self.aprobar is False and (not self.motivo_rechazo or not self.motivo_rechazo.strip()):
            raise ValueError("Debes indicar un motivo para rechazar la solicitud.")
        return self


class ConjuntoSinAdministradorResponse(BaseModel):
    """¿Qué? Un conjunto verificado que hoy no tiene ningún administrador activo (CA-024.2)."""
    id_conjunto_residencial: int
    nombre_conjunto: str
    nombre_localidad: str


class AdministradorConjuntoResumenResponse(BaseModel):
    """¿Qué? Resumen de un Admin de Conjunto existente, para buscarlo al asignarle un conjunto adicional (CA-024.1)."""
    id_administrador: int
    nombre: str
    apellidos: str
    correo_electronico: str
    conjuntos_actuales: list[str]


class AsignarConjuntoAdicionalRequest(BaseModel):
    """¿Qué? Lo que el Admin Sistema envía para vincular un conjunto adicional a un admin existente."""
    id_administrador: int
    id_conjunto_residencial: int
