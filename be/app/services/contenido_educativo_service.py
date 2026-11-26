"""
Módulo: services/contenido_educativo_service.py
Descripción: Lógica de negocio del catálogo de contenido educativo (RQF-004/RQF-010).
¿Para qué? Separar las consultas y reglas de negocio del router, para que
           routers/contenido_educativo.py solo se encargue de HTTP.
¿Impacto? Sin este módulo, la lógica de creación/edición/eliminación quedaría
          mezclada con el manejo de requests, dificultando probarla por separado.
"""

from datetime import date
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session, selectinload

from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.contenido_educativo import ContenidoEducativo
from app.models.contenido_educativo_envio import ContenidoEducativoEnvio
from app.models.contenido_educativo_visto import ContenidoEducativoVisto
from app.schemas.contenido_educativo import (
    ContenidoEducativoCreate,
    ContenidoEducativoUpdate,
)
from app.services.notificaciones_helpers import crear_notificacion, residentes_del_conjunto


def listar_contenido(db: Session) -> list[ContenidoEducativo]:
    """
    ¿Qué? Devuelve todo el catálogo agrupado por categoría y, dentro de cada una, en su orden de lectura.
    ¿Para qué? El frontend arma "Aprende a reciclar" con este orden: no tiene que ordenar nada por su cuenta.
    ¿Impacto? Antes salía del más reciente al más antiguo. Si dos módulos de una categoría tienen el
              mismo orden, el más reciente va primero (desempate estable).
    """
    stmt = select(ContenidoEducativo).order_by(
        ContenidoEducativo.modulo_categoria,
        ContenidoEducativo.orden,
        ContenidoEducativo.fecha_publicacion.desc(),
        ContenidoEducativo.titulo_tema,
    )
    return list(db.execute(stmt).scalars().all())


def _siguiente_orden(db: Session, categoria: str) -> int:
    """El número que sigue al último módulo de esa categoría (1 si la categoría es nueva)."""
    ultimo = db.scalar(select(func.max(ContenidoEducativo.orden)).where(ContenidoEducativo.modulo_categoria == categoria))
    return (ultimo or 0) + 1


def obtener_contenido_o_404(db: Session, id_contenido: UUID) -> ContenidoEducativo:
    contenido = db.get(ContenidoEducativo, id_contenido)
    if not contenido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró ese módulo de contenido educativo.",
        )
    return contenido


def crear_contenido(db: Session, data: ContenidoEducativoCreate) -> ContenidoEducativo:
    contenido = ContenidoEducativo(
        modulo_categoria=data.modulo_categoria,
        titulo_tema=data.titulo_tema,
        cuerpo_texto=data.cuerpo_texto,
        url_video=data.url_video,
        url_guia=data.url_guia,
        url_imagen=data.url_imagen,
        fecha_publicacion=date.today(),
        orden=_siguiente_orden(db, data.modulo_categoria),
    )
    db.add(contenido)
    db.commit()
    db.refresh(contenido)
    return contenido


def editar_contenido(
    db: Session, id_contenido: UUID, data: ContenidoEducativoUpdate
) -> ContenidoEducativo:
    contenido = obtener_contenido_o_404(db, id_contenido)
    # ¿Qué? Un módulo que cambia de categoría pasa al final de la nueva (su número viejo ya no tiene sentido ahí).
    if data.modulo_categoria != contenido.modulo_categoria:
        contenido.orden = _siguiente_orden(db, data.modulo_categoria)
    contenido.modulo_categoria = data.modulo_categoria
    contenido.titulo_tema = data.titulo_tema
    contenido.cuerpo_texto = data.cuerpo_texto
    contenido.url_video = data.url_video
    contenido.url_guia = data.url_guia
    contenido.url_imagen = data.url_imagen
    db.commit()
    db.refresh(contenido)
    return contenido


def eliminar_contenido(db: Session, id_contenido: UUID) -> None:
    contenido = obtener_contenido_o_404(db, id_contenido)
    db.delete(contenido)
    db.commit()


