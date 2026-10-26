"""contenido educativo: imagen de portada opcional en cada módulo

¿Qué? Agrega la columna url_imagen (nullable) a contenido_educativo.
¿Para qué? Que el Administrador del Sistema suba una imagen de portada por
          módulo, que se ve en "Aprende a reciclar".
¿Impacto? Los módulos existentes quedan con url_imagen en NULL y siguen
          viéndose con la imagen fija de su categoría. El downgrade borra la
          columna (las imágenes subidas quedan en disco, sin referencia).

Revision ID: f9a0b1c2d3e4
Revises: e8f9a0b1c2d3
Create Date: 2026-10-24 00:00:01.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = 'f9a0b1c2d3e4'
down_revision: Union[str, Sequence[str], None] = 'e8f9a0b1c2d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('contenido_educativo', sa.Column('url_imagen', sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column('contenido_educativo', 'url_imagen')
