"""
Módulo: routers/admin.py
Descripción: Endpoints exclusivos para el panel de administración.
Cumple con los Criterios 6 (Vistas SQL) y 7 (Procedimientos Almacenados).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.dependencies import get_current_user, get_db
from app.models.usuario import Usuario

router = APIRouter(
    prefix="/api/v1/admin",
    tags=["admin"],
)


# ¿Qué? Solo el Administrador del Sistema (id_rol = 1) puede ver estos listados.
# ¿Para qué? Estos endpoints exponen datos personales (correo, teléfono, dirección)
#           de todos los residentes/recicladores; deben quedar restringidos igual
#           que el resto de rutas administrativas del proyecto.
def _verificar_es_admin_sistema(current_user: Usuario) -> None:
    if current_user.id_rol != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un Administrador del Sistema puede acceder a este recurso.",
        )


@router.get("/vista-residentes", summary="Criterio 6: Listado mediante Vista SQL")
def obtener_vista_residentes(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Crea (si no existe) y consulta una Vista SQL de Residentes sin mostrar IDs."""
    _verificar_es_admin_sistema(current_user)

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
def obtener_sp_recicladores(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Crea y ejecuta un Procedimiento Almacenado (Función) de Recicladores sin IDs."""
    _verificar_es_admin_sistema(current_user)

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