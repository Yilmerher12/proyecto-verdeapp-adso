"""
Módulo: routers/reportes.py
Descripción: Endpoints específicos para cumplir con los Criterios 6 y 7 de la evaluación del SENA.
¿Para qué? Consumir la Vista SQL y la Función Almacenada directamente desde PostgreSQL usando SQLAlchemy.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.dependencies import get_db

router = APIRouter(
    prefix="/api/v1/reportes",
    tags=["SENA Criterios Obligatorios"],
)

@router.get("/vista-acopio", summary="Criterio 6: Listado mediante Vista SQL")
def obtener_puntos_desde_vista(db: Session = Depends(get_db)):
    """Consume la vista SQL 'vista_directorio_acopio'.
    Retorna los campos de texto requeridos por la rúbrica ocultando los IDs.
    """
    query = text("SELECT * FROM vista_directorio_acopio")
    result = db.execute(query).mappings().all()
    return result


@router.get("/procedimiento-educativo", summary="Criterio 7: Listado mediante Procedimiento Almacenado")
def obtener_contenido_desde_procedimiento(db: Session = Depends(get_db)):
    """Invoca la función almacenada 'obtener_catalogo_educativo()'.
    Muestra los campos de la tabla sin exponer la llave primaria.
    """
    query = text("SELECT * FROM obtener_catalogo_educativo()")
    result = db.execute(query).mappings().all()
    return result