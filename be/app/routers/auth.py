"""
Módulo: routers/auth.py
"""
from fastapi import APIRouter, Depends, Request, status, HTTPException
from sqlalchemy.orm import Session
import bcrypt

from app.dependencies import get_current_user, get_db
from app.utils.limiter import limiter
from app.models.usuario import Usuario
from app.schemas.user import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
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

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, user_data: UserCreate, db: Session = Depends(get_db)):
    user = await auth_service.register_user(db=db, user_data=user_data)
    return UserResponse(
        id=user.id_usuario, email=user.correo_electronico, role_id=user.id_rol,
        is_active=user.is_active, first_name="Usuario", last_name="VerdeApp", locale="es"
    )

@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, login_data: UserLogin, db: Session = Depends(get_db)):
    return auth_service.login_user(db=db, login_data=login_data)

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(token_data: RefreshTokenRequest, db: Session = Depends(get_db)):
    return auth_service.refresh_access_token(db=db, refresh_token=token_data.refresh_token)

@router.post("/change-password", response_model=MessageResponse)
def change_password(
    password_data: ChangePasswordRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 🛠️ CORRECCIÓN: Leemos "current_user.password" en lugar de password_hash
    hashed_db = current_user.password
    if isinstance(hashed_db, str):
        hashed_db = hashed_db.encode('utf-8')

    password_bytes = password_data.current_password.encode('utf-8')
    if not bcrypt.checkpw(password_bytes, hashed_db):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual ingresada es incorrecta."
        )

    new_password_bytes = password_data.new_password.encode('utf-8')
    salt = bcrypt.gensalt(12)
    new_hash = bcrypt.hashpw(new_password_bytes, salt).decode('utf-8')

    current_user.password = new_hash
    db.commit()

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