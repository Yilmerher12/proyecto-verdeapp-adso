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
    # ¿Qué? Issue #312: bcrypt solo usa los primeros 72 bytes. Antes passlib
    #       cortaba el resto en silencio (dos contraseñas largas que empiezan
    #       igual valían lo mismo); bcrypt 5 lanza un error.
    # ¿Impacto? Se mide en bytes UTF-8, no en caracteres: una tilde o una ñ
    #           ocupan 2 bytes.
    if len(v.encode("utf-8")) > 72:  # noqa: PLR2004
        raise ValueError("La contraseña no puede superar 72 caracteres (menos si usa tildes o ñ)")
    if not re.search(r"[A-Z]", v):
        raise ValueError("La contraseña debe contener al menos una mayúscula")
    if not re.search(r"[a-z]", v):
        raise ValueError("La contraseña debe contener al menos una minúscula")
    if not re.search(r"\d", v):
        raise ValueError("La contraseña debe contener al menos un número")
    return v


# ¿Qué? Longitud mínima para nombre/apellidos, y formato del teléfono
#       (RQF-008: solo dígitos, entre 7 y 10 caracteres).
# ¿Para qué? Antes cada formulario (registro, editar perfil) definía su
#           propia copia de estas reglas — o, en el caso del registro, no
#           tenía ninguna regla en absoluto. Ahora es una sola fuente de
#           verdad, compartida por UserCreate y UpdateProfileBody más
#           abajo, para que registrarse y editar el perfil exijan
#           exactamente lo mismo.
NOMBRE_MIN_LENGTH = 2
TELEFONO_REGEX = re.compile(r"^\d{7,10}$")

# ¿Qué? Issue #255 — formato de Torre/Bloque y Apartamento: letras y
#       números, con un solo espacio o guion como separador entre partes
#       ("12-B", "TORRE 1", "BLOQUE 12-B"), nunca repetido ni suelto al
#       principio o final ("1----B", "-3B", "3B-").
# ¿Para qué? Las convenciones de nombres de torres/bloques varían demasiado
#           entre conjuntos reales como para exigir un formato más estricto
#           — esto solo descarta lo que claramente no es un dato real
#           (puros símbolos, "3b..a.a.s").
UNIDAD_REGEX = re.compile(r"^[A-Za-z0-9]+(?:[ -][A-Za-z0-9]+)*$")


def _validar_nombre_obligatorio(v: str) -> str:
    """Exige contenido real (no solo espacios) y una longitud mínima razonable.

    ¿Para qué? Un mínimo de 2 caracteres descarta lo obviamente inválido
              (nombre="", nombre="a") sin imponer una regla de "solo
              letras" que rechazaría nombres reales con guion, apóstrofe
              o tilde.
    """
    texto = (v or "").strip()
    if not texto:
        raise ValueError("Este campo es obligatorio.")
    if len(texto) < NOMBRE_MIN_LENGTH:
        raise ValueError(f"Debe tener al menos {NOMBRE_MIN_LENGTH} caracteres.")
    return v


def _validar_telefono_opcional(v: Optional[str]) -> Optional[str]:
    """El teléfono sigue siendo opcional — pero si se da uno, debe ser real.

    ¿Qué? Antes esta regla (RQF-008) solo existía para "editar perfil"
          (be/app/services/user_service.py) — el registro no tenía
          ninguna, así que se podía crear una cuenta con
          numero_telefonico="abc!!!".
    ¿Impacto? Vacío o None sigue pasando sin problema (campo opcional).
              "N/A" (el valor por defecto que ya usan cuentas existentes
              cuando no se registró ningún teléfono) también se acepta
              tal cual, para no romper ese valor histórico.
    """
    if v is None:
        return v
    texto = v.strip()
    if not texto or texto == "N/A":
        return v
    if not TELEFONO_REGEX.match(texto):
        raise ValueError("El número telefónico tiene un formato inválido.")
    return v


def _validar_formato_unidad(v: Optional[str]) -> Optional[str]:
    """Torre/Bloque y Apartamento siguen siendo opcionales aquí (la
    obligatoriedad para Residente vive en auth_service.register_user) —
    pero si se da un valor, no puede ser solo símbolos ni texto vacío con
    espacios.

    ¿Impacto? "TORRE 1", "12-B", "B2" pasan sin problema. "!!!", "   ",
              "1----B", "3b..a.a.s" se rechazan.
    """
    if v is None:
        return v
    texto = v.strip()
    if texto and not UNIDAD_REGEX.match(texto):
        raise ValueError("Solo se permiten letras, números, y un espacio o guion como separador.")
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
    # ¿Qué? Issue #168 — solo se usa (y se exige) cuando rol="residente";
    #       Optional aquí por el mismo motivo que id_conjunto_residencial:
    #       un reciclador nunca lo envía, y la validación real de
    #       "obligatorio para residente" vive en auth_service.register_user,
    #       no aquí (mismo patrón ya usado para id_conjunto_residencial).
    codigo_acceso: Optional[str] = None

    @field_validator("nombre")
    @classmethod
    def validate_nombre(cls, v: str) -> str:
        return _validar_nombre_obligatorio(v)

    @field_validator("apellidos")
    @classmethod
    def validate_apellidos_no_vacio(cls, v: str) -> str:
        return _validar_nombre_obligatorio(v)

    @field_validator("numero_telefonico")
    @classmethod
    def validate_numero_telefonico(cls, v: Optional[str]) -> Optional[str]:
        return _validar_telefono_opcional(v)

    @field_validator("torre")
    @classmethod
    def validate_torre(cls, v: Optional[str]) -> Optional[str]:
        return _validar_formato_unidad(v)

    @field_validator("apto")
    @classmethod
    def validate_apto(cls, v: Optional[str]) -> Optional[str]:
        return _validar_formato_unidad(v)

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

    # ¿Qué? Mismas reglas que UserCreate (arriba) — antes esta pantalla
    #       ("editar perfil") las revisaba a mano dentro de
    #       user_service.actualizar_perfil() en vez de aquí, en el molde
    #       de datos, que es el lugar correcto para esto.
    @field_validator("nombre")
    @classmethod
    def validate_nombre(cls, v: str) -> str:
        return _validar_nombre_obligatorio(v)

    @field_validator("apellidos")
    @classmethod
    def validate_apellidos(cls, v: str) -> str:
        return _validar_nombre_obligatorio(v)

    @field_validator("numero_telefonico")
    @classmethod
    def validate_numero_telefonico(cls, v: Optional[str]) -> Optional[str]:
        return _validar_telefono_opcional(v)


class UpdateLocaleRequest(BaseModel):
    locale: str

    @field_validator("locale")
    @classmethod
    def validate_locale(cls, v: str) -> str:
        supported_locales = ("es", "en")
        if v not in supported_locales:
            raise ValueError(f"Locale '{v}' no soportado.")
        return v