"""
Módulo: routers/novedades_enviadas.py
Descripción: Novedades que un Residente, Reciclador o Admin de Conjunto le
             ENVÍA al Admin Sistema (texto + imagen opcional).
¿Para qué? El Admin Sistema las recibe en "Solicitudes pendientes" (ver
          routers/admin_conjunto.py). No confundir con routers/novedades.py
          (RQF-015), que son los avisos que el Admin Sistema publica.
"""

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models.usuario import Usuario
from app.schemas.novedad_enviada import (
    CrearNovedadEnviadaRequest,
    NovedadEnviadaResponse,
    PaginaDeNovedadesEnviadasResponse,
)
from app.schemas.user import MessageResponse
from app.services import novedad_enviada_service
from app.utils.limiter import limiter

router = APIRouter(prefix="/api/v1/novedades-enviadas", tags=["novedades-enviadas"])


def _a_respuesta(n) -> NovedadEnviadaResponse:
    return NovedadEnviadaResponse(
        id=n.id,
        texto=n.texto,
        url_imagen=n.url_imagen,
        estado=n.estado,
        nombre_conjunto=n.conjunto.nombre_conjunto if n.conjunto else None,
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
    """Las novedades que yo envié, con su estado (nueva / vista). Paginado."""
    items, total = novedad_enviada_service.listar_mias(db, current_user, limit=limit, offset=offset)
    return {"items": [_a_respuesta(n) for n in items], "total": total}
