"""
Módulo: services/auth_service.py
Descripción: Lógica de negocio de autenticación adaptada a las tablas en español de VerdeApp.
¿Para qué? Controlar el registro distribuido, inicio de sesión y emisión de tokens SMTP.
"""

import uuid
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

# Modelos del ecosistema VerdeApp
from app.models.usuario import Usuario
from app.models.residente import Residente
from app.models.reciclador import Reciclador
from app.models.unidad import Unidad
from app.models.password_reset_token import PasswordResetToken
from app.models.email_verification_token import EmailVerificationToken

# Esquemas de validación de datos
from app.schemas.user import (
    ChangePasswordRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
)

# Herramientas de infraestructura
from app.utils.email import send_password_reset_email, send_verification_email
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)


async def register_user(db: Session, user_data: UserCreate) -> Usuario:
    """Registra un usuario en estado INACTIVO, gestiona su perfil y emite el correo de activación."""
    stmt = select(Usuario).where(Usuario.correo_electronico == user_data.correo_electronico)
    existing_user = db.execute(stmt).scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo ya está registrado.",
        )

    role_id_mapped = 2 if user_data.rol == "residente" else 3

    try:
        nuevo_usuario = Usuario(
            correo_electronico=user_data.correo_electronico,
            id_rol=role_id_mapped,
            password=hash_password(user_data.password),
            is_active=False  
        )
        db.add(nuevo_usuario)
        db.flush()

        if user_data.rol == "residente":
            torre_texto = str(getattr(user_data, 'torre', 'TORRE UNICA')).strip().upper()
            apto_texto = str(getattr(user_data, 'apto', 'APTO UNICO')).strip().upper()
            id_conjunto = getattr(user_data, 'id_conjunto_residencial', None)

            if not id_conjunto:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El ID del conjunto residencial es totalmente obligatorio para residentes."
                )

            stmt_unidad = select(Unidad).where(
                Unidad.id_conjunto_residencial == int(id_conjunto),
                Unidad.torre == torre_texto,
                Unidad.apto == apto_texto
            )
            unidad_existente = db.execute(stmt_unidad).scalar_one_or_none()

            if unidad_existente:
                id_unidad_final = unidad_existente.id_unidad
            else:
                nueva_unidad = Unidad(
                    id_conjunto_residencial=int(id_conjunto),
                    torre=torre_texto,
                    apto=apto_texto
                )
                db.add(nueva_unidad)
                db.flush()
                id_unidad_final = nueva_unidad.id_unidad

            nuevo_residente = Residente(
                id_usuario=nuevo_usuario.id_usuario,
                id_unidad=id_unidad_final,
                nombre=user_data.nombre.strip().upper(),
                apellido_paterno=user_data.apellido_paterno.strip().upper(),
                apellido_materno=user_data.apellido_materno.strip().upper() if user_data.apellido_materno else "N/A",
                numero_telefonico=user_data.numero_telefonico,
            )
            db.add(nuevo_residente)

        elif user_data.rol == "reciclador":
            nuevo_reciclador = Reciclador(
                id_usuario=nuevo_usuario.id_usuario,
                localidad_id=user_data.localidad_id, 
                nombre=user_data.nombre.strip().upper(),
                apellido_paterno=user_data.apellido_paterno.strip().upper(),
                apellido_materno=user_data.apellido_materno.strip().upper() if user_data.apellido_materno else "N/A",
                numero_telefonico=user_data.numero_telefonico,  # 🛠️ SE GUARDA EL TELÉFONO DEL RECICLADOR
                asociacion=user_data.asociacion.strip().upper() if user_data.asociacion else "INDEPENDIENTE",
            )
            db.add(nuevo_reciclador)

        db.commit()

        token_verificacion = str(uuid.uuid4())
        expiration_verif = datetime.now(timezone.utc) + timedelta(days=1)
        
        db_token_verif = EmailVerificationToken(
            id=str(uuid.uuid4()),
            id_usuario=nuevo_usuario.id_usuario,
            token=token_verificacion,
            expires_at=expiration_verif,
            used=False
        )
        db.add(db_token_verif)
        db.commit()

        try:
            await send_verification_email(email=nuevo_usuario.correo_electronico, token=token_verificacion)
        except Exception as email_err:
            print(f"Advertencia: Registro completado, pero el correo no se pudo despachar: {str(email_err)}")

        db.refresh(nuevo_usuario)
        return nuevo_usuario

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar los datos: {str(e)}"
        )


