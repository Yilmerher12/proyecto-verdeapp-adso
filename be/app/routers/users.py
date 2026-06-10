"""
Módulo: routers/users.py
Descripción: Endpoints de usuario — perfil del usuario autenticado y preferencias.
¿Para qué? Proveer endpoints para que el usuario autenticado consulte y gestione su perfil
           y preferencias de la aplicación (idioma, etc.).
¿Impacto? Sin este router, el frontend no podría mostrar los datos del usuario logueado
          (nombre, email, fecha de registro, etc.) ni persistir preferencias como el idioma.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models.usuario import Usuario
from app.models.residente import Residente
from app.models.reciclador import Reciclador
from app.schemas.user import UpdateLocaleRequest, UserResponse
from app.services.auth_service import update_user_locale

# ¿Qué? Router de FastAPI para endpoints de usuario.
# ¿Para qué? Agrupar endpoints relacionados con el perfil del usuario bajo /api/v1/users.
# ¿Impacto? Separar los endpoints de usuario de los de auth mantiene el código organizado
#           y facilita agregar más endpoints de usuario en el futuro (ej: update profile).
router = APIRouter(
    prefix="/api/v1/users",
    tags=["users"],
)

@router.get("/me", summary="Obtiene el perfil del usuario activo")
def read_users_me(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Retorna la información del usuario en sesión, inyectando su nombre 
    real desde la base de datos para que el Frontend lo muestre.
    """
    # 1. Definimos los nombres por defecto si algo falla
    real_first_name = "Administrador"
    real_last_name = "del Sistema"
    
    # 2. Consultamos la base de datos según el rol
    if current_user.id_rol == 2:  # Residente
        stmt = select(Residente).where(Residente.id_usuario == current_user.id_usuario)
        residente = db.execute(stmt).scalar_one_or_none()
        if residente:
            real_first_name = residente.nombre
            real_last_name = f"{residente.apellido_paterno} {residente.apellido_materno}".strip()
            
    elif current_user.id_rol == 3:  # Reciclador
        stmt = select(Reciclador).where(Reciclador.id_usuario == current_user.id_usuario)
        reciclador = db.execute(stmt).scalar_one_or_none()
        if reciclador:
            real_first_name = reciclador.nombre
            real_last_name = f"{reciclador.apellido_paterno} {reciclador.apellido_materno}".strip()

    # 3. Retornamos la respuesta al Frontend sobreescribiendo los valores
    return {
        "id": current_user.id_usuario,
        "email": current_user.correo_electronico,
        "role_id": current_user.id_rol,
        "first_name": real_first_name,
        "last_name": real_last_name,
        # Si tienes otras propiedades que enviar, ponlas aquí
    }

@router.patch(
    "/me/locale",
    response_model=UserResponse,
    summary="Actualizar idioma preferido del usuario (i18n)",
)
def update_locale(
    locale_data: UpdateLocaleRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    """Actualiza el locale (idioma preferido) del usuario autenticado.
    """
    updated_user = update_user_locale(db=db, user=current_user, locale=locale_data.locale)
    
    # Aplicamos el mismo mapeo manual para la respuesta de actualización
    return UserResponse(
        id=updated_user.id_usuario,
        email=updated_user.correo_electronico,
        role_id=updated_user.id_rol,
        is_active=updated_user.is_active,
        first_name="Usuario",
        last_name="VerdeApp",
        locale=locale_data.locale
    )