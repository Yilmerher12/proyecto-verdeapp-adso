"""crear comentarios de puntos de acopio

¿Qué? Crea la tabla puntos_acopio_comentarios: notas internas del Admin
      Sistema sobre cada punto de acopio, con autor y fecha.
¿Para qué? RQF-011: dejar constancia de por qué cambió un punto (nuevo
          encargado o dueño, corrección de datos) o de cualquier nota útil.
¿Impacto? No destructiva: tabla nueva, ninguna fila existente cambia.

Revision ID: a3c91e7b2f40
Revises: d5756bdfc663
Create Date: 2026-09-23 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = 'a3c91e7b2f40'
down_revision: Union[str, Sequence[str], None] = 'd5756bdfc663'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Aplica los cambios al esquema de la base de datos.

    ¿Qué? Crea puntos_acopio_comentarios con FK al punto (ON DELETE CASCADE)
          y al autor (ON DELETE SET NULL), e índice por punto.
    ¿Para qué? Ver docstring del módulo.
    ¿Impacto? Ninguna fila existente cambia.
    """
    op.create_table(
        'puntos_acopio_comentarios',
        sa.Column('id_comentario', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('id_punto_acopio', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('id_autor', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('texto', sa.Text(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['id_punto_acopio'], ['puntos_acopios.id_punto_acopio'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['id_autor'], ['usuarios.id_usuario'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id_comentario'),
    )
    op.create_index(
        op.f('ix_puntos_acopio_comentarios_id_punto_acopio'),
        'puntos_acopio_comentarios',
        ['id_punto_acopio'],
        unique=False,
    )


def downgrade() -> None:
    """Revierte los cambios aplicados por upgrade().

    ¿Qué? Elimina la tabla puntos_acopio_comentarios.
    ¿Para qué? Permitir deshacer esta migración si algo falla.
    ¿Impacto? Se pierden todos los comentarios guardados sobre puntos de acopio.
    """
    op.drop_index(op.f('ix_puntos_acopio_comentarios_id_punto_acopio'), table_name='puntos_acopio_comentarios')
    op.drop_table('puntos_acopio_comentarios')
