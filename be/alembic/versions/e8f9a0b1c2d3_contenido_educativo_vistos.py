"""contenido educativo: tabla de lecciones vistas por cada Residente

¿Qué? Crea contenido_educativo_vistos (qué Residente abrió qué módulo y cuándo).
¿Para qué? Mostrar "Visto" y el avance del Residente en "Aprende a reciclar".
¿Impacto? Tabla nueva, sin tocar datos existentes. Las filas se borran en
          cascada si se elimina el usuario o el módulo. El downgrade borra la
          tabla (y con ella los registros de lo visto).

Revision ID: e8f9a0b1c2d3
Revises: d7e8f9a0b1c2
Create Date: 2026-10-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = 'e8f9a0b1c2d3'
down_revision: Union[str, Sequence[str], None] = 'd7e8f9a0b1c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'contenido_educativo_vistos',
        sa.Column('id_usuario', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('id_contenido', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('visto_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['id_usuario'], ['usuarios.id_usuario'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['id_contenido'], ['contenido_educativo.id_contenido'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id_usuario', 'id_contenido'),
    )
    op.create_index(
        op.f('ix_contenido_educativo_vistos_id_contenido'),
        'contenido_educativo_vistos',
        ['id_contenido'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_contenido_educativo_vistos_id_contenido'), table_name='contenido_educativo_vistos')
    op.drop_table('contenido_educativo_vistos')
