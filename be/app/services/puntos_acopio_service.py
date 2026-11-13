"""
Módulo: services/puntos_acopio_service.py
Descripción: Lógica de negocio de la gestión de puntos de acopio (RQF-011).
¿Para qué? HU-015/016/017: el Admin Sistema registra, actualiza y da de
          baja los puntos de acopio oficiales — antes solo se podían leer
          (directorio.py), y los 9 reales solo existían por estar
          escritos a mano en seed.py.
"""

import unicodedata
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.localidad import Localidad
from app.models.punto_acopio import PuntoAcopio
from app.models.punto_acopio_comentario import PuntoAcopioComentario
from app.models.usuario import Usuario
from app.schemas.puntos_acopio import PuntoAcopioCreate, PuntoAcopioUpdate


def _verificar_localidad_existe(db: Session, id_localidad: int) -> None:
    """RN-001: un punto de acopio no puede guardarse sin una localidad válida."""
    if not db.get(Localidad, id_localidad):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La localidad seleccionada no es válida o no existe.",
        )


def _obtener_punto_o_404(db: Session, id_punto_acopio: UUID) -> PuntoAcopio:
    punto = db.get(PuntoAcopio, id_punto_acopio)
    if not punto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró ese punto de acopio.",
        )
    return punto


_CON_TILDE = "ÁÉÍÓÚÜÑáéíóúüñ"
_SIN_TILDE = "AEIOUUNaeiouun"


def _sin_tildes(texto: str) -> str:
    """Misma normalización que normalizarTexto del frontend: sin tildes y en minúscula."""
    sin_marcas = "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn")
    return sin_marcas.lower()


def condicion_busqueda(q: str | None):
    """
    ¿Qué? Condición SQL: el texto está en el nombre, la dirección o la organización, sin importar
          mayúsculas ni tildes. Devuelve None si no hay texto que buscar.
    ¿Para qué? CA-006.7 pide buscar sin tildes; con 799 puntos el filtro ya no puede vivir en el
              navegador. Se usa translate() de Postgres (sin instalar la extensión unaccent).
    ¿Impacto? Las tildes se quitan ANTES de pasar a minúscula: lower() de Postgres depende de la
              configuración regional de la base y puede no bajar "Á". Compartida por el directorio
              y el panel del Admin.
    """
    texto = _sin_tildes((q or "").strip())
    if not texto:
        return None
    columnas = func.concat_ws(" ", PuntoAcopio.nombre, PuntoAcopio.direccion, PuntoAcopio.organizacion)
    sin_tildes = func.lower(func.translate(columnas, _CON_TILDE, _SIN_TILDE))
    return sin_tildes.contains(texto, autoescape=True)


def listar_todos(
    db: Session,
    *,
    limit: int,
    offset: int,
    q: str | None = None,
    id_localidad: int | None = None,
    estado: str = "todos",
) -> tuple[list[dict], int]:
    """
    ¿Qué? Vista de administración: incluye los puntos dados de baja
          (activo=False), a diferencia de GET /directorio/puntos-acopio. Devuelve
          una página y el total con los mismos filtros, no la lista completa.
    ¿Para qué? El Admin Sistema necesita ver todo lo que existe para poder
              gestionarlo, no solo lo que hoy se muestra a Residentes. Con el inventario
              de la UAESP son cientos de puntos (issue #664).
    ¿Impacto? estado: "todos", "activos" o "baja".
    """
    condiciones = []
    if estado == "activos":
        condiciones.append(PuntoAcopio.activo.is_(True))
    elif estado == "baja":
        condiciones.append(PuntoAcopio.activo.is_(False))
    if id_localidad is not None:
        condiciones.append(PuntoAcopio.id_localidad == id_localidad)
    busqueda = condicion_busqueda(q)
    if busqueda is not None:
        condiciones.append(busqueda)

    total = db.scalar(select(func.count()).select_from(PuntoAcopio).where(*condiciones)) or 0
    stmt = (
        select(
            PuntoAcopio.id_punto_acopio,
            PuntoAcopio.nombre,
            PuntoAcopio.direccion,
            PuntoAcopio.nombre_encargado,
            PuntoAcopio.telefono_contacto,
            PuntoAcopio.id_localidad,
            PuntoAcopio.activo,
            PuntoAcopio.url_foto,
            PuntoAcopio.organizacion,
            PuntoAcopio.correo_contacto,
            Localidad.nombre_localidad,
        )
        .join(Localidad, PuntoAcopio.id_localidad == Localidad.id_localidad)
        .where(*condiciones)
        # ¿Qué? id_punto_acopio al final: dos ECA con el mismo nombre y dirección no se pueden
        #       mezclar entre páginas (un orden con empates puede repetir o saltar filas).
        .order_by(Localidad.nombre_localidad, PuntoAcopio.nombre, PuntoAcopio.id_punto_acopio)
        .limit(limit)
        .offset(offset)
    )
    items = [
        {
            "id_punto_acopio": r.id_punto_acopio,
            "nombre": r.nombre,
            "direccion": r.direccion,
            "nombre_encargado": r.nombre_encargado,
            "telefono_contacto": r.telefono_contacto,
            "id_localidad": r.id_localidad,
            "nombre_localidad": r.nombre_localidad,
            "activo": r.activo,
            "url_foto": r.url_foto,
            "organizacion": r.organizacion,
            "correo_contacto": r.correo_contacto,
        }
        for r in db.execute(stmt).all()
    ]
    return items, total


