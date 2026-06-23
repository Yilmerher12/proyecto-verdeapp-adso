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


@router.get("/conjuntos/todos")
def listar_todos_los_conjuntos_verificados(db: Session = Depends(get_db)):
    """Devuelve TODOS los conjuntos marcados como verificado=True, sin filtrar por localidad."""
    stmt = (
        select(
            ConjuntoResidencial.id_conjunto_residencial,
            ConjuntoResidencial.nombre_conjunto,
            Localidad.nombre_localidad,
        )
        .join(Localidad, ConjuntoResidencial.id_localidad == Localidad.id_localidad)
        .where(ConjuntoResidencial.verificado.is_(True))
        .order_by(Localidad.nombre_localidad, ConjuntoResidencial.nombre_conjunto)
    )
    resultados = db.execute(stmt).all()

    return [
        {
            "id_conjunto_residencial": fila.id_conjunto_residencial,
            "nombre_conjunto": fila.nombre_conjunto,
            "nombre_localidad": fila.nombre_localidad,
        }
        for fila in resultados
    ]


@router.get(
    "/conjuntos/{id_localidad}",
    response_model=List[ConjuntoResponse],
    status_code=status.HTTP_200_OK,
    summary="Obtener conjuntos residenciales VERIFICADOS, filtrados por localidad"
)
def get_conjuntos_por_localidad(id_localidad: int, db: Session = Depends(get_db)):
    """
    Retorna los conjuntos cuyo id_localidad coincida con el número enviado en
    la ruta, PERO solo los que ya fueron verificados por un Administrador
    del Sistema.

    ¿Qué cambió? Antes este endpoint devolvía TODOS los conjuntos de la
    localidad, sin importar si estaban verificados. Como este es el
    endpoint que usa el formulario de registro público (Residentes y
    Recicladores eligiendo su conjunto), eso permitía que alguien se
    registrara en un conjunto que un Administrador del Sistema todavía
    no había confirmado — contradiciendo la decisión de seguridad de que
    solo conjuntos verificados deben ser seleccionables públicamente.

    ¿Impacto? Si un conjunto recién creado (verificado=False) no aparece
    en el selector de registro, es el comportamiento esperado: debe
    esperar a que un Administrador del Sistema lo verifique primero.
    """
    stmt = select(ConjuntoResidencial).where(
        ConjuntoResidencial.id_localidad == id_localidad,
        ConjuntoResidencial.verificado.is_(True),
    )
    return db.execute(stmt).scalars().all()


@router.get(
    "/conjuntos",
    response_model=List[ConjuntoResponse],
    status_code=status.HTTP_200_OK,
    summary="Obtener la lista global de conjuntos residenciales verificados"
)
def get_todos_los_conjuntos(db: Session = Depends(get_db)):
    """
    ¿Qué cambió? Igual que el endpoint anterior — se agrega el filtro
    verificado=True. Este endpoint no se usa actualmente en ningún
    formulario visto hasta ahora, pero se corrige por consistencia: ningún
    endpoint de geografía debería exponer conjuntos no verificados salvo
    "/conjuntos/todos" (de uso exclusivo del Administrador del Sistema, que
    YA filtraba correctamente).
    """
    stmt = select(ConjuntoResidencial).where(ConjuntoResidencial.verificado.is_(True))
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