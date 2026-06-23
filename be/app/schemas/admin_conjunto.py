"""
Módulo: schemas/admin_conjunto.py
Descripción: Schemas Pydantic para el flujo de invitación de Administradores de Conjunto.
¿Para qué? Validar los datos que entran en cada paso del flujo:
           1. El Administrador del Sistema invita (solo correo + conjuntos).
           2. La persona invitada acepta (token + su propia contraseña y datos).
"""

from typing import List
from pydantic import BaseModel, EmailStr, field_validator

from app.schemas.user import _validate_password_strength


class InvitarAdminConjuntoRequest(BaseModel):
    """
    ¿Qué? Lo único que el Administrador del Sistema debe escribir para
          invitar a alguien.
    ¿Para qué? Nota que NO incluye contraseña ni datos personales del
              invitado — esos los completa la persona invitada, no el
              Administrador del Sistema.
    """
    correo_electronico: EmailStr
    ids_conjuntos: List[int]

    @field_validator("ids_conjuntos")
    @classmethod
    def validar_al_menos_un_conjunto(cls, v: List[int]) -> List[int]:
        if not v or len(v) == 0:
            raise ValueError("Debes asignar al menos un conjunto residencial.")
        return v


class AceptarInvitacionAdminConjuntoRequest(BaseModel):
    """
    ¿Qué? Lo que la persona invitada envía al aceptar su invitación.
    ¿Para qué? Aquí sí va su contraseña y sus datos personales — los
              define ella misma, nunca el Administrador del Sistema.
    """
    token: str
    password: str
    nombre: str
    apellidos: str
    numero_telefonico: str = "N/A"

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)

    @field_validator("nombre", "apellidos")
    @classmethod
    def validar_no_vacio(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Este campo es obligatorio.")
        return v


class InvitacionInfoResponse(BaseModel):
    """
    ¿Qué? Lo que se le muestra a la persona invitada ANTES de que llene
          el formulario (para que sepa a qué correo y conjuntos
          corresponde la invitación, sin tener que adivinar).
    """
    correo_electronico: str
    nombres_conjuntos: List[str]
    valido: bool