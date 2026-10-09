"""hashear los tokens de un solo uso ya guardados

¿Qué? Issue #373 (CN-031): reemplaza cada token guardado en texto plano
      (verificar correo, recuperar contraseña, invitación de Admin de
      Conjunto) por su sha256 en hexadecimal — el mismo cálculo que hace
      hash_token() en app/utils/security.py.
¿Para qué? Desde este cambio el código busca los tokens por su hash. Sin
          esta migración, los enlaces que ya se enviaron por correo y
          siguen vigentes dejarían de funcionar.
¿Impacto? No cambia columnas: un sha256 en hex mide 64 caracteres y las
          columnas son String(255). El downgrade no puede recuperar los
          tokens originales (un hash no se revierte), así que marca como
          usados los que seguían pendientes: esos enlaces dejan de servir y
          hay que pedir uno nuevo.

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-10-05 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# ¿Qué? Identificadores que Alembic usa para construir el grafo de migraciones.
# ¿Para qué? down_revision apunta a la migración anterior; None indica que es la raíz.
# ¿Impacto? Alterar estos valores rompe el historial y puede causar errores al migrar.
revision: str = 'e6f7a8b9c0d1'
down_revision: Union[str, Sequence[str], None] = 'd5e6f7a8b9c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLAS_CON_TOKEN = ("email_verification_tokens", "password_reset_tokens", "invitaciones_admin_conjunto")


def upgrade() -> None:
    """Reemplaza cada token por su sha256 (hex)."""
    for tabla in TABLAS_CON_TOKEN:
        op.execute(f"UPDATE {tabla} SET token = encode(sha256(convert_to(token, 'UTF8')), 'hex')")


def downgrade() -> None:
    """Invalida los tokens pendientes: sus originales ya no se pueden recuperar."""
    for tabla in TABLAS_CON_TOKEN:
        op.execute(f"UPDATE {tabla} SET used = true WHERE used = false")
