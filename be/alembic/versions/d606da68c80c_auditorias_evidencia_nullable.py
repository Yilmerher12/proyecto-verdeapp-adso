"""auditorías: la foto de evidencia puede quedar vacía tras el plazo de retención

¿Qué? Permite NULL en auditorias_conjunto.ruta_evidencia.
¿Para qué? Issue #587: pasado el plazo de retención, el comando
          app/limpiar_evidencias.py borra las fotos del disco y deja las rutas
          en NULL, pero conserva la auditoría (resultado, fecha y tema) porque
          el historial y las gráficas del conjunto salen de esos datos.
¿Impacto? Las filas existentes no cambian. La foto sigue siendo obligatoria al
          CREAR una auditoría: lo exige el servicio, no la columna. El downgrade
          vuelve a poner NOT NULL y falla si ya hay auditorías sin foto: una vez
          que el comando borró fotos, no se puede volver atrás.

Revision ID: d606da68c80c
Revises: a0b1c2d3e4f5
Create Date: 2026-11-03 00:00:01.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = 'd606da68c80c'
down_revision: Union[str, Sequence[str], None] = 'a0b1c2d3e4f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('auditorias_conjunto', 'ruta_evidencia', existing_type=sa.String(length=500), nullable=True)


def downgrade() -> None:
    op.alter_column('auditorias_conjunto', 'ruta_evidencia', existing_type=sa.String(length=500), nullable=False)
