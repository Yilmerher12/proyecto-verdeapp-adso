"""crear agenda_conjunto y novedades_enviadas

¿Qué? Crea 2 tablas nuevas: agenda_conjunto (temas internos del Admin de
      Conjunto, por conjunto, con foto opcional y estado PENDIENTE /
      EN_ESPERA) y novedades_enviadas (lo que un Residente, Reciclador o
      Admin de Conjunto le envía al Admin Sistema, con imagen opcional).
¿Para qué? Agenda: que el Admin de Conjunto lleve al comité lo que le piden
          y no se le olvide. Novedades enviadas: canal de abajo hacia
          arriba hacia el Admin Sistema (distinto de `novedades`, que son
          los avisos que él publica).
¿Impacto? No destructiva: 2 tablas nuevas, ninguna fila existente cambia.

Revision ID: c4d5e6f7a8b9
Revises: a3c91e7b2f40
Create Date: 2026-10-02 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, Sequence[str], None] = 'a3c91e7b2f40'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Aplica los cambios al esquema de la base de datos.

    ¿Qué? Crea agenda_conjunto (FK al conjunto con CASCADE, al autor con
          SET NULL) y novedades_enviadas (FK al autor y al conjunto, ambas
          SET NULL).
    ¿Para qué? Ver docstring del módulo.
    ¿Impacto? Ninguna fila existente cambia.
    """
    op.create_table(
        'agenda_conjunto',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('id_conjunto_residencial', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('autor_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('texto', sa.Text(), nullable=False),
        sa.Column('url_evidencia', sa.String(length=500), nullable=True),
        sa.Column('estado', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(
            ['id_conjunto_residencial'],
            ['conjuntos_residenciales.id_conjunto_residencial'],
            ondelete='CASCADE',
        ),
        sa.ForeignKeyConstraint(['autor_id'], ['usuarios.id_usuario'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_agenda_conjunto_id_conjunto_residencial', 'agenda_conjunto', ['id_conjunto_residencial'])

    op.create_table(
        'novedades_enviadas',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('autor_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('id_conjunto_residencial', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('texto', sa.Text(), nullable=False),
        sa.Column('url_imagen', sa.String(length=500), nullable=True),
        sa.Column('estado', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('resuelta_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['autor_id'], ['usuarios.id_usuario'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(
            ['id_conjunto_residencial'],
            ['conjuntos_residenciales.id_conjunto_residencial'],
            ondelete='SET NULL',
        ),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    """Revierte los cambios aplicados por upgrade().

    ¿Qué? Elimina las tablas novedades_enviadas y agenda_conjunto.
    ¿Para qué? Permitir deshacer esta migración si algo falla.
    ¿Impacto? Se pierden la agenda de los conjuntos y las novedades enviadas.
    """
    op.drop_table('novedades_enviadas')
    op.drop_index('ix_agenda_conjunto_id_conjunto_residencial', table_name='agenda_conjunto')
    op.drop_table('agenda_conjunto')