def login_user(db: Session, login_data: UserLogin) -> TokenResponse:
    """Valida credenciales y genera tokens inyectando los NOMBRES REALES de la base de datos."""
    correo = login_data.correo_electronico or login_data.email or login_data.username
    
    if not correo:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El campo de correo electrónico es obligatorio."
        )

    stmt = select(Usuario).where(Usuario.correo_electronico == correo)
    user = db.execute(stmt).scalar_one_or_none()

    if not user or not verify_password(login_data.password, user.password):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta no ha sido verificada aún. Por favor, revisa tu buzón en Mailpit."
        )

    real_first_name = "Administrador"
    real_last_name = "del Sistema"

    if user.id_rol == 2:  # Es Residente
        stmt_res = select(Residente).where(Residente.id_usuario == user.id_usuario)
        residente = db.execute(stmt_res).scalar_one_or_none()
        if residente:
            real_first_name = residente.nombre
            real_last_name = f"{residente.apellido_paterno} {residente.apellido_materno}".strip()

    elif user.id_rol == 3:  # Es Reciclador
        stmt_rec = select(Reciclador).where(Reciclador.id_usuario == user.id_usuario)
        reciclador = db.execute(stmt_rec).scalar_one_or_none()
        if reciclador:
            real_first_name = reciclador.nombre
            real_last_name = f"{reciclador.apellido_paterno} {reciclador.apellido_materno}".strip()

    access_token = create_access_token(data={
        "sub": user.correo_electronico, 
        "role_id": user.id_rol,
        "first_name": real_first_name,
        "last_name": real_last_name
    })
    refresh_token = create_refresh_token(data={"sub": user.correo_electronico, "role_id": user.id_rol})

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

def verify_email(db: Session, token: str) -> bool:
    db_token = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token == token,
        EmailVerificationToken.used == False
    ).first()

    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace de verificación es inválido o ya fue utilizado."
        )

    current_time = datetime.now(timezone.utc) if db_token.expires_at.tzinfo else datetime.now()
    if db_token.expires_at < current_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace de verificación ha expirado. Por favor, regístrate de nuevo."
        )

    user = db.query(Usuario).filter(Usuario.id_usuario == db_token.id_usuario).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El usuario asociado a este token no existe."
        )

    user.is_active = True
    db_token.used = True
    db.commit()
    return True


async def request_password_reset(db: Session, email: str) -> bool:
    user = db.query(Usuario).filter(Usuario.correo_electronico == email).first()
    if not user:
        return True

    token_str = str(uuid.uuid4())
    expiration = datetime.now(timezone.utc) + timedelta(hours=1)

    db_token = PasswordResetToken(
        id=str(uuid.uuid4()),
        id_usuario=user.id_usuario,
        token=token_str,
        expires_at=expiration,
        used=False
    )
    db.add(db_token)
    db.commit()

    try:
        await send_password_reset_email(email=user.correo_electronico, token=token_str)
    except Exception as email_err:
        print(f"Advertencia: No se pudo despachar el correo SMTP: {str(email_err)}")
    return True


def reset_password(db: Session, reset_data: ResetPasswordRequest) -> bool:
    db_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == reset_data.token,
        PasswordResetToken.used == False
    ).first()

    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El token es inválido o ya fue utilizado anteriormente."
        )

    current_time = datetime.now(timezone.utc) if db_token.expires_at.tzinfo else datetime.now()
    if db_token.expires_at < current_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El token de recuperación ha expirado. Solicita un nuevo correo."
        )

    user = db.query(Usuario).filter(Usuario.id_usuario == db_token.id_usuario).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El usuario asociado a este token no existe."
        )

    nueva_contrasenia = getattr(reset_data, 'password', getattr(reset_data, 'new_password', None))
    if not nueva_contrasenia:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña es totalmente obligatoria."
        )

    user.password = hash_password(nueva_contrasenia)
    db_token.used = True
    db.commit()
    return True

# 🛠️ FUNCIÓN RESCATADA PARA EVITAR EL CRASH DE IMPORTACIÓN
def update_user_locale(db: Session, user: Usuario, locale: str) -> Usuario:
    """
    Función mantenida exclusivamente para evitar el ImportError en routers/users.py.
    Como desactivamos el componente de idiomas, solo retorna el usuario de forma segura.
    """
    return user