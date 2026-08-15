"""add locale to usuarios

¿Qué? Agrega la columna locale (VARCHAR(10), por defecto "es") a la tabla usuarios.
¿Para qué? Guardar el idioma preferido de cada usuario en su cuenta (RQF-017), para
           que la preferencia lo siga entre dispositivos y no solo viva en el
           localStorage del navegador donde la eligió.
¿Impacto? No destructiva — todos los usuarios existentes quedan con "es" por
          defecto (server_default), sin necesidad de tocar filas existentes.

Revision ID: dd3d66d7ceb6
Revises: bd997ecd8d32
Create Date: 2026-08-15 17:06:05.534141

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = 'dd3d66d7ceb6'
down_revision: Union[str, Sequence[str], None] = 'bd997ecd8d32'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Agrega la columna locale a usuarios, con "es" por defecto para filas existentes."""
    op.add_column(
        'usuarios',
        sa.Column('locale', sa.String(length=10), server_default='es', nullable=False),
    )


def downgrade() -> None:
    """Elimina la columna locale de usuarios."""
    op.drop_column('usuarios', 'locale')
