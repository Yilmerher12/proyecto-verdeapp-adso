"""agregar tabla de tokens revocados para logout

¿Qué? Crea la tabla "tokens_revocados" (lista negra de JWT invalidados).
¿Para qué? HU-008/RQF-007 (RN-001): permitir que el logout invalide de
          verdad el access token y el refresh token en uso, en vez de
          depender solo de que el navegador los borre.
¿Impacto? Tabla completamente nueva — no toca ni afecta ninguna tabla ni
          fila existente. Segura de aplicar sin downtime.

Revision ID: 855b4c116176
Revises: 61e54a26e61f
Create Date: 2026-08-28 11:30:25.715509

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = '855b4c116176'
down_revision: Union[str, Sequence[str], None] = '61e54a26e61f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Crea la tabla tokens_revocados (jti + expira_en)."""
    op.create_table(
        'tokens_revocados',
        sa.Column('jti', sa.UUID(), nullable=False),
        sa.Column('expira_en', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('jti'),
    )


def downgrade() -> None:
    """Elimina la tabla tokens_revocados.

    ¿Impacto? DESTRUCTIVO para el estado de la lista negra: cualquier token
              revocado antes de este downgrade quedaría "vivo" de nuevo
              hasta su expiración natural. No borra datos de negocio.
    """
    op.drop_table('tokens_revocados')
