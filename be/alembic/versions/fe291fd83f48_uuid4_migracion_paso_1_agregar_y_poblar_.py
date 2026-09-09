"""uuidv4 migracion paso 1 agregar y poblar pks nuevas

¿Qué? Paso 1 de 3 de la migración de UUIDv7 a UUIDv4 (issue #167, pedido
      por el profesor evaluador: v7 codifica la fecha de creación en los
      primeros bits del propio ID, v4 es 100% aleatorio). Para cada una de
      las 18 tablas que ya tienen una llave primaria UUID propia (no
      compuesta), agrega una columna nueva "id_v4" y la llena con un
      UUIDv4 recién generado para cada fila existente.
¿Para qué? Es el primer paso del mismo patrón "expand/contract" que ya se
          usó para la migración de enteros a UUID (ver
          00e3bf999d33/23c835f44d12/8e5d632004ca) — mientras las columnas
          UUIDv7 viejas sigan intactas, cualquier error se puede corregir
          sin perder ninguna relación. `roles` y `localidades` no
          participan (nunca fueron UUID). `tokens_revocados.jti` tampoco
          participa a propósito: es un dato interno/transitorio (lista de
          JWT invalidados al cerrar sesión) que nunca se expone al
          usuario, así que no tiene el problema de privacidad que motivó
          este cambio — ver app/utils/ids.py, ahora usado para los tokens
          NUEVOS automáticamente.
¿Impacto? No es destructiva: no borra ni modifica ninguna columna vieja,
          solo agrega columnas nuevas nullable. A diferencia de la
          migración de enteros a UUIDv7 (que necesitaba generar cada valor
          en Python porque Postgres no tenía uuidv7() nativo), UUIDv4 SÍ
          tiene equivalente nativo en Postgres (gen_random_uuid(), en el
          core desde la versión 13) — se usa directamente en SQL en vez de
          traer las filas a Python y regresarlas de a una, mucho más
          rápido para conjuntos_residenciales (14,515+ filas reales).

Revision ID: fe291fd83f48
Revises: 0893894dcf2b
Create Date: 2026-09-03 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = 'fe291fd83f48'
down_revision: Union[str, Sequence[str], None] = '0893894dcf2b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ¿Qué? Las 18 tablas con llave primaria UUID propia y simple (no
#       compuesta) — es decir, todas las que usan generar_uuid4() como
#       default en su modelo (ver app/utils/ids.py). Quedan afuera:
#       roles/localidades (Integer, nunca migradas), tokens_revocados
#       (excluido a propósito, ver docstring del módulo), y las 2 tablas
#       puente con PK compuesta (notificaciones_destinatarios,
#       recicladores_conjuntos — no tienen "id" propio, se resuelven solo
#       con el remapeo de FKs en el paso 2).
TABLAS_CON_PK_UUID = [
    ("usuarios", "id_usuario"),
    ("conjuntos_residenciales", "id_conjunto_residencial"),
    ("contenido_educativo", "id_contenido"),
    ("puntos_acopios", "id_punto_acopio"),
    ("unidades", "id_unidad"),
    ("recicladores", "id_reciclador"),
    ("administradores_conjunto", "id_administrador"),
    ("residentes", "id_residente"),
    ("administradores_conjuntos", "id_administrador_conjunto"),
    ("novedades", "id_novedad"),
    ("comunicados", "id_comunicado"),
    ("solicitudes_desvinculacion", "id"),
    ("auditorias_conjunto", "id_auditoria"),
    ("notificaciones", "id"),
    ("invitaciones_admin_conjunto", "id"),
    ("invitaciones_reciclador_conjunto", "id"),
    ("password_reset_tokens", "id"),
    ("email_verification_tokens", "id"),
]


def upgrade() -> None:
    """Aplica los cambios al esquema de la base de datos.

    ¿Qué? Agrega "id_v4" (nullable) a las 18 tablas y la llena con un
          UUIDv4 nuevo por fila, generado nativamente por Postgres.
    ¿Para qué? Preparar el terreno para el paso 2 (poblar las llaves
              foráneas) sin tocar todavía ninguna columna vieja.
    ¿Impacto? Segura de reintentar si algo falla a mitad de camino: las
              columnas UUIDv7 viejas nunca se tocan en este paso.
    """
    connection = op.get_bind()

    for tabla, _columna_pk_vieja in TABLAS_CON_PK_UUID:
        op.add_column(tabla, sa.Column("id_v4", UUID(as_uuid=True), nullable=True))
        connection.execute(sa.text(f'UPDATE "{tabla}" SET id_v4 = gen_random_uuid()'))


def downgrade() -> None:
    """Revierte los cambios aplicados por upgrade().

    ¿Qué? Elimina la columna "id_v4" agregada en las 18 tablas.
    ¿Para qué? Permitir deshacer este paso si algo falla más adelante,
              antes de que el paso 3 elimine las columnas UUIDv7 viejas.
    ¿Impacto? Segura — en este punto las columnas viejas originales nunca
              se tocaron, así que revertir no pierde ningún dato.
    """
    for tabla, _columna_pk_vieja in TABLAS_CON_PK_UUID:
        op.drop_column(tabla, "id_v4")
