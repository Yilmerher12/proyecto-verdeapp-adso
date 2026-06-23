"""
Módulo: schemas/reciclador_conjunto.py
Descripción: Esquemas de validación para el flujo de invitación Reciclador-Conjunto.
¿Para qué? Validar los datos que entran y salen de los endpoints de este flujo.
"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class InvitarRecicladorRequest(BaseModel):
    """
    ¿Qué? Datos que envía el Admin de Conjunto para invitar a un Reciclador.
    ¿Para qué? Solo necesita el correo del reciclador (ya registrado) y a
              cuál de sus conjuntos administrados quiere invitarlo.
    """
    correo_reciclador: str
    id_conjunto_residencial: int


class InvitacionRecicladorResponse(BaseModel):
    """¿Qué? Una invitación tal como se muestra en la lista del Admin de Conjunto."""
    id: str
    nombre_reciclador: str
    apellidos_reciclador: str
    correo_reciclador: str
    nombre_conjunto: str
    estado: str
    # ¿Qué cambió? created_at ahora es Optional[datetime] en vez de datetime
    #             obligatorio. Algunas invitaciones podían llegar con este
    #             campo en NULL (ej: insertadas directamente vía SQL en una
    #             semilla, sin pasar por el valor DEFAULT CURRENT_TIMESTAMP
    #             de forma explícita), lo cual rompía la respuesta entera
    #             con un ResponseValidationError. Con Optional, si llega
    #             None, simplemente se muestra como None en vez de fallar.
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InvitacionPendienteRecicladorResponse(BaseModel):
    """¿Qué? Una invitación pendiente tal como la ve el propio Reciclador."""
    id: str
    nombre_conjunto: str
    direccion_conjunto: str
    invitado_por_nombre: str
    estado: str
    expires_at: datetime

    class Config:
        from_attributes = True


class ResponderInvitacionRequest(BaseModel):
    """¿Qué? Lo que envía el Reciclador al aceptar o rechazar."""
    aceptar: bool


class ConjuntoAutorizadoResponse(BaseModel):
    """¿Qué? Un conjunto donde el Reciclador ya está autorizado a trabajar."""
    id_conjunto_residencial: int
    nombre_conjunto: str
    direccion: str
    nombre_localidad: str

    class Config:
        from_attributes = True