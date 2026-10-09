"""
Módulo: services/novedad_enviada_service.py
Descripción: Lógica de las novedades que un Residente, Reciclador o Admin de
             Conjunto le ENVÍA al Admin Sistema, y de la bandeja unificada
             "Solicitudes pendientes" (desvinculaciones + novedades).
¿Para qué? El autor crea y ve las suyas; el Admin Sistema las lista junto
          con las desvinculaciones y las marca como vistas.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, literal_column, select, union_all
from sqlalchemy.orm import Session, selectinload

from app.models.novedad_enviada import EstadoNovedadEnviada, NovedadEnviada
from app.models.residente import Residente
from app.models.rol import RolId
from app.models.solicitud_desvinculacion import EstadoSolicitudDesvinculacion, SolicitudDesvinculacion
from app.models.usuario import Usuario
from app.schemas.novedad_enviada import CrearNovedadEnviadaRequest
from app.services import desvinculacion_service

ROLES_QUE_ENVIAN = {RolId.RESIDENTE, RolId.RECICLADOR, RolId.ADMIN_CONJUNTO}

# ¿Qué? Issue #399 (CN-054): tope de novedades NUEVAS (sin ver por el Admin Sistema) por autor.
MAX_NOVEDADES_NUEVAS_POR_AUTOR = 10

# ¿Qué? Issue #372 (CN-044): mensaje cuando la cuenta existe pero su fila de
#       residentes/administradores_conjunto no.
# ¿Impacto? Antes eso reventaba con AttributeError y la API respondía 500.
_PERFIL_INCOMPLETO = "Tu perfil está incompleto. Contacta al administrador para completarlo."


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
    # ¿Qué? Issue #399 (CN-054): cuenta las novedades de este autor que el Admin Sistema aún no marca como vistas.
    # ¿Para qué? El límite de 10 por minuto del router mide velocidad y por IP; este mide acumulación por cuenta.
    # ¿Impacto? Al marcarlas como VISTA el contador baja solo, así que un usuario normal nunca lo nota.
    pendientes = db.scalar(
        select(func.count())
        .select_from(NovedadEnviada)
        .where(NovedadEnviada.autor_id == usuario.id_usuario, NovedadEnviada.estado == EstadoNovedadEnviada.NUEVA.value)
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


def listar_unificadas(db: Session, tipo: Optional[str], limit: int, offset: int) -> tuple[list[dict], int]:
    """
    ¿Qué? Junta lo PENDIENTE de las 2 fuentes (desvinculaciones + novedades
          enviadas nuevas) en una sola lista, más reciente primero, y
          devuelve solo la página pedida + el total.
    ¿Para qué? El frontend pinta una sola bandeja "Solicitudes pendientes",
              filtrable por `tipo`, sin saber que por dentro son 2 tablas.
    ¿Impacto? Issue #399 (CN-054): el corte lo hace la base de datos. Antes se
              cargaban TODAS las novedades (y varias consultas por cada una)
              solo para quedarse con 10; ahora son 3 pasos con un número de
              consultas fijo, sin importar cuántas filas haya.
    """
    # Paso 1: por cada tabla, solo (id, tipo, fecha) de lo pendiente.
    partes = []
    if tipo is None or tipo == "NOVEDAD":
        partes.append(
            select(NovedadEnviada.id.label("id"), literal_column("'NOVEDAD'").label("tipo"), NovedadEnviada.created_at.label("created_at"))
            .where(NovedadEnviada.estado == EstadoNovedadEnviada.NUEVA.value)
        )
    if tipo is None or tipo == "DESVINCULACION":
        partes.append(
            select(
                SolicitudDesvinculacion.id.label("id"),
                literal_column("'DESVINCULACION'").label("tipo"),
                SolicitudDesvinculacion.created_at.label("created_at"),
            ).where(SolicitudDesvinculacion.estado == EstadoSolicitudDesvinculacion.PENDIENTE)
        )
    union = union_all(*partes).subquery()
    total = db.scalar(select(func.count()).select_from(union))
    # ¿Qué? El segundo criterio (id) fija el orden entre filas con la misma fecha.
    # ¿Impacto? Sin él, dos páginas seguidas podrían repetir o saltarse una fila.
    pagina = db.execute(
        select(union.c.id, union.c.tipo).order_by(union.c.created_at.desc(), union.c.id).limit(limit).offset(offset)
    ).all()

    # Paso 2: el detalle completo, solo de las filas de esta página.
    ids_novedad = [id_ for id_, t in pagina if t == "NOVEDAD"]
    ids_desvinculacion = [id_ for id_, t in pagina if t == "DESVINCULACION"]
    novedades: dict = {}
    if ids_novedad:
        stmt = (
            select(NovedadEnviada)
            .where(NovedadEnviada.id.in_(ids_novedad))
            .options(
                selectinload(NovedadEnviada.conjunto),
                selectinload(NovedadEnviada.autor).options(
                    selectinload(Usuario.residente).selectinload(Residente.unidad),
                    selectinload(Usuario.reciclador),
                    selectinload(Usuario.administrador_conjunto),
                ),
            )
        )
        novedades = {n.id: n for n in db.scalars(stmt).all()}
    desvinculaciones: dict = {}
    if ids_desvinculacion:
        solicitudes = desvinculacion_service.listar_solicitudes_pendientes(db, ids=ids_desvinculacion)
        desvinculaciones = {s.id: s for s in solicitudes}

    # Paso 3: armar las filas en el mismo orden de la página.
    # ¿Impacto? Si alguien resolvió una fila entre el paso 1 y el 2, ya no sale
    #           en el detalle y se omite; la página trae una fila menos esa vez.
    filas: list[dict] = []
    for id_, t in pagina:
        if t == "NOVEDAD" and id_ in novedades:
            n = novedades[id_]
            rol, nombre = _rol_y_nombre(n.autor)
            filas.append({
                "id": n.id,
                "tipo": "NOVEDAD",
                "titulo": f"Novedad — {nombre}" if nombre else "Novedad",
                "origen": rol,
                "nombre_conjunto": n.conjunto.nombre_conjunto if n.conjunto else "",
                "detalle": n.texto,
                "url_evidencia": n.url_imagen,
                "estado": n.estado,
                "created_at": n.created_at,
            })
        elif t == "DESVINCULACION" and id_ in desvinculaciones:
            s = desvinculaciones[id_]
            filas.append({
                "id": s.id,
                "tipo": "DESVINCULACION",
                "titulo": f"Dejar de administrar {s.nombre_conjunto}",
                "origen": f"Admin de Conjunto · {s.nombre_administrador} {s.apellidos_administrador}",
                "nombre_conjunto": s.nombre_conjunto,
                "detalle": s.motivo or "",
                "url_evidencia": None,
                "estado": s.estado,
                "created_at": s.created_at,
            })
    return filas, total


def resolver_unificada(
    db: Session, tipo: str, id_solicitud: UUID, aprobar: bool, motivo_rechazo: Optional[str], resuelta_por: Usuario
) -> None:
    """¿Qué? DESVINCULACION delega en su flujo de siempre (aprobar/rechazar); una NOVEDAD solo se marca como vista."""
    if tipo == "DESVINCULACION":
        desvinculacion_service.resolver_solicitud(db, id_solicitud, aprobar, motivo_rechazo, resuelta_por)
        return

    novedad = db.get(NovedadEnviada, id_solicitud)
    if not novedad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La novedad no existe.")
    if not aprobar:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Una novedad solo se marca como vista.")
    if novedad.estado != EstadoNovedadEnviada.NUEVA.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta novedad ya fue vista.")
    novedad.estado = EstadoNovedadEnviada.VISTA.value
    novedad.resuelta_at = datetime.now(timezone.utc)
    db.commit()
