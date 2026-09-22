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
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.contenido_educativo import ContenidoEducativo
from app.models.contenido_educativo_envio import ContenidoEducativoEnvio
from app.schemas.contenido_educativo import (
    ContenidoEducativoCreate,
    ContenidoEducativoUpdate,
)
from app.services.notificaciones_helpers import crear_notificacion, residentes_del_conjunto


def listar_contenido(db: Session) -> list[ContenidoEducativo]:
    """Devuelve todo el catálogo, del más reciente al más antiguo."""
    stmt = select(ContenidoEducativo).order_by(ContenidoEducativo.fecha_publicacion.desc())
    return list(db.execute(stmt).scalars().all())


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
        fecha_publicacion=date.today(),
    )
    db.add(contenido)
    db.commit()
    db.refresh(contenido)
    return contenido


def editar_contenido(
    db: Session, id_contenido: UUID, data: ContenidoEducativoUpdate
) -> ContenidoEducativo:
    contenido = obtener_contenido_o_404(db, id_contenido)
    contenido.modulo_categoria = data.modulo_categoria
    contenido.titulo_tema = data.titulo_tema
    contenido.cuerpo_texto = data.cuerpo_texto
    contenido.url_video = data.url_video
    contenido.url_guia = data.url_guia
    db.commit()
    db.refresh(contenido)
    return contenido


def eliminar_contenido(db: Session, id_contenido: UUID) -> None:
    contenido = obtener_contenido_o_404(db, id_contenido)
    db.delete(contenido)
    db.commit()


def listar_envios_de_contenido(db: Session, id_contenido: UUID) -> list[ContenidoEducativoEnvio]:
    """¿Qué? A qué conjuntos se envió este módulo a mano (RQF-018), más
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
          conjuntos, sin pasar por una auditoría del Reciclador (RQF-018).
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
