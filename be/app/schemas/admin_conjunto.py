"""
Módulo: schemas/admin_conjunto.py
Descripción: Schemas Pydantic para el flujo de invitación de Administradores de Conjunto.
¿Para qué? Validar los datos que entran en cada paso del flujo:
           1. El Administrador del Sistema invita (solo correo + conjuntos).
           2. La persona invitada acepta (token + su propia contraseña y datos).
"""

from typing import List
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.user import (
    _validar_apellidos_obligatorio,
    _validar_nombre_obligatorio,
    _validar_telefono_opcional,
    _validate_password_strength,
)


class InvitarAdminConjuntoRequest(BaseModel):
    """
    ¿Qué? Lo único que el Administrador del Sistema debe escribir para
          invitar a alguien.
    ¿Para qué? Nota que NO incluye contraseña ni datos personales del
              invitado — esos los completa la persona invitada, no el
              Administrador del Sistema.
    """
    correo_electronico: EmailStr
    # ¿Qué? Issue #402 (CN-060) — tope de 100 conjuntos por invitación.
    # ¿Para qué? Sin tope se podían mandar miles de UUID en una sola petición.
    ids_conjuntos: List[UUID] = Field(max_length=100)

    @field_validator("ids_conjuntos")
    @classmethod
    def validar_al_menos_un_conjunto(cls, v: List[UUID]) -> List[UUID]:
        if not v or len(v) == 0:
            raise ValueError("Debes asignar al menos un conjunto residencial.")
        # ¿Qué? Quita los conjuntos repetidos conservando el orden.
        # ¿Para qué? Con un conjunto repetido, al aceptar la invitación se
        #           intentaba crear dos vínculos activos para el mismo conjunto,
        #           la base de datos lo rechazaba (ux_admin_conjunto_activo) y
        #           la invitación quedaba inutilizable.
        return list(dict.fromkeys(v))


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

    # ¿Qué? Mismas reglas que el registro y el perfil (schemas/user.py): antes
    #       aquí solo se revisaba que no estuviera vacío, y el teléfono no
    #       se validaba.
    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, v: str) -> str:
        return _validar_nombre_obligatorio(v)

    @field_validator("apellidos")
    @classmethod
    def validar_apellidos(cls, v: str) -> str:
        return _validar_apellidos_obligatorio(v)

    @field_validator("numero_telefonico")
    @classmethod
    def validar_telefono(cls, v: str) -> str:
        return _validar_telefono_opcional(v)


class InvitacionInfoResponse(BaseModel):
    """
    ¿Qué? Lo que se le muestra a la persona invitada ANTES de que llene
          el formulario (para que sepa a qué correo y conjuntos
          corresponde la invitación, sin tener que adivinar).
    """
    correo_electronico: str
    nombres_conjuntos: List[str]
    valido: bool