"""
Módulo: services/novedad_enviada_service.py
Descripción: Lógica de las consultas de soporte que un Residente, Reciclador o
             Admin de Conjunto le ENVÍA al Admin Sistema, y de la bandeja
             "Soporte técnico" donde él las atiende.
¿Para qué? El autor crea y ve las suyas (con la respuesta); el Admin Sistema
          las lista por estado y prioridad, las responde y las resuelve.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, selectinload

from app.models.novedad_enviada import (
    ESTADOS_PENDIENTES,
    PRIORIDAD_POR_MOTIVO,
    EstadoNovedadEnviada,
    NovedadEnviada,
    PrioridadNovedadEnviada,
)
from app.models.residente import Residente
from app.models.rol import RolId
from app.models.usuario import Usuario
from app.schemas.novedad_enviada import ActualizarSoporteRequest, CrearNovedadEnviadaRequest
from app.services.notificaciones_helpers import crear_notificacion

ROLES_QUE_ENVIAN = {RolId.RESIDENTE, RolId.RECICLADOR, RolId.ADMIN_CONJUNTO}

# ¿Qué? Issue #399 (CN-054): tope de novedades SIN RESOLVER (NUEVA o EN_REVISION) por autor.
MAX_NOVEDADES_NUEVAS_POR_AUTOR = 10

# ¿Qué? Issue #372 (CN-044): mensaje cuando la cuenta existe pero su fila de
#       residentes/administradores_conjunto no.
# ¿Impacto? Antes eso reventaba con AttributeError y la API respondía 500.
_PERFIL_INCOMPLETO = "Tu perfil está incompleto. Contacta al administrador para completarlo."


# ¿Qué? Cómo se nombra cada estado en el aviso al autor (son los mismos nombres de "Historial de novedades").
_NOMBRE_ESTADO = {
    EstadoNovedadEnviada.NUEVA: "Enviada",
    EstadoNovedadEnviada.EN_REVISION: "En revisión",
    EstadoNovedadEnviada.RESUELTA: "Resuelta",
}


def _conjunto_del_autor(usuario: Usuario, id_pedido: Optional[UUID]) -> Optional[UUID]:
    """¿Qué? Residente: el de su unidad. Admin de Conjunto: el que eligió (debe ser suyo), o el único que tiene. Reciclador: ninguno."""
    if usuario.id_rol == RolId.RESIDENTE:
        if not usuario.residente:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_PERFIL_INCOMPLETO)
        return usuario.residente.unidad.id_conjunto_residencial
    if usuario.id_rol == RolId.ADMIN_CONJUNTO:
        if not usuario.administrador_conjunto:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_PERFIL_INCOMPLETO)
        ids_propios = [c.id_conjunto_residencial for c in usuario.administrador_conjunto.conjuntos]
        if id_pedido is not None:
            if id_pedido not in ids_propios:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso sobre este conjunto.")
            return id_pedido
        return ids_propios[0] if len(ids_propios) == 1 else None
    return None


def crear(db: Session, usuario: Usuario, data: CrearNovedadEnviadaRequest) -> NovedadEnviada:
    if usuario.id_rol not in ROLES_QUE_ENVIAN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tu rol no puede enviar novedades.")
    # ¿Qué? Issue #399 (CN-054): cuenta las novedades de este autor que el Admin Sistema aún no resuelve.
    # ¿Para qué? El límite de 10 por minuto del router mide velocidad y por IP; este mide acumulación por cuenta.
    # ¿Impacto? Al resolverlas el contador baja solo, así que un usuario normal nunca lo nota.
    pendientes = db.scalar(
        select(func.count())
        .select_from(NovedadEnviada)
        .where(NovedadEnviada.autor_id == usuario.id_usuario, NovedadEnviada.estado.in_(ESTADOS_PENDIENTES))
    )
    if pendientes >= MAX_NOVEDADES_NUEVAS_POR_AUTOR:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya tienes {MAX_NOVEDADES_NUEVAS_POR_AUTOR} novedades sin revisar. Espera a que el Administrador del Sistema las revise para enviar más.",
        )
    novedad = NovedadEnviada(
        autor_id=usuario.id_usuario,
        id_conjunto_residencial=_conjunto_del_autor(usuario, data.id_conjunto_residencial),
        texto=data.texto,
        url_imagen=data.url_imagen,
        motivo=data.motivo,
        prioridad=PRIORIDAD_POR_MOTIVO.get(data.motivo, PrioridadNovedadEnviada.MEDIA).value,
    )
    db.add(novedad)
    db.commit()
    db.refresh(novedad)
    return novedad


def listar_mias(db: Session, usuario: Usuario, limit: int, offset: int) -> tuple[list[NovedadEnviada], int]:
    """¿Qué? Issue #399: una página de mis novedades + cuántas tengo en total; `conjunto` viene en una sola consulta extra, no una por fila."""
    donde = NovedadEnviada.autor_id == usuario.id_usuario
    total = db.scalar(select(func.count()).select_from(NovedadEnviada).where(donde))
    stmt = (
        select(NovedadEnviada)
        .where(donde)
        .options(selectinload(NovedadEnviada.conjunto))
        .order_by(NovedadEnviada.created_at.desc(), NovedadEnviada.id)
        .limit(limit)
        .offset(offset)
    )
    return list(db.scalars(stmt).all()), total


