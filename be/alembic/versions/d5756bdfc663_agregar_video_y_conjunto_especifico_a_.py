"""agregar video y conjuntos destino a novedades

¿Qué? Agrega url_video (link de YouTube, opcional) a novedades y crea la
      tabla novedades_conjuntos, que dice a qué conjuntos (uno o varios)
      va dirigida cada novedad.
¿Para qué? RQF-015: el Admin Sistema controla a qué conjuntos les llega una
          novedad (ej. una reunión presencial no sale a todos) y puede
          adjuntar un video igual que ya permite Contenido Educativo.
¿Impacto? No destructiva. Una novedad SIN filas en novedades_conjuntos sigue
          significando "todos los conjuntos del alcance elegido", así que
          todas las novedades existentes se comportan exactamente igual que
          antes.

Revision ID: d5756bdfc663
Revises: ebc147db9ce7
Create Date: 2026-09-22 15:02:34.912824

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = 'd5756bdfc663'
down_revision: Union[str, Sequence[str], None] = 'ebc147db9ce7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Aplica los cambios al esquema de la base de datos.

    ¿Qué? Agrega novedades.url_video (String 500) y crea novedades_conjuntos
          (llave primaria compuesta novedad + conjunto, ambas FK con
          ON DELETE CASCADE, e índice por conjunto para el filtro del feed).
    ¿Para qué? Ver docstring del módulo.
    ¿Impacto? Ninguna fila existente cambia de significado.
    """
    op.add_column('novedades', sa.Column('url_video', sa.String(length=500), nullable=True))
    op.create_table(
        'novedades_conjuntos',
        sa.Column('id_novedad', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('id_conjunto_residencial', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['id_novedad'], ['novedades.id_novedad'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(
            ['id_conjunto_residencial'],
            ['conjuntos_residenciales.id_conjunto_residencial'],
            ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint('id_novedad', 'id_conjunto_residencial'),
    )
    op.create_index(
        op.f('ix_novedades_conjuntos_id_conjunto_residencial'),
        'novedades_conjuntos',
        ['id_conjunto_residencial'],
        unique=False,
    )


def downgrade() -> None:
    """Revierte los cambios aplicados por upgrade().

    ¿Qué? Elimina la tabla novedades_conjuntos y la columna url_video.
    ¿Para qué? Permitir deshacer esta migración si algo falla.
    ¿Impacto? Se pierde a qué conjuntos iba cada novedad y su video: al
              deshacer, todas las novedades vuelven a quedar dirigidas a
              todos los conjuntos de su alcance.
    """
    op.drop_index(op.f('ix_novedades_conjuntos_id_conjunto_residencial'), table_name='novedades_conjuntos')
    op.drop_table('novedades_conjuntos')
    op.drop_column('novedades', 'url_video')
