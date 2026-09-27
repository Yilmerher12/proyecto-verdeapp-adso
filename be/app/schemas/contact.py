"""
Módulo: schemas/contact.py
Descripción: Issue #351 — cuerpo del formulario de contacto de la landing.
¿Impacto? Los límites deben coincidir con CONTACTO_* de fe/src/lib/validacion.ts.
"""

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.user import CORREO_MAX_LENGTH, _validar_nombre_obligatorio

ASUNTO_MIN_LENGTH = 3
ASUNTO_MAX_LENGTH = 150
MENSAJE_MIN_LENGTH = 10
MENSAJE_MAX_LENGTH = 2000


class ContactRequest(BaseModel):
    # ¿Qué? max_length en el nombre queda a cargo del validador compartido,
    #       igual que en el registro (mismo mensaje de error en toda la app).
    name: str
    email: EmailStr = Field(max_length=CORREO_MAX_LENGTH)
    # ¿Qué? pattern sin saltos de línea en el asunto.
    # ¿Para qué? El asunto va a la cabecera "Subject" del correo: un salto de
    #           línea ahí permitiría inyectar cabeceras falsas (ej. un "Bcc").
    subject: str = Field(
        min_length=ASUNTO_MIN_LENGTH, max_length=ASUNTO_MAX_LENGTH, pattern=r"^[^\r\n]*$"
    )
    message: str = Field(min_length=MENSAJE_MIN_LENGTH, max_length=MENSAJE_MAX_LENGTH)

    @field_validator("name")
    @classmethod
    def validar_nombre(cls, v: str) -> str:
        return _validar_nombre_obligatorio(v).strip()

    # ¿Qué? Se recortan espacios antes de medir.
    # ¿Para qué? Que "   a   " no cuente como un asunto de 7 caracteres.
    @field_validator("subject", "message", mode="before")
    @classmethod
    def recortar(cls, v: object) -> object:
        return v.strip() if isinstance(v, str) else v
