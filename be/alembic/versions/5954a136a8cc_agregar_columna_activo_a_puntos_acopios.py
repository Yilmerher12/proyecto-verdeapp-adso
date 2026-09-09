"""agregar columna activo a puntos_acopios

¿Qué? Agrega la columna "activo" (booleana) a la tabla puntos_acopios.
¿Para qué? RQF-011/HU-017: el Admin Sistema debe poder "dar de baja" un
          punto de acopio que ya no opera, sin borrar el registro (se
          conserva como historial, igual que fecha_desvinculacion en
          administradores_conjuntos). El directorio que consultan
          Residentes/Recicladores debe dejar de mostrarlo, no perderlo.
¿Impacto? No destructiva: se agrega con server_default='true', así que
          los 9 puntos de acopio reales ya sembrados quedan activos
          automáticamente, sin necesidad de un UPDATE aparte.

Revision ID: 5954a136a8cc
Revises: edd09b6740c1
Create Date: 2026-09-07 08:52:26.190308

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = '5954a136a8cc'
down_revision: Union[str, Sequence[str], None] = 'edd09b6740c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Agrega puntos_acopios.activo (booleana, NOT NULL, default true)."""
    op.add_column(
        'puntos_acopios',
        sa.Column('activo', sa.Boolean(), nullable=False, server_default='true'),
    )


def downgrade() -> None:
    """Elimina la columna puntos_acopios.activo.

    ¿Impacto? No destructiva para el resto de la app: ninguna otra tabla
              depende de esta columna. Se pierde qué puntos estaban dados
              de baja — todos volverían a mostrarse como activos.
    """
    op.drop_column('puntos_acopios', 'activo')
