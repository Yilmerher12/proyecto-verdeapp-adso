"""agregar columna habilitado a usuarios

¿Qué? Agrega la columna "habilitado" (booleana) a la tabla usuarios.
¿Para qué? RQF nuevo: el Administrador del Sistema puede desactivar la
          cuenta de un usuario. Se usa una columna NUEVA en vez de
          reutilizar "is_active" porque esa ya significa "correo
          verificado" — mezclar los dos conceptos haría que una cuenta
          desactivada por un admin mostrara el mensaje de "verifica tu
          correo", que no aplica para alguien ya verificado.
¿Impacto? No destructiva: se agrega con server_default='true', así que
          cada fila existente queda habilitada automáticamente, sin
          necesidad de un UPDATE aparte.

Revision ID: 0893894dcf2b
Revises: 855b4c116176
Create Date: 2026-09-02 11:20:15.184273

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = '0893894dcf2b'
down_revision: Union[str, Sequence[str], None] = '855b4c116176'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Agrega usuarios.habilitado (booleana, NOT NULL, default true)."""
    op.add_column(
        'usuarios',
        sa.Column('habilitado', sa.Boolean(), nullable=False, server_default='true'),
    )


def downgrade() -> None:
    """Elimina la columna usuarios.habilitado.

    ¿Impacto? No destructiva para el resto de la app: ninguna otra tabla
              depende de esta columna. Se pierde el estado de
              activado/desactivado que se haya guardado.
    """
    op.drop_column('usuarios', 'habilitado')
