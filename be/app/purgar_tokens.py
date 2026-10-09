"""
Módulo: purgar_tokens.py
Descripción: Borra las filas vencidas de las 4 tablas de tokens: sesiones
             cerradas (tokens_revocados), enlaces de verificación de correo,
             enlaces de recuperación de contraseña e invitaciones de Admin de
             Conjunto.
¿Para qué? Issue #403 (CN-061): esas tablas solo reciben filas (tokens_revocados
          una por cada cierre y cada renovación de sesión) y nada las borraba:
          crecían sin parar aunque una fila vencida ya no sirve de nada.
¿Impacto? Es un comando manual (nada lo corre solo; programarlo en producción
          es de la tarjeta #317). Borra solo lo vencido: nunca un token que aún
          se pueda usar. No toca invitaciones_reciclador_conjunto: no tiene token
          y su estado (aceptada/rechazada) es historial que ve el Admin de Conjunto.

Uso, desde be/:
    uv run python -m app.purgar_tokens
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.email_verification_token import EmailVerificationToken
from app.models.invitacion_admin_conjunto import InvitacionAdminConjunto
from app.models.password_reset_token import PasswordResetToken
from app.models.token_revocado import TokenRevocado

# ¿Qué? Cuánto tiempo se conserva un enlace ya vencido antes de borrarlo.
# ¿Para qué? Quien abre un correo viejo ve "el enlace ha expirado, pide uno
#           nuevo" (la fila existe y está vencida). Si ya la borramos vería "enlace
#           inválido o ya usado", que confunde. Los enlaces duran de 1 hora a 7 días,
#           así que 7 días de gracia cubren abrir un correo con retraso.
# ¿Impacto? Solo afecta el mensaje que ve el usuario, no la seguridad: un token
#           vencido se rechaza igual esté o no su fila.
GRACIA_ENLACES = timedelta(days=7)

TABLAS_DE_ENLACES = (EmailVerificationToken, PasswordResetToken, InvitacionAdminConjunto)


def purgar(db: Session, ahora: datetime | None = None) -> dict[str, int]:
    """Borra lo vencido y devuelve cuántas filas se borraron por tabla."""
    ahora = ahora or datetime.now(timezone.utc)
    borradas: dict[str, int] = {}

    # ¿Qué? Un token revocado ya vencido se rechazaría por vencido aunque no estuviera
    #       en la lista negra, así que se borra apenas vence (sin gracia).
    borradas[TokenRevocado.__tablename__] = db.execute(
        delete(TokenRevocado).where(TokenRevocado.expira_en < ahora)
    ).rowcount

    for modelo in TABLAS_DE_ENLACES:
        borradas[modelo.__tablename__] = db.execute(
            delete(modelo).where(modelo.expires_at < ahora - GRACIA_ENLACES)
        ).rowcount

    db.commit()
    return borradas


def main() -> None:
    with SessionLocal() as db:
        borradas = purgar(db)
    for tabla, cantidad in borradas.items():
        print(f"{tabla}: {cantidad} fila(s) borrada(s)")


if __name__ == "__main__":
    main()
