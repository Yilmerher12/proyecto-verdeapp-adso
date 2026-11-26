"""contenido_educativo_orden

¿Qué? Agrega la columna orden (entero) a contenido_educativo y se la asigna a los módulos que ya existen.
¿Para qué? Hasta hoy el orden de los módulos dentro de una categoría salía de fecha_publicacion (el más
          reciente primero), que significa "cuándo se publicó" y no "en qué orden se lee". Con una
          columna propia, "Anterior / Siguiente" y "la primera lección sin ver" de "Aprende a reciclar"
          (issue #705) no dependen de una fecha, y un módulo nuevo queda al final de su categoría.
¿Impacto? Reversible y no destructiva: los módulos existentes reciben 1, 2, 3... por categoría, en el
          mismo orden en que se veían (fecha_publicacion de más reciente a más antigua, y el título
          como desempate), así que la pantalla no cambia. El downgrade borra la columna.

Revision ID: 7cd0f55e4060
Revises: cb3fe0a910f3
Create Date: 2026-11-26 09:29:56.840439

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = '7cd0f55e4060'
down_revision: Union[str, Sequence[str], None] = 'cb3fe0a910f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Agrega orden (NOT NULL, por defecto 0) y numera los módulos que ya existen.

    ¿Qué? Crea la columna y la rellena con ROW_NUMBER() por categoría.
    ¿Para qué? Que ningún módulo existente quede sin un lugar en su categoría.
    ¿Impacto? Seguro con datos: solo escribe la columna nueva. El valor por defecto 0 se deja en la
              columna para que un INSERT sin orden (como los de seed_data) siga funcionando.
    """
    op.add_column(
        'contenido_educativo',
        sa.Column('orden', sa.Integer(), server_default=sa.text('0'), nullable=False),
    )
    op.execute(
        """
        UPDATE contenido_educativo AS c
        SET orden = r.n
        FROM (
            SELECT id_contenido,
                   ROW_NUMBER() OVER (
                       PARTITION BY modulo_categoria
                       ORDER BY fecha_publicacion DESC, titulo_tema
                   ) AS n
            FROM contenido_educativo
        ) AS r
        WHERE c.id_contenido = r.id_contenido
        """
    )


def downgrade() -> None:
    """Quita la columna orden.

    ¿Qué? Borra contenido_educativo.orden.
    ¿Para qué? Permitir deshacer esta migración si algo falla.
    ¿Impacto? Se pierde el orden asignado; el orden vuelve a salir de fecha_publicacion.
    """
    op.drop_column('contenido_educativo', 'orden')
