"""
Módulo: services/contenido_educativo_service.py
Descripción: Lógica de negocio del catálogo de contenido educativo (RQF-004/RQF-010).
¿Para qué? Separar las consultas y reglas de negocio del router, para que
           routers/contenido_educativo.py solo se encargue de HTTP.
¿Impacto? Sin este módulo, la lógica de creación/edición/eliminación quedaría
          mezclada con el manejo de requests, dificultando probarla por separado.
"""

from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.contenido_educativo import ContenidoEducativo
from app.schemas.contenido_educativo import (
    ContenidoEducativoCreate,
    ContenidoEducativoUpdate,
)


def listar_contenido(db: Session) -> list[ContenidoEducativo]:
    """Devuelve todo el catálogo, del más reciente al más antiguo."""
    stmt = select(ContenidoEducativo).order_by(ContenidoEducativo.fecha_publicacion.desc())
    return list(db.execute(stmt).scalars().all())


def obtener_contenido_o_404(db: Session, id_contenido: int) -> ContenidoEducativo:
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
    db: Session, id_contenido: int, data: ContenidoEducativoUpdate
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


def eliminar_contenido(db: Session, id_contenido: int) -> None:
    contenido = obtener_contenido_o_404(db, id_contenido)
    db.delete(contenido)
    db.commit()
