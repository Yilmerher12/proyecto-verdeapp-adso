"""
Módulo: services/agenda_conjunto_service.py
Descripción: Lógica de la agenda interna del Admin de Conjunto — crear,
             listar, cambiar de estado (pendiente / en espera) y borrar.
¿Para qué? Privada del Admin de Conjunto: sin aprobación ni notificaciones.
"""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.administrador_conjunto import AdministradorConjunto
from app.models.agenda_conjunto import AgendaConjunto
from app.schemas.agenda_conjunto import CambiarEstadoAgendaRequest, CrearAgendaItemRequest


def _verificar_conjunto_propio(administrador: AdministradorConjunto, id_conjunto: UUID) -> None:
    """Mismo chequeo de propiedad que conjunto_panel.py — un Admin de Conjunto
    solo puede operar sobre SUS conjuntos, nunca los de otro."""
    ids_propios = {c.id_conjunto_residencial for c in administrador.conjuntos}
    if id_conjunto not in ids_propios:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso sobre este conjunto.")


def _obtener_item(db: Session, id_conjunto: UUID, id_item: UUID) -> AgendaConjunto:
    item = db.get(AgendaConjunto, id_item)
    if not item or item.id_conjunto_residencial != id_conjunto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El tema no existe.")
    return item


def listar(db: Session, administrador: AdministradorConjunto, id_conjunto: UUID) -> list[AgendaConjunto]:
    """¿Qué? Temas de la agenda: primero los PENDIENTES, luego los EN_ESPERA; más reciente primero."""
    _verificar_conjunto_propio(administrador, id_conjunto)
    # ¿Qué? "PENDIENTE" > "EN_ESPERA" alfabéticamente, por eso estado.desc() deja primero los pendientes.
    stmt = (
        select(AgendaConjunto)
        .where(AgendaConjunto.id_conjunto_residencial == id_conjunto)
        .order_by(AgendaConjunto.estado.desc(), AgendaConjunto.created_at.desc())
    )
    return list(db.scalars(stmt).all())


def crear(
    db: Session, administrador: AdministradorConjunto, id_conjunto: UUID, data: CrearAgendaItemRequest
) -> AgendaConjunto:
    _verificar_conjunto_propio(administrador, id_conjunto)
    item = AgendaConjunto(
        id_conjunto_residencial=id_conjunto,
        autor_id=administrador.id_usuario,
        texto=data.texto,
        url_evidencia=data.url_evidencia,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def cambiar_estado(
    db: Session, administrador: AdministradorConjunto, id_conjunto: UUID, id_item: UUID, data: CambiarEstadoAgendaRequest
) -> AgendaConjunto:
    _verificar_conjunto_propio(administrador, id_conjunto)
    item = _obtener_item(db, id_conjunto, id_item)
    item.estado = data.estado
    db.commit()
    db.refresh(item)
    return item


def eliminar(db: Session, administrador: AdministradorConjunto, id_conjunto: UUID, id_item: UUID) -> None:
    """¿Qué? Se borra cuando el tema ya se resolvió en el comité."""
    _verificar_conjunto_propio(administrador, id_conjunto)
    db.delete(_obtener_item(db, id_conjunto, id_item))
    db.commit()
