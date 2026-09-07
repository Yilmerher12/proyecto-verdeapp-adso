"""agregar historial y revocacion a recicladores conjuntos

¿Qué? Convierte `recicladores_conjuntos` de una tabla puente "cruda" (solo
      id_reciclador + id_conjunto_residencial como llave compuesta) a una
      tabla con historial real — mismo patrón que ya usa
      administradores_conjuntos: agrega id propio, fecha_autorizacion,
      fecha_revocacion (NULL = vínculo activo) y revocado_por_id.
¿Para qué? Antes no había ninguna forma de que un Admin de Conjunto
          revocara el acceso de un reciclador sin borrar la fila sin
          dejar rastro. Con esto, "dar de baja" un reciclador se vuelve
          un soft-delete con historial, igual que ya existe para
          administradores de conjunto.
¿Impacto? No es destructiva: los datos existentes se conservan, solo se
          les agrega un id nuevo (generado con gen_random_uuid(), nativo
          desde Postgres 13) y fecha_autorizacion = now() como
          aproximación razonable (no había forma de saber la fecha real
          de autorización de vínculos ya existentes). El índice único
          parcial nuevo (ux_reciclador_conjunto_activo) garantiza que un
          reciclador no pueda tener dos vínculos ACTIVOS con el mismo
          conjunto al mismo tiempo, pero sí permite que un vínculo
          revocado y luego re-autorizado quede como dos filas separadas
          (historial completo).

Revision ID: 0971721d03b0
Revises: 5954a136a8cc
Create Date: 2026-09-07 09:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID


# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = '0971721d03b0'
down_revision: Union[str, Sequence[str], None] = '5954a136a8cc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Agrega historial/revocación a recicladores_conjuntos.

    ¿Qué? Agrega columnas nuevas (todas nullable al inicio), las llena
          para las filas existentes, y solo entonces cambia la llave
          primaria de compuesta (id_reciclador, id_conjunto_residencial)
          a un id propio — con el índice único parcial que reemplaza la
          garantía que antes daba la llave compuesta (pero ahora solo
          para vínculos activos).
    ¿Para qué? Este orden (agregar → poblar → restringir) evita romper
              las filas que ya existen, incluso si la tabla tuviera datos
              reales al momento de aplicar esto.
    """
    connection = op.get_bind()

    op.add_column('recicladores_conjuntos', sa.Column('id', UUID(as_uuid=True), nullable=True))
    op.add_column('recicladores_conjuntos', sa.Column('fecha_autorizacion', sa.TIMESTAMP(), nullable=True))
    op.add_column('recicladores_conjuntos', sa.Column('fecha_revocacion', sa.TIMESTAMP(), nullable=True))
    op.add_column('recicladores_conjuntos', sa.Column('revocado_por_id', UUID(as_uuid=True), nullable=True))

    connection.execute(sa.text(
        "UPDATE recicladores_conjuntos SET id = gen_random_uuid(), fecha_autorizacion = now() "
        "WHERE id IS NULL"
    ))

    op.alter_column('recicladores_conjuntos', 'id', nullable=False)
    op.alter_column('recicladores_conjuntos', 'fecha_autorizacion', nullable=False)

    op.drop_constraint('recicladores_conjuntos_pkey', 'recicladores_conjuntos', type_='primary')
    op.create_primary_key('recicladores_conjuntos_pkey', 'recicladores_conjuntos', ['id'])
    op.create_index(op.f('ix_recicladores_conjuntos_id'), 'recicladores_conjuntos', ['id'], unique=False)

    op.create_index(
        'ux_reciclador_conjunto_activo',
        'recicladores_conjuntos',
        ['id_reciclador', 'id_conjunto_residencial'],
        unique=True,
        postgresql_where=sa.text('fecha_revocacion IS NULL'),
    )
    op.create_foreign_key(
        'fk_recicladores_conjuntos_revocado_por_id',
        'recicladores_conjuntos', 'usuarios',
        ['revocado_por_id'], ['id_usuario'],
    )


def downgrade() -> None:
    """Revierte los cambios aplicados por upgrade().

    ¿Qué? Elimina el historial/revocación y devuelve la llave primaria
          compuesta original.
    ¿Impacto? DESTRUCTIVA para el historial: se pierde fecha_autorizacion,
              fecha_revocacion y revocado_por_id de todas las filas, y
              cualquier fila que hubiera quedado "revocada" (con
              fecha_revocacion no nula) volvería a comportarse como un
              vínculo activo normal al no existir ya esa columna. El
              orden es inverso al de upgrade().
    """
    op.drop_constraint('fk_recicladores_conjuntos_revocado_por_id', 'recicladores_conjuntos', type_='foreignkey')
    op.drop_index('ux_reciclador_conjunto_activo', table_name='recicladores_conjuntos')
    op.drop_index(op.f('ix_recicladores_conjuntos_id'), table_name='recicladores_conjuntos')
    op.drop_constraint('recicladores_conjuntos_pkey', 'recicladores_conjuntos', type_='primary')
    op.create_primary_key(
        'recicladores_conjuntos_pkey', 'recicladores_conjuntos', ['id_reciclador', 'id_conjunto_residencial']
    )
    op.drop_column('recicladores_conjuntos', 'revocado_por_id')
    op.drop_column('recicladores_conjuntos', 'fecha_revocacion')
    op.drop_column('recicladores_conjuntos', 'fecha_autorizacion')
    op.drop_column('recicladores_conjuntos', 'id')
