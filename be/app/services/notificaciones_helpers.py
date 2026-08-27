"""
Módulo: services/notificaciones_helpers.py
Descripción: Consultas de "quién debe recibir una notificación de este
             conjunto" — antes vivían solo dentro de routers/notificaciones.py,
             ahora están aquí para que cualquier otro flujo que también
             necesite avisarle a residentes/administradores de un conjunto
             (ej. auditoría del reciclador) las reutilice en vez de
             duplicar la misma consulta SQL.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.administrador_conjunto import AdministradorConjunto
from app.models.administrador_conjunto_asignacion import AdministradorConjuntoAsignacion
from app.models.residente import Residente
from app.models.unidad import Unidad


def residentes_del_conjunto(db: Session, id_conjunto: int) -> list[int]:
    stmt = (
        select(Residente.id_usuario)
        .join(Unidad, Residente.id_unidad == Unidad.id_unidad)
        .where(Unidad.id_conjunto_residencial == id_conjunto)
    )
    return [r[0] for r in db.execute(stmt).all()]


def admins_del_conjunto(db: Session, id_conjunto: int) -> list[int]:
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