def _rol_y_nombre(autor: Optional[Usuario]) -> tuple[str, str]:
    """¿Qué? Etiqueta de rol + nombre para mostrar en la bandeja; los datos salen de la cuenta, nadie los escribe."""
    if autor is None:
        return "Usuario eliminado", ""
    if autor.id_rol == RolId.RESIDENTE and autor.residente:
        u = autor.residente.unidad
        return "Residente", f"{autor.residente.nombre} {autor.residente.apellidos} (Torre {u.torre}, Apto {u.apto})"
    if autor.id_rol == RolId.RECICLADOR and autor.reciclador:
        return "Reciclador", f"{autor.reciclador.nombre} {autor.reciclador.apellidos}"
    if autor.id_rol == RolId.ADMIN_CONJUNTO and autor.administrador_conjunto:
        return "Admin de Conjunto", f"{autor.administrador_conjunto.nombre} {autor.administrador_conjunto.apellidos}"
    return "Usuario", autor.correo_electronico


def _fila_de_soporte(n: NovedadEnviada) -> dict:
    rol, nombre = _rol_y_nombre(n.autor)
    return {
        "id": n.id,
        "origen": rol,
        "nombre_autor": nombre,
        "nombre_conjunto": n.conjunto.nombre_conjunto if n.conjunto else "",
        "texto": n.texto,
        "url_imagen": n.url_imagen,
        "estado": n.estado,
        "prioridad": n.prioridad,
        "respuesta": n.respuesta,
        "respondida_at": n.respondida_at,
        "created_at": n.created_at,
    }


def listar_soporte(
    db: Session,
    estado: Optional[EstadoNovedadEnviada],
    prioridad: Optional[PrioridadNovedadEnviada],
    limit: int,
    offset: int,
) -> tuple[list[dict], int]:
    """
    ¿Qué? Bandeja "Soporte técnico" del Admin Sistema: una página de consultas,
          las de prioridad ALTA primero y dentro de cada prioridad la más reciente.
    ¿Para qué? Sin `estado` trae lo pendiente (NUEVA y EN_REVISION); con `estado=RESUELTA`
              se consulta el historial de lo ya atendido.
    ¿Impacto? El corte lo hace la base de datos y el autor, su unidad y el conjunto
              se cargan en consultas fijas: el número de consultas no crece con las filas.
    """
    donde = [NovedadEnviada.estado == estado.value if estado else NovedadEnviada.estado.in_(ESTADOS_PENDIENTES)]
    if prioridad:
        donde.append(NovedadEnviada.prioridad == prioridad.value)
    total = db.scalar(select(func.count()).select_from(NovedadEnviada).where(*donde))
    # ¿Qué? ALTA=0, MEDIA=1, BAJA=2 para ordenar; el último criterio (id) fija el orden entre filas iguales.
    # ¿Impacto? Sin él, dos páginas seguidas podrían repetir o saltarse una fila.
    orden_prioridad = case(
        (NovedadEnviada.prioridad == PrioridadNovedadEnviada.ALTA.value, 0),
        (NovedadEnviada.prioridad == PrioridadNovedadEnviada.MEDIA.value, 1),
        else_=2,
    )
    stmt = (
        select(NovedadEnviada)
        .where(*donde)
        .options(
            selectinload(NovedadEnviada.conjunto),
            selectinload(NovedadEnviada.autor).options(
                selectinload(Usuario.residente).selectinload(Residente.unidad),
                selectinload(Usuario.reciclador),
                selectinload(Usuario.administrador_conjunto),
            ),
        )
        .order_by(orden_prioridad, NovedadEnviada.created_at.desc(), NovedadEnviada.id)
        .limit(limit)
        .offset(offset)
    )
    return [_fila_de_soporte(n) for n in db.scalars(stmt).all()], total


def actualizar_soporte(db: Session, id_novedad: UUID, data: ActualizarSoporteRequest, admin: Usuario) -> NovedadEnviada:
    """
    ¿Qué? Cambia estado, prioridad y/o respuesta de una consulta; si trae respuesta
          o cambia el estado, le avisa al autor con una notificación.
    ¿Impacto? Escribir una respuesta sin indicar estado la deja RESUELTA. `resuelta_at`
              solo tiene fecha mientras el estado es RESUELTA.
    """
    novedad = db.get(NovedadEnviada, id_novedad)
    if not novedad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La consulta no existe.")
    ahora = datetime.now(timezone.utc)
    nuevo_estado = data.estado or (EstadoNovedadEnviada.RESUELTA if data.respuesta else None)
    estado_cambio = nuevo_estado is not None and nuevo_estado.value != novedad.estado
    if nuevo_estado:
        novedad.estado = nuevo_estado.value
        novedad.resuelta_at = ahora if nuevo_estado == EstadoNovedadEnviada.RESUELTA else None
    if data.prioridad:
        novedad.prioridad = data.prioridad.value
    if data.respuesta:
        novedad.respuesta = data.respuesta
        novedad.respondida_at = ahora
        if novedad.autor_id:
            crear_notificacion(
                db,
                tipo="RESPUESTA_SOPORTE",
                mensaje="El Administrador del Sistema respondió tu consulta de soporte técnico.",
                destinatarios=[novedad.autor_id],
                id_referencia=novedad.id,
                id_emisor=admin.id_usuario,
            )
    # ¿Qué? Issue #520: un cambio de estado SIN respuesta también se le avisa al autor.
    # ¿Para qué? Con respuesta ya recibe el aviso de arriba; sin él, un NUEVA → EN_REVISION pasaba en silencio.
    # ¿Impacto? Cambiar solo la prioridad no avisa (el autor no la elige ni la usa para decidir nada).
    elif estado_cambio and novedad.autor_id:
        crear_notificacion(
            db,
            tipo="ESTADO_SOPORTE",
            mensaje=f"Tu consulta de soporte técnico pasó a: {_NOMBRE_ESTADO[nuevo_estado]}.",
            destinatarios=[novedad.autor_id],
            id_referencia=novedad.id,
            id_emisor=admin.id_usuario,
        )
    db.commit()
    db.refresh(novedad)
    return novedad
