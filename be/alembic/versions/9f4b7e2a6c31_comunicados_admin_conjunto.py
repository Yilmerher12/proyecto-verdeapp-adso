"""comunicados del admin de conjunto (RQF-014)

¿Qué? Crea la tabla comunicados: avisos publicados por un Administrador de
      Conjunto para los residentes y/o recicladores de un conjunto
      específico (texto, tipo, destinatarios, adjunto opcional como link,
      y fecha de expiración).
¿Para qué? Cubrir RQF-014 — HU-027 (crear), HU-028 (ver feed), HU-029
           (editar), HU-030 (eliminar).
¿Impacto? Tabla nueva, no afecta ninguna tabla existente.

Revision ID: 9f4b7e2a6c31
Revises: 7d3f9a2c5e18
Create Date: 2026-08-20 09:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = '9f4b7e2a6c31'
down_revision: Union[str, Sequence[str], None] = '7d3f9a2c5e18'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Aplica los cambios al esquema de la base de datos."""
    op.create_table(
        'comunicados',
        sa.Column('id_comunicado', sa.Integer(), nullable=False),
        sa.Column('id_conjunto_residencial', sa.Integer(), nullable=False),
        sa.Column('id_administrador', sa.Integer(), nullable=False),
        sa.Column('destinatarios', sa.String(length=20), nullable=False),
        sa.Column('tipo', sa.String(length=20), nullable=False),
        sa.Column('texto', sa.Text(), nullable=False),
        sa.Column('url_adjunto', sa.String(length=500), nullable=True),
        sa.Column('fecha_evento', sa.Date(), nullable=True),
        sa.Column('fecha_expiracion', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('fecha_edicion', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['id_conjunto_residencial'], ['conjuntos_residenciales.id_conjunto_residencial'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['id_administrador'], ['administradores_conjunto.id_administrador'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id_comunicado'),
    )
    op.create_index(op.f('ix_comunicados_id_comunicado'), 'comunicados', ['id_comunicado'], unique=False)


def downgrade() -> None:
    """Revierte los cambios aplicados por upgrade()."""
    op.drop_index(op.f('ix_comunicados_id_comunicado'), table_name='comunicados')
    op.drop_table('comunicados')
