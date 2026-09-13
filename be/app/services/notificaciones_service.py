"""
Módulo: services/notificaciones_service.py
Descripción: Lógica de negocio de notificaciones (RQF-003, RQF-006, RQF-007).
¿Para qué? Issue #218 — antes, routers/notificaciones.py mezclaba el código
           que atiende la petición HTTP con las reglas de negocio reales
           (qué tipo de aviso puede mandar cada rol, control de presencia
           del reciclador, cooldown de 2 horas, candados de SHUT
           lleno/libre) — esas reglas ahora viven aquí, como el resto del
           proyecto (comunicados, novedades, auditorías, puntos de acopio).
¿Impacto? Las consultas de "quién debe recibir un aviso de este conjunto"
          siguen en services/notificaciones_helpers.py (auditoria_conjunto_
          service.py también las reutiliza) — este archivo solo mueve lo
          que era exclusivo de notificaciones.py.
"""

from datetime import datetime, timedelta, timezone
from typing import List
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import delete as sql_delete
from sqlalchemy import func as sqlfunc
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.notificacion import Notificacion, NotificacionDestinatario
from app.models.reciclador import Reciclador
from app.models.reciclador_conjunto import RecicladorConjunto
from app.models.residente import Residente
from app.models.rol import RolId
from app.models.unidad import Unidad
from app.models.usuario import Usuario
from app.schemas.notificacion import (
    EstadoRecicladorConjuntoResponse,
    EstadoShutResponse,
    NotificacionEnviarBody,
)
from app.services.notificaciones_helpers import admins_del_conjunto, reciclador_esta_presente, residentes_del_conjunto

TIPOS_VALIDOS = {"LLEGADA_RECICLADOR", "SHUT_LLENO", "SHUT_LIBRE", "FINALIZACION_RECICLADOR"}

MENSAJES = {
    "LLEGADA_RECICLADOR": "El reciclador ha llegado al conjunto y está listo para recoger el material reciclable.",
    "SHUT_LLENO": "El SHUT está lleno. El reciclador ha sido notificado.",
    "SHUT_LIBRE": "El SHUT ya está disponible — pueden bajar el material reciclable.",
    "FINALIZACION_RECICLADOR": "El reciclador finalizó la separación de residuos y ya se retiró del conjunto.",
}
MENSAJE_RESIDENTE_SHUT = "Un residente reportó que el SHUT está lleno."


# ── Helpers privados de este servicio ───────────────────────────────────────

