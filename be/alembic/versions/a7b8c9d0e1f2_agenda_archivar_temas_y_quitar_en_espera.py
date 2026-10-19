"""agenda: archivar temas y quitar En espera

¿Qué? Issue #435: agrega agenda_conjunto.archivado_en (cuándo se archivó un
      tema) y convierte los temas que estaban EN_ESPERA en PENDIENTE.
¿Para qué? La agenda deja de tener el estado "En espera" y gana "Archivada":
          un tema resuelto sale de "Por tratar" pero se conserva como
          historial. `estado` es un texto, no un tipo ENUM, así que el estado
          nuevo no necesita cambiar ningún tipo de la BD.
¿Impacto? Los temas EN_ESPERA pasan a PENDIENTE (ninguno se pierde ni queda
          archivado sin que nadie lo haya archivado). El downgrade quita la
          columna y devuelve los ARCHIVADOS a EN_ESPERA, el único estado
          "fuera de la lista principal" que conocía el código anterior.

Revision ID: a7b8c9d0e1f2
Revises: bf3525a03d92
Create Date: 2026-10-19 21:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, Sequence[str], None] = 'bf3525a03d92'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Agrega archivado_en y pasa los temas EN_ESPERA a PENDIENTE."""
    op.add_column('agenda_conjunto', sa.Column('archivado_en', sa.TIMESTAMP(timezone=True), nullable=True))
    op.execute("UPDATE agenda_conjunto SET estado = 'PENDIENTE' WHERE estado = 'EN_ESPERA'")


def downgrade() -> None:
    """Devuelve los temas ARCHIVADA a EN_ESPERA y quita archivado_en."""
    op.execute("UPDATE agenda_conjunto SET estado = 'EN_ESPERA' WHERE estado = 'ARCHIVADA'")
    op.drop_column('agenda_conjunto', 'archivado_en')
