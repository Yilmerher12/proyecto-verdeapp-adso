"""
Módulo: routers/admin.py
Descripción: Endpoints exclusivos para el panel de administración.
Cumple con los Criterios 6 (Vistas SQL) y 7 (Procedimientos Almacenados).
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, text
from app.dependencies import get_current_user, get_db
from app.models.usuario import Usuario
from app.models.rol import RolId
from app.schemas.admin import CambiarHabilitadoRequest

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


def _resolver_orden(
    order_by: Optional[str],
    order_dir: Optional[str],
    columnas_permitidas: dict[str, str],
    columna_por_defecto: str,
) -> tuple[str, str]:
    """
    ¿Qué? Valida order_by/order_dir contra una lista blanca de columnas antes
          de interpolarlos en el SQL.
    ¿Para qué? Postgres no permite pasar el nombre de una columna como
              parámetro ligado (:col) — solo valores. Armar el ORDER BY con
              f-string exige entonces controlar de antemano qué puede llegar
              ahí; cualquier order_by que no esté en la lista blanca se
              ignora y cae al orden por defecto, en vez de dejarlo pasar tal
              cual al SQL.
    ¿Impacto? Reutilizado por los 3 listados del panel de Admin del Sistema
              (Residentes, Recicladores, Administradores de Conjunto).
    """
    columna_sql = columnas_permitidas.get(order_by or "", columnas_permitidas[columna_por_defecto])
    direccion_sql = "DESC" if order_dir == "desc" else "ASC"
    return columna_sql, direccion_sql


@router.patch("/usuarios/{correo_electronico}/habilitado", summary="Activar o desactivar la cuenta de un usuario")
def cambiar_habilitado(
    correo_electronico: str,
    body: CambiarHabilitadoRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    ¿Qué? El profesor pidió que la vista de usuarios del Admin del Sistema
          permita HACER algo, no solo consultar. Esta es esa primera
          acción: activar/desactivar una cuenta.
    ¿Para qué? Usa el correo (no el id_usuario) como identificador porque
              las 3 vistas de usuarios (vista-residentes, sp-recicladores,
              administradores-conjunto) muestran el correo a propósito y
              nunca el id — así no hace falta cambiar ese diseño.
    ¿Impacto? Una cuenta desactivada pierde acceso de inmediato en la
              siguiente petición (ver dependencies.get_current_user), y no
              puede volver a iniciar sesión ni renovar su token mientras
              siga desactivada.
    """
    _verificar_es_admin_sistema(current_user)

    if correo_electronico == current_user.correo_electronico:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes desactivar tu propia cuenta.",
        )

    usuario_objetivo = db.execute(
        select(Usuario).where(Usuario.correo_electronico == correo_electronico)
    ).scalar_one_or_none()
    if not usuario_objetivo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")

    usuario_objetivo.habilitado = body.habilitado
    db.commit()
    return {"correo_electronico": correo_electronico, "habilitado": body.habilitado}


# ¿Qué? Columnas por las que se puede ordenar el listado de Residentes,
#       mapeadas al nombre real (entre comillas, tal como quedó definido en
#       la Vista SQL) — ver _resolver_orden.
COLUMNAS_ORDENABLES_RESIDENTES = {
    "correo": '"Correo"',
    "nombre": '"Nombre"',
    "conjunto": '"Conjunto"',
    "unidad": '"Bloque"',
    "estado": '"Habilitado"',
}


