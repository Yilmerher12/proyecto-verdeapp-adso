"""
Módulo: routers/reciclador_conjunto.py
Descripción: Endpoints del flujo de invitación Reciclador-Conjunto.
¿Para qué? Exponer la lógica de invitar, listar, aceptar/rechazar y consultar
           conjuntos autorizados, vía HTTP, protegidos por rol.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.dependencies import get_db, require_admin_conjunto, require_role
from app.models.administrador_conjunto import AdministradorConjunto
from app.models.rol import RolId
from app.models.usuario import Usuario
from app.schemas.reciclador_conjunto import (
    InvitarRecicladorRequest,
    InvitacionRecicladorResponse,
    InvitacionPendienteRecicladorResponse,
    ResponderInvitacionRequest,
    ConjuntoAutorizadoResponse,
    RecicladorAutorizadoResponse,
)
from app.services import reciclador_conjunto_service

router = APIRouter(
    prefix="/api/v1/reciclador-conjunto",
    tags=["Reciclador - Conjunto"],
)

# ¿Qué? Issue #4 (hallazgo B5 de la auditoría) — antes todos los endpoints
#       usaban Depends(get_current_user) genérico y el chequeo de rol vivía
#       reimplementado a mano en el service (_verificar_admin_administra_
#       conjunto), con un 404 "Perfil no encontrado" en vez del 403
#       uniforme que ya dan estas dependencias compartidas (issue #216).
_requiere_admin_conjunto = require_admin_conjunto("Solo un Administrador de Conjunto puede hacer esto.")
_requiere_reciclador = require_role(RolId.RECICLADOR, "Solo un Reciclador puede hacer esto.")


@router.post("/invitar", status_code=status.HTTP_201_CREATED, summary="Admin de Conjunto invita a un Reciclador")
async def invitar_reciclador(
    data: InvitarRecicladorRequest,
    administrador: AdministradorConjunto = Depends(_requiere_admin_conjunto),
    db: Session = Depends(get_db),
):
    """¿Qué? Solo accesible por Admin de Conjunto — la validación de que
    administra ESE conjunto específico vive en el service."""
    invitacion = await reciclador_conjunto_service.invitar_reciclador(
        db=db,
        id_usuario_admin=administrador.id_usuario,
        correo_reciclador=data.correo_reciclador,
        id_conjunto=data.id_conjunto_residencial,
    )
    return {"id": invitacion.id, "estado": invitacion.estado, "message": "Invitación enviada correctamente."}


@router.get(
    "/mi-conjunto/{id_conjunto}/invitaciones",
    response_model=List[InvitacionRecicladorResponse],
    summary="Admin de Conjunto ve las invitaciones que ha enviado",
)
def listar_invitaciones_de_mi_conjunto(
    id_conjunto: UUID,
    administrador: AdministradorConjunto = Depends(_requiere_admin_conjunto),
    db: Session = Depends(get_db),
):
    resultados = reciclador_conjunto_service.listar_invitaciones_de_mi_conjunto(
        db=db, id_usuario_admin=administrador.id_usuario, id_conjunto=id_conjunto
    )
    return resultados


@router.get(
    "/mi-conjunto/{id_conjunto}/autorizados",
    response_model=List[RecicladorAutorizadoResponse],
    summary="Admin de Conjunto ve los recicladores YA autorizados en su conjunto",
)
def listar_recicladores_autorizados(
    id_conjunto: UUID,
    administrador: AdministradorConjunto = Depends(_requiere_admin_conjunto),
    db: Session = Depends(get_db),
):
    resultados = reciclador_conjunto_service.listar_recicladores_autorizados_de_conjunto(
        db=db, id_usuario_admin=administrador.id_usuario, id_conjunto=id_conjunto
    )
    return resultados


@router.get(
    "/mis-invitaciones",
    response_model=List[InvitacionPendienteRecicladorResponse],
    summary="Reciclador ve sus invitaciones pendientes",
)
def listar_mis_invitaciones(
    current_user: Usuario = Depends(_requiere_reciclador),
    db: Session = Depends(get_db),
):
    resultados = reciclador_conjunto_service.listar_invitaciones_pendientes_del_reciclador(
        db=db, id_usuario_reciclador=current_user.id_usuario
    )
    return resultados


@router.post("/invitaciones/{id_invitacion}/responder", summary="Reciclador acepta o rechaza una invitación")
def responder_invitacion(
    id_invitacion: UUID,
    data: ResponderInvitacionRequest,
    current_user: Usuario = Depends(_requiere_reciclador),
    db: Session = Depends(get_db),
):
    reciclador_conjunto_service.responder_invitacion(
        db=db,
        id_usuario_reciclador=current_user.id_usuario,
        id_invitacion=id_invitacion,
        aceptar=data.aceptar,
    )
    mensaje = "Invitación aceptada. Ya estás autorizado en ese conjunto." if data.aceptar else "Invitación rechazada."
    return {"message": mensaje}


@router.delete(
    "/mi-conjunto/{id_conjunto}/autorizados/{id_reciclador}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Admin de Conjunto revoca el acceso de un Reciclador ya autorizado",
)
def revocar_reciclador(
    id_conjunto: UUID,
    id_reciclador: UUID,
    administrador: AdministradorConjunto = Depends(_requiere_admin_conjunto),
    db: Session = Depends(get_db),
):
    reciclador_conjunto_service.revocar_reciclador(
        db=db,
        id_usuario_admin=administrador.id_usuario,
        id_conjunto=id_conjunto,
        id_reciclador=id_reciclador,
    )


@router.get(
    "/mis-conjuntos-autorizados",
    response_model=List[ConjuntoAutorizadoResponse],
    summary="Reciclador ve los conjuntos donde ya está autorizado",
)
def listar_mis_conjuntos_autorizados(
    current_user: Usuario = Depends(_requiere_reciclador),
    db: Session = Depends(get_db),
):
    resultados = reciclador_conjunto_service.listar_conjuntos_autorizados(
        db=db, id_usuario_reciclador=current_user.id_usuario
    )
    return resultados