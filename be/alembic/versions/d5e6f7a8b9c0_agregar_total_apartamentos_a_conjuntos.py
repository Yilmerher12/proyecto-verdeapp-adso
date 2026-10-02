"""agregar total_apartamentos a conjuntos_residenciales

¿Qué? Agrega la columna total_apartamentos (entero, opcional) a
      conjuntos_residenciales.
¿Para qué? El Admin de Conjunto escribe cuántos apartamentos tiene su
          conjunto; con eso y los residentes ya registrados se calcula
          cuántos apartamentos faltan por usar VerdeApp.
¿Impacto? No destructiva: la columna es nullable y todos los conjuntos
          existentes quedan en NULL ("sin definir") hasta que su Admin la
          llene.

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-10-02 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = 'd5e6f7a8b9c0'
down_revision: Union[str, Sequence[str], None] = 'c4d5e6f7a8b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Aplica los cambios al esquema de la base de datos.

    ¿Qué? Agrega total_apartamentos (INTEGER NULL) a conjuntos_residenciales.
    ¿Para qué? Ver docstring del módulo.
    ¿Impacto? Ninguna fila existente cambia.
    """
    op.add_column('conjuntos_residenciales', sa.Column('total_apartamentos', sa.Integer(), nullable=True))


def downgrade() -> None:
    """Revierte los cambios aplicados por upgrade().

    ¿Qué? Quita la columna total_apartamentos.
    ¿Para qué? Permitir deshacer esta migración si algo falla.
    ¿Impacto? Se pierde la cantidad de apartamentos que cada Admin escribió.
    """
    op.drop_column('conjuntos_residenciales', 'total_apartamentos')
