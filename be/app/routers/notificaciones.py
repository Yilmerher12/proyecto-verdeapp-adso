from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy import func as sqlfunc
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.models.administrador_conjunto import AdministradorConjunto
from app.models.administrador_conjunto_asignacion import AdministradorConjuntoAsignacion
from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.notificacion import Notificacion, NotificacionDestinatario
from app.models.reciclador import Reciclador
from app.models.residente import Residente
from app.models.tablas_asociacion import recicladores_conjuntos
from app.models.unidad import Unidad
from app.models.usuario import Usuario
from app.schemas.notificacion import (
    ContadorNoLeidasResponse,
    EstadoShutResponse,
    NotificacionEnviarBody,
    NotificacionResponse,
)

router = APIRouter(prefix="/api/v1/notificaciones", tags=["notificaciones"])

TIPOS_VALIDOS = {"LLEGADA_RECICLADOR", "SHUT_LLENO", "SHUT_LIBRE"}

MENSAJES = {
    "LLEGADA_RECICLADOR": "El reciclador ha llegado al conjunto y está listo para recoger el material reciclable.",
    "SHUT_LLENO": "El SHUT está lleno. El reciclador ha sido notificado.",
    "SHUT_LIBRE": "El SHUT ya está disponible — pueden bajar el material reciclable.",
}
MENSAJE_RESIDENTE_SHUT = "Un residente reportó que el SHUT está lleno."


# ── Helpers ────────────────────────────────────────────────────────────────

def _residentes_del_conjunto(db: Session, id_conjunto: int) -> list[int]:
    stmt = (
        select(Residente.id_usuario)
        .join(Unidad, Residente.id_unidad == Unidad.id_unidad)
        .where(Unidad.id_conjunto_residencial == id_conjunto)
    )
    return [r[0] for r in db.execute(stmt).all()]


def _admins_del_conjunto(db: Session, id_conjunto: int) -> list[int]:
    stmt = (
        select(AdministradorConjunto.id_usuario)
        .join(
            AdministradorConjuntoAsignacion,
            AdministradorConjunto.id_administrador == AdministradorConjuntoAsignacion.id_administrador,
        )
        .where(AdministradorConjuntoAsignacion.id_conjunto_residencial == id_conjunto)
    )
    return [r[0] for r in db.execute(stmt).all()]


def _recicladores_del_conjunto(db: Session, id_conjunto: int) -> list[int]:
    stmt = (
        select(Reciclador.id_usuario)
        .join(recicladores_conjuntos, Reciclador.id_reciclador == recicladores_conjuntos.c.id_reciclador)
        .where(recicladores_conjuntos.c.id_conjunto_residencial == id_conjunto)
    )
    return [r[0] for r in db.execute(stmt).all()]


