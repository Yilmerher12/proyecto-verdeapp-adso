"""
Módulo: services/admin_usuarios_service.py
Descripción: Lógica de negocio del panel de usuarios del Admin del Sistema
             (activar/desactivar cuentas y ver el perfil de cualquier usuario).
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.rol import RolId
from app.models.usuario import Usuario
from app.schemas.admin import PerfilUsuarioAdminResponse


def cambiar_habilitado(db: Session, usuario: Usuario, habilitado: bool, motivo: Optional[str]) -> None:
    """
    ¿Qué? Activa o desactiva una cuenta y guarda (o borra) fecha y motivo.
    ¿Para qué? Al desactivar queda registrado cuándo y por qué; al
              reactivar se borran ambos, para que un motivo viejo no se
              confunda con una desactivación futura.
    ¿Impacto? El motivo se ignora al reactivar aunque llegue en el cuerpo.
    """
    usuario.habilitado = habilitado
    if habilitado:
        usuario.fecha_desactivacion = None
        usuario.motivo_desactivacion = None
    else:
        usuario.fecha_desactivacion = datetime.now(timezone.utc)
        usuario.motivo_desactivacion = motivo
    db.commit()


def obtener_perfil_usuario(db: Session, correo_electronico: str) -> Optional[PerfilUsuarioAdminResponse]:
    """
    ¿Qué? Junta los datos de la tabla usuarios con los de la tabla propia de
          su rol (residentes, recicladores o administradores_conjunto).
    ¿Para qué? El Admin del Sistema abre el perfil de cualquier persona desde
              su tabla, sin importar su rol, en modo solo lectura.
    ¿Impacto? Devuelve None si el correo no existe. El Admin del Sistema no
              tiene tabla de datos personales, así que su perfil solo trae
              los datos de cuenta.
    """
    usuario = db.execute(
        select(Usuario).where(Usuario.correo_electronico == correo_electronico)
    ).scalar_one_or_none()
    if not usuario:
        return None

    nombre = apellidos = telefono = None
    detalle: dict = {}

    if usuario.id_rol == RolId.RESIDENTE and usuario.residente:
        residente = usuario.residente
        nombre, apellidos, telefono = residente.nombre, residente.apellidos, residente.numero_telefonico
        conjunto = residente.unidad.conjunto
        detalle = {
            "conjunto": conjunto.nombre_conjunto,
            "localidad": conjunto.localidad.nombre_localidad if conjunto.localidad else None,
            "torre": residente.unidad.torre,
            "apto": residente.unidad.apto,
        }
    elif usuario.id_rol == RolId.RECICLADOR and usuario.reciclador:
        reciclador = usuario.reciclador
        nombre, apellidos, telefono = reciclador.nombre, reciclador.apellidos, reciclador.numero_telefonico
        detalle = {
            "asociacion": reciclador.asociacion,
            "localidad": reciclador.localidad.nombre_localidad if reciclador.localidad else None,
            "mostrar_contacto_directorio": reciclador.mostrar_contacto_directorio,
            "conjuntos": sorted(c.nombre_conjunto for c in reciclador.conjuntos),
        }
    elif usuario.id_rol == RolId.ADMIN_CONJUNTO and usuario.administrador_conjunto:
        admin = usuario.administrador_conjunto
        nombre, apellidos, telefono = admin.nombre, admin.apellidos, admin.numero_telefonico
        detalle = {"conjuntos": sorted(c.nombre_conjunto for c in admin.conjuntos)}

    ahora = datetime.now(timezone.utc)
    bloqueado_hasta = usuario.bloqueado_hasta if usuario.bloqueado_hasta and usuario.bloqueado_hasta > ahora else None

    return PerfilUsuarioAdminResponse(
        correo_electronico=usuario.correo_electronico,
        role_id=usuario.id_rol,
        rol=usuario.rol.tipo_rol,
        habilitado=usuario.habilitado,
        correo_verificado=bool(usuario.is_active),
        idioma=usuario.locale,
        foto_perfil_url=usuario.foto_perfil_url,
        bloqueado_hasta=bloqueado_hasta,
        fecha_desactivacion=usuario.fecha_desactivacion,
        motivo_desactivacion=usuario.motivo_desactivacion,
        nombre=nombre,
        apellidos=apellidos,
        telefono=telefono,
        detalle=detalle,
    )