def resumen(db: Session) -> dict:
    """
    ¿Qué? Conteos de todos los puntos (activos y de baja) y las localidades que tienen al menos uno.
    ¿Para qué? La cabecera y los filtros del panel del Admin; ver ResumenPuntosAcopio.
    """
    activos = db.scalar(select(func.count()).select_from(PuntoAcopio).where(PuntoAcopio.activo.is_(True))) or 0
    de_baja = db.scalar(select(func.count()).select_from(PuntoAcopio).where(PuntoAcopio.activo.is_(False))) or 0
    localidades = db.execute(
        select(Localidad.id_localidad, Localidad.nombre_localidad)
        .where(Localidad.id_localidad.in_(select(PuntoAcopio.id_localidad)))
        .order_by(Localidad.nombre_localidad)
    ).all()
    return {
        "total": activos + de_baja,
        "activos": activos,
        "de_baja": de_baja,
        "localidades": [{"id_localidad": i, "nombre_localidad": n} for i, n in localidades],
    }


def _a_dict(punto: PuntoAcopio) -> dict:
    """¿Qué? Misma forma que listar_todos — el response_model necesita
    nombre_localidad, que no es un atributo directo de PuntoAcopio."""
    return {
        "id_punto_acopio": punto.id_punto_acopio,
        "nombre": punto.nombre,
        "direccion": punto.direccion,
        "nombre_encargado": punto.nombre_encargado,
        "telefono_contacto": punto.telefono_contacto,
        "id_localidad": punto.id_localidad,
        "nombre_localidad": punto.localidad.nombre_localidad,
        "activo": punto.activo,
        "url_foto": punto.url_foto,
        "organizacion": punto.organizacion,
        "correo_contacto": punto.correo_contacto,
    }


def crear(db: Session, data: PuntoAcopioCreate) -> dict:
    """HU-015: registra un nuevo punto de acopio, activo desde el inicio."""
    _verificar_localidad_existe(db, data.id_localidad)
    punto = PuntoAcopio(
        nombre=data.nombre.strip(),
        direccion=data.direccion.strip(),
        id_localidad=data.id_localidad,
        nombre_encargado=data.nombre_encargado.strip() if data.nombre_encargado else None,
        telefono_contacto=data.telefono_contacto.strip() if data.telefono_contacto else None,
        url_foto=data.url_foto,
        activo=True,
    )
    db.add(punto)
    db.commit()
    db.refresh(punto)
    return _a_dict(punto)


def _comentario_a_dict(c: PuntoAcopioComentario) -> dict:
    return {
        "id_comentario": c.id_comentario,
        "texto": c.texto,
        "created_at": c.created_at,
        "autor": c.autor.correo_electronico if c.autor else None,
    }


