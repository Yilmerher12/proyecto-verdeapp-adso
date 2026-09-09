"""
Módulo: routers/auth.py
"""
from fastapi import APIRouter, Depends, Request, Response, status, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.config import settings
from app.dependencies import get_current_user, get_db, http_bearer, obtener_token_de_la_peticion
from app.utils.limiter import limiter
from app.utils.security import hash_password, verify_password
from app.utils.audit_log import log_password_cambiada
from app.models.usuario import Usuario
from app.schemas.user import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LogoutRequest,
    MessageResponse,
    RefreshTokenRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
    VerifyEmailRequest,
)
from app.services import auth_service

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

# ¿Qué? Nombre y ruta de las dos cookies de sesión — un solo lugar para
#       no repetir el string en cada endpoint que las crea o las borra.
_COOKIE_ACCESS = "access_token"
_COOKIE_REFRESH = "refresh_token"
_COOKIE_PATH = "/"


def _fijar_cookies_de_sesion(response: Response, tokens: TokenResponse) -> None:
    """Guarda el access y el refresh token como cookies httpOnly en la respuesta.

    ¿Qué? RNF-001.9: en vez de devolver los tokens en el cuerpo JSON (donde
          cualquier script de la página podría leerlos), se mandan en la
          cabecera Set-Cookie con la marca httpOnly — el navegador los
          guarda solo, y ningún JavaScript, ni siquiera el de VerdeApp,
          puede acceder a su valor.
    ¿Para qué? Cerrar la puerta a que un ataque XSS (inyección de código
              malicioso en el frontend) se robe el token de sesión.
    ¿Impacto? "secure" solo se activa en producción — en desarrollo local
              la app corre sobre http:// sin TLS, y una cookie "Secure"
              jamás se envía por una conexión sin cifrar, lo que rompería
              el login en las máquinas del equipo. "samesite=strict" es la
              mitigación contra CSRF que reemplaza a la protección natural
              que daba el header Authorization (ver RNF-001.9): el
              navegador nunca manda esta cookie en una petición que se
              origine desde otro sitio.
    """
    secure = settings.ENVIRONMENT == "production"
    response.set_cookie(
        key=_COOKIE_ACCESS,
        value=tokens.access_token,
        httponly=True,
        secure=secure,
        samesite="strict",
        path=_COOKIE_PATH,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key=_COOKIE_REFRESH,
        value=tokens.refresh_token,
        httponly=True,
        secure=secure,
        samesite="strict",
        path=_COOKIE_PATH,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )


def _borrar_cookies_de_sesion(response: Response) -> None:
    """Le dice al navegador que elimine ambas cookies de sesión (logout)."""
    response.delete_cookie(_COOKIE_ACCESS, path=_COOKIE_PATH)
    response.delete_cookie(_COOKIE_REFRESH, path=_COOKIE_PATH)

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, user_data: UserCreate, db: Session = Depends(get_db)):
    user = await auth_service.register_user(db=db, user_data=user_data)
    return UserResponse(
        id=user.id_usuario, email=user.correo_electronico, role_id=user.id_rol,
        is_active=user.is_active, first_name="Usuario", last_name="VerdeApp", locale="es"
    )

@router.post("/login", response_model=MessageResponse)
@limiter.limit("10/minute")
def login(request: Request, response: Response, login_data: UserLogin, db: Session = Depends(get_db)):
    # ¿Qué? RNF-001.9: los tokens ya no viajan en el cuerpo de la respuesta
    #       — se guardan como cookies httpOnly, invisibles para JavaScript.
    # ¿Para qué? El frontend, justo después de este login, llama a
    #           GET /users/me (la cookie ya viaja sola) para obtener los
    #           datos del usuario — nunca necesitó leer el token en sí.
    tokens = auth_service.login_user(db=db, login_data=login_data)
    _fijar_cookies_de_sesion(response, tokens)
    return MessageResponse(message="Sesión iniciada correctamente")

