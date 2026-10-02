"""
Módulo: routers/novedades_enviadas.py
Descripción: Novedades que un Residente, Reciclador o Admin de Conjunto le
             ENVÍA al Admin Sistema (texto + imagen opcional).
¿Para qué? El Admin Sistema las recibe en "Solicitudes pendientes" (ver
          routers/admin_conjunto.py). No confundir con routers/novedades.py
          (RQF-015), que son los avisos que el Admin Sistema publica.
"""

from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models.usuario import Usuario
from app.schemas.novedad_enviada import CrearNovedadEnviadaRequest, NovedadEnviadaResponse
from app.schemas.user import MessageResponse
from app.services import novedad_enviada_service

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


@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def enviar_novedad(
    datos: CrearNovedadEnviadaRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Envía una novedad al Admin Sistema (el rol sale de la cuenta, el servicio rechaza al Admin Sistema)."""
    novedad_enviada_service.crear(db, current_user, datos)
    return MessageResponse(message="Novedad enviada. El Administrador del Sistema la revisará.")


@router.get("/mias", response_model=List[NovedadEnviadaResponse])
def mis_novedades(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Las novedades que yo envié, con su estado (nueva / vista)."""
    return [_a_respuesta(n) for n in novedad_enviada_service.listar_mias(db, current_user)]
