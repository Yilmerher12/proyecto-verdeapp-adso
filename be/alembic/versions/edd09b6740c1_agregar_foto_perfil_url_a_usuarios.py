"""agregar foto_perfil_url a usuarios

¿Qué? Agrega la columna opcional foto_perfil_url a la tabla usuarios.
¿Para qué? Issue #170: cualquier usuario puede subir una foto de perfil,
          reemplazando el círculo con su inicial en la interfaz.
¿Impacto? Columna nullable — ningún usuario existente queda afectado, todos
          quedan con foto_perfil_url en NULL hasta que suban una.

Revision ID: edd09b6740c1
Revises: 65ba4e18dd08
Create Date: 2026-09-04 10:42:32.530078

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = 'edd09b6740c1'
down_revision: Union[str, Sequence[str], None] = '65ba4e18dd08'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Agrega usuarios.foto_perfil_url (String, nullable)."""
    op.add_column('usuarios', sa.Column('foto_perfil_url', sa.String(length=255), nullable=True))


def downgrade() -> None:
    """Elimina usuarios.foto_perfil_url."""
    op.drop_column('usuarios', 'foto_perfil_url')
