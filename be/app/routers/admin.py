"""
Módulo: routers/admin.py
Descripción: Endpoints exclusivos para el panel de administración.
Cumple con los Criterios 6 (Vistas SQL) y 7 (Procedimientos Almacenados).
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.dependencies import get_current_user, get_db
from app.models.usuario import Usuario
from app.models.rol import RolId

router = APIRouter(
    prefix="/api/v1/admin",
    tags=["admin"],
)

# ¿Qué? Límite máximo de filas por página, sin importar lo que pida el
#       cliente.
# ¿Para qué? Evitar que alguien pida limit=999999 y se traiga la tabla
#           completa de un golpe — justo el problema de escala que se
#           quería resolver con la paginación.
MAX_LIMIT = 100


# Estos endpoints muestran datos de todos los usuarios (correo, teléfono,
# dirección), así que solo el Administrador del Sistema puede verlos.
def _verificar_es_admin_sistema(current_user: Usuario) -> None:
    if current_user.id_rol != RolId.ADMIN_SISTEMA:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un Administrador del Sistema puede acceder a este recurso.",
        )


@router.get("/vista-residentes", summary="Criterio 6: Listado mediante Vista SQL")
def obtener_vista_residentes(
    search: Optional[str] = Query(None, description="Busca por nombre, apellido o correo"),
    localidad_id: Optional[int] = Query(None),
    limit: int = Query(20, ge=1, le=MAX_LIMIT),
    offset: int = Query(0, ge=0),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Crea (si no existe) y consulta una Vista SQL de Residentes sin mostrar IDs."""
    _verificar_es_admin_sistema(current_user)

    # 1. Crear o reemplazar la Vista SQL
    # ¿Qué? Se agregó "Localidad" (id y nombre) a la vista — antes no
    #       existía ninguna forma de filtrar residentes por localidad.
    db.execute(text("""
    CREATE OR REPLACE VIEW vista_directorio_residentes AS
    SELECT
        u.correo_electronico AS "Correo",
        r.nombre AS "Nombre",
        r.apellidos AS "Apellido",
        r.numero_telefonico AS "Teléfono",
        c.nombre_conjunto AS "Conjunto",
        uni.torre AS "Bloque",
        uni.apto AS "Apartamento",
        l.id_localidad AS "id_localidad",
        l.nombre_localidad AS "Localidad"
    FROM residentes r
    JOIN usuarios u ON r.id_usuario = u.id_usuario
    JOIN unidades uni ON r.id_unidad = uni.id_unidad
    JOIN conjuntos_residenciales c ON uni.id_conjunto_residencial = c.id_conjunto_residencial
    JOIN localidades l ON c.id_localidad = l.id_localidad;
    """))
    db.commit()

    # 2. Armar el filtro dinámicamente
    # ¿Qué? Antes esto era un "SELECT * FROM vista" sin ningún WHERE — con
    #       miles de residentes, el Admin del Sistema no tenía forma de
    #       encontrar a alguien puntual sin scrollear todo.
    condiciones = []
    params: dict = {"limit": min(limit, MAX_LIMIT), "offset": offset}
    if search:
        condiciones.append('("Nombre" ILIKE :search OR "Apellido" ILIKE :search OR "Correo" ILIKE :search)')
        params["search"] = f"%{search}%"
    if localidad_id:
        condiciones.append('"id_localidad" = :localidad_id')
        params["localidad_id"] = localidad_id
    where_sql = f"WHERE {' AND '.join(condiciones)}" if condiciones else ""

    total = db.execute(
        text(f'SELECT COUNT(*) FROM vista_directorio_residentes {where_sql}'), params
    ).scalar_one()

    result = db.execute(
        text(f'SELECT * FROM vista_directorio_residentes {where_sql} ORDER BY "Nombre" LIMIT :limit OFFSET :offset'),
        params,
    )
    return {"items": [dict(row._mapping) for row in result], "total": total}


