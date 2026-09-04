from datetime import datetime, timedelta, timezone
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy import func as sqlfunc
from sqlalchemy.orm import Session

from app.dependencies import get_db, get_current_user
from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.notificacion import Notificacion, NotificacionDestinatario
from app.models.reciclador import Reciclador
from app.models.residente import Residente
from app.models.rol import RolId
from app.models.tablas_asociacion import recicladores_conjuntos
from app.models.unidad import Unidad
from app.models.usuario import Usuario
from app.schemas.notificacion import (
    ContadorNoLeidasResponse,
    EstadoRecicladorConjuntoResponse,
    EstadoShutResponse,
    NotificacionEnviarBody,
    NotificacionResponse,
)
from app.services.notificaciones_helpers import admins_del_conjunto, reciclador_esta_presente, residentes_del_conjunto

router = APIRouter(prefix="/api/v1/notificaciones", tags=["notificaciones"])

TIPOS_VALIDOS = {"LLEGADA_RECICLADOR", "SHUT_LLENO", "SHUT_LIBRE", "FINALIZACION_RECICLADOR"}

MENSAJES = {
    "LLEGADA_RECICLADOR": "El reciclador ha llegado al conjunto y está listo para recoger el material reciclable.",
    "SHUT_LLENO": "El SHUT está lleno. El reciclador ha sido notificado.",
    "SHUT_LIBRE": "El SHUT ya está disponible — pueden bajar el material reciclable.",
    "FINALIZACION_RECICLADOR": "El reciclador finalizó la separación de residuos y ya se retiró del conjunto.",
}
MENSAJE_RESIDENTE_SHUT = "Un residente reportó que el SHUT está lleno."


# ── Helpers ────────────────────────────────────────────────────────────────
# ¿Qué? residentes_del_conjunto / admins_del_conjunto se movieron a
#       services/notificaciones_helpers.py — auditoria_conjunto_service.py
#       también las necesita, y antes solo existían aquí como funciones
#       privadas de este archivo.

def _recicladores_del_conjunto(db: Session, id_conjunto: UUID) -> list[UUID]:
    stmt = (
        select(Reciclador.id_usuario)
        .join(recicladores_conjuntos, Reciclador.id_reciclador == recicladores_conjuntos.c.id_reciclador)
        .where(recicladores_conjuntos.c.id_conjunto_residencial == id_conjunto)
    )
    return [r[0] for r in db.execute(stmt).all()]


def _conjunto_del_residente(db: Session, id_usuario: UUID) -> UUID | None:
    stmt = (
        select(Unidad.id_conjunto_residencial)
        .join(Residente, Unidad.id_unidad == Residente.id_unidad)
        .where(Residente.id_usuario == id_usuario)
    )
    return db.execute(stmt).scalar_one_or_none()


def _shut_esta_lleno(db: Session, id_conjunto: UUID) -> bool:
    """¿Qué? Mismo criterio que usa GET /estado-shut: el SHUT está "lleno"
    si el último aviso SHUT_LLENO/SHUT_LIBRE de ese conjunto fue un
    SHUT_LLENO (o nunca se ha reportado nada, lo que cuenta como "no lleno").
    ¿Para qué? RN-001 de RQF-003 / CA-003.2: un residente no puede reportar
    el SHUT lleno si ya está marcado como lleno — evita reportes duplicados
    seguidos del mismo problema."""
    stmt = (
        select(Notificacion.tipo)
        .where(
            Notificacion.id_conjunto_residencial == id_conjunto,
            Notificacion.tipo.in_(["SHUT_LLENO", "SHUT_LIBRE"]),
        )
        .order_by(Notificacion.created_at.desc())
        .limit(1)
    )
    ultimo_tipo = db.execute(stmt).scalar_one_or_none()
    return ultimo_tipo == "SHUT_LLENO"


