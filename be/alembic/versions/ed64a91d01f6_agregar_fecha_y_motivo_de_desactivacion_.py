"""agregar fecha y motivo de desactivacion a usuarios

¿Qué? Agrega "fecha_desactivacion" y "motivo_desactivacion" a "usuarios", y
      actualiza la vista "vista_directorio_residentes" y la función
      "sp_obtener_recicladores" para devolverlas, además de aceptar un
      filtro por estado (habilitado).
¿Para qué? El Admin del Sistema desactiva cuentas desde su panel, pero solo
          quedaba "habilitado = false", sin saber cuándo ni por qué. Con
          estas 2 columnas puede ver el motivo en la tabla y en el perfil,
          y con el filtro nuevo encontrar rápido las cuentas inactivas.
¿Impacto? No destructiva: las 2 columnas son NULL en toda cuenta existente.
          La vista solo AGREGA columnas al final (Postgres no deja
          reordenar ni quitar columnas con CREATE OR REPLACE VIEW). La
          función cambia su tipo de retorno y sus parámetros, así que se
          borra y se vuelve a crear (Postgres no permite reemplazarla).

Revision ID: ed64a91d01f6
Revises: fb1891a1aa72
Create Date: 2026-09-21 09:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = 'ed64a91d01f6'
down_revision: Union[str, Sequence[str], None] = 'fb1891a1aa72'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

FIRMA_SP_ANTERIOR = "sp_obtener_recicladores(TEXT, INT, UUID, TEXT, TEXT, INT, INT)"
FIRMA_SP_NUEVA = "sp_obtener_recicladores(TEXT, INT, UUID, TEXT, TEXT, INT, INT, BOOLEAN)"

VISTA_ANTERIOR = """
    CREATE VIEW vista_directorio_residentes AS
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
        u.habilitado AS "Habilitado",
        c.id_conjunto_residencial AS "id_conjunto_residencial"
    FROM residentes r
    JOIN usuarios u ON r.id_usuario = u.id_usuario
    JOIN unidades uni ON r.id_unidad = uni.id_unidad
    JOIN conjuntos_residenciales c ON uni.id_conjunto_residencial = c.id_conjunto_residencial
    JOIN localidades l ON c.id_localidad = l.id_localidad;
"""

SP_ANTERIOR = """
    CREATE OR REPLACE FUNCTION sp_obtener_recicladores(
        p_search TEXT DEFAULT NULL,
        p_localidad_id INT DEFAULT NULL,
        p_conjunto_id UUID DEFAULT NULL,
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
          AND (p_conjunto_id IS NULL OR EXISTS (
                SELECT 1 FROM recicladores_conjuntos rc2
                WHERE rc2.id_reciclador = rec.id_reciclador
                  AND rc2.id_conjunto_residencial = p_conjunto_id
                  AND rc2.fecha_revocacion IS NULL
              ))
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
"""


def upgrade() -> None:
    op.add_column("usuarios", sa.Column("fecha_desactivacion", sa.DateTime(timezone=True), nullable=True))
    op.add_column("usuarios", sa.Column("motivo_desactivacion", sa.String(length=200), nullable=True))

    # ¿Qué? Las 2 columnas nuevas van al FINAL del SELECT.
    # ¿Para qué? CREATE OR REPLACE VIEW solo permite agregar columnas al
    #           final; insertarlas en medio falla con InvalidTableDefinition.
    op.execute("""
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
        u.habilitado AS "Habilitado",
        c.id_conjunto_residencial AS "id_conjunto_residencial",
        u.fecha_desactivacion AS "Fecha_Desactivacion",
        u.motivo_desactivacion AS "Motivo_Desactivacion"
    FROM residentes r
    JOIN usuarios u ON r.id_usuario = u.id_usuario
    JOIN unidades uni ON r.id_unidad = uni.id_unidad
    JOIN conjuntos_residenciales c ON uni.id_conjunto_residencial = c.id_conjunto_residencial
    JOIN localidades l ON c.id_localidad = l.id_localidad;
    """)

    op.execute(f"DROP FUNCTION IF EXISTS {FIRMA_SP_ANTERIOR}")
    op.execute("""
    CREATE OR REPLACE FUNCTION sp_obtener_recicladores(
        p_search TEXT DEFAULT NULL,
        p_localidad_id INT DEFAULT NULL,
        p_conjunto_id UUID DEFAULT NULL,
        p_order_by TEXT DEFAULT 'nombre',
        p_order_dir TEXT DEFAULT 'asc',
        p_limit INT DEFAULT 20,
        p_offset INT DEFAULT 0,
        p_habilitado BOOLEAN DEFAULT NULL
    )
    RETURNS TABLE (
        "Correo" VARCHAR,
        "Nombre_Completo" VARCHAR,
        "Asociacion" VARCHAR,
        "id_localidad" INT,
        "Localidad" VARCHAR,
        "Habilitado" BOOLEAN,
        "Fecha_Desactivacion" TIMESTAMPTZ,
        "Motivo_Desactivacion" VARCHAR
    ) AS $$
    BEGIN
        RETURN QUERY
        SELECT
            u.correo_electronico::VARCHAR,
            (rec.nombre || ' ' || rec.apellidos)::VARCHAR,
            rec.asociacion::VARCHAR,
            l.id_localidad,
            l.nombre_localidad::VARCHAR,
            u.habilitado,
            u.fecha_desactivacion,
            u.motivo_desactivacion::VARCHAR
        FROM recicladores rec
        JOIN usuarios u ON rec.id_usuario = u.id_usuario
        LEFT JOIN localidades l ON rec.localidad_id = l.id_localidad
        WHERE (p_search IS NULL OR rec.nombre ILIKE '%' || p_search || '%'
               OR rec.apellidos ILIKE '%' || p_search || '%'
               OR u.correo_electronico ILIKE '%' || p_search || '%')
          AND (p_localidad_id IS NULL OR rec.localidad_id = p_localidad_id)
          AND (p_habilitado IS NULL OR u.habilitado = p_habilitado)
          AND (p_conjunto_id IS NULL OR EXISTS (
                SELECT 1 FROM recicladores_conjuntos rc2
                WHERE rc2.id_reciclador = rec.id_reciclador
                  AND rc2.id_conjunto_residencial = p_conjunto_id
                  AND rc2.fecha_revocacion IS NULL
              ))
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
    """)


def downgrade() -> None:
    # ¿Qué? Se borran y se recrean, no se reemplazan.
    # ¿Para qué? CREATE OR REPLACE no puede quitar columnas de una vista ni
    #           cambiar el tipo de retorno de una función.
    op.execute(f"DROP FUNCTION IF EXISTS {FIRMA_SP_NUEVA}")
    op.execute("DROP VIEW IF EXISTS vista_directorio_residentes")
    op.execute(VISTA_ANTERIOR)
    op.execute(SP_ANTERIOR)

    op.drop_column("usuarios", "motivo_desactivacion")
    op.drop_column("usuarios", "fecha_desactivacion")
