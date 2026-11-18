"""puntos de acopio: datos del inventario de ECA de la UAESP

¿Qué? Agrega a puntos_acopios cinco columnas opcionales: numero_resolucion (única),
      organizacion, correo_contacto, latitud y longitud.
¿Para qué? La UAESP entregó el inventario de ECA de la Resolución 698 de 2023 (799 filas con
          organización, coordenadas y correo). numero_resolucion identifica cada ECA para que
          la importación se pueda repetir sin duplicar (el nombre no sirve: "ECA" se repite
          80 veces). Issue #664.
¿Impacto? Los puntos existentes quedan con las columnas en NULL y se ven igual que antes.
          El downgrade borra las columnas y lo que tengan guardado (los datos se pueden volver
          a traer con `uv run python -m app.seed`).

Revision ID: f4f8f04dd70f
Revises: d606da68c80c
Create Date: 2026-11-13 15:15:49.394606

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = 'f4f8f04dd70f'
down_revision: Union[str, Sequence[str], None] = 'd606da68c80c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('puntos_acopios', sa.Column('numero_resolucion', sa.String(length=10), nullable=True))
    op.add_column('puntos_acopios', sa.Column('organizacion', sa.String(length=300), nullable=True))
    op.add_column('puntos_acopios', sa.Column('correo_contacto', sa.String(length=255), nullable=True))
    op.add_column('puntos_acopios', sa.Column('latitud', sa.Numeric(precision=10, scale=7), nullable=True))
    op.add_column('puntos_acopios', sa.Column('longitud', sa.Numeric(precision=10, scale=7), nullable=True))
    op.create_unique_constraint('puntos_acopios_numero_resolucion_key', 'puntos_acopios', ['numero_resolucion'])


def downgrade() -> None:
    op.drop_constraint('puntos_acopios_numero_resolucion_key', 'puntos_acopios', type_='unique')
    op.drop_column('puntos_acopios', 'longitud')
    op.drop_column('puntos_acopios', 'latitud')
    op.drop_column('puntos_acopios', 'correo_contacto')
    op.drop_column('puntos_acopios', 'organizacion')
    op.drop_column('puntos_acopios', 'numero_resolucion')
