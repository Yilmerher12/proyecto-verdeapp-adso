"""
Módulo: schemas/user.py
Descripción: Schemas Pydantic para validación de datos de entrada y salida.
Adaptado para VerdeApp: Recibe datos completos del formulario (Rol, Datos Personales, Conjunto, Localidad).
"""

import re
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, EmailStr, field_validator


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
    # ¿Qué? Antes era "rol: str" — cualquier texto pasaba la validación.
    # ¿Para qué? auth_service.py solo sabe crear la fila de detalle (en
    #           "recicladores") para "residente" o "reciclador" exactos; un
    #           valor distinto (typo, mayúscula, u otro rol) no entraba en
    #           ningún caso del if/elif y dejaba el Usuario creado pero sin
    #           esa fila — un usuario "huérfano" que nunca puede operar.
    # ¿Impacto? Con Literal, ese valor inválido ya ni siquiera llega a
    #           auth_service: Pydantic lo rechaza en la validación del
    #           request con un 422 claro, antes de tocar la base de datos.
    rol: Literal["residente", "reciclador"]
    correo_electronico: EmailStr
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
    id_conjunto_residencial: Optional[UUID] = None
    torre: Optional[str] = None
    apto: Optional[str] = None
    asociacion: Optional[str] = None

    @field_validator("apellidos")
    @classmethod
    def validate_apellidos_no_vacio(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Los apellidos son obligatorios")
        return v

    # ¿Qué? Antes UserCreate era el único de los 3 schemas de contraseña
    #       (registro, cambio, recuperación) sin este validador.
    # ¿Impacto? Sin esto, alguien podía registrarse con una contraseña de 1
    #           carácter, pero luego "cambiar contraseña" o "recuperar
    #           contraseña" SÍ le exigían la contraseña fuerte — la puerta
    #           de entrada era más débil que el resto de la app.
    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)


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


class LogoutRequest(BaseModel):
    """HU-008/RQF-007: el refresh token también se revoca al cerrar sesión."""
    refresh_token: str


class VerifyEmailRequest(BaseModel):
    token: str = Field(min_length=1)


# Schemas de RESPONSE

class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    # ¿Qué? role_id se queda como int a propósito — `roles` es un
    #       catálogo fijo de 4 valores públicamente conocidos, excluido
    #       de la migración a UUID (ver RolId en app/models/rol.py).
    role_id: int
    is_active: bool
    first_name: str
    last_name: str
    locale: Optional[str] = "es"

    model_config = ConfigDict(from_attributes=True)


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
    # ¿Qué? Solo aplica al rol Reciclador (ver RQF-008). El endpoint la
    #       ignora para Residente/Admin de Conjunto, cuyos modelos no
    #       tienen esta columna.
    asociacion: Optional[str] = None
    # ¿Qué? Consentimiento del reciclador para mostrar su teléfono en el
    #       Directorio general. Solo aplica al rol Reciclador, igual que
    #       "asociacion" — el endpoint la ignora para los demás roles.
    mostrar_contacto_directorio: bool = False


class UpdateLocaleRequest(BaseModel):
    locale: str

    @field_validator("locale")
    @classmethod
    def validate_locale(cls, v: str) -> str:
        supported_locales = ("es", "en")
        if v not in supported_locales:
            raise ValueError(f"Locale '{v}' no soportado.")
        return v