@router.get("/vista-residentes", summary="Criterio 6: Listado mediante Vista SQL")
def obtener_vista_residentes(
    search: Optional[str] = Query(None, description="Busca por nombre, apellido o correo"),
    localidad_id: Optional[int] = Query(None),
    order_by: Optional[str] = Query(None, description="correo, nombre, conjunto, unidad o estado"),
    order_dir: Optional[str] = Query(None, description="asc o desc"),
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
        l.nombre_localidad AS "Localidad",
        u.habilitado AS "Habilitado"
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

    columna_sql, direccion_sql = _resolver_orden(order_by, order_dir, COLUMNAS_ORDENABLES_RESIDENTES, "nombre")
    result = db.execute(
        text(
            f'SELECT * FROM vista_directorio_residentes {where_sql} '
            f'ORDER BY {columna_sql} {direccion_sql} LIMIT :limit OFFSET :offset'
        ),
        params,
    )
    return {"items": [dict(row._mapping) for row in result], "total": total}


# ¿Qué? A diferencia de las otras 2 listas (columnas_permitidas → columna
#       SQL real), aquí solo se valida que el valor esté en el conjunto —
#       el mapeo a la columna real vive DENTRO de la función (ver el CASE
#       del CREATE FUNCTION más abajo), porque el orden tiene que aplicarse
#       ahí, antes del LIMIT/OFFSET.
COLUMNAS_ORDENABLES_RECICLADORES = {"correo", "nombre", "asociacion", "estado"}


@router.get("/sp-recicladores", summary="Criterio 7: Listado mediante Procedimiento Almacenado")
def obtener_sp_recicladores(
    search: Optional[str] = Query(None, description="Busca por nombre, apellido o correo"),
    localidad_id: Optional[int] = Query(None),
    order_by: Optional[str] = Query(None, description="correo, nombre, asociacion o estado"),
    order_dir: Optional[str] = Query(None, description="asc o desc"),
    limit: int = Query(20, ge=1, le=MAX_LIMIT),
    offset: int = Query(0, ge=0),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Crea y ejecuta un Procedimiento Almacenado (Función) de Recicladores sin IDs."""
    _verificar_es_admin_sistema(current_user)

    # ¿Qué? Postgres NO permite que CREATE OR REPLACE FUNCTION cambie las
    #       columnas de salida (RETURNS TABLE) ni la firma de parámetros de
    #       una función que ya existe con otra forma — falla con "cannot
    #       change return type/parameter of existing function". Como esta
    #       función se recrea en cada petición y le acabamos de agregar
    #       p_order_by/p_order_dir, hay que borrar la versión vieja primero.
    # ¿Para qué? Sin este DROP, cualquier entorno que ya tuviera creada la
    #           función con la firma anterior (4 parámetros) se quedaría
    #           con un error 500 permanente en este endpoint.
    # ¿Impacto? DROP FUNCTION IF EXISTS no falla si la función no existe
    #           todavía (primera vez que corre este endpoint).
    db.execute(text(
        "DROP FUNCTION IF EXISTS sp_obtener_recicladores(TEXT, INT, INT, INT)"
    ))
    db.execute(text(
        "DROP FUNCTION IF EXISTS sp_obtener_recicladores(TEXT, INT, TEXT, TEXT, INT, INT)"
    ))

    # 1. Crear el Procedimiento Almacenado / Función
    # ¿Qué? Ahora la función SÍ recibe parámetros (búsqueda, localidad,
    #       orden, límite, desplazamiento) — antes no aceptaba ninguno, así
    #       que siempre devolvía la tabla completa sin filtrar.
    # ¿Para qué? Un Procedimiento Almacenado parametrizado es, de hecho,
    #           una demostración más completa del Criterio 7 que una
    #           función sin argumentos.
    # ¿Impacto? p_order_by/p_order_dir ya llegan validados contra
    #           COLUMNAS_ORDENABLES_RECICLADORES desde Python (nunca el
    #           texto crudo del query param) — el CASE de abajo solo
    #           reconoce esos 4 valores exactos, cualquier otra cosa cae en
    #           el ELSE (orden por nombre, el de siempre).
    db.execute(text("""
    CREATE OR REPLACE FUNCTION sp_obtener_recicladores(
        p_search TEXT DEFAULT NULL,
        p_localidad_id INT DEFAULT NULL,
        p_order_by TEXT DEFAULT 'nombre',
        p_order_dir TEXT DEFAULT 'asc',
        p_limit INT DEFAULT 20,
        p_offset INT DEFAULT 0
    )
    RETURNS TABLE (
        "Correo" VARCHAR,
        "Nombre_Completo" VARCHAR,
        "Asociacion" VARCHAR,
        "id_localidad" INT,
        "Localidad" VARCHAR,
        "Habilitado" BOOLEAN
    ) AS $$
    BEGIN
        RETURN QUERY
        SELECT
            u.correo_electronico::VARCHAR,
            (rec.nombre || ' ' || rec.apellidos)::VARCHAR,
            rec.asociacion::VARCHAR,
            l.id_localidad,
            l.nombre_localidad::VARCHAR,
            u.habilitado
        FROM recicladores rec
        JOIN usuarios u ON rec.id_usuario = u.id_usuario
        LEFT JOIN localidades l ON rec.localidad_id = l.id_localidad
        WHERE (p_search IS NULL OR rec.nombre ILIKE '%' || p_search || '%'
               OR rec.apellidos ILIKE '%' || p_search || '%'
               OR u.correo_electronico ILIKE '%' || p_search || '%')
          AND (p_localidad_id IS NULL OR rec.localidad_id = p_localidad_id)
        ORDER BY
            CASE WHEN p_order_dir = 'asc' THEN
                CASE p_order_by
                    WHEN 'correo' THEN u.correo_electronico
                    WHEN 'asociacion' THEN rec.asociacion
                    WHEN 'estado' THEN u.habilitado::TEXT
                    ELSE rec.nombre
                END
            END ASC,
            CASE WHEN p_order_dir = 'desc' THEN
                CASE p_order_by
                    WHEN 'correo' THEN u.correo_electronico
                    WHEN 'asociacion' THEN rec.asociacion
                    WHEN 'estado' THEN u.habilitado::TEXT
                    ELSE rec.nombre
                END
            END DESC
        LIMIT p_limit OFFSET p_offset;
    END;
    $$ LANGUAGE plpgsql;
    """))
    db.commit()

    order_by_validado = order_by if order_by in COLUMNAS_ORDENABLES_RECICLADORES else "nombre"
    order_dir_validado = "desc" if order_dir == "desc" else "asc"

    params = {
        "search": search,
        "localidad_id": localidad_id,
        "order_by": order_by_validado,
        "order_dir": order_dir_validado,
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

    # ¿Qué? Llamada con parámetros nombrados (p_x => :x) en vez de
    #       posicionales — con 6 parámetros ahora, uno posicional mal
    #       ordenado pasaría desapercibido (todos son TEXT/INT).
    result = db.execute(
        text(
            "SELECT * FROM sp_obtener_recicladores("
            "p_search => :search, p_localidad_id => :localidad_id, "
            "p_order_by => :order_by, p_order_dir => :order_dir, "
            "p_limit => :limit, p_offset => :offset)"
        ),
        params,
    )
    return {"items": [dict(row._mapping) for row in result], "total": total}


# ¿Qué? "Conjuntos" apunta al alias del SELECT (columna agregada con
#       STRING_AGG), no a una columna de tabla — Postgres permite usar el
#       alias en el ORDER BY porque este se resuelve después del SELECT.
COLUMNAS_ORDENABLES_ADMINS = {
    "correo": "u.correo_electronico",
    "nombre": "ac.nombre",
    "telefono": "ac.numero_telefonico",
    "conjuntos": '"Conjuntos"',
    "estado": "u.habilitado",
}


@router.get("/administradores-conjunto", summary="Listado de Administradores de Conjunto")
def obtener_administradores_conjunto(
    search: Optional[str] = Query(None, description="Busca por nombre, apellido o correo"),
    localidad_id: Optional[int] = Query(None, description="Filtra por localidad de alguno de sus conjuntos"),
    order_by: Optional[str] = Query(None, description="correo, nombre, telefono, conjuntos o estado"),
    order_dir: Optional[str] = Query(None, description="asc o desc"),
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

    columna_sql, direccion_sql = _resolver_orden(order_by, order_dir, COLUMNAS_ORDENABLES_ADMINS, "nombre")

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
                u.habilitado AS "Habilitado",
                COALESCE(STRING_AGG(DISTINCT cr.nombre_conjunto, ', '), '—') AS "Conjuntos"
            FROM administradores_conjunto ac
            JOIN usuarios u ON u.id_usuario = ac.id_usuario
            LEFT JOIN administradores_conjuntos aca
                ON aca.id_administrador = ac.id_administrador AND aca.fecha_desvinculacion IS NULL
            LEFT JOIN conjuntos_residenciales cr
                ON cr.id_conjunto_residencial = aca.id_conjunto_residencial
            WHERE 1=1 {filtro_search} {filtro_localidad}
            GROUP BY u.correo_electronico, ac.nombre, ac.apellidos, ac.numero_telefonico, u.habilitado
            ORDER BY {columna_sql} {direccion_sql}
            LIMIT :limit OFFSET :offset
        """),
        params,
    )
    return {"items": [dict(row._mapping) for row in result], "total": total}
