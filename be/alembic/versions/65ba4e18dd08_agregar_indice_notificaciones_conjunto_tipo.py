"""agregar indice notificaciones conjunto tipo

¿Qué? Issue #169: agrega un índice compuesto sobre
      (id_conjunto_residencial, tipo) en la tabla notificaciones.
¿Para qué? Varias consultas (_shut_esta_lleno, GET /estado-shut y
          _aviso_reciente en be/app/routers/notificaciones.py) filtran
          exactamente por estas dos columnas para encontrar "la última
          notificación de este tipo, para este conjunto" — sin un índice,
          Postgres revisa la tabla completa fila por fila.
¿Impacto? No destructiva y no toca ningún dato existente — solo agrega
          una estructura de búsqueda sobre la tabla ya existente.

Revision ID: 65ba4e18dd08
Revises: faca7bc66750
Create Date: 2026-09-03 00:40:00.000000

"""
from typing import Sequence, Union

from alembic import op

# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = '65ba4e18dd08'
down_revision: Union[str, Sequence[str], None] = 'faca7bc66750'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_notificaciones_conjunto_tipo",
        "notificaciones",
        ["id_conjunto_residencial", "tipo"],
    )


def downgrade() -> None:
    op.drop_index("ix_notificaciones_conjunto_tipo", table_name="notificaciones")
