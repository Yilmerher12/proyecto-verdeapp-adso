"""
Módulo: services/novedad_service.py
Descripción: Lógica de negocio de novedades generales de la plataforma (RQF-015).
¿Para qué? Separar las 4 acciones del flujo:
           1. crear_novedad: el Admin Sistema publica un aviso nuevo.
           2. listar_todas: el Admin Sistema ve TODO el historial (activas
              y archivadas, CA-035.4).
           3. editar_novedad / archivar_novedad: gestión de una novedad.
           4. listar_feed: lo que ve Residente/Reciclador/Admin Conjunto —
              solo novedades activas dirigidas a su rol.
"""

from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.administrador_conjunto import AdministradorConjunto
from app.models.novedad import AlcanceNovedad, Novedad
from app.models.notificacion import Notificacion, NotificacionDestinatario
from app.models.reciclador import Reciclador
from app.models.residente import Residente
from app.models.rol import RolId
from app.models.usuario import Usuario
from app.schemas.novedad import CrearNovedadRequest, EditarNovedadRequest, NovedadResponse

# ¿Qué? El RF no define plazos distintos por tipo (a diferencia de
#       Comunicados) — solo dice "el sistema sugiere una fecha, editable".
DIAS_EXPIRACION_SUGERIDA = 30


def _esta_archivada(novedad: Novedad) -> bool:
    """RN-004/CA-035.2: archivada manualmente O ya venció (sin necesidad de un job en segundo plano)."""
    return novedad.fecha_archivado is not None or novedad.fecha_expiracion < datetime.now(timezone.utc)


def _a_response(novedad: Novedad) -> NovedadResponse:
    return NovedadResponse(
        id_novedad=novedad.id_novedad,
        alcance=novedad.alcance,
        texto=novedad.texto,
        url_adjunto=novedad.url_adjunto,
        fecha_expiracion=novedad.fecha_expiracion,
        created_at=novedad.created_at,
        editado=novedad.fecha_edicion is not None,
        archivada=_esta_archivada(novedad),
    )


def _destinatarios_por_alcance(db: Session, alcance: str) -> set[int]:
    """
    ¿Qué? A diferencia de Comunicados (que filtra por conjunto), aquí el
          alcance es de toda la plataforma — "todos los residentes" son
          TODOS los residentes de TODOS los conjuntos, no de uno solo.
    """
    ids: set[int] = set()
    if alcance in (AlcanceNovedad.TODOS, AlcanceNovedad.RESIDENTES):
        ids.update(r[0] for r in db.execute(select(Residente.id_usuario)).all())
    if alcance in (AlcanceNovedad.TODOS, AlcanceNovedad.RECICLADORES):
        ids.update(r[0] for r in db.execute(select(Reciclador.id_usuario)).all())
    if alcance in (AlcanceNovedad.TODOS, AlcanceNovedad.ADMIN_CONJUNTO):
        ids.update(r[0] for r in db.execute(select(AdministradorConjunto.id_usuario)).all())
    return ids


def _notificar_novedad(db: Session, novedad: Novedad, tipo: str, mensaje: str) -> None:
    """HU-031-equivalente para novedades: notifica solo a los roles del alcance elegido (CA-032.4)."""
    destinatarios_ids = _destinatarios_por_alcance(db, novedad.alcance)
    if not destinatarios_ids:
        return

    # ¿Qué? id_conjunto_residencial queda en None a propósito — esta
    #       notificación no pertenece a ningún conjunto (ver
    #       models/notificacion.py, columna ahora opcional).
    notif = Notificacion(tipo=tipo, id_conjunto_residencial=None, mensaje=mensaje)
    db.add(notif)
    db.flush()
    for uid in destinatarios_ids:
        db.add(NotificacionDestinatario(id_notificacion=notif.id, id_usuario=uid))


def crear_novedad(db: Session, admin_usuario: Usuario, datos: CrearNovedadRequest) -> NovedadResponse:
    expiracion = datos.fecha_expiracion or (
        datetime.now(timezone.utc) + timedelta(days=DIAS_EXPIRACION_SUGERIDA)
    )

    novedad = Novedad(
        id_admin_sistema=admin_usuario.id_usuario,
        alcance=datos.alcance,
        texto=datos.texto,
        url_adjunto=datos.url_adjunto,
        fecha_expiracion=expiracion,
    )
    db.add(novedad)
    db.flush()

    _notificar_novedad(db, novedad, "NOVEDAD_NUEVA", f"Nueva novedad: {novedad.texto[:120]}")

    db.commit()
    db.refresh(novedad)
    return _a_response(novedad)


def listar_todas(db: Session) -> List[NovedadResponse]:
    """CA-035.4: el Admin Sistema ve el historial completo, activas y archivadas."""
    stmt = select(Novedad).order_by(Novedad.created_at.desc())
    return [_a_response(n) for n in db.execute(stmt).scalars().all()]


def _obtener_o_404(db: Session, id_novedad: int) -> Novedad:
    novedad = db.get(Novedad, id_novedad)
    if not novedad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La novedad no existe.")
    return novedad


def editar_novedad(db: Session, id_novedad: int, datos: EditarNovedadRequest) -> NovedadResponse:
    novedad = _obtener_o_404(db, id_novedad)

    novedad.texto = datos.texto
    novedad.url_adjunto = datos.url_adjunto
    # ¿Qué? Si no se manda una fecha nueva, se conserva la actual — a
    #       diferencia de Comunicados, aquí no hay un "tipo" que recalcular.
    novedad.fecha_expiracion = datos.fecha_expiracion or novedad.fecha_expiracion
    novedad.fecha_edicion = datetime.now(timezone.utc)

    # ¿Qué? Reenvía la notificación a los mismos roles del alcance
    #       original, igual que ya se acordó para Comunicados — cualquier
    #       edición guardada avisa de nuevo.
    _notificar_novedad(db, novedad, "NOVEDAD_ACTUALIZADA", f"Novedad actualizada: {novedad.texto[:120]}")

    db.commit()
    db.refresh(novedad)
    return _a_response(novedad)


def archivar_novedad(db: Session, id_novedad: int) -> None:
    """HU-035 (CA-035.1): archivado manual — no se puede reactivar (CA-035.3), así que no hay "desarchivar"."""
    novedad = _obtener_o_404(db, id_novedad)
    if novedad.fecha_archivado is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta novedad ya está archivada.")
    novedad.fecha_archivado = datetime.now(timezone.utc)
    db.commit()


def listar_feed(db: Session, current_user: Usuario) -> List[NovedadResponse]:
    """HU-033: solo novedades activas (no vencidas, no archivadas) dirigidas al rol de quien consulta (CA-033.1/CA-033.2)."""
    if current_user.id_rol == RolId.RESIDENTE:
        alcances = (AlcanceNovedad.TODOS, AlcanceNovedad.RESIDENTES)
    elif current_user.id_rol == RolId.RECICLADOR:
        alcances = (AlcanceNovedad.TODOS, AlcanceNovedad.RECICLADORES)
    elif current_user.id_rol == RolId.ADMIN_CONJUNTO:
        alcances = (AlcanceNovedad.TODOS, AlcanceNovedad.ADMIN_CONJUNTO)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Este feed no aplica a tu rol.")

    ahora = datetime.now(timezone.utc)
    stmt = (
        select(Novedad)
        .where(
            Novedad.alcance.in_(alcances),
            Novedad.fecha_expiracion >= ahora,
            Novedad.fecha_archivado.is_(None),
        )
        .order_by(Novedad.created_at.desc())
    )
    return [_a_response(n) for n in db.execute(stmt).scalars().all()]
