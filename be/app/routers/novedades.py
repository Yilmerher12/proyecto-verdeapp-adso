"""
Módulo: routers/novedades.py
Descripción: Endpoints de novedades generales de la plataforma (RQF-015).
¿Para qué? Dos grupos de rutas, con permisos distintos:
           - POST/PATCH/archivar y /todas -> SOLO Administrador del Sistema.
           - GET /feed -> Residente, Reciclador o Admin de Conjunto (ven, no publican).
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models.rol import RolId
from app.models.usuario import Usuario
from app.schemas.novedad import CrearNovedadRequest, EditarNovedadRequest, NovedadResponse
from app.schemas.user import MessageResponse
from app.services import novedad_service

router = APIRouter(prefix="/api/v1/novedades", tags=["novedades"])


def _verificar_es_admin_sistema(current_user: Usuario) -> None:
    if current_user.id_rol != RolId.ADMIN_SISTEMA:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un Administrador del Sistema puede gestionar novedades.",
        )


@router.post("", response_model=NovedadResponse, status_code=status.HTTP_201_CREATED)
def crear_novedad(
    datos: CrearNovedadRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """RQF-015 / HU-032: publica una novedad nueva para el alcance elegido."""
    _verificar_es_admin_sistema(current_user)
    return novedad_service.crear_novedad(db, current_user, datos)


@router.get("/todas", response_model=List[NovedadResponse])
def listar_todas(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """CA-035.4: historial completo — activas y archivadas."""
    _verificar_es_admin_sistema(current_user)
    return novedad_service.listar_todas(db)


@router.patch("/{id_novedad}", response_model=NovedadResponse)
def editar_novedad(
    id_novedad: int,
    datos: EditarNovedadRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """RQF-015 / HU-034: edita texto, adjunto o expiración de una novedad."""
    _verificar_es_admin_sistema(current_user)
    return novedad_service.editar_novedad(db, id_novedad, datos)


@router.post("/{id_novedad}/archivar", response_model=MessageResponse)
def archivar_novedad(
    id_novedad: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """RQF-015 / HU-035: archiva manualmente — no se puede reactivar (CA-035.3)."""
    _verificar_es_admin_sistema(current_user)
    novedad_service.archivar_novedad(db, id_novedad)
    return MessageResponse(message="Novedad archivada correctamente.")


@router.get("/feed", response_model=List[NovedadResponse])
def ver_feed(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """RQF-015 / HU-033: novedades activas dirigidas a mi rol."""
    return novedad_service.listar_feed(db, current_user)
