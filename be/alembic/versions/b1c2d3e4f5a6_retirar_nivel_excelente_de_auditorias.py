"""retirar el nivel EXCELENTE de auditorias_conjunto

¿Qué? Convierte a BUENA toda auditoría que todavía tenga nivel_desempeno
      = 'EXCELENTE'.
¿Para qué? EXCELENTE se unificó con BUENA el 2026-08-27 (el reciclador ya
          solo elige Bueno / Regular / Malo) pero el código siguió
          aceptándolo. Se retiró de los esquemas y del frontend; una fila
          vieja con ese valor haría fallar la respuesta de la API.
¿Impacto? Solo toca filas viejas, no cambia el esquema. No es reversible:
          el downgrade no puede saber cuáles BUENA eran EXCELENTE, así que
          no hace nada.

Revision ID: b1c2d3e4f5a6
Revises: a7b8c9d0e1f2
Create Date: 2026-10-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, Sequence[str], None] = 'a7b8c9d0e1f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE auditorias_conjunto SET nivel_desempeno = 'BUENA' WHERE nivel_desempeno = 'EXCELENTE'")


def downgrade() -> None:
    pass
