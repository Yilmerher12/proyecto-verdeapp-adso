"""
Módulo: services/admin_conjunto_service.py
Descripción: Lógica de negocio del flujo de invitación de Administradores de Conjunto.
¿Para qué? Separar en dos pasos claros:
           1. invitar_admin_conjunto: el Admin del Sistema solo escribe un correo
              y a qué conjuntos lo asigna. Se genera un token y se manda un email.
           2. aceptar_invitacion: la persona invitada, usando ese token, define
              su propia contraseña y completa sus datos. Aquí se crea su cuenta.
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.usuario import Usuario
from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.administrador_conjunto import AdministradorConjunto
from app.models.administrador_conjunto_asignacion import AdministradorConjuntoAsignacion
from app.models.invitacion_admin_conjunto import InvitacionAdminConjunto

from app.schemas.admin_conjunto import (
    AceptarInvitacionAdminConjuntoRequest,
    InvitacionInfoResponse,
    InvitarAdminConjuntoRequest,
)

from app.utils.email import send_admin_conjunto_invitation_email
from app.utils.security import hash_password


# ¿Qué? El rol "ADMIN_CONJUNTO" corresponde al id_rol = 4 (ver init_db.sql).
ID_ROL_ADMIN_CONJUNTO = 4

# ¿Qué? Las invitaciones son válidas por 48 horas.
HORAS_VALIDEZ_INVITACION = 48


async def invitar_admin_conjunto(
    db: Session, datos: InvitarAdminConjuntoRequest, invitado_por: Usuario
) -> None:
    """
    ¿Qué? Crea una invitación pendiente y envía el correo correspondiente.
    ¿Para qué? El Administrador del Sistema NUNCA define la contraseña ni
              los datos personales del nuevo administrador — solo indica
              su correo y a qué conjunto(s) quedará asignado.
    """
    # Verificar que los conjuntos indicados sí existan.
    stmt_conjuntos = select(ConjuntoResidencial).where(
        ConjuntoResidencial.id_conjunto_residencial.in_(datos.ids_conjuntos)
    )
    conjuntos_encontrados = db.execute(stmt_conjuntos).scalars().all()

    if len(conjuntos_encontrados) != len(set(datos.ids_conjuntos)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uno o más de los conjuntos indicados no existen.",
        )

    # Si el correo ya tiene una cuenta creada, no tiene sentido invitarlo de nuevo.
    stmt_usuario = select(Usuario).where(Usuario.correo_electronico == datos.correo_electronico)
    usuario_existente = db.execute(stmt_usuario).scalar_one_or_none()
    if usuario_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ese correo ya tiene una cuenta registrada en VerdeApp.",
        )

    token = str(uuid.uuid4())
    expira = datetime.now(timezone.utc) + timedelta(hours=HORAS_VALIDEZ_INVITACION)
    ids_como_texto = ",".join(str(i) for i in datos.ids_conjuntos)

    invitacion = InvitacionAdminConjunto(
        id=str(uuid.uuid4()),
        correo_electronico=datos.correo_electronico,
        token=token,
        conjuntos_asignados=ids_como_texto,
        invitado_por_id=invitado_por.id_usuario,
        expires_at=expira,
        used=False,
    )
    db.add(invitacion)
    db.commit()

    try:
        await send_admin_conjunto_invitation_email(email=datos.correo_electronico, token=token)
    except Exception as email_err:
        # ¿Qué? Si el correo falla, la invitación ya quedó guardada en la BD.
        # ¿Para qué? El Admin del Sistema puede reenviarla o copiar el enlace
        #           manualmente desde los logs (igual que en register_user).
        print(f"Advertencia: invitación creada, pero el correo no se pudo despachar: {str(email_err)}")


def consultar_invitacion(db: Session, token: str) -> InvitacionInfoResponse:
    """
    ¿Qué? Permite que la página de "Aceptar invitación" muestre a qué
          correo y conjuntos corresponde el enlace, ANTES de que la
          persona llene el formulario.
    """
    invitacion = _obtener_invitacion_valida(db, token, lanzar_error=False)

    if not invitacion:
        return InvitacionInfoResponse(correo_electronico="", nombres_conjuntos=[], valido=False)

    ids_conjuntos = [int(i) for i in invitacion.conjuntos_asignados.split(",")]
    stmt = select(ConjuntoResidencial.nombre_conjunto).where(
        ConjuntoResidencial.id_conjunto_residencial.in_(ids_conjuntos)
    )
    nombres = db.execute(stmt).scalars().all()

    return InvitacionInfoResponse(
        correo_electronico=invitacion.correo_electronico,
        nombres_conjuntos=list(nombres),
        valido=True,
    )


def aceptar_invitacion(db: Session, datos: AceptarInvitacionAdminConjuntoRequest) -> Usuario:
    """
    ¿Qué? La persona invitada, usando su token, crea su propia cuenta:
          su propia contraseña y sus propios datos personales.
    ¿Para qué? Esto es lo que hace que el flujo sea seguro: la
              contraseña nunca pasa por manos del Administrador del
              Sistema, solo la conoce el nuevo administrador.
    """
    invitacion = _obtener_invitacion_valida(db, datos.token, lanzar_error=True)

    try:
        nuevo_usuario = Usuario(
            correo_electronico=invitacion.correo_electronico,
            id_rol=ID_ROL_ADMIN_CONJUNTO,
            password=hash_password(datos.password),
            is_active=True,  # Ya no necesita verificar correo: la invitación ya lo confirmó.
        )
        db.add(nuevo_usuario)
        db.flush()

        nuevo_administrador = AdministradorConjunto(
            id_usuario=nuevo_usuario.id_usuario,
            nombre=datos.nombre.strip().upper(),
            apellidos=datos.apellidos.strip().upper(),
            numero_telefonico=datos.numero_telefonico,
        )
        db.add(nuevo_administrador)
        db.flush()

        ids_conjuntos: List[int] = [int(i) for i in invitacion.conjuntos_asignados.split(",")]
        for id_conjunto in ids_conjuntos:
            asignacion = AdministradorConjuntoAsignacion(
                id_administrador=nuevo_administrador.id_administrador,
                id_conjunto_residencial=id_conjunto,
            )
            db.add(asignacion)

        invitacion.used = True
        db.commit()
        db.refresh(nuevo_usuario)
        return nuevo_usuario

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear la cuenta de administrador: {str(e)}",
        )


def _obtener_invitacion_valida(db: Session, token: str, lanzar_error: bool):
    """
    ¿Qué? Función interna compartida: busca la invitación por token y
          valida que no esté usada ni vencida.
    """
    invitacion = db.query(InvitacionAdminConjunto).filter(
        InvitacionAdminConjunto.token == token,
        InvitacionAdminConjunto.used == False,
    ).first()

    if not invitacion:
        if lanzar_error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La invitación es inválida o ya fue utilizada.",
            )
        return None

    ahora = datetime.now(timezone.utc) if invitacion.expires_at.tzinfo else datetime.now()
    if invitacion.expires_at < ahora:
        if lanzar_error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La invitación ha expirado. Solicita una nueva al equipo de VerdeApp.",
            )
        return None

    return invitacion