"""
Módulo: routers/contenido_educativo.py
Descripción: Endpoints del catálogo de contenido educativo (RQF-004/RQF-010).
¿Para qué? RQF-004 (HU-005): cualquier usuario autenticado puede consultar el
           catálogo. RQF-010 (HU-012/013/014): solo el Admin Sistema puede
           crear, editar o eliminar módulos.
¿Impacto? Sin este router, el catálogo educativo solo existiría como tabla
          vacía en la base de datos, sin forma de leerla ni administrarla.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db, require_role
from app.models.rol import RolId
from app.models.usuario import Usuario
from app.schemas.contenido_educativo import (
    ContenidoEducativoCreate,
    ContenidoEducativoResponse,
    ContenidoEducativoUpdate,
    EnviarContenidoRequest,
    EnvioContenidoResponse,
)
from app.services import contenido_educativo_service as service

router = APIRouter(
    prefix="/api/v1/contenido-educativo",
    tags=["contenido-educativo"],
)

# ¿Qué? Issue #216 — ver el mismo comentario en admin.py. listar() (abajo)
#       NO usa esta dependencia a propósito: cualquier usuario autenticado
#       puede consultar el catálogo (RQF-004), solo crear/editar/eliminar
#       es exclusivo del Admin del Sistema.
_requiere_admin_sistema = require_role(
    RolId.ADMIN_SISTEMA, "Solo un Administrador del Sistema puede gestionar el contenido educativo."
)


@router.get("", response_model=list[ContenidoEducativoResponse], summary="Listar el catálogo (HU-005)")
def listar(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ContenidoEducativoResponse]:
    return service.listar_contenido(db)


@router.get(
    "/{id_contenido}",
    response_model=ContenidoEducativoResponse,
    summary="Ver un módulo puntual — el Residente lo abre desde una recomendación manual (RQF-018)",
)
def obtener(
    id_contenido: UUID,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ContenidoEducativoResponse:
    return service.obtener_contenido_o_404(db, id_contenido)


@router.get(
    "/{id_contenido}/envios",
    response_model=list[EnvioContenidoResponse],
    summary="Admin Sistema ve a qué conjuntos se envió este módulo a mano (RQF-018)",
)
def listar_envios(
    id_contenido: UUID,
    current_user: Usuario = Depends(_requiere_admin_sistema),
    db: Session = Depends(get_db),
) -> list[EnvioContenidoResponse]:
    envios = service.listar_envios_de_contenido(db, id_contenido)
    return [
        EnvioContenidoResponse(
            id_conjunto_residencial=e.id_conjunto_residencial,
            nombre_conjunto=e.conjunto.nombre_conjunto,
            created_at=e.created_at,
        )
        for e in envios
    ]


@router.post(
    "/{id_contenido}/enviar",
    response_model=list[EnvioContenidoResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Admin Sistema envía un módulo a uno o varios conjuntos, a mano (RQF-018)",
)
def enviar(
    id_contenido: UUID,
    body: EnviarContenidoRequest,
    current_user: Usuario = Depends(_requiere_admin_sistema),
    db: Session = Depends(get_db),
) -> list[EnvioContenidoResponse]:
    envios = service.enviar_a_conjuntos(db, id_contenido, body.conjuntos, current_user.id_usuario)
    return [
        EnvioContenidoResponse(
            id_conjunto_residencial=e.id_conjunto_residencial,
            nombre_conjunto=e.conjunto.nombre_conjunto,
            created_at=e.created_at,
        )
        for e in envios
    ]


@router.post(
    "",
    response_model=ContenidoEducativoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un módulo (HU-012)",
)
def crear(
    data: ContenidoEducativoCreate,
    current_user: Usuario = Depends(_requiere_admin_sistema),
    db: Session = Depends(get_db),
) -> ContenidoEducativoResponse:
    return service.crear_contenido(db, data)


@router.put(
    "/{id_contenido}",
    response_model=ContenidoEducativoResponse,
    summary="Editar un módulo (HU-013)",
)
def editar(
    id_contenido: UUID,
    data: ContenidoEducativoUpdate,
    current_user: Usuario = Depends(_requiere_admin_sistema),
    db: Session = Depends(get_db),
) -> ContenidoEducativoResponse:
    return service.editar_contenido(db, id_contenido, data)


@router.delete(
    "/{id_contenido}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar un módulo (HU-014)",
)
def eliminar(
    id_contenido: UUID,
    current_user: Usuario = Depends(_requiere_admin_sistema),
    db: Session = Depends(get_db),
) -> None:
    service.eliminar_contenido(db, id_contenido)
