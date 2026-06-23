"""
Módulo: routers/admin_conjunto.py
Descripción: Endpoints del flujo de invitación de Administradores de Conjunto.
¿Para qué? Dos rutas separadas, con permisos distintos:
           - POST /invitar      -> SOLO el Administrador del Sistema (id_rol=1).
           - GET  /invitacion    -> pública (la persona invitada todavía no tiene cuenta).
           - POST /aceptar       -> pública, pero requiere un token de invitación válido.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models.usuario import Usuario
from app.schemas.admin_conjunto import (
    AceptarInvitacionAdminConjuntoRequest,
    InvitacionInfoResponse,
    InvitarAdminConjuntoRequest,
)
from app.schemas.user import MessageResponse, TokenResponse
from app.services import admin_conjunto_service
from app.utils.security import create_access_token, create_refresh_token

router = APIRouter(prefix="/api/v1/admin-conjunto", tags=["admin-conjunto"])


# ¿Qué? Solo el Administrador del Sistema (id_rol = 1) puede invitar.
# ¿Para qué? Esto es lo que evita que cualquiera se autoasigne el rol
#           de Administrador de Conjunto.
def _verificar_es_admin_sistema(current_user: Usuario) -> None:
    if current_user.id_rol != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un Administrador del Sistema puede invitar administradores de conjunto.",
        )


@router.post("/invitar", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def invitar_admin_conjunto(
    datos: InvitarAdminConjuntoRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Solo el Administrador del Sistema puede usar esta ruta."""
    _verificar_es_admin_sistema(current_user)
    await admin_conjunto_service.invitar_admin_conjunto(
        db=db, datos=datos, invitado_por=current_user
    )
    return MessageResponse(
        message=f"Invitación enviada a {datos.correo_electronico}."
    )


@router.get("/invitacion", response_model=InvitacionInfoResponse)
def consultar_invitacion(token: str, db: Session = Depends(get_db)):
    """
    Ruta pública: la persona invitada todavía no tiene cuenta, así que
    no puede autenticarse. Solo necesita el token que recibió por correo.
    """
    return admin_conjunto_service.consultar_invitacion(db=db, token=token)


@router.post("/aceptar", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def aceptar_invitacion(
    datos: AceptarInvitacionAdminConjuntoRequest,
    db: Session = Depends(get_db),
):
    """
    Ruta pública protegida por el token de invitación (no por sesión,
    porque la persona todavía no tiene cuenta). Al aceptar, se crea su
    cuenta y se le entrega sesión iniciada de una vez (igual de cómodo
    que registrarse normalmente).
    """
    nuevo_usuario = admin_conjunto_service.aceptar_invitacion(db=db, datos=datos)

    access_token = create_access_token(data={
        "sub": nuevo_usuario.correo_electronico,
        "role_id": nuevo_usuario.id_rol,
    })
    refresh_token = create_refresh_token(data={
        "sub": nuevo_usuario.correo_electronico,
        "role_id": nuevo_usuario.id_rol,
    })

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)