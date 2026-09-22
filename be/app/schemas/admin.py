"""
Módulo: schemas/admin.py
Descripción: Schemas Pydantic para los endpoints exclusivos del panel del
             Administrador del Sistema.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

MOTIVO_MAX_LENGTH = 200


class CambiarHabilitadoRequest(BaseModel):
    """
    ¿Qué? Cuerpo del PATCH que activa o desactiva la cuenta de un usuario.
    ¿Para qué? El correo del usuario objetivo va en la URL, no aquí. El
              motivo es opcional y solo tiene sentido al desactivar.
    ¿Impacto? Un motivo vacío o solo con espacios se guarda como "sin
              motivo" (NULL), no como un texto en blanco.
    """
    habilitado: bool
    motivo: Optional[str] = Field(default=None, max_length=MOTIVO_MAX_LENGTH)

    @field_validator("motivo")
    @classmethod
    def limpiar_motivo(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        texto = v.strip()
        return texto or None


class PerfilUsuarioAdminResponse(BaseModel):
    """
    ¿Qué? Perfil de solo lectura de cualquier usuario, para el panel lateral
          del Admin del Sistema.
    ¿Para qué? Une lo común a los 4 roles (tabla usuarios) con los datos
              propios de cada rol. "detalle" cambia según el rol: solo trae
              las claves que aplican a ese rol.
    ¿Impacto? Nunca incluye la contraseña ni ningún token.
    """
    correo_electronico: str
    role_id: int
    rol: str
    habilitado: bool
    correo_verificado: bool
    idioma: str
    foto_perfil_url: Optional[str] = None
    bloqueado_hasta: Optional[datetime] = None
    fecha_desactivacion: Optional[datetime] = None
    motivo_desactivacion: Optional[str] = None
    nombre: Optional[str] = None
    apellidos: Optional[str] = None
    telefono: Optional[str] = None
    detalle: dict = Field(default_factory=dict)
