"""soporte tecnico: motivo, prioridad, respuesta y estados nuevos en novedades_enviadas

¿Qué? Agrega 4 columnas a novedades_enviadas (motivo, prioridad, respuesta,
      respondida_at) y convierte el estado VISTA en RESUELTA.
¿Para qué? Issue #512: el Admin Sistema necesita saber qué tan urgente es una
          consulta de soporte, en qué paso va y poder responderle al autor.
¿Impacto? Las filas existentes quedan con prioridad MEDIA y sin motivo ni
          respuesta; las que estaban VISTA pasan a RESUELTA. El downgrade
          devuelve RESUELTA a VISTA y EN_REVISION a NUEVA, y borra las
          respuestas escritas.

Revision ID: d7e8f9a0b1c2
Revises: b1c2d3e4f5a6
Create Date: 2026-10-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = 'd7e8f9a0b1c2'
down_revision: Union[str, Sequence[str], None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('novedades_enviadas', sa.Column('motivo', sa.String(length=40), nullable=True))
    op.add_column(
        'novedades_enviadas',
        sa.Column('prioridad', sa.String(length=10), server_default='MEDIA', nullable=False),
    )
    op.add_column('novedades_enviadas', sa.Column('respuesta', sa.Text(), nullable=True))
    op.add_column('novedades_enviadas', sa.Column('respondida_at', sa.TIMESTAMP(timezone=True), nullable=True))
    op.execute("UPDATE novedades_enviadas SET estado = 'RESUELTA' WHERE estado = 'VISTA'")


def downgrade() -> None:
    op.execute("UPDATE novedades_enviadas SET estado = 'VISTA' WHERE estado = 'RESUELTA'")
    op.execute("UPDATE novedades_enviadas SET estado = 'NUEVA' WHERE estado = 'EN_REVISION'")
    op.drop_column('novedades_enviadas', 'respondida_at')
    op.drop_column('novedades_enviadas', 'respuesta')
    op.drop_column('novedades_enviadas', 'prioridad')
    op.drop_column('novedades_enviadas', 'motivo')