@router.get("/sp-recicladores", summary="Criterio 7: Listado mediante Procedimiento Almacenado")
def obtener_sp_recicladores(
    search: Optional[str] = Query(None, description="Busca por nombre, apellido o correo"),
    localidad_id: Optional[int] = Query(None),
    limit: int = Query(20, ge=1, le=MAX_LIMIT),
    offset: int = Query(0, ge=0),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Crea y ejecuta un Procedimiento Almacenado (Función) de Recicladores sin IDs."""
    _verificar_es_admin_sistema(current_user)

    # 1. Crear el Procedimiento Almacenado / Función
    # ¿Qué? Ahora la función SÍ recibe parámetros (búsqueda, localidad,
    #       límite, desplazamiento) — antes no aceptaba ninguno, así que
    #       siempre devolvía la tabla completa sin filtrar.
    # ¿Para qué? Un Procedimiento Almacenado parametrizado es, de hecho,
    #           una demostración más completa del Criterio 7 que una
    #           función sin argumentos.
    db.execute(text("""
    CREATE OR REPLACE FUNCTION sp_obtener_recicladores(
        p_search TEXT DEFAULT NULL,
        p_localidad_id INT DEFAULT NULL,
        p_limit INT DEFAULT 20,
        p_offset INT DEFAULT 0
    )
    RETURNS TABLE (
        "Correo" VARCHAR,
        "Nombre_Completo" VARCHAR,
        "Asociacion" VARCHAR,
        "id_localidad" INT,
        "Localidad" VARCHAR
    ) AS $$
    BEGIN
        RETURN QUERY
        SELECT
            u.correo_electronico::VARCHAR,
            (rec.nombre || ' ' || rec.apellidos)::VARCHAR,
            rec.asociacion::VARCHAR,
            l.id_localidad,
            l.nombre_localidad::VARCHAR
        FROM recicladores rec
        JOIN usuarios u ON rec.id_usuario = u.id_usuario
        LEFT JOIN localidades l ON rec.localidad_id = l.id_localidad
        WHERE (p_search IS NULL OR rec.nombre ILIKE '%' || p_search || '%'
               OR rec.apellidos ILIKE '%' || p_search || '%'
               OR u.correo_electronico ILIKE '%' || p_search || '%')
          AND (p_localidad_id IS NULL OR rec.localidad_id = p_localidad_id)
        ORDER BY rec.nombre
        LIMIT p_limit OFFSET p_offset;
    END;
    $$ LANGUAGE plpgsql;
    """))
    db.commit()

    params = {
        "search": search,
        "localidad_id": localidad_id,
        "limit": min(limit, MAX_LIMIT),
        "offset": offset,
    }

    # ¿Qué? El total no puede salir del mismo SELECT que ya trae LIMIT/OFFSET
    #       aplicados — se cuenta aparte, con el mismo filtro.
    total = db.execute(
        text("""
            SELECT COUNT(*) FROM recicladores rec
            JOIN usuarios u ON rec.id_usuario = u.id_usuario
            WHERE (:search IS NULL OR rec.nombre ILIKE '%' || :search || '%'
                   OR rec.apellidos ILIKE '%' || :search || '%'
                   OR u.correo_electronico ILIKE '%' || :search || '%')
              AND (:localidad_id IS NULL OR rec.localidad_id = :localidad_id)
        """),
        params,
    ).scalar_one()

    result = db.execute(
        text("SELECT * FROM sp_obtener_recicladores(:search, :localidad_id, :limit, :offset)"),
        params,
    )
    return {"items": [dict(row._mapping) for row in result], "total": total}


@router.get("/administradores-conjunto", summary="Listado de Administradores de Conjunto")
def obtener_administradores_conjunto(
    search: Optional[str] = Query(None, description="Busca por nombre, apellido o correo"),
    localidad_id: Optional[int] = Query(None, description="Filtra por localidad de alguno de sus conjuntos"),
    limit: int = Query(20, ge=1, le=MAX_LIMIT),
    offset: int = Query(0, ge=0),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    ¿Qué? Tercer listado del panel del Admin del Sistema — antes no existía
          ninguna forma de ver los Administradores de Conjunto ya creados.
    ¿Para qué? A diferencia de Residente/Reciclador, un Admin de Conjunto no
              tiene una única localidad propia — administra uno o varios
              conjuntos, cada uno en su propia localidad. Por eso el filtro
              de localidad aquí busca "administra AL MENOS un conjunto en
              esa localidad", no una columna directa.
    ¿Impacto? No usa Vista ni Procedimiento Almacenado a propósito — esos
              dos ya demuestran los Criterios 6 y 7 con Residente/Reciclador;
              repetir la misma técnica aquí no agrega nada nuevo.
    """
    _verificar_es_admin_sistema(current_user)

    params = {
        "search": f"%{search}%" if search else None,
        "localidad_id": localidad_id,
        "limit": min(limit, MAX_LIMIT),
        "offset": offset,
    }

    filtro_localidad = """
        AND (:localidad_id IS NULL OR EXISTS (
            SELECT 1 FROM administradores_conjuntos aca2
            JOIN conjuntos_residenciales cr2 ON cr2.id_conjunto_residencial = aca2.id_conjunto_residencial
            WHERE aca2.id_administrador = ac.id_administrador
              AND aca2.fecha_desvinculacion IS NULL
              AND cr2.id_localidad = :localidad_id
        ))
    """
    filtro_search = """
        AND (:search IS NULL OR ac.nombre ILIKE :search OR ac.apellidos ILIKE :search
             OR u.correo_electronico ILIKE :search)
    """

    total = db.execute(
        text(f"""
            SELECT COUNT(*) FROM administradores_conjunto ac
            JOIN usuarios u ON u.id_usuario = ac.id_usuario
            WHERE 1=1 {filtro_search} {filtro_localidad}
        """),
        params,
    ).scalar_one()

    result = db.execute(
        text(f"""
            SELECT
                u.correo_electronico AS "Correo",
                ac.nombre AS "Nombre",
                ac.apellidos AS "Apellido",
                ac.numero_telefonico AS "Teléfono",
                COALESCE(STRING_AGG(DISTINCT cr.nombre_conjunto, ', '), '—') AS "Conjuntos"
            FROM administradores_conjunto ac
            JOIN usuarios u ON u.id_usuario = ac.id_usuario
            LEFT JOIN administradores_conjuntos aca
                ON aca.id_administrador = ac.id_administrador AND aca.fecha_desvinculacion IS NULL
            LEFT JOIN conjuntos_residenciales cr
                ON cr.id_conjunto_residencial = aca.id_conjunto_residencial
            WHERE 1=1 {filtro_search} {filtro_localidad}
            GROUP BY u.correo_electronico, ac.nombre, ac.apellidos, ac.numero_telefonico
            ORDER BY ac.nombre
            LIMIT :limit OFFSET :offset
        """),
        params,
    )
    return {"items": [dict(row._mapping) for row in result], "total": total}