def _aviso_reciente(db: Session, id_conjunto: UUID, id_emisor: UUID, tipo: str, minutos: int) -> bool:
    """¿Qué? ¿Este mismo usuario ya envió este mismo tipo de aviso, para este
    mismo conjunto, hace menos de `minutos`?
    ¿Para qué? RN-003 de RQF-006 / CA-007.4: cooldown de 2 horas entre avisos
    de "llegada" del reciclador, para no saturar de notificaciones repetidas."""
    limite = datetime.now(timezone.utc) - timedelta(minutes=minutos)
    stmt = select(Notificacion.id).where(
        Notificacion.id_conjunto_residencial == id_conjunto,
        Notificacion.id_emisor == id_emisor,
        Notificacion.tipo == tipo,
        Notificacion.created_at > limite,
    )
    return db.execute(stmt).first() is not None


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

    if role_id == RolId.RESIDENTE:
        if body.tipo != "SHUT_LLENO":
            raise HTTPException(status_code=403, detail="El residente solo puede enviar SHUT_LLENO.")
        id_conjunto = _conjunto_del_residente(db, current_user.id_usuario)
        if not id_conjunto:
            raise HTTPException(status_code=404, detail="No se encontró el conjunto del residente.")
        if _shut_esta_lleno(db, id_conjunto):
            raise HTTPException(status_code=400, detail="El SHUT de tu conjunto ya está reportado como lleno.")
        mensaje = MENSAJE_RESIDENTE_SHUT
        destinatarios = set(_recicladores_del_conjunto(db, id_conjunto) + admins_del_conjunto(db, id_conjunto))

    elif role_id == RolId.RECICLADOR:
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

        # ¿Qué? Control de presencia: SHUT_LLENO, SHUT_LIBRE y
        #       FINALIZACION_RECICLADOR solo tienen sentido con el
        #       reciclador físicamente en el conjunto — exigen haber
        #       avisado LLEGADA_RECICLADOR antes (y no haber avisado
        #       FINALIZACION_RECICLADOR después de esa llegada). A
        #       LLEGADA_RECICLADOR le pasa lo contrario: no se puede volver
        #       a avisar si ya está presente.
        # ¿Para qué? Antes de esto, un reciclador podía enviar cualquiera
        #           de las 4 notificaciones en cualquier momento, incluso
        #           sin haber llegado — nada sabía si de verdad estaba ahí.
        presente = reciclador_esta_presente(db, id_conjunto, current_user.id_usuario)

        if body.tipo == "LLEGADA_RECICLADOR":
            if presente:
                raise HTTPException(
                    status_code=400,
                    detail="Ya avisaste tu llegada a este conjunto — avisa que ya te vas antes de volver a llegar.",
                )
            if _aviso_reciente(db, id_conjunto, current_user.id_usuario, "LLEGADA_RECICLADOR", minutos=120):
                raise HTTPException(
                    status_code=400,
                    detail="Ya reportaste tu llegada a este conjunto hace menos de 2 horas.",
                )
        else:
            if not presente:
                raise HTTPException(
                    status_code=400,
                    detail="Debes avisar tu llegada a este conjunto antes de usar esta notificación.",
                )
            # ¿Qué? Mismo candado que ya protegía a SHUT_LLENO del lado del
            #       residente (_shut_esta_lleno) — ahora también aplica del
            #       lado del reciclador, y se agrega el simétrico para
            #       SHUT_LIBRE, que antes no tenía ningún candado.
            if body.tipo == "SHUT_LLENO" and _shut_esta_lleno(db, id_conjunto):
                raise HTTPException(status_code=400, detail="El SHUT de este conjunto ya está reportado como lleno.")
            if body.tipo == "SHUT_LIBRE" and not _shut_esta_lleno(db, id_conjunto):
                raise HTTPException(status_code=400, detail="El SHUT de este conjunto ya está reportado como libre.")

        mensaje = MENSAJES[body.tipo]
        destinatarios = set(residentes_del_conjunto(db, id_conjunto) + admins_del_conjunto(db, id_conjunto))

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
            Notificacion.id_referencia,
            Notificacion.created_at,
            ConjuntoResidencial.nombre_conjunto,
            NotificacionDestinatario.leida,
        )
        .join(NotificacionDestinatario, Notificacion.id == NotificacionDestinatario.id_notificacion)
        # ¿Qué? outerjoin (LEFT JOIN), no join — las novedades de plataforma
        #       (RQF-015) tienen id_conjunto_residencial NULL, y un JOIN
        #       normal las excluiría por completo del resultado.
        .outerjoin(ConjuntoResidencial, Notificacion.id_conjunto_residencial == ConjuntoResidencial.id_conjunto_residencial)
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
            "id_referencia": r.id_referencia,
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
    id_notificacion: UUID,
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
    if current_user.id_rol != RolId.RESIDENTE:
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
              de hacer clic (ver POST /enviar para las reglas reales que
              esto refleja).
    """
    if current_user.id_rol != RolId.RECICLADOR:
        return []

    reciclador_id_stmt = select(Reciclador.id_reciclador).where(Reciclador.id_usuario == current_user.id_usuario)
    ids_conjuntos = db.execute(
        select(recicladores_conjuntos.c.id_conjunto_residencial).where(
            recicladores_conjuntos.c.id_reciclador == reciclador_id_stmt.scalar_subquery()
        )
    ).scalars().all()

    resultado = []
    for id_conjunto in ids_conjuntos:
        presente = reciclador_esta_presente(db, id_conjunto, current_user.id_usuario)
        resultado.append(
            EstadoRecicladorConjuntoResponse(
                id_conjunto_residencial=id_conjunto,
                presente=presente,
                shut_lleno=_shut_esta_lleno(db, id_conjunto),
                puede_avisar_llegada=not presente
                and not _aviso_reciente(db, id_conjunto, current_user.id_usuario, "LLEGADA_RECICLADOR", minutos=120),
            )
        )
    return resultado
