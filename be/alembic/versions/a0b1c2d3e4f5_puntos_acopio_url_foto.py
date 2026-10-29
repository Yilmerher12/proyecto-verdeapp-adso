"""puntos de acopio: foto opcional en cada punto

¿Qué? Agrega la columna url_foto (nullable) a puntos_acopios.
¿Para qué? Que el Administrador del Sistema suba una foto de cada punto de
          acopio, y que Residentes y Recicladores la vean en la ficha del punto.
¿Impacto? Los puntos existentes quedan con url_foto en NULL y se ven como antes.
          El downgrade borra la columna (las fotos subidas quedan en disco, sin
          referencia, hasta que corra la limpieza de adjuntos).

Revision ID: a0b1c2d3e4f5
Revises: f9a0b1c2d3e4
Create Date: 2026-10-30 00:00:01.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = 'a0b1c2d3e4f5'
down_revision: Union[str, Sequence[str], None] = 'f9a0b1c2d3e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('puntos_acopios', sa.Column('url_foto', sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column('puntos_acopios', 'url_foto')
