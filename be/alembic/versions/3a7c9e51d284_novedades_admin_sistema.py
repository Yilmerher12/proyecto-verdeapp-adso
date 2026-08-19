"""novedades generales del admin sistema (RQF-015)

¿Qué? 1) Crea la tabla novedades: avisos publicados por el Administrador
      del Sistema para toda la plataforma (texto, alcance por rol,
      adjunto opcional como link, expiración, y fecha_archivado para el
      archivado manual/automático).
      2) Vuelve opcional notificaciones.id_conjunto_residencial — las
      novedades son de toda la plataforma, no de un conjunto específico,
      así que sus notificaciones no pueden tener uno asignado.
¿Para qué? Cubrir RQF-015 — HU-032 (publicar), HU-033 (ver feed por rol),
           HU-034 (editar), HU-035 (archivar manual/automático).
¿Impacto? No destructiva — la columna de notificaciones se vuelve más
          permisiva (nullable), no pierde datos existentes.

Revision ID: 3a7c9e51d284
Revises: 9f4b7e2a6c31
Create Date: 2026-08-20 11:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = '3a7c9e51d284'
down_revision: Union[str, Sequence[str], None] = '9f4b7e2a6c31'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Aplica los cambios al esquema de la base de datos."""
    op.alter_column(
        'notificaciones',
        'id_conjunto_residencial',
        existing_type=sa.Integer(),
        nullable=True,
    )

    op.create_table(
        'novedades',
        sa.Column('id_novedad', sa.Integer(), nullable=False),
        sa.Column('id_admin_sistema', sa.Integer(), nullable=False),
        sa.Column('alcance', sa.String(length=20), nullable=False),
        sa.Column('texto', sa.Text(), nullable=False),
        sa.Column('url_adjunto', sa.String(length=500), nullable=True),
        sa.Column('fecha_expiracion', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('fecha_edicion', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('fecha_archivado', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['id_admin_sistema'], ['usuarios.id_usuario'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id_novedad'),
    )
    op.create_index(op.f('ix_novedades_id_novedad'), 'novedades', ['id_novedad'], unique=False)


def downgrade() -> None:
    """Revierte los cambios aplicados por upgrade()."""
    op.drop_index(op.f('ix_novedades_id_novedad'), table_name='novedades')
    op.drop_table('novedades')

    op.alter_column(
        'notificaciones',
        'id_conjunto_residencial',
        existing_type=sa.Integer(),
        nullable=False,
    )
