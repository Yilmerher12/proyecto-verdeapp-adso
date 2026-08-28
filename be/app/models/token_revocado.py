"""
Módulo: models/token_revocado.py
Descripción: Lista negra de tokens JWT invalidados manualmente (logout).
¿Para qué? Un JWT es válido por sí solo hasta que expira — el servidor no
          "recuerda" nada de él. Cerrar sesión debe rechazar ese mismo
          token de inmediato, no esperar a que expire solo (HU-008/RQF-007).
¿Impacto? Cada fila es un token que, aunque su firma y su fecha de
          expiración sigan siendo válidas, ya no debe aceptarse.
"""
from sqlalchemy import Column, DateTime
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class TokenRevocado(Base):
    __tablename__ = "tokens_revocados"

    # ¿Qué? "jti" (JWT ID) es el identificador único que cada token lleva
    #       desde que se emite (ver create_access_token/create_refresh_token
    #       en app/utils/security.py).
    # ¿Para qué? Guardar aquí el jti de un token es "la lista negra": en
    #           cada request, get_current_user (y refresh_access_token)
    #           revisan si el jti del token recibido está en esta tabla y,
    #           si está, lo rechazan con 401 aunque el token en sí siga
    #           siendo válido.
    # ¿Impacto? Solo se invalida ESE token puntual — no cierra sesión en
    #           otros dispositivos donde el usuario también haya iniciado
    #           sesión, porque esos tienen un jti distinto.
    jti = Column(UUID(as_uuid=True), primary_key=True)

    # ¿Qué? Copia la expiración original del token ("exp" del payload).
    # ¿Para qué? Permite limpiar esta tabla con seguridad más adelante: una
    #           vez pasada esta fecha, el token ya habría expirado por su
    #           cuenta, así que guardar su jti para siempre no sirve de nada.
    # ¿Impacto? Un futuro job de limpieza podría hacer
    #           "DELETE FROM tokens_revocados WHERE expira_en < now()"
    #           sin arriesgar dejar pasar un token que todavía sea válido.
    expira_en = Column(DateTime(timezone=True), nullable=False)
