"""agregar version_sesion a usuarios

¿Qué? Agrega la columna usuarios.version_sesion (entero, 0 por defecto).
¿Para qué? Issue #308 (CN-010): invalidar las sesiones abiertas cuando el
           usuario cambia o restablece su contraseña. Cada JWT lleva la
           versión vigente al emitirse; si no coincide, se rechaza.
¿Impacto? No destructiva y reversible. Las filas existentes quedan en 0,
          que es lo mismo que asumen los tokens ya emitidos (no traen
          "ver"), así que ninguna sesión activa se cierra al aplicarla.

Revision ID: ebc147db9ce7
Revises: 30a83eda6c54
Create Date: 2026-09-23 12:08:38.944728

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = 'ebc147db9ce7'
down_revision: Union[str, Sequence[str], None] = '30a83eda6c54'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Agrega usuarios.version_sesion.

    ¿Qué? Columna NOT NULL con server_default "0".
    ¿Para qué? Que las filas ya existentes queden con un valor válido sin
              necesitar un UPDATE aparte.
    ¿Impacto? El autogenerate también traía índices y constraints de
              arrastre (drift de migraciones anteriores, ver CLAUDE.md);
              se quitaron a propósito — esta migración solo toca esta columna.
    """
    op.add_column(
        'usuarios',
        sa.Column('version_sesion', sa.Integer(), server_default='0', nullable=False),
    )


def downgrade() -> None:
    """Revierte upgrade(): elimina la columna."""
    op.drop_column('usuarios', 'version_sesion')
