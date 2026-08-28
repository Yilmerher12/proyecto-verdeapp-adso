"""
Módulo: services/auth_service.py
Descripción: Lógica de negocio de autenticación adaptada a las tablas en español de VerdeApp.
¿Para qué? Controlar el registro distribuido, inicio de sesión y emisión de tokens SMTP.
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.usuario import Usuario
from app.models.residente import Residente
from app.models.reciclador import Reciclador
from app.models.rol import RolId
from app.models.unidad import Unidad
from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.password_reset_token import PasswordResetToken
from app.models.email_verification_token import EmailVerificationToken

from app.schemas.user import (
    ResetPasswordRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
)

from app.utils.email import send_password_reset_email, send_verification_email
from app.utils.audit_log import log_login_exitoso, log_login_fallido
from app.utils.security import (
    DUMMY_PASSWORD_HASH,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

logger = logging.getLogger(__name__)

# ¿Qué? RN-003 de RQF-001 / CA-001.5.
MAXIMO_INTENTOS_FALLIDOS = 5
MINUTOS_DE_BLOQUEO = 15


async def register_user(db: Session, user_data: UserCreate) -> Usuario:
    """Registra un usuario en estado INACTIVO, gestiona su perfil y emite el correo de activación."""
    stmt = select(Usuario).where(Usuario.correo_electronico == user_data.correo_electronico)
    existing_user = db.execute(stmt).scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo ya está registrado.",
        )

    # Por ahora el registro público solo deja escoger entre residente y reciclador
    # (el rol de Administrador de Conjunto se crea aparte, por invitación).
    role_id_mapped = RolId.RESIDENTE if user_data.rol == "residente" else RolId.RECICLADOR

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
                    detail="Debes seleccionar el conjunto residencial al que perteneces."
                )

            stmt_conjunto = select(ConjuntoResidencial).where(
                ConjuntoResidencial.id_conjunto_residencial == id_conjunto,
                ConjuntoResidencial.verificado.is_(True),
            )
            conjunto_existente = db.execute(stmt_conjunto).scalar_one_or_none()

            if not conjunto_existente:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Tu conjunto residencial aún no está afiliado a VerdeApp. "
                        "Pide a tu administración que se registre con nosotros."
                    ),
                )

            stmt_unidad = select(Unidad).where(
                Unidad.id_conjunto_residencial == id_conjunto,
                Unidad.torre == torre_texto,
                Unidad.apto == apto_texto
            )
            unidad_existente = db.execute(stmt_unidad).scalar_one_or_none()

            if unidad_existente:
                id_unidad_final = unidad_existente.id_unidad
            else:
                nueva_unidad = Unidad(
                    id_conjunto_residencial=id_conjunto,
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
                apellidos=user_data.apellidos.strip().upper(),
                numero_telefonico=user_data.numero_telefonico,
            )
            db.add(nuevo_residente)

        elif user_data.rol == "reciclador":
            nuevo_reciclador = Reciclador(
                id_usuario=nuevo_usuario.id_usuario,
                localidad_id=user_data.localidad_id,
                nombre=user_data.nombre.strip().upper(),
                apellidos=user_data.apellidos.strip().upper(),
                numero_telefonico=user_data.numero_telefonico,
                asociacion=user_data.asociacion.strip().upper() if user_data.asociacion else "INDEPENDIENTE",
            )
            db.add(nuevo_reciclador)

        db.commit()

        token_verificacion = str(uuid.uuid4())
        expiration_verif = datetime.now(timezone.utc) + timedelta(days=1)

        db_token_verif = EmailVerificationToken(
            # ¿Qué? Sin "id=" — el modelo ya genera un UUIDv7 por su cuenta.
            id_usuario=nuevo_usuario.id_usuario,
            token=token_verificacion,
            expires_at=expiration_verif,
            used=False
        )
        db.add(db_token_verif)
        db.commit()

        try:
            await send_verification_email(email=nuevo_usuario.correo_electronico, token=token_verificacion)
        except Exception:
            logger.warning("Registro completado, pero el correo no se pudo despachar", exc_info=True)

        db.refresh(nuevo_usuario)
        return nuevo_usuario

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        # ¿Qué? Antes el detail del 500 incluía str(e) — el mensaje crudo de
        #       la excepción (puede traer nombres de columnas, constraints o
        #       hasta fragmentos de la consulta SQL de Postgres).
        # ¿Para qué? Ese detalle interno no le sirve al usuario para nada, y
        #           sí le sirve a alguien buscando cómo está armada la BD.
        # ¿Impacto? El error real se guarda en el log del servidor
        #           (logger.exception incluye el traceback completo) — quien
        #           necesite diagnosticar el problema lo revisa ahí, no en la
        #           respuesta HTTP.
        db.rollback()
        logger.exception("Error al registrar usuario")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ocurrió un error al guardar los datos. Intenta de nuevo más tarde."
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

    # ¿Qué? RN-003 de RQF-001 / CA-001.5: si la cuenta ya está bloqueada por
    #       demasiados intentos fallidos recientes, se rechaza antes de
    #       siquiera revisar la contraseña.
    # ¿Para qué? Antes de esto, un atacante podía probar contraseñas contra
    #           un correo específico sin ningún límite por cuenta — el
    #           rate limit de slowapi es por dirección IP, no por correo.
    # ¿Impacto? Esta respuesta SÍ revela que la cuenta existe (una cuenta
    #           inexistente nunca llega aquí, porque `user` sería None) —
    #           es un trade-off conocido e inevitable de cualquier bloqueo
    #           por cuenta, y es exactamente el comportamiento que pide
    #           RQF-001.
    if user and user.bloqueado_hasta and user.bloqueado_hasta > datetime.now(timezone.utc):
        log_login_fallido(correo, "cuenta_bloqueada")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Demasiados intentos fallidos. Intenta de nuevo en {MINUTOS_DE_BLOQUEO} minutos.",
        )

    # ¿Qué? Se corre verify_password() SIEMPRE, incluso si el usuario no
    #       existe — contra el hash real si existe, o contra DUMMY_PASSWORD_HASH
    #       si no. Mitiga un ataque de temporización (OWASP A07): ver el
    #       comentario de DUMMY_PASSWORD_HASH en app/utils/security.py.
    password_hash = user.password if user else DUMMY_PASSWORD_HASH
    if not user or not verify_password(login_data.password, password_hash):
        if user:
            user.intentos_fallidos += 1
            if user.intentos_fallidos >= MAXIMO_INTENTOS_FALLIDOS:
                user.bloqueado_hasta = datetime.now(timezone.utc) + timedelta(minutes=MINUTOS_DE_BLOQUEO)
            db.commit()
        log_login_fallido(correo, "credenciales_invalidas")
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    if not user.is_active:
        log_login_fallido(correo, "cuenta_no_verificada")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta no ha sido verificada aún. Por favor, revisa tu buzón en Mailpit."
        )

    # ¿Qué? Un login exitoso limpia cualquier rastro de intentos fallidos
    #       previos — no tendría sentido seguir "contando" contra alguien
    #       que ya demostró que sí es el dueño de la cuenta.
    if user.intentos_fallidos or user.bloqueado_hasta:
        user.intentos_fallidos = 0
        user.bloqueado_hasta = None
        db.commit()

    log_login_exitoso(correo)
    real_first_name, real_last_name = _obtener_nombre_real(db, user)

    access_token = create_access_token(data={
        "sub": user.correo_electronico,
        "role_id": user.id_rol,
        "first_name": real_first_name,
        "last_name": real_last_name
    })
    refresh_token = create_refresh_token(data={"sub": user.correo_electronico, "role_id": user.id_rol})

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


def _obtener_nombre_real(db: Session, user: Usuario):
    """Busca el nombre y apellidos reales del usuario según su rol."""
    real_first_name = "Administrador"
    real_last_name = "del Sistema"

    if user.id_rol == RolId.RESIDENTE:
        stmt_res = select(Residente).where(Residente.id_usuario == user.id_usuario)
        residente = db.execute(stmt_res).scalar_one_or_none()
        if residente:
            real_first_name = residente.nombre
            real_last_name = residente.apellidos

    elif user.id_rol == RolId.RECICLADOR:
        stmt_rec = select(Reciclador).where(Reciclador.id_usuario == user.id_usuario)
        reciclador = db.execute(stmt_rec).scalar_one_or_none()
        if reciclador:
            real_first_name = reciclador.nombre
            real_last_name = reciclador.apellidos

    elif user.id_rol == RolId.ADMIN_CONJUNTO:
        from app.models.administrador_conjunto import AdministradorConjunto
        stmt_admin = select(AdministradorConjunto).where(AdministradorConjunto.id_usuario == user.id_usuario)
        administrador = db.execute(stmt_admin).scalar_one_or_none()
        if administrador:
            real_first_name = administrador.nombre
            real_last_name = administrador.apellidos

    return real_first_name, real_last_name


def refresh_access_token(db: Session, refresh_token: str) -> TokenResponse:
    """Recibe un refresh token y, si es válido, entrega un access token nuevo."""
    payload = decode_token(refresh_token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token de sesión es inválido o ha expirado. Inicia sesión de nuevo.",
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token proporcionado no es un token de renovación válido.",
        )

    correo = payload.get("sub")
    if not correo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token de sesión es inválido.",
        )

    stmt = select(Usuario).where(Usuario.correo_electronico == correo)
    user = db.execute(stmt).scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El usuario asociado a este token ya no existe.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta no está activa. Verifica tu correo o contacta soporte.",
        )

    real_first_name, real_last_name = _obtener_nombre_real(db, user)

    nuevo_access_token = create_access_token(data={
        "sub": user.correo_electronico,
        "role_id": user.id_rol,
        "first_name": real_first_name,
        "last_name": real_last_name,
    })
    nuevo_refresh_token = create_refresh_token(data={
        "sub": user.correo_electronico,
        "role_id": user.id_rol,
    })

    return TokenResponse(access_token=nuevo_access_token, refresh_token=nuevo_refresh_token)


def verify_email(db: Session, token: str) -> bool:
    db_token = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token == token,
        EmailVerificationToken.used.is_(False)
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
        # ¿Qué? Sin "id=" — el modelo ya genera un UUIDv7 por su cuenta.
        id_usuario=user.id_usuario,
        token=token_str,
        expires_at=expiration,
        used=False
    )
    db.add(db_token)
    db.commit()

    try:
        await send_password_reset_email(email=user.correo_electronico, token=token_str)
    except Exception:
        logger.warning("No se pudo despachar el correo SMTP de recuperación", exc_info=True)
    return True


def reset_password(db: Session, reset_data: ResetPasswordRequest) -> bool:
    db_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == reset_data.token,
        PasswordResetToken.used.is_(False)
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


def update_user_locale(db: Session, user: Usuario, locale: str) -> Usuario:
    """
    ¿Qué? Guarda el idioma preferido del usuario en su cuenta.
    ¿Para qué? Que la preferencia lo siga entre dispositivos, no solo en el
              navegador donde la eligió (RQF-017).
    ¿Impacto? El validador de UpdateLocaleRequest ya garantiza que locale sea
              "es" o "en" antes de llegar aquí.
    """
    user.locale = locale
    db.commit()
    db.refresh(user)
    return user