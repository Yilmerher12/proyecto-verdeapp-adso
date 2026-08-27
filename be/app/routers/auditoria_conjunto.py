"""
Módulo: routers/auditoria_conjunto.py
Descripción: Endpoints de la auditoría del Reciclador al conjunto (RQF-009).
¿Para qué? Exponer, vía HTTP, que un Reciclador registre su evaluación de
           desempeño de separación de un conjunto donde está autorizado, y
           que pueda ver el historial de las que ya envió.
"""
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models.auditoria_conjunto import AuditoriaConjunto
from app.models.rol import RolId
from app.models.usuario import Usuario
from app.schemas.auditoria_conjunto import AuditoriaConjuntoResponse, NivelDesempeno
from app.services import auditoria_conjunto_service as service

router = APIRouter(prefix="/api/v1/auditorias-conjunto", tags=["Auditoría de Conjunto"])


def _verificar_es_reciclador(current_user: Usuario) -> None:
    if current_user.id_rol != RolId.RECICLADOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un Reciclador puede auditar un conjunto.",
        )


def _a_response(auditoria: AuditoriaConjunto) -> AuditoriaConjuntoResponse:
    return AuditoriaConjuntoResponse(
        id_auditoria=auditoria.id_auditoria,
        id_conjunto_residencial=auditoria.id_conjunto_residencial,
        nombre_conjunto=auditoria.conjunto.nombre_conjunto,
        nivel_desempeno=auditoria.nivel_desempeno,  # type: ignore[arg-type]
        tema_educativo=auditoria.tema_educativo,
        descripcion=auditoria.descripcion,
        ruta_evidencia=auditoria.ruta_evidencia,
        created_at=auditoria.created_at,
        nombre_reciclador=f"{auditoria.reciclador.nombre} {auditoria.reciclador.apellidos}".strip(),
    )


@router.post(
    "",
    response_model=AuditoriaConjuntoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Reciclador audita el desempeño de separación de un conjunto",
)
async def crear_auditoria(
    id_conjunto_residencial: int = Form(...),
    nivel_desempeno: NivelDesempeno = Form(...),
    tema_educativo: str = Form(...),
    descripcion: Optional[str] = Form(None),
    evidencia: UploadFile = File(...),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AuditoriaConjuntoResponse:
    _verificar_es_reciclador(current_user)

    if not tema_educativo.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selecciona un tema.")

    auditoria = await service.crear_auditoria(
        db=db,
        id_usuario_reciclador=current_user.id_usuario,
        id_conjunto_residencial=id_conjunto_residencial,
        nivel_desempeno=nivel_desempeno,
        tema_educativo=tema_educativo,
        descripcion=descripcion,
        evidencia=evidencia,
    )
    return _a_response(auditoria)


@router.get(
    "/mias",
    response_model=list[AuditoriaConjuntoResponse],
    summary="Reciclador ve las auditorías que ya envió",
)
def listar_mias(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AuditoriaConjuntoResponse]:
    _verificar_es_reciclador(current_user)
    auditorias = service.listar_mias(db, current_user.id_usuario)
    return [_a_response(a) for a in auditorias]


@router.get(
    "/historial",
    response_model=list[AuditoriaConjuntoResponse],
    summary="Residente o Admin de Conjunto ve el historial de auditorías de su(s) conjunto(s)",
)
def listar_historial(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AuditoriaConjuntoResponse]:
    if current_user.id_rol not in (RolId.RESIDENTE, RolId.ADMIN_CONJUNTO):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un Residente o Admin de Conjunto puede ver este historial.",
        )
    auditorias = service.listar_historial(db, current_user)
    return [_a_response(a) for a in auditorias]


@router.get(
    "/{id_auditoria}",
    response_model=AuditoriaConjuntoResponse,
    summary="Residente o Admin de Conjunto ve el detalle de una auditoría de su conjunto",
)
def obtener_auditoria(
    id_auditoria: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AuditoriaConjuntoResponse:
    auditoria = service.obtener_por_id(db, current_user, id_auditoria)
    return _a_response(auditoria)
