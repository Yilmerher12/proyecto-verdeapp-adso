"""
Módulo: services/notificaciones_helpers.py
Descripción: Consultas de "quién debe recibir una notificación de este
             conjunto" — antes vivían solo dentro de routers/notificaciones.py,
             ahora están aquí para que cualquier otro flujo que también
             necesite avisarle a residentes/administradores de un conjunto
             (ej. auditoría del reciclador) las reutilice en vez de
             duplicar la misma consulta SQL.
"""
from typing import Iterable, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.administrador_conjunto import AdministradorConjunto
from app.models.administrador_conjunto_asignacion import AdministradorConjuntoAsignacion
from app.models.notificacion import Notificacion, NotificacionDestinatario
from app.models.reciclador import Reciclador
from app.models.reciclador_conjunto import RecicladorConjunto
from app.models.residente import Residente
from app.models.unidad import Unidad


def residentes_del_conjunto(db: Session, id_conjunto: UUID) -> list[UUID]:
    stmt = (
        select(Residente.id_usuario)
        .join(Unidad, Residente.id_unidad == Unidad.id_unidad)
        .where(Unidad.id_conjunto_residencial == id_conjunto)
    )
    return [r[0] for r in db.execute(stmt).all()]


def recicladores_del_conjunto(db: Session, id_conjunto: UUID) -> list[UUID]:
    stmt = (
        select(Reciclador.id_usuario)
        .join(RecicladorConjunto, Reciclador.id_reciclador == RecicladorConjunto.id_reciclador)
        .where(
            RecicladorConjunto.id_conjunto_residencial == id_conjunto,
            # ¿Qué? fecha_revocacion IS NULL — un reciclador ya revocado
            #       de este conjunto no debe seguir recibiendo sus avisos.
            RecicladorConjunto.fecha_revocacion.is_(None),
        )
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


def crear_notificacion(
    db: Session,
    *,
    tipo: str,
    mensaje: str,
    destinatarios: Iterable[UUID],
    id_conjunto: Optional[UUID] = None,
    id_referencia: Optional[UUID] = None,
    id_emisor: Optional[UUID] = None,
) -> None:
    """
    ¿Qué? Issue #3 (hallazgo B4 de la auditoría) — el bloque "crear
          Notificacion, flush, agregar un NotificacionDestinatario por cada
          destinatario" estaba copiado en 6 servicios distintos. Cambia
          quién recibe el aviso, nunca cómo se guarda.
    ¿Para qué? Un solo lugar que arma la notificación — si el patrón
              cambia (ej. un campo nuevo), se cambia aquí una vez.
    ¿Impacto? Siempre crea la Notificacion, aunque `destinatarios` llegue
              vacío — enviar_notificacion (notificaciones_service.py) la
              usa también como registro de estado (ej. "¿el SHUT quedó
              lleno?" se responde mirando la última Notificacion de ese
              tipo, sin importar a quién le llegó). Los llamadores que sí
              quieren omitir una notificación sin destinatarios (evitar
              una fila sin nadie que la reciba) deben revisarlo ANTES de
              llamar esta función, no delegárselo a ella.
    """
    notif = Notificacion(
        tipo=tipo,
        id_conjunto_residencial=id_conjunto,
        id_referencia=id_referencia,
        id_emisor=id_emisor,
        mensaje=mensaje,
    )
    db.add(notif)
    db.flush()
    for id_usuario in destinatarios:
        db.add(NotificacionDestinatario(id_notificacion=notif.id, id_usuario=id_usuario))
