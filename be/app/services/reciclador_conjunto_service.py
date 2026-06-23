"""
Módulo: services/reciclador_conjunto_service.py
Descripción: Lógica de negocio para invitar Recicladores a Conjuntos Residenciales.
¿Para qué? El Admin de Conjunto invita a un Reciclador YA REGISTRADO a trabajar
           en su conjunto. El Reciclador acepta o rechaza desde su propia sesión.
¿Impacto? Al aceptar, se crea la fila en recicladores_conjuntos — la tabla de
          "parejas" que ya existía en el esquema desde el inicio, pero que
          nunca estuvo conectada a ningún flujo real hasta ahora.
"""

import uuid
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.models.reciclador import Reciclador
from app.models.usuario import Usuario
from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.administrador_conjunto_asignacion import AdministradorConjuntoAsignacion
from app.models.administrador_conjunto import AdministradorConjunto
from app.models.invitacion_reciclador_conjunto import InvitacionRecicladorConjunto
from app.utils.email import send_reciclador_conjunto_invitation_email


def _verificar_admin_administra_conjunto(db: Session, id_usuario_admin: int, id_conjunto: int) -> None:
    """
    ¿Qué? Confirma que el usuario que hace la invitación SÍ administra
          ese conjunto específico — un Admin de Conjunto no puede invitar
          recicladores a conjuntos que no le pertenecen.
    ¿Para qué? Seguridad: sin esta validación, cualquier Admin de Conjunto
              autenticado podría invitar recicladores a CUALQUIER conjunto
              del sistema, no solo a los suyos.
    """
    stmt_admin = select(AdministradorConjunto).where(AdministradorConjunto.id_usuario == id_usuario_admin)
    administrador = db.execute(stmt_admin).scalar_one_or_none()

    if not administrador:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes perfil de Administrador de Conjunto.")

    stmt_asignacion = select(AdministradorConjuntoAsignacion).where(
        AdministradorConjuntoAsignacion.id_administrador == administrador.id_administrador,
        AdministradorConjuntoAsignacion.id_conjunto_residencial == id_conjunto,
    )
    asignacion = db.execute(stmt_asignacion).scalar_one_or_none()

    if not asignacion:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No administras este conjunto residencial.",
        )


