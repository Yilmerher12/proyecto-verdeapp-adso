from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, select
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
from app.schemas.directorio import RecicladorDirectorioResponse, PuntoAcopioDirectorioPagina
from app.services.puntos_acopio_service import condicion_busqueda

router = APIRouter(
    prefix="/api/v1/directorio",
    tags=["directorio"],
)

# ¿Qué? Issue #227 — tope máximo de filas por respuesta. Estos dos
#       listados ya vienen naturalmente acotados (el de Recicladores se
#       fuerza a la localidad del Residente que consulta; el de Puntos de
#       Acopio es infraestructura física que crece muy despacio), pero un
#       tope explícito evita que crezcan sin control si eso cambia.
MAX_LIMIT_DIRECTORIO = 100


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
    limit: int = Query(50, ge=1, le=MAX_LIMIT_DIRECTORIO),
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

    stmt = stmt.order_by(Reciclador.nombre, Reciclador.apellidos).limit(limit)
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


@router.get("/puntos-acopio", response_model=PuntoAcopioDirectorioPagina)
def listar_puntos_acopio(
    localidad_id: Optional[int] = Query(None),
    q: Optional[str] = Query(None, max_length=100),
    # ¿Qué? Issue #664: con el inventario de la UAESP son cientos de puntos, así que el listado
    #       se entrega por páginas ({"items", "total"}) y la búsqueda se hace aquí, no en el navegador.
    limit: int = Query(20, ge=1, le=MAX_LIMIT_DIRECTORIO),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    # ¿Qué? RQF-011/HU-017: un punto dado de baja por el Admin Sistema
    #       no debe seguir apareciendo en el directorio público.
    condiciones = [PuntoAcopio.activo.is_(True)]
    if localidad_id:
        condiciones.append(PuntoAcopio.id_localidad == localidad_id)
    busqueda = condicion_busqueda(q)
    if busqueda is not None:
        condiciones.append(busqueda)

    total = db.scalar(select(func.count()).select_from(PuntoAcopio).where(*condiciones)) or 0
    stmt = (
        select(
            PuntoAcopio.id_punto_acopio,
            PuntoAcopio.nombre,
            PuntoAcopio.direccion,
            PuntoAcopio.telefono_contacto,
            PuntoAcopio.nombre_encargado,
            PuntoAcopio.url_foto,
            PuntoAcopio.organizacion,
            PuntoAcopio.correo_contacto,
            Localidad.nombre_localidad,
        )
        .join(Localidad, PuntoAcopio.id_localidad == Localidad.id_localidad)
        .where(*condiciones)
        # ¿Qué? id_punto_acopio al final: con nombres repetidos ("ECA" ×80) un orden con empates
        #       podría repetir o saltar filas entre páginas.
        .order_by(Localidad.nombre_localidad, PuntoAcopio.nombre, PuntoAcopio.id_punto_acopio)
        .limit(limit)
        .offset(offset)
    )
    rows = db.execute(stmt).all()

    return {
        "items": [
            {
                "id_punto_acopio": r.id_punto_acopio,
                "nombre": r.nombre,
                "direccion": r.direccion,
                "telefono_contacto": r.telefono_contacto,
                "nombre_encargado": r.nombre_encargado,
                "nombre_localidad": r.nombre_localidad,
                "url_foto": r.url_foto,
                "organizacion": r.organizacion,
                "correo_contacto": r.correo_contacto,
            }
            for r in rows
        ],
        "total": total,
    }
