"""crear tabla contenido_educativo_envios

¿Qué? Nueva tabla que registra cada vez que el Admin del Sistema envía un
      módulo del catálogo educativo a mano a un conjunto, sin pasar por una
      auditoría del Reciclador (RQF-018).
¿Para qué? Antes, "recomendado a un conjunto" solo podía nacer de una
          calificación Regular o Mala (RQF-013). Esta tabla es la única
          forma de registrar un envío manual — no reemplaza ni modifica
          nada de auditorias_conjunto.
¿Impacto? No destructiva: tabla nueva, ninguna columna existente cambia.

Revision ID: 30a83eda6c54
Revises: ed64a91d01f6
Create Date: 2026-09-21 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = '30a83eda6c54'
down_revision: Union[str, Sequence[str], None] = 'ed64a91d01f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "contenido_educativo_envios",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("id_contenido", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("id_conjunto_residencial", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("enviado_por_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["id_contenido"], ["contenido_educativo.id_contenido"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["id_conjunto_residencial"], ["conjuntos_residenciales.id_conjunto_residencial"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["enviado_por_id"], ["usuarios.id_usuario"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_contenido_educativo_envios_id"), "contenido_educativo_envios", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_contenido_educativo_envios_id_contenido"),
        "contenido_educativo_envios",
        ["id_contenido"],
        unique=False,
    )
    op.create_index(
        op.f("ix_contenido_educativo_envios_id_conjunto_residencial"),
        "contenido_educativo_envios",
        ["id_conjunto_residencial"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_contenido_educativo_envios_id_conjunto_residencial"), table_name="contenido_educativo_envios")
    op.drop_index(op.f("ix_contenido_educativo_envios_id_contenido"), table_name="contenido_educativo_envios")
    op.drop_index(op.f("ix_contenido_educativo_envios_id"), table_name="contenido_educativo_envios")
    op.drop_table("contenido_educativo_envios")
