from sqlalchemy import Column, String, Boolean, TIMESTAMP, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base
from app.utils.ids import generar_uuid7


class InvitacionAdminConjunto(Base):
    """
    ¿Qué? Una invitación enviada a una persona para que se convierta en
          Administrador de Conjunto.
    ¿Para qué? El Administrador del Sistema solo escribe el correo (y a
              qué conjuntos quedará asignado). El sistema genera un
              token único y manda un correo con un enlace. La persona
              invitada hace clic, y SOLO ELLA define su propia
              contraseña y completa sus datos personales — nunca pasan
              por manos del Administrador del Sistema.
    ¿Impacto? Una invitación usada (used=True) o vencida (expires_at en
              el pasado) ya no se puede usar para crear una cuenta.
    """
    __tablename__ = "invitaciones_admin_conjunto"

    # ¿Qué? Ya era un UUID guardado como texto (uuid.uuid4()); ahora pasa a
    #       ser UUIDv7 nativo de Postgres, igual que el resto de las tablas.
    id = Column(UUID(as_uuid=True), primary_key=True, default=generar_uuid7)
    correo_electronico = Column(String(255), nullable=False)
    token = Column(String(255), unique=True, nullable=False)

    # ¿Qué? IDs de los conjuntos a asignar, separados por comas (ej:
    #       "018f3b2a-...,018f4c1b-..."). Antes eran enteros ("3,7,12"),
    #       cabían muchos en 255 caracteres — un UUID ocupa 36 caracteres
    #       cada uno, así que con String(255) solo cabrían ~6 conjuntos.
    # ¿Para qué? Un administrador puede manejar varios conjuntos desde el
    #           inicio. Se guarda como texto simple en vez de crear una
    #           tabla intermedia solo para invitaciones pendientes.
    # ¿Impacto? Se cambia a Text (sin límite de longitud) para que un
    #           administrador asignado a muchos conjuntos no trunque la
    #           lista silenciosamente.
    conjuntos_asignados = Column(Text, nullable=False)

    invitado_por_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id_usuario"), nullable=False)
    expires_at = Column(TIMESTAMP(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())