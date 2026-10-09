"""crear tabla archivos_subidos

¿Qué? Issue #395 (CN-046): crea la tabla archivos_subidos, con un registro por
      cada archivo que se sube con POST /uploads/adjunto (quién, ruta, cuándo)
      y un índice por (id_usuario, created_at).
¿Para qué? Poner una cuota de subidas por usuario (por minuto y por día) y
          saber de quién es cada archivo si el disco se llena.
¿Impacto? Solo agrega una tabla nueva, no toca datos existentes. Los archivos
          que ya estaban en be/app/uploads/adjuntos/ quedan sin registro (no
          se sabe de quién son). El downgrade borra la tabla y con ella el
          historial de subidas, no los archivos.

Revision ID: bf3525a03d92
Revises: e6f7a8b9c0d1
Create Date: 2026-10-08 09:40:15.111964

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = 'bf3525a03d92'
down_revision: Union[str, Sequence[str], None] = 'e6f7a8b9c0d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Crea archivos_subidos y su índice."""
    op.create_table(
        'archivos_subidos',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('id_usuario', sa.UUID(), nullable=True),
        sa.Column('ruta', sa.String(length=500), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['id_usuario'], ['usuarios.id_usuario'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_archivos_subidos_usuario_fecha', 'archivos_subidos', ['id_usuario', 'created_at'], unique=False)


def downgrade() -> None:
    """Borra el índice y la tabla."""
    op.drop_index('ix_archivos_subidos_usuario_fecha', table_name='archivos_subidos')
    op.drop_table('archivos_subidos')