def listar_comentarios(db: Session, id_punto_acopio: UUID) -> list[dict]:
    """¿Qué? Comentarios del punto, del más reciente al más antiguo."""
    _obtener_punto_o_404(db, id_punto_acopio)
    stmt = (
        select(PuntoAcopioComentario)
        .where(PuntoAcopioComentario.id_punto_acopio == id_punto_acopio)
        .order_by(PuntoAcopioComentario.created_at.desc())
    )
    return [_comentario_a_dict(c) for c in db.scalars(stmt).all()]


def agregar_comentario(db: Session, id_punto_acopio: UUID, autor: Usuario, texto: str) -> dict:
    """
    ¿Qué? Guarda un comentario interno sobre el punto, firmado por el admin.
    ¿Impacto? Se permite también en puntos dados de baja: el historial sigue
              siendo útil (ej. anotar por qué se dio de baja).
    """
    _obtener_punto_o_404(db, id_punto_acopio)
    comentario = PuntoAcopioComentario(
        id_punto_acopio=id_punto_acopio, id_autor=autor.id_usuario, texto=texto
    )
    db.add(comentario)
    db.commit()
    db.refresh(comentario)
    return _comentario_a_dict(comentario)


def editar(db: Session, id_punto_acopio: UUID, data: PuntoAcopioUpdate, autor: Usuario) -> dict:
    """
    HU-016: corrige nombre, dirección, contacto o localidad de un punto existente.
    Si viene motivo_cambio con texto, queda como comentario del punto en la
    misma transacción que el cambio — o se guardan los dos, o ninguno.
    """
    punto = _obtener_punto_o_404(db, id_punto_acopio)
    _verificar_localidad_existe(db, data.id_localidad)

    punto.nombre = data.nombre.strip()
    punto.direccion = data.direccion.strip()
    punto.id_localidad = data.id_localidad
    punto.nombre_encargado = data.nombre_encargado.strip() if data.nombre_encargado else None
    punto.telefono_contacto = data.telefono_contacto.strip() if data.telefono_contacto else None
    punto.url_foto = data.url_foto
    motivo =(data.motivo_cambio or "").strip()
    if motivo:
        db.add(PuntoAcopioComentario(id_punto_acopio=id_punto_acopio, id_autor=autor.id_usuario, texto=motivo))
    db.commit()
    db.refresh(punto)
    return _a_dict(punto)


def dar_de_baja(db: Session, id_punto_acopio: UUID) -> None:
    """
    ¿Qué? HU-017: marca el punto como inactivo — no lo borra.
    ¿Impacto? Deja de aparecer en GET /directorio/puntos-acopio (CA-017.2),
              pero el registro se conserva como historial.
    """
    punto = _obtener_punto_o_404(db, id_punto_acopio)
    punto.activo = False
    db.commit()


def reactivar(db: Session, id_punto_acopio: UUID) -> dict:
    """
    ¿Qué? El contrapeso de dar_de_baja — vuelve a marcar el punto como
          activo, sin perder nada del registro.
    ¿Para qué? Antes, una vez dado de baja, la única salida era eliminarlo
              para siempre — sin forma de deshacer una baja por error, ni
              de reflejar que un punto que dejó de operar volvió a hacerlo.
    """
    punto = _obtener_punto_o_404(db, id_punto_acopio)
    punto.activo = True
    db.commit()
    db.refresh(punto)
    return _a_dict(punto)


def eliminar_definitivamente(db: Session, id_punto_acopio: UUID) -> None:
    """
    ¿Qué? Borra el registro por completo — distinto de dar_de_baja.
    ¿Para qué? Dar de baja es para un punto real que dejó de operar (se
              conserva como historial). Esto es para limpiar un registro
              que nunca debió existir (una prueba, un duplicado, un error
              de captura) — el admin ya no debería seguir viéndolo ni en
              su propio panel.
    ¿Impacto? Solo se permite si el punto ya está dado de baja — evita que
              un punto activo (real, en operación) se borre de un solo
              clic sin pasar primero por "dar de baja".
    """
    punto = _obtener_punto_o_404(db, id_punto_acopio)
    if punto.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Primero debes dar de baja este punto antes de eliminarlo definitivamente.",
        )
    db.delete(punto)
    db.commit()
