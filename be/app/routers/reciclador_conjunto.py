"""
Módulo: routers/reciclador_conjunto.py
Descripción: Endpoints del flujo de invitación Reciclador-Conjunto.
¿Para qué? Exponer la lógica de invitar, listar, aceptar/rechazar y consultar
           conjuntos autorizados, vía HTTP, protegidos por rol.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.dependencies import get_db, get_current_user
from app.models.usuario import Usuario
from app.schemas.reciclador_conjunto import (
    InvitarRecicladorRequest,
    InvitacionRecicladorResponse,
    InvitacionPendienteRecicladorResponse,
    ResponderInvitacionRequest,
    ConjuntoAutorizadoResponse,
)
from app.services import reciclador_conjunto_service

router = APIRouter(
    prefix="/api/v1/reciclador-conjunto",
    tags=["Reciclador - Conjunto"],
)


@router.post("/invitar", status_code=status.HTTP_201_CREATED, summary="Admin de Conjunto invita a un Reciclador")
async def invitar_reciclador(
    data: InvitarRecicladorRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """¿Qué? Solo accesible por Admin de Conjunto (id_rol=4) — la validación
    de que administra ESE conjunto específico vive en el service."""
    invitacion = await reciclador_conjunto_service.invitar_reciclador(
        db=db,
        id_usuario_admin=current_user.id_usuario,
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
    id_conjunto: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resultados = reciclador_conjunto_service.listar_invitaciones_de_mi_conjunto(
        db=db, id_usuario_admin=current_user.id_usuario, id_conjunto=id_conjunto
    )
    return resultados


@router.get(
    "/mis-invitaciones",
    response_model=List[InvitacionPendienteRecicladorResponse],
    summary="Reciclador ve sus invitaciones pendientes",
)
def listar_mis_invitaciones(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resultados = reciclador_conjunto_service.listar_invitaciones_pendientes_del_reciclador(
        db=db, id_usuario_reciclador=current_user.id_usuario
    )
    return resultados


@router.post("/invitaciones/{id_invitacion}/responder", summary="Reciclador acepta o rechaza una invitación")
def responder_invitacion(
    id_invitacion: str,
    data: ResponderInvitacionRequest,
    current_user: Usuario = Depends(get_current_user),
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


@router.get(
    "/mis-conjuntos-autorizados",
    response_model=List[ConjuntoAutorizadoResponse],
    summary="Reciclador ve los conjuntos donde ya está autorizado",
)
def listar_mis_conjuntos_autorizados(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resultados = reciclador_conjunto_service.listar_conjuntos_autorizados(
        db=db, id_usuario_reciclador=current_user.id_usuario
    )
    return resultados