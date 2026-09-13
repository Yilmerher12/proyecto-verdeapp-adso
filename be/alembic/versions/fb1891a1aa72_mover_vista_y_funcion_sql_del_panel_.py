"""mover vista y funcion SQL del panel admin a una migracion

¿Qué? Crea, vía Alembic (en vez de en cada petición HTTP), la vista
      "vista_directorio_residentes" y la función "sp_obtener_recicladores"
      que usa el panel del Admin del Sistema (Criterios 6 y 7 del curso).
¿Para qué? Issue #217 — antes, be/app/routers/admin.py ejecutaba un
          CREATE OR REPLACE VIEW / CREATE OR REPLACE FUNCTION como primer
          paso de CADA petición a /vista-residentes y /sp-recicladores, no
          solo la primera vez. Reconstruir una estructura dentro de
          PostgreSQL bloquea esa pieza mientras se hace (DDL toma un lock),
          así que dos Administradores del Sistema con el panel abierto al
          mismo tiempo podían chocar entre sí sin ninguna necesidad real —
          la vista y la función nunca cambian entre una petición y la
          siguiente.
¿Impacto? No destructiva: ambas estructuras ya existían de facto en
          cualquier base de datos donde alguien hubiera abierto el panel
          al menos una vez (el código las creaba solo). Los 3 DROP
          FUNCTION defensivos de abajo son exactamente los mismos que ya
          traía be/app/routers/admin.py — cubren las firmas viejas de
          sp_obtener_recicladores que pudieran haber quedado creadas por
          versiones anteriores del endpoint en cualquier entorno real.

Revision ID: fb1891a1aa72
Revises: 0971721d03b0
Create Date: 2026-09-11 10:28:10.754578

"""
from typing import Sequence, Union

from alembic import op

# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = 'fb1891a1aa72'
down_revision: Union[str, Sequence[str], None] = '0971721d03b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Crea (o actualiza, si ya existían de una petición anterior) la vista
    y la función SQL del panel de Admin del Sistema.

    ¿Qué? Mismo SQL que antes vivía en admin.py, palabra por palabra —
          esta migración no cambia ninguna columna ni ningún filtro, solo
          mueve DÓNDE se ejecuta ese CREATE (una vez, al migrar, en vez de
          en cada request).
    ¿Para qué? CREATE OR REPLACE VIEW/FUNCTION son idempotentes: si la
              estructura ya existe con la misma forma, no hace nada
              destructivo — así que correr esta migración sobre una BD
              donde el panel ya se había abierto antes es seguro.
    ¿Impacto? Los DROP FUNCTION IF EXISTS cubren firmas viejas de
              sp_obtener_recicladores que Postgres no deja reemplazar
              directo con CREATE OR REPLACE (no permite cambiar el tipo de
              retorno ni los parámetros de una función ya existente).
    """
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
        c.id_conjunto_residencial AS "id_conjunto_residencial"
    FROM residentes r
    JOIN usuarios u ON r.id_usuario = u.id_usuario
    JOIN unidades uni ON r.id_unidad = uni.id_unidad
    JOIN conjuntos_residenciales c ON uni.id_conjunto_residencial = c.id_conjunto_residencial
    JOIN localidades l ON c.id_localidad = l.id_localidad;
    """)

    op.execute("DROP FUNCTION IF EXISTS sp_obtener_recicladores(TEXT, INT, INT, INT)")
    op.execute("DROP FUNCTION IF EXISTS sp_obtener_recicladores(TEXT, INT, TEXT, TEXT, INT, INT)")
    op.execute("DROP FUNCTION IF EXISTS sp_obtener_recicladores(TEXT, INT, UUID, TEXT, TEXT, INT, INT)")

    op.execute("""
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
    """)


def downgrade() -> None:
    """Elimina la vista y la función creadas por upgrade().

    ¿Qué? DROP VIEW / DROP FUNCTION, en orden inverso a upgrade().
    ¿Para qué? Permitir deshacer esta migración si algo falla.
    ¿Impacto? Destructiva pero segura: ambas estructuras son solo de
              lectura (ninguna tabla real depende de ellas vía FK), así
              que borrarlas no pierde ningún dato — un endpoint que las
              use fallaría hasta volver a aplicar upgrade().
    """
    op.execute("DROP FUNCTION IF EXISTS sp_obtener_recicladores(TEXT, INT, UUID, TEXT, TEXT, INT, INT)")
    op.execute("DROP VIEW IF EXISTS vista_directorio_residentes")