def _conjunto_del_residente(db: Session, id_usuario: int) -> int | None:
    stmt = (
        select(Unidad.id_conjunto_residencial)
        .join(Residente, Unidad.id_unidad == Residente.id_unidad)
        .where(Residente.id_usuario == id_usuario)
    )
    return db.execute(stmt).scalar_one_or_none()


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/enviar", status_code=status.HTTP_201_CREATED)
def enviar_notificacion(
    body: NotificacionEnviarBody,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if body.tipo not in TIPOS_VALIDOS:
        raise HTTPException(status_code=400, detail=f"Tipo inválido. Válidos: {sorted(TIPOS_VALIDOS)}")

    role_id = current_user.id_rol

    if role_id == 2:  # Residente
        if body.tipo != "SHUT_LLENO":
            raise HTTPException(status_code=403, detail="El residente solo puede enviar SHUT_LLENO.")
        id_conjunto = _conjunto_del_residente(db, current_user.id_usuario)
        if not id_conjunto:
            raise HTTPException(status_code=404, detail="No se encontró el conjunto del residente.")
        mensaje = MENSAJE_RESIDENTE_SHUT
        destinatarios = set(_recicladores_del_conjunto(db, id_conjunto) + _admins_del_conjunto(db, id_conjunto))

    elif role_id == 3:  # Reciclador
        if not body.id_conjunto_residencial:
            raise HTTPException(status_code=400, detail="Se requiere id_conjunto_residencial.")
        id_conjunto = body.id_conjunto_residencial

        # Verificar que el reciclador está autorizado en ese conjunto
        reciclador_id_stmt = select(Reciclador.id_reciclador).where(Reciclador.id_usuario == current_user.id_usuario)
        autorizado = db.execute(
            select(recicladores_conjuntos).where(
                recicladores_conjuntos.c.id_conjunto_residencial == id_conjunto,
                recicladores_conjuntos.c.id_reciclador == reciclador_id_stmt.scalar_subquery(),
            )
        ).first()
        if not autorizado:
            raise HTTPException(status_code=403, detail="No estás autorizado en este conjunto.")

        mensaje = MENSAJES[body.tipo]
        destinatarios = set(_residentes_del_conjunto(db, id_conjunto) + _admins_del_conjunto(db, id_conjunto))

    else:
        raise HTTPException(status_code=403, detail="Rol no permitido.")

    destinatarios.discard(current_user.id_usuario)

    notif = Notificacion(
        tipo=body.tipo,
        id_conjunto_residencial=id_conjunto,
        id_emisor=current_user.id_usuario,
        mensaje=mensaje,
    )
    db.add(notif)
    db.flush()

    for uid in destinatarios:
        db.add(NotificacionDestinatario(id_notificacion=notif.id, id_usuario=uid))

    db.commit()
    return {"ok": True, "destinatarios": len(destinatarios)}


@router.get("/mis-notificaciones", response_model=List[NotificacionResponse])
def mis_notificaciones(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    stmt = (
        select(
            Notificacion.id,
            Notificacion.tipo,
            Notificacion.mensaje,
            Notificacion.created_at,
            ConjuntoResidencial.nombre_conjunto,
            NotificacionDestinatario.leida,
        )
        .join(NotificacionDestinatario, Notificacion.id == NotificacionDestinatario.id_notificacion)
        .join(ConjuntoResidencial, Notificacion.id_conjunto_residencial == ConjuntoResidencial.id_conjunto_residencial)
        .where(NotificacionDestinatario.id_usuario == current_user.id_usuario)
        .order_by(Notificacion.created_at.desc())
        .limit(30)
    )
    rows = db.execute(stmt).all()
    return [
        {
            "id": r.id,
            "tipo": r.tipo,
            "mensaje": r.mensaje,
            "nombre_conjunto": r.nombre_conjunto,
            "leida": r.leida,
            "created_at": r.created_at,
        }
        for r in rows
    ]


@router.get("/no-leidas-count", response_model=ContadorNoLeidasResponse)
def no_leidas_count(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    stmt = (
        select(sqlfunc.count())
        .select_from(NotificacionDestinatario)
        .where(
            NotificacionDestinatario.id_usuario == current_user.id_usuario,
            NotificacionDestinatario.leida.is_(False),
        )
    )
    count = db.execute(stmt).scalar() or 0
    return {"count": count}


@router.post("/{id_notificacion}/leer", status_code=status.HTTP_200_OK)
def marcar_leida(
    id_notificacion: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    dest = db.execute(
        select(NotificacionDestinatario).where(
            NotificacionDestinatario.id_notificacion == id_notificacion,
            NotificacionDestinatario.id_usuario == current_user.id_usuario,
        )
    ).scalar_one_or_none()

    if not dest:
        raise HTTPException(status_code=404, detail="Notificación no encontrada.")

    if not dest.leida:
        dest.leida = True
        dest.leida_at = datetime.now(timezone.utc)
        db.commit()

    return {"ok": True}


@router.post("/marcar-todas-leidas", status_code=status.HTTP_200_OK)
def marcar_todas_leidas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    stmt = (
        select(NotificacionDestinatario)
        .where(
            NotificacionDestinatario.id_usuario == current_user.id_usuario,
            NotificacionDestinatario.leida.is_(False),
        )
    )
    pendientes = db.execute(stmt).scalars().all()
    now = datetime.now(timezone.utc)
    for d in pendientes:
        d.leida = True
        d.leida_at = now
    db.commit()
    return {"ok": True, "marcadas": len(pendientes)}


@router.delete("/limpiar-leidas", status_code=status.HTTP_200_OK)
def limpiar_leidas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Elimina del feed del usuario todas las notificaciones que ya leyó."""
    from sqlalchemy import delete as sql_delete
    result = db.execute(
        sql_delete(NotificacionDestinatario).where(
            NotificacionDestinatario.id_usuario == current_user.id_usuario,
            NotificacionDestinatario.leida.is_(True),
        )
    )
    db.commit()
    return {"ok": True, "eliminadas": result.rowcount}


@router.get("/estado-shut", response_model=EstadoShutResponse)
def estado_shut(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if current_user.id_rol != 2:
        return EstadoShutResponse(lleno=False)

    id_conjunto = _conjunto_del_residente(db, current_user.id_usuario)
    if not id_conjunto:
        return EstadoShutResponse(lleno=False)

    stmt = (
        select(Notificacion)
        .where(
            Notificacion.id_conjunto_residencial == id_conjunto,
            Notificacion.tipo.in_(["SHUT_LLENO", "SHUT_LIBRE"]),
        )
        .order_by(Notificacion.created_at.desc())
        .limit(1)
    )
    last = db.execute(stmt).scalar_one_or_none()

    if last is None or last.tipo == "SHUT_LIBRE":
        return EstadoShutResponse(lleno=False)
    return EstadoShutResponse(lleno=True, created_at=last.created_at)