def _recicladores_del_conjunto(db: Session, id_conjunto: UUID) -> list[UUID]:
    stmt = (
        select(Reciclador.id_usuario)
        .join(RecicladorConjunto, Reciclador.id_reciclador == RecicladorConjunto.id_reciclador)
        .where(
            RecicladorConjunto.id_conjunto_residencial == id_conjunto,
            RecicladorConjunto.fecha_revocacion.is_(None),
        )
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
    """¿Qué? Mismo criterio que usa estado_shut(): el SHUT está "lleno"
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


# ── Servicio ─────────────────────────────────────────────────────────────

def enviar_notificacion(db: Session, current_user: Usuario, body: NotificacionEnviarBody) -> dict:
    if body.tipo not in TIPOS_VALIDOS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Tipo inválido. Válidos: {sorted(TIPOS_VALIDOS)}")

    role_id = current_user.id_rol

    if role_id == RolId.RESIDENTE:
        if body.tipo != "SHUT_LLENO":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El residente solo puede enviar SHUT_LLENO.")
        id_conjunto = _conjunto_del_residente(db, current_user.id_usuario)
        if not id_conjunto:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No se encontró el conjunto del residente.")
        if _shut_esta_lleno(db, id_conjunto):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El SHUT de tu conjunto ya está reportado como lleno.")
        mensaje = MENSAJE_RESIDENTE_SHUT
        destinatarios = set(_recicladores_del_conjunto(db, id_conjunto) + admins_del_conjunto(db, id_conjunto))

    elif role_id == RolId.RECICLADOR:
        if not body.id_conjunto_residencial:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Se requiere id_conjunto_residencial.")
        id_conjunto = body.id_conjunto_residencial

        # Verificar que el reciclador está autorizado en ese conjunto
        # (fecha_revocacion IS NULL — uno ya revocado no cuenta).
        reciclador_id_stmt = select(Reciclador.id_reciclador).where(Reciclador.id_usuario == current_user.id_usuario)
        autorizado = db.execute(
            select(RecicladorConjunto).where(
                RecicladorConjunto.id_conjunto_residencial == id_conjunto,
                RecicladorConjunto.id_reciclador == reciclador_id_stmt.scalar_subquery(),
                RecicladorConjunto.fecha_revocacion.is_(None),
            )
        ).first()
        if not autorizado:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No estás autorizado en este conjunto.")

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
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ya avisaste tu llegada a este conjunto — avisa que ya te vas antes de volver a llegar.",
                )
            if _aviso_reciente(db, id_conjunto, current_user.id_usuario, "LLEGADA_RECICLADOR", minutos=120):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ya reportaste tu llegada a este conjunto hace menos de 2 horas.",
                )
        else:
            if not presente:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Debes avisar tu llegada a este conjunto antes de usar esta notificación.",
                )
            # ¿Qué? Mismo candado que ya protegía a SHUT_LLENO del lado del
            #       residente (_shut_esta_lleno) — ahora también aplica del
            #       lado del reciclador, y se agrega el simétrico para
            #       SHUT_LIBRE, que antes no tenía ningún candado.
            if body.tipo == "SHUT_LLENO" and _shut_esta_lleno(db, id_conjunto):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El SHUT de este conjunto ya está reportado como lleno.")
            if body.tipo == "SHUT_LIBRE" and not _shut_esta_lleno(db, id_conjunto):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El SHUT de este conjunto ya está reportado como libre.")

        mensaje = MENSAJES[body.tipo]
        destinatarios = set(residentes_del_conjunto(db, id_conjunto) + admins_del_conjunto(db, id_conjunto))

    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Rol no permitido.")

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


def listar_mis_notificaciones(db: Session, current_user: Usuario) -> List[dict]:
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


def contar_no_leidas(db: Session, current_user: Usuario) -> int:
    stmt = (
        select(sqlfunc.count())
        .select_from(NotificacionDestinatario)
        .where(
            NotificacionDestinatario.id_usuario == current_user.id_usuario,
            NotificacionDestinatario.leida.is_(False),
        )
    )
    return db.execute(stmt).scalar() or 0


def marcar_leida(db: Session, current_user: Usuario, id_notificacion: UUID) -> None:
    dest = db.execute(
        select(NotificacionDestinatario).where(
            NotificacionDestinatario.id_notificacion == id_notificacion,
            NotificacionDestinatario.id_usuario == current_user.id_usuario,
        )
    ).scalar_one_or_none()

    if not dest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notificación no encontrada.")

    if not dest.leida:
        dest.leida = True
        dest.leida_at = datetime.now(timezone.utc)
        db.commit()


def marcar_todas_leidas(db: Session, current_user: Usuario) -> int:
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
    return len(pendientes)


def limpiar_leidas(db: Session, current_user: Usuario) -> int:
    """Elimina del feed del usuario todas las notificaciones que ya leyó."""
    result = db.execute(
        sql_delete(NotificacionDestinatario).where(
            NotificacionDestinatario.id_usuario == current_user.id_usuario,
            NotificacionDestinatario.leida.is_(True),
        )
    )
    db.commit()
    return result.rowcount


def obtener_estado_shut(db: Session, current_user: Usuario) -> EstadoShutResponse:
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


def obtener_mi_estado_reciclador(db: Session, current_user: Usuario) -> List[EstadoRecicladorConjuntoResponse]:
    """
    ¿Qué? Para cada conjunto donde el reciclador en sesión está
          autorizado, indica si está presente ahí y si el SHUT de ese
          conjunto está lleno.
    ¿Para qué? El frontend usa esto para deshabilitar el botón de
              confirmar dentro del modal de "enviar notificación" ANTES
              de que el reciclador intente usarlo, con una explicación
              clara, en vez de que se entere del rechazo recién después
              de hacer clic (ver enviar_notificacion para las reglas
              reales que esto refleja).
    """
    if current_user.id_rol != RolId.RECICLADOR:
        return []

    reciclador_id_stmt = select(Reciclador.id_reciclador).where(Reciclador.id_usuario == current_user.id_usuario)
    ids_conjuntos = db.execute(
        select(RecicladorConjunto.id_conjunto_residencial).where(
            RecicladorConjunto.id_reciclador == reciclador_id_stmt.scalar_subquery(),
            RecicladorConjunto.fecha_revocacion.is_(None),
        )
    ).scalars().all()

    if not ids_conjuntos:
        return []

    # ¿Qué? Issue #219 (b6 del diagnóstico) — antes, por cada conjunto
    #       autorizado se hacían hasta 3 consultas separadas
    #       (reciclador_esta_presente, _shut_esta_lleno, _aviso_reciente):
    #       con 10 conjuntos, hasta 30 consultas en una sola petición.
    # ¿Para qué? Acá se traen TODAS las notificaciones relevantes de TODOS
    #           los conjuntos autorizados en solo 2 consultas — presencia
    #           y cooldown salen de la primera, SHUT lleno/libre de la
    #           segunda — y el resto del cálculo (agrupar por conjunto,
    #           quedarse con la más reciente) se hace en Python.
    # ¿Impacto? Mismo resultado que antes: cada helper sigue existiendo tal
    #           cual y se usa igual en los demás lugares que solo
    #           necesitan consultar UN conjunto a la vez (ej.
    #           enviar_notificacion), donde no hay ningún N+1 que resolver.
    filas_presencia = db.execute(
        select(Notificacion.id_conjunto_residencial, Notificacion.tipo, Notificacion.created_at)
        .where(
            Notificacion.id_conjunto_residencial.in_(ids_conjuntos),
            Notificacion.id_emisor == current_user.id_usuario,
            Notificacion.tipo.in_(["LLEGADA_RECICLADOR", "FINALIZACION_RECICLADOR"]),
        )
        .order_by(Notificacion.created_at.desc())
    ).all()

    filas_shut = db.execute(
        select(Notificacion.id_conjunto_residencial, Notificacion.tipo)
        .where(
            Notificacion.id_conjunto_residencial.in_(ids_conjuntos),
            Notificacion.tipo.in_(["SHUT_LLENO", "SHUT_LIBRE"]),
        )
        .order_by(Notificacion.created_at.desc())
    ).all()

    limite_cooldown = datetime.now(timezone.utc) - timedelta(minutes=120)

    resultado = []
    for id_conjunto in ids_conjuntos:
        # ¿Qué? filas_presencia ya viene ordenada por created_at desc — la
        #       primera fila de este conjunto es su acción más reciente
        #       (llegada o finalización), sin importar el cooldown.
        fila_mas_reciente = next((f for f in filas_presencia if f.id_conjunto_residencial == id_conjunto), None)
        presente = fila_mas_reciente is not None and fila_mas_reciente.tipo == "LLEGADA_RECICLADOR"

        # ¿Qué? Para el cooldown hace falta la ÚLTIMA llegada específicamente
        #       (no la última acción cualquiera) — puede ser una fila más
        #       vieja que fila_mas_reciente si la más reciente fue una
        #       finalización.
        ultima_llegada = next(
            (f for f in filas_presencia if f.id_conjunto_residencial == id_conjunto and f.tipo == "LLEGADA_RECICLADOR"),
            None,
        )
        aviso_reciente = ultima_llegada is not None and ultima_llegada.created_at > limite_cooldown

        fila_shut = next((f for f in filas_shut if f.id_conjunto_residencial == id_conjunto), None)
        shut_lleno = fila_shut is not None and fila_shut.tipo == "SHUT_LLENO"

        resultado.append(
            EstadoRecicladorConjuntoResponse(
                id_conjunto_residencial=id_conjunto,
                presente=presente,
                shut_lleno=shut_lleno,
                puede_avisar_llegada=not presente and not aviso_reciente,
            )
        )
    return resultado
