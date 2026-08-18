"""
Módulo: routers/contenido_educativo.py
Descripción: Endpoints del catálogo de contenido educativo (RQF-004/RQF-010).
¿Para qué? RQF-004 (HU-005): cualquier usuario autenticado puede consultar el
           catálogo. RQF-010 (HU-012/013/014): solo el Admin Sistema puede
           crear, editar o eliminar módulos.
¿Impacto? Sin este router, el catálogo educativo solo existiría como tabla
          vacía en la base de datos, sin forma de leerla ni administrarla.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models.rol import RolId
from app.models.usuario import Usuario
from app.schemas.contenido_educativo import (
    ContenidoEducativoCreate,
    ContenidoEducativoResponse,
    ContenidoEducativoUpdate,
)
from app.services import contenido_educativo_service as service

router = APIRouter(
    prefix="/api/v1/contenido-educativo",
    tags=["contenido-educativo"],
)


def _verificar_es_admin_sistema(current_user: Usuario) -> None:
    if current_user.id_rol != RolId.ADMIN_SISTEMA:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un Administrador del Sistema puede gestionar el contenido educativo.",
        )


@router.get("", response_model=list[ContenidoEducativoResponse], summary="Listar el catálogo (HU-005)")
def listar(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ContenidoEducativoResponse]:
    return service.listar_contenido(db)


@router.post(
    "",
    response_model=ContenidoEducativoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un módulo (HU-012)",
)
def crear(
    data: ContenidoEducativoCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ContenidoEducativoResponse:
    _verificar_es_admin_sistema(current_user)
    return service.crear_contenido(db, data)


@router.put(
    "/{id_contenido}",
    response_model=ContenidoEducativoResponse,
    summary="Editar un módulo (HU-013)",
)
def editar(
    id_contenido: int,
    data: ContenidoEducativoUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ContenidoEducativoResponse:
    _verificar_es_admin_sistema(current_user)
    return service.editar_contenido(db, id_contenido, data)


@router.delete(
    "/{id_contenido}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar un módulo (HU-014)",
)
def eliminar(
    id_contenido: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    _verificar_es_admin_sistema(current_user)
    service.eliminar_contenido(db, id_contenido)
