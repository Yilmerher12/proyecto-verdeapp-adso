"""
Módulo: routers/comunicados.py
Descripción: Endpoints de comunicados del conjunto (RQF-014).
¿Para qué? Dos grupos de rutas, con permisos distintos:
           - POST/PATCH/DELETE y /mis-comunicados -> SOLO Administrador de Conjunto.
           - GET /feed -> SOLO Residente o Reciclador (ven, no publican).
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db, require_admin_conjunto
from app.models.administrador_conjunto import AdministradorConjunto
from app.models.usuario import Usuario
from app.schemas.comunicado import ComunicadoResponse, CrearComunicadoRequest, EditarComunicadoRequest
from app.schemas.user import MessageResponse
from app.services import comunicado_service

router = APIRouter(prefix="/api/v1/comunicados", tags=["comunicados"])

# ¿Qué? Issue #216 — misma idea que require_role en admin.py, pero con
#       require_admin_conjunto (ver dependencies.py): antes esta función
#       (que revisa el rol Y busca el perfil de AdministradorConjunto)
#       estaba copiada igual en este archivo y en conjunto_panel.py.
_requiere_admin_conjunto = require_admin_conjunto("Solo un Administrador de Conjunto puede gestionar comunicados.")


@router.post("", response_model=ComunicadoResponse, status_code=status.HTTP_201_CREATED)
def crear_comunicado(
    datos: CrearComunicadoRequest,
    administrador: AdministradorConjunto = Depends(_requiere_admin_conjunto),
    db: Session = Depends(get_db),
):
    """RQF-014 / HU-027: publica un comunicado nuevo en uno de mis conjuntos."""
    return comunicado_service.crear_comunicado(db, administrador, datos)


@router.get("/mis-comunicados", response_model=List[ComunicadoResponse])
def listar_mis_comunicados(
    administrador: AdministradorConjunto = Depends(_requiere_admin_conjunto),
    db: Session = Depends(get_db),
):
    """Todo lo que he publicado en mis conjuntos (activos y vencidos), para poder editarlos o eliminarlos."""
    return comunicado_service.listar_mis_comunicados(db, administrador)


@router.patch("/{id_comunicado}", response_model=ComunicadoResponse)
def editar_comunicado(
    id_comunicado: UUID,
    datos: EditarComunicadoRequest,
    administrador: AdministradorConjunto = Depends(_requiere_admin_conjunto),
    db: Session = Depends(get_db),
):
    """RQF-014 / HU-029: edita texto, adjunto, tipo o expiración de un comunicado propio."""
    return comunicado_service.editar_comunicado(db, administrador, id_comunicado, datos)


@router.delete("/{id_comunicado}", response_model=MessageResponse)
def eliminar_comunicado(
    id_comunicado: UUID,
    administrador: AdministradorConjunto = Depends(_requiere_admin_conjunto),
    db: Session = Depends(get_db),
):
    """RQF-014 / HU-030: elimina definitivamente un comunicado propio."""
    comunicado_service.eliminar_comunicado(db, administrador, id_comunicado)
    return MessageResponse(message="Comunicado eliminado correctamente.")


@router.get("/feed", response_model=List[ComunicadoResponse])
def ver_feed(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """RQF-014 / HU-028: comunicados activos dirigidos a mi rol, de mi(s) conjunto(s)."""
    return comunicado_service.listar_feed(db, current_user)