async def invitar_reciclador(db: Session, id_usuario_admin: int, correo_reciclador: str, id_conjunto: int) -> InvitacionRecicladorConjunto:
    """Crea la invitación y envía el correo al Reciclador."""
    _verificar_admin_administra_conjunto(db, id_usuario_admin, id_conjunto)

    stmt_usuario = select(Usuario).where(Usuario.correo_electronico == correo_reciclador, Usuario.id_rol == 3)
    usuario_reciclador = db.execute(stmt_usuario).scalar_one_or_none()

    if not usuario_reciclador:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No existe ningún Reciclador registrado con ese correo.",
        )

    stmt_reciclador = select(Reciclador).where(Reciclador.id_usuario == usuario_reciclador.id_usuario)
    reciclador = db.execute(stmt_reciclador).scalar_one_or_none()

    if not reciclador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil de reciclador incompleto.")

    # ¿Qué? Verifica que no exista ya una autorización activa o invitación pendiente.
    stmt_ya_autorizado = text(
        "SELECT 1 FROM recicladores_conjuntos WHERE id_reciclador = :rid AND id_conjunto_residencial = :cid"
    )
    ya_autorizado = db.execute(stmt_ya_autorizado, {"rid": reciclador.id_reciclador, "cid": id_conjunto}).first()
    if ya_autorizado:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este reciclador ya está autorizado en tu conjunto.")

    stmt_pendiente = select(InvitacionRecicladorConjunto).where(
        InvitacionRecicladorConjunto.id_reciclador == reciclador.id_reciclador,
        InvitacionRecicladorConjunto.id_conjunto_residencial == id_conjunto,
        InvitacionRecicladorConjunto.estado == "PENDIENTE",
    )
    invitacion_existente = db.execute(stmt_pendiente).scalar_one_or_none()
    if invitacion_existente:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe una invitación pendiente para este reciclador.")

    nueva_invitacion = InvitacionRecicladorConjunto(
        id=str(uuid.uuid4()),
        id_reciclador=reciclador.id_reciclador,
        id_conjunto_residencial=id_conjunto,
        invitado_por_id=id_usuario_admin,
        estado="PENDIENTE",
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(nueva_invitacion)
    db.commit()
    db.refresh(nueva_invitacion)

    stmt_conjunto = select(ConjuntoResidencial).where(ConjuntoResidencial.id_conjunto_residencial == id_conjunto)
    conjunto = db.execute(stmt_conjunto).scalar_one_or_none()

    try:
        await send_reciclador_conjunto_invitation_email(
            email=usuario_reciclador.correo_electronico,
            nombre_conjunto=conjunto.nombre_conjunto if conjunto else "tu conjunto",
        )
    except Exception as email_err:
        print(f"Advertencia: invitación creada, pero el correo no se pudo despachar: {str(email_err)}")

    return nueva_invitacion


def listar_invitaciones_de_mi_conjunto(db: Session, id_usuario_admin: int, id_conjunto: int) -> list[dict]:
    """Lista todas las invitaciones (de cualquier estado) que un Admin de Conjunto envió a SU conjunto."""
    _verificar_admin_administra_conjunto(db, id_usuario_admin, id_conjunto)

    stmt = text("""
        SELECT
            irc.id,
            r.nombre AS nombre_reciclador,
            r.apellidos AS apellidos_reciclador,
            u.correo_electronico AS correo_reciclador,
            cr.nombre_conjunto,
            irc.estado,
            irc.created_at
        FROM invitaciones_reciclador_conjunto irc
        JOIN recicladores r ON r.id_reciclador = irc.id_reciclador
        JOIN usuarios u ON u.id_usuario = r.id_usuario
        JOIN conjuntos_residenciales cr ON cr.id_conjunto_residencial = irc.id_conjunto_residencial
        WHERE irc.id_conjunto_residencial = :cid
        ORDER BY irc.created_at DESC
    """)
    resultados = db.execute(stmt, {"cid": id_conjunto}).mappings().all()
    return [dict(fila) for fila in resultados]


def listar_invitaciones_pendientes_del_reciclador(db: Session, id_usuario_reciclador: int) -> list[dict]:
    """Lista las invitaciones PENDIENTES que recibió un Reciclador, para que las acepte o rechace."""
    stmt_reciclador = select(Reciclador).where(Reciclador.id_usuario == id_usuario_reciclador)
    reciclador = db.execute(stmt_reciclador).scalar_one_or_none()

    if not reciclador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil de reciclador no encontrado.")

    stmt = text("""
        SELECT
            irc.id,
            cr.nombre_conjunto,
            cr.direccion AS direccion_conjunto,
            (ac.nombre || ' ' || ac.apellidos) AS invitado_por_nombre,
            irc.estado,
            irc.expires_at
        FROM invitaciones_reciclador_conjunto irc
        JOIN conjuntos_residenciales cr ON cr.id_conjunto_residencial = irc.id_conjunto_residencial
        JOIN administradores_conjunto ac ON ac.id_usuario = irc.invitado_por_id
        WHERE irc.id_reciclador = :rid AND irc.estado = 'PENDIENTE'
        ORDER BY irc.created_at DESC
    """)
    resultados = db.execute(stmt, {"rid": reciclador.id_reciclador}).mappings().all()
    return [dict(fila) for fila in resultados]


def responder_invitacion(db: Session, id_usuario_reciclador: int, id_invitacion: str, aceptar: bool) -> bool:
    """
    ¿Qué? El Reciclador acepta o rechaza una invitación pendiente.
    ¿Para qué? Si acepta, se crea la fila real en recicladores_conjuntos
              (la tabla de "parejas" que ya existía sin usarse). Si
              rechaza, solo se actualiza el estado para que el Admin de
              Conjunto sepa que debe buscar a otro reciclador.
    ¿Impacto? Valida que la invitación pertenezca al reciclador autenticado
              — sin esto, cualquiera podría aceptar invitaciones ajenas.
    """
    stmt_reciclador = select(Reciclador).where(Reciclador.id_usuario == id_usuario_reciclador)
    reciclador = db.execute(stmt_reciclador).scalar_one_or_none()

    if not reciclador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil de reciclador no encontrado.")

    stmt_invitacion = select(InvitacionRecicladorConjunto).where(
        InvitacionRecicladorConjunto.id == id_invitacion,
        InvitacionRecicladorConjunto.id_reciclador == reciclador.id_reciclador,
    )
    invitacion = db.execute(stmt_invitacion).scalar_one_or_none()

    if not invitacion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitación no encontrada.")

    if invitacion.estado != "PENDIENTE":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta invitación ya fue respondida.")

    current_time = datetime.now(timezone.utc) if invitacion.expires_at.tzinfo else datetime.now()
    if invitacion.expires_at < current_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta invitación ha expirado.")

    if aceptar:
        invitacion.estado = "ACEPTADA"
        stmt_insert = text(
            "INSERT INTO recicladores_conjuntos (id_reciclador, id_conjunto_residencial) "
            "VALUES (:rid, :cid) ON CONFLICT DO NOTHING"
        )
        db.execute(stmt_insert, {"rid": reciclador.id_reciclador, "cid": invitacion.id_conjunto_residencial})
    else:
        invitacion.estado = "RECHAZADA"

    db.commit()
    return True


def listar_conjuntos_autorizados(db: Session, id_usuario_reciclador: int) -> list[dict]:
    """Lista los conjuntos donde el Reciclador YA está autorizado a recoger material."""
    stmt_reciclador = select(Reciclador).where(Reciclador.id_usuario == id_usuario_reciclador)
    reciclador = db.execute(stmt_reciclador).scalar_one_or_none()

    if not reciclador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil de reciclador no encontrado.")

    stmt = text("""
        SELECT
            cr.id_conjunto_residencial,
            cr.nombre_conjunto,
            cr.direccion,
            l.nombre_localidad
        FROM recicladores_conjuntos rc
        JOIN conjuntos_residenciales cr ON cr.id_conjunto_residencial = rc.id_conjunto_residencial
        JOIN localidades l ON l.id_localidad = cr.id_localidad
        WHERE rc.id_reciclador = :rid
        ORDER BY cr.nombre_conjunto
    """)
    resultados = db.execute(stmt, {"rid": reciclador.id_reciclador}).mappings().all()
    return [dict(fila) for fila in resultados]