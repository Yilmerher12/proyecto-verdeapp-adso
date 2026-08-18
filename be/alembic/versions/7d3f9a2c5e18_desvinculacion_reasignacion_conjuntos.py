"""desvinculacion y reasignacion de conjuntos (RQF-016)

¿Qué? 1) Agrega fecha_desvinculacion (nullable) a administradores_conjuntos,
      así un vínculo terminado no se borra, queda como historial.
      2) Crea un índice único PARCIAL que garantiza que un conjunto nunca
      tenga dos vínculos ACTIVOS al mismo tiempo (RN-003), sin bloquear
      los vínculos históricos ya terminados.
      3) Crea la tabla solicitudes_desvinculacion (el flujo de aprobación:
      quién pidió desvincularse, de qué conjunto, por qué, y cómo lo
      resolvió el Admin Sistema), con su propio índice único parcial para
      no permitir dos solicitudes pendientes del mismo par admin+conjunto
      (RN-002).
¿Para qué? Cubrir RQF-016: un Admin de Conjunto puede pedir dejar de
           administrar un conjunto (con aprobación del Admin Sistema), y
           el Admin Sistema puede asignar directamente un conjunto sin
           administrador a un Admin de Conjunto que ya existe.
¿Impacto? No destructiva — la columna nueva es opcional y las filas
          existentes de administradores_conjuntos quedan con
          fecha_desvinculacion en NULL (es decir, siguen "activas").

Revision ID: 7d3f9a2c5e18
Revises: fa49fa61a94a
Create Date: 2026-08-18 14:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = '7d3f9a2c5e18'
down_revision: Union[str, Sequence[str], None] = 'fa49fa61a94a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Aplica los cambios al esquema de la base de datos."""
    op.add_column(
        'administradores_conjuntos',
        sa.Column('fecha_desvinculacion', sa.TIMESTAMP(), nullable=True),
    )
    op.create_index(
        'ux_admin_conjunto_activo',
        'administradores_conjuntos',
        ['id_conjunto_residencial'],
        unique=True,
        postgresql_where=sa.text('fecha_desvinculacion IS NULL'),
    )

    op.create_table(
        'solicitudes_desvinculacion',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('id_administrador', sa.Integer(), nullable=False),
        sa.Column('id_conjunto_residencial', sa.Integer(), nullable=False),
        sa.Column('motivo', sa.Text(), nullable=True),
        sa.Column('estado', sa.String(length=20), nullable=False, server_default='PENDIENTE'),
        sa.Column('motivo_rechazo', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=False),
        sa.Column('resuelta_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('resuelta_por_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['id_administrador'], ['administradores_conjunto.id_administrador'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['id_conjunto_residencial'], ['conjuntos_residenciales.id_conjunto_residencial'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['resuelta_por_id'], ['usuarios.id_usuario'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_solicitudes_desvinculacion_id'),
        'solicitudes_desvinculacion',
        ['id'],
        unique=False,
    )
    op.create_index(
        'ux_solicitud_desvinculacion_pendiente',
        'solicitudes_desvinculacion',
        ['id_administrador', 'id_conjunto_residencial'],
        unique=True,
        postgresql_where=sa.text("estado = 'PENDIENTE'"),
    )


def downgrade() -> None:
    """Revierte los cambios aplicados por upgrade()."""
    op.drop_index('ux_solicitud_desvinculacion_pendiente', table_name='solicitudes_desvinculacion')
    op.drop_index(op.f('ix_solicitudes_desvinculacion_id'), table_name='solicitudes_desvinculacion')
    op.drop_table('solicitudes_desvinculacion')

    op.drop_index('ux_admin_conjunto_activo', table_name='administradores_conjuntos')
    op.drop_column('administradores_conjuntos', 'fecha_desvinculacion')
