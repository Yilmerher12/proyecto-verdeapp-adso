"""uuid migracion paso 1 agregar y poblar pks nuevas

¿Qué? Paso 1 de 3 de la migración de llaves primarias enteras a UUIDv7
      (ver plan completo, decidido junto al usuario, en la conversación
      de esta rama). Para cada una de las 14 tablas que hoy tienen una
      llave primaria entera autoincremental, agrega una columna nueva
      "id_uuid" y la llena con un UUIDv7 recién generado para cada fila
      existente. Las 4 tablas que YA usaban UUID como texto
      (invitaciones_admin_conjunto, invitaciones_reciclador_conjunto,
      password_reset_tokens, email_verification_tokens) se convierten
      directamente al tipo UUID nativo de Postgres, sin generar valores
      nuevos — el valor lógico no cambia, solo el tipo de almacenamiento.
¿Para qué? Es el primer paso del patrón "expand/contract": mientras las
          columnas enteras viejas sigan intactas, cualquier error se
          puede corregir sin perder ninguna relación. Las tablas
          `roles` y `localidades` quedan EXCLUIDAS a propósito (son
          catálogos fijos y públicos, sin beneficio real de seguridad
          al migrarlas — decisión explícita del usuario).
¿Impacto? No es destructiva: no borra ni modifica ninguna columna vieja,
          solo agrega columnas nuevas nullable. Postgres 17 no tiene
          `uuidv7()` nativo (llegó en Postgres 18), así que el UUID se
          genera aquí mismo en Python con la librería `uuid_utils`.

Revision ID: 00e3bf999d33
Revises: 87f6e4a34b4c
Create Date: 2026-08-27 19:21:35.025222

"""
import uuid
from typing import Sequence, Union

import sqlalchemy as sa
import uuid_utils
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = '00e3bf999d33'
down_revision: Union[str, Sequence[str], None] = '87f6e4a34b4c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _generar_uuid7() -> uuid.UUID:
    # ¿Qué? uuid_utils.uuid7() devuelve su propia clase, no uuid.UUID de la
    #       librería estándar — se confirmó con una prueba real que sin
    #       esta conversión, psycopg2 no sabe adaptar el valor a Postgres.
    return uuid.UUID(str(uuid_utils.uuid7()))


# ¿Qué? Cada tupla es (tabla, columna_pk_vieja) para las 14 tablas con
#       llave primaria entera simple que necesitan un UUID nuevo.
# ¿Para qué? Recorrerlas todas con la misma lógica en vez de repetir el
#           mismo bloque de código 14 veces.
TABLAS_CON_PK_ENTERA = [
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
]

# ¿Qué? Las 4 tablas que YA guardaban un UUID como texto (String(36)).
# ¿Para qué? Solo hace falta cambiar el tipo de columna — el valor lógico
#           ya es un UUID válido, no hay que generar nada nuevo.
TABLAS_YA_UUID_TEXTO = [
    "invitaciones_admin_conjunto",
    "invitaciones_reciclador_conjunto",
    "password_reset_tokens",
    "email_verification_tokens",
]


def upgrade() -> None:
    """Aplica los cambios al esquema de la base de datos.

    ¿Qué? Agrega "id_uuid" (nullable) a las 14 tablas con PK entera y la
          llena con un UUIDv7 por fila. Convierte el tipo de columna de
          las 4 tablas que ya usaban UUID-como-texto a UUID nativo.
    ¿Para qué? Preparar el terreno para el paso 2 (poblar las llaves
              foráneas) sin tocar todavía ninguna columna vieja.
    ¿Impacto? Segura de reintentar si algo falla a mitad de camino: las
              columnas viejas nunca se tocan en este paso.
    """
    connection = op.get_bind()

    for tabla, columna_pk_vieja in TABLAS_CON_PK_ENTERA:
        op.add_column(tabla, sa.Column("id_uuid", UUID(as_uuid=True), nullable=True))
        filas = connection.execute(
            sa.text(f'SELECT "{columna_pk_vieja}" FROM "{tabla}"')
        ).fetchall()
        if not filas:
            continue
        valores = [
            {"pk_vieja": fila[0], "nuevo_uuid": _generar_uuid7()} for fila in filas
        ]
        connection.execute(
            sa.text(
                f'UPDATE "{tabla}" SET id_uuid = :nuevo_uuid '
                f'WHERE "{columna_pk_vieja}" = :pk_vieja'
            ),
            valores,
        )

    for tabla in TABLAS_YA_UUID_TEXTO:
        connection.execute(
            sa.text(f'ALTER TABLE "{tabla}" ALTER COLUMN id TYPE UUID USING id::uuid')
        )


def downgrade() -> None:
    """Revierte los cambios aplicados por upgrade().

    ¿Qué? Elimina la columna "id_uuid" agregada en las 14 tablas.
          Revierte las 4 tablas ya-UUID a String(36) (el valor de texto
          se conserva, solo cambia el tipo de columna de vuelta).
    ¿Para qué? Permitir deshacer este paso si algo falla más adelante,
              antes de que el paso 3 elimine las columnas enteras viejas.
    ¿Impacto? Segura — en este punto las columnas enteras originales
              nunca se tocaron, así que revertir no pierde ningún dato.
    """
    connection = op.get_bind()

    for tabla in TABLAS_YA_UUID_TEXTO:
        connection.execute(
            sa.text(f'ALTER TABLE "{tabla}" ALTER COLUMN id TYPE VARCHAR(36) USING id::text')
        )

    for tabla, _columna_pk_vieja in TABLAS_CON_PK_ENTERA:
        op.drop_column(tabla, "id_uuid")
