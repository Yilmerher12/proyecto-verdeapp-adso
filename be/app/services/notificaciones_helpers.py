"""
Módulo: services/notificaciones_helpers.py
Descripción: Consultas de "quién debe recibir una notificación de este
             conjunto" — antes vivían solo dentro de routers/notificaciones.py,
             ahora están aquí para que cualquier otro flujo que también
             necesite avisarle a residentes/administradores de un conjunto
             (ej. auditoría del reciclador) las reutilice en vez de
             duplicar la misma consulta SQL.
"""
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.administrador_conjunto import AdministradorConjunto
from app.models.administrador_conjunto_asignacion import AdministradorConjuntoAsignacion
from app.models.notificacion import Notificacion
from app.models.residente import Residente
from app.models.unidad import Unidad


def residentes_del_conjunto(db: Session, id_conjunto: UUID) -> list[UUID]:
    stmt = (
        select(Residente.id_usuario)
        .join(Unidad, Residente.id_unidad == Unidad.id_unidad)
        .where(Unidad.id_conjunto_residencial == id_conjunto)
    )
    return [r[0] for r in db.execute(stmt).all()]


def admins_del_conjunto(db: Session, id_conjunto: UUID) -> list[UUID]:
    stmt = (
        select(AdministradorConjunto.id_usuario)
        .join(
            AdministradorConjuntoAsignacion,
            AdministradorConjunto.id_administrador == AdministradorConjuntoAsignacion.id_administrador,
        )
        .where(
            AdministradorConjuntoAsignacion.id_conjunto_residencial == id_conjunto,
            # ¿Qué? Solo el vínculo activo — un admin ya desvinculado
            #       (RQF-016) no debe seguir recibiendo notificaciones
            #       del conjunto que dejó.
            AdministradorConjuntoAsignacion.fecha_desvinculacion.is_(None),
        )
    )
    return [r[0] for r in db.execute(stmt).all()]


def reciclador_esta_presente(db: Session, id_conjunto: UUID, id_usuario_reciclador: UUID) -> bool:
    """
    ¿Qué? ¿Este reciclador está actualmente presente en este conjunto?
          Se responde mirando cuál fue su ÚLTIMO aviso de LLEGADA_RECICLADOR
          o FINALIZACION_RECICLADOR para ese conjunto: si fue una llegada,
          sigue presente; si fue una finalización, o nunca avisó nada, no
          está presente. Mismo criterio que ya usa `_shut_esta_lleno` en
          routers/notificaciones.py, pero mirando "el más reciente de estos
          dos tipos" en vez de SHUT_LLENO/SHUT_LIBRE.
    ¿Para qué? Las notificaciones "SHUT está lleno/libre" y "Finalicé
              separación", además de auditar un conjunto, solo tienen
              sentido con el reciclador físicamente ahí — antes de esto,
              se podían usar en cualquier momento, sin haber avisado
              llegada primero.
    ¿Impacto? Se filtra también por `id_emisor` (este reciclador puntual),
             a diferencia de `_shut_esta_lleno` — la presencia es por
             persona, no por conjunto: dos recicladores distintos pueden
             estar, o no, presentes en el mismo conjunto al mismo tiempo.
    """
    stmt = (
        select(Notificacion.tipo)
        .where(
            Notificacion.id_conjunto_residencial == id_conjunto,
            Notificacion.id_emisor == id_usuario_reciclador,
            Notificacion.tipo.in_(["LLEGADA_RECICLADOR", "FINALIZACION_RECICLADOR"]),
        )
        .order_by(Notificacion.created_at.desc())
        .limit(1)
    )
    ultimo_tipo = db.execute(stmt).scalar_one_or_none()
    return ultimo_tipo == "LLEGADA_RECICLADOR"
