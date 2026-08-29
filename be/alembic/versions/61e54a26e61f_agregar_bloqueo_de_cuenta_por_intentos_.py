"""agregar bloqueo de cuenta por intentos fallidos

¿Qué? Agrega dos columnas a usuarios: intentos_fallidos (Integer, default 0)
      y bloqueado_hasta (DateTime con zona horaria, nullable).
¿Para qué? HU-001/RQF-001 (CA-001.5, RN-003) — bloquear el login de un
          correo específico durante 15 minutos tras 5 intentos fallidos
          seguidos.
¿Impacto? No destructiva — intentos_fallidos arranca en 0 para todos los
          usuarios ya existentes, bloqueado_hasta arranca en NULL (nadie
          queda bloqueado por esta migración).

Revision ID: 61e54a26e61f
Revises: b8c7a07d4d99
Create Date: 2026-08-28 11:08:01.594052

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = '61e54a26e61f'
down_revision: Union[str, Sequence[str], None] = 'b8c7a07d4d99'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Aplica los cambios al esquema de la base de datos.

    ¿Qué? Agrega intentos_fallidos y bloqueado_hasta a usuarios.
    ¿Para qué? Rastrear intentos de login fallidos por cuenta y aplicar
              un bloqueo temporal de 15 minutos tras 5 seguidos.
    ¿Impacto? Segura en producción — solo agrega columnas con default,
              no exige nada sobre los datos ya existentes.
    """
    op.add_column(
        "usuarios",
        sa.Column("intentos_fallidos", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "usuarios",
        sa.Column("bloqueado_hasta", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    """Revierte los cambios aplicados por upgrade().

    ¿Qué? Elimina intentos_fallidos y bloqueado_hasta.
    ¿Para qué? Permitir deshacer esta migración si algo falla.
    ¿Impacto? Destructiva solo para el conteo de intentos fallidos y
              cualquier bloqueo activo — no afecta ningún otro dato del
              usuario (correo, contraseña, rol, etc.).
    """
    op.drop_column("usuarios", "bloqueado_hasta")
    op.drop_column("usuarios", "intentos_fallidos")
