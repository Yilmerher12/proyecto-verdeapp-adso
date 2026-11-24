"""fecha_autorizacion de recicladores_conjuntos con valor por defecto now()

¿Qué? Agrega DEFAULT now() a la columna recicladores_conjuntos.fecha_autorizacion
      (sigue siendo NOT NULL).
¿Para qué? El modelo (app/models/reciclador_conjunto.py) declara
           server_default=func.now(), pero la migración 0971721d03b0 creó la
           columna sin valor por defecto. Las pruebas no lo notaban porque
           armaban la BD con create_all() a partir del modelo; al armarla con
           las migraciones (semana 6 del bootcamp) 60 pruebas fallaron con
           NotNullViolation. El código de la app no se veía afectado porque
           siempre escribe la fecha a mano (app/seed.py y
           reciclador_conjunto_service.py).
¿Impacto? No es destructiva y no toca filas existentes. Después de aplicarla,
          un INSERT sin fecha_autorizacion (por ejemplo, desde el ORM) guarda
          la hora actual en vez de fallar. El downgrade quita el valor por
          defecto y deja la columna como estaba.

Revision ID: cb3fe0a910f3
Revises: f4f8f04dd70f
Create Date: 2026-11-24 10:34:16.519128

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = 'cb3fe0a910f3'
down_revision: Union[str, Sequence[str], None] = 'f4f8f04dd70f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Pone DEFAULT now() a recicladores_conjuntos.fecha_autorizacion."""
    op.alter_column(
        'recicladores_conjuntos',
        'fecha_autorizacion',
        existing_type=sa.TIMESTAMP(),
        existing_nullable=False,
        server_default=sa.text('now()'),
    )


def downgrade() -> None:
    """Quita el DEFAULT; la columna queda NOT NULL sin valor por defecto, como antes."""
    op.alter_column(
        'recicladores_conjuntos',
        'fecha_autorizacion',
        existing_type=sa.TIMESTAMP(),
        existing_nullable=False,
        server_default=None,
    )
