"""agregar orden_interno a auditorias_conjunto

¿Qué? Agrega "orden_interno" (GENERATED ALWAYS AS IDENTITY) a
      auditorias_conjunto — un contador estrictamente creciente que solo
      se usa del lado del servidor para desempatar el ORDER BY de "más
      reciente primero", nunca se expone en la API.
¿Para qué? Antes ese desempate era id_auditoria (funcionaba porque UUIDv7
          ordena cronológicamente por diseño). Al migrar a UUIDv4 (100%
          aleatorio, issue #167) ese desempate dejó de tener sentido —
          "created_at" solo no alcanza porque NOW() de Postgres devuelve
          el mismo valor para varias inserciones dentro de la misma
          transacción, algo que pasa seguido cuando dos recicladores
          auditan el mismo conjunto casi al mismo tiempo (un test real de
          este proyecto lo reprodujo de forma consistente).
¿Impacto? No destructiva: agrega una columna nueva, no toca ninguna
          existente. Postgres asigna automáticamente valores 1, 2, 3...
          a las filas ya existentes (en el orden físico en que las
          encuentre, sin garantía de que coincida con el orden real de
          creación de auditorías previas a esta migración — aceptable,
          ese historial ya se ordenaba de forma ambigua desde que se hizo
          la migración a UUIDv4).

Revision ID: e97108a7a748
Revises: d796a2202fd4
Create Date: 2026-09-03 00:20:00.000000

"""
from typing import Sequence, Union

from alembic import op

# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = 'e97108a7a748'
down_revision: Union[str, Sequence[str], None] = 'd796a2202fd4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE auditorias_conjunto "
        "ADD COLUMN orden_interno BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE"
    )


def downgrade() -> None:
    op.drop_column("auditorias_conjunto", "orden_interno")
