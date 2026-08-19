"""
Módulo: routers/admin_conjunto.py
Descripción: Endpoints del flujo de invitación, desvinculación y reasignación de Administradores de Conjunto.
¿Para qué? Rutas con permisos distintos:
           - POST /invitar      -> SOLO el Administrador del Sistema (id_rol=1).
           - GET  /invitacion    -> pública (la persona invitada todavía no tiene cuenta).
           - POST /aceptar       -> pública, pero requiere un token de invitación válido.
           - El resto (solicitudes de desvinculación, buscar/asignar) -> SOLO el Administrador del Sistema (RQF-016).
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models.usuario import Usuario
from app.models.rol import RolId
from app.schemas.admin_conjunto import (
    AceptarInvitacionAdminConjuntoRequest,
    InvitacionInfoResponse,
    InvitarAdminConjuntoRequest,
)
from app.schemas.desvinculacion import (
    AdministradorConjuntoResumenResponse,
    AsignarConjuntoAdicionalRequest,
    ResolverSolicitudDesvinculacionRequest,
    SolicitudDesvinculacionResponse,
)
from app.schemas.user import MessageResponse, TokenResponse
from app.services import admin_conjunto_service, desvinculacion_service
from app.utils.security import create_access_token, create_refresh_token

router = APIRouter(prefix="/api/v1/admin-conjunto", tags=["admin-conjunto"])


# Solo el Administrador del Sistema puede invitar — esto evita que cualquiera
# se autoasigne el rol de Administrador de Conjunto.
def _verificar_es_admin_sistema(current_user: Usuario) -> None:
    if current_user.id_rol != RolId.ADMIN_SISTEMA:
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


@router.get("/solicitudes-desvinculacion", response_model=List[SolicitudDesvinculacionResponse])
def listar_solicitudes_desvinculacion(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """RQF-016 / HU-023 (CA-023.1): solicitudes de desvinculación pendientes de resolver."""
    _verificar_es_admin_sistema(current_user)
    return desvinculacion_service.listar_solicitudes_pendientes(db)


@router.post("/solicitudes-desvinculacion/{id_solicitud}/resolver", response_model=MessageResponse)
def resolver_solicitud_desvinculacion(
    id_solicitud: int,
    datos: ResolverSolicitudDesvinculacionRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """RQF-016 / HU-023 (CA-023.2, CA-023.3): aprueba o rechaza una solicitud de desvinculación."""
    _verificar_es_admin_sistema(current_user)
    desvinculacion_service.resolver_solicitud(
        db=db,
        id_solicitud=id_solicitud,
        aprobar=datos.aprobar,
        motivo_rechazo=datos.motivo_rechazo,
        resuelta_por=current_user,
    )
    mensaje = "Solicitud aprobada. El conjunto quedó desvinculado." if datos.aprobar else "Solicitud rechazada."
    return MessageResponse(message=mensaje)


@router.get("/listar", response_model=List[AdministradorConjuntoResumenResponse])
def listar_administradores_conjunto(
    query: Optional[str] = None,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """RQF-016 / HU-024 (CA-024.1): busca Administradores de Conjunto ya existentes, por nombre/apellidos/correo."""
    _verificar_es_admin_sistema(current_user)
    return desvinculacion_service.buscar_administradores(db, query)


@router.post("/asignar-conjunto-adicional", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def asignar_conjunto_adicional(
    datos: AsignarConjuntoAdicionalRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """RQF-016 / HU-024 (CA-024.2, CA-024.3): vincula un conjunto sin administrador a un Admin Conjunto existente."""
    _verificar_es_admin_sistema(current_user)
    desvinculacion_service.asignar_conjunto_adicional(
        db=db,
        id_administrador=datos.id_administrador,
        id_conjunto=datos.id_conjunto_residencial,
    )
    return MessageResponse(message="Conjunto asignado correctamente.")