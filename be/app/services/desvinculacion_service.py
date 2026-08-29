"""
Módulo: services/desvinculacion_service.py
Descripción: Lógica de negocio de la desvinculación y reasignación de conjuntos (RQF-016).
¿Para qué? Separar las 3 acciones del flujo:
           1. solicitar_desvinculacion: el Admin Conjunto pide dejar un conjunto.
           2. resolver_solicitud: el Admin Sistema aprueba o rechaza esa solicitud.
           3. asignar_conjunto_adicional: el Admin Sistema vincula un conjunto
              extra a un Admin Conjunto que ya existe en la plataforma.
"""

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.administrador_conjunto import AdministradorConjunto
from app.models.administrador_conjunto_asignacion import AdministradorConjuntoAsignacion
from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.notificacion import Notificacion, NotificacionDestinatario
from app.models.solicitud_desvinculacion import EstadoSolicitudDesvinculacion, SolicitudDesvinculacion
from app.models.usuario import Usuario
from app.schemas.desvinculacion import (
    AdministradorConjuntoResumenResponse,
    SolicitudDesvinculacionResponse,
)


def _crear_notificacion(
    db: Session, id_conjunto: UUID, id_usuario_destino: UUID, tipo: str, mensaje: str
) -> None:
    """
    ¿Qué? Crea una notificación de una sola persona, reutilizando el mismo
          modelo Notificacion/NotificacionDestinatario que ya usa el flujo
          de SHUT lleno/vacío (be/app/routers/notificaciones.py).
    ¿Para qué? No hace falta pasar por ese router (sus reglas son para
              Residente/Reciclador) — aquí el emisor siempre es el
              Admin Sistema y el destinatario siempre se conoce de antemano.
    """
    notif = Notificacion(
        tipo=tipo,
        id_conjunto_residencial=id_conjunto,
        mensaje=mensaje,
    )
    db.add(notif)
    db.flush()
    db.add(NotificacionDestinatario(id_notificacion=notif.id, id_usuario=id_usuario_destino))


def solicitar_desvinculacion(
    db: Session, administrador: AdministradorConjunto, id_conjunto: UUID, motivo: Optional[str]
) -> SolicitudDesvinculacion:
    """HU-022: el Admin Conjunto pide desvincularse de un conjunto que administra."""
    vinculo_activo = db.execute(
        select(AdministradorConjuntoAsignacion).where(
            AdministradorConjuntoAsignacion.id_administrador == administrador.id_administrador,
            AdministradorConjuntoAsignacion.id_conjunto_residencial == id_conjunto,
            AdministradorConjuntoAsignacion.fecha_desvinculacion.is_(None),
        )
    ).scalar_one_or_none()
    if not vinculo_activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No administras este conjunto residencial.",
        )

    # RN-002: no duplicar una solicitud pendiente para el mismo conjunto.
    ya_pendiente = db.execute(
        select(SolicitudDesvinculacion).where(
            SolicitudDesvinculacion.id_administrador == administrador.id_administrador,
            SolicitudDesvinculacion.id_conjunto_residencial == id_conjunto,
            SolicitudDesvinculacion.estado == EstadoSolicitudDesvinculacion.PENDIENTE,
        )
    ).scalar_one_or_none()
    if ya_pendiente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya tienes una solicitud de desvinculación pendiente para este conjunto.",
        )

    solicitud = SolicitudDesvinculacion(
        id_administrador=administrador.id_administrador,
        id_conjunto_residencial=id_conjunto,
        motivo=motivo,
        estado=EstadoSolicitudDesvinculacion.PENDIENTE,
    )
    db.add(solicitud)
    db.commit()
    db.refresh(solicitud)
    return solicitud


def listar_solicitudes_pendientes(db: Session) -> List[SolicitudDesvinculacionResponse]:
    """CA-023.1: el Admin Sistema ve todas las solicitudes pendientes, con el conjunto y quién la pidió."""
    stmt = (
        select(SolicitudDesvinculacion, ConjuntoResidencial, AdministradorConjunto)
        .join(
            ConjuntoResidencial,
            SolicitudDesvinculacion.id_conjunto_residencial == ConjuntoResidencial.id_conjunto_residencial,
        )
        .join(
            AdministradorConjunto,
            SolicitudDesvinculacion.id_administrador == AdministradorConjunto.id_administrador,
        )
        .where(SolicitudDesvinculacion.estado == EstadoSolicitudDesvinculacion.PENDIENTE)
        .order_by(SolicitudDesvinculacion.created_at)
    )
    filas = db.execute(stmt).all()
    return [
        SolicitudDesvinculacionResponse(
            id=solicitud.id,
            id_conjunto_residencial=conjunto.id_conjunto_residencial,
            nombre_conjunto=conjunto.nombre_conjunto,
            id_administrador=administrador.id_administrador,
            nombre_administrador=administrador.nombre,
            apellidos_administrador=administrador.apellidos,
            motivo=solicitud.motivo,
            estado=solicitud.estado,
            created_at=solicitud.created_at,
        )
        for solicitud, conjunto, administrador in filas
    ]


