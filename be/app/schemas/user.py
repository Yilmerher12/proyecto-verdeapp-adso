"""
Módulo: schemas/user.py
Descripción: Schemas Pydantic para validación de datos de entrada y salida.
Adaptado para VerdeApp: Recibe datos completos del formulario (Rol, Datos Personales, Conjunto, Localidad).
"""

import re
from typing import Optional
from pydantic import BaseModel, Field, EmailStr, field_validator, model_validator


def _validate_password_strength(v: str) -> str:
    if len(v) < 8:
        raise ValueError("La contraseña debe tener al menos 8 caracteres")
    if not re.search(r"[A-Z]", v):
        raise ValueError("La contraseña debe contener al menos una mayúscula")
    if not re.search(r"[a-z]", v):
        raise ValueError("La contraseña debe contener al menos una minúscula")
    if not re.search(r"\d", v):
        raise ValueError("La contraseña debe contener al menos un número")
    return v


# Schemas de REQUEST (Registro y Login)

class UserCreate(BaseModel):
    rol: str
    correo_electronico: str
    password: str
    nombre: str
    # ¿Qué? Antes existían apellido_paterno (obligatorio) y apellido_materno
    #       (opcional). Ahora es un único campo "apellidos", obligatorio,
    #       igual que "nombre".
    # ¿Impacto? El formulario del frontend debe enviar este único campo;
    #           ya no debe enviar apellido_paterno ni apellido_materno.
    apellidos: str
    numero_telefonico: Optional[str] = "N/A"

    # Permite ingresar la localidad del reciclador desde el frontend
    localidad_id: Optional[int] = None

    # Propiedades opcionales para persistencia flexible de roles
    id_conjunto_residencial: Optional[int] = None
    torre: Optional[str] = None
    apto: Optional[str] = None
    asociacion: Optional[str] = None

    @field_validator("apellidos")
    @classmethod
    def validate_apellidos_no_vacio(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Los apellidos son obligatorios")
        return v


class UserLogin(BaseModel):
    """Diseño tolerante a fallos: acepta correo_electronico, email o username."""
    correo_electronico: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=1)
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class VerifyEmailRequest(BaseModel):
    token: str = Field(min_length=1)


# Schemas de RESPONSE

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    role_id: int
    is_active: bool
    first_name: str
    last_name: str
    locale: Optional[str] = "es"

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    message: str


class UpdateProfileBody(BaseModel):
    nombre: str
    apellidos: str
    numero_telefonico: Optional[str] = None


class UpdateLocaleRequest(BaseModel):
    locale: str

    @field_validator("locale")
    @classmethod
    def validate_locale(cls, v: str) -> str:
        supported_locales = ("es", "en")
        if v not in supported_locales:
            raise ValueError(f"Locale '{v}' no soportado.")
        return v