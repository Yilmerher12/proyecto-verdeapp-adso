from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional

from app.dependencies import get_db, get_current_user
from app.models.usuario import Usuario
from app.models.reciclador import Reciclador
from app.models.punto_acopio import PuntoAcopio
from app.models.localidad import Localidad
from app.schemas.directorio import RecicladorDirectorioResponse, PuntoAcopioDirectorioResponse

router = APIRouter(
    prefix="/api/v1/directorio",
    tags=["directorio"],
)


@router.get("/recicladores", response_model=List[RecicladorDirectorioResponse])
def listar_recicladores(
    localidad_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    stmt = (
        select(
            Reciclador.id_reciclador,
            Reciclador.nombre,
            Reciclador.apellidos,
            Reciclador.numero_telefonico,
            Reciclador.asociacion,
            Localidad.nombre_localidad,
        )
        .outerjoin(Localidad, Reciclador.localidad_id == Localidad.id_localidad)
    )
    if localidad_id:
        stmt = stmt.where(Reciclador.localidad_id == localidad_id)

    stmt = stmt.order_by(Reciclador.nombre, Reciclador.apellidos)
    rows = db.execute(stmt).all()

    return [
        {
            "id_reciclador": r.id_reciclador,
            "nombre": r.nombre,
            "apellidos": r.apellidos,
            "numero_telefonico": r.numero_telefonico,
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
