"""
Módulo: services/novedad_service.py
Descripción: Lógica de negocio de novedades generales de la plataforma (RQF-015).
¿Para qué? Separar las 4 acciones del flujo:
           1. crear_novedad: el Admin Sistema publica un aviso nuevo.
           2. listar_todas: el Admin Sistema ve TODO el historial (activas
              y archivadas, CA-035.4).
           3. editar_novedad / archivar_novedad: gestión de una novedad.
           4. listar_feed: lo que ve Residente/Reciclador/Admin Conjunto —
              solo novedades activas dirigidas a su rol.
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.administrador_conjunto import AdministradorConjunto
from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.novedad import AlcanceNovedad, Novedad
from app.models.novedad_conjunto import NovedadConjunto
from app.models.reciclador import Reciclador
from app.models.residente import Residente
from app.models.rol import RolId
from app.models.unidad import Unidad
from app.models.usuario import Usuario
from app.schemas.novedad import ConjuntoDestino, CrearNovedadRequest, EditarNovedadRequest, NovedadResponse
from app.services.notificaciones_helpers import (
    admins_del_conjunto,
    crear_notificacion,
    recicladores_del_conjunto,
    residentes_del_conjunto,
)

# ¿Qué? El RF no define plazos distintos por tipo (a diferencia de
#       Comunicados) — solo dice "el sistema sugiere una fecha, editable".
DIAS_EXPIRACION_SUGERIDA = 30


def _esta_archivada(novedad: Novedad) -> bool:
    """RN-004/CA-035.2: archivada manualmente O ya venció (sin necesidad de un job en segundo plano)."""
    return novedad.fecha_archivado is not None or novedad.fecha_expiracion < datetime.now(timezone.utc)


def _a_response(novedad: Novedad) -> NovedadResponse:
    return NovedadResponse(
        id_novedad=novedad.id_novedad,
        alcance=novedad.alcance,
        texto=novedad.texto,
        url_adjunto=novedad.url_adjunto,
        url_video=novedad.url_video,
        conjuntos=[
            ConjuntoDestino(
                id_conjunto_residencial=d.id_conjunto_residencial,
                nombre_conjunto=d.conjunto.nombre_conjunto,
            )
            for d in novedad.destinos
        ],
        fecha_expiracion=novedad.fecha_expiracion,
        created_at=novedad.created_at,
        editado=novedad.fecha_edicion is not None,
        archivada=_esta_archivada(novedad),
    )


def _destinatarios_por_alcance(db: Session, alcance: str, id_conjunto: Optional[UUID] = None) -> set[UUID]:
    """
    ¿Qué? Sin id_conjunto (el caso de siempre): el alcance es de toda la
          plataforma — "todos los residentes" son TODOS los residentes de
          TODOS los conjuntos, no de uno solo, a diferencia de Comunicados.
          Con id_conjunto: se reutilizan los mismos helpers que ya usa
          auditoría/notificaciones para "residentes/recicladores/admins
          de ESTE conjunto puntual", intersectados con el rol del alcance.
    """
    ids: set[UUID] = set()
    if id_conjunto is not None:
        if alcance in (AlcanceNovedad.TODOS, AlcanceNovedad.RESIDENTES):
            ids.update(residentes_del_conjunto(db, id_conjunto))
        if alcance in (AlcanceNovedad.TODOS, AlcanceNovedad.RECICLADORES):
            ids.update(recicladores_del_conjunto(db, id_conjunto))
        if alcance in (AlcanceNovedad.TODOS, AlcanceNovedad.ADMIN_CONJUNTO):
            ids.update(admins_del_conjunto(db, id_conjunto))
        return ids

    if alcance in (AlcanceNovedad.TODOS, AlcanceNovedad.RESIDENTES):
        ids.update(r[0] for r in db.execute(select(Residente.id_usuario)).all())
    if alcance in (AlcanceNovedad.TODOS, AlcanceNovedad.RECICLADORES):
        ids.update(r[0] for r in db.execute(select(Reciclador.id_usuario)).all())
    if alcance in (AlcanceNovedad.TODOS, AlcanceNovedad.ADMIN_CONJUNTO):
        ids.update(r[0] for r in db.execute(select(AdministradorConjunto.id_usuario)).all())
    return ids


def _notificar_novedad(db: Session, novedad: Novedad, tipo: str, mensaje: str) -> None:
    """HU-031-equivalente para novedades: notifica solo a los roles del alcance elegido (CA-032.4)."""
    if not novedad.destinos:
        destinatarios_ids = _destinatarios_por_alcance(db, novedad.alcance)
        if destinatarios_ids:
            # ¿Qué? id_conjunto queda en None a propósito — esta notificación
            #       es de toda la plataforma (ver models/notificacion.py).
            crear_notificacion(db, tipo=tipo, mensaje=mensaje, destinatarios=destinatarios_ids)
        return

    # ¿Qué? Con conjuntos elegidos se crea UNA notificación por conjunto (así
    #       cada una lleva su id_conjunto y el nombre correcto). Un Reciclador
    #       o Admin de Conjunto de varios de esos conjuntos recibe el aviso
    #       una sola vez, no una por conjunto.
    ya_notificados: set[UUID] = set()
    for destino in novedad.destinos:
        destinatarios_ids = _destinatarios_por_alcance(db, novedad.alcance, destino.id_conjunto_residencial)
        destinatarios_ids -= ya_notificados
        if not destinatarios_ids:
            continue
        ya_notificados |= destinatarios_ids
        crear_notificacion(
            db,
            tipo=tipo,
            mensaje=mensaje,
            destinatarios=destinatarios_ids,
            id_conjunto=destino.id_conjunto_residencial,
        )


def crear_novedad(db: Session, admin_usuario: Usuario, datos: CrearNovedadRequest) -> NovedadResponse:
    # ¿Qué? Se quitan repetidos conservando el orden en que se eligieron, y
    #       se valida que TODOS existan antes de crear nada — un id inválido
    #       no deja una novedad a medias.
    ids_conjuntos = list(dict.fromkeys(datos.conjuntos))
    if ids_conjuntos:
        existentes = set(
            db.execute(
                select(ConjuntoResidencial.id_conjunto_residencial).where(
                    ConjuntoResidencial.id_conjunto_residencial.in_(ids_conjuntos)
                )
            ).scalars()
        )
        if existentes != set(ids_conjuntos):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alguno de los conjuntos elegidos no existe.")

    expiracion = datos.fecha_expiracion or (
        datetime.now(timezone.utc) + timedelta(days=DIAS_EXPIRACION_SUGERIDA)
    )

    novedad = Novedad(
        id_admin_sistema=admin_usuario.id_usuario,
        alcance=datos.alcance,
        texto=datos.texto,
        url_adjunto=datos.url_adjunto,
        url_video=datos.url_video,
        fecha_expiracion=expiracion,
        destinos=[NovedadConjunto(id_conjunto_residencial=i) for i in ids_conjuntos],
    )
    db.add(novedad)
    db.flush()

    _notificar_novedad(db, novedad, "NOVEDAD_NUEVA", f"Nueva novedad: {novedad.texto[:120]}")

    db.commit()
    db.refresh(novedad)
    return _a_response(novedad)


def listar_todas(
    db: Session,
    limit: int,
    offset: int,
    alcance: Optional[AlcanceNovedad] = None,
    incluir_archivadas: bool = True,
    search: Optional[str] = None,
) -> tuple[List[NovedadResponse], int]:
    """CA-035.4: el Admin Sistema ve el historial completo, activas y archivadas.

    ¿Qué? Issue #227 — antes esto traía TODO el historial en una sola
          respuesta, sin ningún tope. Con el tiempo, ese historial solo
          crece (nunca se borra nada, solo se archiva) — igual que el
          listado de Residentes/Recicladores de admin.py (issue #207),
          ahora se pide de a "páginas".
    ¿Para qué? Los filtros (alcance, archivadas, búsqueda) se aplican AQUÍ,
              en la consulta, y no en el navegador: con la lista paginada,
              filtrar en el navegador solo revisaría las 8 filas de la
              página visible y dejaría el resto sin buscar.
    ¿Impacto? Los valores por defecto (sin filtros, con archivadas)
              conservan el comportamiento de siempre del endpoint.
    """
    condiciones = []
    if alcance is not None:
        condiciones.append(Novedad.alcance == alcance)
    if not incluir_archivadas:
        # ¿Qué? Misma definición de "archivada" que _esta_archivada():
        #       archivada a mano O ya vencida.
        condiciones.append(Novedad.fecha_archivado.is_(None))
        condiciones.append(Novedad.fecha_expiracion >= datetime.now(timezone.utc))
    if search and search.strip():
        condiciones.append(Novedad.texto.ilike(f"%{search.strip()}%"))

    total = db.execute(select(func.count()).select_from(Novedad).where(*condiciones)).scalar_one()
    stmt = (
        select(Novedad)
        .where(*condiciones)
        .order_by(Novedad.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    items = [_a_response(n) for n in db.execute(stmt).scalars().all()]
    return items, total


def _obtener_o_404(db: Session, id_novedad: UUID) -> Novedad:
    novedad = db.get(Novedad, id_novedad)
    if not novedad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La novedad no existe.")
    return novedad


def editar_novedad(db: Session, id_novedad: UUID, datos: EditarNovedadRequest) -> NovedadResponse:
    novedad = _obtener_o_404(db, id_novedad)

    novedad.texto = datos.texto
    novedad.url_adjunto = datos.url_adjunto
    novedad.url_video = datos.url_video
    # ¿Qué? Si no se manda una fecha nueva, se conserva la actual — a
    #       diferencia de Comunicados, aquí no hay un "tipo" que recalcular.
    novedad.fecha_expiracion = datos.fecha_expiracion or novedad.fecha_expiracion
    novedad.fecha_edicion = datetime.now(timezone.utc)

    # ¿Qué? Reenvía la notificación a los mismos roles del alcance
    #       original, igual que ya se acordó para Comunicados — cualquier
    #       edición guardada avisa de nuevo.
    _notificar_novedad(db, novedad, "NOVEDAD_ACTUALIZADA", f"Novedad actualizada: {novedad.texto[:120]}")

    db.commit()
    db.refresh(novedad)
    return _a_response(novedad)


def archivar_novedad(db: Session, id_novedad: UUID) -> None:
    """HU-035 (CA-035.1): archivado manual — no se puede reactivar (CA-035.3), así que no hay "desarchivar"."""
    novedad = _obtener_o_404(db, id_novedad)
    if novedad.fecha_archivado is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta novedad ya está archivada.")
    novedad.fecha_archivado = datetime.now(timezone.utc)
    db.commit()


def _mis_conjuntos(db: Session, current_user: Usuario) -> set[UUID]:
    """
    ¿Qué? A qué conjunto(s) pertenece/atiende current_user ACTIVAMENTE
          ahora mismo, según su rol — usado solo para decidir si una
          novedad acotada a un conjunto puntual le llega o no.
    ¿Para qué? Un Reciclador o un Admin de Conjunto pueden estar
              vinculados a varios conjuntos a la vez (a diferencia de un
              Residente, que vive en uno solo).
    """
    if current_user.id_rol == RolId.RESIDENTE:
        residente = db.execute(
            select(Residente).where(Residente.id_usuario == current_user.id_usuario)
        ).scalar_one_or_none()
        if not residente:
            return set()
        unidad = db.get(Unidad, residente.id_unidad)
        return {unidad.id_conjunto_residencial} if unidad else set()

    if current_user.id_rol == RolId.RECICLADOR:
        reciclador = db.execute(
            select(Reciclador).where(Reciclador.id_usuario == current_user.id_usuario)
        ).scalar_one_or_none()
        return {c.id_conjunto_residencial for c in reciclador.conjuntos} if reciclador else set()

    if current_user.id_rol == RolId.ADMIN_CONJUNTO:
        admin = db.execute(
            select(AdministradorConjunto).where(AdministradorConjunto.id_usuario == current_user.id_usuario)
        ).scalar_one_or_none()
        return {c.id_conjunto_residencial for c in admin.conjuntos} if admin else set()

    return set()


def listar_feed(db: Session, current_user: Usuario) -> List[NovedadResponse]:
    """HU-033: solo novedades activas (no vencidas, no archivadas) dirigidas al rol de quien consulta (CA-033.1/CA-033.2)."""
    if current_user.id_rol == RolId.RESIDENTE:
        alcances = (AlcanceNovedad.TODOS, AlcanceNovedad.RESIDENTES)
    elif current_user.id_rol == RolId.RECICLADOR:
        alcances = (AlcanceNovedad.TODOS, AlcanceNovedad.RECICLADORES)
    elif current_user.id_rol == RolId.ADMIN_CONJUNTO:
        alcances = (AlcanceNovedad.TODOS, AlcanceNovedad.ADMIN_CONJUNTO)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Este feed no aplica a tu rol.")

    # ¿Qué? Una novedad con conjuntos elegidos solo debe llegar a quien
    #       pertenece a AL MENOS UNO de ellos — las que no tienen ninguno
    #       siguen llegando a todos, como siempre.
    mis_conjuntos = _mis_conjuntos(db, current_user)

    ahora = datetime.now(timezone.utc)
    stmt = (
        select(Novedad)
        .where(
            Novedad.alcance.in_(alcances),
            Novedad.fecha_expiracion >= ahora,
            Novedad.fecha_archivado.is_(None),
            # ¿Qué? SQLAlchemy genera una condición siempre-falsa cuando
            #       in_() recibe una colección vacía — no hace falta un
            #       caso aparte para "mis_conjuntos vacío".
            or_(
                ~Novedad.destinos.any(),
                Novedad.destinos.any(NovedadConjunto.id_conjunto_residencial.in_(mis_conjuntos)),
            ),
        )
        .order_by(Novedad.created_at.desc())
    )
    return [_a_response(n) for n in db.execute(stmt).scalars().all()]