def listar_envios_de_contenido(db: Session, id_contenido: UUID) -> list[ContenidoEducativoEnvio]:
    """¿Qué? A qué conjuntos se envió este módulo a mano (RQF-013, Flujo C), más
    reciente primero — el 404 confirma que el módulo existe antes de listar
    (una lista vacía por sí sola no distingue "sin envíos" de "el módulo no existe")."""
    obtener_contenido_o_404(db, id_contenido)
    stmt = (
        select(ContenidoEducativoEnvio)
        .where(ContenidoEducativoEnvio.id_contenido == id_contenido)
        .order_by(ContenidoEducativoEnvio.created_at.desc())
        .options(selectinload(ContenidoEducativoEnvio.conjunto))
    )
    return list(db.execute(stmt).scalars().all())


def enviar_a_conjuntos(
    db: Session, id_contenido: UUID, ids_conjuntos: list[UUID], id_admin: UUID
) -> list[ContenidoEducativoEnvio]:
    """
    ¿Qué? El Admin del Sistema envía un módulo a mano a uno o varios
          conjuntos, sin pasar por una auditoría del Reciclador (RQF-013, Flujo C).
    ¿Para qué? Aprovechar un módulo ya bueno para darle variedad a un
              conjunto, o cubrir un tema que esta semana no tuvo ninguna
              calificación Regular o Mala (ver el resumen "Sin recomendar"
              del panel).
    ¿Impacto? Cada conjunto recibe la MISMA notificación que ya reciben los
              residentes cuando el reciclador recomienda contenido
              (CONTENIDO_RECOMENDADO_MANUAL, un tipo aparte para que el
              Residente sepa a qué módulo exacto ir sin depender de una
              auditoría — ver irAContenidoRecomendado en
              ResidenteDashboard.tsx). Un conjunto sin residentes todavía
              simplemente no genera notificación, pero el envío sí queda
              registrado.
    """
    contenido = obtener_contenido_o_404(db, id_contenido)

    existentes = set(
        db.execute(
            select(ConjuntoResidencial.id_conjunto_residencial).where(
                ConjuntoResidencial.id_conjunto_residencial.in_(ids_conjuntos)
            )
        )
        .scalars()
        .all()
    )
    faltantes = set(ids_conjuntos) - existentes
    if faltantes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uno o más conjuntos elegidos no existen.",
        )

    envios = [
        ContenidoEducativoEnvio(id_contenido=id_contenido, id_conjunto_residencial=id_conjunto, enviado_por_id=id_admin)
        for id_conjunto in ids_conjuntos
    ]
    db.add_all(envios)
    db.flush()  # ¿Para qué? Necesitamos cada envio.id antes de commitear, para las notificaciones.

    for envio in envios:
        destinatarios = residentes_del_conjunto(db, envio.id_conjunto_residencial)
        if destinatarios:
            crear_notificacion(
                db,
                tipo="CONTENIDO_RECOMENDADO_MANUAL",
                mensaje="Hay contenido educativo nuevo recomendado para tu conjunto.",
                destinatarios=destinatarios,
                id_conjunto=envio.id_conjunto_residencial,
                id_referencia=contenido.id_contenido,
                id_emisor=id_admin,
            )

    db.commit()
    for envio in envios:
        db.refresh(envio)
    return envios


def marcar_vistos(db: Session, id_usuario: UUID, ids: list[UUID]) -> list[UUID]:
    """
    ¿Qué? Marca como vistos los módulos que el Residente abrió y devuelve todos
          los que lleva vistos.
    ¿Para qué? "Visto" y el avance de "Aprende a reciclar" (módulo = lección).
    ¿Impacto? Es idempotente: ON CONFLICT DO NOTHING hace que abrir otra vez la
              misma lección no duplique ni cambie la fecha. Los ids que no existen
              se ignoran en vez de fallar, porque un módulo pudo borrarse justo
              mientras el Residente tenía abierta la página.
    """
    if ids:
        existentes = db.execute(
            select(ContenidoEducativo.id_contenido).where(ContenidoEducativo.id_contenido.in_(ids))
        ).scalars().all()
        if existentes:
            db.execute(
                pg_insert(ContenidoEducativoVisto)
                .values([{"id_usuario": id_usuario, "id_contenido": i} for i in existentes])
                .on_conflict_do_nothing()
            )
            db.commit()
    return listar_vistos(db, id_usuario)


def listar_vistos(db: Session, id_usuario: UUID) -> list[UUID]:
    """Ids de los módulos que este Residente ya abrió."""
    stmt = select(ContenidoEducativoVisto.id_contenido).where(ContenidoEducativoVisto.id_usuario == id_usuario)
    return list(db.execute(stmt).scalars().all())
