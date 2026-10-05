"""
Módulo: services/auth_service.py
Descripción: Lógica de negocio de autenticación adaptada a las tablas en español de VerdeApp.
¿Para qué? Controlar el registro distribuido, inicio de sesión y emisión de tokens SMTP.
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.usuario import Usuario
from app.models.residente import Residente
from app.models.reciclador import Reciclador
from app.models.rol import RolId
from app.models.unidad import Unidad
from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.password_reset_token import PasswordResetToken
from app.models.email_verification_token import EmailVerificationToken
from app.models.token_revocado import TokenRevocado
from app.services.user_service import obtener_registro_de_perfil

from app.schemas.user import (
    ResetPasswordRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
)

from app.utils.email import (
    send_duplicate_registration_email,
    send_password_reset_email,
    send_verification_email,
)
from app.utils.audit_log import log_login_exitoso, log_login_fallido
from app.utils.security import (
    DUMMY_PASSWORD_HASH,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_token,
    verify_password,
)

logger = logging.getLogger(__name__)

# ¿Qué? RN-003 de RQF-001 / CA-001.5.
MAXIMO_INTENTOS_FALLIDOS = 5
MINUTOS_DE_BLOQUEO = 15

# ¿Qué? Issue #373 (CN-026): un solo mensaje para "contraseña incorrecta",
#       "correo inexistente" y "cuenta bloqueada".
# ¿Para qué? Que la respuesta no revele cuál de los tres pasó, pero el dueño
#           real de una cuenta bloqueada igual entienda que debe esperar.
MENSAJE_CREDENCIALES_INCORRECTAS = (
    f"Credenciales incorrectas. Si fallaste varias veces, espera {MINUTOS_DE_BLOQUEO} minutos e intenta de nuevo."
)


def _validar_datos_residente(db: Session, user_data: UserCreate) -> tuple[ConjuntoResidencial, str, str]:
    """Valida conjunto, código de acceso y unidad de un Residente; no guarda nada.

    ¿Qué? Issue #373 (CN-026): estas validaciones antes corrían DESPUÉS de
          revisar si el correo ya existía. Ahora corren antes, en todos los
          casos.
    ¿Para qué? Si un correo ya registrado saltara directo a la respuesta
              genérica sin pasar por aquí, un código de acceso malo daría
              "éxito" con un correo existente y error con uno nuevo — y esa
              diferencia volvería a revelar qué correos tienen cuenta.

    Returns:
        (conjunto, torre, apto) ya normalizados en mayúsculas.
    """
    # ¿Qué? Antes, si "torre"/"apto" llegaban vacíos (posible al llamar la
    #       API directo, sin pasar por el formulario de registro), quedaba
    #       guardado el texto literal "None" como si fuera un dato real.
    # ¿Para qué? En vez de inventar un dato de reemplazo, se rechaza el
    #           registro por completo — mismo criterio que para "conjunto
    #           residencial" y "código de acceso": si falta un dato real de
    #           dónde vive la persona, no hay registro.
    torre_texto = (user_data.torre or "").strip().upper()
    apto_texto = (user_data.apto or "").strip().upper()

    if not torre_texto or not apto_texto:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes indicar la torre/bloque y el apartamento donde vives.",
        )

    id_conjunto = user_data.id_conjunto_residencial

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

    # ¿Qué? Issue #168 — se exige el código de acceso que el Admin de
    #       Conjunto reparte fuera de la app, como prueba de que la persona
    #       vive ahí.
    # ¿Impacto? Comparación insensible a mayúsculas/espacios, mismo
    #           criterio que el resto de la app usa para nombres.
    codigo_ingresado = (user_data.codigo_acceso or "").strip().upper()
    if not codigo_ingresado:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes ingresar el código de acceso de tu conjunto.",
        )
    if codigo_ingresado != conjunto_existente.codigo_acceso:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código de acceso no es válido para este conjunto. Pídeselo a tu administrador.",
        )

    return conjunto_existente, torre_texto, apto_texto


def register_user(db: Session, user_data: UserCreate, background_tasks: BackgroundTasks) -> None:
    """Registra un usuario en estado INACTIVO, gestiona su perfil y emite el correo de activación.

    ¿Qué? Issue #373 (CN-026): termina igual (sin error) tanto si la cuenta
          se creó como si el correo ya tenía una. En el segundo caso no se
          crea nada y al dueño del correo le llega un aviso.
    ¿Para qué? Antes respondía "El correo ya está registrado.", y con eso
              cualquiera podía averiguar qué correos tienen cuenta en
              VerdeApp. El aviso por correo le sirve al dueño real (si fue
              él, sabe que ya tiene cuenta) sin decirle nada a quien no lo es.
    ¿Impacto? Los correos salen con BackgroundTasks, después de responder:
              los dos caminos tardan lo mismo y no se delatan por tiempo.
    """
    datos_residente = _validar_datos_residente(db, user_data) if user_data.rol == "residente" else None

    # ¿Qué? bcrypt corre en los dos caminos, aunque en el de correo
    #       duplicado el resultado no se use.
    # ¿Para qué? Es lo que más tarda de todo el registro (decenas de ms):
    #           si solo corriera al crear la cuenta, la respuesta rápida
    #           delataría que el correo ya existía.
    password_hasheada = hash_password(user_data.password)

    stmt = select(Usuario).where(Usuario.correo_electronico == user_data.correo_electronico)
    if db.execute(stmt).scalar_one_or_none():
        background_tasks.add_task(send_duplicate_registration_email, email=user_data.correo_electronico)
        return

    # Por ahora el registro público solo deja escoger entre residente y reciclador
    # (el rol de Administrador de Conjunto se crea aparte, por invitación).
    role_id_mapped = RolId.RESIDENTE if user_data.rol == "residente" else RolId.RECICLADOR

    try:
        nuevo_usuario = Usuario(
            correo_electronico=user_data.correo_electronico,
            id_rol=role_id_mapped,
            password=password_hasheada,
            is_active=False
        )
        db.add(nuevo_usuario)
        db.flush()

        if datos_residente:
            conjunto_existente, torre_texto, apto_texto = datos_residente
            id_conjunto = conjunto_existente.id_conjunto_residencial

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

        token_verificacion = str(uuid.uuid4())
        expiration_verif = datetime.now(timezone.utc) + timedelta(days=1)

        db_token_verif = EmailVerificationToken(
            # ¿Qué? Sin "id=" — el modelo ya genera un UUIDv4 por su cuenta.
            id_usuario=nuevo_usuario.id_usuario,
            # ¿Qué? Issue #373 (CN-031): se guarda el hash; el correo lleva el original.
            token=hash_token(token_verificacion),
            expires_at=expiration_verif,
            used=False
        )
        db.add(db_token_verif)

        # ¿Qué? Issue #215 — antes había un commit aquí y OTRO más abajo,
        #       separados. Si algo fallaba justo entre los dos (ej. se cae
        #       la conexión a la BD), el usuario y su perfil ya habían
        #       quedado guardados PARA SIEMPRE por el primer commit, pero
        #       sin su código de verificación — una cuenta fantasma:
        #       nunca se puede activar, y como el correo ya quedó
        #       registrado, tampoco se puede volver a intentar el registro.
        # ¿Para qué? Un solo commit al final garantiza que el usuario, su
        #           perfil (Residente/Reciclador) y el token de verificación
        #           se guardan TODOS juntos o NINGUNO — si algo falla antes
        #           de llegar aquí, el rollback del except de abajo deshace
        #           todo, sin dejar nada a medias.
        db.commit()

        # ¿Impacto? _enviar (app/utils/email.py) ya atrapa y registra
        #           cualquier fallo de envío: un correo caído no tumba el
        #           registro, que ya quedó guardado.
        background_tasks.add_task(
            send_verification_email, email=nuevo_usuario.correo_electronico, token=token_verificacion
        )

    except IntegrityError:
        # ¿Qué? Issue #215 (b9 del diagnóstico) — el pre-chequeo de arriba
        #       revisa si el correo ya existe ANTES de insertar, pero entre
        #       ese chequeo y el INSERT real puede colarse otra petición con
        #       el mismo correo (condición de carrera). Si eso pasa, el
        #       UNIQUE de correo_electronico en la base de datos es quien de
        #       verdad lo impide.
        # ¿Impacto? Issue #373: se trata igual que el pre-chequeo — aviso
        #           al dueño y la misma respuesta genérica de éxito.
        db.rollback()
        background_tasks.add_task(send_duplicate_registration_email, email=user_data.correo_electronico)
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
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
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
    # ¿Impacto? Issue #373 (CN-026): responde EXACTAMENTE lo mismo que una
    #           contraseña incorrecta (antes era un 403 con su propio
    #           mensaje, y con eso cualquiera sabía que el correo existía).
    #           El motivo real queda solo en el log de auditoría.
    if user and user.bloqueado_hasta and user.bloqueado_hasta > datetime.now(timezone.utc):
        # ¿Qué? Issue #215 (b8 del diagnóstico) — se corre verify_password()
        #       igual que en las otras ramas de rechazo de abajo, aunque acá
        #       el resultado no se use para nada.
        # ¿Para qué? Sin esto, esta rama respondería casi al instante y la
        #           diferencia de tiempo delataría la cuenta bloqueada,
        #           aunque el mensaje sea el mismo.
        verify_password(login_data.password, user.password)
        log_login_fallido(correo, "cuenta_bloqueada")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=MENSAJE_CREDENCIALES_INCORRECTAS)

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
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=MENSAJE_CREDENCIALES_INCORRECTAS)

    if not user.is_active:
        log_login_fallido(correo, "cuenta_no_verificada")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta no ha sido verificada aún. Por favor, revisa tu buzón en Mailpit."
        )

    # ¿Qué? "habilitado" es distinto de "is_active" (esa es solo verificación
    #       de correo) — revisa si un Administrador del Sistema desactivó
    #       esta cuenta después de ya estar verificada.
    # ¿Para qué? Sin este chequeo, una cuenta desactivada por un admin
    #           podría seguir iniciando sesión con total normalidad.
    if not user.habilitado:
        log_login_fallido(correo, "cuenta_desactivada")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta fue desactivada por un administrador.",
        )

    # ¿Qué? Un login exitoso limpia cualquier rastro de intentos fallidos
    #       previos — no tendría sentido seguir "contando" contra alguien
    #       que ya demostró que sí es el dueño de la cuenta.
    if user.intentos_fallidos or user.bloqueado_hasta:
        user.intentos_fallidos = 0
        user.bloqueado_hasta = None
        db.commit()

    log_login_exitoso(correo)
    return emitir_tokens(db, user)


def emitir_tokens(db: Session, user: Usuario) -> TokenResponse:
    """Emite un par access/refresh nuevo para el usuario.

    ¿Qué? Un solo lugar que arma los tokens — antes el mismo bloque estaba
          copiado en login_user y en refresh_access_token.
    ¿Para qué? Issue #308: todo token nuevo debe llevar "ver" (la
              version_sesion vigente). Con el bloque copiado, bastaba
              olvidarlo en un sitio para emitir tokens que nunca se
              invalidan al cambiar la contraseña.
    ¿Impacto? Lo usan login, /refresh y /change-password (este último para
              que quien cambia su contraseña no pierda su propia sesión).
    """
    real_first_name, real_last_name = obtener_nombre_real(db, user)
    datos_comunes = {
        "sub": user.correo_electronico,
        "role_id": user.id_rol,
        "ver": user.version_sesion,
    }
    access_token = create_access_token(data={
        **datos_comunes,
        "first_name": real_first_name,
        "last_name": real_last_name,
    })
    refresh_token = create_refresh_token(data=datos_comunes)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


def obtener_nombre_real(db: Session, user: Usuario):
    """Busca el nombre y apellidos reales del usuario según su rol.

    ¿Qué? Issue #220 (b13 del diagnóstico) — reutiliza
          user_service.obtener_registro_de_perfil en vez de repetir aquí
          la misma búsqueda "¿en qué tabla vive el perfil de este rol?".
    """
    registro = obtener_registro_de_perfil(db, user)
    if registro:
        return registro.nombre, registro.apellidos
    return "Administrador", "del Sistema"


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

    # ¿Qué? Mismo chequeo que en login() — evita renovar el access token de
    #       una cuenta que un Administrador del Sistema ya desactivó.
    if not user.habilitado:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta fue desactivada por un administrador.",
        )

    # ¿Qué? Issue #308: un refresh token emitido antes del último cambio de
    #       contraseña ya no sirve (ver Usuario.version_sesion).
    # ¿Impacto? Sin esto, quien robó la cookie podía seguir renovando la
    #           sesión hasta 7 días después de que la víctima cambiara su
    #           contraseña.
    if payload.get("ver", 0) != user.version_sesion:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token de sesión ha sido invalidado. Inicia sesión de nuevo.",
        )

    # ¿Qué? Issue #308: rotación — el refresh token que se acaba de usar
    #       pasa a la lista negra antes de emitir el par nuevo. Issue #359
    #       (CN-036): revocar_jti revisa y guarda en un solo paso, así que
    #       también cubre el caso de un token ya revocado por un logout.
    # ¿Para qué? Que cada refresh token sirva UNA sola vez, aunque lleguen
    #           dos /refresh con el mismo token al mismo tiempo (dos
    #           pestañas, o quien robó la cookie a la vez que la víctima):
    #           solo uno logra guardarlo y el otro recibe 401.
    # ¿Impacto? El frontend renueva solo desde el issue #319; para que dos
    #           pestañas no se choquen aquí, fe/src/api/axios.ts renueva de
    #           a una pestaña a la vez (navigator.locks).
    if not revocar_jti(db, payload["jti"], payload["exp"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token de sesión ha sido invalidado. Inicia sesión de nuevo.",
        )
    db.commit()

    return emitir_tokens(db, user)


def verify_email(db: Session, token: str) -> bool:
    db_token = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token == hash_token(token),
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


def request_password_reset(db: Session, email: str, background_tasks: BackgroundTasks) -> None:
    """Crea un token de recuperación y programa su correo, si el correo tiene cuenta.

    ¿Qué? Issue #373 (CN-027): el correo sale con BackgroundTasks, después
          de responder.
    ¿Para qué? Antes se esperaba a que el correo saliera (cientos de ms por
              SMTP) solo cuando la cuenta existía; si no existía se
              respondía al instante. Midiendo el tiempo se sabía qué
              correos tienen cuenta, aunque el mensaje fuera el mismo.
    """
    user = db.query(Usuario).filter(Usuario.correo_electronico == email).first()
    if not user:
        return

    token_str = str(uuid.uuid4())
    expiration = datetime.now(timezone.utc) + timedelta(hours=1)

    db_token = PasswordResetToken(
        # ¿Qué? Sin "id=" — el modelo ya genera un UUIDv4 por su cuenta.
        id_usuario=user.id_usuario,
        # ¿Qué? Issue #373 (CN-031): se guarda el hash; el correo lleva el original.
        token=hash_token(token_str),
        expires_at=expiration,
        used=False
    )
    db.add(db_token)
    db.commit()

    background_tasks.add_task(send_password_reset_email, email=user.correo_electronico, token=token_str)


def reset_password(db: Session, reset_data: ResetPasswordRequest) -> bool:
    db_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == hash_token(reset_data.token),
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
    # ¿Qué? Issue #308: invalida todas las sesiones abiertas de la cuenta.
    # ¿Para qué? Quien restablece su contraseña suele hacerlo porque
    #           sospecha que alguien más entró — esa otra sesión debe caer.
    user.version_sesion += 1
    db_token.used = True
    db.commit()
    return True


def logout_user(db: Session, access_token: str, refresh_token: str | None) -> None:
    """Invalida (revoca) el access token y el refresh token en uso.

    ¿Qué? HU-008/RQF-007 (RN-001): guarda el "jti" de cada token recibido en
          la lista negra (tokens_revocados) para que ningún request futuro
          vuelva a aceptarlos, aunque no hayan expirado todavía.
    ¿Para qué? Antes, "cerrar sesión" solo borraba los tokens del navegador
              (sessionStorage) — el token en sí seguía siendo 100% válido
              para el servidor durante toda su vida (15 min access, 7 días
              refresh) si alguien lo hubiera copiado antes.
    ¿Impacto? Un token ya expirado o inválido simplemente se ignora — no
              hay nada que revocar en ese caso. Uno ya revocado también:
              revocar_jti no lo guarda dos veces.

    Args:
        db: Sesión de base de datos.
        access_token: Access token JWT que estaba en uso (obligatorio).
        refresh_token: Refresh token JWT asociado a la misma sesión, si el
                       cliente lo envía.
    """
    for token in (access_token, refresh_token):
        if not token:
            continue

        payload = decode_token(token)
        if payload:
            revocar_jti(db, payload["jti"], payload["exp"])

    db.commit()


def revocar_jti(db: Session, jti: str, exp: int) -> bool:
    """Guarda el jti de un token en la lista negra (tokens_revocados).

    ¿Qué? Issue #359 (CN-036): revisa y guarda en UN solo paso con
          INSERT ... ON CONFLICT DO NOTHING — si el jti ya estaba, PostgreSQL
          no inserta nada y no devuelve ninguna fila.
    ¿Para qué? Antes era "preguntar si existe" y, más abajo, "guardarlo":
              dos /refresh simultáneos con el mismo token pasaban los dos la
              pregunta antes de que alguno lo guardara. Como jti es la llave
              primaria, la BD deja que solo uno de los dos lo inserte.
    ¿Impacto? No hace commit — lo decide quien la llama. decode_token ya
              garantiza que jti es un UUID válido y que exp existe.

    Returns:
        True si esta llamada lo revocó; False si ya estaba revocado.
    """
    stmt = (
        pg_insert(TokenRevocado)
        .values(jti=uuid.UUID(jti), expira_en=datetime.fromtimestamp(exp, tz=timezone.utc))
        .on_conflict_do_nothing(index_elements=[TokenRevocado.jti])
        .returning(TokenRevocado.jti)
    )
    return db.execute(stmt).scalar_one_or_none() is not None


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