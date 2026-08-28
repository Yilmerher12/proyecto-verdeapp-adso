"""agregar fotos adicionales evidencia auditoria

¿Qué? Agrega dos columnas nullable a auditorias_conjunto: ruta_evidencia_2
      y ruta_evidencia_3, del mismo tipo que la ya existente ruta_evidencia.
¿Para qué? El reciclador ahora puede adjuntar hasta 3 fotos de evidencia
          por auditoría (antes solo 1) — decisión del 2026-08-27.
¿Impacto? No destructiva: ambas columnas quedan NULL en las auditorías ya
          guardadas (que solo tenían 1 foto), sin afectar ruta_evidencia.

Revision ID: b8c7a07d4d99
Revises: 8e5d632004ca
Create Date: 2026-08-27 22:53:49.689959

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = 'b8c7a07d4d99'
down_revision: Union[str, Sequence[str], None] = '8e5d632004ca'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Aplica los cambios al esquema de la base de datos.

    ¿Qué? Agrega ruta_evidencia_2 y ruta_evidencia_3 (String(500), nullable)
          a auditorias_conjunto.
    ¿Para qué? Permitir hasta 3 fotos de evidencia por auditoría.
    ¿Impacto? Segura en producción — solo agrega columnas nullable, no
              toca ni exige nada sobre los datos ya existentes.
    """
    op.add_column("auditorias_conjunto", sa.Column("ruta_evidencia_2", sa.String(500), nullable=True))
    op.add_column("auditorias_conjunto", sa.Column("ruta_evidencia_3", sa.String(500), nullable=True))


def downgrade() -> None:
    """Revierte los cambios aplicados por upgrade().

    ¿Qué? Elimina ruta_evidencia_2 y ruta_evidencia_3.
    ¿Para qué? Permitir deshacer esta migración si algo falla.
    ¿Impacto? Destructiva solo para las fotos 2 y 3 ya guardadas (se
              pierden sus rutas) — ruta_evidencia (la primera foto) no
              se ve afectada.
    """
    op.drop_column("auditorias_conjunto", "ruta_evidencia_3")
    op.drop_column("auditorias_conjunto", "ruta_evidencia_2")
