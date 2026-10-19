"""
Módulo: services/agenda_conjunto_service.py
Descripción: Lógica de la agenda interna del Admin de Conjunto — crear,
             listar, archivar / restaurar y borrar.
¿Para qué? Privada del Admin de Conjunto: sin aprobación ni notificaciones.
"""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.administrador_conjunto import AdministradorConjunto
from app.models.agenda_conjunto import AgendaConjunto, EstadoAgenda
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
    """¿Qué? Los temas PENDIENTES ("Por tratar"), el más reciente primero. Los archivados salen aparte, paginados."""
    _verificar_conjunto_propio(administrador, id_conjunto)
    stmt = (
        select(AgendaConjunto)
        .where(
            AgendaConjunto.id_conjunto_residencial == id_conjunto,
            AgendaConjunto.estado == EstadoAgenda.PENDIENTE.value,
        )
        .order_by(AgendaConjunto.created_at.desc(), AgendaConjunto.id)
    )
    return list(db.scalars(stmt).all())


def listar_archivadas(
    db: Session, administrador: AdministradorConjunto, id_conjunto: UUID, limit: int, offset: int
) -> tuple[list[AgendaConjunto], int]:
    """¿Qué? Una página del historial (temas ARCHIVADOS, el último archivado primero) + cuántos hay en total."""
    _verificar_conjunto_propio(administrador, id_conjunto)
    donde = (
        AgendaConjunto.id_conjunto_residencial == id_conjunto,
        AgendaConjunto.estado == EstadoAgenda.ARCHIVADA.value,
    )
    total = db.scalar(select(func.count()).select_from(AgendaConjunto).where(*donde))
    stmt = (
        select(AgendaConjunto)
        .where(*donde)
        .order_by(AgendaConjunto.archivado_en.desc(), AgendaConjunto.id)
        .limit(limit)
        .offset(offset)
    )
    return list(db.scalars(stmt).all()), total


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
    # ¿Qué? La fecha de archivado se pone al archivar y se borra al restaurar el tema.
    item.archivado_en = datetime.now(timezone.utc) if data.estado == EstadoAgenda.ARCHIVADA.value else None
    db.commit()
    db.refresh(item)
    return item


def eliminar(db: Session, administrador: AdministradorConjunto, id_conjunto: UUID, id_item: UUID) -> None:
    """¿Qué? Borra el tema para siempre (pendiente o archivado). Lo normal al resolverlo es archivarlo."""
    _verificar_conjunto_propio(administrador, id_conjunto)
    db.delete(_obtener_item(db, id_conjunto, id_item))
    db.commit()
