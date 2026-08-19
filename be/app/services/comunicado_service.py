"""
Módulo: services/comunicado_service.py
Descripción: Lógica de negocio de comunicados del conjunto (RQF-014).
¿Para qué? Separar las 4 acciones del flujo:
           1. crear_comunicado: el Admin Conjunto publica un aviso nuevo.
           2. listar_mis_comunicados: el Admin Conjunto ve todo lo que ha
              publicado (para poder editar/eliminar), en todos sus conjuntos.
           3. editar_comunicado / eliminar_comunicado: gestión de un comunicado propio.
           4. listar_feed: lo que ve un Residente o Reciclador — solo
              comunicados activos dirigidos a su rol.
"""

from datetime import date, datetime, time, timedelta, timezone
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.administrador_conjunto import AdministradorConjunto
from app.models.administrador_conjunto_asignacion import AdministradorConjuntoAsignacion
from app.models.comunicado import Comunicado, DestinatariosComunicado, TipoComunicado
from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.notificacion import Notificacion, NotificacionDestinatario
from app.models.reciclador import Reciclador
from app.models.residente import Residente
from app.models.rol import RolId
from app.models.tablas_asociacion import recicladores_conjuntos
from app.models.unidad import Unidad
from app.models.usuario import Usuario
from app.schemas.comunicado import ComunicadoResponse, CrearComunicadoRequest, EditarComunicadoRequest

# ¿Qué? Expiración sugerida por tipo (RF, tabla "Tipos de comunicado").
_EXPIRACION_POR_TIPO = {
    TipoComunicado.INFORMATIVO: timedelta(days=30),
    TipoComunicado.URGENTE: timedelta(hours=48),
    TipoComunicado.MANTENIMIENTO: timedelta(days=7),
    TipoComunicado.RECICLAJE: timedelta(days=14),
}


def _calcular_expiracion_sugerida(tipo: TipoComunicado, fecha_evento: Optional[date]) -> datetime:
    """
    ¿Qué? CA-027.3 — la fecha de expiración sugerida según el tipo.
    ¿Para qué? Convocatoria es un caso especial: no tiene una duración fija,
              expira "al día siguiente del evento", así que necesita
              fecha_evento para poder calcularla.
    """
    ahora = datetime.now(timezone.utc)

    if tipo == TipoComunicado.CONVOCATORIA:
        if not fecha_evento:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Los comunicados de tipo Convocatoria necesitan la fecha del evento.",
            )
        return datetime.combine(fecha_evento, time.min, tzinfo=timezone.utc) + timedelta(days=1)

    return ahora + _EXPIRACION_POR_TIPO[tipo]


def _verificar_administra_conjunto(db: Session, administrador: AdministradorConjunto, id_conjunto: int) -> None:
    """RN-005 / CA-027.6 / CA-029.4 / CA-030.4: solo se puede operar sobre conjuntos propios."""
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


def _obtener_comunicado_propio(db: Session, administrador: AdministradorConjunto, id_comunicado: int) -> Comunicado:
    comunicado = db.get(Comunicado, id_comunicado)
    if not comunicado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El comunicado no existe.")
    _verificar_administra_conjunto(db, administrador, comunicado.id_conjunto_residencial)
    return comunicado


def _a_response(comunicado: Comunicado, nombre_conjunto: str) -> ComunicadoResponse:
    return ComunicadoResponse(
        id_comunicado=comunicado.id_comunicado,
        id_conjunto_residencial=comunicado.id_conjunto_residencial,
        nombre_conjunto=nombre_conjunto,
        destinatarios=comunicado.destinatarios,
        tipo=comunicado.tipo,
        texto=comunicado.texto,
        url_adjunto=comunicado.url_adjunto,
        fecha_evento=comunicado.fecha_evento,
        fecha_expiracion=comunicado.fecha_expiracion,
        created_at=comunicado.created_at,
        editado=comunicado.fecha_edicion is not None,
    )


def _residentes_del_conjunto(db: Session, id_conjunto: int) -> list[int]:
    stmt = (
        select(Residente.id_usuario)
        .join(Unidad, Residente.id_unidad == Unidad.id_unidad)
        .where(Unidad.id_conjunto_residencial == id_conjunto)
    )
    return [r[0] for r in db.execute(stmt).all()]


