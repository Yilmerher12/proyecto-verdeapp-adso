"""
Módulo: services/puntos_acopio_service.py
Descripción: Lógica de negocio de la gestión de puntos de acopio (RQF-011).
¿Para qué? HU-015/016/017: el Admin Sistema registra, actualiza y da de
          baja los puntos de acopio oficiales — antes solo se podían leer
          (directorio.py), y los 9 reales solo existían por estar
          escritos a mano en seed.py.
"""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.localidad import Localidad
from app.models.punto_acopio import PuntoAcopio
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


def listar_todos(db: Session) -> list[dict]:
    """
    ¿Qué? Vista de administración: incluye los puntos dados de baja
          (activo=False), a diferencia de GET /directorio/puntos-acopio.
    ¿Para qué? El Admin Sistema necesita ver todo lo que existe para poder
              gestionarlo, no solo lo que hoy se muestra a Residentes.
    """
    stmt = (
        select(
            PuntoAcopio.id_punto_acopio,
            PuntoAcopio.nombre,
            PuntoAcopio.direccion,
            PuntoAcopio.nombre_encargado,
            PuntoAcopio.telefono_contacto,
            PuntoAcopio.id_localidad,
            PuntoAcopio.activo,
            Localidad.nombre_localidad,
        )
        .join(Localidad, PuntoAcopio.id_localidad == Localidad.id_localidad)
        .order_by(Localidad.nombre_localidad, PuntoAcopio.nombre)
    )
    rows = db.execute(stmt).all()
    return [
        {
            "id_punto_acopio": r.id_punto_acopio,
            "nombre": r.nombre,
            "direccion": r.direccion,
            "nombre_encargado": r.nombre_encargado,
            "telefono_contacto": r.telefono_contacto,
            "id_localidad": r.id_localidad,
            "nombre_localidad": r.nombre_localidad,
            "activo": r.activo,
        }
        for r in rows
    ]


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
        activo=True,
    )
    db.add(punto)
    db.commit()
    db.refresh(punto)
    return _a_dict(punto)


def editar(db: Session, id_punto_acopio: UUID, data: PuntoAcopioUpdate) -> dict:
    """HU-016: corrige nombre, dirección, contacto o localidad de un punto existente."""
    punto = _obtener_punto_o_404(db, id_punto_acopio)
    _verificar_localidad_existe(db, data.id_localidad)

    punto.nombre = data.nombre.strip()
    punto.direccion = data.direccion.strip()
    punto.id_localidad = data.id_localidad
    punto.nombre_encargado = data.nombre_encargado.strip() if data.nombre_encargado else None
    punto.telefono_contacto = data.telefono_contacto.strip() if data.telefono_contacto else None
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