@router.post("/refresh", response_model=MessageResponse)
def refresh_token(
    request: Request,
    response: Response,
    token_data: RefreshTokenRequest | None = None,
    db: Session = Depends(get_db),
):
    # ¿Qué? El refresh token real de VerdeApp llega por la cookie httpOnly;
    #       el cuerpo (token_data) queda como vía alterna para pruebas
    #       automáticas y herramientas externas, igual que el header
    #       Authorization en get_current_user.
    refresh_token_value = (
        token_data.refresh_token if token_data else None
    ) or request.cookies.get(_COOKIE_REFRESH)
    if not refresh_token_value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No hay una sesión activa para renovar. Inicia sesión de nuevo.",
        )
    tokens = auth_service.refresh_access_token(db=db, refresh_token=refresh_token_value)
    _fijar_cookies_de_sesion(response, tokens)
    return MessageResponse(message="Sesión renovada correctamente")

@router.post("/logout", response_model=MessageResponse)
def logout(
    request: Request,
    response: Response,
    logout_data: LogoutRequest | None = None,
    credentials: HTTPAuthorizationCredentials | None = Depends(http_bearer),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # ¿Qué? HU-008/RQF-007 (RN-001): logout real en el servidor, no solo en
    #       el navegador — revoca el access token y el refresh token de la
    #       misma sesión, y le pide al navegador que borre ambas cookies.
    # ¿Para qué? Depends(get_current_user) ya exige un access token válido
    #           y activo para poder llegar aquí — no tendría sentido dejar
    #           "cerrar sesión" a alguien que ni siquiera tiene una sesión
    #           vigente. Ese mismo Depends ya validó el token (cookie o
    #           header), así que aquí solo hace falta recuperar su valor
    #           crudo para poder revocarlo por su "jti".
    # ¿Impacto? current_user no se usa directamente más allá de obligar a
    #           que el token sea válido antes de revocarlo.
    # ¿Qué? Depends(get_current_user) ya exigió y validó un token antes de
    #       llegar aquí, así que access_token_value nunca debería ser None
    #       — pero se revisa igual en vez de forzar el tipo con un "cast",
    #       por si algún día cambia el orden de las dependencias.
    access_token_value = obtener_token_de_la_peticion(request, credentials)
    if not access_token_value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se pudo identificar la sesión a cerrar.",
        )
    refresh_token_value = (
        logout_data.refresh_token if logout_data else None
    ) or request.cookies.get(_COOKIE_REFRESH)

    auth_service.logout_user(
        db=db,
        access_token=access_token_value,
        refresh_token=refresh_token_value,
    )
    _borrar_cookies_de_sesion(response)
    return MessageResponse(message="Sesión cerrada correctamente")

@router.post("/change-password", response_model=MessageResponse)
def change_password(
    password_data: ChangePasswordRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # ¿Qué? Antes esta función llamaba a bcrypt directamente, en vez de usar
    #       hash_password()/verify_password() de app/utils/security.py — el
    #       mismo hashing terminaba con dos implementaciones distintas en el
    #       proyecto. Unificado para que solo exista un lugar que sabe cómo
    #       se hashean las contraseñas (ver patrones-arquitectonicos.md).
    if not verify_password(password_data.current_password, current_user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual ingresada es incorrecta."
        )

    current_user.password = hash_password(password_data.new_password)
    db.commit()

    log_password_cambiada(current_user.correo_electronico)
    return MessageResponse(message="Contraseña actualizada exitosamente")

@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit("5/minute")
async def forgot_password(request: Request, request_data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    await auth_service.request_password_reset(db=db, email=request_data.email)
    return MessageResponse(message="Si el email está registrado, recibirás un enlace de recuperación")

@router.post("/reset-password", response_model=MessageResponse)
def reset_password(reset_data: ResetPasswordRequest, db: Session = Depends(get_db)):
    auth_service.reset_password(db=db, reset_data=reset_data)
    return MessageResponse(message="Contraseña restablecida exitosamente")

@router.post("/verify-email", response_model=MessageResponse)
def verify_email(request_data: VerifyEmailRequest, db: Session = Depends(get_db)):
    auth_service.verify_email(db=db, token=request_data.token)
    return MessageResponse(message="Email verificado exitosamente. Ya puedes iniciar sesión.")