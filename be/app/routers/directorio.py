from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional

from app.dependencies import get_db, get_current_user
from app.models.usuario import Usuario
from app.models.residente import Residente
from app.models.unidad import Unidad
from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.reciclador import Reciclador
from app.models.punto_acopio import PuntoAcopio
from app.models.localidad import Localidad
from app.models.rol import RolId
from app.schemas.directorio import RecicladorDirectorioResponse, PuntoAcopioDirectorioResponse

router = APIRouter(
    prefix="/api/v1/directorio",
    tags=["directorio"],
)


def _localidad_del_residente(db: Session, id_usuario) -> Optional[int]:
    """
    ¿Qué? Localidad del conjunto donde vive el Residente autenticado.
    ¿Para qué? El filtro de localidad en la pestaña de Recicladores queda
              fijo a la propia (HU-006/CA-006.6) — no basta con que el
              frontend lo bloquee, si alguien llamara este endpoint
              directamente con otra localidad igual quedaría restringido aquí.
    """
    stmt = (
        select(ConjuntoResidencial.id_localidad)
        .join(Unidad, Unidad.id_conjunto_residencial == ConjuntoResidencial.id_conjunto_residencial)
        .join(Residente, Residente.id_unidad == Unidad.id_unidad)
        .where(Residente.id_usuario == id_usuario)
    )
    return db.execute(stmt).scalar_one_or_none()


@router.get("/recicladores", response_model=List[RecicladorDirectorioResponse])
def listar_recicladores(
    localidad_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if current_user.id_rol == RolId.RESIDENTE:
        localidad_id = _localidad_del_residente(db, current_user.id_usuario)

    stmt = (
        select(
            Reciclador.id_reciclador,
            Reciclador.nombre,
            Reciclador.apellidos,
            Reciclador.numero_telefonico,
            Reciclador.asociacion,
            Reciclador.mostrar_contacto_directorio,
            Localidad.nombre_localidad,
        )
        .outerjoin(Localidad, Reciclador.localidad_id == Localidad.id_localidad)
    )
    if localidad_id:
        stmt = stmt.where(Reciclador.localidad_id == localidad_id)

    stmt = stmt.order_by(Reciclador.nombre, Reciclador.apellidos)
    rows = db.execute(stmt).all()

    # ¿Qué? El teléfono solo se incluye si el reciclador activó
    #       "mostrar_contacto_directorio" desde su Perfil.
    # ¿Para qué? Antes se enviaba siempre — el frontend lo ocultaba en
    #           algunos casos, pero un dato personal que no debe exponerse
    #           no debería ni siquiera SALIR del backend. Que la decisión
    #           de privacidad se aplique en la fuente, no en la vista.
    return [
        {
            "id_reciclador": r.id_reciclador,
            "nombre": r.nombre,
            "apellidos": r.apellidos,
            "numero_telefonico": r.numero_telefonico if r.mostrar_contacto_directorio else None,
            "asociacion": r.asociacion,
            "nombre_localidad": r.nombre_localidad,
        }
        for r in rows
    ]


@router.get("/puntos-acopio", response_model=List[PuntoAcopioDirectorioResponse])
def listar_puntos_acopio(
    localidad_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    stmt = (
        select(
            PuntoAcopio.id_punto_acopio,
            PuntoAcopio.nombre,
            PuntoAcopio.direccion,
            PuntoAcopio.telefono_contacto,
            PuntoAcopio.nombre_encargado,
            Localidad.nombre_localidad,
        )
        .join(Localidad, PuntoAcopio.id_localidad == Localidad.id_localidad)
        # ¿Qué? RQF-011/HU-017: un punto dado de baja por el Admin Sistema
        #       no debe seguir apareciendo en el directorio público.
        .where(PuntoAcopio.activo.is_(True))
    )
    if localidad_id:
        stmt = stmt.where(PuntoAcopio.id_localidad == localidad_id)

    stmt = stmt.order_by(Localidad.nombre_localidad, PuntoAcopio.nombre)
    rows = db.execute(stmt).all()

    return [
        {
            "id_punto_acopio": r.id_punto_acopio,
            "nombre": r.nombre,
            "direccion": r.direccion,
            "telefono_contacto": r.telefono_contacto,
            "nombre_encargado": r.nombre_encargado,
            "nombre_localidad": r.nombre_localidad,
        }
        for r in rows
    ]
