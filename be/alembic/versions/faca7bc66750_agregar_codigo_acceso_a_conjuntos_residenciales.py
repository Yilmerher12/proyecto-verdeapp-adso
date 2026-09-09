"""agregar codigo_acceso a conjuntos_residenciales

¿Qué? Issue #168: agrega "codigo_acceso" (6 caracteres, ver
      app/utils/codigo_acceso.py) a conjuntos_residenciales, y le genera
      un código a cada conjunto YA existente antes de exigir NOT NULL.
¿Para qué? Hoy cualquiera puede registrarse como Residente declarando
          pertenecer a cualquier conjunto, sin ninguna verificación. El
          Admin de Conjunto reparte este código fuera de la app
          (cartelera, grupo del conjunto); el registro de Residente lo
          exige a partir de ahora. Se genera para TODOS los conjuntos
          desde ya (no solo los que ya tienen administrador asignado) —
          así el registro puede exigirlo siempre, sin casos especiales
          para conjuntos "todavía sin admin".
¿Impacto? No destructiva más allá de agregar una columna nueva. Los
          códigos se generan en Python (no hay función nativa de
          Postgres para un alfabeto sin caracteres ambiguos), con
          reintento en memoria si dos conjuntos del mismo lote generan el
          mismo código antes de tocar la base de datos.

Revision ID: faca7bc66750
Revises: e97108a7a748
Create Date: 2026-09-03 00:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = 'faca7bc66750'
down_revision: Union[str, Sequence[str], None] = 'e97108a7a748'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ¿Qué? Import diferido — el generador vive en app/utils/codigo_acceso.py,
    #       no hace falta duplicar el alfabeto/algoritmo aquí (a diferencia
    #       de generar_uuid7 en las migraciones históricas, esta función SÍ
    #       sigue existiendo hoy sin cambios, así que reutilizarla es seguro).
    from app.utils.codigo_acceso import generar_codigo_acceso

    connection = op.get_bind()

    op.add_column(
        "conjuntos_residenciales",
        sa.Column("codigo_acceso", sa.String(10), nullable=True),
    )

    ids = connection.execute(
        sa.text('SELECT id_conjunto_residencial FROM "conjuntos_residenciales"')
    ).scalars().all()

    codigos_usados: set[str] = set()

    def _codigo_unico() -> str:
        codigo = generar_codigo_acceso()
        while codigo in codigos_usados:
            codigo = generar_codigo_acceso()
        codigos_usados.add(codigo)
        return codigo

    if ids:
        connection.execute(
            sa.text(
                'UPDATE "conjuntos_residenciales" SET codigo_acceso = :codigo '
                'WHERE id_conjunto_residencial = :id'
            ),
            [{"id": id_conjunto, "codigo": _codigo_unico()} for id_conjunto in ids],
        )

    op.alter_column("conjuntos_residenciales", "codigo_acceso", nullable=False)
    op.create_unique_constraint(
        "uq_conjuntos_residenciales_codigo_acceso", "conjuntos_residenciales", ["codigo_acceso"]
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_conjuntos_residenciales_codigo_acceso", "conjuntos_residenciales", type_="unique"
    )
    op.drop_column("conjuntos_residenciales", "codigo_acceso")
