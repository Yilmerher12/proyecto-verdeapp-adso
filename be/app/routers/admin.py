"""
Módulo: routers/admin.py
Descripción: Endpoints exclusivos para el panel de administración.
Cumple con los Criterios 6 (Vistas SQL) y 7 (Procedimientos Almacenados).
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.dependencies import get_db

router = APIRouter(
    prefix="/api/v1/admin",
    tags=["admin"],
)


@router.get("/vista-residentes", summary="Criterio 6: Listado mediante Vista SQL")
def obtener_vista_residentes(db: Session = Depends(get_db)):
    """Crea (si no existe) y consulta una Vista SQL de Residentes sin mostrar IDs."""

    # 1. Crear o reemplazar la Vista SQL
    # ¿Qué? Antes leía r.apellido_paterno (columna eliminada al fusionar
    #       apellido_paterno + apellido_materno en una sola columna "apellidos").
    # ¿Impacto? Sin este cambio, esta consulta falla con un error de
    #           PostgreSQL ("column apellido_paterno does not exist") y
    #           el dashboard se queda cargando para siempre.
    db.execute(text("""
    CREATE OR REPLACE VIEW vista_directorio_residentes AS
    SELECT 
        u.correo_electronico AS "Correo",
        r.nombre AS "Nombre",
        r.apellidos AS "Apellido",
        r.numero_telefonico AS "Teléfono",
        c.nombre_conjunto AS "Conjunto",
        uni.torre AS "Bloque",
        uni.apto AS "Apartamento"
    FROM residentes r
    JOIN usuarios u ON r.id_usuario = u.id_usuario
    JOIN unidades uni ON r.id_unidad = uni.id_unidad
    JOIN conjuntos_residenciales c ON uni.id_conjunto_residencial = c.id_conjunto_residencial;
    """))
    db.commit()

    # 2. Consultar la Vista
    result = db.execute(text("SELECT * FROM vista_directorio_residentes"))
    return [dict(row._mapping) for row in result]


@router.get("/sp-recicladores", summary="Criterio 7: Listado mediante Procedimiento Almacenado")
def obtener_sp_recicladores(db: Session = Depends(get_db)):
    """Crea y ejecuta un Procedimiento Almacenado (Función) de Recicladores sin IDs."""

    # 1. Crear el Procedimiento Almacenado / Función
    # ¿Qué? Igual que la vista: rec.apellido_paterno -> rec.apellidos.
    db.execute(text("""
    CREATE OR REPLACE FUNCTION sp_obtener_recicladores()
    RETURNS TABLE (
        "Correo" VARCHAR, 
        "Nombre_Completo" VARCHAR, 
        "Asociacion" VARCHAR
    ) AS $$
    BEGIN
        RETURN QUERY
        SELECT 
            u.correo_electronico::VARCHAR,
            (rec.nombre || ' ' || rec.apellidos)::VARCHAR,
            rec.asociacion::VARCHAR
        FROM recicladores rec
        JOIN usuarios u ON rec.id_usuario = u.id_usuario;
    END;
    $$ LANGUAGE plpgsql;
    """))
    db.commit()

    # 2. Ejecutar la función
    result = db.execute(text("SELECT * FROM sp_obtener_recicladores()"))
    return [dict(row._mapping) for row in result]