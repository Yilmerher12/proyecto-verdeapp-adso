"""uuid migracion paso 2 poblar fks nuevas

¿Qué? Paso 2 de 3 de la migración de llaves primarias enteras a UUIDv7.
      Ahora que todas las tablas ya tienen su "id_uuid" poblado (paso 1),
      se agrega una columna "*_uuid" nueva en cada tabla hija por cada
      llave foránea entera que tenga, y se llena haciendo un JOIN contra
      el "id_uuid" ya listo de la tabla padre, usando la llave foránea
      entera vieja como condición de unión.
¿Para qué? Como todos los padres ya quedaron poblados en el paso 1, el
          orden entre las tablas hijas de este paso ya no importa —
          cada UPDATE busca el UUID correcto contra un padre que ya está
          completo, sin depender de qué otra tabla hija se procesó antes.
¿Impacto? Incluye el caso especial de notificaciones.id_referencia: no
          tiene una ForeignKey() real en el modelo (es un puntero
          genérico), pero hoy solo apunta a auditorias_conjunto —se
          remapea igual que cualquier otra FK. Ninguna columna vieja se
          toca todavía; sigue siendo seguro corregir errores en este punto.

Revision ID: 23c835f44d12
Revises: 00e3bf999d33
Create Date: 2026-08-27 19:40:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = '23c835f44d12'
down_revision: Union[str, Sequence[str], None] = '00e3bf999d33'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ¿Qué? Cada tupla: (tabla_hija, columna_fk_vieja, tabla_padre,
#       columna_pk_vieja_del_padre). La columna nueva siempre se llama
#       "<columna_fk_vieja>_uuid" en la tabla hija.
# ¿Para qué? Recorrer las 29 llaves foráneas reales del proyecto (28
#           ForeignKey() + el puntero especial de notificaciones) con la
#           misma lógica en vez de repetir el bloque 29 veces.
FKS_A_POBLAR: list[tuple[str, str, str, str]] = [
    ("conjuntos_residenciales", "verificado_por_id", "usuarios", "id_usuario"),
    ("unidades", "id_conjunto_residencial", "conjuntos_residenciales", "id_conjunto_residencial"),
    ("residentes", "id_usuario", "usuarios", "id_usuario"),
    ("residentes", "id_unidad", "unidades", "id_unidad"),
    ("recicladores", "id_usuario", "usuarios", "id_usuario"),
    ("administradores_conjunto", "id_usuario", "usuarios", "id_usuario"),
    ("administradores_conjuntos", "id_administrador", "administradores_conjunto", "id_administrador"),
    ("administradores_conjuntos", "id_conjunto_residencial", "conjuntos_residenciales", "id_conjunto_residencial"),
    ("novedades", "id_admin_sistema", "usuarios", "id_usuario"),
    ("comunicados", "id_conjunto_residencial", "conjuntos_residenciales", "id_conjunto_residencial"),
    ("comunicados", "id_administrador", "administradores_conjunto", "id_administrador"),
    ("solicitudes_desvinculacion", "id_administrador", "administradores_conjunto", "id_administrador"),
    ("solicitudes_desvinculacion", "id_conjunto_residencial", "conjuntos_residenciales", "id_conjunto_residencial"),
    ("solicitudes_desvinculacion", "resuelta_por_id", "usuarios", "id_usuario"),
    ("auditorias_conjunto", "id_reciclador", "recicladores", "id_reciclador"),
    ("auditorias_conjunto", "id_conjunto_residencial", "conjuntos_residenciales", "id_conjunto_residencial"),
    ("notificaciones", "id_conjunto_residencial", "conjuntos_residenciales", "id_conjunto_residencial"),
    ("notificaciones", "id_emisor", "usuarios", "id_usuario"),
    # ¿Qué? Caso especial — sin ForeignKey() real, ver notificacion.py:33.
    ("notificaciones", "id_referencia", "auditorias_conjunto", "id_auditoria"),
    ("notificaciones_destinatarios", "id_notificacion", "notificaciones", "id"),
    ("notificaciones_destinatarios", "id_usuario", "usuarios", "id_usuario"),
    ("recicladores_conjuntos", "id_reciclador", "recicladores", "id_reciclador"),
    ("recicladores_conjuntos", "id_conjunto_residencial", "conjuntos_residenciales", "id_conjunto_residencial"),
    ("invitaciones_admin_conjunto", "invitado_por_id", "usuarios", "id_usuario"),
    ("invitaciones_reciclador_conjunto", "id_reciclador", "recicladores", "id_reciclador"),
    ("invitaciones_reciclador_conjunto", "id_conjunto_residencial", "conjuntos_residenciales", "id_conjunto_residencial"),
    ("invitaciones_reciclador_conjunto", "invitado_por_id", "usuarios", "id_usuario"),
    ("password_reset_tokens", "id_usuario", "usuarios", "id_usuario"),
    ("email_verification_tokens", "id_usuario", "usuarios", "id_usuario"),
]

# ¿Qué? Los padres cuya propia PK vieja NO se llama "id_uuid" en Postgres
#       todavía en este punto — para todas las tablas del paso 1, el
#       padre siempre expone su UUID nuevo en la columna "id_uuid".
# ¿Impacto? Los padres que ya eran UUID-texto (paso 1, retipados en el
#           mismo lugar) usan directamente su columna "id" ya convertida
#           — no tienen una "id_uuid" aparte. Ninguno de esos 4 aparece
#           como padre en la lista de arriba, así que no hace falta un
#           caso especial aquí, pero se documenta por si se agrega alguno
#           en el futuro.


def upgrade() -> None:
    """Aplica los cambios al esquema de la base de datos.

    ¿Qué? Agrega "<fk>_uuid" (nullable) en cada tabla hija y la llena
          uniendo contra el "id_uuid" ya poblado de la tabla padre.
    ¿Para qué? Dejar lista la correspondencia completa antes del paso 3,
              que recién ahí elimina las columnas enteras viejas.
    ¿Impacto? Un UPDATE ... FROM por cada fila coincidente — las FKs
              nullable (ej. verificado_por_id) simplemente quedan en
              NULL si la columna vieja también lo estaba.
    """
    connection = op.get_bind()

    for tabla_hija, columna_fk_vieja, tabla_padre, columna_pk_padre in FKS_A_POBLAR:
        columna_nueva = f"{columna_fk_vieja}_uuid"
        op.add_column(tabla_hija, sa.Column(columna_nueva, UUID(as_uuid=True), nullable=True))
        connection.execute(
            sa.text(
                f'UPDATE "{tabla_hija}" AS hija '
                f'SET "{columna_nueva}" = padre.id_uuid '
                f'FROM "{tabla_padre}" AS padre '
                f'WHERE hija."{columna_fk_vieja}" = padre."{columna_pk_padre}"'
            )
        )


def downgrade() -> None:
    """Revierte los cambios aplicados por upgrade().

    ¿Qué? Elimina cada columna "<fk>_uuid" agregada.
    ¿Para qué? Permitir deshacer este paso si algo falla más adelante.
    ¿Impacto? Segura — las columnas enteras originales nunca se tocaron.
    """
    for tabla_hija, columna_fk_vieja, _tabla_padre, _columna_pk_padre in FKS_A_POBLAR:
        op.drop_column(tabla_hija, f"{columna_fk_vieja}_uuid")
