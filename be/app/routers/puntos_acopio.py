"""
Módulo: routers/puntos_acopio.py
Descripción: Endpoints de gestión de puntos de acopio, exclusivos del Admin
             Sistema (RQF-011 / HU-015, HU-016, HU-017).
¿Para qué? Separado de routers/directorio.py (lectura pública, filtrada a
          activos) — este router es de escritura, y su listado incluye
          también los puntos dados de baja para que el admin los vea.
¿Impacto? Antes de esto, los 9 puntos de acopio reales solo podían
          agregarse/corregirse editando seed.py a mano y re-desplegando.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models.rol import RolId
from app.models.usuario import Usuario
from app.schemas.puntos_acopio import (
    PuntoAcopioAdminResponse,
    PuntoAcopioCreate,
    PuntoAcopioUpdate,
)
from app.services import puntos_acopio_service as service

router = APIRouter(
    prefix="/api/v1/admin/puntos-acopio",
    tags=["admin-puntos-acopio"],
)


def _verificar_es_admin_sistema(current_user: Usuario) -> None:
    if current_user.id_rol != RolId.ADMIN_SISTEMA:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un Administrador del Sistema puede gestionar los puntos de acopio.",
        )


@router.get("", response_model=list[PuntoAcopioAdminResponse], summary="Listar todos los puntos de acopio")
def listar(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    _verificar_es_admin_sistema(current_user)
    return service.listar_todos(db)


@router.post(
    "",
    response_model=PuntoAcopioAdminResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar un punto de acopio (HU-015)",
)
def crear(
    data: PuntoAcopioCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    _verificar_es_admin_sistema(current_user)
    return service.crear(db, data)


@router.put(
    "/{id_punto_acopio}",
    response_model=PuntoAcopioAdminResponse,
    summary="Editar un punto de acopio (HU-016)",
)
def editar(
    id_punto_acopio: UUID,
    data: PuntoAcopioUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    _verificar_es_admin_sistema(current_user)
    return service.editar(db, id_punto_acopio, data)


@router.delete(
    "/{id_punto_acopio}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Dar de baja un punto de acopio (HU-017)",
)
def dar_de_baja(
    id_punto_acopio: UUID,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    _verificar_es_admin_sistema(current_user)
    service.dar_de_baja(db, id_punto_acopio)


@router.post(
    "/{id_punto_acopio}/reactivar",
    response_model=PuntoAcopioAdminResponse,
    summary="Reactivar un punto de acopio dado de baja",
)
def reactivar(
    id_punto_acopio: UUID,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    _verificar_es_admin_sistema(current_user)
    return service.reactivar(db, id_punto_acopio)


@router.delete(
    "/{id_punto_acopio}/definitivo",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar por completo un punto ya dado de baja",
)
def eliminar_definitivamente(
    id_punto_acopio: UUID,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    _verificar_es_admin_sistema(current_user)
    service.eliminar_definitivamente(db, id_punto_acopio)