def _recicladores_del_conjunto(db: Session, id_conjunto: int) -> list[int]:
    stmt = (
        select(Reciclador.id_usuario)
        .join(recicladores_conjuntos, Reciclador.id_reciclador == recicladores_conjuntos.c.id_reciclador)
        .where(recicladores_conjuntos.c.id_conjunto_residencial == id_conjunto)
    )
    return [r[0] for r in db.execute(stmt).all()]


def _notificar_comunicado(db: Session, comunicado: Comunicado, tipo: str, mensaje: str) -> None:
    """
    ¿Qué? Notifica a los destinatarios elegidos del comunicado (CA-031.2:
          nunca a quien no fue elegido) — se usa tanto al publicar (HU-031)
          como al editar (RN nueva: reenviar aviso de que un comunicado
          activo cambió, para que quien ya lo leyó sepa que hay una
          actualización).
    ¿Para qué? El destinatario del comunicado NUNCA cambia al editar (ver
              editar_comunicado / CA-029.2), así que la misma lógica de
              "a quién le llega" sirve para ambos casos.
    """
    destinatarios_ids: set[int] = set()
    if comunicado.destinatarios in (DestinatariosComunicado.RESIDENTES, DestinatariosComunicado.AMBOS):
        destinatarios_ids.update(_residentes_del_conjunto(db, comunicado.id_conjunto_residencial))
    if comunicado.destinatarios in (DestinatariosComunicado.RECICLADORES, DestinatariosComunicado.AMBOS):
        destinatarios_ids.update(_recicladores_del_conjunto(db, comunicado.id_conjunto_residencial))

    if not destinatarios_ids:
        return

    notif = Notificacion(
        tipo=tipo,
        id_conjunto_residencial=comunicado.id_conjunto_residencial,
        mensaje=mensaje,
    )
    db.add(notif)
    db.flush()
    for uid in destinatarios_ids:
        db.add(NotificacionDestinatario(id_notificacion=notif.id, id_usuario=uid))


def crear_comunicado(db: Session, administrador: AdministradorConjunto, datos: CrearComunicadoRequest) -> ComunicadoResponse:
    _verificar_administra_conjunto(db, administrador, datos.id_conjunto_residencial)

    expiracion = datos.fecha_expiracion or _calcular_expiracion_sugerida(datos.tipo, datos.fecha_evento)

    comunicado = Comunicado(
        id_conjunto_residencial=datos.id_conjunto_residencial,
        id_administrador=administrador.id_administrador,
        destinatarios=datos.destinatarios,
        tipo=datos.tipo,
        texto=datos.texto,
        url_adjunto=datos.url_adjunto,
        fecha_evento=datos.fecha_evento,
        fecha_expiracion=expiracion,
    )
    db.add(comunicado)
    db.flush()

    _notificar_comunicado(db, comunicado, "COMUNICADO_NUEVO", f"Nuevo comunicado: {comunicado.texto[:120]}")

    db.commit()
    db.refresh(comunicado)

    conjunto = db.get(ConjuntoResidencial, comunicado.id_conjunto_residencial)
    return _a_response(comunicado, conjunto.nombre_conjunto)


def listar_mis_comunicados(db: Session, administrador: AdministradorConjunto) -> List[ComunicadoResponse]:
    """
    ¿Qué? Todo lo que el Admin Conjunto ha publicado, en TODOS los
          conjuntos que administra — activos y ya vencidos, porque sigue
          siendo su historial y debe poder gestionarlo (editar/eliminar).
    """
    stmt = (
        select(Comunicado, ConjuntoResidencial.nombre_conjunto)
        .join(ConjuntoResidencial, Comunicado.id_conjunto_residencial == ConjuntoResidencial.id_conjunto_residencial)
        .join(
            AdministradorConjuntoAsignacion,
            AdministradorConjuntoAsignacion.id_conjunto_residencial == Comunicado.id_conjunto_residencial,
        )
        .where(
            AdministradorConjuntoAsignacion.id_administrador == administrador.id_administrador,
            AdministradorConjuntoAsignacion.fecha_desvinculacion.is_(None),
        )
        .order_by(Comunicado.created_at.desc())
    )
    filas = db.execute(stmt).all()
    return [_a_response(comunicado, nombre) for comunicado, nombre in filas]


