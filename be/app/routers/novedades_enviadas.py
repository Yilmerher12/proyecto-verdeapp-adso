"""
Módulo: routers/novedades_enviadas.py
Descripción: Consultas de soporte que un Residente, Reciclador o Admin de
             Conjunto le ENVÍA al Admin Sistema (texto + imagen opcional) y la
             bandeja "Soporte técnico" donde él las atiende.
¿Para qué? El autor envía y ve las suyas con la respuesta; el Admin Sistema las
          lista, cambia su estado y prioridad y las responde. No confundir con
          routers/novedades.py (RQF-015), que son los avisos que el Admin
          Sistema publica.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db, require_role
from app.models.novedad_enviada import EstadoNovedadEnviada, PrioridadNovedadEnviada
from app.models.rol import RolId
from app.models.usuario import Usuario
from app.schemas.novedad_enviada import (
    ActualizarSoporteRequest,
    CrearNovedadEnviadaRequest,
    NovedadEnviadaResponse,
    PaginaDeNovedadesEnviadasResponse,
    PaginaDeSoporteResponse,
)
from app.schemas.user import MessageResponse
from app.services import novedad_enviada_service
from app.utils.audit_log import log_accion_admin
from app.utils.limiter import limiter

router = APIRouter(prefix="/api/v1/novedades-enviadas", tags=["novedades-enviadas"])

_requiere_admin_sistema = require_role(
    RolId.ADMIN_SISTEMA, "Solo el Administrador del Sistema puede atender el soporte técnico."
)


def _a_respuesta(n) -> NovedadEnviadaResponse:
    return NovedadEnviadaResponse(
        id=n.id,
        texto=n.texto,
        url_imagen=n.url_imagen,
        estado=n.estado,
        prioridad=n.prioridad,
        nombre_conjunto=n.conjunto.nombre_conjunto if n.conjunto else None,
        respuesta=n.respuesta,
        respondida_at=n.respondida_at,
        created_at=n.created_at,
    )


# ¿Qué? Issue #372 (CN-042): máximo 10 envíos por minuto.
# ¿Impacto? Sin este tope, una sola cuenta podía llenar la bandeja del Admin
#          Sistema con cientos de novedades. `request` lo exige slowapi.
@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def enviar_novedad(
    request: Request,
    datos: CrearNovedadEnviadaRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Envía una novedad al Admin Sistema (el rol sale de la cuenta, el servicio rechaza al Admin Sistema)."""
    novedad_enviada_service.crear(db, current_user, datos)
    return MessageResponse(message="Novedad enviada. El Administrador del Sistema la revisará.")


# ¿Qué? Issue #399: tope de filas por página, igual que la bandeja del Admin Sistema.
MAX_LIMIT_MIAS = 100


@router.get("/mias", response_model=PaginaDeNovedadesEnviadasResponse)
def mis_novedades(
    limit: int = Query(10, ge=1, le=MAX_LIMIT_MIAS),
    offset: int = Query(0, ge=0),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Las novedades que yo envié, con su estado y la respuesta si ya la tienen. Paginado."""
    items, total = novedad_enviada_service.listar_mias(db, current_user, limit=limit, offset=offset)
    return {"items": [_a_respuesta(n) for n in items], "total": total}


@router.get("/soporte", response_model=PaginaDeSoporteResponse)
def listar_soporte(
    estado: Optional[EstadoNovedadEnviada] = Query(default=None),
    prioridad: Optional[PrioridadNovedadEnviada] = Query(default=None),
    limit: int = Query(10, ge=1, le=MAX_LIMIT_MIAS),
    offset: int = Query(0, ge=0),
    current_user: Usuario = Depends(_requiere_admin_sistema),
    db: Session = Depends(get_db),
):
    """
    Issue #512: bandeja "Soporte técnico". Sin `estado` trae lo pendiente (NUEVA y
    EN_REVISION); con `estado=RESUELTA` trae el historial. Filtrable por `prioridad`.
    """
    items, total = novedad_enviada_service.listar_soporte(db, estado, prioridad, limit=limit, offset=offset)
    return {"items": items, "total": total}


@router.patch("/soporte/{id_novedad}", response_model=MessageResponse)
def actualizar_soporte(
    id_novedad: UUID,
    datos: ActualizarSoporteRequest,
    current_user: Usuario = Depends(_requiere_admin_sistema),
    db: Session = Depends(get_db),
):
    """Issue #512: cambia estado, prioridad y/o respuesta de una consulta; con respuesta, avisa al autor."""
    novedad = novedad_enviada_service.actualizar_soporte(db, id_novedad, datos, current_user)
    # ¿Qué? Issue #376: sin la respuesta — es texto libre (ver log_accion_admin).
    log_accion_admin(
        current_user.correo_electronico,
        "soporte_actualizado",
        novedad=id_novedad,
        estado=novedad.estado,
        prioridad=novedad.prioridad,
        con_respuesta=datos.respuesta is not None,
    )
    return MessageResponse(message="Consulta actualizada.")
