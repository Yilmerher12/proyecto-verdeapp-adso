"""
Módulo: routers/users.py
Descripción: Endpoints de usuario — perfil del usuario autenticado y preferencias.
¿Para qué? Issue #218 — este router solo recibe la petición HTTP y responde;
           las reglas de negocio reales viven en services/user_service.py.
"""
from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models.usuario import Usuario
from app.schemas.user import UpdateLocaleRequest, UpdateProfileBody, UserResponse
from app.services import user_service
from app.services.auth_service import update_user_locale

router = APIRouter(
    prefix="/api/v1/users",
    tags=["users"],
)


@router.get("/me", summary="Obtiene el perfil del usuario activo")
def read_users_me(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Retorna la información del usuario en sesión, realizando los cruces relacionales
    exactos en PostgreSQL para inyectar los datos reales del registro al Frontend.
    """
    return user_service.obtener_perfil(db, current_user)


@router.put("/me", summary="Actualizar nombre, apellidos, teléfono y asociación del usuario")
def update_profile(
    body: UpdateProfileBody,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_service.actualizar_perfil(db, current_user, body)
    return {"ok": True}


@router.post("/me/foto-perfil", status_code=201, summary="Subir o reemplazar la foto de perfil del usuario en sesión")
async def subir_foto_perfil(
    archivo: UploadFile,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    url = await user_service.subir_foto_perfil(db, current_user, archivo)
    return {"url": url}


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
    updated_user = update_user_locale(db=db, user=current_user, locale=locale_data.locale)

    return UserResponse(
        id=updated_user.id_usuario,
        email=updated_user.correo_electronico,
        role_id=updated_user.id_rol,
        is_active=updated_user.is_active,
        first_name="Usuario",
        last_name="VerdeApp",
        locale=updated_user.locale
    )