def editar_comunicado(
    db: Session, administrador: AdministradorConjunto, id_comunicado: int, datos: EditarComunicadoRequest
) -> ComunicadoResponse:
    comunicado = _obtener_comunicado_propio(db, administrador, id_comunicado)

    comunicado.tipo = datos.tipo
    comunicado.texto = datos.texto
    comunicado.url_adjunto = datos.url_adjunto
    comunicado.fecha_evento = datos.fecha_evento
    comunicado.fecha_expiracion = datos.fecha_expiracion or _calcular_expiracion_sugerida(datos.tipo, datos.fecha_evento)
    comunicado.fecha_edicion = datetime.now(timezone.utc)

    # ¿Qué? Reenvía la notificación a los mismos destinatarios originales
    #       (el destinatario nunca cambia al editar, CA-029.2) cada vez que
    #       se guarda una edición — así quien ya lo había leído se entera
    #       de que hubo un cambio.
    _notificar_comunicado(
        db, comunicado, "COMUNICADO_ACTUALIZADO", f"Comunicado actualizado: {comunicado.texto[:120]}"
    )

    db.commit()
    db.refresh(comunicado)

    conjunto = db.get(ConjuntoResidencial, comunicado.id_conjunto_residencial)
    return _a_response(comunicado, conjunto.nombre_conjunto)


def eliminar_comunicado(db: Session, administrador: AdministradorConjunto, id_comunicado: int) -> None:
    comunicado = _obtener_comunicado_propio(db, administrador, id_comunicado)
    db.delete(comunicado)
    db.commit()


def listar_feed(db: Session, current_user: Usuario) -> List[ComunicadoResponse]:
    """
    ¿Qué? HU-028 — lo que ve un Residente o Reciclador: solo comunicados
          ACTIVOS (fecha_expiracion futura, RN-004/CA-028.3) dirigidos a
          su rol, de su(s) propio(s) conjunto(s) (CA-028.4).
    ¿Para qué? Un residente vive en UN conjunto; un reciclador puede estar
              autorizado en VARIOS — a diferencia del residente, aquí se
              consultan todos los conjuntos donde el reciclador está
              autorizado, no solo uno.
    ¿Impacto? Urgente primero (CA-028.2), y dentro de cada grupo, del más
              reciente al más antiguo.
    """
    ahora = datetime.now(timezone.utc)

    if current_user.id_rol == RolId.RESIDENTE:
        stmt_conjuntos = (
            select(Unidad.id_conjunto_residencial)
            .join(Residente, Unidad.id_unidad == Residente.id_unidad)
            .where(Residente.id_usuario == current_user.id_usuario)
        )
        ids_conjuntos = list(db.execute(stmt_conjuntos).scalars().all())
        destinatarios_validos = (DestinatariosComunicado.RESIDENTES, DestinatariosComunicado.AMBOS)
    elif current_user.id_rol == RolId.RECICLADOR:
        stmt_conjuntos = (
            select(recicladores_conjuntos.c.id_conjunto_residencial)
            .join(Reciclador, Reciclador.id_reciclador == recicladores_conjuntos.c.id_reciclador)
            .where(Reciclador.id_usuario == current_user.id_usuario)
        )
        ids_conjuntos = list(db.execute(stmt_conjuntos).scalars().all())
        destinatarios_validos = (DestinatariosComunicado.RECICLADORES, DestinatariosComunicado.AMBOS)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Este feed es solo para residentes y recicladores.")

    if not ids_conjuntos:
        return []

    stmt = (
        select(Comunicado, ConjuntoResidencial.nombre_conjunto)
        .join(ConjuntoResidencial, Comunicado.id_conjunto_residencial == ConjuntoResidencial.id_conjunto_residencial)
        .where(
            Comunicado.id_conjunto_residencial.in_(ids_conjuntos),
            Comunicado.destinatarios.in_(destinatarios_validos),
            Comunicado.fecha_expiracion >= ahora,
        )
        # ¿Qué? Urgente primero (CA-028.2), y dentro de cada grupo del más
        #       reciente al más antiguo.
        .order_by((Comunicado.tipo == TipoComunicado.URGENTE).desc(), Comunicado.created_at.desc())
    )
    filas = db.execute(stmt).all()
    return [_a_response(comunicado, nombre) for comunicado, nombre in filas]
