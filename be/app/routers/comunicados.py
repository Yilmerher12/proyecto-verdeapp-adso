"""
Módulo: routers/comunicados.py
Descripción: Endpoints de comunicados del conjunto (RQF-014).
¿Para qué? Dos grupos de rutas, con permisos distintos:
           - POST/PATCH/DELETE y /mis-comunicados -> SOLO Administrador de Conjunto.
           - GET /feed -> SOLO Residente o Reciclador (ven, no publican).
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models.administrador_conjunto import AdministradorConjunto
from app.models.rol import RolId
from app.models.usuario import Usuario
from app.schemas.comunicado import ComunicadoResponse, CrearComunicadoRequest, EditarComunicadoRequest
from app.schemas.user import MessageResponse
from app.services import comunicado_service

router = APIRouter(prefix="/api/v1/comunicados", tags=["comunicados"])


def _obtener_administrador_o_rechazar(db: Session, current_user: Usuario) -> AdministradorConjunto:
    if current_user.id_rol != RolId.ADMIN_CONJUNTO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un Administrador de Conjunto puede gestionar comunicados.",
        )
    administrador = db.execute(
        select(AdministradorConjunto).where(AdministradorConjunto.id_usuario == current_user.id_usuario)
    ).scalar_one_or_none()
    if not administrador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No se encontró tu perfil de administrador.")
    return administrador


@router.post("", response_model=ComunicadoResponse, status_code=status.HTTP_201_CREATED)
def crear_comunicado(
    datos: CrearComunicadoRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """RQF-014 / HU-027: publica un comunicado nuevo en uno de mis conjuntos."""
    administrador = _obtener_administrador_o_rechazar(db, current_user)
    return comunicado_service.crear_comunicado(db, administrador, datos)


@router.get("/mis-comunicados", response_model=List[ComunicadoResponse])
def listar_mis_comunicados(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Todo lo que he publicado en mis conjuntos (activos y vencidos), para poder editarlos o eliminarlos."""
    administrador = _obtener_administrador_o_rechazar(db, current_user)
    return comunicado_service.listar_mis_comunicados(db, administrador)


@router.patch("/{id_comunicado}", response_model=ComunicadoResponse)
def editar_comunicado(
    id_comunicado: UUID,
    datos: EditarComunicadoRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """RQF-014 / HU-029: edita texto, adjunto, tipo o expiración de un comunicado propio."""
    administrador = _obtener_administrador_o_rechazar(db, current_user)
    return comunicado_service.editar_comunicado(db, administrador, id_comunicado, datos)


@router.delete("/{id_comunicado}", response_model=MessageResponse)
def eliminar_comunicado(
    id_comunicado: UUID,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """RQF-014 / HU-030: elimina definitivamente un comunicado propio."""
    administrador = _obtener_administrador_o_rechazar(db, current_user)
    comunicado_service.eliminar_comunicado(db, administrador, id_comunicado)
    return MessageResponse(message="Comunicado eliminado correctamente.")


@router.get("/feed", response_model=List[ComunicadoResponse])
def ver_feed(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """RQF-014 / HU-028: comunicados activos dirigidos a mi rol, de mi(s) conjunto(s)."""
    return comunicado_service.listar_feed(db, current_user)
