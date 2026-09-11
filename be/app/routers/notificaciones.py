"""
Módulo: routers/notificaciones.py
Descripción: Endpoints de notificaciones (RQF-003, RQF-006, RQF-007).
¿Para qué? Issue #218 — este router solo recibe la petición HTTP y responde;
           las reglas de negocio reales viven en services/notificaciones_service.py.
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.models.usuario import Usuario
from app.schemas.notificacion import (
    ContadorNoLeidasResponse,
    EstadoRecicladorConjuntoResponse,
    EstadoShutResponse,
    NotificacionEnviarBody,
    NotificacionResponse,
)
from app.services import notificaciones_service as service

router = APIRouter(prefix="/api/v1/notificaciones", tags=["notificaciones"])


@router.post("/enviar", status_code=status.HTTP_201_CREATED)
def enviar_notificacion(
    body: NotificacionEnviarBody,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return service.enviar_notificacion(db, current_user, body)


@router.get("/mis-notificaciones", response_model=List[NotificacionResponse])
def mis_notificaciones(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return service.listar_mis_notificaciones(db, current_user)


@router.get("/no-leidas-count", response_model=ContadorNoLeidasResponse)
def no_leidas_count(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return {"count": service.contar_no_leidas(db, current_user)}


@router.post("/{id_notificacion}/leer", status_code=status.HTTP_200_OK)
def marcar_leida(
    id_notificacion: UUID,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    service.marcar_leida(db, current_user, id_notificacion)
    return {"ok": True}


@router.post("/marcar-todas-leidas", status_code=status.HTTP_200_OK)
def marcar_todas_leidas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    marcadas = service.marcar_todas_leidas(db, current_user)
    return {"ok": True, "marcadas": marcadas}


@router.delete("/limpiar-leidas", status_code=status.HTTP_200_OK)
def limpiar_leidas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Elimina del feed del usuario todas las notificaciones que ya leyó."""
    eliminadas = service.limpiar_leidas(db, current_user)
    return {"ok": True, "eliminadas": eliminadas}


@router.get("/estado-shut", response_model=EstadoShutResponse)
def estado_shut(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return service.obtener_estado_shut(db, current_user)


@router.get("/mi-estado-reciclador", response_model=List[EstadoRecicladorConjuntoResponse])
def mi_estado_reciclador(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    ¿Qué? Para cada conjunto donde el reciclador en sesión está
          autorizado, indica si está presente ahí y si el SHUT de ese
          conjunto está lleno.
    ¿Para qué? El frontend usa esto para deshabilitar el botón de
              confirmar dentro del modal de "enviar notificación" ANTES
              de que el reciclador intente usarlo, con una explicación
              clara, en vez de que se entere del rechazo recién después
              de hacer clic (ver notificaciones_service.enviar_notificacion
              para las reglas reales que esto refleja).
    """
    return service.obtener_mi_estado_reciclador(db, current_user)
