"""
Módulo: routers/novedades.py
Descripción: Endpoints de novedades generales de la plataforma (RQF-015).
¿Para qué? Dos grupos de rutas, con permisos distintos:
           - POST/PATCH/archivar y /todas -> SOLO Administrador del Sistema.
           - GET /feed -> Residente, Reciclador o Admin de Conjunto (ven, no publican).
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db, require_role
from app.models.rol import RolId
from app.models.usuario import Usuario
from app.schemas.novedad import CrearNovedadRequest, EditarNovedadRequest, NovedadResponse
from app.schemas.user import MessageResponse
from app.services import novedad_service

router = APIRouter(prefix="/api/v1/novedades", tags=["novedades"])

# ¿Qué? Issue #216 — ver el mismo comentario en admin.py. ver_feed() (abajo)
#       NO usa esta dependencia a propósito: cualquier usuario autenticado
#       puede consultar su feed, solo publicar/editar/archivar es exclusivo
#       del Admin del Sistema.
_requiere_admin_sistema = require_role(
    RolId.ADMIN_SISTEMA, "Solo un Administrador del Sistema puede gestionar novedades."
)


@router.post("", response_model=NovedadResponse, status_code=status.HTTP_201_CREATED)
def crear_novedad(
    datos: CrearNovedadRequest,
    current_user: Usuario = Depends(_requiere_admin_sistema),
    db: Session = Depends(get_db),
):
    """RQF-015 / HU-032: publica una novedad nueva para el alcance elegido."""
    return novedad_service.crear_novedad(db, current_user, datos)


@router.get("/todas", response_model=List[NovedadResponse])
def listar_todas(
    current_user: Usuario = Depends(_requiere_admin_sistema),
    db: Session = Depends(get_db),
):
    """CA-035.4: historial completo — activas y archivadas."""
    return novedad_service.listar_todas(db)


@router.patch("/{id_novedad}", response_model=NovedadResponse)
def editar_novedad(
    id_novedad: UUID,
    datos: EditarNovedadRequest,
    current_user: Usuario = Depends(_requiere_admin_sistema),
    db: Session = Depends(get_db),
):
    """RQF-015 / HU-034: edita texto, adjunto o expiración de una novedad."""
    return novedad_service.editar_novedad(db, id_novedad, datos)


@router.post("/{id_novedad}/archivar", response_model=MessageResponse)
def archivar_novedad(
    id_novedad: UUID,
    current_user: Usuario = Depends(_requiere_admin_sistema),
    db: Session = Depends(get_db),
):
    """RQF-015 / HU-035: archiva manualmente — no se puede reactivar (CA-035.3)."""
    novedad_service.archivar_novedad(db, id_novedad)
    return MessageResponse(message="Novedad archivada correctamente.")


@router.get("/feed", response_model=List[NovedadResponse])
def ver_feed(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """RQF-015 / HU-033: novedades activas dirigidas a mi rol."""
    return novedad_service.listar_feed(db, current_user)
