"""
Módulo: routers/geography.py
Descripción: Endpoints optimizados para el llenado dinámico de formularios geográficos.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List
from app.dependencies import get_db
from app.models.localidad import Localidad
from app.models.conjunto_residencial import ConjuntoResidencial
from app.models.unidad import Unidad
from app.schemas.geography import LocalidadResponse, ConjuntoResponse, UnidadResponse

router = APIRouter(
    prefix="/api/v1/geography",
    tags=["geography"],
)

@router.get(
    "/localidades",
    response_model=List[LocalidadResponse],
    status_code=status.HTTP_200_OK,
    summary="Obtener todas las localidades de Bogotá"
)
def get_localidades(db: Session = Depends(get_db)):
    """Retorna las localidades ordenadas alfabéticamente para el primer Select."""
    stmt = select(Localidad).order_by(Localidad.nombre_localidad)
    return db.execute(stmt).scalars().all()


@router.get(
    "/conjuntos/{id_localidad}",
    response_model=List[ConjuntoResponse],
    status_code=status.HTTP_200_OK,
    summary="Obtener conjuntos residenciales filtrados por el ID de localidad en la URL"
)
def get_conjuntos_por_localidad(id_localidad: int, db: Session = Depends(get_db)):
    """Retorna los conjuntos cuyo id_localidad coincida con el número enviado en la ruta web."""
    stmt = select(ConjuntoResidencial).where(ConjuntoResidencial.id_localidad == id_localidad)
    return db.execute(stmt).scalars().all()


@router.get(
    "/conjuntos",
    response_model=List[ConjuntoResponse],
    status_code=status.HTTP_200_OK,
    summary="Obtener la lista global de conjuntos residenciales"
)
def get_todos_los_conjuntos(db: Session = Depends(get_db)):
    stmt = select(ConjuntoResidencial)
    return db.execute(stmt).scalars().all()


@router.get(
    "/unidades/{id_conjunto_residencial}",
    response_model=List[UnidadResponse],
    status_code=status.HTTP_200_OK,
    summary="Endpoint adaptado para nomenclatura dinámica"
)
def get_unidades_por_conjunto(id_conjunto_residencial: int, db: Session = Depends(get_db)):
    """
    Retorna un arreglo vacío. Las unidades habitacionales ahora se crean de 
    forma dinámica en el registro para permitir la escalabilidad del sistema.
    """
    return []