def resolver_solicitud(
    db: Session, id_solicitud: UUID, aprobar: bool, motivo_rechazo: Optional[str], resuelta_por: Usuario
) -> None:
    """HU-023: el Admin Sistema aprueba (desvincula de verdad) o rechaza (el admin sigue a cargo) una solicitud."""
    solicitud = db.execute(
        select(SolicitudDesvinculacion).where(SolicitudDesvinculacion.id == id_solicitud)
    ).scalar_one_or_none()
    if not solicitud:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La solicitud no existe.")
    if solicitud.estado != EstadoSolicitudDesvinculacion.PENDIENTE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta solicitud ya fue resuelta.")

    administrador = db.get(AdministradorConjunto, solicitud.id_administrador)
    conjunto = db.get(ConjuntoResidencial, solicitud.id_conjunto_residencial)

    ahora = datetime.now(timezone.utc)
    solicitud.resuelta_at = ahora
    solicitud.resuelta_por_id = resuelta_por.id_usuario

    if aprobar:
        vinculo_activo = db.execute(
            select(AdministradorConjuntoAsignacion).where(
                AdministradorConjuntoAsignacion.id_administrador == solicitud.id_administrador,
                AdministradorConjuntoAsignacion.id_conjunto_residencial == solicitud.id_conjunto_residencial,
                AdministradorConjuntoAsignacion.fecha_desvinculacion.is_(None),
            )
        ).scalar_one_or_none()
        # ¿Qué? Si por alguna razón el vínculo ya no está activo (ej: se
        #       desvinculó por otra vía mientras la solicitud esperaba),
        #       igual marcamos la solicitud como aprobada — no hay nada
        #       más que desvincular.
        if vinculo_activo:
            vinculo_activo.fecha_desvinculacion = ahora

        solicitud.estado = EstadoSolicitudDesvinculacion.APROBADA
        _crear_notificacion(
            db,
            id_conjunto=solicitud.id_conjunto_residencial,
            id_usuario_destino=administrador.id_usuario,
            tipo="DESVINCULACION_APROBADA",
            mensaje=f"Tu solicitud de desvinculación de {conjunto.nombre_conjunto} fue aprobada.",
        )
    else:
        solicitud.estado = EstadoSolicitudDesvinculacion.RECHAZADA
        solicitud.motivo_rechazo = motivo_rechazo
        _crear_notificacion(
            db,
            id_conjunto=solicitud.id_conjunto_residencial,
            id_usuario_destino=administrador.id_usuario,
            tipo="DESVINCULACION_RECHAZADA",
            mensaje=f"Tu solicitud de desvinculación de {conjunto.nombre_conjunto} fue rechazada: {motivo_rechazo}",
        )

    db.commit()


def buscar_administradores(db: Session, query: Optional[str]) -> List[AdministradorConjuntoResumenResponse]:
    """CA-024.1: busca Admin de Conjunto ya existentes en la plataforma, por nombre, apellidos o correo."""
    stmt = select(AdministradorConjunto).join(Usuario, AdministradorConjunto.id_usuario == Usuario.id_usuario)

    if query and query.strip():
        patron = f"%{query.strip().upper()}%"
        # ¿Qué? Se compara también contra "nombre + apellidos" concatenados.
        # ¿Para qué? Alguien busca típicamente el nombre completo ("ADMIN DE
        #           PRUEBA"), que no está completo en ninguno de los dos
        #           campos por separado — comparar solo nombre O apellidos
        #           por separado no encuentra ese caso.
        nombre_completo = func.concat(AdministradorConjunto.nombre, " ", AdministradorConjunto.apellidos)
        stmt = stmt.where(
            (AdministradorConjunto.nombre.ilike(patron))
            | (AdministradorConjunto.apellidos.ilike(patron))
            | (nombre_completo.ilike(patron))
            | (Usuario.correo_electronico.ilike(patron))
        )

    administradores = db.execute(stmt).scalars().unique().all()

    return [
        AdministradorConjuntoResumenResponse(
            id_administrador=admin.id_administrador,
            nombre=admin.nombre,
            apellidos=admin.apellidos,
            correo_electronico=admin.usuario.correo_electronico,
            # ¿Qué? admin.conjuntos ya filtra solo los vínculos activos
            #       (ver models/administrador_conjunto.py).
            conjuntos_actuales=[c.nombre_conjunto for c in admin.conjuntos],
        )
        for admin in administradores
    ]


def asignar_conjunto_adicional(db: Session, id_administrador: UUID, id_conjunto: UUID) -> None:
    """HU-024: el Admin Sistema vincula directamente un conjunto sin administrador a un Admin Conjunto existente."""
    administrador = db.get(AdministradorConjunto, id_administrador)
    if not administrador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El administrador no existe.")

    conjunto = db.execute(
        select(ConjuntoResidencial).where(
            ConjuntoResidencial.id_conjunto_residencial == id_conjunto,
            ConjuntoResidencial.verificado.is_(True),
        )
    ).scalar_one_or_none()
    if not conjunto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El conjunto no existe.")

    # RN-003: un conjunto no puede tener dos administradores activos.
    ya_tiene_admin = db.execute(
        select(AdministradorConjuntoAsignacion).where(
            AdministradorConjuntoAsignacion.id_conjunto_residencial == id_conjunto,
            AdministradorConjuntoAsignacion.fecha_desvinculacion.is_(None),
        )
    ).scalar_one_or_none()
    if ya_tiene_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este conjunto ya tiene un administrador activo.",
        )

    db.add(
        AdministradorConjuntoAsignacion(
            id_administrador=id_administrador,
            id_conjunto_residencial=id_conjunto,
        )
    )
    _crear_notificacion(
        db,
        id_conjunto=id_conjunto,
        id_usuario_destino=administrador.id_usuario,
        tipo="CONJUNTO_ASIGNADO",
        mensaje=f"Se te asignó un nuevo conjunto: {conjunto.nombre_conjunto}.",
    )
    db.commit()
