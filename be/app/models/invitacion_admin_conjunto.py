from sqlalchemy import Column, String, Boolean, TIMESTAMP, ForeignKey, Integer
from sqlalchemy.sql import func
from app.database import Base


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

    id = Column(String(36), primary_key=True)
    correo_electronico = Column(String(255), nullable=False)
    token = Column(String(255), unique=True, nullable=False)

    # ¿Qué? IDs de los conjuntos a asignar, separados por comas (ej: "3,7,12").
    # ¿Para qué? Un administrador puede manejar varios conjuntos desde el
    #           inicio. Se guarda como texto simple en vez de crear una
    #           tabla intermedia solo para invitaciones pendientes.
    conjuntos_asignados = Column(String(255), nullable=False)

    invitado_por_id = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    expires_at = Column(TIMESTAMP(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())